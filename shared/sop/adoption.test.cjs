const test = require("node:test");
const assert = require("node:assert/strict");
const {
  adoptionPonds,
  toggleAdoptionSelection,
  adoptionPreview,
  confirmedAdoption,
  existingSopAdoption,
} = require("./adoption.ts");

test("several cycle records remain one selectable physical pond without losing its active cycle", () => {
  const rows = adoptionPonds({
    physicalPonds: [{ id: "a", pondName: "A", blockId: "block" }],
    ponds: [
      {
        id: "a-old",
        physicalPondId: "a",
        pondName: "Old name",
        cycleStatus: "ended",
        stockingDate: "2025-01-01",
      },
      {
        id: "a-new",
        physicalPondId: "a",
        pondName: "A",
        cycleStatus: "active",
        stockingDate: "2026-10-10",
      },
      { id: "b-old", physicalPondId: "b", pondName: "B", cycleStatus: "ended" },
      {
        id: "b-new",
        physicalPondId: "b",
        pondName: "B",
        cycleStatus: "active",
        stockingDate: "2026-10-10",
      },
    ],
  });
  assert.deepEqual(
    rows.map((p) => [p.id, p.name, p.activeCycle, p.stockingDate]),
    [
      ["a", "A", true, "2026-10-10"],
      ["b", "B", true, "2026-10-10"],
    ],
  );
  assert.equal(rows[0].blockId, "block");
});

test("selecting a second pond retains the first, and deselecting one keeps the other", () => {
  let selected = toggleAdoptionSelection([], "a");
  selected = toggleAdoptionSelection(selected, "b");
  assert.deepEqual(selected, ["a", "b"]);
  assert.deepEqual(toggleAdoptionSelection(selected, "a"), ["b"]);
  assert.deepEqual(selected, ["a", "b"]);
});

test("unstocked physical ponds remain available for standing procedures and legacy cycles have stable IDs", () => {
  const rows = adoptionPonds({
    physicalPonds: [{ id: "prep", pondName: "Preparation" }],
    ponds: [
      {
        id: "legacy",
        pondName: "Legacy",
        cycleStatus: "active",
        stockingDate: "2026-10-10",
      },
    ],
  });
  assert.equal(rows.find((p) => p.id === "prep").activeCycle, false);
  assert.equal(rows.find((p) => p.id === "legacy").activeCycle, true);
});

test("a failed or empty preview cannot authorize activation", () => {
  for (const result of [
    {},
    { ok: false },
    { ok: true, targets: [], conflicts: [], versionId: "v1" },
  ])
    assert.throws(() => adoptionPreview(result), /not confirmed/);
  const valid = {
    ok: true,
    targets: ["a", "b"].map((id) => ({
      id,
      name: id,
      scope: "pond",
      stage: "stocking",
      assigneeId: "tech",
    })),
    conflicts: [],
    versionId: "v1",
    generatedSteps: 2,
  };
  assert.equal(adoptionPreview(valid), valid);
  assert.throws(() => confirmedAdoption({ ok: true }), /not confirmed/);
  assert.equal(confirmedAdoption({ ok: true, adoptionId: "ad" }), "ad");
});

test("reopening one active adoption manages it instead of creating a competing duplicate", () => {
  const ad = { id: "ad", sopId: "sop", status: "active" };
  assert.equal(
    existingSopAdoption(
      [ad, { id: "old", sopId: "sop", status: "retired" }],
      "sop",
    ),
    ad,
  );
  assert.equal(
    existingSopAdoption(
      [ad, { id: "ad2", sopId: "sop", status: "active" }],
      "sop",
    ),
    undefined,
  );
  assert.equal(existingSopAdoption([ad], "other"), undefined);
});
