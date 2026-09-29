import test from 'node:test';
import assert from 'node:assert/strict';
import './env.js';
import { prisma } from './db.js';
import { LicenseService } from './license/index.js';

test('PASUMAI UNAVAGAM: Comprehensive Verification of Tamil Nadu Dataset & Flows', async () => {
  // 1. Verify Company Settings
  console.log('1. Verifying Pasumai Unavagam Company Settings...');
  const settings = await prisma.companySettings.findUnique({
    where: { id: 'default_settings' },
  });
  assert.ok(settings, 'Company settings record must exist');
  assert.equal(settings.company_name, 'Pasumai Unavagam');
  assert.equal(settings.legal_name, 'Pasumai Unavagam Naturals Private Limited');
  assert.equal(settings.state_code, '33', 'Tamil Nadu state code must be 33');
  assert.match(settings.address || '', /Vellore, Tamil Nadu/);

  // 2. Verify Primary Godown
  console.log('2. Verifying Primary Godown...');
  const godown = await prisma.godown.findFirst({ where: { is_default: true } });
  assert.ok(godown, 'Default godown must exist');
  assert.equal(godown.name, 'Vellore Main Godown');
  assert.equal(godown.code, 'MAIN-01');
  assert.equal(godown.state_code, '33');
  assert.equal(godown.is_active, true);

  // 3. Verify exactly 10 Excel Products
  console.log('3. Verifying 10 Excel Products...');
  const products = await prisma.product.findMany({
    include: {
      category: true,
      stock_balances: true,
      stock_movements: true,
    },
    orderBy: { sku: 'asc' },
  });
  assert.equal(products.length, 10, 'Must have exactly 10 products from Excel');

  const expectedSkus = [
    'ORG-DAL-001',
    'ORG-JAG-001',
    'ORG-MIL-001',
    'ORG-MIL-002',
    'ORG-MIL-003',
    'ORG-MIL-004',
    'ORG-MIL-005',
    'ORG-RIC-001',
    'ORG-SUG-001',
    'ORG-SUG-002',
  ];
  assert.deepEqual(products.map((p) => p.sku), expectedSkus);

  // Verify Categories
  const categories = await prisma.productCategory.findMany();
  const categoryNames = categories.map((c) => c.name);
  assert.ok(categoryNames.includes('Organic Millets'));
  assert.ok(categoryNames.includes('Organic Sugar'));
  assert.ok(categoryNames.includes('Organic Jaggery'));
  assert.ok(categoryNames.includes('Organic Rice'));
  assert.ok(categoryNames.includes('Organic Pulses'));

  // 4. Verify Customers (Exact Names: Harsh, Vijay, Kavi, Pranav)
  console.log('4. Verifying Customers...');
  const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
  assert.equal(customers.length, 4, 'Must have exactly 4 customers');
  const customerNames = customers.map((c) => c.name);
  assert.deepEqual(customerNames, ['Harsh', 'Kavi', 'Pranav', 'Vijay']);
  for (const c of customers) {
    assert.equal(c.state_code, '33', 'Customer must be in Tamil Nadu');
  }

  // 5. Verify Suppliers (Tamil Nadu)
  console.log('5. Verifying Suppliers...');
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  assert.equal(suppliers.length, 3, 'Must have exactly 3 suppliers');
  const supplierNames = suppliers.map((s) => s.name);
  assert.deepEqual(supplierNames, [
    'Kaveri Naturals',
    'Sri Venkateswara Organic Foods',
    'Tamilnadu Green Harvest',
  ]);

  // 6. Verify Purchase Orders & GRN
  console.log('6. Verifying Purchase Orders & Goods Receipt...');
  const pos = await prisma.purchaseOrder.findMany({
    include: { items: true },
    orderBy: { po_number: 'asc' },
  });
  assert.equal(pos.length, 3, 'Must have 3 purchase orders');
  for (const po of pos) {
    assert.equal(po.status, 'RECEIVED', 'All POs must be received');
  }

  // 7. Verify Sales Orders, Dispatches & Invoices
  console.log('7. Verifying Sales Orders, Dispatches & Invoices...');
  const sos = await prisma.salesOrder.findMany({
    include: { items: true, invoices: true },
    orderBy: { order_number: 'asc' },
  });
  assert.ok(sos.length >= 4, 'Must have at least 4 sales orders');
  for (const so of sos) {
    assert.ok(['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(so.status), 'SO status must be valid');
    if (so.status === 'DELIVERED') {
      assert.ok(so.invoices.length >= 1, 'Each dispatched SO must have at least 1 invoice');
      assert.ok(['PAID', 'UNPAID', 'PARTIAL'].includes(so.invoices[0].status), 'Invoice status must be valid');
    }
  }

  // 8. Verify Payments
  console.log('8. Verifying Payments...');
  const payments = await prisma.payment.findMany();
  assert.ok(payments.length >= 4, 'Must have at least 4 payments recorded');

  // 9. Verify Stock Math per SKU
  console.log('9. Verifying Stock Math per SKU...');
  let sumOpening = 0;
  let sumGrn = 0;
  let sumDispatch = 0;
  let sumCurrent = 0;

  for (const p of products) {
    const openingMv = p.stock_movements.find((m) => m.reference_type === 'OPENING_STOCK');
    const openingQty = openingMv ? Number(openingMv.quantity) : 0;

    const grnMvs = p.stock_movements.filter((m) => m.movement_type === 'PURCHASE_RECEIPT');
    const grnQty = grnMvs.reduce((s, m) => s + Number(m.quantity), 0);

    const dispatchMvs = p.stock_movements.filter((m) => m.movement_type === 'SALES_DELIVERY');
    const dispatchQty = dispatchMvs.reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);

    const calcStock = openingQty + grnQty - dispatchQty;
    const actualStock = Number(p.stock_balances[0]?.current_quantity ?? 0);

    assert.equal(
      calcStock,
      actualStock,
      `Stock balance mismatch for SKU ${p.sku}: calc=${calcStock}, db=${actualStock}`
    );

    sumOpening += openingQty;
    sumGrn += grnQty;
    sumDispatch += dispatchQty;
    sumCurrent += actualStock;
  }

  assert.equal(sumOpening, 255, 'Total opening stock must be 255 units');
  assert.equal(sumGrn, 110, 'Total GRN stock IN must be 110 units');
  assert.ok(sumDispatch >= 39, `Total dispatched stock OUT must be at least 39 units (actual: ${sumDispatch})`);
  assert.equal(sumOpening + sumGrn - sumDispatch, sumCurrent, `Total stock balance must reconcile: ${sumOpening} + ${sumGrn} - ${sumDispatch} == ${sumCurrent}`);

  // 10. Verify Basic Plan Restrictions & License
  console.log('10. Verifying Basic Plan Restrictions...');
  const entitlements = await LicenseService.getEntitlements();
  assert.equal(entitlements.plan, 'basic');
  assert.equal(entitlements.state.state, 'active');
  assert.equal(await LicenseService.hasModule('multi_godown'), false);
  assert.equal(await LicenseService.hasModule('transfers'), false);
  assert.equal(await LicenseService.hasModule('ledger_ui'), false);
  assert.equal(await LicenseService.hasModule('reports_advanced'), false);

  console.log('✅ ALL PASUMAI UNAVAGAM VERIFICATIONS PASSED PERFECTLY!');
});
