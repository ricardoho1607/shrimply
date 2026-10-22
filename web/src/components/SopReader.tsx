import Link from "next/link";
import { useId } from "react";
import { SopContentView } from "./SopContent";
import type { SopDocument } from "../../../shared/sop/client";
import type { SopAttachment } from "../../../shared/sop/contracts";
import { sopText } from "../../../shared/sop/uiCopy";
import {
  sopMeasurementLabel,
  sopTargetLabel,
  sopTimingLabel,
  sopEditorIssue,
  sopIssueLinks,
  SOP_INTERFACE_LANGUAGES,
} from "../../../shared/sop/editor";

export function SopReader({
  document,
  language,
  onOpen,
  onResolve,
}: {
  document: SopDocument;
  language: string;
  onOpen: (attachment: SopAttachment) => void;
  onResolve?: (target: string) => void;
}) {
  const ui = (value: string) => sopText(value, language);
  const { definition } = document;
  const contentId = useId();
  const reviewItems =
    document.status === "approved" ? [] : sopIssueLinks(definition);
  return (
    <article className="sop-reader">
      <header className="sop-document-heading">
        <p className="sop-eyebrow">{ui("STANDARD OPERATING PROCEDURE")}</p>
        <h2>{definition.title}</h2>
        <div className="sop-document-meta">
          <span className="sop-status">{ui(document.status === "approved" ? "Document reviewed" : document.status)}</span>
          <span>
            {ui("revision")} {document.revision}
          </span>
          <span>
            {ui("Original language")}:{" "}
            {SOP_INTERFACE_LANGUAGES.find(
              (item) => item.code === definition.language,
            )?.name || definition.language}
          </span>
        </div>
        {document.status !== "approved" && (
          <p className="sop-draft-note">
            {ui(
              "Draft guidance. Review and approve before applying it to farm work.",
            )}
          </p>
        )}
        {document.source && (
          <p>
            {ui("Adapted from")} {document.source.author} ·{" "}
            {document.source.versionId}
          </p>
        )}
      </header>
      {definition.steps.some(step => step.check.field.startsWith("water.") && step.check.operator === "present") && (
        <p className="sop-help">{ui("Some checks only confirm a record exists. They do not check water limits.")}</p>
      )}
      <Link className="sop-button sop-primary" href="/dashboard/todo">{ui("Open my tasks")}</Link>
      <p>{ui("Use your pond task for today's work. Keep this guide as a reference.")}</p>
      {!!reviewItems.length && (
        <details className="sop-review-items">
          <summary>
            {ui("Resolve before approval")} <span>{reviewItems.length}</span>
          </summary>
          <ul role="list">
            {reviewItems.map(({ issue, target }, index) => (
              <li key={index}>
                {onResolve ? (
                  <button
                    className="sop-warning-link"
                    onClick={() => onResolve(target)}
                  >
                    {sopEditorIssue(issue, language)} →
                  </button>
                ) : (
                  sopEditorIssue(issue, language)
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      {definition.description && (
        <details className="sop-overview">
          <summary>{ui("Overview and review notes")}</summary>
          <p className="sop-prose">{definition.description}</p>
        </details>
      )}
      {definition.steps.some((step) =>
        step.check.field.startsWith("water."),
      ) && (
        <details className="sop-card">
          <summary>{ui("Water parameter targets")}</summary>
          <p className="sop-help">
            {ui("These are SOP targets, not today’s measurements.")}
          </p>
          <table className="sop-table sop-targets-table">
            <thead>
              <tr>
                <th>{ui("Measurement or record")}</th>
                <th>{ui("Target or check")}</th>
              </tr>
            </thead>
            <tbody>
              {definition.steps
                .filter((step) => step.check.field.startsWith("water."))
                .map((step) => (
                  <tr key={step.id}>
                    <th scope="row">
                      {sopMeasurementLabel(step.check.field, language)}
                    </th>
                    <td>
                      {sopTargetLabel(step, language)}
                      {step.check.operator === "present" && (
                        <span className="sop-target-note">
                          {ui("No limits checked")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
      {!!definition.attachments?.length && (
        <section className="sop-source-documents">
          <h3>{ui("Source documents")}</h3>
          <p>
            {ui(
              "Read the source for full tables, recipes, and context. AI guidance requires review.",
            )}
          </p>
          <div className="sop-toolbar">
            {definition.attachments.map((file) => (
              <button
                className="sop-source-file"
                title={ui("Download source")}
                aria-label={`${ui("Download source")}: ${file.name}`}
                key={file.path}
                onClick={() => onOpen(file)}
              >
                <span className="sop-source-type">
                  {file.contentType === "application/pdf"
                    ? "PDF"
                    : ui("Source documents")}
                </span>
                <span>{file.name}</span>
                <span aria-hidden="true">↓</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {!definition.content && !!definition.attachments?.length && (
        <p className="sop-draft-note">
          {ui(
            "This import contains workflow rules only. Re-import the source with the updated SOP service to retain document sections and tables.",
          )}
        </p>
      )}
      <details className="sop-reference" open={document.status !== "approved"}>
      <summary>{ui("Full guide and reference tables")}</summary>
      <details className="sop-contents" open={!!definition.content}>
        <summary>
          {ui("Contents")}{" "}
          <span>
            {definition.content?.sections.length || definition.steps.length}
          </span>
        </summary>
        <ol>
          {definition.content
            ? definition.content.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${contentId}-${section.id}`}>{section.title}</a>
                </li>
              ))
            : definition.steps.map((step, index) => (
                <li key={step.id}>
                  <a href={`#sop-procedure-${index}`}>{step.title}</a>
                </li>
              ))}
        </ol>
      </details>
      <SopContentView
        content={definition.content}
        language={language}
        idPrefix={contentId}
        onResolve={document.status === "draft" ? onResolve : undefined}
      />
      </details>
      <details className="sop-workflow-rules" open>
        <summary>
          {ui("Tasks in this guide")} · {definition.steps.length}
        </summary>
        {definition.steps.map((step, index) => (
          <details
            className="sop-procedure"
            id={`sop-procedure-${index}`}
            key={step.id}
          >
            <summary className="sop-procedure-title">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step.title}
            </summary>
            <p className="sop-prose">{step.instructions}</p>
            <p className="sop-procedure-scope">
              {ui("Applies to")}: {ui(step.scope)} ·{" "}
              {step.stages.map(ui).join(", ")}
            </p>
            <p className="sop-procedure-scope">
              {ui("When")}: {sopTimingLabel(step, language)}
            </p>
            <div className="sop-check-details">
              <h4>{sopMeasurementLabel(step.check.field, language)}</h4>
              <p>
                <strong>
                  {ui("Target or check")}: {sopTargetLabel(step, language)}
                </strong>
              </p>
              {step.check.operator === "present" && (
                <p className="sop-help">
                  {ui(
                    "No measurement limits are set. This check only requires a record.",
                  )}
                </p>
              )}
              {step.check.value && (
                <p className="sop-prose">
                  {ui("Required value / sequence")}: {step.check.value}
                </p>
              )}
            </div>
            {step.correctiveInstructions && (
              <div>
                <h4>{ui("If the expected result is not met")}</h4>
                <p className="sop-prose">{step.correctiveInstructions}</p>
              </div>
            )}
            {step.check.rubric && (
              <div>
                <h4>{ui("Required evidence")}</h4>
                <p className="sop-prose">{step.check.rubric}</p>
              </div>
            )}
          </details>
        ))}
      </details>
    </article>
  );
}
