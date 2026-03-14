'use client';

import React from 'react';
import { ReceiptData } from '@/types/payments';
import { formatCurrency, formatDate } from '@/lib/utils';

export type PaperWidth = '57mm' | '58mm' | '80mm';

interface ReceiptPrintViewProps {
  receipt: ReceiptData;
  paperWidth: PaperWidth;
  companyLogo: string;
  companyName: string;
  companyTagline?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
}

/* Character widths per paper size (monospace columns that fit) */
const CHAR_WIDTHS: Record<PaperWidth, number> = {
  '57mm': 32,
  '58mm': 32,
  '80mm': 42,
};

/* ─── helpers ─── */
function repeatChar(ch: string, n: number): string {
  return ch.repeat(n);
}

function centerText(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function leftRight(left: string, right: string, width: number): string {
  const gap = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(gap) + right;
}

/**
 * Generate the full receipt HTML as a self-contained string
 * This is used to print via a new window for maximum reliability.
 */
export function generateReceiptHTML(props: ReceiptPrintViewProps): string {
  const { receipt, paperWidth, companyLogo, companyName, companyTagline, companyPhone, companyEmail, companyAddress } = props;
  const r = receipt.receipt;
  const cols = CHAR_WIDTHS[paperWidth];
  const separator = repeatChar('-', cols);
  const doubleSep = repeatChar('=', cols);

  // Font sizing based on paper width
  const baseFontSize = paperWidth === '80mm' ? '11px' : '9px';
  const headerFontSize = paperWidth === '80mm' ? '14px' : '11px';
  const smallFontSize = paperWidth === '80mm' ? '9px' : '7.5px';

  // Build logo URL (resolve relative to origin)
  const logoUrl = companyLogo.startsWith('http') ? companyLogo : companyLogo;

  // Payment history rows
  const historyHTML = r.payment_history.length > 0 ? `
    <div style="font-weight:bold;font-size:${baseFontSize};margin-bottom:2px;">PAYMENT HISTORY</div>
    ${r.payment_history.map(p => `
      <pre style="margin:0;white-space:pre-wrap;word-break:break-all;margin-bottom:2px;">${leftRight(formatDate(p.date), formatCurrency(p.amount), cols)}
  ${p.payment_type.replace('_', ' ')} | ${p.payment_method.toUpperCase()}${p.notes ? `\n  ${p.notes}` : ''}</pre>
    `).join('')}
    <pre style="margin:4px 0;text-align:center;">${separator}</pre>
  ` : '';

  // Notes section
  const notesHTML = r.payment.notes ? `
    <div style="font-weight:bold;font-size:${baseFontSize};margin-bottom:2px;">NOTE</div>
    <pre style="margin:0 0 4px 0;white-space:pre-wrap;word-break:break-all;">${r.payment.notes}</pre>
    <pre style="margin:4px 0;text-align:center;">${separator}</pre>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${r.receipt_number}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0;
      padding: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${baseFontSize};
      line-height: 1.3;
      color: #000;
      background: #fff;
      width: ${paperWidth};
      padding: 6px;
      position: relative;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      opacity: 0.08;
      pointer-events: none;
      z-index: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-content {
      position: relative;
      z-index: 1;
    }
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: inherit;
      line-height: inherit;
    }
    img {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body {
        width: ${paperWidth};
        padding: 4px;
      }
    }
  </style>
</head>
<body>
  <!-- WATERMARK -->
  <div class="watermark">
    <img src="${logoUrl}" alt="" style="width:${paperWidth === '80mm' ? '180' : '130'}px;height:${paperWidth === '80mm' ? '180' : '130'}px;object-fit:contain;" onerror="this.style.display='none'" />
  </div>

  <div class="receipt-content">
  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:2px;">
    <div style="display:flex;justify-content:center;margin-bottom:2px;">
      <img src="${logoUrl}" alt="${companyName}" style="width:${paperWidth === '80mm' ? '70' : '50'}px;height:${paperWidth === '80mm' ? '70' : '50'}px;object-fit:contain;" onerror="this.style.display='none'" />
    </div>
    ${companyTagline ? `<div style="font-size:${smallFontSize};margin-top:1px;">${companyTagline}</div>` : ''}
    ${companyAddress ? `<div style="font-size:${smallFontSize};margin-top:1px;">${companyAddress}</div>` : ''}
    ${(companyPhone || companyEmail) ? `<div style="font-size:${smallFontSize};margin-top:1px;">${[companyPhone, companyEmail].filter(Boolean).join(' | ')}</div>` : ''}
  </div>

  <!-- DOUBLE SEPARATOR -->
  <pre style="margin:2px 0;text-align:center;">${doubleSep}</pre>

  <!-- RECEIPT TITLE -->
  <div style="text-align:center;font-weight:bold;font-size:${headerFontSize};letter-spacing:2px;margin:1px 0;">
    RECEIPT
  </div>

  <pre style="margin:2px 0;text-align:center;">${separator}</pre>

  <!-- RECEIPT INFO -->
  <pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${leftRight('Receipt #:', r.receipt_number, cols)}
${leftRight('Date:', formatDate(r.date), cols)}</pre>

  <pre style="margin:2px 0;text-align:center;">${separator}</pre>

  <!-- CUSTOMER -->
  <div style="font-weight:bold;font-size:${baseFontSize};margin-bottom:2px;">CUSTOMER</div>
  <pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${leftRight('Name:', r.customer.name, cols)}
${leftRight('Phone:', r.customer.phone, cols)}${r.customer.email ? '\n' + leftRight('Email:', r.customer.email, cols) : ''}</pre>

  <pre style="margin:2px 0;text-align:center;">${separator}</pre>

  <!-- JOB DETAILS -->
  <div style="font-weight:bold;font-size:${baseFontSize};margin-bottom:2px;">JOB DETAILS</div>
  <pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${leftRight('Ticket:', r.job.ticket_id, cols)}
${'Desc: ' + r.job.description}
${leftRight('Requested:', formatDate(r.job.date_requested), cols)}${r.job.delivery_deadline ? '\n' + leftRight('Deadline:', formatDate(r.job.delivery_deadline), cols) : ''}</pre>

  <pre style="margin:2px 0;text-align:center;">${doubleSep}</pre>

  <!-- PAYMENT SUMMARY -->
  <div style="font-weight:bold;font-size:${baseFontSize};margin-bottom:2px;">PAYMENT SUMMARY</div>
  <pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${leftRight('Amount Paid:', formatCurrency(r.payment.amount), cols)}
${leftRight('Pay Type:', r.payment.type.replace('_', ' ').toUpperCase(), cols)}
${leftRight('Pay Method:', r.payment.method.toUpperCase(), cols)}
${leftRight('Total Cost:', formatCurrency(r.job.total_cost), cols)}
${leftRight('Prev. Paid:', formatCurrency(r.payment.amount_paid - r.payment.amount), cols)}</pre>

  <pre style="margin:2px 0;text-align:center;">${separator}</pre>

  <!-- BALANCE -->
  <pre style="margin:0;font-weight:bold;white-space:pre-wrap;word-break:break-all;">${leftRight('BALANCE:', formatCurrency(r.payment.balance), cols)}</pre>

  <pre style="margin:2px 0;text-align:center;">${doubleSep}</pre>

  <!-- PAYMENT HISTORY -->
  ${historyHTML}

  <!-- NOTES -->
  ${notesHTML}

  <!-- FOOTER -->
  <div style="text-align:center;font-size:${smallFontSize};margin-top:2px;">
    <pre style="margin:0;font-weight:bold;">${centerText('Thank you for your patronage!', cols)}</pre>
    <pre style="margin:1px 0;">${centerText('Goods sold are not returnable.', cols)}</pre>
    ${companyPhone ? `<pre style="margin:1px 0;">${centerText('Tel: ' + companyPhone, cols)}</pre>` : ''}
    <pre style="margin:2px 0;">${centerText('Printed: ' + new Date().toLocaleString('en-NG'), cols)}</pre>
  </div>

  <!-- CUT LINE -->
  <pre style="margin:3px 0 0 0;text-align:center;letter-spacing:2px;">${'✂' + ' ' + repeatChar('-', cols - 4) + ' ' + '✂'}</pre>
  </div>
</body>
</html>`;
}

/**
 * Opens a new window with the receipt HTML and triggers print.
 * This approach is 100% reliable — bypasses all CSS conflicts.
 */
export function printReceipt(props: ReceiptPrintViewProps): void {
  const html = generateReceiptHTML(props);
  const printWindow = window.open('', '_blank', `width=400,height=600,scrollbars=yes`);

  if (!printWindow) {
    alert('Pop-up blocked! Please allow pop-ups for this site to print receipts.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content (including images) to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Close after a delay to let print dialog finish
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 300);
  };

  // Fallback: if onload doesn't fire quickly, trigger print anyway
  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // Window may already be closed
    }
  }, 2000);
}
