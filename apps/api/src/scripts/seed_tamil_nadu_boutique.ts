import 'dotenv/config';
import { prisma } from '../db.js';
import { LedgerService } from '../services/ledger.js';
import { MeasurementTemplateService } from '../services/measurementTemplateService.js';
import { CustomerMeasurementService } from '../services/customerMeasurementService.js';

async function seedTamilNaduBoutique() {
  console.log('--- 1. VERIFY ENVIRONMENT & DATABASE ---');
  const dbUrl = process.env.DATABASE_URL || '';
  console.log(`DATABASE_URL: ${dbUrl}`);

  if (!dbUrl.includes('localhost:5435') && !dbUrl.includes('invenaro_local_boutique')) {
    throw new Error(`SAFETY ABORT: DATABASE_URL is not pointing to local PostgreSQL port 5435! Found: ${dbUrl}`);
  }
  console.log('✅ Verified local PostgreSQL database.');

  console.log('\n--- 2. SAFELY CLEAN EXISTING TEST/DEMO BUSINESS DATA ---');
  // Delete in foreign key dependency order
  const delValues = await prisma.customerMeasurementValue.deleteMany();
  const delVersions = await prisma.customerMeasurementVersion.deleteMany();
  const delProfiles = await prisma.customerMeasurementProfile.deleteMany();
  console.log(`- Removed ${delProfiles.count} measurement profiles and versions`);

  const delPayments = await prisma.payment.deleteMany();
  const delInvoices = await prisma.invoice.deleteMany();
  console.log(`- Removed ${delPayments.count} payments, ${delInvoices.count} invoices`);

  const delSoItems = await prisma.salesOrderItem.deleteMany();
  const delSos = await prisma.salesOrder.deleteMany();
  console.log(`- Removed ${delSos.count} sales orders (${delSoItems.count} items)`);

  const delPoItems = await prisma.purchaseOrderItem.deleteMany();
  const delPos = await prisma.purchaseOrder.deleteMany();
  console.log(`- Removed ${delPos.count} purchase orders (${delPoItems.count} items)`);

  const delTransfers = await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  const delAdjustments = await prisma.stockAdjustmentItem.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  console.log(`- Removed ${delTransfers.count} transfer items, ${delAdjustments.count} adjustment items`);

  const delMovements = await prisma.stockMovement.deleteMany();
  const delBalances = await prisma.stockBalance.deleteMany();
  console.log(`- Removed ${delMovements.count} stock movements, ${delBalances.count} stock balances`);

  const delProducts = await prisma.product.deleteMany();
  const delCategories = await prisma.productCategory.deleteMany();
  console.log(`- Removed ${delProducts.count} products, ${delCategories.count} categories`);

  const delCustomers = await prisma.customer.deleteMany();
  const delSuppliers = await prisma.supplier.deleteMany();
  console.log(`- Removed ${delCustomers.count} customers, ${delSuppliers.count} vendors`);

  // Ensure default godown exists
  let mainGodown = await prisma.godown.findFirst({ where: { is_default: true } });
  if (!mainGodown) {
    mainGodown = await prisma.godown.create({
      data: {
        name: 'Boutique Main Godown',
        code: 'MAIN-01',
        is_default: true,
        is_active: true,
      },
    });
  }
  console.log(`✅ Default Godown active: "${mainGodown.name}" (${mainGodown.id})`);

  // Ensure admin user exists
  let admin = await prisma.user.findFirst({ where: { email: 'admin@invenaro.local' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@invenaro.local',
        password_hash: '$2a$10$wT0s8P9xW20wTskz4LwI4.QjP91f7N0YfFh44qJcKjJzT6gX5lQ6y', // Admin@123
        name: 'Boutique Admin',
        role: 'OWNER',
      },
    });
  }
  console.log(`✅ Admin user active: "${admin.name}" (${admin.email})`);

  console.log('\n--- 3. CREATE TAMIL NADU CATEGORIES ---');
  const categoriesData = [
    { name: 'Sarees', description: 'Traditional and designer sarees from South India' },
    { name: 'Blouses & Tailoring', description: 'Designer and custom tailored saree blouses' },
    { name: 'Salwar & Churidar Sets', description: 'Complete 3-piece and 2-piece ethnic suit sets' },
    { name: 'Kurtis & Tunics', description: 'Daily wear and festive cotton and designer kurtis' },
    { name: 'Bottoms & Petticoats', description: 'Churidar leggings and cotton saree petticoats' },
    { name: 'Dupattas & Stoles', description: 'Chanderi, silk, and embroidered dupattas' },
    { name: 'Fabrics & Linings', description: 'Blouse inner linings and dress fabrics by the metre' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.productCategory.create({ data: cat });
    categoryMap.set(cat.name, created.id);
  }
  console.log(`✅ Created ${categoryMap.size} product categories.`);

  console.log('\n--- 4. CREATE EXACTLY 15 BOUTIQUE PRODUCTS ---');
  const productsData = [
    {
      sku: 'KCH-SLK-001',
      name: 'Kanchipuram Silk Saree',
      description: 'Pure zari woven bridal Kanchipuram silk saree with rich contrast pallu',
      category: 'Sarees',
      unit: 'PCS',
      purchase_price: 6500,
      sale_price: 11999,
      min_stock_level: 3,
      hsn_code: '5007',
    },
    {
      sku: 'SFT-SLK-002',
      name: 'Soft Silk Saree',
      description: 'Lightweight soft silk saree with floral zari motifs and temple border',
      category: 'Sarees',
      unit: 'PCS',
      purchase_price: 3200,
      sale_price: 5499,
      min_stock_level: 5,
      hsn_code: '5007',
    },
    {
      sku: 'CTN-SAR-003',
      name: 'Cotton Saree',
      description: 'Handloom breathable cotton saree ideal for daily and festive summer wear',
      category: 'Sarees',
      unit: 'PCS',
      purchase_price: 850,
      sale_price: 1599,
      min_stock_level: 8,
      hsn_code: '5208',
    },
    {
      sku: 'ORG-SAR-004',
      name: 'Organza Saree',
      description: 'Sheer pastel organza saree featuring delicate floral threadwork',
      category: 'Sarees',
      unit: 'PCS',
      purchase_price: 2100,
      sale_price: 3899,
      min_stock_level: 4,
      hsn_code: '5407',
    },
    {
      sku: 'CHF-SAR-005',
      name: 'Chiffon Saree',
      description: 'Flowing lightweight chiffon saree with elegant scalloped lace border',
      category: 'Sarees',
      unit: 'PCS',
      purchase_price: 1400,
      sale_price: 2499,
      min_stock_level: 4,
      hsn_code: '5407',
    },
    {
      sku: 'DSN-BLS-006',
      name: 'Designer Saree Blouse',
      description: 'Padded stitched designer blouse with maggam stone and zari embroidery',
      category: 'Blouses & Tailoring',
      unit: 'PCS',
      purchase_price: 1200,
      sale_price: 2299,
      min_stock_level: 5,
      hsn_code: '6211',
    },
    {
      sku: 'CTN-CHR-007',
      name: 'Cotton Churidar Set',
      description: '3-piece pure cotton churidar suit with floral printed dupatta',
      category: 'Salwar & Churidar Sets',
      unit: 'SET',
      purchase_price: 1100,
      sale_price: 1999,
      min_stock_level: 6,
      hsn_code: '6204',
    },
    {
      sku: 'ANK-CHR-008',
      name: 'Anarkali Churidar Set',
      description: 'Floor-length flared georgette Anarkali set with rich zari yoke',
      category: 'Salwar & Churidar Sets',
      unit: 'SET',
      purchase_price: 2400,
      sale_price: 4299,
      min_stock_level: 3,
      hsn_code: '6204',
    },
    {
      sku: 'DSN-KRT-009',
      name: 'Designer Kurti',
      description: 'Rayon straight-cut festive designer kurti with hand-block prints',
      category: 'Kurtis & Tunics',
      unit: 'PCS',
      purchase_price: 850,
      sale_price: 1599,
      min_stock_level: 6,
      hsn_code: '6206',
    },
    {
      sku: 'CTN-KRT-010',
      name: 'Cotton Kurti',
      description: 'Daily wear pure cotton breathable daily kurti with 3/4 sleeves',
      category: 'Kurtis & Tunics',
      unit: 'PCS',
      purchase_price: 550,
      sale_price: 999,
      min_stock_level: 10,
      hsn_code: '6206',
    },
    {
      sku: 'CHR-LEG-011',
      name: 'Leggings',
      description: '4-way stretchable bio-wash cotton Lycra churidar leggings',
      category: 'Bottoms & Petticoats',
      unit: 'PCS',
      purchase_price: 280,
      sale_price: 499,
      min_stock_level: 15,
      hsn_code: '6104',
    },
    {
      sku: 'CTN-DUP-012',
      name: 'Dupatta',
      description: 'Chanderi silk cotton printed dupatta with golden zari border',
      category: 'Dupattas & Stoles',
      unit: 'PCS',
      purchase_price: 350,
      sale_price: 649,
      min_stock_level: 10,
      hsn_code: '6214',
    },
    {
      sku: 'CTN-PET-013',
      name: 'Petticoat',
      description: '6-panel sturdy pure cotton saree underskirt with drawstrings',
      category: 'Bottoms & Petticoats',
      unit: 'PCS',
      purchase_price: 220,
      sale_price: 399,
      min_stock_level: 12,
      hsn_code: '6208',
    },
    {
      sku: 'LIN-FAB-014',
      name: 'Blouse Lining Fabric',
      description: '100% pre-shrunk cotton inner lining cloth for custom blouses',
      category: 'Fabrics & Linings',
      unit: 'MTR',
      purchase_price: 45,
      sale_price: 85,
      min_stock_level: 50,
      hsn_code: '5208',
    },
    {
      sku: 'EMB-DUP-015',
      name: 'Embroidered Dupatta',
      description: 'Organza net dupatta with intricate sequin and zardozi borders',
      category: 'Dupattas & Stoles',
      unit: 'PCS',
      purchase_price: 750,
      sale_price: 1399,
      min_stock_level: 5,
      hsn_code: '6214',
    },
  ];

  const productMap = new Map<string, any>();
  for (const p of productsData) {
    const created = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        category_id: categoryMap.get(p.category),
        unit: p.unit,
        purchase_price: p.purchase_price,
        sale_price: p.sale_price,
        min_stock_level: p.min_stock_level,
        hsn_code: p.hsn_code,
        tax_rate: 5.0, // standard 5% GST for textiles
        is_active: true,
      },
    });
    productMap.set(p.sku, created);
  }
  console.log(`✅ Created EXACTLY ${productMap.size} boutique products.`);

  console.log('\n--- 5. CREATE EXACTLY 3 TAMIL NADU VENDORS ---');
  const vendorsData = [
    {
      name: 'Kanchipuram Silk & Textiles',
      contact_person: 'K. Varadarajan',
      phone: '+91 94432 18920',
      email: 'orders@kanchisilktextiles.in',
      address: '48 Gandhi Road, Weaver Colony',
      city: 'Kanchipuram',
      state: 'Tamil Nadu',
      state_code: '33',
      gstin: '33AAAFK1234H1Z5',
      vendor_type: 'Fabrics & Textiles',
      category: 'Fabric Supplier',
      notes: 'Premier traditional weaver cooperative supplying pure silk & cotton sarees',
    },
    {
      name: 'Chennai Boutique Fabrics',
      contact_person: 'S. Meenakshi Sundaram',
      phone: '+91 98401 54321',
      email: 'contact@chennaiboutiquefabrics.com',
      address: '112 Godown Street, George Town',
      city: 'Chennai',
      state: 'Tamil Nadu',
      state_code: '33',
      gstin: '33AABCC5678J1Z2',
      vendor_type: 'Fabrics & Textiles',
      category: 'Fabric Supplier',
      notes: 'Wholesale distributor of designer organza, chiffon, and salwar materials',
    },
    {
      name: 'Coimbatore Lace & Accessories',
      contact_person: 'R. Senthil Kumar',
      phone: '+91 94220 87654',
      email: 'sales@coimbatorelace.co.in',
      address: '25 Cross Cut Road, Gandhipuram',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      state_code: '33',
      gstin: '33AADCL9012K1Z9',
      vendor_type: 'Lace / Accessories',
      category: 'Lining Supplier',
      notes: 'Supplier of premium Lycra leggings, embroidered dupattas, and kurtis',
    },
  ];

  const vendorMap = new Map<string, any>();
  for (const v of vendorsData) {
    const created = await prisma.supplier.create({ data: v });
    vendorMap.set(v.name, created);
  }
  console.log(`✅ Created EXACTLY ${vendorMap.size} Tamil Nadu vendors.`);

  console.log('\n--- 6. CREATE EXACTLY 2 TAMIL NADU CUSTOMERS ---');
  const customersData = [
    {
      name: 'Priya Sundaram',
      phone: '+91 98402 34567',
      email: 'priya.sundaram@gmail.com',
      address: '14 East Mada Street, Mylapore',
      state_code: '33',
    },
    {
      name: 'Harshini Kumar',
      phone: '+91 97901 89234',
      email: 'harshini.kumar@yahoo.com',
      address: '28 Officer Line, Anna Salai',
      state_code: '33',
    },
  ];

  const customerMap = new Map<string, any>();
  for (const c of customersData) {
    const created = await prisma.customer.create({ data: c });
    customerMap.set(c.name, created);
  }
  console.log(`✅ Created EXACTLY ${customerMap.size} Tamil Nadu customers.`);

  console.log('\n--- 7. CREATE & RECEIVE EXACTLY 3 PURCHASE ORDERS ---');
  const vKanchi = vendorMap.get('Kanchipuram Silk & Textiles');
  const vChennai = vendorMap.get('Chennai Boutique Fabrics');
  const vCoimbatore = vendorMap.get('Coimbatore Lace & Accessories');

  // PO-1: Kanchipuram Silk & Textiles (5 products)
  const po1Items = [
    { product: productMap.get('KCH-SLK-001'), qty: 10 },
    { product: productMap.get('SFT-SLK-002'), qty: 15 },
    { product: productMap.get('CTN-SAR-003'), qty: 25 },
    { product: productMap.get('DSN-BLS-006'), qty: 20 },
    { product: productMap.get('CTN-PET-013'), qty: 30 },
  ];

  // PO-2: Chennai Boutique Fabrics (5 products)
  const po2Items = [
    { product: productMap.get('ORG-SAR-004'), qty: 12 },
    { product: productMap.get('CHF-SAR-005'), qty: 15 },
    { product: productMap.get('CTN-CHR-007'), qty: 20 },
    { product: productMap.get('ANK-CHR-008'), qty: 10 },
    { product: productMap.get('LIN-FAB-014'), qty: 100 },
  ];

  // PO-3: Coimbatore Lace & Accessories (5 products)
  const po3Items = [
    { product: productMap.get('DSN-KRT-009'), qty: 20 },
    { product: productMap.get('CTN-KRT-010'), qty: 30 },
    { product: productMap.get('CHR-LEG-011'), qty: 40 },
    { product: productMap.get('CTN-DUP-012'), qty: 30 },
    { product: productMap.get('EMB-DUP-015'), qty: 15 },
  ];

  const createAndReceivePO = async (poNumber: string, vendor: any, items: Array<{ product: any; qty: number }>) => {
    let subtotal = 0;
    let taxTotal = 0;
    const computedItems: any[] = [];

    for (const it of items) {
      const lineCost = it.qty * Number(it.product.purchase_price);
      const lineTax = lineCost * 0.05;
      subtotal += lineCost;
      taxTotal += lineTax;
      computedItems.push({
        product_id: it.product.id,
        quantity: it.qty,
        unit_cost: it.product.purchase_price,
        tax_rate: 5.0,
        tax_amount: lineTax,
        total: lineCost + lineTax,
      });
    }

    const grandTotal = subtotal + taxTotal;

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number: poNumber,
        supplier_id: vendor.id,
        supplier_name: vendor.name,
        supplier_phone: vendor.phone,
        supplier_address: `${vendor.address}, ${vendor.city}, ${vendor.state}`,
        supplier_gstin: vendor.gstin,
        godown_id: mainGodown.id,
        status: 'RECEIVED',
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        notes: `Tamil Nadu Boutique stock consignment received from ${vendor.name}`,
        created_by: admin.id,
        items: {
          create: computedItems,
        },
      },
      include: { items: true },
    });

    // Record stock receipt in ledger atomically
    for (const item of po.items) {
      await LedgerService.recordMovement({
        product_id: item.product_id,
        godown_id: mainGodown.id,
        movement_type: 'PURCHASE_RECEIPT',
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
        reference_type: 'PURCHASE_ORDER',
        reference_id: po.id,
        notes: `Goods receipt for PO ${po.po_number}: ${vendor.name}`,
        created_by: admin.id,
      });
    }

    return po;
  };

  const po1 = await createAndReceivePO('PO-2026-0001', vKanchi, po1Items);
  const po2 = await createAndReceivePO('PO-2026-0002', vChennai, po2Items);
  const po3 = await createAndReceivePO('PO-2026-0003', vCoimbatore, po3Items);
  console.log(`✅ Created and received 3 Purchase Orders: ${po1.po_number}, ${po2.po_number}, ${po3.po_number}`);

  console.log('\n--- 8. CREATE & DISPATCH EXACTLY 3 SALES ORDERS ---');
  const cPriya = customerMap.get('Priya Sundaram');
  const cHarshini = customerMap.get('Harshini Kumar');

  // SO-1: Priya Sundaram (Bridal ensemble)
  const so1Items = [
    { product: productMap.get('KCH-SLK-001'), qty: 1 },
    { product: productMap.get('DSN-BLS-006'), qty: 1 },
    { product: productMap.get('CTN-PET-013'), qty: 1 },
    { product: productMap.get('LIN-FAB-014'), qty: 2 },
  ];

  // SO-2: Harshini Kumar (Festive suit)
  const so2Items = [
    { product: productMap.get('ANK-CHR-008'), qty: 1 },
    { product: productMap.get('EMB-DUP-015'), qty: 1 },
    { product: productMap.get('CHR-LEG-011'), qty: 2 },
  ];

  // SO-3: Priya Sundaram (Casual summer collection)
  const so3Items = [
    { product: productMap.get('CTN-SAR-003'), qty: 2 },
    { product: productMap.get('DSN-KRT-009'), qty: 1 },
    { product: productMap.get('CTN-KRT-010'), qty: 2 },
    { product: productMap.get('CTN-DUP-012'), qty: 1 },
    { product: productMap.get('CHR-LEG-011'), qty: 2 },
  ];

  const createAndDispatchSO = async (orderNumber: string, customer: any, items: Array<{ product: any; qty: number }>, invNumber: string) => {
    let subtotal = 0;
    let taxTotal = 0;
    const computedItems: any[] = [];

    for (const it of items) {
      const lineTotal = it.qty * Number(it.product.sale_price);
      const lineTax = lineTotal * 0.05;
      subtotal += lineTotal;
      taxTotal += lineTax;
      computedItems.push({
        product_id: it.product.id,
        quantity: it.qty,
        unit_price: it.product.sale_price,
        discount: 0,
        tax_rate: 5.0,
        tax_amount: lineTax,
        total: lineTotal + lineTax,
      });
    }

    const grandTotal = subtotal + taxTotal;

    const order = await prisma.salesOrder.create({
      data: {
        order_number: orderNumber,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: `${customer.address}, Tamil Nadu`,
        godown_id: mainGodown.id,
        status: 'DELIVERED',
        subtotal,
        tax_total: taxTotal,
        discount_total: 0,
        grand_total: grandTotal,
        notes: `Tailored boutique order delivered to ${customer.name}`,
        created_by: admin.id,
        items: {
          create: computedItems,
        },
      },
      include: { items: true },
    });

    // Record stock deduction in ledger atomically
    for (const item of order.items) {
      await LedgerService.recordMovement({
        product_id: item.product_id,
        godown_id: mainGodown.id,
        movement_type: 'SALES_DELIVERY',
        quantity: -Number(item.quantity),
        unit_cost: Number(item.unit_price),
        reference_type: 'SALES_ORDER',
        reference_id: order.id,
        notes: `Delivery for order ${order.order_number}`,
        created_by: admin.id,
      });
    }

    // Create official tax invoice
    await prisma.invoice.create({
      data: {
        invoice_number: invNumber,
        invoice_type: 'TAX_INVOICE',
        reference_order_id: order.id,
        customer_id: customer.id,
        godown_id: mainGodown.id,
        status: 'PAID',
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        paid_amount: grandTotal,
        balance_amount: 0,
      },
    });

    return order;
  };

  const so1 = await createAndDispatchSO('SO-2026-0001', cPriya, so1Items, 'INV-2026-0001');
  const so2 = await createAndDispatchSO('SO-2026-0002', cHarshini, so2Items, 'INV-2026-0002');
  const so3 = await createAndDispatchSO('SO-2026-0003', cPriya, so3Items, 'INV-2026-0003');
  console.log(`✅ Created and dispatched 3 Sales Orders: ${so1.order_number}, ${so2.order_number}, ${so3.order_number}`);

  console.log('\n--- 9. CREATE MINIMAL MEASUREMENT PROFILES ---');
  await MeasurementTemplateService.ensureDefaultTemplates();
  const templates = await MeasurementTemplateService.getAllTemplates();
  const blouseTemplate = templates.find((t) => t.code === 'SAREE_BLOUSE');
  const churidarTemplate = templates.find((t) => t.code === 'CHURIDAR_SALWAR');

  if (blouseTemplate) {
    const fLength = blouseTemplate.fields.find((f) => f.field_key === 'front_length' || f.field_key === 'blouse_length');
    const fShoulder = blouseTemplate.fields.find((f) => f.field_key === 'shoulder');
    const fBust = blouseTemplate.fields.find((f) => f.field_key === 'bust');
    const fWaist = blouseTemplate.fields.find((f) => f.field_key === 'waist');
    const fArmhole = blouseTemplate.fields.find((f) => f.field_key === 'armhole');

    await CustomerMeasurementService.createProfile(cPriya.id, {
      template_id: blouseTemplate.id,
      profile_name: 'Saree Blouse',
      notes: 'Silk saree blouse with deep neck and border piping',
      measured_by: 'Master Murugan',
      values: [
        ...(fLength ? [{ field_id: fLength.id, numeric_value: 14.5, unit: 'in' as const }] : []),
        ...(fShoulder ? [{ field_id: fShoulder.id, numeric_value: 14.0, unit: 'in' as const }] : []),
        ...(fBust ? [{ field_id: fBust.id, numeric_value: 36.0, unit: 'in' as const }] : []),
        ...(fWaist ? [{ field_id: fWaist.id, numeric_value: 30.0, unit: 'in' as const }] : []),
        ...(fArmhole ? [{ field_id: fArmhole.id, numeric_value: 16.0, unit: 'in' as const }] : []),
      ],
    });
    console.log(`✅ Created measurement profile for Priya Sundaram (Saree Blouse) with optional fields left blank`);
  }

  if (churidarTemplate) {
    const fBust = churidarTemplate.fields.find((f) => f.field_key === 'bust');
    const fWaist = churidarTemplate.fields.find((f) => f.field_key === 'waist');
    const fHip = churidarTemplate.fields.find((f) => f.field_key === 'hip');

    await CustomerMeasurementService.createProfile(cHarshini.id, {
      template_id: churidarTemplate.id,
      profile_name: 'Churidar Suit',
      notes: 'Festive Anarkali fitting with 1 inch margin',
      measured_by: 'Master Ramesh',
      values: [
        ...(fBust ? [{ field_id: fBust.id, numeric_value: 36.0, unit: 'in' as const }] : []),
        ...(fWaist ? [{ field_id: fWaist.id, numeric_value: 30.0, unit: 'in' as const }] : []),
        ...(fHip ? [{ field_id: fHip.id, numeric_value: 38.0, unit: 'in' as const }] : []),
      ],
    });
    console.log(`✅ Created measurement profile for Harshini Kumar (Churidar Suit) with optional fields left blank`);
  }

  console.log('\n--- 10. STOCK VALIDATION & AUDIT ---');
  const allBalances = await prisma.stockBalance.findMany({
    include: { product: true },
    orderBy: { product: { sku: 'asc' } },
  });

  console.log('Product Stock Audit:');
  let totalStockQty = 0;
  for (const b of allBalances) {
    const qty = Number(b.current_quantity);
    totalStockQty += qty;
    console.log(`  - [${b.product.sku}] ${b.product.name.padEnd(25)} : Current Stock = ${qty} ${b.product.unit}`);
  }

  console.log(`\nTotal Stock Units in Godown: ${totalStockQty}`);

  console.log('\n--- 11. FINAL DATABASE RECORD COUNTS ---');
  const finalCounts = {
    products: await prisma.product.count(),
    vendors: await prisma.supplier.count(),
    customers: await prisma.customer.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    salesOrders: await prisma.salesOrder.count(),
    invoices: await prisma.invoice.count(),
    stockBalances: await prisma.stockBalance.count(),
    stockMovements: await prisma.stockMovement.count(),
    measurementProfiles: await prisma.customerMeasurementProfile.count(),
  };

  console.log(JSON.stringify(finalCounts, null, 2));

  if (finalCounts.products !== 15) throw new Error(`Expected exactly 15 products, found ${finalCounts.products}`);
  if (finalCounts.vendors !== 3) throw new Error(`Expected exactly 3 vendors, found ${finalCounts.vendors}`);
  if (finalCounts.customers !== 2) throw new Error(`Expected exactly 2 customers, found ${finalCounts.customers}`);
  if (finalCounts.purchaseOrders !== 3) throw new Error(`Expected exactly 3 POs, found ${finalCounts.purchaseOrders}`);
  if (finalCounts.salesOrders !== 3) throw new Error(`Expected exactly 3 SOs, found ${finalCounts.salesOrders}`);
  if (finalCounts.measurementProfiles !== 2) throw new Error(`Expected exactly 2 measurement profiles, found ${finalCounts.measurementProfiles}`);

  console.log('\n✨ ALL CONSTRAINTS AND EXACT COUNTS SATISFIED!');
}

seedTamilNaduBoutique()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
