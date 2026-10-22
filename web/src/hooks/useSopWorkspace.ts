"use client";
import { getUserErrorMessage } from '@/lib/userError';

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
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
import { mergeSopTaskUpdates, mergeSopStatus } from "../../../shared/sop/workspaceUpdates";
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
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const update = () => setForeground(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
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

        let data = (await call("getSopWorkspace", { companyId, compact: true, liveTasks: true, statusOnly: !full, notificationsAfter: notificationSince.current })) as unknown as SopWorkspace;
        if (!full && data.refreshRequired) {
          data = (await call("getSopWorkspace", { companyId, compact: true, liveTasks: true })) as unknown as SopWorkspace;
          full = true;
        }
        const taskChanges = { items: [] as SopWorkspace["tasks"], removedIds: [] as string[] };
        if (full) {
          const linkedId = new URLSearchParams(window.location.search).get("taskId");
          const extras = workspaceRef.current.tasks.filter((task) => ["open", "scheduled", "submitted", "needs_review"].includes(task.status) && !watchedTasks.current.has(task.id)).map((task) => task.id);
          if (linkedId && !extras.includes(linkedId) && !data.tasks.some(task => task.id === linkedId)) extras.push(linkedId);
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
        if (identity.current === captured) setError(getUserErrorMessage(e, "Unable to load workflows."));
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
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* The live view remains usable when local storage is full. */ }
  }, [workspace, loading, uid, companyId, key, cacheScopeKey]);
  useEffect(() => {
    identity.current = cacheScopeKey;
    // Resetting the scoped cache on an identity change is required for data isolation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspace(emptySopWorkspace());
    lastFullRefresh.current = 0;
    setPending([]);
    setError("");
    setLoading(true);
    if (!uid || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const cache = localStorage.getItem(key);
      if (cache) {
        const cached = JSON.parse(cache) as SopWorkspace;
        if (!cached.cacheScopeKey || cached.cacheScopeKey === cacheScopeKey) setWorkspace(cached);
        if (cached.cacheScopeKey === cacheScopeKey && cached.compact &&
            cached.metadataLoadedAt && cached.metadataLoadedAt <= Date.now()) {
          lastFullRefresh.current = cached.metadataLoadedAt;
          notificationSince.current = cached.refreshedAt || 0;
        }
      }
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
      if (cancelled || flushing || !navigator.onLine || document.visibilityState !== "visible") return;
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
        await refresh(false);
      } catch (e) {
        if (!cancelled)
          setError(
            getUserErrorMessage(e, "Offline submissions await retry."),
          );
      } finally {
        flushing = false;
      }
    };
    void sync();
    window.addEventListener("online", sync);
    const visibleSync = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", visibleSync);
    const timer = window.setInterval(visibleSync, 300000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", visibleSync);
      identity.current = "";
    };
  }, [uid, companyId, key, user?.role, company?.ownerId, cacheScopeKey, call, refresh]);
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
        } catch (e) { if (!stopped) setError(getUserErrorMessage(e, "Unable to update tasks.")); }
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
      }, (e) => setError(getUserErrorMessage(e)));
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
      setError(getUserErrorMessage(e, "Unable to save."));
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
