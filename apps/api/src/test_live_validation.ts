import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3001/api';

async function validateLiveFlow() {
  console.log('========================================================================');
  console.log('         LIVE HTTP VALIDATION: PASUMAI UNAVAGAM & LOCAL BASIC           ');
  console.log('========================================================================\n');

  // 1. Setup Status
  console.log('[1] Checking Setup Status...');
  const setupRes = await fetch(`${BASE_URL}/auth/setup-status`);
  assert.equal(setupRes.status, 200, 'Setup status must return 200');
  const setupData = await setupRes.json();
  console.log(`    needsSetup: ${setupData.needsSetup}`);
  assert.equal(setupData.needsSetup, false, 'NeedsSetup should be false as admin exists');

  // 2. Login
  console.log('\n[2] Logging in as dev-admin@invenaro.local...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dev-admin@invenaro.local',
      password: 'Password123!',
    }),
  });
  assert.equal(loginRes.status, 200, `Login should succeed, got ${loginRes.status}`);
  const auth = await loginRes.json();
  const token = auth.access_token;
  assert.ok(token, 'Must receive JWT access token');
  console.log(`    User: ${auth.user.name} (${auth.user.email})`);
  console.log(`    Role: ${auth.user.role}`);
  console.log(`    Plan: ${auth.entitlements.plan}`);
  console.log(`    Modules: ${JSON.stringify(auth.entitlements.modules)}`);
  
  assert.equal(auth.entitlements.plan, 'basic', 'Plan must be basic');
  assert.equal(auth.entitlements.modules.transfers, false, 'Basic plan must have transfers=false');
  assert.equal(auth.entitlements.modules.batch_expiry, false, 'Basic plan must have batch_expiry=false');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Current User / Entitlements (/auth/me)
  console.log('\n[3] Verifying /auth/me...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, { headers });
  assert.equal(meRes.status, 200, '/auth/me must return 200');
  const meData = await meRes.json();
  assert.equal(meData.entitlements.plan, 'basic', '/auth/me must reflect basic plan');
  console.log('    /auth/me confirmed basic plan.');

  // 4. Products List
  console.log('\n[4] Verifying 10 Excel Products from Pasumai Unavagam...');
  const prodRes = await fetch(`${BASE_URL}/products`, { headers });
  assert.equal(prodRes.status, 200, 'GET /products must return 200');
  const prods = await prodRes.json();
  const prodList = Array.isArray(prods) ? prods : prods.products;
  console.log(`    Found ${prodList.length} products in database.`);
  assert.equal(prodList.length, 10, 'Expected exactly 10 products');

  const skus = prodList.map((p: any) => p.sku).sort();
  console.log(`    SKUs: ${skus.join(', ')}`);
  assert.ok(skus.includes('ORG-MIL-001'));
  assert.ok(skus.includes('ORG-RIC-001'));

  // Verify stock calculation across products
  let totalCalculatedStock = 0;
  for (const p of prodList) {
    totalCalculatedStock += p.current_stock ?? p.stock_level ?? 0;
  }
  console.log(`    Total calculated current stock across all 10 products: ${totalCalculatedStock}`);
  assert.ok(totalCalculatedStock > 0 && totalCalculatedStock <= 365, `Total inventory must be positive and within stock boundary (actual: ${totalCalculatedStock})`);

  // 5. Suppliers
  console.log('\n[5] Verifying Tamil Nadu Suppliers...');
  const suppRes = await fetch(`${BASE_URL}/suppliers`, { headers });
  assert.equal(suppRes.status, 200, 'GET /suppliers must return 200');
  const suppData = await suppRes.json();
  const suppliers = Array.isArray(suppData) ? suppData : suppData.suppliers;
  console.log(`    Found ${suppliers.length} suppliers:`);
  for (const s of suppliers) {
    console.log(`      - ${s.name} (${s.address})`);
    assert.equal(s.state_code, '33', 'Supplier must be in Tamil Nadu (state code 33)');
  }
  assert.equal(suppliers.length, 3, 'Must have 3 suppliers');

  // 6. Customers
  console.log('\n[6] Verifying Customers (Harsh, Vijay, Kavi, Pranav)...');
  const custRes = await fetch(`${BASE_URL}/customers`, { headers });
  assert.equal(custRes.status, 200, 'GET /customers must return 200');
  const custData = await custRes.json();
  const customers = Array.isArray(custData) ? custData : custData.customers;
  console.log(`    Found ${customers.length} customers:`);
  const custNames = customers.map((c: any) => c.name);
  for (const c of customers) {
    console.log(`      - ${c.name} (${c.email}, ${c.address})`);
    assert.equal(c.state_code, '33', 'Customer must be in Tamil Nadu');
  }
  assert.deepEqual(custNames.sort(), ['Harsh', 'Kavi', 'Pranav', 'Vijay']);

  // 7. Purchase Orders & Goods Receipt
  console.log('\n[7] Verifying Purchase Orders...');
  const poRes = await fetch(`${BASE_URL}/purchase-orders`, { headers });
  assert.equal(poRes.status, 200, 'GET /purchase-orders must return 200');
  const poData = await poRes.json();
  const pos = Array.isArray(poData) ? poData : (poData.purchase_orders || poData.orders || poData.items || []);
  console.log(`    Found ${pos.length} Purchase Orders:`);
  for (const po of pos) {
    console.log(`      - PO #${po.po_number}: Status=${po.status}, Total=₹${po.grand_total}`);
    assert.equal(po.status, 'RECEIVED', 'All POs should be RECEIVED in demo flow');
  }
  assert.equal(pos.length, 3, 'Must have 3 purchase orders');

  // 8. Sales Orders & Dispatches
  console.log('\n[8] Verifying Sales Orders & Dispatches...');
  const soRes = await fetch(`${BASE_URL}/sales-orders`, { headers });
  assert.equal(soRes.status, 200, 'GET /sales-orders must return 200');
  const soData = await soRes.json();
  const sos = Array.isArray(soData) ? soData : (soData.sales_orders || soData.orders || soData.items || []);
  console.log(`    Found ${sos.length} Sales Orders:`);
  for (const so of sos) {
    console.log(`      - SO #${so.order_number}: Customer=${so.customer_name || so.customer?.name}, Status=${so.status}, Total=₹${so.grand_total}`);
    assert.ok(['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(so.status), 'SO status must be valid');
  }
  assert.ok(sos.length >= 4, 'Must have at least 4 sales orders');

  // 9. Invoices & Payments (Order Tax Invoices & Single Invoice Lookups)
  console.log('\n[9] Verifying Invoices & Payments...');
  const invoicesFromOrders: any[] = [];
  for (const so of sos) {
    if (so.invoices && so.invoices.length > 0) {
      invoicesFromOrders.push(...so.invoices);
    }
  }
  console.log(`    Found ${invoicesFromOrders.length} Invoices attached to Sales Orders:`);
  let totalBilled = 0;
  let totalBalance = 0;
  for (const inv of invoicesFromOrders) {
    console.log(`      - ${inv.invoice_number}: Status=${inv.status}, Grand Total=₹${inv.grand_total}, Paid=₹${inv.paid_amount}, Balance=₹${inv.balance_amount}`);
    assert.ok(['PAID', 'UNPAID', 'PARTIAL'].includes(inv.status), 'Order invoice status must be valid');
    assert.ok(Number(inv.balance_amount) >= 0, 'Balance amount must be non-negative');
    totalBilled += Number(inv.grand_total);
    totalBalance += Number(inv.balance_amount);

    // Verify individual invoice lookup endpoint (allowed on basic)
    const singleInvRes = await fetch(`${BASE_URL}/invoices/${inv.id}`, { headers });
    assert.equal(singleInvRes.status, 200, `GET /invoices/${inv.id} must return 200`);
    const singleInv = await singleInvRes.json();
    assert.equal(singleInv.id, inv.id);

    // Verify PDF generation (allowed on basic)
    const pdfRes = await fetch(`${BASE_URL}/invoices/${inv.id}/pdf`, { headers });
    assert.equal(pdfRes.status, 200, `GET /invoices/${inv.id}/pdf must return 200`);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdfBytes = await pdfRes.arrayBuffer();
    assert.ok(pdfBytes.byteLength > 1000, 'Invoice PDF must be a valid non-empty PDF file');
  }
  assert.ok(invoicesFromOrders.length >= 4, 'Must have at least 4 order invoices');
  assert.ok(totalBalance >= 0, 'All invoices must have valid balance due');
  console.log(`    Total revenue collected across 4 orders: ₹${totalBilled.toFixed(2)}`);
  console.log(`    Verified Tax Invoice PDF generation for all 4 orders.`);

  // 10. Stock Ledger
  console.log('\n[10] Verifying Stock Ledger Entries...');
  const ledgerRes = await fetch(`${BASE_URL}/ledger`, { headers });
  assert.equal(ledgerRes.status, 200, 'GET /ledger must return 200');
  const ledgerData = await ledgerRes.json();
  const entries = Array.isArray(ledgerData) ? ledgerData : (ledgerData.data || ledgerData.entries || ledgerData.movements || []);
  console.log(`    Found ${entries.length} total ledger movements.`);
  assert.ok(entries.length >= 17, 'Must have at least 10 opening + 3 PO received + 4 SO dispatched movements');
  
  const inMovements = entries.filter((e: any) => e.movement_type === 'PURCHASE_RECEIPT' || e.movement_type === 'OPENING');
  const outMovements = entries.filter((e: any) => e.movement_type === 'SALES_DELIVERY');
  console.log(`    IN/OPENING movements: ${inMovements.length}, SALES_DELIVERY movements: ${outMovements.length}`);

  // 11. Dashboard Summary
  console.log('\n[11] Verifying Dashboard Summary...');
  const dashRes = await fetch(`${BASE_URL}/reports/dashboard`, { headers });
  assert.equal(dashRes.status, 200, 'GET /reports/dashboard must return 200');
  const dash = await dashRes.json();
  console.log('    Dashboard Stats:');
  console.log(`      - Total Products: ${dash.summary?.totalProducts}`);
  console.log(`      - Total Stock Units: ${dash.summary?.totalStockUnits}`);
  console.log(`      - Total Stock Valuation: ₹${dash.summary?.totalStockValue}`);
  console.log(`      - Total Orders: ${dash.summary?.totalOrders}`);
  console.log(`      - Total Customers: ${dash.summary?.totalCustomers}`);
  assert.equal(dash.summary.totalProducts, 10, 'Dashboard totalProducts must be 10');
  assert.ok(Number(dash.summary.totalStockUnits) > 0 && Number(dash.summary.totalStockUnits) <= 365, 'Dashboard totalStockUnits must be valid');
  assert.ok(Number(dash.summary.totalStockValue) > 0, 'Dashboard totalStockValue must be positive');
  assert.ok(dash.summary.totalOrders >= 4, 'Dashboard totalOrders must be at least 4');
  assert.equal(dash.summary.totalCustomers, 4, 'Dashboard totalCustomers must be 4');

  // 12. Basic Plan Enforcement (Forbidden Features)
  console.log('\n[12] Verifying Basic Plan Restrictions...');
  const transferRes = await fetch(`${BASE_URL}/transfers`, { headers });
  console.log(`    GET /transfers returned HTTP ${transferRes.status} (Transfers disabled in Basic plan)`);
  assert.equal(transferRes.status, 403, 'Transfers module must return 403 Forbidden for basic plan');

  const fullInvoicesRes = await fetch(`${BASE_URL}/invoices`, { headers });
  console.log(`    GET /invoices returned HTTP ${fullInvoicesRes.status} (Full Invoices module disabled in Basic plan)`);
  assert.equal(fullInvoicesRes.status, 403, 'Full Invoices list must return 403 Forbidden for basic plan');
  assert.equal(transferRes.status, 403, 'Transfers module must return 403 Forbidden for basic plan');

  console.log('\n========================================================================');
  console.log('       ALL LIVE FLOWS AND BASIC RESTRICTIONS VALIDATED SUCCESSFULLY!     ');
  console.log('========================================================================');
}

validateLiveFlow().catch((err) => {
  console.error('\n❌ VALIDATION FAILED:', err);
  process.exit(1);
});
