"use client";
import { sopText } from "../../../../../shared/sop/uiCopy";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSopWorkspace } from "@/hooks/useSopWorkspace";
import { useLanguage } from "@/contexts/LanguageContext";
import { sopCopy } from "../../../../../shared/sop/copy";
import type {
  SopAttachment,
  SopTask,
} from "../../../../../shared/sop/contracts";
import "../sops/sops.css";
export default function TodoPage() {
  const { user, company } = useAuth();
  return <TodoPageContent key={`${user?.uid}:${company?.id}`} />;
}
function TodoPageContent() {
  const client = useSopWorkspace(),
    w = client.workspace,
    { currentLanguage } = useLanguage(),
    c = sopCopy(currentLanguage);
  const ui = (value: string) => sopText(value, currentLanguage);
  const [status, setStatus] = useState("active"),
    [person, setPerson] = useState(""),
    [pond, setPond] = useState(""),
    [block, setBlock] = useState(""),
    [urgency, setUrgency] = useState(""),
    [date, setDate] = useState(""),
    [adoption, setAdoption] = useState(""),
    [issue, setIssue] = useState(""),
    [selected, setSelected] = useState<SopTask | null>(null),
    [notes, setNotes] = useState(""),
    [observedAt, setObservedAt] = useState(""),
    [attachments, setAttachments] = useState<SopAttachment[]>([]),
    [message, setMessage] = useState("");
  const [manualScope, setManualScope] = useState("company"),
    [manualTarget, setManualTarget] = useState(""),
    [manualSeverity, setManualSeverity] = useState("low");
  const [manual, setManual] = useState(false),
    [title, setTitle] = useState(""),
    [instructions, setInstructions] = useState(""),
    [assignee, setAssignee] = useState(""),
    [due, setDue] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const timer = setTimeout(() => {
      setAdoption(params.get("adoptionId") || "");
      setIssue(params.get("issueId") || "");
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const openedLink = useRef("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("taskId");
    if (!id || openedLink.current === id) return;
    const task = w.tasks.find((t) => t.id === id);
    if (!task) return;
    const timer = setTimeout(() => {
      openedLink.current = id;
      setSelected(task);
      setNotes(task.notes);
      setObservedAt(
        task.evidenceObservedAt
          ? new Date(task.evidenceObservedAt).toISOString()
          : "",
      );
      setAttachments(task.attachments);
    }, 0);
    return () => clearTimeout(timer);
  }, [w.tasks]);
  useEffect(() => {
    if (!selected) return;
    const live = w.tasks.find((t) => t.id === selected.id);
    if (
      !live ||
      live.revision === selected.revision ||
      notes !== selected.notes ||
      JSON.stringify(attachments) !== JSON.stringify(selected.attachments)
    )
      return;
    const timer = setTimeout(() => {
      setSelected(live);
      setNotes(live.notes);
      setAttachments(live.attachments);
    }, 0);
    return () => clearTimeout(timer);
  }, [w.tasks, selected, notes, attachments]);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      setMessage("");
      return await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
      return null;
    }
  };
  const tasks = w.tasks.filter(
    (t) =>
      (status === "all" ||
        (status === "active" &&
          !["completed", "waived", "cancelled"].includes(t.status)) ||
        t.status === status) &&
      (!person || t.assigneeId === person) &&
      (!pond || t.target.id === pond) &&
      (!block || t.target.blockId === block) &&
      (!urgency || t.step?.severity === urgency) &&
      (!date ||
        new Intl.DateTimeFormat("en-CA", {
          timeZone: w.timeZone || "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(t.dueAt)) === date) &&
      (!adoption || t.adoptionId === adoption) &&
      (!issue || t.issueId === issue),
  );
  if (client.loading)
    return <section className="sop-shell">{c.loading}</section>;
  return (
    <section className="sop-shell">
      <header className="sop-heading">
        <div>
          <p className="sop-eyebrow">{ui("SHRIMPLY • DAILY WORK")}</p>
          <h1>{c.todo}</h1>
          <p>{ui("Assigned work, evidence, and corrective follow-up.")}</p>
        </div>
        <Link className="sop-button" href="/dashboard/sops">
          {c.sops}
        </Link>
      </header>
      {(message || client.error) && (
        <div role="alert" className="sop-alert">
          {message || client.error}
        </div>
      )}
      {!!client.pending.length && (
        <p role="status">
          {client.pending.length} · {c.pending}
        </p>
      )}
      <div className="sop-toolbar">
        <button className="sop-primary" onClick={() => setManual(true)}>
          {c.manual}
        </button>
        <button onClick={() => void client.refresh()}>{c.refresh}</button>
      </div>
      <div className="sop-grid">
        <label className="sop-field">
          {ui("Status")}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {[
              "active",
              "all",
              "open",
              "scheduled",
              "submitted",
              "needs_review",
              "completed",
              "waived",
              "cancelled",
            ].map((s) => (
              <option key={s} value={s}>{ui(s)}</option>
            ))}
          </select>
        </label>
        <label className="sop-field">
          {ui("Responsible person")}
          <select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">{ui("All people")}</option>
            {w.members.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sop-field">
          {ui("Pond")}
          <select value={pond} onChange={(e) => setPond(e.target.value)}>
            <option value="">{ui("All ponds")}</option>
            {w.physicalPonds.map((p) => (
              <option value={p.id} key={p.id}>
                {p.pondName}
              </option>
            ))}
          </select>
        </label>
        <label className="sop-field">
          {ui("Block")}
          <select value={block} onChange={(e) => setBlock(e.target.value)}>
            <option value="">{ui("All blocks")}</option>
            {w.blocks.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sop-field">
          {ui("Urgency")}
          <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            {["", "low", "warning", "critical"].map((s) => (
              <option key={s} value={s}>
                {ui(s || "All urgency levels")}
              </option>
            ))}
          </select>
        </label>
        <label className="sop-field">
          {ui("Due date")}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      {!!(adoption || issue) && (
        <button
          onClick={() => {
            setAdoption("");
            setIssue("");
          }}
        >
          {ui("Clear SOP / issue filter")}
        </button>
      )}
      {!tasks.length && (
        <article className="sop-card">
          <h2>{ui("No tasks match these filters")}</h2>
          <p>{ui("Adopt a procedure or create a manual task to begin.")}</p>
        </article>
      )}
      {tasks.map((t) => (
        <article className="sop-card" key={t.id}>
          <div className="sop-toolbar">
            <h2>{t.title}</h2>
            <span className="sop-status">{ui(t.status)}</span>
            {t.dueAt < clock &&
              !["completed", "waived", "cancelled"].includes(t.status) && (
                <span className="sop-status">{ui("Overdue")}</span>
              )}
          </div>
          <p>
            {t.target.name} ·{" "}
            {w.members.find((m) => m.id === t.assigneeId)?.name ||
              ui("Assigned staff")}{" "}
            ·{" "}
            {new Date(t.dueAt).toLocaleString(currentLanguage, {
              timeZone: w.timeZone || "UTC",
            })}
          </p>
          <p>{t.instructions}</p>
          <p>
            {ui("Parameter result:")} {ui(t.result)}
          </p>
          {client.pending.includes(t.id) && <p>{c.pending}</p>}
          <div className="sop-toolbar">
            <button
              onClick={() => {
                setSelected(t);
                setNotes(t.notes);
                setObservedAt(
                  t.evidenceObservedAt
                    ? new Date(t.evidenceObservedAt).toISOString()
                    : "",
                );
                setAttachments(t.attachments);
              }}
            >
              {c.review}
            </button>
            {t.adoptionId && <Link href={`/dashboard/sops`}>{c.sops}</Link>}
            {t.target.pondId && (
              <Link
                href={`/dashboard/ponds/detail?id=${encodeURIComponent(t.target.pondId)}`}
              >
                {ui("Open pond")}
              </Link>
            )}
          </div>
        </article>
      ))}
      {w.nextTaskCursor && (
        <button onClick={() => void run(() => client.loadMore("tasks"))}>
          {ui("Load older tasks")}
        </button>
      )}
      {w.notifications.length > 0 && (
        <details className="sop-card">
          <summary>{ui("SOP notifications")}</summary>
          {w.notifications.map((n) => (
            <div key={n.id}>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
              {!n.read && (
                <button
                  onClick={() =>
                    void run(() =>
                      client.command({
                        action: "markRead",
                        notificationId: n.id,
                      }),
                    )
                  }
                >
                  {ui("Mark read")}
                </button>
              )}
            </div>
          ))}
        </details>
      )}
      {selected && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label={ui("Task evidence")}
          className="sop-dialog"
        >
          <div className="sop-card">
            <h2>{selected.title}</h2>
            <p>{selected.instructions}</p>
            {selected.step && (
              <p>
                {ui("Evidence:")} {selected.step.check.field} ·{" "}
                {selected.step.check.unit} ·{" "}
                {ui(selected.step.check.exactTime
                  ? "Exact observation time required"
                  : "Recorded date accepted")}
              </p>
            )}
            <label className="sop-field">
              {ui("When performed (ISO time)")}
              <input
                value={observedAt}
                onChange={(e) => setObservedAt(e.target.value)}
                placeholder={ui("2026-10-08T06:30+07:00")}
              />
            </label>
            <button onClick={() => setObservedAt(new Date().toISOString())}>
              {ui("Use current time")}
            </button>
            <label className="sop-field">
              {c.notes}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <label className="sop-field">
              {c.attachment}
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,.pdf,.docx,.txt"
                onChange={(e) =>
                  void run(async () => {
                    const uploads = await Promise.all(
                      Array.from(e.target.files || []).map((f) =>
                        client.upload(f, selected.id),
                      ),
                    );
                    setAttachments((a) => [...a, ...uploads]);
                  })
                }
              />
            </label>
            {attachments.map((a, i) => (
              <p key={a.path}>
                <button
                  onClick={() => void run(() => client.openAttachment(a))}
                >
                  {a.name}
                </button>{" "}
                <button
                  onClick={() =>
                    setAttachments((v) => v.filter((_, index) => i !== index))
                  }
                >
                  {ui("Remove")}
                </button>
              </p>
            ))}
            <button
              className="sop-primary"
              disabled={client.busy}
              onClick={() =>
                void run(async () => {
                  const result = await client.command({
                    action: "submitEvidence",
                    taskId: selected.id,
                    expectedRevision: selected.revision,
                    observedAt,
                    notes,
                    attachments,
                  });
                  setMessage(
                    result.pending
                      ? c.pending
                      : ui("Evidence submitted. Source records determine automatic checks."),
                  );
                  setSelected(null);
                })
              }
            >
              {c.submit}
            </button>
            {selected.step?.check.field === "manual" && (
              <button
                disabled={client.busy}
                onClick={() =>
                  void run(async () => {
                    const result = await client.assist({
                      mode: "assess",
                      taskId: selected.id,
                    });
                    setMessage(`${result.result}: ${result.explanation}`);
                    await client.refresh();
                  })
                }
              >
                {ui("Ask Orson to assess saved notes")}
              </button>
            )}
            {w.manage && (
              <details
                open={
                  selected.purpose === "recheck" &&
                  selected.status === "needs_review" &&
                  selected.result === "pass"
                }
              >
                <summary>
                  {ui(selected.purpose === "recheck" &&
                  selected.status === "needs_review"
                    ? "Recovery requires manager sign-off"
                    : "Manager decisions")}
                </summary>
                {["pass", "fail", "not_applicable"].map((result) => (
                  <button
                    key={result}
                    onClick={() => {
                      const reason = window.prompt(`${ui("Reason for")} ${ui(result)}`);
                      if (reason)
                        void run(async () => {
                          await client.command({
                            action: "review",
                            taskId: selected.id,
                            expectedRevision: selected.revision,
                            result,
                            reason,
                          });
                          setSelected(null);
                        });
                    }}
                  >
                    {ui("Review as")} {ui(result)}
                  </button>
                ))}
                {["waive", "cancel", "postpone"].map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      const reason = window.prompt(`${ui("Reason to")} ${ui(action)}`);
                      if (!reason) return;
                      let dueAt: number | undefined;
                      if (action === "postpone") {
                        const value = window.prompt(
                          ui("New deadline (ISO date and time)"),
                        );
                        if (!value) return;
                        dueAt = Date.parse(value);
                      }
                      void run(async () => {
                        await client.command({
                          action,
                          taskId: selected.id,
                          expectedRevision: selected.revision,
                          reason,
                          dueAt,
                        });
                        setSelected(null);
                      });
                    }}
                  >
                    {action}
                  </button>
                ))}
                <label className="sop-field">
                  {ui("Reassign")}
                  <select
                    defaultValue=""
                    onChange={(e) =>
                      void run(async () => {
                        await client.command({
                          action: "reassign",
                          taskId: selected.id,
                          expectedRevision: selected.revision,
                          assigneeId: e.target.value,
                        });
                        setSelected(null);
                      })
                    }
                  >
                    <option value="">{ui("Choose person")}</option>
                    {w.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              </details>
            )}
            <button onClick={() => setSelected(null)}>{ui("Close")}</button>
          </div>
        </section>
      )}
      {manual && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label={ui("Create farm task")}
          className="sop-dialog"
        >
          <div className="sop-card">
            <h2>{c.manual}</h2>
            <label className="sop-field">
              {ui("Urgency")}
              <select
                value={manualSeverity}
                onChange={(e) => setManualSeverity(e.target.value)}
              >
                {["low", "warning", "critical"].map((value) => (
                  <option key={value} value={value}>{ui(value)}</option>
                ))}
              </select>
            </label>
            <label className="sop-field">
              {ui("Title")}
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="sop-field">
              {ui("Instructions")}
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
            <label className="sop-field">
              {ui("Responsible person")}
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">{ui("Myself")}</option>
                {w.manage &&
                  w.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="sop-field">
              {ui("Applies to")}
              <select
                value={manualScope}
                onChange={(e) => {
                  setManualScope(e.target.value);
                  setManualTarget("");
                }}
              >
                {["company", "block", "pond"].map((s) => (
                  <option key={s} value={s}>{ui(s)}</option>
                ))}
              </select>
            </label>
            {manualScope !== "company" && (
              <label className="sop-field">
                {ui("Target")}
                <select
                  value={manualTarget}
                  onChange={(e) => setManualTarget(e.target.value)}
                >
                  <option value="">{ui("Choose target")}</option>
                  {(manualScope === "block"
                    ? w.blocks.map((b) => ({ id: b.id, label: b.name }))
                    : w.physicalPonds.map((p) => ({
                        id: p.id,
                        label: p.pondName,
                      }))
                  ).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="sop-field">
              {ui("Due time")}
              <input
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
            <button
              className="sop-primary"
              disabled={client.busy || !title.trim() || !due}
              onClick={() =>
                void run(async () => {
                  await client.command({
                    action: "manualTask",
                    severity: manualSeverity,
                    title,
                    instructions,
                    scope: manualScope,
                    targetId: manualTarget,
                    assigneeId: assignee || undefined,
                    dueAt: Date.parse(due),
                  });
                  setManual(false);
                  setTitle("");
                })
              }
            >
              {ui("Create task")}
            </button>
            <button onClick={() => setManual(false)}>{ui("Close")}</button>
          </div>
        </section>
      )}
    </section>
  );
}
