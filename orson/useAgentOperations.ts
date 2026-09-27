import { useCallback, useEffect, useRef, useState } from "react";
import {
  acceptOrsonActivity,
  mergeOrsonOperation,
} from "../shared/orsonAgentContract";
import { describeSaveStatus } from "./conversationOperations";
import type {
  OrsonActivity,
  OrsonCommand,
  OrsonOperation,
} from "../shared/orsonAgentContract";
export type AgentTransport = (
  name: string,
  data: Record<string, unknown>,
) => Promise<unknown>;
export type AgentCatalog = {
  ponds: { id: string; name: string; cycleStatus: string }[];
  feeds: { id: string; name: string; unit: string }[];
  additives: { id: string; name: string; unit: string }[];
};
type AgentStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): unknown;
};
export function useAgentOperations(
  companyId: string,
  uid: string,
  transport: AgentTransport,
  storage?: AgentStorage,
  externalBusy = false,
) {
  const [operations, setOperations] = useState<OrsonOperation[]>([]);
  const [catalog, setCatalog] = useState<AgentCatalog>({
    ponds: [],
    feeds: [],
    additives: [],
  });
  const [busy, setBusy] = useState(false);
  const [inputBusy, setInputBusy] = useState(false);
  const [busyStep, setBusyStep] = useState("working");
  const lastActivity = useRef<OrsonActivity | null>(null);
  const [error, setError] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState<Record<string, string>>({});
  const [activityFinished, setActivityFinished] = useState(false);
  const [activity, setActivity] = useState<OrsonActivity | null>(null);
  const [stepStarted, setStepStarted] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const mounted = useRef(true),
    lock = useRef(false),
    operationIds = useRef<string[]>([]);
  const transportRef = useRef(transport);
  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);
  const storageKey = `orson-agent:${uid}:${companyId}`;
  const receive = useCallback(
    (operation: OrsonOperation) => {
      if (!mounted.current) return;
      setOperations((old) =>
        [
          ...old.filter((op) => op.id !== operation.id),
          mergeOrsonOperation(
            old.find((op) => op.id === operation.id),
            operation,
          ),
        ].slice(-10),
      );
      operationIds.current = [
        ...operationIds.current.filter((id) => id !== operation.id),
        operation.id,
      ].slice(-10);
      void Promise.resolve(
        storage?.setItem(storageKey, JSON.stringify(operationIds.current)),
      ).catch(() => {});
    },
    [storage, storageKey],
  );
  const onActivity = useCallback((event: OrsonActivity) => {
    if (!mounted.current) return;
    const next = acceptOrsonActivity(lastActivity.current, event);
    if (!next || next === lastActivity.current) return;
    const changed = next.step !== lastActivity.current?.step;
    lastActivity.current = next;
    setActivity(next.state === "running" ? next : null);
    setActivityFinished(next.state !== "running");
    if (!changed) return;
    setStepStarted(Date.now());
    setElapsed(0);
  }, []);
  useEffect(() => {
    if (!activity && !busy) return;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - stepStarted) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [activity, busy, stepStarted]);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      try {
        const ids: unknown = JSON.parse(
          (await storage?.getItem(storageKey)) || "[]",
        );
        if (Array.isArray(ids))
          for (const id of ids.slice(-10)) {
            if (!active || typeof id !== "string") continue;
            try {
              const op = (await transportRef.current("getOrsonOperation", {
                companyId,
                operationId: id,
              })) as OrsonOperation;
              if (active) receive(op);
            } catch {
              /* Revalidate access before showing stored drafts. */
            }
          }
      } catch {
        /* Storage may be unavailable. */
      }
    })();
    return () => {
      mounted.current = false;
      active = false;
    };
  }, [companyId, receive, storage, storageKey]);
  const loadCatalog = useCallback(async () => {
    try {
      const result = (await transportRef.current("getOrsonAgentCatalog", {
        companyId,
      })) as AgentCatalog;
      if (mounted.current) setCatalog(result);
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "Unable to load farm choices.",
        );
    }
  }, [companyId]);
  const run = async (
    name: string,
    data: Record<string, unknown>,
    recoveryId?: string,
  ) => {
    if (lock.current || inputBusy || externalBusy) return null;
    lock.current = true;
    setBusy(true);
    setStepStarted(Date.now());
    setElapsed(0);
    setBusyStep(
      name === "confirmOrsonOperation"
        ? "saving"
        : name === "getOrsonOperation"
          ? "record_lookup"
          : "draft_prepare",
    );
    setError("");
    let outcome: OrsonOperation | null = null;
    try {
      const result = (await transportRef.current(name, {
        companyId,
        ...data,
      })) as OrsonOperation;
      receive(result);
      outcome = result;
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "The request could not be completed.",
        );
      if (recoveryId) {
        try {
          const latest = (await transportRef.current("getOrsonOperation", {
              companyId,
              operationId: recoveryId,
            })) as OrsonOperation;
          receive(latest);
          outcome = latest;
        } catch {
          if (mounted.current)
            setError(
              "Connection interrupted. Use Check save status before retrying; some entries may already be saved.",
            );
        }
      }
    } finally {
      lock.current = false;
      if (mounted.current) {
        setBusy(false);
        setActivity(null);
      }
    }
    return outcome;
  };
  const recover = async (op: OrsonOperation) => {
    const latest = await run("getOrsonOperation", { operationId: op.id });
    setRecoveryStatus((previous) => ({
      ...previous,
      [op.id]: latest
        ? describeSaveStatus(latest)
        : "Couldn't verify save status. Check your connection and try again.",
    }));
    return latest;
  };
  return {
    operations,
    catalog,
    busy: busy || inputBusy || externalBusy,
    operationBusy: busy,
    busyStep,
    setInputBusy,
    error,
    recoveryStatus,
    activity,
    activityFinished,
    elapsed,
    receive,
    onActivity,
    loadCatalog,
    clearActivity: () => {
      lastActivity.current = null;
      setActivityFinished(false);
      setActivity(null);
      setElapsed(0);
    },
    update: (op: OrsonOperation, commands: OrsonCommand[]) =>
      run("executeOrsonAction", {
        operationId: op.id,
        revision: op.revision,
        commands,
      }),
    discard: (op: OrsonOperation) =>
      run("executeOrsonAction", {
        operationId: op.id,
        revision: op.revision,
        discard: true,
      }),
    confirm: (op: OrsonOperation, selectedRowIds: string[]) =>
      run(
        "confirmOrsonOperation",
        { operationId: op.id, revision: op.revision, selectedRowIds },
        op.id,
      ),
    recover,
  };
}
export type AgentController = ReturnType<typeof useAgentOperations>;
