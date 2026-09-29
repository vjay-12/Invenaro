import '../env.js';
import { prisma } from '../db.js';
import { LedgerService } from '../services/ledger.js';
import xlsx from 'xlsx';
import path from 'path';

async function main() {
  console.log('========================================================================');
  console.log('       PASUMAI UNAVAGAM — TAMIL NADU DATASET INITIALIZATION             ');
  console.log('========================================================================\n');

  // Safety Verification
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes(':5435') && !dbUrl.includes('invenaro_local_basic')) {
    throw new Error(`CRITICAL ABORT: DATABASE_URL does not point to local_basic! URL: ${dbUrl}`);
  }
  if (dbUrl.includes('neon.tech')) {
    throw new Error('CRITICAL ABORT: DATABASE_URL contains neon.tech!');
  }

  const identity: any = await prisma.$queryRawUnsafe(
    'SELECT current_database(), current_user, inet_server_port();'
  );
  console.log('✓ Target Database Confirmed:');
  console.log(`    Database: ${identity[0].current_database}`);
  console.log(`    User:     ${identity[0].current_user}`);
  console.log(`    Port:     ${identity[0].inet_server_port}\n`);

  if (identity[0].current_database !== 'invenaro_local_basic') {
    throw new Error('CRITICAL ABORT: Connected database is NOT invenaro_local_basic!');
  }

  // 1. Safe Cleanup of Existing Test Data
  console.log('[Step 1] Safely removing previous demo/test data...');
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.stockTransferItem.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.stockAdjustmentItem.deleteMany({});
  await prisma.stockAdjustment.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stockBalance.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});
  console.log('    ✓ All previous transactional test data cleaned cleanly.\n');

  // 2. Setup Company Settings for "Pasumai Unavagam"
  console.log('[Step 2] Configuring Company Settings for Pasumai Unavagam...');
  const company = await prisma.companySettings.upsert({
    where: { id: 'default_settings' },
    update: {
      company_name: 'Pasumai Unavagam',
      legal_name: 'Pasumai Unavagam Naturals Private Limited',
      phone: '+91 94432 10987',
      email: 'contact@pasumaiunavagam.in',
      address: 'Katpadi Road, Vellore, Tamil Nadu - 632004',
      state_code: '33',
      gstin: '33AAAAA0000A1Z5',
      enable_gst: true,
    },
    create: {
      id: 'default_settings',
      company_name: 'Pasumai Unavagam',
      legal_name: 'Pasumai Unavagam Naturals Private Limited',
      phone: '+91 94432 10987',
      email: 'contact@pasumaiunavagam.in',
      address: 'Katpadi Road, Vellore, Tamil Nadu - 632004',
      state_code: '33',
      gstin: '33AAAAA0000A1Z5',
      enable_gst: true,
    },
  });
  console.log(`    ✓ Company: ${company.company_name} | Address: ${company.address} (State Code: ${company.state_code})\n`);

  // 3. Setup Primary Tamil Nadu Godown
  console.log('[Step 3] Configuring Primary Godown (Vellore Main Godown)...');
  let godown = await prisma.godown.findFirst({ where: { is_default: true } });
  if (godown) {
    godown = await prisma.godown.update({
      where: { id: godown.id },
      data: {
        name: 'Vellore Main Godown',
        code: 'MAIN-01',
        address: 'Katpadi Road, Vellore, Tamil Nadu - 632004',
        state_code: '33',
        gstin: '33AAAAA0000A1Z5',
        is_default: true,
        is_active: true,
      },
    });
  } else {
    godown = await prisma.godown.create({
      data: {
        name: 'Vellore Main Godown',
        code: 'MAIN-01',
        address: 'Katpadi Road, Vellore, Tamil Nadu - 632004',
        state_code: '33',
        gstin: '33AAAAA0000A1Z5',
        is_default: true,
        is_active: true,
      },
    });
  }
  // Clean up any empty stale godowns without stock balances or movements
  await prisma.godown.deleteMany({
    where: {
      is_default: false,
      stock_balances: { none: {} },
      stock_movements: { none: {} },
    },
  });
  console.log(`    ✓ Godown: ${godown.name} (${godown.code}) | Location: ${godown.address}\n`);

  // Update dev-admin user assignment
  const devAdmin = await prisma.user.findUnique({ where: { email: 'dev-admin@invenaro.local' } });
  if (devAdmin) {
    await prisma.user.update({
      where: { id: devAdmin.id },
      data: { assigned_godown_id: godown.id, name: 'Admin - Pasumai Unavagam' },
    });
  }

  // 4. Import the 10 Products from Excel
  console.log('[Step 4] Reading and importing 10 products from invenaro_organic_products_10(1).xlsx...');
  const excelPath = path.resolve(process.cwd(), 'invenaro_organic_products_10(1).xlsx');
  const wb = xlsx.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawProducts: any[] = xlsx.utils.sheet_to_json(sheet);

  console.log(`    Found ${rawProducts.length} product records in Excel.`);

  const categoryMap = new Map<string, string>();
  const productMap = new Map<string, any>();

  for (const row of rawProducts) {
    const catName = String(row.category).trim();
    if (!categoryMap.has(catName)) {
      const cat = await prisma.productCategory.upsert({
        where: { name: catName },
        update: {},
        create: {
          name: catName,
          description: `Certified organic ${catName.toLowerCase()}`,
        },
      });
      categoryMap.set(catName, cat.id);
    }
    const catId = categoryMap.get(catName)!;

    const sku = String(row.sku).trim();
    const name = String(row.name).trim();
    const unit = String(row.unit_of_measure || 'pkt').trim().toLowerCase();
    const costPrice = Number(row.cost_price);
    const salePrice = Number(row.sell_price);
    const taxRate = Number(row.tax_rate ?? 5);
    const initialStock = Number(row.available_stock ?? 0);
    const minStock = Number(row.reorder_point ?? 10);
    const hsnCode = String(row.tax_code ?? '').trim();

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        category: { connect: { id: catId } },
        unit,
        purchase_price: costPrice,
        sale_price: salePrice,
        tax_rate: taxRate,
        min_stock_level: minStock,
        hsn_code: hsnCode,
        is_active: true,
      },
    });

    // Record Opening Stock Movement & Stock Balance
    if (initialStock > 0) {
      await LedgerService.recordMovement({
        product_id: product.id,
        godown_id: godown.id,
        movement_type: 'ADJUSTMENT_ADD',
        quantity: initialStock,
        unit_cost: costPrice,
        reference_type: 'OPENING_STOCK',
        reference_id: product.id,
        notes: `Opening stock initialization for ${product.name}`,
        created_by: devAdmin?.id,
      });
    }

    productMap.set(sku, product);
    console.log(`    + Imported SKU: [${sku}] ${name} | Qty: ${initialStock} ${unit} | Cost: ₹${costPrice} | Sell: ₹${salePrice}`);
  }
  console.log(`    ✓ Exactly ${productMap.size} products created with initial opening stock.\n`);

  // 5. Create Realistic Tamil Nadu Suppliers
  console.log('[Step 5] Creating Tamil Nadu Suppliers...');
  const suppliersData = [
    {
      name: 'Sri Venkateswara Organic Foods',
      phone: '+91 94441 23456',
      email: 'orders@svorganicfoods.in',
      address: 'Kallakurichi Main Road, Salem, Tamil Nadu - 636001',
      state_code: '33',
      gstin: '33AABCS1234D1Z1',
    },
    {
      name: 'Kaveri Naturals',
      phone: '+91 98422 34567',
      email: 'supply@kaverinaturals.in',
      address: 'Perundurai Road, Erode, Tamil Nadu - 638011',
      state_code: '33',
      gstin: '33AABCK5678E1Z2',
    },
    {
      name: 'Tamilnadu Green Harvest',
      phone: '+91 97890 45678',
      email: 'contact@tngreenharvest.com',
      address: 'Avinashi Road, Coimbatore, Tamil Nadu - 641014',
      state_code: '33',
      gstin: '33AABCT9012F1Z3',
    },
  ];

  const supplierMap = new Map<string, any>();
  for (const s of suppliersData) {
    const created = await prisma.supplier.create({ data: s });
    supplierMap.set(s.name, created);
    console.log(`    + Supplier: ${created.name} (${created.address?.split(',')[1]?.trim() || 'Tamil Nadu'})`);
  }
  console.log('');

  // 6. Create Exact Customers
  console.log('[Step 6] Creating Customers (Exact Names: Harsh, Vijay, Kavi, Pranav)...');
  const customersData = [
    {
      name: 'Harsh',
      phone: '+91 98401 11223',
      email: 'harsh@vellore.in',
      address: 'Gandhi Nagar, Vellore, Tamil Nadu - 632006',
      state_code: '33',
    },
    {
      name: 'Vijay',
      phone: '+91 98402 22334',
      email: 'vijay@katpadi.in',
      address: 'Chittoor Bus Stand Road, Katpadi, Vellore, Tamil Nadu - 632014',
      state_code: '33',
    },
    {
      name: 'Kavi',
      phone: '+91 98403 33445',
      email: 'kavi@ranipet.in',
      address: 'MBR Road, Navalpur, Ranipet, Tamil Nadu - 632401',
      state_code: '33',
    },
    {
      name: 'Pranav',
      phone: '+91 98404 44556',
      email: 'pranav@chennai.in',
      address: 'Anna Nagar West, Chennai, Tamil Nadu - 600040',
      state_code: '33',
    },
  ];

  const customerMap = new Map<string, any>();
  for (const c of customersData) {
    const created = await prisma.customer.create({ data: c });
    customerMap.set(c.name, created);
    console.log(`    + Customer: ${created.name} | Address: ${created.address}`);
  }
  console.log('');

  // 7. Create Purchase Orders & Execute GRN (Receive Goods)
  console.log('[Step 7 & 8] Creating Purchase Orders & Executing GRN (Goods Receipt)...');
  const poBatches = [
    {
      supplier: 'Sri Venkateswara Organic Foods',
      items: [
        { sku: 'ORG-MIL-001', qty: 10 },
        { sku: 'ORG-MIL-002', qty: 15 },
        { sku: 'ORG-MIL-003', qty: 15 },
      ],
      notes: 'Fresh harvest millet batch delivery',
    },
    {
      supplier: 'Kaveri Naturals',
      items: [
        { sku: 'ORG-SUG-001', qty: 20 },
        { sku: 'ORG-JAG-001', qty: 20 },
      ],
      notes: 'Organic sweeteners stock replenishment',
    },
    {
      supplier: 'Tamilnadu Green Harvest',
      items: [
        { sku: 'ORG-RIC-001', qty: 15 },
        { sku: 'ORG-DAL-001', qty: 15 },
      ],
      notes: 'Rice and pulses direct from organic farm',
    },
  ];

  let poIndex = 1;
  const createdPOs: any[] = [];

  for (const batch of poBatches) {
    const supplier = supplierMap.get(batch.supplier);
    const poNumber = `PO-2026-${String(poIndex).padStart(4, '0')}`;
    poIndex++;

    let subtotal = 0;
    let taxTotal = 0;

    const poItemsData = batch.items.map((it) => {
      const prod = productMap.get(it.sku);
      const unitCost = Number(prod.purchase_price);
      const taxRate = Number(prod.tax_rate ?? 5);
      const lineSubtotal = it.qty * unitCost;
      const lineTax = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxTotal += lineTax;

      return {
        product_id: prod.id,
        quantity: it.qty,
        unit_cost: unitCost,
        tax_rate: taxRate,
        tax_amount: lineTax,
        total: lineTotal,
      };
    });

    const grandTotal = subtotal + taxTotal;

    // Create PO
    const po = await prisma.purchaseOrder.create({
      data: {
        po_number: poNumber,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_phone: supplier.phone,
        supplier_address: supplier.address,
        supplier_gstin: supplier.gstin,
        godown_id: godown.id,
        order_date: new Date(),
        status: 'ORDERED',
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        notes: batch.notes,
        created_by: devAdmin?.id,
        items: { create: poItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    console.log(`    + Created PO ${po.po_number} with ${supplier.name} (Subtotal: ₹${subtotal.toFixed(2)}, Grand Total: ₹${grandTotal.toFixed(2)})`);

    // Receive Goods / GRN
    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'RECEIVED' },
      });

      for (const item of po.items) {
        await LedgerService.recordMovement(
          {
            product_id: item.product_id,
            godown_id: godown.id,
            movement_type: 'PURCHASE_RECEIPT',
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost),
            reference_type: 'PURCHASE_ORDER',
            reference_id: po.id,
            notes: `Goods receipt for PO ${po.po_number}: ${batch.notes}`,
            created_by: devAdmin?.id,
          },
          tx
        );
      }
    });

    console.log(`      ✓ GRN Received: ${batch.items.reduce((s, i) => s + i.qty, 0)} items posted to ledger & stock balance.`);
    createdPOs.push(po);
  }
  console.log('');

  // 8. Create Sales Orders, Dispatch & Issue Invoices
  console.log('[Step 9 & 10] Creating Sales Orders, Dispatching & Issuing Invoices...');
  const soBatches = [
    {
      customer: 'Harsh',
      items: [
        { sku: 'ORG-MIL-001', qty: 5 },
        { sku: 'ORG-SUG-001', qty: 5 },
      ],
      notes: 'Retail order for home delivery in Gandhi Nagar',
      paymentMethod: 'UPI',
    },
    {
      customer: 'Vijay',
      items: [
        { sku: 'ORG-MIL-002', qty: 6 },
        { sku: 'ORG-RIC-001', qty: 4 },
      ],
      notes: 'Counter pickup at Katpadi branch',
      paymentMethod: 'CASH',
    },
    {
      customer: 'Kavi',
      items: [
        { sku: 'ORG-MIL-003', qty: 5 },
        { sku: 'ORG-JAG-001', qty: 5 },
      ],
      notes: 'Weekly organic pantry replenishment',
      paymentMethod: 'UPI',
    },
    {
      customer: 'Pranav',
      items: [
        { sku: 'ORG-MIL-004', qty: 4 },
        { sku: 'ORG-DAL-001', qty: 5 },
      ],
      notes: 'Courier dispatch to Chennai address',
      paymentMethod: 'BANK_TRANSFER',
    },
  ];

  let soIndex = 1;
  const createdInvoices: any[] = [];

  for (const batch of soBatches) {
    const customer = customerMap.get(batch.customer);
    const soNumber = `SO-2026-${String(soIndex).padStart(4, '0')}`;
    const invNumber = `INV-2026-${String(soIndex).padStart(4, '0')}`;
    soIndex++;

    let subtotal = 0;
    let taxTotal = 0;

    const soItemsData = batch.items.map((it) => {
      const prod = productMap.get(it.sku);
      const unitPrice = Number(prod.sale_price);
      const taxRate = Number(prod.tax_rate ?? 5);
      const lineSubtotal = it.qty * unitPrice;
      const lineTax = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxTotal += lineTax;

      return {
        product_id: prod.id,
        quantity: it.qty,
        unit_price: unitPrice,
        discount: 0,
        tax_rate: taxRate,
        tax_amount: lineTax,
        total: lineTotal,
      };
    });

    const grandTotal = subtotal + taxTotal;

    // Create Sales Order
    const so = await prisma.salesOrder.create({
      data: {
        order_number: soNumber,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        godown_id: godown.id,
        order_date: new Date(),
        status: 'CONFIRMED',
        subtotal,
        tax_total: taxTotal,
        discount_total: 0,
        grand_total: grandTotal,
        notes: batch.notes,
        created_by: devAdmin?.id,
        items: { create: soItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    console.log(`    + Created SO ${so.order_number} for ${customer.name} (Subtotal: ₹${subtotal.toFixed(2)}, Tax: ₹${taxTotal.toFixed(2)}, Grand Total: ₹${grandTotal.toFixed(2)})`);

    // Dispatch Order, Deduct Stock & Generate Invoice
    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.salesOrder.update({
        where: { id: so.id },
        data: { status: 'DELIVERED' },
      });

      for (const item of so.items) {
        await LedgerService.recordMovement(
          {
            product_id: item.product_id,
            godown_id: godown.id,
            movement_type: 'SALES_DELIVERY',
            quantity: -Number(item.quantity),
            unit_cost: Number(item.unit_price),
            reference_type: 'SALES_ORDER',
            reference_id: so.id,
            notes: `Delivery for order ${so.order_number}`,
            created_by: devAdmin?.id,
          },
          tx
        );
      }

      const invoice = await tx.invoice.create({
        data: {
          invoice_number: invNumber,
          reference_order_id: so.id,
          customer_id: customer.id,
          godown_id: godown.id,
          subtotal,
          tax_total: taxTotal,
          grand_total: grandTotal,
          balance_amount: grandTotal,
          status: 'ISSUED',
        },
      });

      return { order: updatedOrder, invoice };
    });

    console.log(`      ✓ Dispatched & Issued Tax Invoice: ${result.invoice.invoice_number}`);
    createdInvoices.push({ invoice: result.invoice, paymentMethod: batch.paymentMethod, customer: customer.name });
  }
  console.log('');

  // 9. Record Payments
  console.log('[Step 11] Recording Customer Payments for all Invoices...');
  let payIndex = 1;
  for (const entry of createdInvoices) {
    const inv = entry.invoice;
    const payNumber = `PAY-2026-${String(payIndex).padStart(4, '0')}`;
    payIndex++;

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          payment_number: payNumber,
          invoice_id: inv.id,
          customer_id: inv.customer_id,
          amount: inv.grand_total,
          payment_mode: entry.paymentMethod,
          notes: `Settlement for invoice ${inv.invoice_number} via ${entry.paymentMethod}`,
        },
      });

      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          status: 'PAID',
          paid_amount: inv.grand_total,
          balance_amount: 0,
        },
      });

      return p;
    });

    console.log(`    ✓ Payment ${payment.payment_number}: Received ₹${Number(inv.grand_total).toFixed(2)} from ${entry.customer} via ${entry.paymentMethod} (Invoice ${inv.invoice_number} marked PAID)`);
  }
  console.log('');

  // 10. Stock / Ledger Reconciliation Audit
  console.log('[Step 12] Performing Exact Stock Reconciliation per SKU...');
  console.log('----------------------------------------------------------------------------------------------------------');
  console.log('SKU         | Product Name                     | Opening | GRN IN | Dispatched | Current | Status');
  console.log('----------------------------------------------------------------------------------------------------------');

  const allProducts = await prisma.product.findMany({
    include: {
      stock_balances: true,
      stock_movements: true,
    },
    orderBy: { sku: 'asc' },
  });

  let totalOpeningUnits = 0;
  let totalGrnUnits = 0;
  let totalDispatchedUnits = 0;
  let totalCurrentUnits = 0;
  let totalStockValuation = 0;

  for (const prod of allProducts) {
    const openingMv = prod.stock_movements.find((m) => m.reference_type === 'OPENING_STOCK');
    const openingQty = openingMv ? Number(openingMv.quantity) : 0;

    const grnMvs = prod.stock_movements.filter((m) => m.movement_type === 'PURCHASE_RECEIPT');
    const grnQty = grnMvs.reduce((sum, m) => sum + Number(m.quantity), 0);

    const dispatchMvs = prod.stock_movements.filter((m) => m.movement_type === 'SALES_DELIVERY');
    const dispatchQty = dispatchMvs.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);

    const calculatedStock = openingQty + grnQty - dispatchQty;
    const balanceRecord = prod.stock_balances[0];
    const actualDbStock = balanceRecord ? Number(balanceRecord.current_quantity) : 0;

    const match = calculatedStock === actualDbStock;

    totalOpeningUnits += openingQty;
    totalGrnUnits += grnQty;
    totalDispatchedUnits += dispatchQty;
    totalCurrentUnits += actualDbStock;
    totalStockValuation += actualDbStock * Number(prod.purchase_price);

    console.log(
      `${prod.sku.padEnd(11)} | ${prod.name.slice(0, 32).padEnd(32)} | ${String(openingQty).padStart(7)} | ${String(grnQty).padStart(6)} | ${String(dispatchQty).padStart(10)} | ${String(actualDbStock).padStart(7)} | ${match ? 'MATCH ✓' : 'MISMATCH ✗'}`
    );

    if (!match) {
      throw new Error(`Stock mismatch for ${prod.sku}! Calc: ${calculatedStock}, DB: ${actualDbStock}`);
    }
  }

  console.log('----------------------------------------------------------------------------------------------------------');
  console.log(`TOTALS      | 10 SKUs                          | ${String(totalOpeningUnits).padStart(7)} | ${String(totalGrnUnits).padStart(6)} | ${String(totalDispatchedUnits).padStart(10)} | ${String(totalCurrentUnits).padStart(7)} | RECONCILED ✓`);
  console.log('----------------------------------------------------------------------------------------------------------\n');

  // 11. Live Dashboard Endpoint Check
  console.log('[Step 13] Verifying Dashboard API output...');
  const dashMetrics = await prisma.$transaction(async (tx) => {
    const [pCount, oCount, cCount, balances, movements] = await Promise.all([
      tx.product.count({ where: { is_active: true } }),
      tx.salesOrder.count(),
      tx.customer.count(),
      tx.stockBalance.findMany({ include: { product: true } }),
      tx.stockMovement.findMany({ take: 5, orderBy: { created_at: 'desc' }, include: { product: true } }),
    ]);

    let units = 0;
    let val = 0;
    balances.forEach((b) => {
      const q = Number(b.current_quantity);
      units += q;
      val += q * Number(b.product.purchase_price);
    });

    return { pCount, oCount, cCount, units, val, movementsCount: movements.length };
  });

  console.log(`    Total Products:     ${dashMetrics.pCount}`);
  console.log(`    Total Sales Orders: ${dashMetrics.oCount}`);
  console.log(`    Total Customers:    ${dashMetrics.cCount}`);
  console.log(`    Total Stock Units:  ${dashMetrics.units}`);
  console.log(`    Total Valuation:    ₹${dashMetrics.val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
  console.log(`    Recent Movements:   ${dashMetrics.movementsCount} available in feed`);

  console.log('\n========================================================================');
  console.log('       PASUMAI UNAVAGAM DATASET COMPLETED & VERIFIED SUCCESSFULLY       ');
  console.log('========================================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
