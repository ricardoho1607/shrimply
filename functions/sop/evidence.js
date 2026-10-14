"use strict";
const { createHash } = require("node:crypto");
const { SOP_FIELDS } = require("../shared/orsonDomain/sop/registry");
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 40);
const numeric = require("../shared/orsonDomain/sop/engine").finiteSopNumber;
const instant = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : (value?.toMillis?.() ??
      (value && /T/.test(String(value)) && Number.isFinite(Date.parse(value))
        ? Date.parse(value)
        : null));
function projectEvidence(kind, id, data, receivedAt) {
  if (!data) return [];
  const entries = [];
  function add(field, value, record, targetId, pondId = "", cycleId = "") {
    if (value === undefined || value === null || value === "") return;
    const f = SOP_FIELDS.find((f) => f.key === field);
    if (!f) return;
    const observedAt = instant(
      record.observedAtByField?.[field.split(".").pop()] ?? record.observedAt,
    );
    const item = {
      sourcePath: `${kind}/${id}`,
      targetId,
      pondId,
      cycleId,
      field,
      value: typeof value === "object" ? JSON.stringify(value) : value,
      unit: record.unit ?? f.unit,
      basis:
        record.ammoniaBasis && field === "water.ammonia"
          ? record.ammoniaBasis
          : record.nitriteBasis && field === "water.nitriteMgL"
            ? record.nitriteBasis
            : record.basis || "",
      observedAt,
      date: record.date || record.sampleDate || "",
      precision: observedAt === null ? "date" : "instant",
      receivedAt,
      deleted: false,
      estimated:
        record.isBaselineEstimate === true ||
        record.source === "midcycle_onboarding",
    };
    const evidenceId = hash([
      kind,
      id,
      record.id || record.date || "",
      field,
      targetId,
    ]);
    entries.push({
      ...item,
      id: evidenceId,
      revision: hash({ ...item, receivedAt: undefined }),
    });
  }
  if (kind === "ponds") {
    const target = data.physicalPondId || data.previousCyclePondId || id,
      cycle = data.pondCycleId || data.cycleId || id;
    for (const r of data.samplings || []) {
      for (const f of SOP_FIELDS.filter((f) => f.key.startsWith("water.")))
        if (!r.observationIdsByField?.[f.key.slice(6)])
          add(f.key, r[f.key.split(".").pop()], r, target, id, cycle);
      if (numeric(r.mbw) > 0) add("sampling.mbw", r.mbw, r, target, id, cycle);
      if (
        numeric(r.mbw) > 0 &&
        (r.feedRecordStatus === "measured" || numeric(r.feed) > 0)
      )
        add("sampling.feed", r.feed, r, target, id, cycle);
      add(
        "feeding.totalDailyFeed",
        r.feedData?.totalDailyFeed,
        { ...r, observedAt: null, observedAtByField: {} },
        target,
        id,
        cycle,
      );
    }
    for (const r of data.mortalityRecords || [])
      add("mortality.count", r.count, r, target, id, cycle);
    add(
      "lifecycle.status",
      data.cycleStatus || "active",
      {
        ...data,
        date:
          (typeof data.cycleStartedAt === "string"
            ? data.cycleStartedAt.slice(0, 10)
            : "") || data.docStart,
      },
      target,
      id,
      cycle,
    );
  }
  if (kind === "waterObservations" && !data.deleted)
    add(
      `water.${data.field}`,
      data.value,
      { ...data, id, observedAt: data.observedAt },
      data.physicalPondId || data.pondId,
      data.pondId,
      data.cycleId,
    );
  if (kind === "labReports" && data.status === "confirmed")
    for (const row of data.pondResults || []) {
      const record = { ...row, id: row.pondId, date: data.sampleDate };
      add(
        "lab.status",
        row.status || row.summary?.status,
        record,
        row.physicalPondId || row.pondId,
        row.pondId,
        row.pondCycleId || row.cycleId || "",
      );
      for (const f of SOP_FIELDS.filter(
        (f) => f.key.startsWith("lab.") && f.key !== "lab.status",
      )) {
        const key = f.key.split(".").pop();
        add(
          f.key,
          row.waterQuality?.[key],
          {
            ...record,
            unit: row.measurementUnits?.[key]?.unit || "",
            basis: row.measurementUnits?.[key]?.basis || "",
          },
          row.physicalPondId || row.pondId,
          row.pondId,
          row.pondCycleId || row.cycleId || "",
        );
      }
    }
  if (["feeds", "additives"].includes(kind)) {
    add(
      "inventory.totalStock",
      data.totalStock,
      {
        ...data,
        date:
          data.lastUpdatedDate ||
          (instant(data.lastUpdatedAt || data.lastUpdated || data.updatedAt) ===
          null
            ? ""
            : new Date(
                instant(
                  data.lastUpdatedAt || data.lastUpdated || data.updatedAt,
                ),
              )
                .toISOString()
                .slice(0, 10)),
        observedAt:
          data.lastUpdatedAt || data.lastUpdated || data.updatedAt || null,
        unit: data.unit || "",
      },
      data.blockId || "company",
    );
    if (kind === "additives")
      for (const r of data.usageHistory || [])
        if (r.pondId)
          add(
            "treatment.quantity",
            r.quantity,
            { ...r, unit: r.unit || data.unit || "" },
            r.physicalPondId || r.pondId,
            r.pondId,
            r.pondCycleId || r.cycleId || "",
          );
  }
  if (kind === "harvestRecords")
    for (const r of data.ponds || [])
      add(
        "harvest.biomass",
        r.biomass,
        { ...r, date: data.date },
        r.physicalPondId || r.pondId,
        r.pondId,
        r.pondCycleId || r.cycleId || "",
      );
  if (kind === "assets")
    for (const r of data.maintenanceHistory || [])
      add(
        "equipment.maintenance",
        r.description || r.notes || r.type,
        { ...r, date: r.date || r.maintenanceDate },
        data.blockId || "company",
      );
  return entries;
}
module.exports = { hash, numeric, instant, projectEvidence };
