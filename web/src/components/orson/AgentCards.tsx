"use client";
import { useEffect, useState } from "react";
import type { AgentController } from "../../../../orson/useAgentOperations";
import type {
  OrsonCommand,
  OrsonOperation,
} from "../../../../shared/orsonAgentContract";
import {
  agentActivityLabel,
  agentFieldLabel,
  agentFields,
  agentFieldOptions,
} from "../../../../shared/orsonAgentPresentation";
import styles from "./AgentCards.module.css";
function OperationCard({
  operation: op,
  agent,
}: {
  operation: OrsonOperation;
  agent: AgentController;
}) {
  const saved = new Set(
    op.receipts.filter((r) => r.status === "saved").flatMap((r) => r.rowIds),
  );
  const remaining = op.rows.filter((r) => !saved.has(r.command.id));
  const [commands, setCommands] = useState<OrsonCommand[]>(() =>
    remaining.map((r) => r.command),
  );
  const [selected, setSelected] = useState<string[]>(() =>
    remaining.filter((r) => r.valid).map((r) => r.command.id),
  );
  const [dirty, setDirty] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const closed = op.state === "completed" || op.state === "discarded";
  const selectedTypes = commands
    .filter((command) => selected.includes(command.id))
    .map((command) => command.type);
  const includesDelete = selectedTypes.includes("delete_inventory_item");
  const confirmLabel = `Confirm ${selected.length} selected`;
  const edit = (index: number, patch: Partial<OrsonCommand>) => {
    setCommands((old) =>
      old.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
    setDirty(true);
  };
  return (
    <section className={styles.card} aria-label="Orson farm entry">
      <strong>
        {closed
          ? op.state === "completed"
            ? "Saved records"
            : "Draft discarded"
          : "Review farm entries"}
      </strong>
      {!closed && (
        <p>
          {includesDelete
            ? "Check the item and stock details. Deletion is permanent."
            : "Check the target, date, and changes. Selected entries for each pond save together."}
        </p>
      )}
      {op.receipts.map((receipt, i) => (
        <div
          key={i}
          className={
            receipt.status === "failed" ? styles.error : styles.receipt
          }
          role="status"
        >
          <strong>{receipt.status === "saved" ? "Saved" : "Not saved"}</strong>{" "}
          — {receipt.message}
          {receipt.links?.map((link, j) => (
            <a key={j} href={link.web}>
              {link.label}
            </a>
          ))}
        </div>
      ))}
      {!closed &&
        commands.map((c, index) => {
          const row = remaining.find((r) => r.command.id === c.id)!;
          return (
            <fieldset key={c.id} disabled={agent.busy} className={styles.row}>
              <legend>
                {row.title} {row.target && `· ${row.target}`}
              </legend>
              {remaining.filter((item) => item.valid).length > 1 && <label className={styles.check}>
                <input
                  type="checkbox"
                  disabled={!row.valid || dirty}
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected((old) =>
                      e.target.checked
                        ? [...old, c.id]
                        : old.filter((id) => id !== c.id),
                    )
                  }
                />{" "}
                Include this entry
              </label>}
              {row.error && <p className={styles.error}>{row.error}</p>}
              <p>Date: {c.date || "Not set"}</p>
              {agentFields(c).map((field) => {
                const hasPrevious = Object.hasOwn(row.before || {}, field);
                const previous = row.before?.[field];
                const proposed = c.values?.[field];
                return (
                  <p key={field}>
                    {agentFieldLabel(field)}: {hasPrevious ? `${previous === null || previous === undefined ? "Missing" : String(previous)} → ` : ""}{proposed === null || proposed === undefined || proposed === "" ? "Missing" : String(proposed)}
                  </p>
                );
              })}
              {c.type === "record_feeding" && (c.allocations || []).map((allocation, j) => (
                <p key={`${allocation.inventoryFeedId}-${j}`}>
                  Feed: {agent.catalog.feeds.find((feed) => feed.id === allocation.inventoryFeedId)?.name || allocation.inventoryFeedId || "Not selected"} · {allocation.quantityKg} kg/day
                </p>
              ))}
              <details>
                <summary>Edit details</summary>
              <div className={styles.fields}>
                <label>
                  Date
                  <input
                    type="date"
                    value={c.date || ""}
                    onChange={(e) => edit(index, { date: e.target.value })}
                  />
                </label>
                {("pondId" in c ||
                  [
                    "record_sampling",
                    "record_mortality",
                    "record_feeding",
                    "upsert_water_quality",
                    "record_harvest",
                    "apply_pond_treatment",
                    "start_cycle",
                    "end_cycle",
                  ].includes(c.type)) && (
                  <label>
                    Pond
                    <select
                      value={c.pondId || ""}
                      onFocus={() => void agent.loadCatalog()}
                      onChange={(e) => edit(index, { pondId: e.target.value })}
                    >
                      <option value="">Select pond</option>
                      {!agent.catalog.ponds.some((p) => p.id === c.pondId) &&
                        c.pondId && (
                          <option value={c.pondId}>
                            {row.target || c.pondId}
                          </option>
                        )}
                      {agent.catalog.ponds.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.cycleStatus})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {[
                  "stock_in_inventory",
                  "update_inventory_details",
                  "delete_inventory_item",
                  "apply_pond_treatment",
                ].includes(c.type) && (
                  <>
                    <label>
                      Inventory type
                      <select
                        value={c.itemType || ""}
                        onChange={(e) =>
                          edit(index, {
                            itemType: e.target.value as "feed" | "additive",
                            itemId: "",
                          })
                        }
                      >
                        <option value="">Select type</option>
                        <option value="feed">Feed</option>
                        <option value="additive">Additive</option>
                      </select>
                    </label>
                    <label>
                      Inventory item
                      <select
                        value={c.itemId || ""}
                        onFocus={() => void agent.loadCatalog()}
                        onChange={(e) =>
                          edit(index, { itemId: e.target.value })
                        }
                      >
                        <option value="">Select item</option>
                        {c.itemId && (
                          <option value={c.itemId}>
                            {row.target || c.itemId}
                          </option>
                        )}
                        {(c.itemType === "feed"
                          ? agent.catalog.feeds
                          : agent.catalog.additives
                        ).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {agentFields(c).map((field) => (
                  <label key={field}>
                    {agentFieldLabel(field)}
                    {agentFieldOptions[field] ? (
                      <select
                        value={String(c.values?.[field] ?? "")}
                        onChange={(e) =>
                          edit(index, {
                            values: { ...c.values, [field]: e.target.value },
                          })
                        }
                      >
                        <option value="">Choose an option</option>
                        {agentFieldOptions[field].map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={c.values?.[field] ?? ""}
                        onChange={(e) =>
                          edit(index, {
                            values: { ...c.values, [field]: e.target.value },
                          })
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              {c.type === "record_feeding" && (
                <div>
                  {(c.allocations || []).map((allocation, j) => (
                    <div key={j} className={styles.fields}>
                      <label>
                        Feed item
                        <select
                          value={allocation.inventoryFeedId}
                          onFocus={() => void agent.loadCatalog()}
                          onChange={(e) =>
                            edit(index, {
                              allocations: c.allocations!.map((a, k) =>
                                k === j
                                  ? { ...a, inventoryFeedId: e.target.value }
                                  : a,
                              ),
                            })
                          }
                        >
                          <option value="">Select feed</option>
                          <option value={allocation.inventoryFeedId}>
                            {agent.catalog.feeds.find(
                              (f) => f.id === allocation.inventoryFeedId,
                            )?.name || allocation.inventoryFeedId}
                          </option>
                          {agent.catalog.feeds.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Desired daily total (kg)
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={allocation.quantityKg}
                          onChange={(e) =>
                            edit(index, {
                              allocations: c.allocations!.map((a, k) =>
                                k === j
                                  ? { ...a, quantityKg: Number(e.target.value) }
                                  : a,
                              ),
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          edit(index, {
                            allocations: c.allocations!.filter(
                              (_, k) => k !== j,
                            ),
                          })
                        }
                      >
                        Remove feed
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      edit(index, {
                        allocations: [
                          ...(c.allocations || []),
                          { inventoryFeedId: "", quantityKg: 0 },
                        ],
                      })
                    }
                  >
                    Add feed allocation
                  </button>
                </div>
              )}
              </details>
              {row.warnings.map((w) => (
                <p className={styles.warning} key={w}>
                  {w}
                </p>
              ))}
              {row.effects.map((effect) => (
                <p key={effect}>{effect}</p>
              ))}
            </fieldset>
          );
        })}
      {!closed && (
        <div className={styles.actions}>
          {dirty && <button
            type="button"
            disabled={agent.busy || !commands.length}
            onClick={() => void agent.update(op, commands)}
          >
            Refresh review
          </button>}
          <button
            type="button"
            disabled={agent.busy || dirty || !selected.length}
            onClick={() => void agent.confirm(op, selected)}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            disabled={agent.busy}
            onClick={() => void agent.discard(op)}
          >
            Discard
          </button>
          <span>{commands.length - selected.length} not selected</span>
        </div>
      )}
      <details>
        <summary>Save status</summary>
        <button
          type="button"
          disabled={agent.busy || checkingStatus}
          onClick={async () => {
            setCheckingStatus(true);
            try { await agent.recover(op); }
            finally { setCheckingStatus(false); }
          }}
        >
          {checkingStatus ? "Checking…" : "Check now"}
        </button>
        {!!agent.recoveryStatus[op.id] && <p role="status">{agent.recoveryStatus[op.id]}</p>}
      </details>
    </section>
  );
}
export default function AgentCards({ agent, operationIds, showStatus = true }: {
  agent: AgentController;
  operationIds: string[];
  showStatus?: boolean;
}) {
  const { loadCatalog } = agent;
  const operations = agent.operations.filter((op) => operationIds.includes(op.id));
  const draftOperationKey = operations.filter((op) => op.state === "draft" || op.state === "partial").map((op) => op.id).join(":");
  useEffect(() => {
    if (draftOperationKey) void loadCatalog();
  }, [draftOperationKey, loadCatalog]);
  return (
    <div>
      {operations.map((op) => (
        <OperationCard
          key={`${op.id}:${op.revision}:${JSON.stringify(op.receipts)}`}
          operation={op}
          agent={agent}
        />
      ))}
      {showStatus && agent.operationBusy && (
        <p role="status">
          {agentActivityLabel(agent.busyStep)}
          <span className={styles.pulse}>…</span>
          {agent.elapsed >= 10 ? ` (${agent.elapsed}s)` : ""}
        </p>
      )}
      {showStatus && agent.error && (
        <p role="alert" className={styles.error}>
          {agent.error}
        </p>
      )}
    </div>
  );
}
