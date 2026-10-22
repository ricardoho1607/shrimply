"use client";
import { getUserErrorMessage } from '@/lib/userError';

import {
  SOP_INTERFACE_LANGUAGES,
  sopMeasurementLabel,
  sopCheckModeLabel,
  sopCheckModes,
  sopSimpleCheckModes,
  sopTargetLabel,
  sopScheduleLabel,
  sopTimingLabel,
  sopEditorIssue,
  sopIssueLinks,
} from "../../../../../shared/sop/editor";
import { sopLibrarySummary } from "../../../../../shared/sop/library";
import { sopText, sopFieldLabel } from "../../../../../shared/sop/uiCopy";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import { SopContentEditor, SopContentView } from "@/components/SopContent";
import { SopReader } from "@/components/SopReader";
import SopAdoptionDialog from "@/components/SopAdoptionDialog";
import { existingSopAdoption } from "../../../../../shared/sop/adoption";
import {
  generateAndSaveSopDraft,
  saveSopDraft,
  type SopDraftProgress,
} from "../../../../../shared/sop/draft";
import { SopFlowPreview } from "@/components/SopFlowPreview";
import Link from "next/link";
import AccessibleDialog from "@/components/AccessibleDialog";
import { useSopWorkspace } from "@/hooks/useSopWorkspace";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  emptySopStep,
  SOP_STAGES,
  SOP_TEMPLATES,
  type SopAdoption,
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
  id,
  group = false,
}: {
  id?: string;
  group?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <span>{label}</span>
      {children}
    </>
  );
  return group ? (
    <div className="sop-field" role="group" aria-label={label} id={id}>
      {content}
    </div>
  ) : (
    <label className="sop-field" id={id}>
      {content}
    </label>
  );
}
export default function SopsPage() {
  const { user, company } = useAuth();
  return <SopsPageContent key={`${user?.uid}:${company?.id}`} />;
}
function SopsPageContent() {
  const { user } = useAuth();
  const client = useSopWorkspace(),
    { workspace: w } = client,
    { currentLanguage, setLanguage } = useLanguage(),
    c = sopCopy(currentLanguage);
  const ui = (value: string) => sopText(value, currentLanguage);
  const options = (values: string[]) => renderOptions(values, currentLanguage);
  const [creationMode, setCreationMode] = useState<"choose" | "template" | "import" | "checklist" | null>(null);
  const [saveError, setSaveError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const savingDraftRef = useRef(false);
  const [reading, setReading] = useState<SopDocument | null>(null);
  const readerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reading) readerRef.current?.scrollIntoView({ block: "start" });
  }, [reading]);
  const [messageTone, setMessageTone] = useState<"status" | "error">("status");
  const [draftProgress, setDraftProgress] = useState<SopDraftProgress | null>(
    null,
  );
  const generating = useRef(false);
  const [importError, setImportError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
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
  const [editorTarget, setEditorTarget] = useState<{ id: string } | null>(null);
  const editorVisible = !!definition;
  useEffect(() => {
    if (!editorVisible || !editorTarget) return;
    const target = document.getElementById(editorTarget.id);
    if (!target) return;
    for (
      let parent: HTMLElement | null = target;
      parent;
      parent = parent.parentElement
    )
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    target.scrollIntoView({
      block:
        target.getBoundingClientRect().height > window.innerHeight - 140
          ? "start"
          : "center",
    });
    const input =
      target.id === "sop-editor-start"
        ? target.querySelector<HTMLElement>("h2")
        : target.querySelector<HTMLElement>("input, textarea, select, button");
    (input || target).focus({ preventScroll: true });
  }, [editorTarget, editorVisible]);
  const openEditor = (s: SopDocument, target: string) => {
    if (!definition || editing?.id !== s.id) {
      setEditing(s);
      setDefinition(JSON.parse(JSON.stringify(s.definition)));
    }
    setReading(null);
    setSaveError("");
    setEditorTarget({ id: target });
  };
  const [adopting, setAdopting] = useState<{
    sop: SopDocument;
    adoption?: SopAdoption;
  } | null>(null);
  const [activatedAdoptionId, setActivatedAdoptionId] = useState("");
  const [stageTarget, setStageTarget] = useState(""),
    [plannedStockingDate, setPlannedStockingDate] = useState(""),
    [stage, setStage] = useState("preparation"),
    [stageReason, setStageReason] = useState(""),
    [actual, setActual] = useState(false),
    [override, setOverride] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      setMessage("");
      setMessageTone("status");
      return await fn();
    } catch (e) {
      setMessageTone("error");
      setMessage(
        getUserErrorMessage(e, "Unable to complete this change."),
      );
      return null;
    }
  };
  const saveDraft = async () => {
    if (!definition || savingDraftRef.current) return;
    savingDraftRef.current = true;
    setSavingDraft(true);
    setSaveError("");
    setMessage("");
    try {
      const document = await saveSopDraft({ client, definition, editing });
      setEditing(document);
      setReading(document);
      setDefinition(null);
      setMessage(ui("Draft saved. Review before approval."));
      setMessageTone("status");
    } catch (error) {
      setSaveError(
        ui(getUserErrorMessage(error, "The draft was not saved. Review it and choose Save draft to retry.")),
      );
    } finally {
      savingDraftRef.current = false;
      setSavingDraft(false);
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
  const startAdoption = (sop: SopDocument, adoption?: SopAdoption) => {
    setMessage("");
    const existing = adoption || existingSopAdoption(w.adoptions, sop.id);
    setAdopting({
      sop: existing
        ? {
            ...sop,
            definition: existing.definition,
            approvedVersionId: existing.versionId,
          }
        : sop,
      adoption: existing,
    });
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
          <p>{ui("Read a guide. Follow the steps.")}</p>
        </div>
        <Link href="/dashboard/todo" className="sop-button">
          {c.todo}
        </Link>
      </header>
      {(client.error || message) &&
        !importError &&
        (!deleteError || (message || client.error) !== deleteError) && (
          <div
            role={client.error || messageTone === "error" ? "alert" : "status"}
            className={
              client.error || messageTone === "error"
                ? "sop-alert"
                : "sop-notice"
            }
          >
            {ui(message || client.error)}
          </div>
        )}
      <div className="sop-tabs" role="group" aria-label={ui("SOP sections")}>
        {[
          ["library", c.library],
          ["adopted", c.adopted],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            disabled={!!draftProgress}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
        <div className="sop-language-bar">
          <Field label={ui("Display language")}>
            <select
              value={currentLanguage}
              onChange={(e) => {
                const language = SOP_INTERFACE_LANGUAGES.find(
                  (item) => item.code === e.target.value,
                );
                if (language) void setLanguage(language.code);
              }}
            >
              {SOP_INTERFACE_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="sop-muted">
            {ui(
              "Changes app labels and navigation. Your SOP text stays in its original language.",
            )}
          </p>
        </div>
      <details className="sop-extra-tools">
        <summary>{ui("More options")}</summary>
        <div className="sop-toolbar">
          {[
            ["community", c.community],
            ["dashboard", c.dashboard],
            ["history", c.history],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              disabled={!!draftProgress}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

      </details>
      {tab === "dashboard" && (
        <>
          <div className="sop-metrics">
            {[
              [ui("Work recorded"), `${summary.recorded}/${summary.total}`],
              [
                ui("Check results"),
                `${summary.pass} ${ui("pass")} · ${summary.fail} ${ui("outside target")}`,
              ],
              [ui("Records still needed"), summary.missing],
              [ui("Checks not required"), summary.exempt],
              [c.issues, summary.issues],
            ].map(([label, value]) => (
              <article key={String(label)} className="sop-card">
                <p>{label}</p>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <p className="sop-help">{ui("A passed recording check does not mean the water is within safe limits.")}</p>
          <p>
            {w.summary
              ? ui("These totals cover {period} in the farm timezone.").replace(
                  "{period}",
                  w.summary.period,
                )
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
                {i.target.name} · {ui(i.severity)} · {ui(i.status)}
              </p>
              <p>
                {i.rechecks} {ui("rechecks ·")}{" "}
                {i.recoveryVerified
                  ? ui("New evidence received. Check whether manager review is still needed.")
                  : ui("Record the requested reading or work, then check the task status.")}
              </p>
              {i.failureExplanation && <details><summary>{ui("Details")}</summary><p>{ui(i.failureExplanation)}</p></details>}
              {i.openedAt && (
                <p>
                  {ui("Opened")}:{" "}
                  {new Date(i.openedAt).toLocaleString(currentLanguage, {timeZone: w.timeZone || "UTC"})}
                  {i.closedAt
                    ? ` · ${ui("Closed")}: ${new Date(i.closedAt).toLocaleString(currentLanguage, {timeZone: w.timeZone || "UTC"})}`
                    : ""}
                </p>
              )}
              <Link href={`/dashboard/todo?issueId=${i.id}`}>{c.review}</Link>
            </article>
          ))}
        </section>
      )}
      {tab === "library" && !definition && !reading && (
        <>
          <div className="sop-toolbar">
            <button
              className="sop-primary"
              onClick={() => setCreationMode("choose")}
            >
              {c.create}
            </button>
            <button onClick={() => void client.refresh()}>{c.refresh}</button>
          </div>
          {creationMode === "choose" && <section className="sop-card" aria-label={ui("Create a farm guide")}>
            <h2>{ui("How would you like to start?")}</h2>
            <div className="sop-toolbar">
              <button onClick={() => setCreationMode("template")}>{ui("Use a template")}</button>
              {(["import", "checklist"] as const).map(mode => <button key={mode} onClick={() => {
                setCreationMode(mode); setEditing(null); setAiFile(null); setAiText(""); setImportError(""); setMessage("");
                setEditorTarget({id: "sop-editor-start"});
                const step = emptySopStep();
                setDefinition({title: "", description: "", language: currentLanguage,
                  steps: mode === "import" ? [] : [{...step, title: ui("Task"), instructions: "", requireNotes: true,
                    check: {...step.check, field: "manual", operator: "narrative", unit: "", exactTime: false,
                      rubric: ui("Describe the work completed and any problems.")}}]});
              }}>{ui(mode === "import" ? "Upload my guide" : "Write a simple checklist")}</button>)}
              <button onClick={() => setCreationMode(null)}>{c.back}</button>
            </div>
          </section>}
          <details className="sop-template-picker" open={creationMode === "template" || undefined}>
            <summary>{ui("Starter templates")}</summary>
            <div className="sop-grid">
              {SOP_TEMPLATES.map((t) => (
                <article className="sop-card" key={t.title}>
                  <h3>{ui(t.title)}</h3>
                  <p>{ui(t.description)}</p>
                  <button
                    onClick={() => {
                      setEditing(null);
                      setEditorTarget({ id: "sop-editor-start" });
                      setDefinition(JSON.parse(JSON.stringify(t)));
                    }}
                  >
                    {ui("Customize template")}
                  </button>
                </article>
              ))}
            </div>
          </details>
          <h2>{c.library}</h2>
          {!w.sops.some((s) => s.status !== "deleted") && (
            <p>
              {ui(
                "Create your first procedure or customize a starter template.",
              )}
            </p>
          )}
          {w.sops
            .filter((s) => s.status !== "deleted")
            .map((s) => {
              const card = sopLibrarySummary(s.definition);
              return (
                <article className="sop-card sop-library-card" key={s.id}>
                  <div className="sop-library-card-heading">
                    <div>
                      <p className="sop-library-card-label">
                        {ui("Farm procedure")}
                      </p>
                      <h3>{s.title}</h3>
                    </div>
                    <span
                      className={`sop-library-status ${s.status === "approved" ? "sop-library-status-approved" : ""}`}
                    >
                      {ui(s.status === "approved" ? "Document reviewed" : s.status)}
                    </span>
                  </div>
                  {!!s.definition.description && (
                    <p className="sop-library-description">
                      {s.definition.description}
                    </p>
                  )}
                  {(!card.readableSections ||
                    (s.status === "draft" && card.issues > 0)) && (
                    <div className="sop-library-review">
                      <button
                        className="sop-warning-link"
                        onClick={() =>
                          openEditor(
                            s,
                            !card.readableSections
                              ? "sop-procedure-editor"
                              : "sop-completion-links",
                          )
                        }
                      >
                        {ui(
                          s.status === "draft"
                            ? "Draft needs review"
                            : "Procedure content missing",
                        )}{" "}
                        →
                      </button>
                      <p>
                        {!card.readableSections && (
                          <span>
                            {ui("No readable procedure sections yet.")}{" "}
                          </span>
                        )}
                        {s.status === "draft" && card.issues > 0 && (
                          <span>
                            {card.issues}{" "}
                            {ui("items to complete before approval.")}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="sop-library-actions">
                    <button
                      className="sop-primary"
                      onClick={() => {
                        setMessage("");
                        setReading(s);
                      }}
                    >
                      {ui(s.status === "draft" ? "Review draft" : "Read guide")}
                    </button>
                  </div>
                  <details className="sop-guide-details">
                    <summary>{ui("More actions and details")}</summary>
                    <p className="sop-library-revision">
                      {ui("revision")} {s.revision}
                    </p>
                    <dl className="sop-library-facts">
                      <div>
                        <dt>{ui("Procedure sections")}</dt>
                        <dd>{card.readableSections}</dd>
                      </div>
                      <div>
                        <dt>{ui("Checks")}</dt>
                        <dd>{card.checks}</dd>
                      </div>
                      <div>
                        <dt>{ui("Original language")}</dt>
                        <dd>
                          {SOP_INTERFACE_LANGUAGES.find(
                            (language) =>
                              language.code === s.definition.language,
                          )?.name || s.definition.language}
                        </dd>
                      </div>
                    </dl>
                    {s.source && (
                      <p>
                        {ui("Adapted from")} {s.source.author} ·{" "}
                        {s.source.versionId}
                      </p>
                    )}
                    <div className="sop-library-actions">
                      <button onClick={() => openEditor(s, "sop-editor-start")}>
                        {ui("Edit SOP")}
                      </button>
                      {(w.manage ||
                        (s.status === "draft" &&
                          s.createdBy === user?.uid)) && (
                        <button
                          className="sop-danger"
                          disabled={client.busy}
                          onClick={() => {
                            setDeleting(s.id);
                            setDeleteError("");
                            setMessage("");
                          }}
                        >
                          {ui(
                            s.status === "draft"
                              ? "Delete draft"
                              : "Delete SOP",
                          )}
                        </button>
                      )}
                      {w.manage && (
                        <>
                          {s.status === "draft" && (
                            <button
                              disabled={client.busy || card.issues > 0}
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
                              {ui("Approve draft")}
                            </button>
                          )}
                          {s.status === "draft" && card.issues > 0 && (
                            <p className="sop-muted">
                              {ui(
                                "Complete the highlighted fields in the draft before approving.",
                              )}
                            </p>
                          )}
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
                                {existingSopAdoption(w.adoptions, s.id)
                                  ? ui("Manage adoption")
                                  : c.adopt}
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </details>
                  {deleting === s.id && (
                    <section
                      className="sop-alert"
                      aria-label={ui("Confirm deletion")}
                    >
                      <h4>
                        {ui("Delete SOP")}: {s.title}?
                      </h4>
                      <p>
                        {ui(
                          "You can restore it from Deleted SOPs. Published copies are withdrawn; existing farm tasks keep their instructions.",
                        )}
                      </p>
                      {deleteError && <p role="alert">{deleteError}</p>}
                      <div className="sop-toolbar">
                        <button
                          autoFocus
                          disabled={client.busy}
                          onClick={() => {
                            setDeleting(null);
                            setDeleteError("");
                            setMessage("");
                          }}
                        >
                          {ui("Keep SOP")}
                        </button>
                        <button
                          className="sop-danger"
                          disabled={client.busy}
                          onClick={() =>
                            void run(async () => {
                              setDeleteError("");
                              try {
                                await client.command({
                                  action: "deleteSop",
                                  sopId: s.id,
                                  expectedRevision: s.revision,
                                });
                              } catch (error) {
                                setDeleteError(
                                  getUserErrorMessage(error, "Unable to delete this SOP."),
                                );
                                throw error;
                              }
                              setDeleting(null);
                              setMessage(ui("SOP moved to Deleted SOPs."));
                            })
                          }
                        >
                          {ui("Confirm delete")}
                        </button>
                      </div>
                    </section>
                  )}
                </article>
              );
            })}
        </>
      )}
      {tab === "library" &&
        !definition &&
        !reading &&
        w.sops.some((s) => s.status === "deleted") && (
          <details className="sop-card">
            <summary>{ui("Deleted SOPs")}</summary>
            {w.sops
              .filter((s) => s.status === "deleted")
              .map((s) => (
                <article key={s.id}>
                  <h3>{s.title}</h3>
                  {(w.manage || s.createdBy === user?.uid) && (
                    <button
                      disabled={client.busy}
                      onClick={() =>
                        void run(async () => {
                          await client.command({
                            action: "restoreSop",
                            sopId: s.id,
                            expectedRevision: s.revision,
                          });
                          setMessage(
                            ui("SOP restored. Republish separately if needed."),
                          );
                        })
                      }
                    >
                      {ui("Restore SOP")}
                    </button>
                  )}
                </article>
              ))}
          </details>
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
                <SopContentView
                  content={s.definition.content}
                  language={currentLanguage}
                  idPrefix={`community-${s.id}`}
                />
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
          {activatedAdoptionId && (
            <p className="sop-notice">
              <Link href={`/dashboard/todo?adoptionId=${activatedAdoptionId}`}>
                {ui("Open assigned To-do")}
              </Link>
            </p>
          )}
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
              <ul className="sop-target-review">
                {ad.targets.map((target) => (
                  <li key={`${target.scope}:${target.id}`}>
                    <strong>{target.name}</strong>
                    <span>
                      {ui("Assigned to")}{" "}
                      {w.members.find(
                        (member) => member.id === target.assigneeId,
                      )?.name || target.assigneeId}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="sop-toolbar">
                {w.manage && (
                  <>
                    <button
                      onClick={() =>
                        startAdoption(
                          {
                            id: ad.sopId,
                            title: ad.title,
                            definition: ad.definition,
                            revision: ad.revision,
                            status: "approved",
                            approvedVersionId: ad.versionId,
                          },
                          ad,
                        )
                      }
                    >
                      {ui("Manage adoption")}
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
                    onChange={(e) => {
                      setStageTarget(e.target.value);
                      setPlannedStockingDate(
                        w.physicalPonds.find((p) => p.id === e.target.value)
                          ?.plannedStockingDate || "",
                      );
                    }}
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
                    value={stage}
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
              {w.manage && (
                <div className="sop-grid">
                  <Field label={ui("Planned stocking date")}>
                    <input
                      type="date"
                      value={plannedStockingDate}
                      onChange={(e) => setPlannedStockingDate(e.target.value)}
                    />
                  </Field>
                  <p className="sop-help">
                    {ui(
                      "H-20 means 20 days before the planned stocking date. Actual stocking starts DOC0.",
                    )}
                  </p>
                  <button
                    disabled={!stageTarget || client.busy}
                    onClick={() =>
                      void run(() =>
                        client.command({
                          action: "planStocking",
                          targetId: stageTarget,
                          plannedStockingDate,
                        }),
                      )
                    }
                  >
                    {ui("Save stocking plan")}
                  </button>
                </div>
              )}
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
                {ui("Save pond stage")}
              </button>
            </section>
          }
        </>
      )}
      {reading && tab === "library" && (
        <section ref={readerRef} style={{ scrollMarginTop: 90 }}>
          <div className="sop-toolbar sop-reader-toolbar">
            <button
              className="sop-back-link"
              onClick={() => {
                setMessage("");
                setReading(null);
              }}
            >
              ← {c.library}
            </button>
            <button onClick={() => openEditor(reading, "sop-editor-start")}>
              {ui("Edit SOP")}
            </button>
          </div>
          <SopReader
            document={reading}
            onResolve={(target) => openEditor(reading, target)}
            language={currentLanguage}
            onOpen={(attachment) =>
              void run(() => client.openAttachment(attachment, true))
            }
          />
        </section>
      )}
      {definition && tab === "library" && (
        <fieldset
          className="sop-editor"
          id="sop-editor-start"
          tabIndex={-1}
          disabled={!!draftProgress || savingDraft}
        >
          <div className="sop-toolbar">
            <div>
              <h2 tabIndex={-1}>{editing ? ui("Edit SOP") : c.create}</h2>
              <p className="sop-muted">
                {ui(
                  "Write the procedure, set your targets, then review before approval.",
                )}
              </p>
            </div>
            <div className="sop-toolbar-actions">
              <button
                className="sop-primary"
                disabled={client.busy || !!draftProgress}
                onClick={() => void saveDraft()}
              >
                {savingDraft ? ui("Saving draft…") : c.save}
              </button>
              <button
                disabled={!!draftProgress}
                onClick={() => {
                  setDefinition(null);
                  setSaveError("");
                  setImportError("");
                  setMessage("");
                }}
              >
                {c.back}
              </button>
            </div>
          </div>
          {!!saveError && (
            <div role="alert" className="sop-alert">
              <strong>{ui("Draft not saved")}</strong>
              <p>{saveError}</p>
              <p>{ui("Your edits are still here. Retry Save draft.")}</p>
            </div>
          )}
          {!!errors.length && (!!editing || !!definition.title.trim()) && (
            <details
              className="sop-alert sop-review-items"
              id="sop-completion-links"
              open
            >
              <summary>
                {ui("Complete these before approval")} · {errors.length}
              </summary>
              <p>
                {ui("Select a warning to open the field that needs attention.")}
              </p>
              <ul role="list">
                {sopIssueLinks(definition).map(({ issue, target }, index) => (
                  <li key={index}>
                    <button
                      className="sop-warning-link"
                      onClick={() => setEditorTarget({ id: target })}
                    >
                      {sopEditorIssue(issue, currentLanguage)} →
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <details className="sop-card sop-import" open={creationMode === "import"}>
            <summary>{ui("Import SOP document")}</summary>
            <p>
              {ui(
                "Choose a document, then generate a draft. The draft and source are saved for review.",
              )}
            </p>
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
              disabled={!!draftProgress}
              onChange={(e) => {
                setAiFile(e.target.files?.[0] || null);
                setImportError("");
              }}
            />
            <button
              disabled={
                client.busy || !!draftProgress || (!aiFile && !aiText.trim())
              }
              onClick={() =>
                void run(async () => {
                  if (generating.current) return;
                  generating.current = true;
                  setImportError("");
                  try {
                    const result = await generateAndSaveSopDraft({
                      client,
                      text: aiText,
                      language: definition.language,
                      file: aiFile || undefined,
                      editing,
                      attachments: definition.attachments,
                      onProgress: setDraftProgress,
                      onDraft: setDefinition,
                    });
                    setEditing(result.document);
                    setReading(result.document);
                    setDefinition(null);
                    setMessage(ui("Draft saved. Review before approval."));
                  } catch (error) {
                    setImportError(
                      getUserErrorMessage(error, "Unable to import this document. Try again."),
                    );
                  } finally {
                    generating.current = false;
                    setDraftProgress(null);
                  }
                })
              }
            >
              {ui("Generate reviewable draft")}
            </button>
            {importError && (
              <div role="alert" className="sop-alert">
                <strong>{ui("Import failed")}</strong>
                <p>{ui(importError)}</p>
                <p>
                  {ui(
                    "Import did not finish. Your file is still selected. Retry or return to the library. If content appeared below, use Save draft to retry saving.",
                  )}
                </p>
              </div>
            )}
            {draftProgress && (
              <p role="status" aria-live="polite">
                {ui(
                  {
                    uploading: "Uploading source document…",
                    generating:
                      "Generating SOP draft. Large documents can take several minutes. Keep this page open…",
                    saving: "Saving draft and source document…",
                  }[draftProgress],
                )}
              </p>
            )}
          </details>
          <section className="sop-card sop-about">
            <h3>{ui("1. About this SOP")}</h3>
            <div className="sop-grid">
              <Field id="sop-title" label={ui("Title")}>
                <input
                  value={definition.title}
                  onChange={(e) =>
                    setDefinition({ ...definition, title: e.target.value })
                  }
                />
              </Field>
              <Field id="sop-language" label={ui("Original language")}>
                <select
                  value={definition.language}
                  onChange={(e) =>
                    setDefinition({ ...definition, language: e.target.value })
                  }
                >
                  {SOP_INTERFACE_LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="sop-description" label={ui("Description")}>
                <textarea
                  value={definition.description}
                  onChange={(e) =>
                    setDefinition({
                      ...definition,
                      description: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </section>
          <details className="sop-card" id="sop-attachments">
            <summary>{ui("Additional reference files")}</summary>
            <p>
              {ui(
                "These files are attached for readers only. To convert a document, use Import SOP document above.",
              )}
            </p>
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
                              attachments: [
                                ...(d.attachments || []),
                                attachment,
                              ],
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
                <button
                  onClick={() => void run(() => client.openAttachment(a))}
                >
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
          </details>
          <SopContentEditor
            content={definition.content}
            language={currentLanguage}
            onChange={(content) => setDefinition({ ...definition, content })}
          />
          <div
            className="sop-editor-heading"
            id="sop-checks-editor"
            tabIndex={-1}
          >
            <h3>{ui("3. Checks and follow-up")}</h3>
            <p>
              {ui(
                "Open a check to set its targets and instructions. Advanced settings are optional to edit.",
              )}
            </p>
          </div>
          {definition.steps.some((step) =>
            step.check.field.startsWith("water."),
          ) && (
            <section className="sop-card">
              <h4 className="sop-targets-title">
                {ui("Water parameter targets")}
              </h4>
              <p className="sop-muted">
                {ui(
                  "These are SOP targets, not today's measurements. Open a check to change its limits.",
                )}
              </p>
              <div
                className="sop-table-scroll"
                role="region"
                aria-label={ui("Water parameter targets")}
                tabIndex={0}
              >
                <table className="sop-reference-table sop-targets-table">
                  <thead>
                    <tr>
                      <th scope="col">{ui("Measurement or record")}</th>
                      <th scope="col">{ui("Target or check")}</th>
                      <th scope="col">{ui("Edit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definition.steps
                      .filter((step) => step.check.field.startsWith("water."))
                      .map((step) => (
                        <tr key={step.id}>
                          <th scope="row">
                            {sopMeasurementLabel(
                              step.check.field,
                              currentLanguage,
                            )}
                          </th>
                          <td>
                            {sopTargetLabel(step, currentLanguage)}
                            {step.check.operator === "present" && (
                              <small className="sop-target-note">
                                {ui("No limits checked")}
                              </small>
                            )}
                          </td>
                          <td>
                            <a
                              href={`#sop-check-${step.id}`}
                              aria-label={`${ui("Edit targets")}: ${step.title}`}
                              onClick={() => {
                                const section = document.getElementById(
                                  `sop-check-${step.id}`,
                                );
                                if (section instanceof HTMLDetailsElement)
                                  section.open = true;
                              }}
                            >
                              {ui("Edit targets")}
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {definition.steps.map((s, index) => (
            <details
              key={s.id}
              id={`sop-check-${s.id}`}
              className="sop-card sop-step-editor"
              open={index === 0}
            >
              <summary>
                <span>
                  {index + 1}. {s.title || ui("Untitled check")}
                </span>
                <span className="sop-step-status">
                  {errors.some((error) =>
                    error.startsWith(`${s.title || s.id}: `),
                  )
                    ? ui("Needs attention")
                    : ui("Ready for review")}
                </span>
              </summary>
              <div className="sop-step-section">
                <h4>{ui("What to do")}</h4>
                <div className="sop-grid">
                  <Field label={ui("Check name")}>
                    <input
                      value={s.title}
                      onChange={(e) =>
                        changeStep(index, { title: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={ui("Instructions for staff")}>
                    <textarea
                      value={s.instructions}
                      onChange={(e) =>
                        changeStep(index, { instructions: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="sop-step-section">
                <h4>{ui("Acceptable measurement or result")}</h4>
                <p className="sop-muted">
                  {ui(
                    "Set targets here. Record actual readings in the pond records.",
                  )}
                </p>
                <div className="sop-grid">
                  <Field label={ui("Measurement or record")}>
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
                          {sopMeasurementLabel(f.key, currentLanguage)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {[
                    "inventory.totalStock",
                    "treatment.quantity",
                    "equipment.maintenance",
                  ].includes(s.check.field) && (
                    <Field
                      id={`sop-check-${s.id}-source`}
                      label={ui("Item or equipment")}
                    >
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
                  )}
                  <Field
                    id={`sop-check-${s.id}-condition`}
                    label={ui("How to check it")}
                  >
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
                      {sopSimpleCheckModes(s).map((mode) => (
                        <option key={mode} value={mode}>
                          {sopCheckModeLabel(mode, currentLanguage)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {(s.check.operator === "range" ||
                    s.check.operator === "trend") && (
                    <>
                      <Field
                        id={`sop-check-${s.id}-limits`}
                        label={ui("Lower limit")}
                      >
                        <input
                          type="number"
                          step="any"
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
                      <Field label={ui("Upper limit")}>
                        <input
                          type="number"
                          step="any"
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
                    </>
                  )}
                  {(SOP_FIELDS.find((f) => f.key === s.check.field)?.unit ||
                    ["inventory.totalStock", "treatment.quantity"].includes(
                      s.check.field,
                    ) ||
                    s.check.operator === "range" ||
                    s.check.operator === "trend") && (
                    <Field id={`sop-check-${s.id}-unit`} label={ui("Unit")}>
                      <input
                        value={s.check.unit}
                        onChange={(e) =>
                          changeStep(index, {
                            check: { ...s.check, unit: e.target.value },
                          })
                        }
                      />
                    </Field>
                  )}
                  {(SOP_FIELDS.find((f) => f.key === s.check.field)?.basis ||
                    s.check.basis) && (
                    <Field
                      id={`sop-check-${s.id}-basis`}
                      label={ui("Measurement basis")}
                    >
                      <select
                        value={s.check.basis}
                        onChange={(e) =>
                          changeStep(index, {
                            check: { ...s.check, basis: e.target.value },
                          })
                        }
                      >
                        <option value="">
                          {ui("Not applicable / unknown")}
                        </option>
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
                  )}
                  {(s.check.operator === "equals" ||
                    s.check.operator === "sequence") && (
                    <>
                      <Field
                        id={`sop-check-${s.id}-value`}
                        label={ui("Required value / sequence")}
                      >
                        <input
                          value={s.check.value}
                          onChange={(e) =>
                            changeStep(index, {
                              check: { ...s.check, value: e.target.value },
                            })
                          }
                        />
                      </Field>
                    </>
                  )}
                  {s.check.operator === "narrative" && (
                    <>
                      <Field
                        id={`sop-check-${s.id}-rubric`}
                        label={`${ui("What must the notes or photos show?")} (${ui("Optional")})`}
                      >
                        <textarea
                          value={s.check.rubric}
                          onChange={(e) =>
                            changeStep(index, {
                              check: { ...s.check, rubric: e.target.value },
                            })
                          }
                        />
                      </Field>
                    </>
                  )}
                </div>
                {s.check.operator === "present" && (
                  <p className="sop-help">
                    {ui(
                      "This only checks that a record exists. Choose Within limits to check a measurement against your targets.",
                    )}
                  </p>
                )}
                {(s.check.operator === "range" ||
                  s.check.operator === "trend") &&
                  s.check.min === null &&
                  s.check.max === null && (
                    <p className="sop-field-error">
                      {ui(
                        "Enter a lower or upper limit approved for your farm.",
                      )}
                    </p>
                  )}
              </div>
              <div className="sop-step-section">
                <h4>{ui("If something goes wrong")}</h4>
                <Field
                  id={`sop-check-${s.id}-corrective`}
                  label={`${ui("What should staff do if this check fails?")} (${ui("Optional")})`}
                >
                  <textarea
                    value={s.correctiveInstructions}
                    onChange={(e) =>
                      changeStep(index, {
                        correctiveInstructions: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="sop-step-section">
                <h4>{ui("When to do it")}</h4>
                <div className="sop-grid">
                  <Field group label={ui("Stages")}>
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
                  <Field id={`sop-check-${s.id}-schedule`} label={ui("When")}>
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
                      {(
                        [
                          "daily",
                          "weekly",
                          "doc",
                          "event",
                          "stage",
                          "manual",
                        ] as const
                      ).map((kind) => (
                        <option key={kind} value={kind}>
                          {sopScheduleLabel(kind, currentLanguage)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {(s.trigger.kind === "daily" ||
                    s.trigger.kind === "weekly" ||
                    s.trigger.kind === "doc") && (
                    <>
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
                    </>
                  )}
                  {s.trigger.kind === "doc" && (
                    <>
                      {(["docFrom", "docTo", "everyDays"] as const).map(
                        (key) => (
                          <Field
                            label={sopFieldLabel(key, currentLanguage)}
                            key={key}
                          >
                            <input
                              type="number"
                              step={1}
                              min={key === "everyDays" ? 1 : undefined}
                              value={s.trigger[key]}
                              onChange={(e) =>
                                changeStep(index, {
                                  trigger: {
                                    ...s.trigger,
                                    [key]: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </Field>
                        ),
                      )}
                      <p className="sop-help">
                        {ui(
                          "Use -20 for H-20, -1 for H-1, and 0 or more for DOC. Preparation and stocked steps need separate windows.",
                        )}
                      </p>
                      <p className="sop-help">
                        {sopTimingLabel(s, currentLanguage)}
                      </p>
                    </>
                  )}
                  {s.trigger.kind === "weekly" && (
                    <>
                      <Field label={ui("Weekly days")}>
                        <div className="sop-checkboxes">
                          {[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                          ].map((day, i) => (
                            <label key={day}>
                              <input
                                type="checkbox"
                                checked={s.trigger.weekDays.includes(i)}
                                onChange={() =>
                                  changeStep(index, {
                                    trigger: {
                                      ...s.trigger,
                                      weekDays: s.trigger.weekDays.includes(i)
                                        ? s.trigger.weekDays.filter(
                                            (d) => d !== i,
                                          )
                                        : [...s.trigger.weekDays, i],
                                    },
                                  })
                                }
                              />
                              {ui(day)}
                            </label>
                          ))}
                        </div>
                      </Field>
                    </>
                  )}
                  {(s.trigger.kind === "event" ||
                    s.trigger.kind === "stage") && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              <details
                className="sop-advanced"
                id={`sop-check-${s.id}-advanced`}
              >
                <summary>{ui("Advanced settings")}</summary>
                <p className="sop-muted">
                  {ui(
                    "Assignment, evidence rules, rechecks, and linked tasks. Existing settings are kept.",
                  )}
                </p>
                <div className="sop-grid">
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
                  {(["windowMinutes", "everyDays", "offsetMinutes"] as const)
                    .filter(
                      (k) => s.trigger.kind !== "doc" || k !== "everyDays",
                    )
                    .map((k) => (
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
                  <Field label={ui("Other check methods")}>
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
                      {sopCheckModes(s).map((mode) => (
                        <option key={mode} value={mode}>
                          {sopCheckModeLabel(mode, currentLanguage)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={ui("Minimum records")}>
                    <input
                      type="number"
                      min={1}
                      value={s.check.minCount}
                      onChange={(e) =>
                        changeStep(index, {
                          check: {
                            ...s.check,
                            minCount: Number(e.target.value),
                          },
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
                      group
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
                  <Field
                    label={ui("Require this check before entering a stage")}
                  >
                    <select
                      value={s.gateStage}
                      onChange={(e) =>
                        changeStep(index, {
                          gateStage: e.target.value as SopStep["gateStage"],
                        })
                      }
                    >
                      <option value="">
                        {ui("Does not block stage changes")}
                      </option>
                      {options([...SOP_STAGES])}
                    </select>
                  </Field>
                  <p className="sop-help">
                    {ui(
                      "Choose a stage only if this check must pass before the pond can enter it. Otherwise leave stage changes unblocked.",
                    )}
                  </p>
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
                        changeStep(index, {
                          requireAttachment: e.target.checked,
                        })
                      }
                    />{" "}
                    {ui("Require attachment")}
                  </label>
                </div>
              </details>
              {errors
                .filter(
                  (error) =>
                    error.startsWith(`${s.title || s.id}: `) &&
                    !error.endsWith("Set a farm-approved minimum or maximum."),
                )
                .map((error) => (
                  <p className="sop-field-error" key={error}>
                    <button
                      className="sop-warning-link"
                      onClick={() =>
                        setEditorTarget({
                          id:
                            sopIssueLinks(definition).find(
                              (item) => item.issue === error,
                            )?.target || `sop-check-${s.id}`,
                        })
                      }
                    >
                      {sopEditorIssue(error, currentLanguage)} →
                    </button>
                  </p>
                ))}
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
                  {
                    ...emptySopStep(`step-${crypto.randomUUID()}`),
                    title: sopText("Record a measurement", definition.language),
                  },
                ],
              })
            }
          >
            {ui("Add step")}
          </button>
          <details className="sop-card">
            <summary>{ui("Automation preview")}</summary>
            <SopFlowPreview definition={definition} />
            <ol>
              {definition.steps.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong> →{" "}
                  {sopMeasurementLabel(s.check.field, currentLanguage)}{" "}
                  {ui("→ pass:")}{" "}
                  {s.onPass
                    .map(
                      (id) => definition.steps.find((t) => t.id === id)?.title,
                    )
                    .join(", ") || ui("complete")}{" "}
                  {ui("/ fail:")}{" "}
                  {s.correctiveInstructions ||
                    ui("configure corrective action")}{" "}
                  {ui("→ recheck after")} {s.recheckMinutes}{" "}
                  {ui("min → escalate after")} {s.escalationMinutes} {ui("min")}
                </li>
              ))}
            </ol>
          </details>
          {!!saveError && (
            <div role="alert" className="sop-alert">
              <strong>{ui("Draft not saved")}</strong>
              <p>{saveError}</p>
              <p>{ui("Your edits are still here. Retry Save draft.")}</p>
            </div>
          )}
          <button
            className="sop-primary"
            disabled={client.busy || !!draftProgress}
            onClick={() => void saveDraft()}
          >
            {savingDraft ? ui("Saving draft…") : c.save}
          </button>
        </fieldset>
      )}
      {adopting && (
        <SopAdoptionDialog
          sop={adopting.sop}
          adoption={adopting.adoption}
          client={client}
          ui={ui}
          onClose={() => setAdopting(null)}
          onActivated={(adoptionId) => {
            setAdopting(null);
            setActivatedAdoptionId(adoptionId);
            setTab("adopted");
            setMessage(
              ui(
                "Adoption saved. Open To-do to view assigned work. New tasks appear after the scheduler runs.",
              ),
            );
            setMessageTone("status");
          }}
        />
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
        <AccessibleDialog
          title={ui("Review SOP update")}
          onClose={() => setUpdateReview(null)}
          busy={client.busy}
          className="sop-dialog"
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
        </AccessibleDialog>
      )}
    </section>
  );
}
