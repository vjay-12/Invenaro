import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { prisma } from './db.js';
import { MeasurementTemplateService } from './services/measurementTemplateService.js';
import { CustomerMeasurementService } from './services/customerMeasurementService.js';

test('BOUTIQUE-01: Seed and verify default South-Indian measurement templates', async () => {
  await MeasurementTemplateService.ensureDefaultTemplates();

  const templates = await MeasurementTemplateService.getAllTemplates();
  assert.ok(templates.length >= 4, 'Must have at least 4 default templates');

  const codes = templates.map((t) => t.code);
  assert.ok(codes.includes('SAREE_BLOUSE'), 'Must include SAREE_BLOUSE');
  assert.ok(codes.includes('CHURIDAR_SALWAR'), 'Must include CHURIDAR_SALWAR');
  assert.ok(codes.includes('KURTI'), 'Must include KURTI');
  assert.ok(codes.includes('PANTS_BOTTOM'), 'Must include PANTS_BOTTOM');

  // Verify Saree Blouse fields
  const blouse = templates.find((t) => t.code === 'SAREE_BLOUSE');
  assert.ok(blouse, 'Saree Blouse template must exist');
  assert.ok(blouse.fields.length >= 19, 'Saree Blouse must have at least 19 fields');
  const fieldKeys = blouse.fields.map((f) => f.field_key);
  assert.ok(fieldKeys.includes('shoulder'));
  assert.ok(fieldKeys.includes('bust'));
  assert.ok(fieldKeys.includes('waist'));
  assert.ok(fieldKeys.includes('armhole'));
  assert.ok(fieldKeys.includes('blouse_length'));
  assert.ok(fieldKeys.includes('front_neck_depth'));
  assert.ok(fieldKeys.includes('back_neck_depth'));
});

test('BOUTIQUE-02: Customer Measurement Profile creation & versioned history', async () => {
  // 1. Create a demo boutique customer (e.g. Priya)
  const customer = await prisma.customer.create({
    data: {
      name: 'Priya Sundaram',
      phone: '+91 98401 23456',
      email: 'priya.boutique@test.local',
      address: '12 Temple Street, Mylapore, Chennai',
      state_code: '33',
    },
  });

  const blouseTemplate = await prisma.measurementTemplate.findUnique({
    where: { code: 'SAREE_BLOUSE' },
    include: { fields: true },
  });
  assert.ok(blouseTemplate, 'Blouse template must exist');

  const shoulderField = blouseTemplate.fields.find((f) => f.field_key === 'shoulder')!;
  const bustField = blouseTemplate.fields.find((f) => f.field_key === 'bust')!;
  const waistField = blouseTemplate.fields.find((f) => f.field_key === 'waist')!;
  const armholeField = blouseTemplate.fields.find((f) => f.field_key === 'armhole')!;
  const lengthField = blouseTemplate.fields.find((f) => f.field_key === 'blouse_length')!;

  // 2. Initial Measurement Profile (v1)
  const profile = await CustomerMeasurementService.createProfile(customer.id, {
    template_id: blouseTemplate.id,
    profile_name: 'Saree Blouse (Silk Zari)',
    notes: 'Deep back neck with latkan, elbow length sleeves',
    measured_by: 'Master Tailor Murugan',
    measured_at: new Date('2026-08-10'),
    values: [
      { field_id: lengthField.id, numeric_value: 14.5, unit: 'in' },
      { field_id: shoulderField.id, numeric_value: 14.0, unit: 'in' },
      { field_id: bustField.id, numeric_value: 36.0, unit: 'in' },
      { field_id: waistField.id, numeric_value: 30.0, unit: 'in' },
      { field_id: armholeField.id, numeric_value: 16.0, unit: 'in' },
    ],
  });

  assert.ok(profile.id, 'Profile ID must be generated');

  // Verify initial profile state
  const profiles = await CustomerMeasurementService.getProfilesByCustomer(customer.id);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].profile_name, 'Saree Blouse (Silk Zari)');
  assert.equal(profiles[0].total_versions, 1);
  assert.equal(profiles[0].current_version?.version_number, 1);
  assert.equal(profiles[0].current_version?.is_current, true);

  const v1Bust = profiles[0].current_version?.values.find((v) => v.field_key === 'bust');
  assert.equal(v1Bust?.numeric_value, 36.0);

  // 3. Add second measurement version (v2 - e.g. festival fitting adjustment)
  const newVersion = await CustomerMeasurementService.addProfileVersion(customer.id, profile.id, {
    notes: 'Loosened bust by 0.5 inch as requested for Diwali saree',
    measured_by: 'Senior Tailor Revathi',
    measured_at: new Date('2026-10-04'),
    values: [
      { field_id: lengthField.id, numeric_value: 14.5, unit: 'in' },
      { field_id: shoulderField.id, numeric_value: 14.0, unit: 'in' },
      { field_id: bustField.id, numeric_value: 36.5, unit: 'in', notes: 'Added 0.5 inch margin' },
      { field_id: waistField.id, numeric_value: 30.5, unit: 'in' },
      { field_id: armholeField.id, numeric_value: 16.5, unit: 'in' },
    ],
  });

  assert.equal(newVersion.version_number, 2);
  assert.equal(newVersion.is_current, true);

  // 4. Verify history preservation
  const history = await CustomerMeasurementService.getProfileHistory(customer.id, profile.id);
  assert.ok(history, 'History must be retrieved');
  assert.equal(history.versions.length, 2, 'Must have exactly 2 versions in history');

  const historyV2 = history.versions.find((v) => v.version_number === 2);
  const historyV1 = history.versions.find((v) => v.version_number === 1);

  assert.equal(historyV2?.is_current, true);
  assert.equal(historyV1?.is_current, false);

  const histV2Bust = historyV2?.values.find((v) => v.field_key === 'bust');
  const histV1Bust = historyV1?.values.find((v) => v.field_key === 'bust');

  assert.equal(histV2Bust?.numeric_value, 36.5);
  assert.equal(histV1Bust?.numeric_value, 36.0, 'Historical v1 bust must NOT be mutated');
});

test('BOUTIQUE-03: Vendor management & Purchase Order linking', async () => {
  // 1. Create a fabric supplier / vendor
  const vendor = await prisma.supplier.create({
    data: {
      name: 'Kanchipuram Silks & Handlooms',
      contact_person: 'Senthil Kumar',
      category: 'Fabrics & Textiles',
      notes: 'Pure zari silk fabric and brocade borders vendor',
      phone: '+91 94432 12345',
      email: 'senthil@kanchisilks.local',
      address: '45 Gandhi Road, Kanchipuram, Tamil Nadu',
      state_code: '33',
      opening_balance: 5000,
    },
  });

  assert.ok(vendor.id);
  assert.equal(vendor.name, 'Kanchipuram Silks & Handlooms');

  // 2. Verify godown exists
  let godown = await prisma.godown.findFirst({ where: { is_default: true } });
  if (!godown) {
    godown = await prisma.godown.create({
      data: {
        name: 'Boutique Main Godown',
        code: 'MAIN-01',
        is_default: true,
        is_active: true,
      },
    });
  }

  // 3. Create sample fabric product
  let product = await prisma.product.findFirst({ where: { sku: 'FAB-SILK-001' } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        sku: 'FAB-SILK-001',
        name: 'Kanchi Pure Silk Brocade Fabric (Crimson Red)',
        unit: 'MTR',
        sale_price: 2400,
        purchase_price: 1800,
        tax_rate: 5.0,
      },
    });
  }

  // 4. Issue Purchase Order to the vendor
  const po = await prisma.purchaseOrder.create({
    data: {
      po_number: `PO-BTQ-${Date.now().toString().slice(-4)}`,
      supplier_id: vendor.id,
      supplier_name: vendor.name,
      supplier_phone: vendor.phone,
      supplier_address: vendor.address,
      godown_id: godown.id,
      order_date: new Date(),
      status: 'ORDERED',
      subtotal: 18000,
      tax_total: 900,
      grand_total: 18900,
      notes: 'Urgent festival collection raw material procurement',
      items: {
        create: [
          {
            product_id: product.id,
            quantity: 10,
            unit_cost: 1800,
            tax_rate: 5.0,
            tax_amount: 900,
            total: 18900,
          },
        ],
      },
    },
    include: { items: true, supplier: true },
  });

  assert.equal(po.supplier_id, vendor.id);
  assert.equal(po.supplier.name, 'Kanchipuram Silks & Handlooms');
  assert.equal(po.items.length, 1);
  assert.equal(Number(po.items[0].quantity), 10);
});
