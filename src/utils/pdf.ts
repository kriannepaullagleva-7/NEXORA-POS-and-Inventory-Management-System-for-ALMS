import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// jsPDF's built-in fonts don't carry a ₱ glyph, so PDF output uses the "PHP" prefix
// instead of the peso sign used everywhere else in the UI (`fmt.peso`).
const pesoPdf = (v: number) => `PHP ${(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Report tables are built from values that already went through fmt.peso() for
// on-screen display, which uses the real ₱ character. Passed straight through
// to jsPDF's built-in Helvetica, that glyph doesn't exist and silently renders
// as "±" (or a tofu box, depending on platform) instead of a peso sign — wrong
// in every report this function has ever produced. Swapping it for "PHP " here,
// once, fixes every exported report without every call site having to know
// about jsPDF's font limitation the way printReceipt's pesoPdf() already does.
const toPdfCell = (v: string | number): string | number => (typeof v === 'string' ? v.replace(/₱/g, 'PHP ') : v);

const SYSTEM_TITLE = 'POINT OF SALE AND INVENTORY MANAGEMENT SYSTEM';

interface ExportReportOptions {
  reportTitle: string;
  period?: string;
  filtersLabel?: string;
  columns: string[];
  rows: (string | number)[][];
  totalsRow?: (string | number)[];
  fileName?: string;
}

export function exportReportPdf(opts: ExportReportOptions) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(SYSTEM_TITLE, margin, 32);

  const generated = `Generated ${new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`;
  doc.text(generated, pageWidth - margin, 32, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(String(toPdfCell(opts.reportTitle)), margin, 54);

  let y = 72;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (opts.period) { doc.text(`Period: ${toPdfCell(opts.period)}`, margin, y); y += 14; }
  if (opts.filtersLabel) { doc.text(`Filters: ${toPdfCell(opts.filtersLabel)}`, margin, y); y += 14; }

  autoTable(doc, {
    startY: y + 4,
    head: [opts.columns.map(toPdfCell)],
    body: opts.rows.map(row => row.map(toPdfCell)),
    foot: opts.totalsRow ? [opts.totalsRow.map(toPdfCell)] : undefined,
    margin: { left: margin, right: margin, bottom: 40 },
    styles: { fontSize: 9, cellPadding: 6, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(SYSTEM_TITLE, margin, pageHeight - 20);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  doc.save(opts.fileName || `${opts.reportTitle.replace(/\s+/g, '_')}.pdf`);
}

export interface ReceiptLineItem { name: string; qty: number; unit?: string; price: number; subtotal: number; }

export interface ReceiptOptions {
  businessName: string;
  tagline?: string;
  txnId: string;
  dateTime: string;
  cashier: string;
  customer?: string;
  items: ReceiptLineItem[];
  deliveryFee?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  balance?: number;
  gcashRef?: string;
  fileName?: string;
}

export function printReceipt(opts: ReceiptOptions) {
  const width = 80;
  const estHeight = 58 + opts.items.length * 5 + 40;
  const doc = new jsPDF({ unit: 'mm', format: [width, estHeight] });
  const marginX = 5;
  let y = 9;

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(opts.businessName, width / 2, y, { align: 'center' });
  y += 5;

  if (opts.tagline) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.text(opts.tagline, width / 2, y, { align: 'center' });
    y += 5;
  }

  doc.setFontSize(8);
  doc.text(opts.txnId, width / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Date: ${opts.dateTime}`, marginX, y); y += 4;
  doc.text(`Cashier: ${opts.cashier}`, marginX, y); y += 4;
  if (opts.customer) { doc.text(`Customer: ${opts.customer}`, marginX, y); y += 4; }
  y += 1;
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(marginX, y, width - marginX, y);
  y += 4;

  opts.items.forEach(item => {
    const label = `${item.qty}x ${item.name}`;
    const lines = doc.splitTextToSize(label, width - marginX * 2 - 22);
    lines.forEach((line: string, i: number) => {
      doc.text(line, marginX, y);
      if (i === lines.length - 1) doc.text(pesoPdf(item.subtotal), width - marginX, y, { align: 'right' });
      y += 4;
    });
  });

  if (opts.deliveryFee) {
    doc.text('Delivery Fee', marginX, y);
    doc.text(pesoPdf(opts.deliveryFee), width - marginX, y, { align: 'right' });
    y += 4;
  }
  if (opts.discount) {
    doc.text('Discount', marginX, y);
    doc.text(`-${pesoPdf(opts.discount)}`, width - marginX, y, { align: 'right' });
    y += 4;
  }

  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(marginX, y, width - marginX, y);
  y += 5;

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL', marginX, y);
  doc.text(pesoPdf(opts.total), width - marginX, y, { align: 'right' });
  y += 6;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Payment: ${opts.paymentMethod.toUpperCase()}`, marginX, y); y += 4;
  if (opts.gcashRef) { doc.text(`Ref: ${opts.gcashRef}`, marginX, y); y += 4; }
  if (opts.amountReceived !== undefined) { doc.text(`Received: ${pesoPdf(opts.amountReceived)}`, marginX, y); y += 4; }
  if (opts.change) { doc.text(`Change: ${pesoPdf(opts.change)}`, marginX, y); y += 4; }
  if (opts.balance) { doc.text(`Balance: ${pesoPdf(opts.balance)}`, marginX, y); y += 4; }

  y += 5;
  doc.setFontSize(7);
  doc.text('Thank you for your business!', width / 2, y, { align: 'center' });

  doc.save(opts.fileName || `${opts.txnId}.pdf`);
}
