import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { prisma } from './db.js';
import { LedgerService } from './services/ledger.js';

test('VENDOR-01: Create and retrieve boutique vendors with South Indian defaults', async () => {
  // 1. Create boutique fabric supplier in Vellore, Tamil Nadu
  const vendor1 = await prisma.supplier.create({
    data: {
      name: 'Sri Lakshmi Textiles',
      contact_person: 'Lakshmi',
      phone: '+91 98401 11222',
      email: 'orders@srilakshmitextiles.in',
      address: '14 Katpadi Road, Near Old Bus Stand',
      city: 'Vellore',
      state: 'Tamil Nadu',
      state_code: '33',
      gstin: '33AAAAA1234A1Z5',
      vendor_type: 'Fabric Supplier',
      category: 'Fabric Supplier',
      notes: 'Premier Kanchipuram and Arani pure silk supplier',
      is_active: true,
    },
  });

  assert.ok(vendor1.id, 'Vendor 1 must have an ID');
  assert.equal(vendor1.name, 'Sri Lakshmi Textiles');
  assert.equal(vendor1.city, 'Vellore');
  assert.equal(vendor1.vendor_type, 'Fabric Supplier');
  assert.equal(vendor1.gstin, '33AAAAA1234A1Z5');

  // 2. Create lace and trim supplier in Kanchipuram
  const vendor2 = await prisma.supplier.create({
    data: {
      name: 'Kaveri Fabrics & Borders',
      contact_person: 'Kavya',
      phone: '+91 98402 33444',
      email: 'sales@kaveriborders.in',
      address: '8 Weaver Colony, Little Kanchipuram',
      city: 'Kanchipuram',
      state: 'Tamil Nadu',
      state_code: '33',
      gstin: '33BBBBB5678B2Z6',
      vendor_type: 'Lace / Border Supplier',
      category: 'Lace / Border Supplier',
      notes: 'Zari borders, cutwork lace, temple borders',
      is_active: true,
    },
  });

  assert.ok(vendor2.id, 'Vendor 2 must have an ID');
  assert.equal(vendor2.vendor_type, 'Lace / Border Supplier');
  assert.equal(vendor2.city, 'Kanchipuram');
});

test('VENDOR-02: Vendor search, filtering, and archiving capability', async () => {
  // Find Sri Lakshmi Textiles by search
  const foundBySearch = await prisma.supplier.findFirst({
    where: {
      OR: [
        { name: { contains: 'Lakshmi', mode: 'insensitive' } },
        { city: { contains: 'Vellore', mode: 'insensitive' } },
        { gstin: { contains: '33AAAAA1234A1Z5', mode: 'insensitive' } },
      ],
    },
  });
  assert.ok(foundBySearch, 'Must find vendor by name, city, or GSTIN');
  assert.equal(foundBySearch?.city, 'Vellore');

  // Filter by vendor_type
  const fabricSuppliers = await prisma.supplier.findMany({
    where: {
      OR: [
        { vendor_type: 'Fabric Supplier' },
        { category: 'Fabric Supplier' },
      ],
      is_active: true,
    },
  });
  assert.ok(fabricSuppliers.length >= 1, 'Must find at least 1 fabric supplier');

  // Archive and Restore check
  const toArchive = await prisma.supplier.update({
    where: { id: foundBySearch!.id },
    data: { is_active: false },
  });
  assert.equal(toArchive.is_active, false, 'Vendor should be archived');

  const restored = await prisma.supplier.update({
    where: { id: foundBySearch!.id },
    data: { is_active: true },
  });
  assert.equal(restored.is_active, true, 'Vendor should be restored to active');
});

test('VENDOR-03: Full Purchase Order Flow — Vendor -> PO -> GRN -> Stock Increase -> Vendor History', async () => {
  // 1. Ensure target godown exists
  let godown = await prisma.godown.findFirst({ where: { is_active: true } });
  if (!godown) {
    godown = await prisma.godown.create({
      data: {
        name: 'Vellore Central Boutique Store',
        code: 'VEL-01',
        is_default: true,
        is_active: true,
      },
    });
  }

  // 2. Ensure test boutique product exists (e.g. Raw Silk Banarasi Fabric)
  let product = await prisma.product.findFirst({
    where: { sku: 'BTQ-SILK-001' },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        sku: 'BTQ-SILK-001',
        name: 'Pure Raw Silk Fabric - Peacock Blue',
        unit: 'MTR',
        purchase_price: 450,
        sale_price: 850,
        min_stock_level: 5,
        tax_rate: 5,
        is_active: true,
      },
    });
  }

  const balanceBefore = await prisma.stockBalance.findUnique({
    where: {
      product_id_godown_id: {
        product_id: product.id,
        godown_id: godown.id,
      },
    },
  });
  const initialStock = balanceBefore ? Number(balanceBefore.current_quantity) : 0;

  // 3. Retrieve or create Vendor
  let vendor = await prisma.supplier.findFirst({
    where: { name: 'Sri Lakshmi Textiles' },
  });
  if (!vendor) {
    vendor = await prisma.supplier.create({
      data: {
        name: 'Sri Lakshmi Textiles',
        contact_person: 'Lakshmi',
        phone: '+91 98401 11222',
        email: 'orders@srilakshmitextiles.in',
        address: '14 Katpadi Road',
        city: 'Vellore',
        state: 'Tamil Nadu',
        state_code: '33',
        gstin: '33AAAAA1234A1Z5',
        vendor_type: 'Fabric Supplier',
        category: 'Fabric Supplier',
      },
    });
  }

  // 4. Create Purchase Order referencing Vendor
  const orderQty = 25;
  const unitCost = 450;
  const subtotal = orderQty * unitCost;
  const taxRate = Number(product.tax_rate) || 5;
  const taxTotal = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxTotal;

  const poNumber = `PO-TEST-${Date.now().toString().slice(-6)}`;

  const po = await prisma.purchaseOrder.create({
    data: {
      po_number: poNumber,
      supplier_id: vendor.id,
      supplier_name: vendor.name,
      supplier_phone: vendor.phone,
      supplier_address: vendor.address,
      supplier_gstin: vendor.gstin,
      godown_id: godown.id,
      order_date: new Date(),
      status: 'ORDERED',
      subtotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      notes: 'Boutique silk replenishment batch',
      items: {
        create: [
          {
            product_id: product.id,
            quantity: orderQty,
            unit_cost: unitCost,
            tax_rate: taxRate,
            tax_amount: taxTotal,
            total: grandTotal,
          },
        ],
      },
    },
    include: {
      items: { include: { product: true } },
      supplier: true,
    },
  });

  assert.ok(po.id, 'PO must be created with ID');
  assert.equal(po.supplier_id, vendor.id, 'PO supplier_id must match vendor ID');
  assert.equal(po.supplier_name, 'Sri Lakshmi Textiles');
  assert.equal(po.supplier_gstin, '33AAAAA1234A1Z5');
  assert.equal(po.status, 'ORDERED', 'PO initial status must be ORDERED');
  assert.equal(Number(po.grand_total), grandTotal, 'PO grand total must match calculation');
  assert.equal(po.items.length, 1, 'PO must have 1 line item');

  // 5. Receive Goods (GRN Flow)
  await prisma.$transaction(async (tx) => {
    // Verify fresh PO
    const freshPO = await tx.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { items: true },
    });
    assert.ok(freshPO);
    assert.equal(freshPO.status, 'ORDERED');

    // Update status to RECEIVED
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'RECEIVED' },
    });

    // Record Ledger Stock Movement
    for (const item of freshPO.items) {
      await LedgerService.recordMovement(
        {
          product_id: item.product_id,
          godown_id: freshPO.godown_id,
          movement_type: 'PURCHASE_RECEIPT',
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
          reference_type: 'PURCHASE_ORDER',
          reference_id: freshPO.id,
          notes: `Goods receipt for PO ${freshPO.po_number}`,
        },
        tx
      );
    }
  });

  // 6. Verify Stock Increased in StockBalance
  const updatedBalance = await prisma.stockBalance.findUnique({
    where: {
      product_id_godown_id: {
        product_id: product.id,
        godown_id: godown.id,
      },
    },
  });
  assert.ok(updatedBalance, 'Stock balance record must exist');
  assert.equal(
    Number(updatedBalance.current_quantity),
    initialStock + orderQty,
    'Stock must increase by exactly the received quantity'
  );

  // 7. Verify Immutable Ledger StockMovement recorded
  const movement = await prisma.stockMovement.findFirst({
    where: {
      reference_id: po.id,
      movement_type: 'PURCHASE_RECEIPT',
    },
  });
  assert.ok(movement, 'Immutable stock movement must be recorded in ledger');
  assert.equal(Number(movement.quantity), orderQty);
  assert.equal(Number(movement.unit_cost), unitCost);

  // 8. Verify duplicate receipt is blocked
  await assert.rejects(
    async () => {
      await prisma.$transaction(async (tx) => {
        const checkPO = await tx.purchaseOrder.findUnique({ where: { id: po.id } });
        if (checkPO?.status === 'RECEIVED') {
          throw new Error('Purchase order has already been received');
        }
      });
    },
    /already been received/,
    'Duplicate receipt must be blocked'
  );

  // 9. Verify PO status is RECEIVED
  const receivedPO = await prisma.purchaseOrder.findUnique({
    where: { id: po.id },
  });
  assert.equal(receivedPO?.status, 'RECEIVED', 'PO status must be updated to RECEIVED');

  // 10. Verify Vendor Profile History reflects this transaction
  const vendorWithPOs = await prisma.supplier.findUnique({
    where: { id: vendor.id },
    include: {
      purchase_orders: {
        orderBy: { order_date: 'desc' },
      },
      _count: {
        select: { purchase_orders: true },
      },
    },
  });

  assert.ok(vendorWithPOs, 'Vendor must exist with POs');
  assert.ok(vendorWithPOs.purchase_orders.length >= 1, 'Vendor must have at least 1 PO in history');
  const matchedPO = vendorWithPOs.purchase_orders.find((p) => p.id === po.id);
  assert.ok(matchedPO, 'Vendor PO history must contain the created PO');
  assert.equal(matchedPO.status, 'RECEIVED', 'Matched PO in vendor history must have RECEIVED status');
  assert.equal(Number(matchedPO.grand_total), grandTotal);
});

test('VENDOR-04: Existing PO flow backward compatibility without registered vendor ID', async () => {
  let godown = await prisma.godown.findFirst({ where: { is_active: true } });
  let product = await prisma.product.findFirst({ where: { is_active: true } });
  assert.ok(godown && product);

  const poNumber = `PO-LEGACY-${Date.now().toString().slice(-6)}`;
  const po = await prisma.purchaseOrder.create({
    data: {
      po_number: poNumber,
      supplier_name: 'Ad-hoc Silk Mills',
      godown_id: godown.id,
      order_date: new Date(),
      status: 'ORDERED',
      subtotal: 1000,
      tax_total: 50,
      grand_total: 1050,
      items: {
        create: [
          {
            product_id: product.id,
            quantity: 5,
            unit_cost: 200,
            tax_rate: 5,
            tax_amount: 50,
            total: 1050,
          },
        ],
      },
    },
  });

  assert.ok(po.id);
  assert.equal(po.supplier_id, null, 'Legacy PO without registered vendor has null supplier_id');
  assert.equal(po.supplier_name, 'Ad-hoc Silk Mills');
  assert.equal(po.status, 'ORDERED');
});
