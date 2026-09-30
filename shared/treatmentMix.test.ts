import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFifoConsumption, calculateTreatmentDoseLiters } from './treatmentMix';

test('calculates 5 L for 2 ppm in a 2,500 m2 pond at 1 m depth', () => {
  assert.deepEqual(calculateTreatmentDoseLiters(2500, 2), { pondVolumeLiters: 2_500_000, requiredMixLiters: 5 });
});

test('uses exact FIFO ingredient prices', () => {
  const dolomite = calculateFifoConsumption([{ quantity: 20, price: 4000 }], [], 5);
  const azomite = calculateFifoConsumption([{ quantity: 10, price: 6000 }], [], 2);
  assert.equal(dolomite.totalCost + azomite.totalCost, 32_000);
});

test('uses oldest remaining stock layer first', () => {
  const result = calculateFifoConsumption(
    [{ quantity: 5, price: 4000 }, { quantity: 5, price: 5000 }],
    [{ quantity: 4 }],
    3,
  );
  assert.equal(result.totalCost, 14_000);
  assert.equal(result.remainingCost, 15_000);
});

test('filters voided stock entries out of FIFO consumption', () => {
  const result = calculateFifoConsumption(
    [
      { quantity: 10, price: 1000, voided: true },
      { quantity: 5, price: 4000 },
      { quantity: 5, price: 5000 },
    ],
    [{ quantity: 2 }],
    3,
  );
  assert.equal(result.totalCost, 12_000);
  assert.equal(result.remainingCost, 25_000);

  // When only voided entries exist, requested quantity cannot be covered
  assert.throws(
    () => calculateFifoConsumption([{ quantity: 10, price: 1000, voided: true }], [], 1),
    /Inventory cost history does not cover the requested quantity/,
  );
});
