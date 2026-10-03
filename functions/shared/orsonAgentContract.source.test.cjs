const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../../scripts/register-typescript.cjs");
const { ORSON_ACTIONS } = require("../../shared/orsonAgentContract.ts");

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
