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
import { useLanguage } from "@/contexts/LanguageContext";
import styles from "./AgentCards.module.css";

export const OBSERVATION_LABELS_EN: Record<string, string> = {
  doMorning: "Morning dissolved oxygen (mg/L)",
  doEvening: "Evening dissolved oxygen (mg/L)",
  phMorning: "Morning pH",
  phEvening: "Evening pH",
  temperatureMorning: "Morning temperature (°C)",
  temperatureEvening: "Evening temperature (°C)",
  transparencyMorning: "Morning transparency (cm)",
  transparencyEvening: "Evening transparency (cm)",
  waterDepthCmMorning: "Morning water depth (cm)",
  waterDepthCmEvening: "Evening water depth (cm)",
  salinity: "Salinity (ppt)",
  alkalinity: "Alkalinity (mg/L)",
  ammonia: "Ammonia (mg/L)",
  nitriteMgL: "Nitrite (mg/L NO₂)",
  nitriteBasis: "Nitrite basis",
  weatherEvent: "Weather event",
  waterExchangePercent: "Water exchange (%)",
  sludgeLoad: "Sludge load",
  surfaceScum: "Surface scum",
  shrimpBehaviour: "Shrimp behaviour",
  operationalNotes: "Operational notes",
  pondName: "Pond name",
  pondArea: "Pond area (m²)",
  supplier: "PL supplier",
  mbw: "Mean body weight (g)",
  feed: "Sampling feed observation (kg)",
  count: "Mortality count",
  density: "Stocking density (shrimp/m²)",
  initialWeight: "Initial weight (g)",
  price: "Unit price",
  size: "Shrimp size (count/kg)",
  biomass: "Harvest weight (kg)",
  subBiomass: "Secondary harvest weight (kg)",
  subSize: "Secondary size (count/kg)",
  subPrice: "Secondary unit price",
  feedingResponse: "Observed feeding response",
  observationType: "Mortality observation type",
  cycleEndReason: "Reason for closing",
  cycleName: "New production cycle name",
  cycleId: "Existing production cycle",
  item: "Description",
  reorderLevel: "Reorder level",
};

export const OBSERVATION_LABELS_ID: Record<string, string> = {
  doMorning: "Oksigen terlarut pagi (mg/L)",
  doEvening: "Oksigen terlarut sore (mg/L)",
  phMorning: "pH pagi",
  phEvening: "pH sore",
  temperatureMorning: "Suhu pagi (°C)",
  temperatureEvening: "Suhu sore (°C)",
  transparencyMorning: "Kecerahan pagi (cm)",
  transparencyEvening: "Kecerahan sore (cm)",
  waterDepthCmMorning: "Kedalaman air pagi (cm)",
  waterDepthCmEvening: "Kedalaman air sore (cm)",
  salinity: "Salinitas (ppt)",
  alkalinity: "Alkalinitas (mg/L)",
  ammonia: "Amoniak (mg/L)",
  nitriteMgL: "Nitrit (mg/L NO₂)",
  nitriteBasis: "Basis nitrit",
  weatherEvent: "Kondisi cuaca",
  waterExchangePercent: "Pergantian air (%)",
  sludgeLoad: "Beban lumpur",
  surfaceScum: "Busa permukaan",
  shrimpBehaviour: "Perilaku udang",
  operationalNotes: "Catatan operasional",
  pondName: "Nama kolam",
  pondArea: "Luas kolam (m²)",
  supplier: "Pemasok benur",
  mbw: "Bobot rata-rata / MBW (g)",
  feed: "Pengamatan pakan sampling (kg)",
  count: "Jumlah kematian",
  density: "Padat tebar (ekor/m²)",
  initialWeight: "Bobot awal (g)",
  price: "Harga satuan",
  size: "Ukuran udang (ekor/kg)",
  biomass: "Biomassa panen (kg)",
  subBiomass: "Biomassa panen sekunder (kg)",
  subSize: "Ukuran sekunder (ekor/kg)",
  subPrice: "Harga satuan sekunder",
  feedingResponse: "Respons pakan",
  observationType: "Tipe pengamatan kematian",
  cycleEndReason: "Alasan penutupan",
  cycleName: "Nama siklus produksi baru",
  cycleId: "Siklus produksi yang ada",
  item: "Deskripsi",
  reorderLevel: "Batas pemesanan ulang",
};

export const OBSERVATION_OPTIONS: Record<string, { id: string; name: string }[]> = {
  surfaceScum: [
    { id: "false", name: "No" },
    { id: "true", name: "Yes" },
  ],
  weatherEvent: [
    { id: "rain", name: "Rain" },
    { id: "heavy_rain", name: "Heavy rain" },
    { id: "sudden_cloud", name: "Sudden cloud" },
  ],
  sludgeLoad: [
    { id: "low", name: "Low" },
    { id: "moderate", name: "Moderate" },
    { id: "high", name: "High" },
  ],
  shrimpBehaviour: [
    { id: "normal", name: "Normal" },
    { id: "abnormal", name: "Abnormal" },
  ],
  nitriteBasis: [
    { id: "NO2", name: "NO₂" },
  ],
};

export const OBSERVATION_OPTIONS_ID: Record<string, { id: string; name: string }[]> = {
  surfaceScum: [
    { id: "false", name: "Tidak" },
    { id: "true", name: "Ya" },
  ],
  weatherEvent: [
    { id: "rain", name: "Hujan" },
    { id: "heavy_rain", name: "Hujan lebat" },
    { id: "sudden_cloud", name: "Mendung tiba-tiba" },
  ],
  sludgeLoad: [
    { id: "low", name: "Rendah" },
    { id: "moderate", name: "Sedang" },
    { id: "high", name: "Tinggi" },
  ],
  shrimpBehaviour: [
    { id: "normal", name: "Normal" },
    { id: "abnormal", name: "Abnormal" },
  ],
  nitriteBasis: [
    { id: "NO2", name: "NO₂" },
  ],
};

export function getFieldLabel(field: string, lang = "en"): string {
  const dict = lang === "id" ? OBSERVATION_LABELS_ID : OBSERVATION_LABELS_EN;
  return dict[field] || OBSERVATION_LABELS_EN[field] || agentFieldLabel(field);
}

export function getFieldOptions(field: string, lang = "en"): { id: string; name: string }[] | undefined {
  const dict = lang === "id" ? OBSERVATION_OPTIONS_ID : OBSERVATION_OPTIONS;
  return dict[field] || OBSERVATION_OPTIONS[field] || agentFieldOptions[field];
}

export function formatObservationValue(field: string, val: unknown, lang = "en"): string {
  const isId = lang === "id";
  if (field === "surfaceScum" || typeof val === "boolean") {
    if (val === true || val === "true") return isId ? "Ya" : "Yes";
    if (val === false || val === "false") return isId ? "Tidak" : "No";
    return isId ? "Tidak diketahui" : "Unknown";
  }
  if (val === null || val === undefined || val === "") {
    return isId ? "Tidak diketahui" : "Unknown";
  }
  const opts = getFieldOptions(field, lang);
  if (opts) {
    const match = opts.find((o) => o.id === String(val));
    if (match) return match.name;
  }
  return String(val);
}

function OperationCard({
  operation: op,
  agent,
}: {
  operation: OrsonOperation;
  agent: AgentController;
}) {
  let currentLanguage = "en";
  try {
    const langCtx = useLanguage();
    if (langCtx?.currentLanguage) currentLanguage = langCtx.currentLanguage;
  } catch {
    currentLanguage = "en";
  }
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

  useEffect(() => {
    setCommands(remaining.map((r) => r.command));
    setSelected(remaining.filter((r) => r.valid).map((r) => r.command.id));
    setDirty(false);
  }, [op.revision, op.id, op.receipts]);

  const [checkingStatus, setCheckingStatus] = useState(false);
  const closed = op.state === "completed" || op.state === "discarded";
  const selectedTypes = commands
    .filter((command) => selected.includes(command.id))
    .map((command) => command.type);
  const includesDelete = selectedTypes.includes("delete_inventory_item");
  const includesVoid = selectedTypes.includes("void_inventory_purchase");
  const confirmLabel = `Confirm ${selected.length} selected`;
  const edit = (index: number, patch: Partial<OrsonCommand>) => {
    setCommands((old) =>
      old.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
    setDirty(true);
  };
  const handleFieldChange = (index: number, field: string, value: string) => {
    let parsed: unknown = value;
    if (field === "surfaceScum") {
      parsed = value === "true" ? true : value === "false" ? false : value;
    } else if (
      [
        "waterDepthCmMorning",
        "waterDepthCmEvening",
        "waterExchangePercent",
        "nitriteMgL",
      ].includes(field) &&
      value !== "" &&
      Number.isFinite(Number(value))
    ) {
      parsed = Number(value);
    }
    edit(index, {
      values: {
        ...commands[index].values,
        [field]: parsed as string | number | boolean,
      },
    });
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
            : includesVoid
              ? "Check the purchase and stock details. Voiding is auditable and permanent."
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
              {c.type === "void_inventory_purchase" && (
                <div style={{
                  margin: "8px 0",
                  padding: "10px 12px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "4px" }}>
                    <span style={{
                      backgroundColor: "#ef4444",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      letterSpacing: "0.05em",
                    }}>
                      TO BE REMOVED
                    </span>
                    <strong style={{ color: "#991b1b" }}>Remove from active stock and Finance on confirmation</strong>
                  </div>
                  <p style={{ margin: "2px 0 6px", color: "#4b5563", fontSize: "12px" }}>
                    The purchase and linked expense will remain in audit history as voided records.
                  </p>
                  {typeof row.before?.purchaseId === "string" && (
                    <p style={{ margin: "2px 0", color: "#4b5563", fontSize: "12px" }}>
                      Purchase: {String(row.before.quantity ?? "")} {String(row.before.unit ?? "kg")} @ {String(row.before.price ?? "")} ({String(row.before.date ?? "")})
                    </p>
                  )}
                </div>
              )}
              {agentFields(c).map((field) => {
                const hasPrevious = Object.hasOwn(row.before || {}, field);
                const previous = row.before?.[field];
                const proposed = c.values?.[field];
                const label = getFieldLabel(field, currentLanguage);
                const beforeText = formatObservationValue(field, previous, currentLanguage);
                const afterText = formatObservationValue(field, proposed, currentLanguage);
                return (
                  <p key={field}>
                    {label}: {hasPrevious ? `${beforeText} → ` : ""}{afterText}
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
                {agentFields(c).map((field) => {
                  const options = getFieldOptions(field, currentLanguage);
                  const val = c.values?.[field];
                  const stringVal = typeof val === "boolean" ? String(val) : String(val ?? "");
                  return (
                    <label key={field}>
                      {getFieldLabel(field, currentLanguage)}
                      {options ? (
                        <select
                          value={stringVal}
                          onChange={(e) =>
                            handleFieldChange(index, field, e.target.value)
                          }
                        >
                          <option value="">
                            {currentLanguage === "id"
                              ? "Pilih opsi"
                              : "Choose an option"}
                          </option>
                          {options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={c.values?.[field] ?? ""}
                          onChange={(e) =>
                            handleFieldChange(index, field, e.target.value)
                          }
                        />
                      )}
                    </label>
                  );
                })}
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
            disabled={
              agent.busy ||
              dirty ||
              !selected.length ||
              selected.some(
                (id) => !remaining.find((r) => r.command.id === id)?.valid,
              )
            }
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
