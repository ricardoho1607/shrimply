const { ORSON_ACTIONS } = require("./orsonAgentContract");
const { fail } = require("./orsonActionAuth");

const values = [
  ...new Set(Object.values(ORSON_ACTIONS).flatMap((action) => action.fields)),
];

const extractionSchema = {
  type: "OBJECT",
  properties: {
    error: { type: "STRING" },
    commands: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          type: { type: "STRING", enum: Object.keys(ORSON_ACTIONS) },
          date: { type: "STRING" },
          pondId: { type: "STRING" },
          itemId: { type: "STRING" },
          itemType: { type: "STRING", enum: ["feed", "additive"] },
          recordId: { type: "STRING" },
          values: {
            type: "OBJECT",
            properties: {
              ...Object.fromEntries(values.map((key) => [key, { type: "STRING" }])),
              waterDepthUnit: {
                type: "STRING",
                enum: ["cm", "m", "ft", "in", "unknown"],
                description: "Source unit for measured depth; never infer when missing.",
              },
              nitriteUnit: {
                type: "STRING",
                enum: ["mg/L", "ppm", "µg/L", "unknown"],
                description: "Source concentration unit; only mg/L can be saved as nitriteMgL.",
              },
            },
          },
          allocations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                inventoryFeedId: { type: "STRING" },
                quantityKg: { type: "NUMBER" },
              },
              required: ["inventoryFeedId", "quantityKg"],
            },
          },
        },
        required: ["id", "type", "date", "values"],
      },
    },
  },
};

function parseCsv(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n")) {
      row.push(value);
      value = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else if (c !== "\r" || quoted) value += c;
  }
  if (quoted) fail("CSV has an unclosed quoted field.");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  if (rows.length > 201) fail("Upload at most 200 CSV rows.");
  return rows;
}

/**
 * Normalizes scum observations:
 * - Explicit "no scum", "none", etc. maps to false
 * - Explicit presence maps to true
 * - Silence (null, undefined, "", "-", n/a) returns undefined (omitted)
 */
function normalizeScumObservation(rawScum) {
  if (rawScum === null || rawScum === undefined) return undefined;
  if (typeof rawScum === "boolean") return rawScum;
  if (typeof rawScum === "number") {
    if (rawScum === 0) return false;
    if (rawScum === 1) return true;
    return undefined;
  }
  if (typeof rawScum !== "string") return undefined;
  const s = rawScum.trim().toLowerCase();
  if (s === "" || s === "-" || s === "n/a" || s === "na" || s === "null" || s === "undefined") {
    return undefined;
  }

  // Explicit absence of scum
  if (
    [
      "no scum",
      "no surface scum",
      "none",
      "no",
      "false",
      "0",
      "nil",
      "negative",
      "neg",
      "clean",
      "clear",
      "tidak ada buih",
      "tidak ada scum",
      "nihil",
      "tidak ada",
      "tiada",
      "không có váng",
      "không",
      "ไม่มีคราบ",
      "无浮膜",
      "无",
    ].includes(s) ||
    /\b(?:no surface scum|no scum|negative scum|zero scum|free of scum)\b/i.test(s) ||
    /^(?:no|none|zero|clean|clear|nil|neg|negative)\b/i.test(s)
  ) {
    return false;
  }

  // Explicit presence of scum
  if (
    [
      "scum",
      "surface scum",
      "observed",
      "yes",
      "true",
      "1",
      "present",
      "positive",
      "pos",
      "ada scum",
      "ada buih",
      "ada",
      "có váng",
      "có",
      "มีคราบ",
      "有浮膜",
      "有",
    ].includes(s) ||
    /\b(?:scum observed|surface scum observed|scum present|heavy scum|light scum)\b/i.test(s)
  ) {
    return true;
  }

  return undefined;
}

/**
 * Converts water depth to centimetres deterministically:
 * - Metres (e.g. 1.2 m, 1.2m, 1.20 meters) -> Math.round(val * 100)
 * - Centimetres (e.g. 120 cm, 120cm) -> Math.round(val)
 * - Bare values require an explicit unit from the field or caller.
 * - Unsupported units (e.g. ft, in, yards, fathoms) return null
 */
function normalizeDepthUnit(rawUnit) {
  if (typeof rawUnit !== "string") return null;
  const unit = rawUnit.trim().toLowerCase();
  if (["m", "meter", "meters", "metre", "metres"].includes(unit)) return "m";
  if (["cm", "centimeter", "centimeters", "centimetre", "centimetres"].includes(unit)) return "cm";
  return null;
}

function hasExplicitDepthUnit(rawDepth) {
  if (typeof rawDepth !== "string") return false;
  return /^[0-9]+(?:\.[0-9]+)?\s*(?:m|meter|meters|metre|metres|cm|centimeter|centimeters|centimetre|centimetres)$/i.test(rawDepth.trim());
}

function normalizeDepthToCm(rawDepth, defaultUnit = null) {
  if (rawDepth === null || rawDepth === undefined) return null;
  if (typeof rawDepth === "number") {
    if (!Number.isFinite(rawDepth) || rawDepth <= 0) return null;
    if (defaultUnit === "m") return Math.round(rawDepth * 100);
    if (defaultUnit === "cm") return Math.round(rawDepth);
    return null;
  }
  if (typeof rawDepth !== "string") return null;
  const s = rawDepth.trim().toLowerCase();
  if (s === "" || s === "-" || s === "n/a") return null;

  // Unsupported units: ft, feet, in, inch, inches, yd, yards, fathoms
  if (/\b(?:ft|feet|foot|in|inch|inches|yd|yards|fathom|fathoms)\b/i.test(s) || /['"]/.test(s)) {
    return null;
  }

  // Explicit meters: e.g. "1.2 m", "1.2m", "1.2 meters", "1.2 meter", "1.20 m"
  const mMatch = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:m|meter|meters|metre|metres)$/i);
  if (mMatch) {
    if (defaultUnit && defaultUnit !== "m") return null;
    const val = Number(mMatch[1]);
    return Number.isFinite(val) && val > 0 ? Math.round(val * 100) : null;
  }

  // Explicit centimetres: e.g. "120 cm", "120cm", "120 centimeters"
  const cmMatch = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:cm|centimeter|centimeters|centimetre|centimetres)$/i);
  if (cmMatch) {
    if (defaultUnit && defaultUnit !== "cm") return null;
    const val = Number(cmMatch[1]);
    return Number.isFinite(val) && val > 0 ? Math.round(val) : null;
  }

  // Plain number without explicit unit
  const numMatch = s.match(/^([0-9]+(?:\.[0-9]+)?)$/);
  if (numMatch) {
    const val = Number(numMatch[1]);
    if (!Number.isFinite(val) || val <= 0) return null;
    if (defaultUnit === "m") return Math.round(val * 100);
    if (defaultUnit === "cm") return Math.round(val);
    return null;
  }

  return null;
}

function unresolvedMeasurement(rawValue, declaredUnit, explicitlyUnitized) {
  const rawText = typeof rawValue === "string" ? rawValue.trim() : String(rawValue);
  if (/\s*(?:ft|feet|foot|in|inch|inches|yd|yards|fathom|fathoms)$/i.test(rawText)) {
    return `${rawText} (unsupported unit)`;
  }
  if (declaredUnit && !normalizeDepthUnit(declaredUnit)) {
    const hasSuffix = /(?:[a-zµ°/'"]+)\s*$/i.test(rawText);
    return `${hasSuffix ? rawText : `${rawText} ${declaredUnit}`} (unsupported unit)`;
  }
  if (explicitlyUnitized && declaredUnit) {
    const normalizedDeclared = normalizeDepthUnit(declaredUnit);
    const rawUnit = rawText.match(/\s*(cm|centimeters?|centimetres?|m|meters?|metres?)$/i)?.[1];
    if (normalizedDeclared && rawUnit && normalizeDepthUnit(rawUnit) !== normalizedDeclared) {
      return `${rawText} (conflicts with ${declaredUnit})`;
    }
    return rawText;
  }
  if (declaredUnit) {
    const hasSuffix = /(?:[a-zµ°/'"]+)\s*$/i.test(rawText);
    return hasSuffix ? rawText : `${rawText} ${declaredUnit}`;
  }
  if (/(?:[a-zµ°/'"]+)\s*$/i.test(rawText)) return rawText;
  return `${rawText} (unit required)`;
}

/**
 * Resolves depth to session-specific centimetres:
 * - waterDepthCmMorning
 * - waterDepthCmEvening
 */
function resolveSessionDepth(values, sessionHint = null, options = {}) {
  const result = {};
  const declaredUnit = normalizeDepthUnit(values.waterDepthUnit);
  const unitText = typeof values.waterDepthUnit === "string" ? values.waterDepthUnit.trim() : "";
  const normalizeSessionValue = (raw, canonicalCmField = false) => {
    const explicitUnit = hasExplicitDepthUnit(raw);
    const unit = declaredUnit || (canonicalCmField && !explicitUnit ? "cm" : null);
    const invalidDeclaredUnit = Boolean(unitText) && !declaredUnit;
    const unitIsKnown = !invalidDeclaredUnit && (explicitUnit || Boolean(declaredUnit) || (canonicalCmField && !options.requireExplicitDepthUnit));
    const cm = normalizeDepthToCm(raw, unit);
    if (cm !== null && unitIsKnown) return cm;
    return unresolvedMeasurement(raw, unitText, explicitUnit);
  };

  const rawMorning =
    values.waterDepthCmMorning ??
    values.morningDepth ??
    values.depthMorning ??
    values.waterDepthMorning ??
    values.depthAm ??
    values.amDepth;
  if (rawMorning !== undefined && rawMorning !== null) {
    result.waterDepthCmMorning = normalizeSessionValue(
      rawMorning,
      Object.hasOwn(values, "waterDepthCmMorning"),
    );
  }

  const rawEvening =
    values.waterDepthCmEvening ??
    values.eveningDepth ??
    values.depthEvening ??
    values.waterDepthEvening ??
    values.depthPm ??
    values.pmDepth;
  if (rawEvening !== undefined && rawEvening !== null) {
    result.waterDepthCmEvening = normalizeSessionValue(
      rawEvening,
      Object.hasOwn(values, "waterDepthCmEvening"),
    );
  }

  const rawGeneric = values.waterDepthCm ?? values.waterDepth ?? values.depth;
  if (
    rawGeneric !== undefined &&
    rawGeneric !== null &&
    result.waterDepthCmMorning === undefined &&
    result.waterDepthCmEvening === undefined
  ) {
    const depth = normalizeSessionValue(
      rawGeneric,
      Object.hasOwn(values, "waterDepthCm"),
    );
    const isEvening =
      sessionHint === "evening" ||
      ((values.doEvening !== undefined ||
        values.phEvening !== undefined ||
        values.temperatureEvening !== undefined) &&
        values.doMorning === undefined &&
        values.phMorning === undefined &&
        values.temperatureMorning === undefined);
    if (isEvening) {
      result.waterDepthCmEvening = depth;
    } else {
      result.waterDepthCmMorning = depth;
    }
  }

  return result;
}

/**
 * Validates and normalizes nitrite:
 * - ONLY explicit NO2 is accepted.
 * - Ambiguous, missing, or NO2-N basis is unresolved and returns {} (do not draft writes).
 * - Only mg/L can be stored as nitriteMgL; unsupported units return {}.
 */
function normalizeNitrite(values, { requireExplicitUnit = false } = {}) {
  const rawNitrite = values.nitriteMgL ?? values.nitrite ?? values.no2;
  const rawBasis = values.nitriteBasis ?? values.nitrogenBasis ?? values.basis;
  const rawUnit = values.nitriteUnit ?? values.unit;

  if (rawNitrite === undefined || rawNitrite === null || rawNitrite === "") {
    return {};
  }

  const valueMatch = typeof rawNitrite === "string"
    ? rawNitrite.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(mg\/l|ppm|µg\/l|ug\/l)?$/i)
    : null;
  if (typeof rawNitrite === "string" && !valueMatch) return {};
  const valueUnit = valueMatch?.[2]?.toLowerCase();
  const declaredUnit = typeof rawUnit === "string" ? rawUnit.trim().toLowerCase() : "";
  if (declaredUnit && declaredUnit !== "mg/l") return {};
  if (valueUnit && valueUnit !== "mg/l") return {};
  if (declaredUnit && valueUnit && declaredUnit !== valueUnit) return {};
  if (requireExplicitUnit && !(declaredUnit || valueUnit)) return {};

  if (rawBasis === undefined || rawBasis === null) {
    return {}; // ambiguous/unspecified basis
  }
  const basisStr = String(rawBasis).trim();
  if (basisStr !== "NO2") {
    return {}; // NO2-N or non-NO2 basis
  }

  const num = Number(valueMatch ? valueMatch[1] : rawNitrite);
  if (!Number.isFinite(num) || num < 0) {
    return {};
  }

  return {
    nitriteMgL: num,
    nitriteBasis: "NO2",
  };
}

/**
 * Identifies embedded advice, instructions, SOP rules, hypotheticals,
 * projections, or prompt injections.
 * These never gain write authority.
 */
function isAdviceInstructionOrHypothetical(entry) {
  if (!entry) return false;

  if (typeof entry === "string") {
    const text = entry.trim();
    if (!text) return false;

    // Advice / recommendations
    if (
      /\b(?:recommend(?:ed|ation|s)?|advise[ds]?|advice|suggest(?:ed|ion|s)?)\b/i.test(text)
    ) {
      return true;
    }

    // SOP rules / instructions / procedures
    if (
      /\b(?:instruction[s]?|sop\b|guideline[s]?|protocol|procedure|manual says|sop says|rule says|instructions? from)\b/i.test(text)
    ) {
      return true;
    }

    // Hypotheticals / what-if / projections / simulations
    if (
      /\b(?:hypothetical(?:ly)?|suppose[ds]?|supposing|imagine|what if|scenario|simulation|simulate|projection|projected)\b/i.test(text) ||
      /^(?:what if|suppose|imagine|jika|seandainya|misal|misalkan)\b/i.test(text)
    ) {
      return true;
    }

    // Target values
    if (/\btarget\s*(?:do|ph|mbw|feed|alkalinity|nitrite|temp)?\s*[:=><]/i.test(text)) {
      return true;
    }

    // Conditional action instructions (e.g. "apply 25 kg lime if pH drops", "feed 60 kg if trays clean")
    if (
      /\b(?:if\s+.*(?:apply|feed|harvest|record|change|reduce|increase|dose)|(?:apply|feed|harvest|record|change|reduce|increase|dose)\s+.*if\s+)\b/i.test(text)
    ) {
      return true;
    }

    // Prompt injections disguised as instructions
    if (
      /\b(?:ignore\s+(?:all\s+)?(?:previous\s+)?instructions|system\s+prompt|developer\s+mode|as an ai)\b/i.test(text)
    ) {
      return true;
    }

    return false;
  }

  if (typeof entry === "object") {
    if (entry.isHypothetical === true || entry.isAdvice === true || entry.isInstruction === true) {
      return true;
    }
    if (["advice", "instruction", "hypothetical", "projection", "recommendation"].includes(entry.source)) {
      return true;
    }
    if (["advice", "instruction", "hypothetical", "recommendation"].includes(entry.type)) {
      return true;
    }

    const textFieldsToCheck = [
      entry.notes,
      entry.operationalNotes,
      entry.description,
      entry.text,
      entry.instruction,
      entry.advice,
      entry.title,
      entry.item,
      entry.itemName,
    ];
    if (entry.values && typeof entry.values === "object") {
      textFieldsToCheck.push(
        entry.values.notes,
        entry.values.operationalNotes,
        entry.values.item,
        entry.values.itemName,
      );
    }
    for (const val of textFieldsToCheck) {
      if (typeof val === "string" && isAdviceInstructionOrHypothetical(val)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalizes extracted observation values:
 * - Scum: explicit absence maps to false, presence to true, silence stays omitted
 * - Depth: converts deterministically to session-specific cm; unsupported units omitted
 * - Nitrite: explicit NO2 accepted; NO2-N/ambiguous omitted
 * - Enums and valid ranges normalized
 */
function normalizeObservationValues(rawValues, sessionHint = null, options = {}) {
  if (!rawValues || typeof rawValues !== "object") return {};
  const result = {};

  // 1. Scum observation
  const rawScumKey = Object.keys(rawValues).find(
    (k) => k === "surfaceScum" || k === "scum" || k === "surface_scum"
  );
  if (rawScumKey && rawValues[rawScumKey] !== undefined) {
    const scumVal = normalizeScumObservation(rawValues[rawScumKey]);
    if (typeof scumVal === "boolean") {
      result.surfaceScum = scumVal;
    }
  }

  // 2. Depth conversion to session-specific centimetres
  const depthSession = resolveSessionDepth(rawValues, sessionHint, options);
  Object.assign(result, depthSession);

  // 3. Nitrite basis & unit validation
  const nitriteNormalized = normalizeNitrite(rawValues, {
    requireExplicitUnit: options.requireExplicitNitriteUnit === true,
  });
  Object.assign(result, nitriteNormalized);
  const rawNitrite = rawValues.nitriteMgL ?? rawValues.nitrite ?? rawValues.no2;
  if (
    Object.keys(nitriteNormalized).length === 0 &&
    rawNitrite !== undefined &&
    rawNitrite !== null &&
    rawNitrite !== ""
  ) {
    const rawUnit = rawValues.nitriteUnit ?? rawValues.unit;
    const rawBasis = rawValues.nitriteBasis ?? rawValues.nitrogenBasis ?? rawValues.basis;
    const rawText = String(rawNitrite).trim();
    const unitText = typeof rawUnit === "string" ? rawUnit.trim() : "";
    const valueHasUnit = /(?:mg\/l|ppm|µg\/l|ug\/l)\s*$/i.test(rawText);
    const unitConflict = valueHasUnit && unitText && rawText.match(/(?:mg\/l|ppm|µg\/l|ug\/l)\s*$/i)?.[0].trim().toLowerCase() !== unitText.toLowerCase();
    result.nitriteMgL = unitConflict
      ? `${rawText} (conflicts with ${unitText})`
      : valueHasUnit || !unitText
        ? `${rawText}${options.requireExplicitNitriteUnit && !valueHasUnit && !unitText ? " (unit required)" : ""}`
        : `${rawText} ${unitText}`;
    if (rawBasis !== undefined && rawBasis !== null && rawBasis !== "") {
      result.nitriteBasis = rawBasis;
    }
  }

  // 4. Other water quality fields
  for (const [key, raw] of Object.entries(rawValues)) {
    if (
      [
        "surfaceScum", "scum", "surface_scum",
        "waterDepth", "depth", "waterDepthCm", "waterDepthCmMorning", "waterDepthCmEvening",
        "morningDepth", "eveningDepth", "depthMorning", "depthEvening", "waterDepthMorning", "waterDepthEvening",
        "nitriteMgL", "nitrite", "no2", "nitriteBasis", "nitrogenBasis", "nitriteUnit", "waterDepthUnit", "unit",
      ].includes(key)
    ) {
      continue;
    }
    if (raw === null || raw === undefined || raw === "") continue;
    if (typeof raw === "string" && raw.trim() === "") continue;

    // Check unsupported temperature units (e.g. °F)
    if (key.startsWith("temperature") && typeof raw === "string" && /[°]?f\b/i.test(raw)) {
      continue;
    }

    if (key === "weatherEvent") {
      const s = String(raw).trim().toLowerCase();
      if (["rain", "heavy_rain", "sudden_cloud"].includes(s)) {
        result.weatherEvent = s;
      }
      continue;
    }
    if (key === "sludgeLoad") {
      const s = String(raw).trim().toLowerCase();
      if (["low", "moderate", "high"].includes(s)) {
        result.sludgeLoad = s;
      }
      continue;
    }
    if (key === "shrimpBehaviour") {
      const s = String(raw).trim().toLowerCase();
      if (["normal", "abnormal"].includes(s)) {
        result.shrimpBehaviour = s;
      }
      continue;
    }

    if (key === "operationalNotes" || key === "notes") {
      if (typeof raw === "string" && !isAdviceInstructionOrHypothetical(raw)) {
        result.operationalNotes = raw.trim();
      }
      continue;
    }

    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) continue;

    if (key.startsWith("ph") && (num < 0 || num > 14)) continue;
    if (key === "waterExchangePercent" && (num < 0 || num > 100)) continue;

    result[key] = num;
  }

  return result;
}

/**
 * Sanitizes and normalizes extracted commands:
 * - Drops any command that is advice, instruction, or hypothetical
 * - Normalizes observation values on upsert_water_quality commands
 * - Omits commands that have no valid values remaining (e.g. due to unsupported units)
 */
function normalizeExtractedCommands(commands, options = {}) {
  if (!Array.isArray(commands)) return [];
  const result = [];

  for (const cmd of commands) {
    if (!cmd || typeof cmd !== "object") continue;

    if (isAdviceInstructionOrHypothetical(cmd)) {
      continue;
    }

    const command = { ...cmd };
    if (command.values && typeof command.values === "object") {
      if (command.type === "upsert_water_quality") {
        command.values = normalizeObservationValues(command.values, options.session, options);
      } else {
        const cleanedValues = {};
        for (const [k, v] of Object.entries(command.values)) {
          if (v === null || v === undefined || v === "") continue;
          if (typeof v === "string" && v.trim() === "") continue;
          if (typeof v === "string" && isAdviceInstructionOrHypothetical(v)) continue;
          const feedingResponse = command.type === "record_feeding" && k === "feedingResponse" && typeof v === "string"
            ? v.trim().toLowerCase() : null;
          cleanedValues[k] = ["strong", "normal", "weak"].includes(feedingResponse) ? feedingResponse : v;
        }
        command.values = cleanedValues;
      }
    }

    const hasValues = command.values && Object.keys(command.values).length > 0;
    const hasAllocations = Array.isArray(command.allocations) && command.allocations.length > 0;
    const isSpecialWithoutValues = ["delete_inventory_item", "void_inventory_purchase"].includes(command.type);

    if (hasValues || hasAllocations || isSpecialWithoutValues) {
      result.push(command);
    }
  }

  return result;
}

module.exports = {
  extractionSchema,
  parseCsv,
  normalizeScumObservation,
  normalizeDepthToCm,
  resolveSessionDepth,
  normalizeNitrite,
  isAdviceInstructionOrHypothetical,
  normalizeObservationValues,
  normalizeExtractedCommands,
};
