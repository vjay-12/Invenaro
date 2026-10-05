import 'dotenv/config';
import { prisma } from '../db.js';
import crypto from 'node:crypto';

async function verifyTamilNaduBoutique() {
  console.log('--- VERIFYING HTTP API AND DATA CONSISTENCY ---');

  // Generate session token for test admin
  const user = await prisma.user.findFirst({ where: { email: 'admin@invenaro.local' } });
  if (!user) throw new Error('Admin user not found');

  const sessionToken = crypto.randomBytes(32).toString('hex');
  await prisma.session.create({
    data: {
      token_hash: sessionToken,
      user_id: user.id,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`,
  };

  const API_BASE = 'http://localhost:3001/api/v1';

  // 1. Products API
  const prodRes = await fetch(`${API_BASE}/products`, { headers });
  if (prodRes.status !== 200) throw new Error(`Products endpoint failed: ${prodRes.status}`);
  const productsPayload = await prodRes.json();
  const products = Array.isArray(productsPayload) ? productsPayload : productsPayload.products;
  console.log(`\n1. Products API: ${products.length} products returned`);
  if (products.length !== 15) throw new Error(`Expected 15 products, got ${products.length}`);
  products.forEach((p: any) => {
    console.log(`   - [${p.sku}] ${p.name.padEnd(25)} Cost: ₹${p.purchase_price} | Price: ₹${p.sale_price} | Stock: ${p.stock_quantity ?? p.current_stock ?? p.stock_balances?.[0]?.current_quantity}`);
  });

  // 2. Vendors API
  const vendorRes = await fetch(`${API_BASE}/vendors`, { headers });
  if (vendorRes.status !== 200) throw new Error(`Vendors endpoint failed: ${vendorRes.status}`);
  const vendors = await vendorRes.json();
  console.log(`\n2. Vendors API: ${vendors.length} vendors returned`);
  if (vendors.length !== 3) throw new Error(`Expected 3 vendors, got ${vendors.length}`);
  vendors.forEach((v: any) => {
    console.log(`   - ${v.name.padEnd(30)} City: ${v.city} | Type: ${v.vendor_type} | Contact: ${v.contact_person}`);
  });

  // 3. Customers API
  const custRes = await fetch(`${API_BASE}/customers`, { headers });
  if (custRes.status !== 200) throw new Error(`Customers endpoint failed: ${custRes.status}`);
  const custData = await custRes.json();
  const customers = Array.isArray(custData) ? custData : custData.customers;
  console.log(`\n3. Customers API: ${customers.length} customers returned`);
  if (customers.length !== 2) throw new Error(`Expected 2 customers, got ${customers.length}`);
  customers.forEach((c: any) => {
    console.log(`   - ${c.name.padEnd(20)} City: ${c.city ?? 'Chennai/Vellore'} | Phone: ${c.phone} | State: ${c.state_code}`);
  });

  // 4. Purchase Orders API
  const poRes = await fetch(`${API_BASE}/purchase-orders`, { headers });
  if (poRes.status !== 200) throw new Error(`PO endpoint failed: ${poRes.status}`);
  const poList = await poRes.json();
  console.log(`\n4. Purchase Orders API: ${poList.length} POs returned`);
  if (poList.length !== 3) throw new Error(`Expected 3 POs, got ${poList.length}`);
  poList.forEach((po: any) => {
    console.log(`   - [${po.po_number}] Supplier: ${po.supplier_name.padEnd(30)} Status: ${po.status} | Total: ₹${po.grand_total}`);
  });

  // 5. Sales Orders API
  const soRes = await fetch(`${API_BASE}/sales-orders`, { headers });
  if (soRes.status !== 200) throw new Error(`SO endpoint failed: ${soRes.status}`);
  const soList = await soRes.json();
  console.log(`\n5. Sales Orders API: ${soList.length} SOs returned`);
  if (soList.length !== 3) throw new Error(`Expected 3 SOs, got ${soList.length}`);
  soList.forEach((so: any) => {
    console.log(`   - [${so.order_number}] Customer: ${so.customer_name.padEnd(20)} Status: ${so.status} | Total: ₹${so.grand_total}`);
  });

  // 6. Dashboard Metrics API
  const dashRes = await fetch(`${API_BASE}/reports/dashboard`, { headers });
  if (dashRes.status !== 200) throw new Error(`Dashboard endpoint failed: ${dashRes.status}`);
  const dash = await dashRes.json();
  console.log(`\n6. Dashboard Metrics API:`);
  console.log(`   - Total Products: ${dash.summary.totalProducts}`);
  console.log(`   - Total Orders: ${dash.summary.totalOrders}`);
  console.log(`   - Total Customers: ${dash.summary.totalCustomers}`);
  console.log(`   - Total Stock Units: ${dash.summary.totalStockUnits}`);
  console.log(`   - Total Stock Value: ₹${dash.summary.totalStockValue}`);

  if (dash.summary.totalProducts !== 15) throw new Error('Dashboard totalProducts must be 15');
  if (dash.summary.totalOrders !== 3) throw new Error('Dashboard totalOrders must be 3');
  if (dash.summary.totalCustomers !== 2) throw new Error('Dashboard totalCustomers must be 2');
  if (dash.summary.totalStockUnits !== 375) throw new Error(`Dashboard totalStockUnits must be 375, got ${dash.summary.totalStockUnits}`);

  // 7. Customer Measurements API
  console.log(`\n7. Customer Measurements API:`);
  for (const c of customers) {
    const mRes = await fetch(`${API_BASE}/customers/${c.id}/measurements`, { headers });
    if (mRes.status !== 200) throw new Error(`Customer measurements failed: ${mRes.status}`);
    const profiles = await mRes.json();
    console.log(`   - Customer: ${c.name} has ${profiles.length} measurement profile(s):`);
    for (const p of profiles) {
      console.log(`     * Profile: ${p.profile_name} (v${p.current_version?.version_number || 1})`);
      const values = p.current_version?.values || [];
      for (const v of values) {
        console.log(`       - ${v.field_name}: ${v.num_value} ${v.unit}`);
      }
    }
  }

  console.log('\n🎉 ALL 7 API ENDPOINTS VERIFIED SUCCESSFULLY WITH ACCURATE DATA!');
}

verifyTamilNaduBoutique()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
