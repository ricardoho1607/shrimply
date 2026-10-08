"use client";
import { sopText, sopFieldLabel } from "../../../../../shared/sop/uiCopy";
import { useAuth } from "@/contexts/AuthContext";
import React, { useState } from "react";
import { SopFlowPreview } from "@/components/SopFlowPreview";
import Link from "next/link";
import { useSopWorkspace } from "@/hooks/useSopWorkspace";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  emptySopStep,
  SOP_STAGES,
  SOP_TEMPLATES,
  type SopDefinition,
  type SopStep,
} from "../../../../../shared/sop/contracts";
import { SOP_FIELDS } from "../../../../../shared/sop/registry";
import { validateSop } from "../../../../../shared/sop/engine";
import { sopCopy } from "../../../../../shared/sop/copy";
import { sopSummary, type SopDocument } from "../../../../../shared/sop/client";
import "./sops.css";
const renderOptions = (values: string[], language: string) =>
  [...new Set(values)].map((value) => (
    <option key={value} value={value}>
      {sopText(value, language)}
    </option>
  ));
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="sop-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export default function SopsPage() {
  const { user, company } = useAuth();
  return <SopsPageContent key={`${user?.uid}:${company?.id}`} />;
}
function SopsPageContent() {
  const client = useSopWorkspace(),
    { workspace: w } = client,
    { currentLanguage } = useLanguage(),
    c = sopCopy(currentLanguage);
  const ui = (value: string) => sopText(value, currentLanguage);
  const options = (values: string[]) => renderOptions(values, currentLanguage);
  const [versionHistory, setVersionHistory] = useState<{
    sopId: string;
    items: import("../../../../../shared/sop/client").SopVersion[];
    nextCursor: string;
  } | null>(null);
  const [updateReview, setUpdateReview] = useState<{
    adoptionId: string;
    sopId: string;
    revision: number;
    result: Record<string, unknown>;
  } | null>(null);
  const [tab, setTab] = useState("library"),
    [definition, setDefinition] = useState<SopDefinition | null>(null),
    [editing, setEditing] = useState<SopDocument | null>(null),
    [message, setMessage] = useState(""),
    [aiText, setAiText] = useState(""),
    [aiFile, setAiFile] = useState<File | null>(null);
  const [adopting, setAdopting] = useState<SopDocument | null>(null),
    [blocks, setBlocks] = useState<string[]>([]),
    [ponds, setPonds] = useState<string[]>([]),
    [manager, setManager] = useState(""),
    [recipients, setRecipients] = useState<string[]>([]),
    [lifetime, setLifetime] = useState("cycle"),
    [preview, setPreview] = useState<Record<string, unknown> | null>(null),
    [companyScope, setCompanyScope] = useState(false);
  const [translation, setTranslation] = useState<Record<
      string,
      unknown
    > | null>(null),
    [stageTarget, setStageTarget] = useState(""),
    [stage, setStage] = useState("preparation"),
    [stageReason, setStageReason] = useState(""),
    [actual, setActual] = useState(false),
    [override, setOverride] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      setMessage("");
      return await fn();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to complete this change.",
      );
      return null;
    }
  };
  const changeStep = (index: number, change: Partial<SopStep>) =>
    setDefinition((d) =>
      d
        ? {
            ...d,
            steps: d.steps.map((s, i) =>
              i === index ? { ...s, ...change } : s,
            ),
          }
        : d,
    );
  const toggle = (values: string[], value: string) =>
    values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
  const startAdoption = (s: SopDocument) => {
    setAdopting(s);
    setBlocks([]);
    setPonds([]);
    setPreview(null);
    setManager(
      w.members.find((m) => ["owner", "co-owner", "manager"].includes(m.role))
        ?.id || "",
    );
  };
  const summary = sopSummary(w),
    errors = definition ? validateSop(definition) : [];
  if (client.loading)
    return (
      <section className="sop-shell">
        <p>{c.loading}</p>
      </section>
    );
  return (
    <section className="sop-shell">
      <header className="sop-heading">
        <div>
          <p className="sop-eyebrow">{ui("SHRIMPLY • FARM WORKFLOWS")}</p>
          <h1>{c.sops}</h1>
          <p>
            {ui(
              "Turn approved farm procedures into clear work, evidence, and follow-up.",
            )}
          </p>
        </div>
        <Link href="/dashboard/todo" className="sop-button">
          {c.todo}
        </Link>
      </header>
      {(client.error || message) && (
        <div role="alert" className="sop-alert">
          {message || client.error}
        </div>
      )}
      <div className="sop-tabs" role="group" aria-label={ui("SOP sections")}>
        {[
          ["library", c.library],
          ["community", c.community],
          ["adopted", c.adopted],
          ["dashboard", c.dashboard],
          ["history", c.history],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "dashboard" && (
        <>
          <div className="sop-metrics">
            {[
              [c.recorded, `${summary.recorded}/${summary.total}`],
              [
                c.targets,
                `${summary.pass} pass · ${summary.fail} outside target`,
              ],
              [c.missing, summary.missing],
              [c.exceptions, summary.exempt],
              [c.issues, summary.issues],
            ].map(([label, value]) => (
              <article key={String(label)} className="sop-card">
                <p>{label}</p>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <p>
            {w.summary
              ? ui("These totals cover {period} in the farm timezone.").replace("{period}", w.summary.period)
              : ui("These totals describe your loaded task history.")}{" "}
            {ui("Exemptions do not count as successful checks.")}
          </p>
          {w.truncated && (
            <p role="status">
              {ui(
                "Older work is available through the task history service; this view is limited to recent work.",
              )}
            </p>
          )}
          {w.adoptions.map((ad) => (
            <article className="sop-card" key={ad.id}>
              <h2>{ad.title}</h2>
              <p>
                {ad.targets.length} {ui("targets ·")} {ui(ad.status)}
              </p>
              {ad.targets.map((t) => (
                <p key={t.id}>
                  {t.name} · {t.stage} ·{" "}
                  {
                    w.tasks.filter(
                      (task) =>
                        task.adoptionId === ad.id &&
                        task.target.id === t.id &&
                        task.result === "fail",
                    ).length
                  }{" "}
                  {ui("outside-target checks")}
                </p>
              ))}
            </article>
          ))}
        </>
      )}
      {tab === "history" && (
        <section>
          {!w.issues.length && <p>{ui("No SOP issues have been recorded.")}</p>}
          {w.issues.map((i) => (
            <article className="sop-card" key={i.id}>
              <h2>{i.title}</h2>
              <p>
                {i.target.name} · {i.severity} · {i.status}
              </p>
              <p>
                {i.rechecks} {ui("rechecks ·")}{" "}
                {i.recoveryVerified
                  ? ui("Recovery verified")
                  : ui("Recovery evidence required")}
              </p>
              {i.failureExplanation && <p>{i.failureExplanation}</p>}
              {i.openedAt && (
                <p>
                  {ui("Opened")}:{" "}
                  {new Date(i.openedAt).toLocaleString(currentLanguage)}
                  {i.closedAt
                    ? ` · ${ui("Closed")}: ${new Date(i.closedAt).toLocaleString(currentLanguage)}`
                    : ""}
                </p>
              )}
              <Link href={`/dashboard/todo?issueId=${i.id}`}>{c.review}</Link>
            </article>
          ))}
        </section>
      )}
      {tab === "library" && !definition && (
        <>
          <div className="sop-toolbar">
            <button
              className="sop-primary"
              onClick={() => {
                setEditing(null);
                setDefinition({ ...SOP_TEMPLATES[0], steps: [emptySopStep()] });
              }}
            >
              {c.create}
            </button>
            <button onClick={() => void client.refresh()}>{c.refresh}</button>
          </div>
          <h2>{ui("Starter templates")}</h2>
          <div className="sop-grid">
            {SOP_TEMPLATES.map((t) => (
              <article className="sop-card" key={t.title}>
                <h3>{ui(t.title)}</h3>
                <p>{ui(t.description)}</p>
                <button
                  onClick={() => {
                    setEditing(null);
                    setDefinition(JSON.parse(JSON.stringify(t)));
                  }}
                >
                  {ui("Customize template")}
                </button>
              </article>
            ))}
          </div>
          <h2>{c.library}</h2>
          {!w.sops.length && (
            <p>
              {ui(
                "Create your first procedure or customize a starter template.",
              )}
            </p>
          )}
          {w.sops.map((s) => (
            <article className="sop-card" key={s.id}>
              <h3>{s.title}</h3>
              <p>
                {ui(s.status)} {ui("· revision")} {s.revision} ·{" "}
                {s.definition.steps.length} {ui("steps")}
              </p>
              {s.source && (
                <p>
                  {ui("Adapted from")} {s.source.author} · {s.source.versionId}
                </p>
              )}
              <div className="sop-toolbar">
                <button
                  onClick={() => {
                    setEditing(s);
                    setDefinition(JSON.parse(JSON.stringify(s.definition)));
                  }}
                >
                  {ui("Edit / view")}
                </button>
                <button
                  onClick={() =>
                    void run(async () =>
                      setVersionHistory({
                        sopId: s.id,
                        ...(await client.versions(s.id)),
                      }),
                    )
                  }
                >
                  {ui("Version history")}
                </button>
                <button
                  onClick={() =>
                    void run(async () =>
                      setTranslation(
                        await client.assist({
                          mode: "translate",
                          sopId: s.id,
                          language: currentLanguage,
                        }),
                      ),
                    )
                  }
                >
                  {c.translate}
                </button>
                {w.manage && (
                  <>
                    <button
                      disabled={client.busy}
                      onClick={() =>
                        void run(() =>
                          client.command({
                            action: "approve",
                            sopId: s.id,
                            expectedRevision: s.revision,
                          }),
                        )
                      }
                    >
                      {c.approve}
                    </button>
                    {s.approvedVersionId && s.status === "approved" && (
                      <>
                        <button
                          disabled={client.busy}
                          onClick={() =>
                            void run(() =>
                              client.command({
                                action: "publish",
                                sopId: s.id,
                                expectedRevision: s.revision,
                              }),
                            )
                          }
                        >
                          {c.publish}
                        </button>
                        <button onClick={() => startAdoption(s)}>
                          {c.adopt}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </>
      )}
      {tab === "community" && (
        <>
          {!w.community.length && (
            <p>{ui("No community SOPs have been published yet.")}</p>
          )}
          {w.community.map((s) => (
            <article className="sop-card" key={s.id}>
              <h2>{s.title}</h2>
              <p>
                {s.author} · {s.adoptionCount} {ui("adopting farms ·")}{" "}
                {s.versionId}
              </p>
              <p>{s.definition.description}</p>
              <details>
                <summary>{ui("Read procedure")}</summary>
                {s.definition.steps.map((step) => (
                  <div key={step.id}>
                    <h3>{step.title}</h3>
                    <p>{step.instructions}</p>
                    <p>{step.correctiveInstructions}</p>
                  </div>
                ))}
              </details>
              <div className="sop-toolbar">
                <button
                  onClick={() =>
                    void run(async () => {
                      await client.command({
                        action: "copyPublication",
                        publicationId: s.id,
                      });
                      setTab("library");
                    })
                  }
                >
                  {ui("Create editable farm copy")}
                </button>
                {w.canModerate && (
                  <button
                    onClick={() => {
                      const reason = window.prompt(
                        ui("Reason to unlist this community SOP"),
                      );
                      if (reason)
                        void run(() =>
                          client.command({
                            action: "unlist",
                            publicationId: s.id,
                            reason,
                          }),
                        );
                    }}
                  >
                    {ui("Unlist")}
                  </button>
                )}
                <button
                  onClick={() => {
                    const reason = window.prompt(
                      ui("Explain why this publication should be reviewed."),
                    );
                    if (reason)
                      void run(() =>
                        client.command({
                          action: "report",
                          publicationId: s.id,
                          reason,
                        }),
                      );
                  }}
                >
                  {ui("Report")}
                </button>
                {w.manage && (
                  <button
                    onClick={() => {
                      const reason = window.prompt(
                        ui("Withdrawal reason (your own publication only)"),
                      );
                      if (reason)
                        void run(() =>
                          client.command({
                            action: "withdraw",
                            publicationId: s.id,
                            reason,
                          }),
                        );
                    }}
                  >
                    {ui("Withdraw")}
                  </button>
                )}
              </div>
            </article>
          ))}
        </>
      )}
      {tab === "adopted" && (
        <>
          {w.adoptions.map((ad) => (
            <article className="sop-card" key={ad.id}>
              <h2>{ad.title}</h2>
              <p>
                {ui(ad.status)} ·{" "}
                {ad.lifetime === "standing"
                  ? ui("Standing procedure")
                  : ui("Current cycle")}{" "}
                · {ad.timeZone} · {ad.targets.length} {ui("targets")}
              </p>
              <div className="sop-toolbar">
                {w.manage && (
                  <>
                    <button
                      onClick={() =>
                        void run(async () => {
                          const result = await client.command({
                            action: "previewMembership",
                            adoptionId: ad.id,
                            expectedRevision: ad.revision,
                          });
                          setMessage(
                            `Targets: ${(result.targets as { name: string }[]).map((t) => t.name).join(", ")}\n${(result.conflicts as string[]).join("\n")}`,
                          );
                        })
                      }
                    >
                      {ui("Preview membership")}
                    </button>
                    <button
                      onClick={() =>
                        void run(() =>
                          client.command({
                            action: "refreshMembership",
                            adoptionId: ad.id,
                            expectedRevision: ad.revision,
                          }),
                        )
                      }
                    >
                      {ui("Apply reviewed membership")}
                    </button>
                    <button
                      onClick={() =>
                        void run(() =>
                          client.command({
                            action: "pause",
                            adoptionId: ad.id,
                            expectedRevision: ad.revision,
                          }),
                        )
                      }
                    >
                      {ui("Pause")}
                    </button>
                    <button
                      onClick={() =>
                        void run(() =>
                          client.command({
                            action: "retire",
                            adoptionId: ad.id,
                            expectedRevision: ad.revision,
                          }),
                        )
                      }
                    >
                      {ui("Retire")}
                    </button>
                    <button
                      onClick={() =>
                        void run(async () => {
                          const result = await client.command({
                            action: "previewUpdate",
                            adoptionId: ad.id,
                            sopId: ad.sopId,
                            expectedRevision: ad.revision,
                          });
                          setUpdateReview({
                            adoptionId: ad.id,
                            sopId: ad.sopId,
                            revision: ad.revision,
                            result,
                          });
                        })
                      }
                    >
                      {ui("Review update and unresolved work")}
                    </button>
                  </>
                )}
                <Link href={`/dashboard/todo?adoptionId=${ad.id}`}>
                  {c.todo}
                </Link>
              </div>
            </article>
          ))}
          {
            <section className="sop-card">
              <h2>{ui("Production stage")}</h2>
              <div className="sop-grid">
                <Field label={ui("Pond")}>
                  <select
                    value={stageTarget}
                    onChange={(e) => setStageTarget(e.target.value)}
                  >
                    <option value="">{ui("Choose pond")}</option>
                    {w.physicalPonds.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.pondName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={ui("Next stage")}>
                  <select
                    value={ui(stage)}
                    onChange={(e) => setStage(e.target.value)}
                  >
                    {options([...SOP_STAGES])}
                  </select>
                </Field>
                <Field label={ui("Reason / actual event")}>
                  <textarea
                    value={stageReason}
                    onChange={(e) => setStageReason(e.target.value)}
                  />
                </Field>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={w.manage ? actual : true}
                  disabled={!w.manage}
                  onChange={(e) => setActual(e.target.checked)}
                />{" "}
                {ui("Record an event that already happened")}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={override}
                  disabled={!w.manage}
                  onChange={(e) => setOverride(e.target.checked)}
                />{" "}
                {ui("Manager exception for unmet prerequisites")}
              </label>
              <button
                disabled={!stageTarget || client.busy}
                onClick={() =>
                  void run(() =>
                    client.command({
                      action: "stage",
                      targetId: stageTarget,
                      stage,
                      reason: stageReason,
                      actual: w.manage ? actual : true,
                      override: w.manage && override,
                    }),
                  )
                }
              >
                {ui("Record transition")}
              </button>
            </section>
          }
        </>
      )}
      {definition && tab === "library" && (
        <section className="sop-editor">
          <div className="sop-toolbar">
            <h2>{editing ? ui("Edit farm procedure") : c.create}</h2>
            <button onClick={() => setDefinition(null)}>{c.back}</button>
          </div>
          <div className="sop-grid">
            <Field label={ui("Title")}>
              <input
                value={definition.title}
                onChange={(e) =>
                  setDefinition({ ...definition, title: e.target.value })
                }
              />
            </Field>
            <Field label={ui("Original language")}>
              <select
                value={definition.language}
                onChange={(e) =>
                  setDefinition({ ...definition, language: e.target.value })
                }
              >
                {options(["en", "id", "vi", "th", "zh"])}
              </select>
            </Field>
            <Field label={ui("Description")}>
              <textarea
                value={definition.description}
                onChange={(e) =>
                  setDefinition({ ...definition, description: e.target.value })
                }
              />
            </Field>
          </div>
          <label className="sop-field">
            {ui("Attach guidance for company readers")}
            <input
              type="file"
              accept=".pdf,.docx,.txt,image/jpeg,image/png"
              onChange={(e) =>
                void run(async () => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const attachment = await client.upload(file, "guidance");
                    setDefinition((d) =>
                      d
                        ? {
                            ...d,
                            attachments: [...(d.attachments || []), attachment],
                          }
                        : d,
                    );
                  }
                })
              }
            />
          </label>
          {(definition.attachments || []).map((a) => (
            <p key={a.path}>
              <button onClick={() => void run(() => client.openAttachment(a))}>
                {a.name}
              </button>
              <button
                onClick={() =>
                  setDefinition({
                    ...definition,
                    attachments: definition.attachments?.filter(
                      (file) => file.path !== a.path,
                    ),
                  })
                }
              >
                {ui("Remove guidance")}
              </button>
            </p>
          ))}
          <details className="sop-card">
            <summary>{c.draft}</summary>
            <Field label={ui("Describe your procedure")}>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />
            </Field>
            <input
              aria-label={ui("Import SOP document")}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setAiFile(e.target.files?.[0] || null)}
            />
            <button
              disabled={client.busy}
              onClick={() =>
                void run(async () => {
                  const attachment = aiFile
                    ? await client.upload(aiFile)
                    : undefined;
                  const result = await client.assist({
                    mode: "draft",
                    text: aiText,
                    attachment,
                    language: definition.language,
                  });
                  setDefinition(result.definition as SopDefinition);
                  setMessage((result.warnings as string[]).join("\n"));
                })
              }
            >
              {ui("Generate reviewable draft")}
            </button>
          </details>
          {definition.steps.map((s, index) => (
            <details key={s.id} className="sop-card" open={index === 0}>
              <summary>
                {index + 1}. {s.title}
              </summary>
              <div className="sop-grid">
                <Field label={ui("Step title")}>
                  <input
                    value={s.title}
                    onChange={(e) =>
                      changeStep(index, { title: e.target.value })
                    }
                  />
                </Field>
                <Field label={ui("Instructions")}>
                  <textarea
                    value={s.instructions}
                    onChange={(e) =>
                      changeStep(index, { instructions: e.target.value })
                    }
                  />
                </Field>
                <Field label={ui("Applies to")}>
                  <select
                    value={s.scope}
                    onChange={(e) =>
                      changeStep(index, {
                        scope: e.target.value as SopStep["scope"],
                      })
                    }
                  >
                    {options(["pond", "block", "company"])}
                  </select>
                </Field>
                <Field label={ui("Severity")}>
                  <select
                    value={s.severity}
                    onChange={(e) =>
                      changeStep(index, {
                        severity: e.target.value as SopStep["severity"],
                      })
                    }
                  >
                    {options(["low", "warning", "critical"])}
                  </select>
                </Field>
                <Field label={ui("Stages")}>
                  <div className="sop-checkboxes">
                    {SOP_STAGES.map((stage) => (
                      <label key={stage}>
                        <input
                          type="checkbox"
                          checked={s.stages.includes(stage)}
                          onChange={() =>
                            changeStep(index, {
                              stages: toggle(
                                s.stages,
                                stage,
                              ) as SopStep["stages"],
                            })
                          }
                        />
                        {ui(stage)}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label={ui("When")}>
                  <select
                    value={s.trigger.kind}
                    onChange={(e) =>
                      changeStep(index, {
                        trigger: {
                          ...s.trigger,
                          kind: e.target.value as SopStep["trigger"]["kind"],
                        },
                      })
                    }
                  >
                    {options([
                      "daily",
                      "weekly",
                      "doc",
                      "event",
                      "stage",
                      "manual",
                    ])}
                  </select>
                </Field>
                <Field label={ui("Local time")}>
                  <input
                    type="time"
                    value={s.trigger.at}
                    onChange={(e) =>
                      changeStep(index, {
                        trigger: { ...s.trigger, at: e.target.value },
                      })
                    }
                  />
                </Field>
                {(
                  [
                    "windowMinutes",
                    "everyDays",
                    "docFrom",
                    "docTo",
                    "offsetMinutes",
                  ] as const
                ).map((k) => (
                  <Field label={sopFieldLabel(k, currentLanguage)} key={k}>
                    <input
                      type="number"
                      min={0}
                      value={s.trigger[k]}
                      onChange={(e) =>
                        changeStep(index, {
                          trigger: {
                            ...s.trigger,
                            [k]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                ))}
                <Field label={ui("Event / stage")}>
                  <select
                    value={s.trigger.event}
                    onChange={(e) =>
                      changeStep(index, {
                        trigger: { ...s.trigger, event: e.target.value },
                      })
                    }
                  >
                    <option value="">{ui("Choose event")}</option>
                    {definition.steps.map((step) => (
                      <option value={`step:${step.id}`} key={step.id}>
                        {ui("Completed:")} {step.title}
                      </option>
                    ))}
                    {options([
                      "stocking",
                      "harvest",
                      "treatment",
                      "measurement",
                      ...SOP_STAGES,
                    ])}
                  </select>
                </Field>
                <Field label={ui("Weekly days")}>
                  <div className="sop-checkboxes">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, i) => (
                        <label key={day}>
                          <input
                            type="checkbox"
                            checked={s.trigger.weekDays.includes(i)}
                            onChange={() =>
                              changeStep(index, {
                                trigger: {
                                  ...s.trigger,
                                  weekDays: s.trigger.weekDays.includes(i)
                                    ? s.trigger.weekDays.filter((d) => d !== i)
                                    : [...s.trigger.weekDays, i],
                                },
                              })
                            }
                          />
                          {day}
                        </label>
                      ),
                    )}
                  </div>
                </Field>
                <Field label={ui("Check")}>
                  <select
                    value={s.check.field}
                    onChange={(e) => {
                      const field = SOP_FIELDS.find(
                        (f) => f.key === e.target.value,
                      )!;
                      changeStep(index, {
                        check: {
                          ...s.check,
                          field: field.key,
                          unit: field.unit,
                          basis: "",
                          exactTime: field.exactTime,
                          operator:
                            field.key === "manual" ? "narrative" : "present",
                        },
                      });
                    }}
                  >
                    {SOP_FIELDS.map((f) => (
                      <option value={f.key} key={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={ui("Inventory item / equipment binding")}>
                  <select
                    value={s.check.sourceId || ""}
                    onChange={(e) =>
                      changeStep(index, {
                        check: { ...s.check, sourceId: e.target.value },
                      })
                    }
                  >
                    <option value="">
                      {ui("Not applicable / choose record")}
                    </option>
                    {w.sources
                      .filter((source) =>
                        (
                          SOP_FIELDS.find((f) => f.key === s.check.field)
                            ?.sources || [
                            SOP_FIELDS.find((f) => f.key === s.check.field)
                              ?.source,
                          ]
                        ).includes(source.source),
                      )
                      .map((source) => (
                        <option
                          value={`${source.source}/${source.id}`}
                          key={`${source.source}/${source.id}`}
                        >
                          {source.label}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label={ui("Condition")}>
                  <select
                    value={s.check.operator}
                    onChange={(e) =>
                      changeStep(index, {
                        check: {
                          ...s.check,
                          operator: e.target
                            .value as SopStep["check"]["operator"],
                        },
                      })
                    }
                  >
                    {options([
                      "present",
                      "range",
                      "equals",
                      "count",
                      "trend",
                      "sequence",
                      "narrative",
                    ])}
                  </select>
                </Field>
                <Field label={ui("Minimum")}>
                  <input
                    type="number"
                    value={s.check.min ?? ""}
                    onChange={(e) =>
                      changeStep(index, {
                        check: {
                          ...s.check,
                          min:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
                <Field label={ui("Maximum")}>
                  <input
                    type="number"
                    value={s.check.max ?? ""}
                    onChange={(e) =>
                      changeStep(index, {
                        check: {
                          ...s.check,
                          max:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
                <Field label={ui("Required value / sequence")}>
                  <input
                    value={s.check.value}
                    onChange={(e) =>
                      changeStep(index, {
                        check: { ...s.check, value: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label={ui("Unit")}>
                  <input
                    value={s.check.unit}
                    onChange={(e) =>
                      changeStep(index, {
                        check: { ...s.check, unit: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label={ui("Analytical basis")}>
                  <select
                    value={s.check.basis}
                    onChange={(e) =>
                      changeStep(index, {
                        check: { ...s.check, basis: e.target.value },
                      })
                    }
                  >
                    <option value="">{ui("Not applicable / unknown")}</option>
                    {options([
                      "TAN-N",
                      "TAN",
                      "NH3-N",
                      "NH3",
                      "NO2-N",
                      "NO2",
                      "N",
                      "pH",
                      "salinity",
                      "CaCO3",
                    ])}
                  </select>
                </Field>
                <Field label={ui("Minimum records")}>
                  <input
                    type="number"
                    min={1}
                    value={s.check.minCount}
                    onChange={(e) =>
                      changeStep(index, {
                        check: { ...s.check, minCount: Number(e.target.value) },
                      })
                    }
                  />
                </Field>
                <Field label={ui("Evidence freshness (minutes)")}>
                  <input
                    type="number"
                    min={1}
                    value={s.check.freshnessMinutes}
                    onChange={(e) =>
                      changeStep(index, {
                        check: {
                          ...s.check,
                          freshnessMinutes: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
                <label>
                  <input
                    type="checkbox"
                    checked={s.check.exactTime}
                    onChange={(e) =>
                      changeStep(index, {
                        check: { ...s.check, exactTime: e.target.checked },
                      })
                    }
                  />{" "}
                  {ui("Require exact observation time")}
                </label>
                <Field label={ui("Written-evidence rubric")}>
                  <textarea
                    value={s.check.rubric}
                    onChange={(e) =>
                      changeStep(index, {
                        check: { ...s.check, rubric: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label={ui("Then: corrective instructions")}>
                  <textarea
                    value={s.correctiveInstructions}
                    onChange={(e) =>
                      changeStep(index, {
                        correctiveInstructions: e.target.value,
                      })
                    }
                  />
                </Field>
                {(
                  [
                    "recheckMinutes",
                    "maxRechecks",
                    "escalationMinutes",
                  ] as const
                ).map((k) => (
                  <Field label={sopFieldLabel(k, currentLanguage)} key={k}>
                    <input
                      type="number"
                      min={1}
                      value={s[k]}
                      onChange={(e) =>
                        changeStep(index, { [k]: Number(e.target.value) })
                      }
                    />
                  </Field>
                ))}
                <Field label={ui("Assigned person (optional override)")}>
                  <select
                    value={s.assigneeId}
                    onChange={(e) =>
                      changeStep(index, { assigneeId: e.target.value })
                    }
                  >
                    <option value="">
                      {ui("Block technician / accountable manager")}
                    </option>
                    {w.members.map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {(["dependsOn", "onPass", "onFail"] as const).map((k) => (
                  <Field
                    key={k}
                    label={ui(
                      k === "dependsOn"
                        ? "Dependencies"
                        : k === "onPass"
                          ? "On pass"
                          : "On failure",
                    )}
                  >
                    <div className="sop-checkboxes">
                      {definition.steps
                        .filter((t) => t.id !== s.id)
                        .map((t) => (
                          <label key={t.id}>
                            <input
                              type="checkbox"
                              checked={s[k].includes(t.id)}
                              onChange={() =>
                                changeStep(index, { [k]: toggle(s[k], t.id) })
                              }
                            />
                            {t.title}
                          </label>
                        ))}
                    </div>
                  </Field>
                ))}
                <Field label={ui("Gate next stage")}>
                  <select
                    value={s.gateStage}
                    onChange={(e) =>
                      changeStep(index, {
                        gateStage: e.target.value as SopStep["gateStage"],
                      })
                    }
                  >
                    <option value="">{ui("No gate")}</option>
                    {options([...SOP_STAGES])}
                  </select>
                </Field>
                <label>
                  <input
                    type="checkbox"
                    checked={s.requireNotes}
                    onChange={(e) =>
                      changeStep(index, { requireNotes: e.target.checked })
                    }
                  />{" "}
                  {ui("Require notes")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.requireAttachment}
                    onChange={(e) =>
                      changeStep(index, { requireAttachment: e.target.checked })
                    }
                  />{" "}
                  {ui("Require attachment")}
                </label>
              </div>
              <button
                onClick={() =>
                  setDefinition({
                    ...definition,
                    steps: definition.steps
                      .filter((t) => t.id !== s.id)
                      .map((t) => ({
                        ...t,
                        dependsOn: t.dependsOn.filter((id) => id !== s.id),
                        onPass: t.onPass.filter((id) => id !== s.id),
                        onFail: t.onFail.filter((id) => id !== s.id),
                      })),
                  })
                }
              >
                {ui("Remove step")}
              </button>
            </details>
          ))}
          <button
            onClick={() =>
              setDefinition({
                ...definition,
                steps: [
                  ...definition.steps,
                  emptySopStep(`step-${crypto.randomUUID()}`),
                ],
              })
            }
          >
            {ui("Add step")}
          </button>
          <section className="sop-card">
            <h3>{ui("Workflow preview")}</h3>
            <SopFlowPreview definition={definition} />
            <ol>
              {definition.steps.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong> → {s.check.field} {ui("→ pass:")}{" "}
                  {s.onPass
                    .map(
                      (id) => definition.steps.find((t) => t.id === id)?.title,
                    )
                    .join(", ") || ui("complete")}{" "}
                  {ui("/ fail:")}{" "}
                  {s.correctiveInstructions || ui("configure corrective action")}{" "}
                  {ui("→ recheck after")} {s.recheckMinutes}{" "}
                  {ui("min → escalate after")} {s.escalationMinutes} {ui("min")}
                </li>
              ))}
            </ol>
          </section>
          {!!errors.length && (
            <div className="sop-alert">
              <strong>{ui("Resolve before approval")}</strong>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="sop-primary"
            disabled={client.busy}
            onClick={() =>
              void run(async () => {
                await client.command({
                  action: "saveDraft",
                  sopId: editing?.id,
                  expectedRevision: editing?.revision,
                  definition,
                });
                setDefinition(null);
              })
            }
          >
            {c.save}
          </button>
        </section>
      )}
      {adopting && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label={ui("Adopt SOP")}
          className="sop-dialog"
        >
          <div className="sop-card">
            <h2>
              {c.adopt}: {adopting.title}
            </h2>
            <p>
              {ui(
                "Review the current stage and farm targets. Work begins from activation.",
              )}
            </p>
            <div className="sop-grid">
              <Field label={ui("Blocks (follow future membership)")}>
                <div>
                  {w.blocks.map((b) => (
                    <label key={b.id}>
                      <input
                        type="checkbox"
                        checked={blocks.includes(b.id)}
                        onChange={() => {
                          setBlocks(toggle(blocks, b.id));
                          setPreview(null);
                        }}
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label={ui("Selected ponds")}>
                <div>
                  {[
                    ...w.physicalPonds,
                    ...w.ponds
                      .filter(
                        (p) =>
                          !w.physicalPonds.some(
                            (q) => q.id === p.physicalPondId,
                          ),
                      )
                      .map((p) => ({ ...p, id: p.physicalPondId })),
                  ].map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={ponds.includes(p.id)}
                        onChange={() => {
                          setPonds(toggle(ponds, p.id));
                          setPreview(null);
                        }}
                      />
                      {p.pondName}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label={ui("Lifetime")}>
                <select
                  value={lifetime}
                  onChange={(e) => {
                    setLifetime(e.target.value);
                    setPreview(null);
                  }}
                >
                  <option value="cycle">{ui("Current cycle")}</option>
                  <option value="standing">{ui("Standing procedure")}</option>
                </select>
              </Field>
              <Field label={ui("Accountable manager")}>
                <select
                  value={manager}
                  onChange={(e) => {
                    setManager(e.target.value);
                    setPreview(null);
                  }}
                >
                  {w.members
                    .filter((m) =>
                      ["owner", "co-owner", "manager"].includes(m.role),
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={ui("Escalation recipients")}>
                <div>
                  {w.members.map((m) => (
                    <label key={m.id}>
                      <input
                        type="checkbox"
                        checked={recipients.includes(m.id)}
                        onChange={() => {
                          setRecipients(toggle(recipients, m.id));
                          setPreview(null);
                        }}
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </Field>
              <label>
                <input
                  type="checkbox"
                  checked={companyScope}
                  onChange={(e) => {
                    setCompanyScope(e.target.checked);
                    setPreview(null);
                  }}
                />{" "}
                {ui("Include company tasks")}
              </label>
            </div>
            <p>
              {ui("Timezone:")}{" "}
              {w.timeZone || ui("Set your company timezone before activation")}
            </p>
            <button
              onClick={() =>
                void run(async () =>
                  setPreview(
                    await client.command({
                      action: "previewAdoption",
                      sopId: adopting.id,
                      blockIds: blocks,
                      pondIds: ponds,
                      managerId: manager,
                      recipients,
                      lifetime,
                      companyScope,
                    }),
                  ),
                )
              }
            >
              {c.preview}
            </button>
            {preview && (
              <div>
                <h3>{ui("Targets")}</h3>
                {(
                  preview.targets as {
                    id: string;
                    name: string;
                    stage: string;
                  }[]
                ).map((t) => (
                  <p key={t.id}>
                    {t.name} · {t.stage}
                  </p>
                ))}
                {(preview.conflicts as string[]).map((e) => (
                  <p className="sop-alert" key={e}>
                    {e}
                  </p>
                ))}
                <button
                  className="sop-primary"
                  disabled={
                    client.busy || (preview.conflicts as string[]).length > 0
                  }
                  onClick={() =>
                    void run(async () => {
                      await client.command({
                        action: "activate",
                        sopId: adopting.id,
                        expectedVersionId: preview.versionId,
                        blockIds: blocks,
                        pondIds: ponds,
                        managerId: manager,
                        recipients,
                        lifetime,
                        companyScope,
                      });
                      setAdopting(null);
                      setTab("adopted");
                    })
                  }
                >
                  {c.activate}
                </button>
              </div>
            )}
            <button onClick={() => setAdopting(null)}>{ui("Close")}</button>
          </div>
        </section>
      )}
      {tab === "history" && w.nextIssueCursor && (
        <button onClick={() => void run(() => client.loadMore("issues"))}>
          {ui("Load older issues")}
        </button>
      )}
      {tab === "library" && w.nextSopCursor && (
        <button onClick={() => void run(() => client.loadMore("sops"))}>
          {ui("Load older SOPs")}
        </button>
      )}
      {tab === "community" && w.nextCommunityCursor && (
        <button onClick={() => void run(() => client.loadMore("community"))}>
          {ui("More community procedures")}
        </button>
      )}
      {tab === "adopted" && w.nextAdoptionCursor && (
        <button onClick={() => void run(() => client.loadMore("adoptions"))}>
          {ui("More adoptions")}
        </button>
      )}
      {updateReview && (
        <section
          className="sop-dialog"
          role="dialog"
          aria-label={ui("Review SOP update")}
        >
          <div className="sop-card">
            <h2>
              {ui("Review approved version")}{" "}
              {String(updateReview.result.versionId)}
            </h2>
            <p>
              {ui(
                "Existing work keeps its rules when you apply an update to future work. Migration replaces the selected unresolved rules and retains their prior versions.",
              )}
            </p>
            <p>
              {String(updateReview.result.migrationTotal || 0)}{" "}
              {ui("unresolved tasks affected.")}
            </p>
            {(
              (updateReview.result.unresolved || []) as {
                id: string;
                title: string;
                target: string;
                oldInstructions: string;
                newInstructions: string;
                oldCheck: {
                  min: number | null;
                  max: number | null;
                  unit: string;
                };
                newCheck: {
                  min: number | null;
                  max: number | null;
                  unit: string;
                } | null;
                scopeReplacement: boolean;
              }[]
            ).map((t) => (
              <article className="sop-card" key={t.id}>
                <h3>
                  {t.title} · {t.target}
                </h3>
                <div className="sop-grid">
                  <div>
                    <strong>{ui("Previous guidance")}</strong>
                    <p>{t.oldInstructions}</p>
                    <p>
                      {t.oldCheck?.min ?? "—"} {ui("to")}{" "}
                      {t.oldCheck?.max ?? "—"} {t.oldCheck?.unit}
                    </p>
                  </div>
                  <div>
                    <strong>{ui("Approved guidance")}</strong>
                    <p>{t.newInstructions}</p>
                    <p>
                      {t.newCheck?.min ?? "—"} {ui("to")}{" "}
                      {t.newCheck?.max ?? "—"} {t.newCheck?.unit}
                    </p>
                    {t.scopeReplacement && (
                      <p>
                        {ui(
                          "Scope changed: this occurrence will be cancelled; future work uses the new scope.",
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {((updateReview.result.conflicts as string[]) || []).map((c) => (
              <p className="sop-alert" key={c}>
                {c}
              </p>
            ))}
            <button
              disabled={
                client.busy ||
                !!(updateReview.result.conflicts as string[]).length
              }
              onClick={() =>
                void run(async () => {
                  await client.command({
                    action: "activate",
                    adoptionId: updateReview.adoptionId,
                    sopId: updateReview.sopId,
                    expectedRevision: updateReview.revision,
                    expectedVersionId: updateReview.result.versionId,
                  });
                  setUpdateReview(null);
                })
              }
            >
              {ui("Apply to future work")}
            </button>
            <button
              disabled={
                client.busy ||
                !!(updateReview.result.conflicts as string[]).length
              }
              onClick={() =>
                void run(async () => {
                  const result = await client.command({
                    action: "migrate",
                    adoptionId: updateReview.adoptionId,
                    sopId: updateReview.sopId,
                    expectedRevision: updateReview.revision,
                    expectedVersionId: updateReview.result.versionId,
                    confirmMigration: true,
                  });
                  setMessage(
                    `${result.migrationCount || 0} tasks migrated. ${result.migrationRemaining || 0} remaining; preview again for the next batch.`,
                  );
                  setUpdateReview(null);
                })
              }
            >
              {ui("Migrate reviewed unresolved work")}
            </button>
            <button onClick={() => setUpdateReview(null)}>{ui("Close")}</button>
          </div>
        </section>
      )}
      {versionHistory && (
        <section
          className="sop-dialog"
          role="dialog"
          aria-label={ui("Approved version history")}
        >
          <div className="sop-card">
            <h2>{ui("Approved versions")}</h2>
            {versionHistory.items.map((v) => (
              <article key={v.id}>
                <h3>
                  {v.id} · {v.definition.title}
                </h3>
                <p>
                  {ui("Approved")} {new Date(v.approvedAt).toLocaleString()} ·{" "}
                  {v.definition.language}
                </p>
                {v.definition.steps.map((step) => (
                  <div key={step.id}>
                    <strong>{step.title}</strong>
                    <p>{step.instructions}</p>
                    <p>
                      {step.check.field} · {step.check.min ?? "—"} {ui("to")}{" "}
                      {step.check.max ?? "—"} {step.check.unit} ·{" "}
                      {step.trigger.kind} {step.trigger.at}
                    </p>
                  </div>
                ))}
              </article>
            ))}
            {versionHistory.nextCursor && (
              <button
                onClick={() =>
                  void run(async () => {
                    const next = await client.versions(
                      versionHistory.sopId,
                      versionHistory.nextCursor,
                    );
                    setVersionHistory({
                      ...versionHistory,
                      items: [...versionHistory.items, ...next.items],
                      nextCursor: next.nextCursor,
                    });
                  })
                }
              >
                {ui("Older versions")}
              </button>
            )}
            <button onClick={() => setVersionHistory(null)}>
              {ui("Close")}
            </button>
          </div>
        </section>
      )}
      {translation && (
        <section className="sop-card">
          <h2>{c.translate}</h2>
          <p>{c.original}</p>
          <h3>
            {String(
              (translation.translation as { title?: string })?.title || "",
            )}
          </h3>
          <p>
            {String(
              (translation.translation as { description?: string })
                ?.description || "",
            )}
          </p>
          {(
            (
              translation.translation as {
                steps?: {
                  id: string;
                  title: string;
                  instructions: string;
                  correctiveInstructions: string;
                }[];
              }
            )?.steps || []
          ).map((s) => (
            <article key={s.id}>
              <h3>{s.title}</h3>
              <p>{s.instructions}</p>
              <p>{s.correctiveInstructions}</p>
            </article>
          ))}
          <button onClick={() => setTranslation(null)}>{ui("Close")}</button>
        </section>
      )}
    </section>
  );
}
