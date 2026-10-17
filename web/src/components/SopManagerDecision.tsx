"use client";
import { getUserErrorMessage } from '@/lib/userError';

import { useState } from "react";
import type { SopClient } from "../../../shared/sop/client";
import type { SopTask } from "../../../shared/sop/contracts";

export default function SopManagerDecision({
  task,
  client,
  ui,
  onSaved,
}: {
  task: SopTask;
  client: SopClient;
  ui: (value: string) => string;
  onSaved: () => void;
}) {
  const [decision, setDecision] = useState<{
    action: "review" | "waive" | "cancel" | "postpone";
    result?: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [deadline, setDeadline] = useState(() =>
    Number.isFinite(task.dueAt) ? new Date(task.dueAt).toISOString() : "",
  );
  const [error, setError] = useState("");
  const select = (value: NonNullable<typeof decision>) => {
    setDecision(value);
    setReason("");
    setError("");
  };
  const save = async () => {
    if (!decision || !reason.trim() || client.busy) return;
    setError("");
    try {
      const result = await client.command({
        ...decision,
        taskId: task.id,
        expectedRevision: task.revision,
        reason: reason.trim(),
        ...(decision.action === "postpone"
          ? { dueAt: Date.parse(deadline) }
          : {}),
      });
      if (result.ok !== true)
        throw new Error(
          "The decision was not confirmed. Refresh before trying again.",
        );
      onSaved();
    } catch (e) {
      setError(getUserErrorMessage(e, "Unable to save the decision."));
    }
  };
  return (
    <>
      <div className="sop-toolbar">
        {(["pass", "fail", "not_applicable"] as const).map((result) => (
          <button
            type="button"
            key={result}
            disabled={client.busy}
            onClick={() => select({ action: "review", result })}
          >
            {ui("Review as")} {ui(result)}
          </button>
        ))}
        {(["waive", "cancel", "postpone"] as const).map((action) => (
          <button
            type="button"
            key={action}
            disabled={client.busy}
            onClick={() => select({ action })}
          >
            {ui(action)}
          </button>
        ))}
      </div>
      {decision && (
        <section
          className="sop-omission-editor"
          aria-label={ui("Confirm decision")}
        >
          <label className="sop-field">
            {ui("Reason for")} {ui(decision.result || decision.action)}
            <textarea
              value={reason}
              disabled={client.busy}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {decision.action === "postpone" && (
            <label className="sop-field">
              {ui("New deadline (ISO date and time)")}
              <input
                value={deadline}
                disabled={client.busy}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="sop-alert">
              {ui(error)}
            </p>
          )}
          <button
            type="button"
            className="sop-primary"
            disabled={
              client.busy ||
              !reason.trim() ||
              (decision.action === "postpone" &&
                !Number.isFinite(Date.parse(deadline)))
            }
            onClick={() => void save()}
          >
            {ui(client.busy ? "Saving…" : "Confirm decision")}
          </button>
        </section>
      )}
    </>
  );
}
