"use strict";

// Tasks sharing an issue must keep their original order. Independent episodes
// can overlap network waits without starting an unbounded number of transactions.
async function evaluateTaskPage(tasks, evaluate, concurrency = 8) {
  const groups = new Map();
  for (const task of tasks) {
    const key = JSON.stringify([task.adoptionId, task.step?.id, task.target?.id, task.target?.cycleId]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }
  const pending = [...groups.values()];
  let index = 0;
  let failure;
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
    while (!failure && index < pending.length) {
      const group = pending[index++];
      for (const task of group) {
        if (failure) break;
        try { await evaluate(task); }
        catch (error) { failure = error; break; }
      }
    }
  }));
  // Drain work already in flight before the scheduler records failure/retries.
  if (failure) throw failure;
}

module.exports = { evaluateTaskPage };
