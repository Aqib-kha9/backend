import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { Model } from 'mongoose';
import { UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import Customer from './schemas/customer.schema';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions, Alignment } from 'pdfmake/interfaces';
import { InjectModel } from '@nestjs/mongoose';

@Controller('invoice')
export class InvoiceController {
  constructor(
    @InjectModel('Customer') private readonly customerModel: Model<any>,
  ) {}
  
  @Post('generate-b2b-pdf')
  @UseGuards(JwtAuthGuard)
  async generateB2bPdf(@Body() data: any, @Res() res: Response, @Req() req: any) {
    // Extract party_id from JWT  
    const docDefinition: TDocumentDefinitions = buildInvoiceB2BDocDefinition(data);
    const fonts = {
      Roboto: {
        normal: 'src/fonts/Roboto-Regular.ttf',
        bold: 'src/fonts/Roboto-Medium.ttf',
        italics: 'src/fonts/Roboto-Italic.ttf',
        bolditalics: 'src/fonts/Roboto-MediumItalic.ttf',
      },
    };
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=invoice-b2b.pdf');
    pdfDoc.pipe(res);
    pdfDoc.end();
  }

  @Post('generate-pdf')
  @UseGuards(JwtAuthGuard)
  async generatePdf(@Body() data: any, @Res() res: Response, @Req() req: any) {
    // Extract party_id from JWT
    const party_id = req.user?.partyid;
    const buyer = data.buyer || {};
    const shipping = data.shipping || {};
    // Only save customer if at least one detail is present (besides customerid/party_id)
    if (buyer.name || buyer.address || buyer.phone || buyer.gstin || buyer.email) {
      // Generate unique customerid like C101
      let lastCustomer = await this.customerModel.findOne({ customerid: { $regex: /^C\d+$/ } }).sort({ customerid: -1 }).exec();
      let newCustomerId = 'C101';
      if (lastCustomer) {
        const lastNum = parseInt(lastCustomer.customerid.replace('C', ''), 10);
        newCustomerId = `C${lastNum + 1}`;
      }
      // Prepare customer data
      const customerData = {
        name: buyer.name,
        address: buyer.address,
        phone: buyer.phone,
        gstin: buyer.gstin,
        email: buyer.email,
        shipping_address: shipping.address,
        shippingto: shipping.name,
        courier: shipping.courier,
        trackingNo: shipping.trackingNo,
        party_id,
        customerid: newCustomerId
      };
      // Save or update customer (upsert by phone+party_id)
      await this.customerModel.findOneAndUpdate(
        { phone: buyer.phone, party_id },
        customerData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    const docDefinition: TDocumentDefinitions = buildInvoiceDocDefinition(data);

    // Use local font files for Node.js
    const fonts = {
      Roboto: {
        normal: 'src/fonts/Roboto-Regular.ttf',
        bold: 'src/fonts/Roboto-Medium.ttf',
        italics: 'src/fonts/Roboto-Italic.ttf',
        bolditalics: 'src/fonts/Roboto-MediumItalic.ttf',
      },
    };
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
    pdfDoc.pipe(res);
    pdfDoc.end();
  }
}

function buildInvoiceDocDefinition(data: any) {
  // Calculate product values, GST summary, grand total, and amount in words (mirror frontend logic)
  let grandTotal = 0;
  let gstSummary: { [key: string]: { taxable: number; gst: number } } = {};
  const products = (data.products || []).map((row: any) => {
    const qty = Number(row["Qty"] || 1);
    const rate = Number(row["Rate (₹)"] || 0);
    const gstPercent = Number(row["GST %"] || 0);
    const taxable = qty * rate;
    const gstAmt = (taxable * gstPercent) / 100;
    const total = taxable + gstAmt;
    if (gstPercent) {
      if (!gstSummary[gstPercent]) gstSummary[gstPercent] = { taxable: 0, gst: 0 };
      gstSummary[gstPercent].taxable += taxable;
      gstSummary[gstPercent].gst += gstAmt;
    }
    grandTotal += total;
    return {
      ...row,
      "Taxable Value (₹)": taxable,
      "GST Amt (₹)": gstAmt,
      "Total (₹)": total
    };
  });
  // Utility to convert number to words (simple version for INR)
  function numberToWords(num: number): string {
    const a = [ '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen' ];
    const b = [ '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety' ];
    if ((num = num || 0) === 0) return 'Zero';
    if (num > 999999999) return 'Overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{3})$/);
    if (!n) return '';
    let str = '';
    str += (+n[1] ? (a[+n[1]] || b[+n[1][0]] + ' ' + a[+n[1][1]]) + ' Crore ' : '');
    str += (+n[2] ? (a[+n[2]] || b[+n[2][0]] + ' ' + a[+n[2][1]]) + ' Lakh ' : '');
    str += (+n[3] ? (a[+n[3]] || b[+n[3][0]] + ' ' + a[+n[3][1]]) + ' Thousand ' : '');
    str += (+n[4] ? (a[+n[4]] || b[+n[4][0]] + ' ' + a[+n[4][1]]) + ' ' : '');
    return str.trim() + 'Only';
  }
  const grandTotalStr = grandTotal.toFixed(2);
  const amountWords = numberToWords(Math.round(grandTotal));
  // --- Updated Table Handling ---
  const columns = Array.isArray(data.columns) && data.columns.length > 0
    ? data.columns
    : ["S. No.", "Product Name", "HSN Code", "Qty", "Price (₹)", "Offer Price (₹)", "Taxable Value (₹)", "GST %", "GST Amt (₹)", "Total (₹)"];
  const tableBody = [
    columns.map((col: string) => ({ text: col, bold: true, noWrap: false, fontSize: 9 })),
    ...products.map((item: any, idx: number) =>
      columns.map((col: string) =>
        col === 'S. No.' ? { text: String(idx + 1), noWrap: false, fontSize: 9 } : { text: String(item[col] ?? ''), noWrap: false, fontSize: 9 }
      )
    )
  ];
  // --- End Table Handling Update ---
  // GST summary table
  const gstSummaryTable = {
    table: {
      headerRows: 1,
      widths: ['*', '*', '*'],
      body: [
        [
          { text: 'GST %', bold: true },
          { text: 'Taxable Value', bold: true },
          { text: 'GST Amount', bold: true }
        ],
        ...Object.entries(gstSummary).map(([gst, vals]) => [
          { text: gst },
          { text: (vals as any).taxable.toFixed(2), alignment: 'right' },
          { text: (vals as any).gst.toFixed(2), alignment: 'right' }
        ])
      ]
    },
    margin: [0, 10, 0, 0]
  };
  // GST summary block
  const gstSummaryArr = Object.entries(gstSummary).map(([gst, vals]) => ({
    gstPercent: gst,
    taxable: (vals as any).taxable.toFixed(2),
    gstAmt: (vals as any).gst.toFixed(2)
  }));
  const gstSummaryBlock = {
    stack: gstSummaryArr.map(row => ({
      text: `GST ${row.gstPercent}%: Taxable ₹${row.taxable}, GST ₹${row.gstAmt}`,
      fontSize: 9,
      margin: [0, 0, 0, 2]
    })),
    margin: [0, 4, 0, 4]
  };

  // Extra fields
  const extraFieldsContent = (Array.isArray(data.extraFields) && data.extraFields.length > 0)
    ? [
        { text: 'Extra Fields:', style: 'subheader', margin: [0, 10, 0, 0] },
        ...data.extraFields.map((f: any) => ({ text: `${f.key}: ${f.value}`, noWrap: false, fontSize: 9 }))
      ]
    : [];

  // Store/company info
  const storeInfo = data.storeInfo || {};
  const storeInfoContent = [
    storeInfo.name ? { text: storeInfo.name, style: 'header', noWrap: false, fontSize: 9 } : null,
    storeInfo.address ? { text: storeInfo.address, noWrap: false, fontSize: 9 } : null,
    storeInfo.gstin ? { text: `GSTIN: ${storeInfo.gstin}`, noWrap: false, fontSize: 9 } : null,
    storeInfo.pan ? { text: `PAN: ${storeInfo.pan}`, noWrap: false, fontSize: 9 } : null,
    storeInfo.contact ? { text: `Contact: ${storeInfo.contact}`, noWrap: false, fontSize: 9 } : null
  ].filter(Boolean);

  // Logo (if present)
  const logoContent = data.logo ? [{ image: data.logo, width: 80, height: 80, alignment: 'right', margin: [0, 0, 0, 10], maxWidth: 100, maxHeight: 100, fit: [80, 80] }] : [];

  return {
    pageSize: 'A4' as import('pdfmake/interfaces').PageSize,
    pageMargins: [8, 8, 8, 8] as [number, number, number, number],
    content: [
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'INVOICE', style: 'header', margin: [0, 10, 0, 10], noWrap: false, fontSize: 11 },
                {
                  columns: [
                    [
                      ...storeInfoContent,
                    ],
                    data.logo ? { image: data.logo, fit: [60, 60], alignment: 'right', margin: [0, 0, 0, 10], maxWidth: 60, maxHeight: 60 } : {}
                  ],
                  columnGap: 10,
                  widths: ['*', 'auto']
                },
                {
                  columns: [
                    { text: `Invoice No: ${data.invoiceNo || ''}\nOrder ID: ${data.orderId || ''}`, noWrap: false, fontSize: 9 },
                    { text: `Date: ${data.date || ''}\nPayment: ${data.paymentMode || ''}`, alignment: 'right', noWrap: false, fontSize: 9 }
                  ]
                } as any,
                { text: 'Sold By:', style: 'subheader', noWrap: false, fontSize: 9 },
                { text: data.seller?.name ? String(data.seller.name) : ' ', noWrap: false, fontSize: 9 },
                { text: data.seller?.address || '', noWrap: false, fontSize: 9 },
                { text: `GSTIN: ${data.seller?.gstin || ''}   PAN: ${data.seller?.pan || ''}`, noWrap: false, fontSize: 9 },
                { text: `Contact: ${data.seller?.contact || ''}`, noWrap: false, fontSize: 9 },
                { text: 'Billed To:', style: 'subheader', margin: [0, 10, 0, 0] as [number, number, number, number], noWrap: false, fontSize: 9 },
                { text: data.buyer?.name || '', noWrap: false, fontSize: 9 },
                { text: data.buyer?.address || '', noWrap: false, fontSize: 9 },
                { text: `Phone: ${data.buyer?.phone || ''}`, noWrap: false, fontSize: 9 },
                data.buyer?.email ? { text: `Email: ${data.buyer.email}`, noWrap: false, fontSize: 9 } : null,
                { text: `GSTIN: ${data.buyer?.gstin || ''}`, noWrap: false, fontSize: 9 },
                { text: 'Shipped To:', style: 'subheader', margin: [0, 10, 0, 0] as [number, number, number, number], noWrap: false, fontSize: 9 },
                { text: data.shipping?.name || '', noWrap: false, fontSize: 9 },
                { text: data.shipping?.address || '', noWrap: false, fontSize: 9 },
                { text: `Courier: ${data.shipping?.courier || ''}`, noWrap: false, fontSize: 9 },
                { text: `Tracking No: ${data.shipping?.trackingNo || ''}`, noWrap: false, fontSize: 9, margin: [0, 0, 0, 8] },
                {
                  table: {
                    headerRows: 1,
                    widths: columns.map(() => 'auto'),
                    body: tableBody
                  }
                } as any,
                gstSummaryTable,
                gstSummaryBlock,
                { text: `Grand Total: ${grandTotalStr}`, style: 'subheader', margin: [0, 10, 0, 0] },
                { text: amountWords, italics: true },
                ...extraFieldsContent,
                { text: 'Declaration:', style: 'subheader', margin: [0, 10, 0, 0] },
                { text: data.declaration || 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.' },
                { text: 'This is a computer-generated invoice and does not require a signature.', margin: [0, 10, 0, 0] },
                { text: 'Authorized Signatory', style: 'subheader', margin: [0, 10, 0, 0] },
                { text: data.seller?.name ? String(data.seller.name) : ' ' }
              ],
              margin: [20, 16, 20, 16] as [number, number, number, number]
            }
          ]]
        },
        layout: {
          hLineWidth: function(i, node) { return 1; },
          vLineWidth: function(i, node) { return 1; },
          hLineColor: function(i, node) { return '#bdbdbd'; },
          vLineColor: function(i, node) { return '#bdbdbd'; },
        },
        margin: [0, 0, 0, 0] as [number, number, number, number]
      },
    ],
    styles: {
      header: { fontSize: 15, bold: true, alignment: 'center' as Alignment, margin: [0, 0, 0, 10] as [number, number, number, number] },
      subheader: { fontSize: 10, bold: true, margin: [0, 10, 0, 2] as [number, number, number, number] }
    }
  };
}

function buildInvoiceB2BDocDefinition(data: any) {
  // Calculate product values, GST summary, grand total, and amount in words (mirror frontend logic)
  let grandTotal = 0;
  let gstSummary: { [key: string]: { taxable: number; gst: number } } = {};
  const products = (data.products || []).map((row: any) => {
    const qty = Number(row["Qty"] || 1);
    const rate = Number(row["Rate (₹)"] || 0);
    const gstPercent = Number(row["GST %"] || 0);
    const transportCost = Number(row["Transport Cost (₹)"] || 0);
    const taxable = qty * rate;
    const gstAmt = (taxable * gstPercent) / 100;
    const total = taxable + gstAmt + transportCost;
    if (gstPercent) {
      if (!gstSummary[gstPercent]) gstSummary[gstPercent] = { taxable: 0, gst: 0 };
      gstSummary[gstPercent].taxable += taxable;
      gstSummary[gstPercent].gst += gstAmt;
    }
    grandTotal += total;
    return {
      ...row,
      "Taxable Value (₹)": taxable,
      "GST Amt (₹)": gstAmt,
      "Total (₹)": total
    };
  });
  function numberToWords(num: number): string {
    const a = [ '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen' ];
    const b = [ '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety' ];
    if ((num = num || 0) === 0) return 'Zero';
    if (num > 999999999) return 'Overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{3})$/);
    if (!n) return '';
    let str = '';
    str += (+n[1] ? (a[+n[1]] || b[+n[1][0]] + ' ' + a[+n[1][1]]) + ' Crore ' : '');
    str += (+n[2] ? (a[+n[2]] || b[+n[2][0]] + ' ' + a[+n[2][1]]) + ' Lakh ' : '');
    str += (+n[3] ? (a[+n[3]] || b[+n[3][0]] + ' ' + a[+n[3][1]]) + ' Thousand ' : '');
    str += (+n[4] ? (a[+n[4]] || b[+n[4][0]] + ' ' + a[+n[4][1]]) + ' ' : '');
    return str.trim() + 'Only';
  }
  const grandTotalStr = grandTotal.toFixed(2);
  const amountWords = numberToWords(Math.round(grandTotal));
  const columns = Array.isArray(data.columns) && data.columns.length > 0
    ? data.columns
    : ["S. No.", "Product Name", "SKU", "Brand", "Sku Code", "Product Description", "Qty", "Rate (₹)", "GST %", "GST Amt (₹)", "Transport Cost (₹)", "Total (₹)"];

  const tableBody = [
    columns.map((col: string) => ({ text: col, bold: true, noWrap: false, fontSize: 9 })),
    ...(products.map((item: any, idx: number) =>
      columns.map((col: string) =>
        col === 'S. No.' ? { text: String(idx + 1), noWrap: false, fontSize: 9 } : { text: String(item[col] ?? ''), noWrap: false, fontSize: 9 }
      )
    ))
  ];

  // GST summary table
  const gstSummaryTable = {
    table: {
      headerRows: 1,
      widths: ['*', '*', '*'],
      body: [
        [
          { text: 'GST %', bold: true },
          { text: 'Taxable Value', bold: true },
          { text: 'GST Amount', bold: true }
        ],
        ...Object.entries(gstSummary).map(([gst, vals]) => [
          { text: gst },
          { text: (vals as any).taxable.toFixed(2), alignment: 'right' },
          { text: (vals as any).gst.toFixed(2), alignment: 'right' }
        ])
      ]
    },
    margin: [0, 10, 0, 0]
  };

  // GST summary block
  const gstSummaryArr = Object.entries(gstSummary).map(([gst, vals]) => ({
    gstPercent: gst,
    taxable: (vals as any).taxable.toFixed(2),
    gstAmt: (vals as any).gst.toFixed(2)
  }));
  const gstSummaryBlock = {
    stack: gstSummaryArr.map(row => ({
      text: `GST ${row.gstPercent}%: Taxable ₹${row.taxable}, GST ₹${row.gstAmt}`,
      fontSize: 9,
      margin: [0, 0, 0, 2]
    })),
    margin: [0, 4, 0, 4]
  };

  // Extra fields
  const extraFieldsContent = (Array.isArray(data.extraFields) && data.extraFields.length > 0)
    ? [
        { text: 'Extra Fields:', style: 'subheader', margin: [0, 10, 0, 0] },
        ...data.extraFields.map((f: any) => ({ text: `${f.key}: ${f.value}`, noWrap: false, fontSize: 9 }))
      ]
    : [];

  // Store/company info
  const storeInfo = data.storeInfo || {};
  const storeInfoContent = [
    storeInfo.name ? { text: storeInfo.name, style: 'header', noWrap: false, fontSize: 9 } : null,
    storeInfo.address ? { text: storeInfo.address, noWrap: false, fontSize: 9 } : null,
    storeInfo.gstin ? { text: `GSTIN: ${storeInfo.gstin}`, noWrap: false, fontSize: 9 } : null,
    storeInfo.pan ? { text: `PAN: ${storeInfo.pan}`, noWrap: false, fontSize: 9 } : null,
    storeInfo.contact ? { text: `Contact: ${storeInfo.contact}`, noWrap: false, fontSize: 9 } : null
  ].filter(Boolean);

  // Logo (if present)
  const logoContent = data.logo ? [{ image: data.logo, width: 80, height: 80, alignment: 'right', margin: [0, 0, 0, 10], maxWidth: 100, maxHeight: 100, fit: [80, 80] }] : [];

  // B2B-specific fields
  const b2bFields = [
    { text: `Transport Mode: ${data.transportMode || '-'}`, noWrap: false, fontSize: 9 },
    { text: `E-Way Bill No.: ${data.ewayBillNo || '-'}`, noWrap: false, fontSize: 9 },
    { text: `Vehicle Number: ${data.vehicleNumber || '-'}`, noWrap: false, fontSize: 9 },
    { text: `Remarks/Notes: ${data.remarks || '-'}`, noWrap: false, fontSize: 9 },
    { text: `Authorized Signature: ${data.authorizedSignature || '-'}`, noWrap: false, fontSize: 9 }
  ];
  return {
    pageSize: 'A4' as import('pdfmake/interfaces').PageSize,
    pageMargins: [8, 8, 8, 8] as [number, number, number, number],
    content: [
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'INVOICE B2B', style: 'header', margin: [0, 10, 0, 10], noWrap: false, fontSize: 11 },
                {
                  columns: [
                    [
                      ...storeInfoContent,
                    ],
                    data.logo ? { image: data.logo, fit: [60, 60], alignment: 'right', margin: [0, 0, 0, 10], maxWidth: 60, maxHeight: 60 } : {}
                  ],
                  columnGap: 10,
                  widths: ['*', 'auto']
                },
                {
                  columns: [
                    { text: `Invoice No: ${data.invoiceNo || ''}\nOrder ID: ${data.orderId || ''}`, noWrap: false, fontSize: 9 },
                    { text: `Date: ${data.date || ''}\nPayment: ${data.paymentMode || ''}`, alignment: 'right', noWrap: false, fontSize: 9 }
                  ]
                } as any,
                ...b2bFields,
                { text: 'Sold By:', style: 'subheader', noWrap: false, fontSize: 9 },
                { text: data.seller?.name ? String(data.seller.name) : ' ', noWrap: false, fontSize: 9 },
                { text: data.seller?.address || '', noWrap: false, fontSize: 9 },
                { text: `GSTIN: ${data.seller?.gstin || ''}   PAN: ${data.seller?.pan || ''}`, noWrap: false, fontSize: 9 },
                { text: `Contact: ${data.seller?.contact || ''}`, noWrap: false, fontSize: 9 },
                { text: 'Billed To:', style: 'subheader', margin: [0, 10, 0, 0] as [number, number, number, number], noWrap: false, fontSize: 9 },
                { text: data.buyer?.name || '', noWrap: false, fontSize: 9 },
                { text: data.buyer?.address || '', noWrap: false, fontSize: 9 },
                { text: `Phone: ${data.buyer?.phone || ''}`, noWrap: false, fontSize: 9 },
                data.buyer?.email ? { text: `Email: ${data.buyer.email}`, noWrap: false, fontSize: 9 } : null,
                { text: `GSTIN: ${data.buyer?.gstin || ''}`, noWrap: false, fontSize: 9 },
                { text: 'Shipped To:', style: 'subheader', margin: [0, 10, 0, 0] as [number, number, number, number], noWrap: false, fontSize: 9 },
                { text: data.shipping?.name || '', noWrap: false, fontSize: 9 },
                { text: data.shipping?.address || '', noWrap: false, fontSize: 9 },
                { text: `Courier: ${data.shipping?.courier || ''}`, noWrap: false, fontSize: 9 },
                { text: `Tracking No: ${data.shipping?.trackingNo || ''}`, noWrap: false, fontSize: 9, margin: [0, 0, 0, 8] },
                {
                  table: {
                    headerRows: 1,
                    widths: columns.map(() => 'auto'),
                    body: tableBody
                  }
                } as any,
                gstSummaryTable,
                gstSummaryBlock,
                { text: `Grand Total: ${grandTotalStr}`, style: 'subheader', margin: [0, 10, 0, 0] },
                { text: amountWords, italics: true },
                ...extraFieldsContent,
                { text: 'Declaration:', style: 'subheader', margin: [0, 10, 0, 0] },
                { text: data.declaration || 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.' },
                { text: 'This is a computer-generated invoice and does not require a signature.', margin: [0, 10, 0, 0] },
                { text: 'Authorized Signatory', style: 'subheader', margin: [0, 10, 0, 0] },
                { text: data.seller?.name ? String(data.seller.name) : ' ' }
              ],
              margin: [20, 16, 20, 16] as [number, number, number, number]
            }
          ]]
        },
        layout: {
          hLineWidth: function(i, node) { return 1; },
          vLineWidth: function(i, node) { return 1; },
          hLineColor: function(i, node) { return '#bdbdbd'; },
          vLineColor: function(i, node) { return '#bdbdbd'; },
        },
        margin: [0, 0, 0, 0] as [number, number, number, number]
      },
    ],
    styles: {
      header: { fontSize: 15, bold: true, alignment: 'center' as Alignment, margin: [0, 0, 0, 10] as [number, number, number, number] },
      subheader: { fontSize: 10, bold: true, margin: [0, 10, 0, 2] as [number, number, number, number] }
    }
  };
} 