import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Invenaro database...');

  // 1. Company Settings
  await prisma.companySettings.upsert({
    where: { id: 'default_settings' },
    update: {},
    create: {
      id: 'default_settings',
      company_name: 'Invenaro Trading Co.',
      legal_name: 'Invenaro Trading Private Limited',
      phone: '+91 98765 43210',
      email: 'contact@invenaro.com',
      address: 'Plot 42, Industrial Area Phase II',
      state_code: '27', // Maharashtra
      gstin: '27AAAAA0000A1Z5',
      enable_gst: true,
    },
  });

  // 2. Godowns (Main & South)
  const mainGodown = await prisma.godown.upsert({
    where: { code: 'MAIN-01' },
    update: {},
    create: {
      name: 'Main Central Godown',
      code: 'MAIN-01',
      address: 'Central Logistics Hub, Mumbai',
      state_code: '27',
      is_default: true,
      is_active: true,
    },
  });

  const southGodown = await prisma.godown.upsert({
    where: { code: 'SOUTH-02' },
    update: {},
    create: {
      name: 'South Regional Godown',
      code: 'SOUTH-02',
      address: 'Electronic City, Bengaluru',
      state_code: '29',
      is_default: false,
      is_active: true,
    },
  });

  // 3. Admin & Staff Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@invenaro.com' },
    update: { password_hash: passwordHash },
    create: {
      email: 'admin@invenaro.com',
      password_hash: passwordHash,
      name: 'Business Administrator',
      role: 'OWNER',
      assigned_godown_id: mainGodown.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@invenaro.com' },
    update: { password_hash: staffPasswordHash },
    create: {
      email: 'staff@invenaro.com',
      password_hash: staffPasswordHash,
      name: 'Warehouse Operator',
      role: 'STAFF',
      assigned_godown_id: southGodown.id,
    },
  });

  // 4. Product Categories
  const categoryHardware = await prisma.productCategory.upsert({
    where: { name: 'Hardware & Fasteners' },
    update: {},
    create: {
      name: 'Hardware & Fasteners',
      description: 'Industrial fasteners, screws, and bolts',
    },
  });

  const categoryElectrical = await prisma.productCategory.upsert({
    where: { name: 'Electrical & Wiring' },
    update: {},
    create: {
      name: 'Electrical & Wiring',
      description: 'Cables, conduits, and accessories',
    },
  });

  // 5. Products
  const productsData = [
    {
      sku: 'FAST-001',
      name: 'Hex Bolt M8 x 50mm (Box of 100)',
      category_id: categoryHardware.id,
      unit: 'BOX',
      purchase_price: 350,
      sale_price: 520,
      tax_rate: 18,
      hsn_code: '7318',
      min_stock_level: 20,
      initialQty: 85,
    },
    {
      sku: 'WIRE-002',
      name: 'Copper Flexible Wire 2.5 sq mm (90m Roll)',
      category_id: categoryElectrical.id,
      unit: 'ROLL',
      purchase_price: 1800,
      sale_price: 2400,
      tax_rate: 18,
      hsn_code: '8544',
      min_stock_level: 15,
      initialQty: 40,
    },
    {
      sku: 'VALVE-003',
      name: 'Brass Ball Valve 1/2" Heavy Duty',
      category_id: categoryHardware.id,
      unit: 'PCS',
      purchase_price: 220,
      sale_price: 340,
      tax_rate: 18,
      hsn_code: '8481',
      min_stock_level: 30,
      initialQty: 120,
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        category_id: p.category_id,
        unit: p.unit,
        purchase_price: p.purchase_price,
        sale_price: p.sale_price,
        tax_rate: p.tax_rate,
        hsn_code: p.hsn_code,
        min_stock_level: p.min_stock_level,
      },
    });

    // Create opening stock balance and movement
    const existingBalance = await prisma.stockBalance.findUnique({
      where: {
        product_id_godown_id: {
          product_id: product.id,
          godown_id: mainGodown.id,
        },
      },
    });

    if (!existingBalance) {
      await prisma.stockBalance.create({
        data: {
          product_id: product.id,
          godown_id: mainGodown.id,
          current_quantity: p.initialQty,
          avg_cost: p.purchase_price,
        },
      });

      await prisma.stockMovement.create({
        data: {
          movement_type: 'ADJUSTMENT_ADD',
          product_id: product.id,
          godown_id: mainGodown.id,
          quantity: p.initialQty,
          unit_cost: p.purchase_price,
          balance_after: p.initialQty,
          reference_type: 'OPENING_STOCK',
          reference_id: product.id,
          notes: 'Initial opening stock balance',
          created_by: admin.id,
        },
      });
    }
  }

  // 6. Sample Customers & Suppliers
  await prisma.customer.createMany({
    data: [
      {
        name: 'Metro Electricals & Hardware',
        phone: '+91 91234 56789',
        email: 'orders@metrohardware.in',
        address: 'Shop 12, Market Yard, Pune',
        state_code: '27',
        gstin: '27BBBBB1111B1Z2',
      },
      {
        name: 'Apex Infrastructure Ltd',
        phone: '+91 98888 77777',
        email: 'procurement@apexinfra.com',
        address: 'Whitefield Main Road, Bengaluru',
        state_code: '29',
        gstin: '29CCCCC2222C1Z3',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.supplier.createMany({
    data: [
      {
        name: 'National Metals & Wire Corp',
        phone: '+91 97777 66666',
        email: 'sales@nationalmetals.in',
        address: 'GIDC Industrial Estate, Ahmedabad',
        state_code: '24',
        gstin: '24DDDDD3333D1Z4',
        opening_balance: 0,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Invenaro database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
