import test from 'node:test';
import assert from 'node:assert/strict';

test('Weighted-average costing ledger simulation', () => {
  // Scenario 1: Initial opening stock 10 units @ 100/unit = 1000 value
  let qty = 10;
  let cost = 100;

  // Scenario 2: Purchase receipt of 20 units @ 130/unit
  const receiptQty = 20;
  const receiptCost = 130;

  const newQty = qty + receiptQty; // 30 units
  const newCost = (qty * cost + receiptQty * receiptCost) / newQty; // (1000 + 2600) / 30 = 3600 / 30 = 120

  assert.equal(newQty, 30);
  assert.equal(newCost, 120);

  // Scenario 3: Sales delivery of 15 units (cost remains 120, qty decreases)
  const salesQty = 15;
  const afterSalesQty = newQty - salesQty; // 15 units
  const afterSalesCost = newCost; // unchanged at 120

  assert.equal(afterSalesQty, 15);
  assert.equal(afterSalesCost, 120);

  // Remaining valuation = 15 * 120 = 1800
  assert.equal(afterSalesQty * afterSalesCost, 1800);
});
