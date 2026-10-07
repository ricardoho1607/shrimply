import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { fromByteArray } from "base64-js";
import type { SopAttachment } from "../../shared/sop/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getBytes } from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  emptySopWorkspace,
  type SopClient,
  type SopWorkspace,
} from "../../shared/sop/client";
import { sopCanManage } from "../../shared/sop/contracts";
import {
  loadOfflineCollection,
  persistOfflineCollection,
  listOfflineMutations,
  saveDurableMutation,
  flushOfflineMutations,
  isWorkspaceOnline,
} from "../services/offlineWorkspace";
export function useSopWorkspace(): SopClient {
  const { user, company } = useAuth(),
    uid = user?.uid,
    companyId = company?.id;
  const [workspace, setWorkspace] = useState<SopWorkspace>(emptySopWorkspace),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<string[]>([]);
  const identity = useRef("");
  const blockKey = workspace.blocks
    .map((b) => b.id)
    .sort()
    .join(",");
  const call = useCallback(
    async (name: string, data: Record<string, unknown>) =>
      (await httpsCallable(getFunctions(db.app), name)(data)).data as Record<
        string,
        unknown
      >,
    [],
  );
  const refresh = useCallback(async () => {
    if (!uid || !companyId) {
      setLoading(false);
      return;
    }
    const captured = `${uid}:${companyId}`;
    try {
      if (!(await isWorkspaceOnline())) {
        setLoading(false);
        return;
      }
      const data = (await call("getSopWorkspace", {
        companyId,
      })) as unknown as SopWorkspace;
      if (identity.current === captured) {
        setWorkspace(data);
        setError("");
        await persistOfflineCollection(uid, companyId, "sop-workspace", [
          { id: "workspace", ...data },
        ]);
      }
    } catch (e) {
      if (identity.current === captured)
        setError(e instanceof Error ? e.message : "Unable to load workflows.");
    } finally {
      if (identity.current === captured) setLoading(false);
    }
  }, [uid, companyId, call]);
  useEffect(() => {
    const captured = `${uid}:${companyId}`;
    identity.current = captured;
    // Resetting the scoped cache on an identity change is required for data isolation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspace(emptySopWorkspace());
    setPending([]);
    setLoading(true);
    if (!uid || !companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const sync = async () => {
      try {
        const cached = await loadOfflineCollection<
          SopWorkspace & { id: string }
        >(uid, companyId, "sop-workspace");
        if (!cancelled && cached[0]) setWorkspace(cached[0]);
        await flushOfflineMutations(uid, companyId);
        const queue = await listOfflineMutations(uid, companyId);
        if (!cancelled)
          setPending(
            queue
              .filter((q) => q.kind === "callable")
              .map((q) => String(q.data?.taskId)),
          );
        if (!cancelled) await refresh();
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Queued evidence is waiting to sync.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void sync();
    const timer = setInterval(() => void sync(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      identity.current = "";
    };
  }, [uid, companyId, user?.role, company?.ownerId, refresh]);
  useEffect(() => {
    if (!uid || !companyId) return;
    const manager = sopCanManage(user?.role, uid, company.ownerId);
    const tasks = collection(db, "companies", companyId, "tasks");
    const scoped =
      user?.role === "technician" && company?.businessSize === "enterprise";
    const queries = manager
      ? [tasks]
      : scoped
        ? [
            query(
              tasks,
              where("visibleTo", "array-contains", uid),
              where("target.scope", "==", "company"),
            ),
          ]
        : [query(tasks, where("visibleTo", "array-contains", uid))];
    const blocks = blockKey ? blockKey.split(",") : [];
    if (!manager && scoped) {
      for (let index = 0; index < blocks.length; index += 30) {
        queries.push(
          query(
            tasks,
            where("visibleTo", "array-contains", uid),
            where("target.blockId", "in", blocks.slice(index, index + 30)),
          ),
        );
      }
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 150);
    };
    const subscriptions = queries.map((q) =>
      onSnapshot(q, changed, (e) => setError(e.message)),
    );
    return () => {
      clearTimeout(timer);
      subscriptions.forEach((stop) => stop());
    };
  }, [
    uid,
    companyId,
    user?.role,
    company?.ownerId,
    company?.businessSize,
    blockKey,
    refresh,
  ]);

  const command = async (data: Record<string, unknown>) => {
    if (!uid || !companyId) throw new Error("Select your farm first.");
    const taskContext = workspace.tasks.find((task) => task.id === data.taskId),
      adoptionContext = workspace.adoptions.find(
        (ad) => ad.id === taskContext?.adoptionId,
      );
    const adoptionPrecondition =
      data.action === "submitEvidence" && adoptionContext
        ? { expectedAdoptionRevision: adoptionContext.revision }
        : {};
    const operationId = `sop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      payload = { ...data, ...adoptionPrecondition, companyId, operationId };
    setBusy(true);
    try {
      if (data.action === "submitEvidence") {
        await saveDurableMutation({
          id: operationId,
          userId: uid,
          companyId,
          createdAt: Date.now(),
          kind: "callable",
          path: ["companies", companyId],
          data: payload,
          uploadLocalFiles: true,
          uploadPath: `companies/${companyId}/sopAttachments/${uid}/${operationId}`,
          functionCall: { name: "sopCommand", payload },
        });
        const queue = await listOfflineMutations(uid, companyId);
        setPending(
          queue
            .filter((q) => q.kind === "callable")
            .map((q) => String(q.data?.taskId)),
        );
        await refresh();
        return { pending: queue.some((q) => q.id === operationId) };
      }
      if (!(await isWorkspaceOnline()))
        throw new Error("This change requires an internet connection.");
      const result = await call("sopCommand", payload);
      await refresh();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const assist = async (data: Record<string, unknown>) => {
    setBusy(true);
    try {
      return await call("assistSop", { ...data, companyId });
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: unknown, taskId = "") => {
    const asset = file as {
      uri: string;
      name: string;
      mimeType?: string;
      size?: number;
    };
    if (!asset?.uri || !uid || !companyId) throw new Error("Select a file.");
    if ((asset.size || 0) > 10 * 1024 * 1024)
      throw new Error("Files must be at most 10 MB.");
    const contentType = asset.mimeType || "image/jpeg";
    if (taskId && !(await isWorkspaceOnline()))
      return { path: asset.uri, name: asset.name, contentType };
    const path = `companies/${companyId}/sopAttachments/${uid}/sop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const blob = await (await fetch(asset.uri)).blob();
    await uploadBytes(ref(storage, path), blob, {
      contentType,
      customMetadata: { companyId, taskId },
    });
    return { path, name: asset.name, contentType };
  };
  const loadMore = async (
    kind: "tasks" | "issues" | "sops" | "adoptions" | "community",
  ) => {
    const cursorKey = {
      tasks: "nextTaskCursor",
      issues: "nextIssueCursor",
      sops: "nextSopCursor",
      adoptions: "nextAdoptionCursor",
      community: "nextCommunityCursor",
    } as const;
    const cursor = workspace[cursorKey[kind]];
    if (!cursor) return;
    const result = (await call("getSopHistory", {
      companyId,
      kind,
      cursor,
    })) as unknown as {
      items: SopWorkspace["tasks"] & SopWorkspace["issues"];
      nextCursor: string;
    };
    setWorkspace((w) => ({
      ...w,
      [kind]: [
        ...w[kind],
        ...result.items.filter(
          (row) => !w[kind].some((old) => old.id === row.id),
        ),
      ],
      [cursorKey[kind]]: result.nextCursor,
    }));
  };
  const openAttachment = async (attachment: SopAttachment) => {
    const bytes = await getBytes(
      ref(storage, attachment.path),
      10 * 1024 * 1024,
    );
    const destination = `${FileSystem.cacheDirectory}sop-${encodeURIComponent(attachment.name)}`;
    await FileSystem.writeAsStringAsync(
      destination,
      fromByteArray(new Uint8Array(bytes)),
      { encoding: FileSystem.EncodingType.Base64 },
    );
    await Sharing.shareAsync(destination, {
      mimeType: attachment.contentType,
      dialogTitle: "Open SOP evidence",
    });
  };
  return {
    versions: async (sopId, cursor) =>
      (await call("getSopVersions", {
        companyId,
        sopId,
        cursor,
      })) as unknown as {
        items: import("../../shared/sop/client").SopVersion[];
        nextCursor: string;
      },
    workspace,
    loadMore,
    openAttachment,
    loading,
    error,
    pending,
    busy,
    refresh,
    command,
    assist,
    upload,
  };
}
