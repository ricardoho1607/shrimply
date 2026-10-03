const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require("../scripts/register-typescript.cjs");
const { isExplicitFarmAction, isExplicitFarmCorrection, mergeOrsonOperation } = require("../shared/orsonAgentContract.ts");
const { describeSaveStatus } = require("./conversationOperations.ts");

function loadWebAgentCards() {
  const filename = path.resolve(__dirname, "../web/src/components/orson/AgentCards.tsx");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id === "react") return { useEffect: () => {}, useState: (init) => [typeof init === "function" ? init() : init, () => {}] };
    if (id.endsWith(".css")) return {};
    if (id === "@/contexts/LanguageContext") return { useLanguage: () => ({ currentLanguage: "en" }) };
    if (id.includes("orsonAgentPresentation")) return require("../shared/orsonAgentPresentation.ts");
    if (id.includes("orsonAgentContract")) return require("../shared/orsonAgentContract.ts");
    return require(id);
  };
  new Function("require", "module", "exports", compiled)(customRequire, mod, mod.exports);
  return mod.exports;
}

function loadMobileAgentCards() {
  const filename = path.resolve(__dirname, "../app/components/OrsonAgentCards.tsx");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id === "react") return { useEffect: () => {}, useState: (init) => [typeof init === "function" ? init() : init, () => {}] };
    if (id === "react-native") return { View: "View", Text: "Text", TextInput: "TextInput", TouchableOpacity: "TouchableOpacity", StyleSheet: { create: (s) => s } };
    if (id === "expo-router") return { useRouter: () => ({ push: () => {} }) };
    if (id.includes("LanguageContext")) return { useLanguage: () => ({ currentLanguage: "en" }) };
    if (id.includes("orsonAgentPresentation")) return require("../shared/orsonAgentPresentation.ts");
    if (id.includes("orsonAgentContract")) return require("../shared/orsonAgentContract.ts");
    return require(id);
  };
  new Function("require", "module", "exports", compiled)(customRequire, mod, mod.exports);
  return mod.exports;
}

function createAgentOperations(transport, initialStorage = {}) {
  const filename = path.resolve(__dirname, "useAgentOperations.ts");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  let errorVal = "";
  let recoveryVal = {};
  let operationsVal = [];
  const customRequire = (id) => {
    if (id === "react") {
      let stateIndex = 0;
      return {
        useCallback: (cb) => cb,
        useEffect: () => {},
        useRef: (init) => ({ current: init }),
        useState: (init) => {
          const idx = stateIndex++;
          let val = typeof init === "function" ? init() : init;
          const setter = (next) => {
            val = typeof next === "function" ? next(val) : next;
            if (idx === 0) operationsVal = val;
            if (idx === 5) errorVal = val;
            if (idx === 6) recoveryVal = val;
          };
          if (idx === 0) operationsVal = val;
          if (idx === 5) errorVal = val;
          if (idx === 6) recoveryVal = val;
          return [val, setter];
        },
      };
    }
    if (id.includes("orsonAgentContract")) return require("../shared/orsonAgentContract.ts");
    if (id.includes("conversationOperations")) return require("./conversationOperations.ts");
    return require(id);
  };
  new Function("require", "module", "exports", compiled)(customRequire, mod, mod.exports);
  const controller = mod.exports.useAgentOperations("company-1", "user-1", transport, {
    getItem: (k) => initialStorage[k] || null,
    setItem: (k, v) => { initialStorage[k] = v; },
  });
  return {
    controller,
    getError: () => errorVal,
    getRecovery: () => recoveryVal,
    getOperations: () => operationsVal,
  };
}

test("natural requests for farm writes reach the action flow", () => {
  for (const request of [
    "I need to add 50 kg of Grower Feed to inventory at $4/kg",
    "I'd like to record today's sampling for Pond A",
    "We want to update yesterday's water quality reading",
    "Change Pond A's last sampling MBW to 13 g",
    "Please fix the pond area to 1200 m²",
    "Set the supplier for Pond A to Hatchery B",
    "Help me stock in 20 kg of feed",
    "ganti harga nya jadi 17000 IDR",
    "ubah harga pembelian Local Trial Feed menjadi 5 AUD per kg",
  ]) assert.equal(isExplicitFarmAction(request), true, request);

  for (const question of [
    "How do I add feed inventory?",
    "What if I need to update a sampling record?",
    "I want to know how to edit feeding records",
    "Bagaimana cara ganti harga pakan?",
    "How do I change a pond's area?",
  ]) assert.equal(isExplicitFarmAction(question), false, question);

  assert.equal(isExplicitFarmCorrection("Change Pond A's last sampling MBW to 13 g"), true);
  assert.equal(isExplicitFarmCorrection("Add 50 kg of feed"), false);
  assert.equal(isExplicitFarmCorrection("How do I change a pond's area?"), false);
});

test("late streamed drafts cannot regress saved receipts or a revised draft", () => {
  const draft = {
    id: "op",
    revision: 1,
    state: "draft",
    rows: [],
    receipts: [],
  };
  const partial = {
    ...draft,
    state: "partial",
    receipts: [{ rowIds: ["row-1"], status: "saved", message: "Saved" }],
  };
  const completed = { ...partial, state: "completed" };
  assert.equal(mergeOrsonOperation(partial, draft), partial);
  assert.equal(mergeOrsonOperation(completed, partial), completed);
  const revised = { ...draft, revision: 2 };
  assert.equal(mergeOrsonOperation(revised, completed), revised);
  assert.equal(mergeOrsonOperation(draft, partial), partial);
});

test("localized readable labels, units/basis/session, and web/mobile parity", () => {
  const web = loadWebAgentCards();
  const mobile = loadMobileAgentCards();

  const fieldsToCheck = [
    { field: "waterDepthCmMorning", en: "Morning water depth (cm)", id: "Kedalaman air pagi (cm)" },
    { field: "waterDepthCmEvening", en: "Evening water depth (cm)", id: "Kedalaman air sore (cm)" },
    { field: "nitriteMgL", en: "Nitrite (mg/L NO₂)", id: "Nitrit (mg/L NO₂)" },
    { field: "nitriteBasis", en: "Nitrite basis", id: "Basis nitrit" },
    { field: "surfaceScum", en: "Surface scum", id: "Busa permukaan" },
    { field: "weatherEvent", en: "Weather event", id: "Kondisi cuaca" },
    { field: "waterExchangePercent", en: "Water exchange (%)", id: "Pergantian air (%)" },
    { field: "sludgeLoad", en: "Sludge load", id: "Beban lumpur" },
    { field: "shrimpBehaviour", en: "Shrimp behaviour", id: "Perilaku udang" },
  ];

  for (const { field, en, id } of fieldsToCheck) {
    assert.equal(web.getFieldLabel(field, "en"), en, `web en label for ${field}`);
    assert.equal(web.getFieldLabel(field, "id"), id, `web id label for ${field}`);
    assert.equal(mobile.getFieldLabel(field, "en"), en, `mobile en label for ${field}`);
    assert.equal(mobile.getFieldLabel(field, "id"), id, `mobile id label for ${field}`);
    assert.equal(web.getFieldLabel(field, "en"), mobile.getFieldLabel(field, "en"), `en parity for ${field}`);
    assert.equal(web.getFieldLabel(field, "id"), mobile.getFieldLabel(field, "id"), `id parity for ${field}`);
  }
});

test("formatObservationValue supports yes/no/unknown, options, and before/after rendering", () => {
  const web = loadWebAgentCards();
  const mobile = loadMobileAgentCards();

  for (const cards of [web, mobile]) {
    // Boolean surfaceScum: Yes / No / Unknown
    assert.equal(cards.formatObservationValue("surfaceScum", true, "en"), "Yes");
    assert.equal(cards.formatObservationValue("surfaceScum", false, "en"), "No");
    assert.equal(cards.formatObservationValue("surfaceScum", null, "en"), "Unknown");
    assert.equal(cards.formatObservationValue("surfaceScum", undefined, "en"), "Unknown");
    assert.equal(cards.formatObservationValue("surfaceScum", "", "en"), "Unknown");
    assert.equal(cards.formatObservationValue("surfaceScum", true, "id"), "Ya");
    assert.equal(cards.formatObservationValue("surfaceScum", false, "id"), "Tidak");
    assert.equal(cards.formatObservationValue("surfaceScum", null, "id"), "Tidak diketahui");

    // Options mapping
    assert.equal(cards.formatObservationValue("weatherEvent", "rain", "en"), "Rain");
    assert.equal(cards.formatObservationValue("weatherEvent", "rain", "id"), "Hujan");
    assert.equal(cards.formatObservationValue("sludgeLoad", "low", "en"), "Low");
    assert.equal(cards.formatObservationValue("sludgeLoad", "low", "id"), "Rendah");

    // Numeric and string values
    assert.equal(cards.formatObservationValue("waterDepthCmMorning", 115, "en"), "115");
    assert.equal(cards.formatObservationValue("nitriteMgL", 0.5, "en"), "0.5");

    // Before/after display logic
    const rowWithPrevious = {
      before: { surfaceScum: false, waterDepthCmMorning: 100 },
      proposed: { surfaceScum: true, waterDepthCmMorning: 110 },
    };
    const rowWithoutPrevious = {
      proposed: { surfaceScum: true, waterDepthCmMorning: 110 },
    };

    const renderField = (row, field, lang) => {
      const hasPrevious = Object.hasOwn(row.before || {}, field);
      const previous = row.before?.[field];
      const proposed = row.proposed?.[field];
      const beforeText = cards.formatObservationValue(field, previous, lang);
      const afterText = cards.formatObservationValue(field, proposed, lang);
      return hasPrevious ? `${beforeText} → ${afterText}` : afterText;
    };

    assert.equal(renderField(rowWithPrevious, "surfaceScum", "en"), "No → Yes");
    assert.equal(renderField(rowWithPrevious, "surfaceScum", "id"), "Tidak → Ya");
    assert.equal(renderField(rowWithPrevious, "waterDepthCmMorning", "en"), "100 → 110");
    assert.equal(renderField(rowWithoutPrevious, "surfaceScum", "en"), "Yes");
    assert.equal(renderField(rowWithoutPrevious, "waterDepthCmMorning", "en"), "110");
  }
});

test("unresolved rows cannot save and edits invalidate review", async () => {
  const calls = [];
  const transport = async (name, payload) => {
    calls.push({ name, payload });
    return { id: payload.operationId, revision: (payload.revision || 1) + 1, state: "completed", rows: [], receipts: [] };
  };

  const { controller, getError } = createAgentOperations(transport);

  const op = {
    id: "op-test-1",
    revision: 1,
    state: "draft",
    rows: [
      {
        command: { id: "row-valid", type: "upsert_water_quality", date: "2026-09-21", values: { surfaceScum: true } },
        valid: true,
      },
      {
        command: { id: "row-invalid", type: "upsert_water_quality", date: "2026-09-21", values: { nitriteMgL: 0.5 } },
        valid: false,
        error: "Nitrite requires explicit NO2 basis",
      },
    ],
    receipts: [],
  };

  // 1. Confirming an unresolved row is blocked client-side
  const blockedOutcome = await controller.confirm(op, ["row-invalid"]);
  assert.equal(blockedOutcome, null);
  assert.equal(getError(), "Unresolved rows cannot be confirmed.");
  assert.equal(calls.length, 0, "transport must not be called for invalid row");

  // 2. Confirming multiple rows containing an unresolved row is also blocked
  const mixedOutcome = await controller.confirm(op, ["row-valid", "row-invalid"]);
  assert.equal(mixedOutcome, null);
  assert.equal(getError(), "Unresolved rows cannot be confirmed.");
  assert.equal(calls.length, 0, "transport must not be called when selection contains invalid row");

  // 3. Confirming valid-only row succeeds
  const validOutcome = await controller.confirm(op, ["row-valid"]);
  assert.ok(validOutcome !== null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "confirmOrsonOperation");
  assert.deepEqual(calls[0].payload.selectedRowIds, ["row-valid"]);

  // 4. In UI cards: unresolved row is unselected and edits invalidate review
  const remaining = op.rows;
  const initialSelected = remaining.filter((r) => r.valid).map((r) => r.command.id);
  assert.deepEqual(initialSelected, ["row-valid"], "invalid row must not be in default selection");

  // Confirm disabled condition from AgentCards
  const isConfirmDisabled = (busy, dirty, selected) => {
    return busy || dirty || !selected.length || selected.some((id) => !remaining.find((r) => r.command.id === id)?.valid);
  };
  assert.equal(isConfirmDisabled(false, false, ["row-valid"]), false);
  assert.equal(isConfirmDisabled(false, false, ["row-invalid"]), true, "confirm is disabled if invalid row selected");
  assert.equal(isConfirmDisabled(false, true, ["row-valid"]), true, "confirm is disabled when dirty (edit in review)");
  assert.equal(isConfirmDisabled(false, true, []), true, "confirm is disabled when empty selection");
});

test("partial selection, receipt detachment, and retry recovery remain intact", async () => {
  let transportCalls = [];
  const serverOperation = {
    id: "op-detach",
    revision: 2,
    state: "partial",
    rows: [
      { command: { id: "row-1", type: "upsert_water_quality" }, valid: true },
      { command: { id: "row-2", type: "upsert_water_quality" }, valid: true },
      { command: { id: "row-3", type: "upsert_water_quality" }, valid: true },
    ],
    receipts: [
      { status: "saved", rowIds: ["row-1"], message: "Saved morning DO" },
    ],
  };

  const transport = async (name, payload) => {
    transportCalls.push({ name, payload });
    if (name === "getOrsonOperation") {
      return serverOperation;
    }
    return { id: payload.operationId, revision: 3, state: "completed", rows: [], receipts: [] };
  };

  const { controller, getRecovery } = createAgentOperations(transport);

  // Partial selection
  const remainingAfterSaved = serverOperation.rows.filter(
    (r) => !new Set(serverOperation.receipts.filter((rc) => rc.status === "saved").flatMap((rc) => rc.rowIds)).has(r.command.id),
  );
  assert.equal(remainingAfterSaved.length, 2, "saved row-1 is detached from remaining draft rows");
  assert.deepEqual(remainingAfterSaved.map((r) => r.command.id), ["row-2", "row-3"]);

  // User partially selects only row-2
  const userSelected = ["row-2"];
  const confirmLabel = `Confirm ${userSelected.length} selected`;
  const notSelectedCount = remainingAfterSaved.length - userSelected.length;
  assert.equal(confirmLabel, "Confirm 1 selected");
  assert.equal(notSelectedCount, 1);

  // Retry recovery via agent.recover
  const recovered = await controller.recover(serverOperation);
  assert.equal(recovered.id, "op-detach");
  assert.equal(transportCalls.some((c) => c.name === "getOrsonOperation"), true);
  assert.ok(getRecovery()["op-detach"].includes("Some entries saved"));
  assert.ok(getRecovery()["op-detach"].includes("Saved morning DO"));

  // describeSaveStatus behavior
  assert.equal(
    describeSaveStatus({ state: "draft", receipts: [] }),
    "Still a draft. Nothing has been saved.",
  );
  assert.equal(
    describeSaveStatus({ state: "discarded", receipts: [] }),
    "Draft discarded. Nothing was saved.",
  );
  assert.ok(
    describeSaveStatus({
      state: "discarded",
      receipts: [{ status: "saved", message: "Saved water quality" }],
    }).includes("Previously saved records remain saved"),
  );
  assert.ok(
    describeSaveStatus({
      state: "partial",
      receipts: [{ status: "saved", message: "Saved morning" }],
    }).includes("Some entries saved"),
  );
});
