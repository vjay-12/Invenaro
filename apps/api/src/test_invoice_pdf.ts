import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from './server.js';
import { prisma } from './db.js';

test('PDF: Invoice and Sales Order PDF generation works and authenticates with token param', async () => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let createdInvoiceId: string | null = null;
  let createdSessionToken: string | null = null;

  try {
    let invoice = await prisma.invoice.findFirst({
      include: { sales_order: true },
    });

    let godown = await prisma.godown.findFirst();
    if (!godown) {
      godown = await prisma.godown.create({
        data: { name: 'Main Godown', code: `GDW-${Date.now()}` },
      });
    }

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test Admin',
          password_hash: 'hashed',
          role: 'OWNER',
        },
      });
    }

    // Create session token
    const token = `test_token_${Date.now()}_${Math.random()}`;
    await prisma.session.create({
      data: {
        token_hash: token,
        user_id: user.id,
        expires_at: new Date(Date.now() + 3600000),
      },
    });
    createdSessionToken = token;

    if (!invoice) {
      const so = await prisma.salesOrder.create({
        data: {
          order_number: `SO-PDF-TEST-${Date.now()}`,
          customer_name: 'Test Customer',
          customer_phone: '+91 9999999999',
          customer_address: '123 Test Street, Bengaluru',
          godown_id: godown.id,
          subtotal: 100,
          tax_total: 18,
          grand_total: 118,
          status: 'DELIVERED',
        },
      });

      invoice = await prisma.invoice.create({
        data: {
          invoice_number: `INV-PDF-TEST-${Date.now()}`,
          godown_id: godown.id,
          reference_order_id: so.id,
          subtotal: 100,
          tax_total: 18,
          grand_total: 118,
          status: 'PAID',
          paid_amount: 118,
          balance_amount: 0,
        },
        include: { sales_order: true },
      });
      createdInvoiceId = invoice.id;
    }

    // Test 1: GET /api/v1/invoices/:id/pdf?token=...
    const res1 = await fetch(`${baseUrl}/api/v1/invoices/${invoice.id}/pdf?token=${encodeURIComponent(token)}`);
    assert.strictEqual(res1.status, 200, 'Should return 200 OK');
    assert.strictEqual(res1.headers.get('content-type'), 'application/pdf');
    const buf1 = Buffer.from(await res1.arrayBuffer());
    assert.strictEqual(buf1.subarray(0, 5).toString(), '%PDF-', 'Must start with PDF signature %PDF-');
    assert.ok(buf1.length > 500, 'PDF buffer should have substantive content');

    // Test 2: GET /api/v1/invoices/:id/pdf?download=true with Authorization header
    const res2 = await fetch(`${baseUrl}/api/v1/invoices/${invoice.id}/pdf?download=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res2.status, 200);
    assert.ok(res2.headers.get('content-disposition')?.includes('attachment; filename="Tax_Invoice_'));
    const buf2 = Buffer.from(await res2.arrayBuffer());
    assert.strictEqual(buf2.subarray(0, 5).toString(), '%PDF-');

    // Test 3: GET /api/v1/orders/sales-orders/:id/pdf?token=...
    if (invoice.reference_order_id) {
      const res3 = await fetch(
        `${baseUrl}/api/v1/orders/sales-orders/${invoice.reference_order_id}/pdf?token=${encodeURIComponent(token)}`
      );
      assert.strictEqual(res3.status, 200);
      assert.strictEqual(res3.headers.get('content-type'), 'application/pdf');
      const buf3 = Buffer.from(await res3.arrayBuffer());
      assert.strictEqual(buf3.subarray(0, 5).toString(), '%PDF-');
    }
  } finally {
    if (createdInvoiceId) {
      await prisma.invoice.deleteMany({ where: { id: createdInvoiceId } });
    }
    if (createdSessionToken) {
      await prisma.session.deleteMany({ where: { token_hash: createdSessionToken } });
    }
    server.close();
  }
});
