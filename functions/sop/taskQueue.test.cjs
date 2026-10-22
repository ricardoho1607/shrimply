const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateTaskPage } = require("./taskQueue");
const task = (id, episode) => ({ id, adoptionId: "ad", step: { id: episode }, target: { id: "pond", cycleId: "cycle" } });
const wait = () => new Promise((resolve) => setImmediate(resolve));

test("scheduled requests cannot overlap inside the single scheduler instance", () => {
  const endpoint = require("./index").runSopScheduler.__endpoint;
  assert.equal(endpoint.maxInstances, 1);
  assert.equal(endpoint.concurrency, 1);
});

test("independent episodes overlap, but related tasks keep order and the worker limit", async () => {
  const tasks = Array.from({ length: 36 }, (_, i) => task(i, i % 12));
  let active = 0, peak = 0;
  const episodes = new Set(), seen = [];
  await evaluateTaskPage(tasks, async (item) => {
    assert.equal(episodes.has(item.step.id), false);
    episodes.add(item.step.id);
    peak = Math.max(peak, ++active);
    await wait();
    seen.push(item.id);
    --active;
    episodes.delete(item.step.id);
  });
  assert.equal(peak, 8);
  for (let i = 0; i < 12; i++) assert.deepEqual(seen.filter((id) => id % 12 === i), [i, i + 12, i + 24]);
});

test("failed pages stop starting work and drain active operations before rejecting", async () => {
  let active = 0;
  const seen = [];
  await assert.rejects(evaluateTaskPage(Array.from({ length: 30 }, (_, i) => task(i, i)), async (item) => {
    ++active;
    await wait();
    --active;
    seen.push(item.id);
    if (item.id === 0) throw new Error("failed check");
  }), /failed check/);
  assert.equal(active, 0);
  assert.equal(seen.length, 8);
});
