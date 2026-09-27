const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCommand } = require("./orsonAgentContract");
const { acceptOrsonActivity } = require("./orsonDomain/orsonAgentContract");
test("rejects malformed dates, unknown fields, negative amounts and invalid observation enums", () => {
  for (const data of [
    { date: "2026-02-30" },
    { values: { mbw: -1, feed: 2 } },
    { values: { mbw: 1, feed: Infinity } },
    { values: { mbw: 1, feed: 2, companyId: "other" } },
  ])
    assert.throws(() =>
      normalizeCommand({
        id: "row-1",
        type: "record_sampling",
        date: "2026-09-21",
        values: { mbw: 1, feed: 2 },
        ...data,
      }),
    );
});
test("activity ordering ignores duplicate, stale and foreign requests", () => {
  const first = {
    type: "status_step",
    requestId: "one",
    sequence: 1,
    step: "pond_lookup",
    state: "running",
  };
  assert.equal(acceptOrsonActivity(null, first), first);
  assert.equal(acceptOrsonActivity(first, { ...first, sequence: 0 }), first);
  assert.equal(
    acceptOrsonActivity(first, { ...first, requestId: "two", sequence: 2 }),
    first,
  );
  assert.equal(
    acceptOrsonActivity(first, {
      ...first,
      sequence: 2,
      step: "internal-secret",
    }),
    first,
  );
  assert.equal(
    acceptOrsonActivity(first, {
      ...first,
      sequence: 2,
      step: "sampling_lookup",
    }).step,
    "sampling_lookup",
  );
});

test("CSV preserves quoted commas, newlines, empty cells and escaped quotes", () => {
  const { parseCsv } = require("./orsonDocumentExtraction");
  assert.deepEqual(
    parseCsv(
      'pond,notes,feed\r\nA1,"rain, wind",\r\nA2,"two\nlines and ""quotes""",20',
    ),
    [
      ["pond", "notes", "feed"],
      ["A1", "rain, wind", ""],
      ["A2", 'two\nlines and "quotes"', "20"],
    ],
  );
  assert.throws(() => parseCsv('pond,"unfinished'));
});

test("malformed status state cannot turn a live action into a false completion", () => {
  const event = {
    type: "status_step",
    requestId: "r",
    sequence: 1,
    step: "saving",
    state: "saved",
  };
  assert.equal(acceptOrsonActivity(null, event), null);
});
