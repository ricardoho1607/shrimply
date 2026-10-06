'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyStockStatus,
  calculateDaysOfSupply,
  calculateReplenishmentShortfall,
  evaluateReplenishmentScenario,
  REPLENISHMENT_STOCK_STATUS,
  INVENTORY_DOSING_RULES,
} = require('./orsonInventoryPolicy');

test('classifyStockStatus: handles missing, unspecified, and invalid item inputs', () => {
  // 1. Completely missing item
  const nullItem = classifyStockStatus(null);
  assert.equal(nullItem.status, REPLENISHMENT_STOCK_STATUS.UNKNOWN_STOCK);
  assert.equal(nullItem.availableStock, null);
  assert.equal(nullItem.reason, 'missing_item');

  const undefItem = classifyStockStatus(undefined);
  assert.equal(undefItem.status, REPLENISHMENT_STOCK_STATUS.UNKNOWN_STOCK);
  assert.equal(undefItem.availableStock, null);

  // 2. Unspecified / missing totalStock (unknown stock != zero)
  const emptyItem = classifyStockStatus({});
  assert.equal(emptyItem.status, REPLENISHMENT_STOCK_STATUS.UNKNOWN_STOCK);
  assert.equal(emptyItem.availableStock, null);
  assert.equal(emptyItem.reason, 'unspecified_stock');

  const nanStockItem = classifyStockStatus({ totalStock: 'not-a-number' });
  assert.equal(nanStockItem.status, REPLENISHMENT_STOCK_STATUS.UNKNOWN_STOCK);
  assert.equal(nanStockItem.availableStock, null);
});

test('classifyStockStatus: distinguishes zero-stock, negative-stock anomaly, low-stock, and in-stock', () => {
  // Zero stock
  const zeroStock = classifyStockStatus({ totalStock: 0 });
  assert.equal(zeroStock.status, REPLENISHMENT_STOCK_STATUS.ZERO_STOCK);
  assert.equal(zeroStock.availableStock, 0);

  // Negative stock anomaly
  const negStock = classifyStockStatus({ totalStock: -15 });
  assert.equal(negStock.status, REPLENISHMENT_STOCK_STATUS.NEGATIVE_STOCK);
  assert.equal(negStock.availableStock, 0);
  assert.equal(negStock.rawStock, -15);

  // Low stock (at or below reorder level)
  const lowStock = classifyStockStatus({ totalStock: 20, reorderLevel: 25 });
  assert.equal(lowStock.status, REPLENISHMENT_STOCK_STATUS.LOW_STOCK);
  assert.equal(lowStock.availableStock, 20);
  assert.equal(lowStock.isBelowReorderLevel, true);

  // In stock (above reorder level)
  const inStock = classifyStockStatus({ totalStock: 100, reorderLevel: 25 });
  assert.equal(inStock.status, REPLENISHMENT_STOCK_STATUS.IN_STOCK);
  assert.equal(inStock.availableStock, 100);
  assert.equal(inStock.isBelowReorderLevel, false);

  // In stock without reorder level
  const inStockNoReorder = classifyStockStatus({ totalStock: 50 });
  assert.equal(inStockNoReorder.status, REPLENISHMENT_STOCK_STATUS.IN_STOCK);
  assert.equal(inStockNoReorder.availableStock, 50);
  assert.equal(inStockNoReorder.reorderLevel, null);
});

test('calculateDaysOfSupply: handles zero-usage, zero-stock, missing burn rate, and normal consumption', () => {
  // Zero stock -> 0 days of supply
  const zeroStock = calculateDaysOfSupply(0, 10);
  assert.equal(zeroStock.daysOfSupply, 0);
  assert.equal(zeroStock.runwayStatus, 'depleted');

  // Zero usage rate -> stable zero consumption, never divides by zero
  const zeroBurn = calculateDaysOfSupply(50, 0);
  assert.equal(zeroBurn.daysOfSupply, null);
  assert.equal(zeroBurn.runwayStatus, 'stable_zero_consumption');
  assert.equal(zeroBurn.reason, 'zero_daily_usage');

  // Missing / unknown burn rate
  const missingBurn = calculateDaysOfSupply(50, null);
  assert.equal(missingBurn.daysOfSupply, null);
  assert.equal(missingBurn.runwayStatus, 'unknown');

  // Missing / unknown stock
  const missingStock = calculateDaysOfSupply(null, 10);
  assert.equal(missingStock.daysOfSupply, null);
  assert.equal(missingStock.runwayStatus, 'unknown');

  // Normal consumption: 100kg stock, 10kg/day burn -> 10 days (adequate)
  const normal = calculateDaysOfSupply(100, 10);
  assert.equal(normal.daysOfSupply, 10);
  assert.equal(normal.runwayStatus, 'adequate');

  // Warning runway: 25kg stock, 5kg/day burn -> 5 days
  const warning = calculateDaysOfSupply(25, 5);
  assert.equal(warning.daysOfSupply, 5);
  assert.equal(warning.runwayStatus, 'warning');

  // Critical runway: 15kg stock, 10kg/day burn -> 1.5 days
  const critical = calculateDaysOfSupply(15, 10);
  assert.equal(critical.daysOfSupply, 1.5);
  assert.equal(critical.runwayStatus, 'critical');
});

test('calculateReplenishmentShortfall: verifies units, calculates surplus, and flags stockout severity', () => {
  // Sufficient stock
  const sufficient = calculateReplenishmentShortfall(100, 40, { unit: 'kg', itemUnit: 'kg' });
  assert.equal(sufficient.hasSufficientStock, true);
  assert.equal(sufficient.shortfall, 0);
  assert.equal(sufficient.surplus, 60);
  assert.equal(sufficient.severity, 'none');

  // Partial shortfall (stock available but insufficient)
  const partialShortfall = calculateReplenishmentShortfall(30, 50, { unit: 'kg', itemUnit: 'kg' });
  assert.equal(partialShortfall.hasSufficientStock, false);
  assert.equal(partialShortfall.shortfall, 20);
  assert.equal(partialShortfall.severity, 'partial_shortfall');

  // Critical stockout (zero stock with positive requirement)
  const zeroStockShortfall = calculateReplenishmentShortfall(0, 50, { unit: 'kg', itemUnit: 'kg' });
  assert.equal(zeroStockShortfall.hasSufficientStock, false);
  assert.equal(zeroStockShortfall.shortfall, 50);
  assert.equal(zeroStockShortfall.severity, 'critical_stockout');

  // Unit mismatch (Rule 7: compatible verified units required)
  const unitMismatch = calculateReplenishmentShortfall(50, 10, { unit: 'bags', itemUnit: 'kg' });
  assert.equal(unitMismatch.unitMismatch, true);
  assert.equal(unitMismatch.shortfall, null);
  assert.equal(unitMismatch.hasSufficientStock, null);
  assert.match(unitMismatch.reason, /Incompatible units/);

  // Missing requirement
  const noReq = calculateReplenishmentShortfall(50, null);
  assert.equal(noReq.shortfall, 0);
  assert.equal(noReq.hasSufficientStock, null);

  // Missing available stock
  const unknownStock = calculateReplenishmentShortfall(null, 50);
  assert.equal(unknownStock.shortfall, null);
  assert.equal(unknownStock.hasSufficientStock, null);
});

test('evaluateReplenishmentScenario: comprehensive evaluation of missing, partial, zero-usage, and zero-stock inputs', () => {
  // 1. Missing inputs: item null
  const missingItem = evaluateReplenishmentScenario({ item: null });
  assert.equal(missingItem.stockStatus.status, REPLENISHMENT_STOCK_STATUS.UNKNOWN_STOCK);
  assert.equal(missingItem.burnRate.isUnknown, true);
  assert.equal(missingItem.runway.daysOfSupply, null);
  assert.equal(missingItem.reorderAssessment.urgency, 'unknown');
  assert.equal(missingItem.guardrails.noProcurementExecuted, true);

  // 2. Partial input: stock is known (60kg), but usageHistory is undefined
  const partialNoUsage = evaluateReplenishmentScenario({
    item: { id: 'feed-1', feedName: 'Grower Feed', totalStock: 60, unit: 'kg' },
  });
  assert.equal(partialNoUsage.stockStatus.status, REPLENISHMENT_STOCK_STATUS.IN_STOCK);
  assert.equal(partialNoUsage.stockStatus.availableStock, 60);
  assert.equal(partialNoUsage.burnRate.isUnknown, true);
  assert.equal(partialNoUsage.runway.daysOfSupply, null);
  assert.equal(partialNoUsage.reorderAssessment.isReorderNeeded, false);

  // 3. Empty-history input: usageHistory is empty array [] (unknown usage, never zero consumption)
  const emptyHistory = evaluateReplenishmentScenario({
    item: { id: 'feed-2', feedName: 'Starter Feed', totalStock: 80, usageHistory: [], unit: 'kg' },
  });
  assert.equal(emptyHistory.burnRate.kgPerDay, null);
  assert.equal(emptyHistory.burnRate.isUnknown, true);
  assert.equal(emptyHistory.burnRate.isZeroUsage, false);
  assert.equal(emptyHistory.runway.runwayStatus, 'unknown');
  assert.equal(emptyHistory.runway.daysOfSupply, null);
  assert.equal(emptyHistory.reorderAssessment.isReorderNeeded, false);

  // 3b. Verified zero-usage input: usageHistory has explicit 0kg consumption records
  const zeroUsage = evaluateReplenishmentScenario({
    item: {
      id: 'feed-2b',
      feedName: 'Starter Feed',
      totalStock: 80,
      usageHistory: [
        { date: '2026-09-01', quantity: 0 },
        { date: '2026-09-02', quantity: 0 },
      ],
      unit: 'kg',
    },
  });
  assert.equal(zeroUsage.burnRate.kgPerDay, 0);
  assert.equal(zeroUsage.burnRate.isZeroUsage, true);
  assert.equal(zeroUsage.burnRate.isUnknown, false);
  assert.equal(zeroUsage.runway.runwayStatus, 'stable_zero_consumption');
  assert.equal(zeroUsage.runway.daysOfSupply, null);
  assert.equal(zeroUsage.reorderAssessment.isReorderNeeded, false);

  // 3c. Filtered usage: excludes voided, transfers, and incompatible units
  const filteredUsage = evaluateReplenishmentScenario({
    item: {
      id: 'feed-2c',
      feedName: 'Starter Feed',
      totalStock: 80,
      unit: 'kg',
      usageHistory: [
        { date: '2026-09-01', quantity: 15, unit: 'kg' },
        { date: '2026-09-01', quantity: 5, unit: 'kg' }, // same day -> grouped into 20kg
        { date: '2026-09-02', quantity: 999, voided: true, unit: 'kg' }, // voided
        { date: '2026-09-02', quantity: 999, transfer: true, unit: 'kg' }, // transfer
        { date: '2026-09-02', quantity: 999, source: 'treatmentMixProduction', unit: 'kg' }, // mix transfer
        { date: '2026-09-02', quantity: 999, unit: 'liters' }, // incompatible unit
        { date: '2026-09-02', quantity: 20, unit: 'kg' }, // valid
      ],
    },
  });
  // Day 1 (Sep 1): 20kg, Day 2 (Sep 2): 20kg -> average 20kg/day
  assert.equal(filteredUsage.burnRate.kgPerDay, 20);

  // 3d. Strictly bounded window: excludes undated, future (> todayKey), and stale (< windowStartKey) rows
  const boundedWindowUsage = evaluateReplenishmentScenario({
    item: {
      id: 'feed-2d',
      feedName: 'Grower Feed',
      totalStock: 100,
      unit: 'kg',
      usageHistory: [
        { date: '2026-08-01', quantity: 999, unit: 'kg' }, // stale (older than 14 days)
        { date: '2026-09-01', quantity: 10, unit: 'kg' }, // valid
        { date: '2026-09-02', quantity: 10, unit: 'kg' }, // valid
        { date: null, quantity: 50, unit: 'kg' }, // undated -> excluded
        { date: '2026-09-10', quantity: 999, unit: 'kg' }, // future relative to todayKey -> excluded
      ],
    },
    todayKey: '2026-09-02',
    lookbackDays: 14,
  });
  assert.equal(boundedWindowUsage.burnRate.kgPerDay, 10);
  assert.equal(boundedWindowUsage.burnRate.window.startDate, '2026-08-20');
  assert.equal(boundedWindowUsage.burnRate.window.endDate, '2026-09-02');

  // 3e. Missing unit handling: item unit is null, missing unit never coerced to kg
  const missingUnitItem = evaluateReplenishmentScenario({
    item: { id: 'feed-2e', feedName: 'Unlabeled Feed', totalStock: 50 },
    requiredQuantity: 10,
    requiredUnit: 'kg',
  });
  assert.equal(missingUnitItem.unit, null);
  assert.equal(missingUnitItem.shortfall.unitMismatch, true);
  assert.match(missingUnitItem.shortfall.reason, /verified unit/);


  // 4. Zero-stock input: totalStock is 0
  const zeroStock = evaluateReplenishmentScenario({
    item: { id: 'additive-1', additiveName: 'Calcium Chloride', totalStock: 0, unit: 'kg' },
    requiredQuantity: 25,
    requiredUnit: 'kg',
  });
  assert.equal(zeroStock.stockStatus.status, REPLENISHMENT_STOCK_STATUS.ZERO_STOCK);
  assert.equal(zeroStock.runway.daysOfSupply, 0);
  assert.equal(zeroStock.shortfall.shortfall, 25);
  assert.equal(zeroStock.shortfall.severity, 'critical_stockout');
  assert.equal(zeroStock.reorderAssessment.isReorderNeeded, true);
  assert.equal(zeroStock.reorderAssessment.urgency, 'immediate');
  assert.equal(zeroStock.reorderAssessment.recommendedReorderQuantity, 25);
  assert.equal(zeroStock.guardrails.noProcurementExecuted, true);
  assert.equal(zeroStock.guardrails.advisoryOnly, true);

  // 5. Normal replenishment scenario with burn rate and planned horizon
  const normalScenario = evaluateReplenishmentScenario({
    item: {
      id: 'feed-pro',
      feedName: 'Finisher Feed',
      totalStock: 50,
      reorderLevel: 40,
      unit: 'kg',
      usageHistory: [
        { date: '2026-09-01', quantity: 10 },
        { date: '2026-09-02', quantity: 10 },
      ],
    },
    plannedDays: 10,
  });
  assert.equal(normalScenario.stockStatus.status, REPLENISHMENT_STOCK_STATUS.IN_STOCK);
  assert.equal(normalScenario.burnRate.kgPerDay, 10);
  assert.equal(normalScenario.runway.daysOfSupply, 5); // 50 / 10 = 5 days (warning)
  // Target stock for 10 days = 100kg. Current = 50kg. Needed = 50kg.
  assert.equal(normalScenario.reorderAssessment.recommendedReorderQuantity, 50);
});

test('existing inventory policy rules: adheres to INVENTORY_DOSING_RULES standards', () => {
  assert.ok(Array.isArray(INVENTORY_DOSING_RULES));
  assert.ok(INVENTORY_DOSING_RULES.length >= 7);
  // Rule 2 checks unknown stock is not zero
  assert.ok(INVENTORY_DOSING_RULES.some((r) => r.includes('unknown stock is not zero')));
  // Rule 7 checks compatible verified units
  assert.ok(INVENTORY_DOSING_RULES.some((r) => r.includes('compatible verified units')));
});
