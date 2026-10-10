"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { callSopFunction } from "../../../shared/sop/callable";
import { ref, uploadBytes, getBlob, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  emptySopWorkspace,
  type SopClient,
  type SopWorkspace,
} from "../../../shared/sop/client";
import {
  cacheSopFile,
  resolveSopFiles,
  removeSopFiles,
} from "@/lib/sopOfflineFiles";
import type { SopAttachment } from "../../../shared/sop/contracts";
import { sopCanManage } from "../../../shared/sop/contracts";
interface QueueItem {
  operationId: string;
  data: Record<string, unknown>;
}
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
  const key = `shrimply:sop:${uid}:${companyId}`;
  const call = useCallback(
    async (name: string, payload: Record<string, unknown>) =>
      callSopFunction(getFunctions(db.app), name, payload),
    [],
  );
  const refresh = useCallback(async () => {
    if (!uid || !companyId) {
      setLoading(false);
      return;
    }
    const captured = `${uid}:${companyId}`;
    try {
      const data = (await call("getSopWorkspace", {
        companyId,
      })) as unknown as SopWorkspace;
      if (identity.current === captured) {
        setWorkspace(data);
        setError("");
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      if (identity.current === captured)
        setError(e instanceof Error ? e.message : "Unable to load SOPs.");
    } finally {
      if (identity.current === captured) setLoading(false);
    }
  }, [uid, companyId, key, call]);
  useEffect(() => {
    identity.current = `${uid}:${companyId}`;
    // Resetting the scoped cache on an identity change is required for data isolation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspace(emptySopWorkspace());
    setPending([]);
    setError("");
    setLoading(true);
    if (!uid || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const cache = localStorage.getItem(key);
      if (cache) setWorkspace(JSON.parse(cache));
      const queue = JSON.parse(
        localStorage.getItem(key + ":queue") || "[]",
      ) as QueueItem[];
      setPending(queue.map((q) => String(q.data.taskId)));
    } catch {
      localStorage.removeItem(key);
    }
    let cancelled = false,
      flushing = false;
    const sync = async () => {
      if (cancelled || flushing || !navigator.onLine) return;
      flushing = true;
      try {
        let queue = JSON.parse(
          localStorage.getItem(key + ":queue") || "[]",
        ) as QueueItem[];
        for (const item of [...queue]) {
          if (cancelled) return;
          const attachments = (item.data.attachments || []) as SopAttachment[];
          const resolved = await resolveSopFiles(
            uid,
            companyId,
            String(item.data.taskId),
            attachments,
          );
          await call("sopCommand", { ...item.data, attachments: resolved });
          queue = (
            JSON.parse(
              localStorage.getItem(key + ":queue") || "[]",
            ) as QueueItem[]
          ).filter((q) => q.operationId !== item.operationId);
          localStorage.setItem(key + ":queue", JSON.stringify(queue));
          await removeSopFiles(attachments).catch(() => undefined);
          setPending(queue.map((q) => String(q.data.taskId)));
        }
        await refresh();
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Offline submissions await retry.",
          );
      } finally {
        flushing = false;
      }
    };
    void sync();
    window.addEventListener("online", sync);
    const timer = window.setInterval(() => void sync(), 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", sync);
      identity.current = "";
    };
  }, [uid, companyId, key, user?.role, company?.ownerId, call, refresh]);
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
    const captured = identity.current,
      payload = {
        ...data,
        ...adoptionPrecondition,
        companyId,
        operationId: crypto.randomUUID(),
      };
    setBusy(true);
    try {
      if (data.action === "submitEvidence") {
        const queue = JSON.parse(
          localStorage.getItem(key + ":queue") || "[]",
        ) as QueueItem[];
        queue.push({ operationId: payload.operationId, data: payload });
        localStorage.setItem(key + ":queue", JSON.stringify(queue));
        setPending(queue.map((q) => String(q.data.taskId)));
        if (!navigator.onLine) return { pending: true };
      } else if (!navigator.onLine)
        throw new Error("This change requires an internet connection.");
      const attachments = (data.attachments || []) as SopAttachment[];
      const resolved =
        data.action === "submitEvidence"
          ? await resolveSopFiles(
              uid,
              companyId,
              String(data.taskId),
              attachments,
            )
          : attachments;
      const result = await call("sopCommand", {
        ...payload,
        ...(data.action === "submitEvidence" ? { attachments: resolved } : {}),
      });
      if (data.action === "submitEvidence") {
        const remaining = (
          JSON.parse(
            localStorage.getItem(key + ":queue") || "[]",
          ) as QueueItem[]
        ).filter((q) => q.operationId !== payload.operationId);
        localStorage.setItem(key + ":queue", JSON.stringify(remaining));
        await removeSopFiles(attachments).catch(() => undefined);
        if (identity.current === captured)
          setPending(remaining.map((q) => String(q.data.taskId)));
      }
      if (identity.current === captured) await refresh();
      return result;
    } catch (e) {
      if (
        data.action === "submitEvidence" &&
        (!navigator.onLine ||
          [
            "functions/unavailable",
            "functions/deadline-exceeded",
            "functions/network-request-failed",
          ].includes((e as { code?: string }).code || ""))
      )
        return { pending: true };
      setError(e instanceof Error ? e.message : "Unable to save.");
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const assist = async (data: Record<string, unknown>) => {
    if (!uid || !companyId) throw new Error("Select your farm first.");
    const captured = identity.current;
    setBusy(true);
    try {
      const result = await call("assistSop", { ...data, companyId });
      if (identity.current !== captured)
        throw new Error(
          "Your farm changed. Open the SOP in the current farm and retry.",
        );
      return result;
    } finally {
      if (identity.current === captured) setBusy(false);
    }
  };
  const upload = async (file: unknown, taskId = "") => {
    if (!(file instanceof File) || !uid || !companyId)
      throw new Error("Select a file.");
    if (file.size > 10 * 1024 * 1024)
      throw new Error("Files must be at most 10 MB.");
    if (taskId && taskId !== "guidance")
      return cacheSopFile(uid, companyId, file);
    if (!navigator.onLine)
      throw new Error(
        "Guidance and authoring imports require an internet connection.",
      );
    const contentType = file.type || "text/plain",
      path = `companies/${companyId}/sopAttachments/${uid}/${crypto.randomUUID()}`;
    await uploadBytes(ref(storage, path), file, {
      contentType,
      customMetadata: { companyId, taskId },
    });
    return { path, name: file.name, contentType };
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
  const openAttachment = async (
    attachment: SopAttachment,
    download = false,
  ) => {
    if (download) {
      // A direct source link does not require browser byte-download CORS.
      // Firebase authorizes metadata access before returning the existing URL.
      const url = await getDownloadURL(ref(storage, attachment.path));
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      link.target = "_blank";
      link.rel = "noopener";
      link.click();
      return;
    }
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const blob = await getBlob(
        ref(storage, attachment.path),
        10 * 1024 * 1024,
      );
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else {
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.name;
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      tab?.close();
      throw e;
    }
  };
  return {
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
