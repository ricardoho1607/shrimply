import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { fromByteArray } from "base64-js";
import type { SopAttachment } from "../../shared/sop/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { callSopFunction } from "../../shared/sop/callable";
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
import { mergeSopTaskUpdates, mergeSopStatus } from "../../shared/sop/workspaceUpdates";
export function useSopWorkspace(): SopClient {
  const { user, company } = useAuth(),
    uid = user?.uid,
    companyId = company?.id;
  const [workspace, setWorkspace] = useState<SopWorkspace>(emptySopWorkspace),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<string[]>([]);
  const watchedTasks = useRef(new Set<string>());
  const workspaceRef = useRef(workspace);
  useEffect(() => { workspaceRef.current = workspace; }, [workspace]);
  const identity = useRef("");
  const cacheScopeKey = JSON.stringify([uid, companyId, user?.role, company?.ownerId, company?.businessSize]);
  const lastFullRefresh = useRef(0);
  const notificationSince = useRef(0);
  const inFlight = useRef<{ identity: string; promise: Promise<void> } | null>(null);
  const [foreground, setForeground] = useState(() => AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);
  const blockKey = workspace.blocks
    .map((b) => b.id)
    .sort()
    .join(",");
  const call = useCallback(
    async (name: string, data: Record<string, unknown>) =>
      callSopFunction(getFunctions(db.app), name, data),
    [],
  );
  const refresh = useCallback(async (forceFull = true) => {
    if (!uid || !companyId) { setLoading(false); return; }
    const captured = cacheScopeKey;
    if (inFlight.current?.identity === captured) {
      await inFlight.current.promise;
      if (!forceFull) return;
    }
    let full = forceFull || !lastFullRefresh.current || Date.now() - lastFullRefresh.current >= 30 * 60000;
    const promise = (async () => {
      try {
        if (!(await isWorkspaceOnline())) return;
        let data = (await call("getSopWorkspace", { companyId, compact: true, liveTasks: true, statusOnly: !full, notificationsAfter: notificationSince.current })) as unknown as SopWorkspace;
        if (!full && data.refreshRequired) {
          data = (await call("getSopWorkspace", { companyId, compact: true, liveTasks: true })) as unknown as SopWorkspace;
          full = true;
        }
        const taskChanges = { items: [] as SopWorkspace["tasks"], removedIds: [] as string[] };
        if (full && watchedTasks.current.size) {
          const extras = workspaceRef.current.tasks.filter((task) => ["open", "scheduled", "submitted", "needs_review"].includes(task.status) && !watchedTasks.current.has(task.id)).map((task) => task.id);
          for (let offset = 0; offset < extras.length; offset += 50) {
            const result = await call("getSopWorkspace", { taskUpdates: true, companyId, taskIds: extras.slice(offset, offset + 50) }) as unknown as typeof taskChanges;
            taskChanges.items.push(...result.items); taskChanges.removedIds.push(...result.removedIds);
          }
        }
        if (identity.current === captured) {
          const metadataLoadedAt = Date.now();
          setWorkspace((previous) => full ? mergeSopStatus(previous, {
            ...data,
            tasks: mergeSopTaskUpdates(mergeSopTaskUpdates(previous.tasks.filter((task) => ["open", "scheduled", "submitted", "needs_review"].includes(task.status)), data.tasks), taskChanges.items, taskChanges.removedIds),
            nextActiveTaskCursor: previous.compact ? previous.nextActiveTaskCursor : data.nextActiveTaskCursor,
            metadataLoadedAt, cacheScopeKey,
          }, user?.role, company?.businessSize) : mergeSopStatus(previous, data, user?.role, company?.businessSize));
          if (full) lastFullRefresh.current = metadataLoadedAt;
          notificationSince.current = data.refreshedAt || 0;
          setError("");
        }
      } catch (e) {
        if (identity.current === captured) setError(e instanceof Error ? e.message : "Unable to load workflows.");
      } finally {
        if (identity.current === captured) setLoading(false);
      }
    })();
    inFlight.current = { identity: captured, promise };
    try { await promise; } finally { if (inFlight.current?.promise === promise) inFlight.current = null; }
  }, [uid, companyId, call, user?.role, company?.businessSize, cacheScopeKey]);
  useEffect(() => {
    if (!uid || !companyId || loading || identity.current !== cacheScopeKey) return;
    const next = workspace;
    void (async () => { await persistOfflineCollection(uid, companyId, "sop-workspace", [{ id: "workspace", ...next }]); })().catch(() => undefined);
  }, [workspace, loading, uid, companyId, cacheScopeKey]);
  useEffect(() => {
    const captured = cacheScopeKey;
    identity.current = captured;
    // Resetting the scoped cache on an identity change is required for data isolation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspace(emptySopWorkspace());
    lastFullRefresh.current = 0;
    setPending([]);
    setLoading(true);
    if (!uid || !companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false, flushing = false, loadedCache = false;
    const sync = async () => {
      if (cancelled || flushing || AppState.currentState !== "active") return;
      flushing = true;
      try {
        if (!loadedCache) {
          loadedCache = true;
          const cached = await loadOfflineCollection<SopWorkspace & { id: string }>(uid, companyId, "sop-workspace");
          const saved = cached[0];
          if (!cancelled && saved && (!saved.cacheScopeKey || saved.cacheScopeKey === cacheScopeKey)) setWorkspace(saved);
          if (saved?.cacheScopeKey === cacheScopeKey && saved.compact &&
              saved.metadataLoadedAt && saved.metadataLoadedAt <= Date.now()) {
            lastFullRefresh.current = saved.metadataLoadedAt;
            notificationSince.current = saved.refreshedAt || 0;
          }
        }
        await flushOfflineMutations(uid, companyId);
        const queue = await listOfflineMutations(uid, companyId);
        if (!cancelled)
          setPending(
            queue
              .filter((q) => q.kind === "callable")
              .map((q) => String(q.data?.taskId)),
          );
        if (!cancelled) await refresh(false);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Queued evidence is waiting to sync.",
          );
      } finally {
        flushing = false;
        if (!cancelled) setLoading(false);
      }
    };
    void sync();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void sync(); });
    const timer = setInterval(() => void sync(), 300000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
      identity.current = "";
    };
  }, [uid, companyId, user?.role, company?.ownerId, cacheScopeKey, refresh]);
  useEffect(() => {
    if (!uid || !companyId || !foreground || loading) return;
    const manager = sopCanManage(user?.role, uid, company.ownerId);
    const tasks = collection(db, "companies", companyId, "tasks");
    const activeTasks = where("status", "in", ["open", "scheduled", "submitted", "needs_review"]);
    const scoped =
      user?.role === "technician" && company?.businessSize === "enterprise";
    const queries = manager
      ? [query(tasks, activeTasks)]
      : scoped
        ? [
            query(
              tasks,
              activeTasks,
              where("visibleTo", "array-contains", uid),
              where("target.scope", "==", "company"),
            ),
          ]
        : [query(tasks, activeTasks, where("visibleTo", "array-contains", uid))];
    const blocks = blockKey ? blockKey.split(",") : [];
    if (!manager && scoped) {
      for (let index = 0; index < blocks.length; index += 7) {
        queries.push(
          query(
            tasks,
            activeTasks,
            where("visibleTo", "array-contains", uid),
            where("target.blockId", "in", blocks.slice(index, index + 7)),
          ),
        );
      }
    }
    const primaryQueryCount = queries.length;
    queries.push(...queries.map((q) => query(q, where("step.severity", "==", "critical"))));
    const trackedQueries = new Map<number, Set<string>>();
    watchedTasks.current = new Set();
    const captured = cacheScopeKey;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const removed = new Set<string>();
    const initialIds = new Set<string>();
    let initialRemaining = queries.length;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void (async () => {
        const ids = [...removed]; removed.clear();
        try {
          for (let offset = 0; offset < ids.length; offset += 50) {
            const result = await call("getSopWorkspace", { taskUpdates: true, companyId, taskIds: ids.slice(offset, offset + 50) }) as unknown as { items: SopWorkspace["tasks"]; removedIds: string[] };
            if (!stopped && identity.current === captured)
              setWorkspace((w) => ({ ...w, tasks: mergeSopTaskUpdates(w.tasks, result.items, result.removedIds) }));
          }
          if (!stopped) await refresh(false);
        } catch (e) { if (!stopped) setError(e instanceof Error ? e.message : "Unable to update tasks."); }
      })(), 750);
    };
    const subscriptions = queries.map((q, queryIndex) => {
      let initial = true;
      return onSnapshot(query(q, orderBy("dueAt", "asc"), limit(100)), (snapshot) => {
        if (stopped || identity.current !== captured) return;
        trackedQueries.set(queryIndex, new Set(snapshot.docs.map((document) => document.id)));
        watchedTasks.current = new Set([...trackedQueries.values()].flatMap((ids) => [...ids]));
        if (initial) {
          for (const document of snapshot.docs) initialIds.add(document.id);
          if (--initialRemaining === 0) {
            for (const task of workspaceRef.current.tasks)
              if (["open", "scheduled", "submitted", "needs_review"].includes(task.status) && !initialIds.has(task.id)) removed.add(task.id);
          }
        }
        const items = snapshot.docChanges().filter((change) => change.type !== "removed")
          .map((change) => ({ id: change.doc.id, ...change.doc.data() }) as SopWorkspace["tasks"][number]);
        setWorkspace((w) => ({ ...w, tasks: mergeSopTaskUpdates(w.tasks, items),
          ...(initial && primaryQueryCount === 1 && queryIndex === 0 && w.compact ? { nextActiveTaskCursor: snapshot.size === 100 ? snapshot.docs.at(-1)?.id || "" : "" } : {}),
        }));
        for (const change of snapshot.docChanges()) if (change.type === "removed") removed.add(change.doc.id);
        if (!initial || removed.size) changed();
        initial = false;
      }, (e) => setError(e.message));
    });
    return () => { stopped = true; clearTimeout(timer); subscriptions.forEach((stop) => stop()); watchedTasks.current = new Set(); };
  }, [
    uid,
    companyId,
    user?.role,
    company?.ownerId,
    company?.businessSize,
    blockKey,
    foreground,
    cacheScopeKey,
    loading,
    call,
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
    if (!(await isWorkspaceOnline())) {
      if (taskId && taskId !== "guidance")
        return { path: asset.uri, name: asset.name, contentType };
      throw new Error("Connect to upload SOP guidance.");
    }
    const path = `companies/${companyId}/sopAttachments/${uid}/sop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const blob = await (await fetch(asset.uri)).blob();
    await uploadBytes(ref(storage, path), blob, {
      contentType,
      customMetadata: { companyId, taskId },
    });
    return { path, name: asset.name, contentType };
  };
  const loadMore = async (
    kind: "tasks" | "issues" | "sops" | "adoptions" | "community" | "notifications",
  ) => {
    const cursorKey = {
      tasks: "nextTaskCursor",
      issues: "nextIssueCursor",
      sops: "nextSopCursor",
      adoptions: "nextAdoptionCursor",
      community: "nextCommunityCursor",
      notifications: "nextNotificationCursor",
    } as const;
    const activePage = kind === "tasks" && !!workspace.nextActiveTaskCursor;
    const selectedCursor = activePage ? "nextActiveTaskCursor" : cursorKey[kind];
    const cursor = workspace[selectedCursor];
    if (!cursor) return;
    const result = (await call("getSopHistory", {
      companyId,
      kind: kind === "tasks" && workspace.compact ? (activePage ? "activeTasks" : "taskHistory") : kind,
      cursor: cursor === "__first__" ? null : cursor,
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
      [selectedCursor]: result.nextCursor,
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
