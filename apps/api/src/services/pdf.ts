import PDFDocument from 'pdfkit';

export function numberToWords(num: number): string {
  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
    if (n < 1000) return inWords(Math.floor(n / 100)) + 'Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  }

  const rupees = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - rupees) * 100);

  let str = inWords(rupees).trim() + ' Rupees';
  if (paise > 0) {
    str += ' and ' + inWords(paise).trim() + ' Paise';
  }
  return (num < 0 ? 'Minus ' : '') + str + ' Only';
}

export interface PdfCompanySettings {
  company_name?: string | null;
  legal_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  state_code?: string | null;
}

export function generateInvoicePdf(invoice: any, settings?: PdfCompanySettings | null): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0f766e'; // teal-700
      const darkColor = '#0f172a'; // slate-900
      const grayColor = '#475569'; // slate-600
      const lightGray = '#f1f5f9'; // slate-100
      const borderColor = '#cbd5e1'; // slate-300

      // 1. Header: Company Info & Document Type
      doc.rect(36, 36, 523, 75).fill(lightGray);

      const companyName = settings?.company_name || 'INVENARO RETAIL';
      const companyAddress = settings?.address || 'Primary Logistics Hub, Main Central Godown';
      const companyGstin = settings?.gstin || '29AAAAA0000A1Z5';
      const companyPhone = settings?.phone || '+91 98765 43210';
      const companyEmail = settings?.email || 'billing@invenaro.com';

      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
        .text(companyName, 48, 46, { width: 300 });

      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(companyAddress, 48, 66, { width: 300 })
        .text(`GSTIN: ${companyGstin} | State: ${settings?.state_code || 'Karnataka (29)'}`, 48, 78)
        .text(`Phone: ${companyPhone} | Email: ${companyEmail}`, 48, 90);

      const isTaxInvoice = invoice.invoice_type !== 'SALES_RECEIPT';
      doc.fillColor(primaryColor).fontSize(15).font('Helvetica-Bold')
        .text(isTaxInvoice ? 'TAX INVOICE' : 'SALES RECEIPT', 360, 46, { align: 'right', width: 185 });

      const isPaid = invoice.status === 'PAID' || Number(invoice.balance_amount) <= 0;
      const statusColor = isPaid ? '#059669' : '#dc2626';

      doc.fillColor(statusColor).fontSize(10).font('Helvetica-Bold')
        .text(`STATUS: ${invoice.status || 'UNPAID'}`, 360, 68, { align: 'right', width: 185 });

      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text('Original for Recipient', 360, 84, { align: 'right', width: 185 });

      // 2. Metadata Columns (Invoice Details & Billed To)
      let y = 125;
      doc.rect(36, y, 255, 82).strokeColor(borderColor).stroke();
      doc.rect(298, y, 261, 82).strokeColor(borderColor).stroke();

      // Left: Invoice Details
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('INVOICE DETAILS', 46, y + 8);
      doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold').text('Invoice No:', 46, y + 24);
      doc.font('Helvetica').text(invoice.invoice_number, 110, y + 24);

      doc.font('Helvetica-Bold').text('Invoice Date:', 46, y + 38);
      const invDate = invoice.invoice_date ? new Date(invoice.invoice_date) : new Date();
      doc.font('Helvetica').text(
        invDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        110,
        y + 38
      );

      doc.font('Helvetica-Bold').text('Order Ref:', 46, y + 52);
      doc.font('Helvetica').text(invoice.sales_order?.order_number || invoice.reference_order_id || '-', 110, y + 52);

      doc.font('Helvetica-Bold').text('Dispatched At:', 46, y + 66);
      doc.font('Helvetica').text(invoice.godown?.name || 'Main Central Godown', 110, y + 66);

      // Right: Billed To
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('BILLED TO (CUSTOMER)', 308, y + 8);
      const custName = invoice.customer?.name || invoice.sales_order?.customer_name || 'Retail Customer';
      const custAddr = invoice.customer?.address || invoice.sales_order?.customer_address || '-';
      const custPhone = invoice.customer?.phone || invoice.sales_order?.customer_phone || '-';
      const custGstin = invoice.customer?.gstin || invoice.sales_order?.customer_gstin || 'URP (Unregistered)';

      doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold').text('Name:', 308, y + 24);
      doc.font('Helvetica').text(custName, 355, y + 24, { width: 195 });

      doc.font('Helvetica-Bold').text('Address:', 308, y + 38);
      doc.font('Helvetica').text(custAddr, 355, y + 38, { width: 195, height: 24, ellipsis: true });

      doc.font('Helvetica-Bold').text('Phone / GST:', 308, y + 66);
      doc.font('Helvetica').text(`${custPhone} / ${custGstin}`, 365, y + 66, { width: 185 });

      // 3. Line Items Table
      y = 222;
      doc.rect(36, y, 523, 20).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('#', 42, y + 6, { width: 20 });
      doc.text('Item Description & SKU', 65, y + 6, { width: 175 });
      doc.text('HSN', 245, y + 6, { width: 40 });
      doc.text('Qty', 290, y + 6, { width: 35, align: 'right' });
      doc.text('Rate (₹)', 330, y + 6, { width: 50, align: 'right' });
      doc.text('GST %', 385, y + 6, { width: 40, align: 'right' });
      doc.text('Tax (₹)', 430, y + 6, { width: 45, align: 'right' });
      doc.text('Total (₹)', 480, y + 6, { width: 70, align: 'right' });

      y += 20;
      const items: any[] = invoice.sales_order?.items || [];
      if (items.length === 0) {
        doc.rect(36, y, 523, 22).fill('#f8fafc');
        doc.fillColor(darkColor).fontSize(8).font('Helvetica')
          .text('1', 42, y + 6, { width: 20 })
          .text('Order Items Fulfillment', 65, y + 6, { width: 175 })
          .text('-', 245, y + 6, { width: 40 })
          .text('1 unit', 290, y + 6, { width: 35, align: 'right' })
          .text(Number(invoice.subtotal).toFixed(2), 330, y + 6, { width: 50, align: 'right' })
          .text('GST', 385, y + 6, { width: 40, align: 'right' })
          .text(Number(invoice.tax_total).toFixed(2), 430, y + 6, { width: 45, align: 'right' })
          .font('Helvetica-Bold').text(Number(invoice.grand_total).toFixed(2), 480, y + 6, { width: 70, align: 'right' });
        y += 22;
      } else {
        items.forEach((it, idx) => {
          const isEven = idx % 2 === 0;
          if (isEven) {
            doc.rect(36, y, 523, 22).fill('#f8fafc');
          }

          doc.fillColor(darkColor).fontSize(8).font('Helvetica');
          doc.text(String(idx + 1), 42, y + 6, { width: 20 });
          doc.font('Helvetica-Bold').text(it.product?.name || it.product_name || 'Item', 65, y + 3, { width: 175, lineBreak: false });
          doc.font('Helvetica').fillColor(grayColor).text(`SKU: ${it.product?.sku || it.sku || '-'}`, 65, y + 12, { width: 175 });

          doc.fillColor(darkColor).text(it.product?.hsn_code || '-', 245, y + 6, { width: 40 });
          doc.text(`${it.quantity} ${it.product?.unit || 'unit'}`, 290, y + 6, { width: 35, align: 'right' });
          doc.text(Number(it.unit_price).toFixed(2), 330, y + 6, { width: 50, align: 'right' });
          doc.text(`${Number(it.tax_rate)}%`, 385, y + 6, { width: 40, align: 'right' });
          doc.text(Number(it.tax_amount).toFixed(2), 430, y + 6, { width: 45, align: 'right' });
          doc.font('Helvetica-Bold').text(Number(it.total).toFixed(2), 480, y + 6, { width: 70, align: 'right' });

          y += 22;
        });
      }

      // Bottom table line
      doc.moveTo(36, y).lineTo(559, y).strokeColor(borderColor).stroke();

      // 4. Totals & Tax Summary
      y += 10;
      const totalBoxY = y;

      // Left box: Amount in Words & Payment History
      doc.rect(36, totalBoxY, 320, 110).strokeColor(borderColor).stroke();
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('AMOUNT IN WORDS:', 44, totalBoxY + 8);
      doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold')
        .text(numberToWords(Number(invoice.grand_total)), 44, totalBoxY + 20, { width: 300 });

      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('PAYMENT RECORD:', 44, totalBoxY + 45);
      if (invoice.payments && invoice.payments.length > 0) {
        const pay = invoice.payments[0];
        doc.fillColor(darkColor).fontSize(8).font('Helvetica')
          .text(`Mode: ${pay.payment_mode} | Ref: ${pay.payment_number || pay.reference_number || '-'}`, 44, totalBoxY + 58)
          .text(
            `Paid: ₹${Number(pay.amount).toFixed(2)} on ${new Date(pay.payment_date).toLocaleDateString('en-IN')}`,
            44,
            totalBoxY + 70
          )
          .text(`Status: FULLY SETTLED`, 44, totalBoxY + 82);
      } else if (isPaid) {
        doc.fillColor(darkColor).fontSize(8).font('Helvetica')
          .text(`Mode: CASH / DIRECT | Status: FULLY SETTLED`, 44, totalBoxY + 58)
          .text(`Paid Amount: ₹${Number(invoice.paid_amount || invoice.grand_total).toFixed(2)}`, 44, totalBoxY + 70);
      } else {
        doc.fillColor(grayColor).fontSize(8).font('Helvetica')
          .text('No payment recorded yet. Amount pending settlement.', 44, totalBoxY + 58);
      }

      // Right box: Subtotal, Tax, Grand Total
      doc.rect(365, totalBoxY, 194, 110).strokeColor(borderColor).stroke();
      let rY = totalBoxY + 10;
      doc.fillColor(grayColor).fontSize(8).font('Helvetica').text('Subtotal:', 375, rY);
      doc.fillColor(darkColor).font('Helvetica-Bold').text(`₹${Number(invoice.subtotal).toFixed(2)}`, 450, rY, { align: 'right', width: 100 });

      rY += 16;
      doc.fillColor(grayColor).font('Helvetica').text('CGST + SGST (Tax):', 375, rY);
      doc.fillColor(darkColor).font('Helvetica-Bold').text(`₹${Number(invoice.tax_total).toFixed(2)}`, 450, rY, { align: 'right', width: 100 });

      rY += 16;
      doc.fillColor(grayColor).font('Helvetica').text('Discount:', 375, rY);
      doc.fillColor(darkColor).font('Helvetica-Bold').text(`₹0.00`, 450, rY, { align: 'right', width: 100 });

      rY += 18;
      doc.rect(365, rY - 4, 194, 26).fill('#ecfdf5');
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('Grand Total:', 375, rY + 3);
      doc.text(`₹${Number(invoice.grand_total).toFixed(2)}`, 450, rY + 3, { align: 'right', width: 100 });

      rY += 26;
      doc.fillColor(grayColor).fontSize(8).font('Helvetica').text('Paid / Balance:', 375, rY + 2);
      doc.fillColor(isPaid ? '#059669' : '#dc2626').font('Helvetica-Bold')
        .text(
          `₹${Number(invoice.paid_amount || 0).toFixed(2)} / ₹${Number(invoice.balance_amount || 0).toFixed(2)}`,
          450,
          rY + 2,
          { align: 'right', width: 100 }
        );

      // 5. Signature & Terms
      y = totalBoxY + 125;
      doc.rect(36, y, 523, 65).strokeColor(borderColor).stroke();
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('TERMS & CONDITIONS:', 44, y + 8);
      doc.fillColor(grayColor).fontSize(7).font('Helvetica')
        .text('1. Goods once sold are subject to standard company warranty and returns policy.', 44, y + 20)
        .text('2. Computer-generated tax document. Authorized and valid without physical signature.', 44, y + 30)
        .text('3. Jurisdiction: Subject to local jurisdiction of registered office.', 44, y + 40);

      doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold')
        .text(`For ${companyName}`, 380, y + 18, { align: 'right', width: 170 })
        .text('Authorized Signatory', 380, y + 48, { align: 'right', width: 170 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateSalesOrderPdf(order: any, settings?: PdfCompanySettings | null): Promise<Buffer> {
  const invoiceAdapter = {
    invoice_number: order.invoices?.[0]?.invoice_number || `SO-INV-${order.order_number}`,
    invoice_type: 'TAX_INVOICE',
    reference_order_id: order.id,
    invoice_date: order.order_date || order.created_at,
    status: order.is_paid || order.status === 'DELIVERED' ? 'PAID' : 'UNPAID',
    subtotal: order.subtotal,
    tax_total: order.tax_total,
    grand_total: order.grand_total,
    paid_amount: order.is_paid ? order.grand_total : order.invoices?.[0]?.paid_amount || 0,
    balance_amount: order.is_paid ? 0 : order.invoices?.[0]?.balance_amount || order.grand_total,
    customer: order.customer || {
      name: order.customer_name,
      phone: order.customer_phone,
      address: order.customer_address,
      gstin: order.customer_gstin,
    },
    godown: order.godown || { name: 'Main Central Godown' },
    sales_order: order,
    payments: order.invoices?.[0]?.payments || [],
  };

  return generateInvoicePdf(invoiceAdapter, settings);
}
