import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGST, DEFAULT_PLAN_MODULES, formatCurrencyINR } from '@invenaro/shared';

test('DEFAULT_PLAN_MODULES validates plan tiers', () => {
  // Basic Plan rules
  const basic = DEFAULT_PLAN_MODULES.basic;
  assert.equal(basic.multi_godown, false, 'Basic must not have multi-godown');
  assert.equal(basic.transfers, false, 'Basic must not have transfers');
  assert.equal(basic.invoices_returns, false, 'Basic must not have invoices & returns');
  assert.equal(basic.gst, false, 'Basic must not have GST');
  assert.equal(basic.ledger_ui, false, 'Basic must not have ledger UI');
  assert.equal(basic.reports_advanced, false, 'Basic must not have advanced reports');

  // Business Plan rules
  const business = DEFAULT_PLAN_MODULES.business;
  assert.equal(business.multi_godown, true, 'Business has multi-godown');
  assert.equal(business.transfers, true, 'Business has transfers');
  assert.equal(business.invoices_returns, true, 'Business has invoices & returns');
  assert.equal(business.gst, true, 'Business has GST module');
  assert.equal(business.ledger_ui, true, 'Business has ledger UI');
  assert.equal(business.reports_advanced, true, 'Business has advanced reports');
  assert.equal(business.ai_data_assistant, false, 'Business AI is add-on');

  // Enterprise Plan rules
  const enterprise = DEFAULT_PLAN_MODULES.enterprise;
  assert.equal(enterprise.multi_godown, true);
  assert.equal(enterprise.ai_data_assistant, true);
  assert.equal(enterprise.ai_knowledge_assistant, true);
});

test('calculateGST handles GST toggle and Intra vs Inter-state supply', () => {
  // GST OFF (Basic plan or Business with GST off)
  const gstOff = calculateGST(1000, 18, '27', '27', false);
  assert.equal(gstOff.taxRate, 0);
  assert.equal(gstOff.totalTax, 0);
  assert.equal(gstOff.totalAmount, 1000);

  // Intra-state (Same state e.g., Maharashtra 27 -> 27)
  const intraState = calculateGST(1000, 18, '27', '27', true);
  assert.equal(intraState.isInterState, false);
  assert.equal(intraState.cgstRate, 9);
  assert.equal(intraState.cgstAmount, 90);
  assert.equal(intraState.sgstRate, 9);
  assert.equal(intraState.sgstAmount, 90);
  assert.equal(intraState.igstRate, 0);
  assert.equal(intraState.igstAmount, 0);
  assert.equal(intraState.totalTax, 180);
  assert.equal(intraState.totalAmount, 1180);

  // Inter-state (e.g. Maharashtra 27 -> Karnataka 29)
  const interState = calculateGST(2000, 18, '27', '29', true);
  assert.equal(interState.isInterState, true);
  assert.equal(interState.cgstRate, 0);
  assert.equal(interState.cgstAmount, 0);
  assert.equal(interState.sgstRate, 0);
  assert.equal(interState.sgstAmount, 0);
  assert.equal(interState.igstRate, 18);
  assert.equal(interState.igstAmount, 360);
  assert.equal(interState.totalTax, 360);
  assert.equal(interState.totalAmount, 2360);
});

test('formatCurrencyINR formats Indian rupees properly', () => {
  const formatted = formatCurrencyINR(150000);
  assert.match(formatted, /1,50,000/);
});
