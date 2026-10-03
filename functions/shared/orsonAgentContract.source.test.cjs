const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../../scripts/register-typescript.cjs");
const { ORSON_ACTIONS, normalizeCommand } = require("../../shared/orsonAgentContract.ts");

test("upsert_water_quality exposes structured pond observations", () => {
  assert.deepEqual(
    [
      "nitriteMgL",
      "nitriteBasis",
      "weatherEvent",
      "waterExchangePercent",
      "sludgeLoad",
      "surfaceScum",
      "shrimpBehaviour",
      "waterDepthCmMorning",
      "waterDepthCmEvening",
    ].filter((field) => ORSON_ACTIONS.upsert_water_quality.fields.includes(field)),
    [
      "nitriteMgL",
      "nitriteBasis",
      "weatherEvent",
      "waterExchangePercent",
      "sludgeLoad",
      "surfaceScum",
      "shrimpBehaviour",
      "waterDepthCmMorning",
      "waterDepthCmEvening",
    ],
  );
});

test("false and zero survive normalization without being dropped or rejected", () => {
  const result = normalizeCommand({
    id: "row-survive",
    type: "upsert_water_quality",
    date: "2026-09-21",
    values: {
      surfaceScum: false,
      doMorning: 0,
      waterExchangePercent: 0,
      salinity: 0,
      alkalinity: 0,
      ammonia: 0,
    },
  });
  assert.equal(result.values.surfaceScum, false);
  assert.equal(result.values.doMorning, 0);
  assert.equal(result.values.waterExchangePercent, 0);
  assert.equal(result.values.salinity, 0);
  assert.equal(result.values.alkalinity, 0);
  assert.equal(result.values.ammonia, 0);

  // zero nitrite survives with explicit NO2 basis
  const nitriteZero = normalizeCommand({
    id: "row-zero-nitrite",
    type: "upsert_water_quality",
    date: "2026-09-21",
    values: {
      nitriteMgL: 0,
      nitriteBasis: "NO2",
    },
  });
  assert.equal(nitriteZero.values.nitriteMgL, 0);
  assert.equal(nitriteZero.values.nitriteBasis, "NO2");

  // zero count survives for mortality none_observed
  const mortZero = normalizeCommand({
    id: "row-zero-mort",
    type: "record_mortality",
    date: "2026-09-21",
    values: {
      count: 0,
      observationType: "none_observed",
    },
  });
  assert.equal(mortZero.values.count, 0);
  assert.equal(mortZero.values.observationType, "none_observed");
});

test("missing values are omitted from normalized command values", () => {
  const result = normalizeCommand({
    id: "row-omitted",
    type: "upsert_water_quality",
    date: "2026-09-21",
    values: {
      doMorning: 6.2,
      doEvening: null,
      phMorning: undefined,
      phEvening: "",
      operationalNotes: "   ",
      weatherEvent: "",
      surfaceScum: undefined,
    },
  });
  assert.deepEqual(result.values, { doMorning: 6.2 });
  assert.equal(Object.hasOwn(result.values, "doEvening"), false);
  assert.equal(Object.hasOwn(result.values, "phMorning"), false);
  assert.equal(Object.hasOwn(result.values, "phEvening"), false);
  assert.equal(Object.hasOwn(result.values, "operationalNotes"), false);
  assert.equal(Object.hasOwn(result.values, "weatherEvent"), false);
  assert.equal(Object.hasOwn(result.values, "surfaceScum"), false);

  // command with only missing values fails closed
  assert.throws(
    () =>
      normalizeCommand({
        id: "row-empty",
        type: "upsert_water_quality",
        date: "2026-09-21",
        values: {
          doMorning: null,
          phMorning: "",
          operationalNotes: "   ",
        },
      }),
    /Enter at least one value\./,
  );
});

test("invalid enums, types, and ranges reject", () => {
  const base = {
    id: "row-reject",
    type: "upsert_water_quality",
    date: "2026-09-21",
  };

  // Invalid enums reject
  for (const badEnum of ["tornado", "sunny", "storm", "clear"]) {
    assert.throws(
      () => normalizeCommand({ ...base, values: { weatherEvent: badEnum } }),
      /Choose a valid weatherEvent\./,
    );
  }
  for (const badSludge of ["extreme", "none", "very_high"]) {
    assert.throws(
      () => normalizeCommand({ ...base, values: { sludgeLoad: badSludge } }),
      /Choose a valid sludgeLoad\./,
    );
  }
  for (const badBehaviour of ["leaping", "sluggish", "erratic"]) {
    assert.throws(
      () => normalizeCommand({ ...base, values: { shrimpBehaviour: badBehaviour } }),
      /Choose a valid shrimpBehaviour\./,
    );
  }

  // Invalid types reject
  for (const badScum of ["false", "true", 0, 1, "yes", "no", [], {}]) {
    assert.throws(
      () => normalizeCommand({ ...base, values: { surfaceScum: badScum } }),
      /surfaceScum must be a boolean\./,
    );
  }
  for (const badDo of [true, false, "high", "not-a-number", [], {}]) {
    assert.throws(
      () => normalizeCommand({ ...base, values: { doMorning: badDo } }),
      /doMorning must be a non-negative number\./,
    );
  }
  for (const badWeather of [123, true, false, {}]) {
    assert.throws(
      () => normalizeCommand({ ...base, values: { weatherEvent: badWeather } }),
      /Invalid weatherEvent\./,
    );
  }

  // Invalid ranges reject
  assert.throws(
    () => normalizeCommand({ ...base, values: { phMorning: -0.1 } }),
    /phMorning must be a non-negative number\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { phMorning: 14.1 } }),
    /pH must be between 0 and 14\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { phEvening: 15 } }),
    /pH must be between 0 and 14\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { waterExchangePercent: -1 } }),
    /waterExchangePercent must be a non-negative number\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { waterExchangePercent: 100.1 } }),
    /waterExchangePercent must be between 0 and 100\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { waterExchangePercent: 150 } }),
    /waterExchangePercent must be between 0 and 100\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { doMorning: -1 } }),
    /doMorning must be a non-negative number\./,
  );

  // Positive ranges in sampling and mortality
  assert.throws(
    () =>
      normalizeCommand({
        id: "row-sampling",
        type: "record_sampling",
        date: "2026-09-21",
        values: { mbw: 0, feed: 10 },
      }),
    /mbw must be greater than zero\./,
  );
  assert.throws(
    () =>
      normalizeCommand({
        id: "row-mort",
        type: "record_mortality",
        date: "2026-09-21",
        values: { count: -5, observationType: "estimated_total" },
      }),
    /count must be a non-negative number\./,
  );
  assert.throws(
    () =>
      normalizeCommand({
        id: "row-mort-float",
        type: "record_mortality",
        date: "2026-09-21",
        values: { count: 3.5, observationType: "estimated_total" },
      }),
    /Mortality count must be a whole number\./,
  );
});

test("ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted", () => {
  const base = {
    id: "row-nitrite",
    type: "upsert_water_quality",
    date: "2026-09-21",
  };

  // Ambiguous nitrite (nitriteMgL without nitriteBasis) rejects
  assert.throws(
    () => normalizeCommand({ ...base, values: { nitriteMgL: 0.5 } }),
    /Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { nitriteMgL: 0.5, nitriteBasis: "" } }),
    /Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { nitriteMgL: 0.5, nitriteBasis: "   " } }),
    /Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { nitriteMgL: 0.5, nitriteBasis: "unspecified" } }),
    /Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted\./,
  );

  // NO2-N nitrite rejects
  assert.throws(
    () => normalizeCommand({ ...base, values: { nitriteMgL: 0.5, nitriteBasis: "NO2-N" } }),
    /Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted\./,
  );
  assert.throws(
    () => normalizeCommand({ ...base, values: { nitriteBasis: "NO2-N" } }),
    /Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted\./,
  );

  // Basis without nitriteMgL rejects
  assert.throws(
    () => normalizeCommand({ ...base, values: { nitriteBasis: "NO2" } }),
    /Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted\./,
  );

  // Other non-NO2 bases reject
  for (const otherBasis of ["N", "NO3", "ppm", "unknown"]) {
    assert.throws(
      () => normalizeCommand({ ...base, values: { nitriteMgL: 0.5, nitriteBasis: otherBasis } }),
      /Ambiguous or NO2-N nitrite is unresolved; only explicit NO2 is accepted\./,
    );
  }

  // Only explicit NO2 is accepted
  const valid = normalizeCommand({
    ...base,
    values: { nitriteMgL: 0.45, nitriteBasis: "NO2" },
  });
  assert.equal(valid.values.nitriteMgL, 0.45);
  assert.equal(valid.values.nitriteBasis, "NO2");

  // Explicit NO2 with valid structured observation fields passes together
  const full = normalizeCommand({
    ...base,
    values: {
      doMorning: 5.2,
      nitriteMgL: 0.3,
      nitriteBasis: "NO2",
      weatherEvent: "heavy_rain",
      waterExchangePercent: 20,
      sludgeLoad: "moderate",
      surfaceScum: true,
      shrimpBehaviour: "normal",
      waterDepthCmMorning: 120,
      operationalNotes: "Routine observation after rain",
    },
  });
  assert.equal(full.values.doMorning, 5.2);
  assert.equal(full.values.nitriteMgL, 0.3);
  assert.equal(full.values.nitriteBasis, "NO2");
  assert.equal(full.values.weatherEvent, "heavy_rain");
  assert.equal(full.values.waterExchangePercent, 20);
  assert.equal(full.values.sludgeLoad, "moderate");
  assert.equal(full.values.surfaceScum, true);
  assert.equal(full.values.shrimpBehaviour, "normal");
  assert.equal(full.values.waterDepthCmMorning, 120);
  assert.equal(full.values.operationalNotes, "Routine observation after rain");
});
