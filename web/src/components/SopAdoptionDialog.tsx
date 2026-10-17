"use client";
import { getUserErrorMessage } from '@/lib/userError';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AccessibleDialog from "./AccessibleDialog";
import {
  adoptionPonds,
  adoptionPreview,
  confirmedAdoption,
  toggleAdoptionSelection,
  type AdoptionPreview,
} from "../../../shared/sop/adoption";
import type { SopClient, SopDocument } from "../../../shared/sop/client";
import type { SopAdoption } from "../../../shared/sop/contracts";

export default function SopAdoptionDialog({
  sop,
  adoption,
  client,
  ui,
  onClose,
  onActivated,
}: {
  sop: SopDocument;
  adoption?: SopAdoption;
  client: SopClient;
  ui: (text: string) => string;
  onClose: () => void;
  onActivated: (adoptionId: string) => void;
}) {
  const w = client.workspace;
  const managers = w.members.filter((m) =>
    ["owner", "co-owner", "manager"].includes(m.role),
  );
  const [pondIds, setPondIds] = useState<string[]>(adoption?.pondIds || []);
  const [blockIds, setBlockIds] = useState<string[]>(adoption?.blockIds || []);
  const [managerId, setManagerId] = useState(
    adoption?.managerId || managers[0]?.id || "",
  );
  const [recipients, setRecipients] = useState<string[]>(
    adoption?.recipients || [],
  );
  const [lifetime, setLifetime] = useState<"cycle" | "standing">(
    adoption?.lifetime || "cycle",
  );
  const [companyScope, setCompanyScope] = useState(
    adoption?.companyScope || false,
  );
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<AdoptionPreview | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (preview) reviewHeading.current?.focus();
  }, [preview]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const busy = client.busy || working;
  const choices = adoptionPonds(w);
  const selected = choices.filter(
    (p) => pondIds.includes(p.id) || blockIds.includes(p.blockId),
  );
  const inactive =
    lifetime === "cycle" ? selected.filter((p) => !p.activeCycle) : [];
  const visible = choices.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const settings = {
    blockIds,
    pondIds,
    managerId,
    recipients,
    lifetime,
    companyScope,
  };
  const scope = adoption
    ? { adoptionId: adoption.id, expectedRevision: adoption.revision }
    : { sopId: sop.id };
  const changed = () => {
    setPreview(null);
    setError("");
  };
  const memberName = (id: string) =>
    w.members.find((m) => m.id === id)?.name || id;
  const hasScope = selected.length > 0 || blockIds.length > 0 || companyScope;
  const review = async () => {
    setWorking(true);
    setError("");
    setPreview(null);
    try {
      setPreview(
        adoptionPreview(
          await client.command({
            action: adoption ? "previewMembership" : "previewAdoption",
            ...scope,
            ...settings,
          }),
        ),
      );
    } catch (e) {
      setError(
        getUserErrorMessage(e, ui("Unable to review adoption.")),
      );
    } finally {
      setWorking(false);
    }
  };
  const activate = async () => {
    if (!preview || busy) return;
    setWorking(true);
    setError("");
    try {
      const result = await client.command({
        action: adoption ? "refreshMembership" : "activate",
        ...scope,
        ...settings,
        expectedVersionId: preview.versionId,
        ...(preview.targetSignature
          ? { expectedTargetSignature: preview.targetSignature }
          : {}),
      });
      onActivated(confirmedAdoption(result));
    } catch (e) {
      setPreview(null);
      setError(
        getUserErrorMessage(e, ui("Unable to activate adoption.")),
      );
    } finally {
      setWorking(false);
    }
  };
  return (
    <AccessibleDialog
      title={ui(adoption ? "Manage adoption" : "Adopt SOP")}
      onClose={onClose}
      busy={busy}
      className="sop-dialog sop-adoption-dialog"
    >
      <div className="sop-card">
        <header className="sop-adoption-heading">
          <div>
            <p className="sop-eyebrow">
              {ui(adoption ? "Manage adoption" : "Adopt SOP")}
            </p>
            <h2>{sop.title}</h2>
            <p>
              {ui(
                "Choose ponds, review their assignments, then activate work.",
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label={ui("Close")}
          >
            ×
          </button>
        </header>
        <fieldset disabled={busy} className="sop-adoption-fields">
          <section aria-labelledby="sop-adoption-ponds">
            <h3 id="sop-adoption-ponds">{ui("1. Select ponds")}</h3>
            <p>
              {ui(
                "You can select more than one pond. Existing pond assignments determine who receives the work.",
              )}
            </p>
            <label className="sop-field">
              {ui("Lifetime")}
              <select
                value={lifetime}
                disabled={!!adoption}
                onChange={(e) => {
                  setLifetime(e.target.value as "cycle" | "standing");
                  changed();
                }}
              >
                <option value="cycle">{ui("Current cycle")}</option>
                <option value="standing">{ui("Standing procedure")}</option>
              </select>
            </label>
            <p className="sop-muted">
              {ui(
                lifetime === "cycle"
                  ? "Applies to each selected pond’s active cycle. Unstocked ponds need a standing procedure."
                  : "Includes preparation and follows these ponds into future cycles.",
              )}
            </p>
            {w.blocks.length > 0 && (
              <details className="sop-adoption-blocks">
                <summary>{ui("Select whole blocks")}</summary>
                <p>{ui("Block selection follows future pond membership.")}</p>
                {w.blocks.map((b) => (
                  <label key={b.id} className="sop-selection-row">
                    <input
                      type="checkbox"
                      checked={blockIds.includes(b.id)}
                      onChange={() => {
                        setBlockIds((ids) =>
                          toggleAdoptionSelection(ids, b.id),
                        );
                        changed();
                      }}
                    />
                    <span>{b.name}</span>
                  </label>
                ))}
              </details>
            )}
            <div className="sop-selection-toolbar">
              <label className="sop-field">
                {ui("Search ponds")}
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <span role="status">
                {selected.length} {ui("ponds selected")}
              </span>
            </div>
            <div className="sop-selection-actions">
              <button
                type="button"
                onClick={() => {
                  setPondIds((ids) => [
                    ...new Set([...ids, ...visible.map((p) => p.id)]),
                  ]);
                  changed();
                }}
              >
                {ui("Select visible ponds")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPondIds([]);
                  setBlockIds([]);
                  changed();
                }}
              >
                {ui("Clear selection")}
              </button>
            </div>
            <div
              className="sop-pond-selection"
              role="group"
              aria-label={ui("Selected ponds")}
            >
              {visible.map((p) => (
                <label key={p.id} className="sop-selection-row">
                  <input
                    type="checkbox"
                    checked={
                      pondIds.includes(p.id) || blockIds.includes(p.blockId)
                    }
                    disabled={blockIds.includes(p.blockId)}
                    onChange={() => {
                      setPondIds((ids) => toggleAdoptionSelection(ids, p.id));
                      changed();
                    }}
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {ui(
                        p.activeCycle
                          ? "Active cycle"
                          : "Preparation / no active cycle",
                      )}
                      {p.stockingDate ? ` · ${p.stockingDate}` : ""}
                      {blockIds.includes(p.blockId)
                        ? ` · ${ui("Selected through block")}`
                        : ""}
                    </small>
                  </span>
                </label>
              ))}
              {!visible.length && <p>{ui("No matching ponds.")}</p>}
            </div>
            {selected.length > 0 && (
              <p className="sop-selection-summary">
                {selected.map((p) => p.name).join(", ")}
              </p>
            )}
            {inactive.length > 0 && (
              <div role="alert" className="sop-alert">
                {ui(
                  "These ponds have no active cycle. Choose Standing procedure to include them:",
                )}{" "}
                {inactive.map((p) => p.name).join(", ")}
              </div>
            )}
            {!w.physicalPonds.length && !w.ponds.length && (
              <p>
                {ui("Create ponds before adopting pond procedures.")}{" "}
                <Link href="/dashboard/ponds">{ui("Ponds")}</Link>
              </p>
            )}
          </section>
          <section aria-labelledby="sop-adoption-responsibility">
            <h3 id="sop-adoption-responsibility">
              {ui("2. Review responsibility")}
            </h3>
            <p>
              {ui(
                "Work goes to the technician already assigned to the pond’s block. The accountable manager receives work when no technician is assigned.",
              )}
            </p>
            <label className="sop-field">
              {ui("Accountable manager")}
              <select
                value={managerId}
                onChange={(e) => {
                  setManagerId(e.target.value);
                  changed();
                }}
              >
                <option value="">{ui("Choose manager")}</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <details>
              <summary>{ui("Escalation recipients")}</summary>
              <p>{ui("The accountable manager is always included.")}</p>
              {w.members.map((m) => (
                <label key={m.id}>
                  <input
                    type="checkbox"
                    checked={m.id === managerId || recipients.includes(m.id)}
                    disabled={m.id === managerId}
                    onChange={() => {
                      setRecipients((ids) =>
                        toggleAdoptionSelection(ids, m.id),
                      );
                      changed();
                    }}
                  />
                  {m.name}
                </label>
              ))}
            </details>
            {sop.definition.steps.some((s) => s.scope === "company") && (
              <p>{ui("This SOP also includes company work.")}</p>
            )}
            <label>
              <input
                type="checkbox"
                checked={companyScope}
                onChange={(e) => {
                  setCompanyScope(e.target.checked);
                  changed();
                }}
              />
              {ui("Include company tasks")}
            </label>
            <p>
              {ui("Timezone:")}{" "}
              {w.timeZone || ui("Set your company timezone before activation")}
            </p>
          </section>
        </fieldset>
        {preview && (
          <section
            className="sop-adoption-review"
            aria-labelledby="sop-adoption-review"
          >
            <h3 id="sop-adoption-review" ref={reviewHeading} tabIndex={-1}>
              {ui("3. Confirm adoption")}
            </h3>
            <p>
              {preview.versionId} · {preview.generatedSteps} {ui("Checks")} ·{" "}
              {preview.targets.length} {ui("targets")}
            </p>
            <ul className="sop-target-review">
              {preview.targets.map((t) => (
                <li key={`${t.scope}:${t.id}`}>
                  <strong>{t.name}</strong>
                  <span>
                    {ui(t.stage)} · {ui("Assigned to")}{" "}
                    {memberName(t.assigneeId)}
                  </span>
                </li>
              ))}
            </ul>
            {sop.definition.steps.some((s) => s.assigneeId) && (
              <p className="sop-notice">
                {ui(
                  "Individual check assignments in this SOP take precedence over pond assignments.",
                )}
              </p>
            )}
            <p>
              {ui(
                "Tasks begin from the saved production stage. Written-evidence checks require review; measurement checks use saved source records.",
              )}
            </p>
            {preview.conflicts.map((conflict, i) => (
              <div className="sop-alert" role="alert" key={i}>
                {ui(conflict)}
              </div>
            ))}
          </section>
        )}
        {error && (
          <div role="alert" className="sop-alert">
            {ui(error)}
          </div>
        )}
        <div className="sop-toolbar">
          <button type="button" disabled={busy} onClick={onClose}>
            {ui("Cancel")}
          </button>
          {preview ? (
            <button
              type="button"
              className="sop-primary"
              disabled={busy || preview.conflicts.length > 0}
              onClick={() => void activate()}
            >
              {ui(
                working
                  ? "Saving…"
                  : adoption
                    ? "Apply reviewed changes"
                    : "Accept and activate",
              )}
            </button>
          ) : (
            <button
              type="button"
              className="sop-primary"
              disabled={
                busy ||
                !hasScope ||
                !managerId ||
                !w.timeZone ||
                inactive.length > 0
              }
              onClick={() => void review()}
            >
              {ui(working ? "Reviewing…" : "Review adoption")}
            </button>
          )}
        </div>
      </div>
    </AccessibleDialog>
  );
}
