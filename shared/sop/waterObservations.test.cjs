const test = require("node:test"),
  assert = require("node:assert/strict");
const { waterObservationChanges } = require("./waterObservations.ts");
test("same-time correction retains identity; another reading gets a distinct identity", () => {
  const record = {
    id: "record",
    date: "2026-10-08",
    doMorning: "4",
    observedAtByField: { doMorning: "2026-10-08T06:00Z" },
  };
  const first = waterObservationChanges("pond", undefined, record);
  const correction = waterObservationChanges("pond", first.sampling, {
    ...first.sampling,
    doMorning: "3",
  });
  assert.equal(first.observations[0].id, correction.observations[0].id);
  const recovery = waterObservationChanges("pond", first.sampling, {
    ...first.sampling,
    doMorning: "6",
    observedAtByField: { doMorning: "2026-10-08T07:00Z" },
  });
  assert.notEqual(first.observations[0].id, recovery.observations[0].id);
  assert.equal(first.observations[0].value, "4");
  assert.equal(recovery.observations[0].value, "6");
});
test("historical date-only water records do not acquire fabricated observation times", () => {
  const result = waterObservationChanges("pond", undefined, {
    id: "record",
    date: "2026-10-08",
    doMorning: "4",
  });
  assert.equal(result.observations.length, 0);
});
