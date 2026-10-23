import { Receipt, BuildingEstateLevyReceipt, EstateSettings, MonthlyPayment, Resident } from '../types/database';

export interface OfficialReceiptDocumentData {
  receiptNumber: string;
  levyType: 'SECURITY_LEVY' | 'ESTATE_LEVY';
  levyTitle: string;
  residentNumber: string;
  residentName: string;
  houseNumber: string;
  buildingName?: string | null;
  periodCovered: string;
  amountPaid: number;
  currency: string;
  paymentDate: string;
  paymentReference: string;
  status: string;
  estateName: string;
  estateSubtitle: string;
  estateAddress: string;
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * Converts a Resident Security Levy Receipt into OfficialReceiptDocumentData
 */
export function fromSecurityReceipt(
  receipt: Receipt,
  estateSettings?: EstateSettings
): OfficialReceiptDocumentData {
  return {
    receiptNumber: receipt.receipt_number,
    levyType: 'SECURITY_LEVY',
    levyTitle: 'Monthly Resident Security Levy',
    residentNumber: receipt.resident_number,
    residentName: receipt.resident_name,
    houseNumber: receipt.house_number,
    periodCovered: receipt.period_covered,
    amountPaid: Number(receipt.amount_paid || 0),
    currency: receipt.currency || 'NGN',
    paymentDate: receipt.payment_date || receipt.issued_at || new Date().toISOString(),
    paymentReference: receipt.paystack_reference,
    status: receipt.status || 'PAID',
    estateName: estateSettings?.estate_name || 'Finger of God Estate',
    estateSubtitle: 'RESIDENT SECURITY & INFRASTRUCTURE PORTAL',
    estateAddress: estateSettings?.estate_address || 'Off Okpanam Road, Asaba, Delta State, Nigeria',
    contactEmail: estateSettings?.contact_email,
    contactPhone: estateSettings?.contact_phone,
  };
}

/**
 * Builds a Receipt object from a MonthlyPayment record if not already matched
 */
export function buildReceiptFromMonthlyPayment(
  payment: MonthlyPayment,
  resident: Resident,
  existingReceipts: Receipt[] = []
): Receipt {
  const matched = existingReceipts.find(
    (r) => r.payment_id === payment.id || r.period_covered === payment.period_label
  );
  if (matched) return matched;

  return {
    id: `rcp-${payment.id}`,
    receipt_number: `RCP-${payment.period_year}${payment.period_month
      .toString()
      .padStart(2, '0')}-${resident.resident_number}-AUTO`,
    transaction_id: `tx-${payment.id}`,
    payment_id: payment.id,
    resident_id: resident.id,
    resident_number: resident.resident_number,
    resident_name: resident.full_name,
    house_number: resident.house_number,
    amount_paid: payment.amount_paid || 1500,
    currency: 'NGN',
    period_covered: payment.period_label,
    payment_date: payment.paid_at || new Date().toISOString(),
    paystack_reference:
      payment.paystack_reference ||
      `FOGES-${payment.period_year}${payment.period_month}-${resident.resident_number}`,
    status: 'PAID',
    issued_at: payment.paid_at || new Date().toISOString(),
    resident,
  };
}

/**
 * Converts a Building Estate Levy Receipt into OfficialReceiptDocumentData
 */
export function fromEstateLevyReceipt(
  receipt: BuildingEstateLevyReceipt,
  estateSettings?: EstateSettings,
  fallbackResidentNumber?: string
): OfficialReceiptDocumentData {
  return {
    receiptNumber: receipt.receipt_number,
    levyType: 'ESTATE_LEVY',
    levyTitle: 'Building Monthly Estate Levy',
    residentNumber: receipt.resident_number || fallbackResidentNumber || 'N/A',
    residentName: receipt.payer_name,
    houseNumber: receipt.building_house_number,
    buildingName: receipt.building_name || null,
    periodCovered: receipt.billing_month_label || receipt.billing_month,
    amountPaid: Number(receipt.amount_paid || 0),
    currency: receipt.currency || 'NGN',
    paymentDate: receipt.payment_date || receipt.issued_at || new Date().toISOString(),
    paymentReference: receipt.paystack_reference,
    status: receipt.status || 'PAID',
    estateName: estateSettings?.estate_name || 'Finger of God Estate',
    estateSubtitle: 'ESTATE MANAGEMENT & BUILDING LEVY REGISTRY',
    estateAddress: estateSettings?.estate_address || 'Off Okpanam Road, Asaba, Delta State, Nigeria',
    contactEmail: estateSettings?.contact_email,
    contactPhone: estateSettings?.contact_phone,
  };
}

/**
 * Escapes text for PDF string literals
 */
function escapePdfText(input: string): string {
  // Replace Naira symbol ₦ with "NGN " for guaranteed standard PDF Type1 Helvetica rendering
  const normalized = (input || '')
    .replace(/₦/g, 'NGN ')
    .replace(/•/g, '-')
    .replace(/[^\x20-\x7E]/g, '');
  return normalized
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatPdfCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return `NGN ${formatted}`;
}

function formatReadableDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generates a complete, valid vector PDF 1.4 document with the Finger of God Estate Logo
 * and triggers a direct browser file download (`FingerOfGod-Receipt-<receiptNumber>.pdf`).
 */
export function downloadOfficialReceiptPdf(data: OfficialReceiptDocumentData): void {
  // Page dimensions: A4 Portrait (595.28 x 841.89 pt)
  const W = 595.28;
  const H = 841.89;
  const ops: string[] = [];

  // Helper to convert top-down Y coordinate to PDF bottom-up Y coordinate
  const yPt = (topY: number) => Number((H - topY).toFixed(2));

  // Helper: Draw filled rectangle (top-left x, topY, width, height, rgb [0..1])
  const fillRect = (x: number, topY: number, w: number, h: number, rgb: [number, number, number]) => {
    ops.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg`);
    ops.push(`${x.toFixed(2)} ${(H - topY - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  };

  // Helper: Draw stroked rectangle
  const strokeRect = (
    x: number,
    topY: number,
    w: number,
    h: number,
    rgb: [number, number, number],
    lineWidth = 1
  ) => {
    ops.push(`${lineWidth.toFixed(2)} w`);
    ops.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} RG`);
    ops.push(`${x.toFixed(2)} ${(H - topY - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  };

  // Helper: Draw line
  const drawLine = (
    x1: number,
    topY1: number,
    x2: number,
    topY2: number,
    rgb: [number, number, number],
    lineWidth = 1
  ) => {
    ops.push(`${lineWidth.toFixed(2)} w`);
    ops.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} RG`);
    ops.push(`${x1.toFixed(2)} ${yPt(topY1)} m ${x2.toFixed(2)} ${yPt(topY2)} l S`);
  };

  // Helper: Draw text
  const drawText = (
    text: string,
    x: number,
    topY: number,
    size: number,
    font: 'F1' | 'F2' | 'F3', // F1 = Helvetica, F2 = Helvetica-Bold, F3 = Courier-Bold
    rgb: [number, number, number]
  ) => {
    ops.push('BT');
    ops.push(`/${font} ${size} Tf`);
    ops.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg`);
    ops.push(`1 0 0 1 ${x.toFixed(2)} ${yPt(topY)} Tm`);
    ops.push(`(${escapePdfText(text)}) Tj`);
    ops.push('ET');
  };

  // Color Palette
  const darkSlate: [number, number, number] = [0.059, 0.09, 0.165]; // #0f172a
  const deepEmerald: [number, number, number] = [0.024, 0.306, 0.231]; // #064e3b
  const emerald: [number, number, number] = [0.063, 0.725, 0.506]; // #10b981
  const lightEmeraldBg: [number, number, number] = [0.925, 0.992, 0.961]; // #ecfdf5
  const gold: [number, number, number] = [0.961, 0.62, 0.043]; // #f59e0b
  const lightGold: [number, number, number] = [0.992, 0.902, 0.541]; // #fde68a
  const white: [number, number, number] = [1, 1, 1];
  const slateMuted: [number, number, number] = [0.392, 0.455, 0.545]; // #64748b
  const slateLightBg: [number, number, number] = [0.973, 0.98, 0.988]; // #f8fafc
  const borderGray: [number, number, number] = [0.886, 0.91, 0.941]; // #e2e8f0

  // Outer Card Border
  fillRect(36, 36, W - 72, H - 72, white);
  strokeRect(36, 36, W - 72, H - 72, borderGray, 1.2);

  // Header Banner (Dark Slate + Deep Emerald Accent Bar)
  fillRect(36, 36, W - 72, 118, darkSlate);
  fillRect(36, 150, W - 72, 4, emerald);

  // ============================================================================
  // VECTOR FINGER OF GOD ESTATE LOGO EMBLEM (Top-Left at x=58, topY=56, size=68x68)
  // ============================================================================
  const lx = 58;
  const ly = 56;
  // Shield / Hexagon points mapped from the SVG 64x64 viewBox to 68x68 box
  const sx = (vx: number) => (lx + (vx / 64) * 68).toFixed(2);
  const sy = (vy: number) => yPt(ly + (vy / 64) * 68).toFixed(2);

  // Outer Shield Polygon filled with Deep Emerald and stroked with Gold
  ops.push('1.6 w');
  ops.push(`${deepEmerald[0]} ${deepEmerald[1]} ${deepEmerald[2]} rg`);
  ops.push(`${gold[0]} ${gold[1]} ${gold[2]} RG`);
  ops.push(
    `${sx(32)} ${sy(4)} m ${sx(56)} ${sy(14)} l ${sx(56)} ${sy(34)} l ${sx(44)} ${sy(55)} l ${sx(32)} ${sy(60)} l ${sx(20)} ${sy(55)} l ${sx(8)} ${sy(34)} l ${sx(8)} ${sy(14)} l h B`
  );

  // Inner Shield Trim
  ops.push('0.8 w');
  ops.push(`${emerald[0]} ${emerald[1]} ${emerald[2]} RG`);
  ops.push(
    `${sx(32)} ${sy(8)} m ${sx(52)} ${sy(16.5)} l ${sx(52)} ${sy(33.5)} l ${sx(41)} ${sy(51)} l ${sx(32)} ${sy(56)} l ${sx(23)} ${sy(51)} l ${sx(12)} ${sy(33.5)} l ${sx(12)} ${sy(16.5)} l h S`
  );

  // Architectural Estate Towers inside the Shield
  // Left Tower (Emerald)
  ops.push(`${emerald[0]} ${emerald[1]} ${emerald[2]} rg`);
  ops.push(`${sx(18)} ${sy(29)} m ${sx(25)} ${sy(25)} l ${sx(25)} ${sy(44)} l ${sx(18)} ${sy(44)} l h f`);

  // Center Main Residence Tower (Gold)
  ops.push(`${gold[0]} ${gold[1]} ${gold[2]} rg`);
  ops.push(
    `${sx(27)} ${sy(18)} m ${sx(32)} ${sy(14)} l ${sx(37)} ${sy(18)} l ${sx(37)} ${sy(44)} l ${sx(27)} ${sy(44)} l h f`
  );

  // Right Tower (Emerald)
  ops.push(`${emerald[0]} ${emerald[1]} ${emerald[2]} rg`);
  ops.push(`${sx(39)} ${sy(25)} m ${sx(46)} ${sy(29)} l ${sx(46)} ${sy(44)} l ${sx(39)} ${sy(44)} l h f`);

  // Tower Windows (Dark Emerald cutouts on center tower)
  ops.push(`${deepEmerald[0]} ${deepEmerald[1]} ${deepEmerald[2]} rg`);
  ops.push(`${sx(30.5)} ${sy(24)} m ${sx(33.5)} ${sy(24)} l ${sx(33.5)} ${sy(20)} l ${sx(30.5)} ${sy(20)} l h f`);
  ops.push(`${sx(30.5)} ${sy(31)} m ${sx(33.5)} ${sy(31)} l ${sx(33.5)} ${sy(27)} l ${sx(30.5)} ${sy(27)} l h f`);
  ops.push(`${sx(30.5)} ${sy(38)} m ${sx(33.5)} ${sy(38)} l ${sx(33.5)} ${sy(34)} l ${sx(30.5)} ${sy(34)} l h f`);

  // Gold Horizon Arch & Star
  ops.push('1.5 w');
  ops.push(`${lightGold[0]} ${lightGold[1]} ${lightGold[2]} RG`);
  ops.push(`${sx(15)} ${sy(45)} m ${sx(32)} ${sy(42.5)} l ${sx(49)} ${sy(45)} l S`);

  // Estate Title & Subtitle next to Logo
  drawText(data.estateName.toUpperCase(), 138, 76, 17, 'F2', white);
  drawText(data.estateSubtitle, 138, 94, 8.5, 'F2', emerald);
  drawText(data.estateAddress, 138, 110, 8.5, 'F1', [0.8, 0.85, 0.9]);
  drawText('OFFICIAL DIGITAL PAYMENT RECEIPT', 138, 128, 9, 'F2', lightGold);

  // Verified Paid Badge (Top Right of Header)
  fillRect(W - 166, 62, 110, 32, deepEmerald);
  strokeRect(W - 166, 62, 110, 32, emerald, 1);
  drawText('VERIFIED PAID', W - 150, 82, 10, 'F2', white);

  // ============================================================================
  // RECEIPT NUMBER & DATE STRIP
  // ============================================================================
  fillRect(54, 172, W - 108, 52, slateLightBg);
  strokeRect(54, 172, W - 108, 52, borderGray, 1);

  drawText('RECEIPT NUMBER', 70, 190, 8, 'F2', slateMuted);
  drawText(data.receiptNumber, 70, 209, 12, 'F3', darkSlate);

  drawText('PAYMENT DATE & TIME', 340, 190, 8, 'F2', slateMuted);
  drawText(formatReadableDate(data.paymentDate), 340, 209, 10, 'F2', darkSlate);

  // ============================================================================
  // AMOUNT PAID HIGHLIGHT BANNER
  // ============================================================================
  fillRect(54, 240, W - 108, 74, lightEmeraldBg);
  strokeRect(54, 240, W - 108, 74, emerald, 1.2);

  drawText(data.levyTitle.toUpperCase(), 72, 262, 9, 'F2', deepEmerald);
  drawText(formatPdfCurrency(data.amountPaid), 72, 292, 24, 'F2', deepEmerald);
  drawText(
    `Billing Period Covered: ${data.periodCovered}`,
    72,
    306,
    9,
    'F1',
    [0.04, 0.45, 0.32]
  );

  // Official Stamp Box inside Amount Banner
  fillRect(W - 196, 255, 124, 44, white);
  strokeRect(W - 196, 255, 124, 44, emerald, 1);
  drawText('STATUS: CONFIRMED', W - 184, 274, 8.5, 'F2', deepEmerald);
  drawText('PAYSTACK VERIFIED', W - 184, 289, 8, 'F1', slateMuted);

  // ============================================================================
  // RESIDENT & PROPERTY PARTICULARS SECTION
  // ============================================================================
  drawText('RESIDENT & PROPERTY DETAILS', 54, 342, 10, 'F2', darkSlate);
  drawLine(54, 349, W - 54, 349, borderGray, 1);

  const rows: Array<[string, string]> = [
    ['Resident Full Name', data.residentName || 'Verified Estate Resident'],
    ['Resident ID Number', data.residentNumber ? `#${data.residentNumber}` : 'Verified Account'],
    [
      'House / Building Number',
      data.buildingName ? `${data.houseNumber} (${data.buildingName})` : data.houseNumber,
    ],
    ['Payment Category', data.levyTitle],
    ['Billing Period Covered', data.periodCovered],
    ['Payment Reference', data.paymentReference],
    ['Payment Channel', 'Online Digital Payment (Paystack)'],
    ['Verification Status', `${data.status} - Authentic Estate Record`],
  ];

  let currentTopY = 362;
  rows.forEach(([label, value], idx) => {
    const rowH = 30;
    if (idx % 2 === 0) {
      fillRect(54, currentTopY, W - 108, rowH, slateLightBg);
    } else {
      fillRect(54, currentTopY, W - 108, rowH, white);
    }
    strokeRect(54, currentTopY, W - 108, rowH, borderGray, 0.6);

    drawText(label, 68, currentTopY + 19, 9.5, 'F2', slateMuted);
    const valueFont =
      label === 'Payment Reference' || label === 'Resident ID Number' ? 'F3' : 'F2';
    drawText(value, 250, currentTopY + 19, 10, valueFont, darkSlate);

    currentTopY += rowH;
  });

  // ============================================================================
  // OFFICIAL SEAL & AUTHENTICATION FOOTER
  // ============================================================================
  const sealTopY = currentTopY + 26;
  fillRect(54, sealTopY, W - 108, 92, slateLightBg);
  strokeRect(54, sealTopY, W - 108, 92, borderGray, 1);

  // Draw small circular/shield seal on left of footer box
  fillRect(70, sealTopY + 18, 56, 56, deepEmerald);
  strokeRect(70, sealTopY + 18, 56, 56, gold, 1.5);
  drawText('FOG', 84, sealTopY + 44, 12, 'F2', lightGold);
  drawText('SEAL', 84, sealTopY + 58, 9, 'F2', white);

  drawText('OFFICIAL ESTATE DIGITAL RECEIPT SEAL', 142, sealTopY + 32, 10, 'F2', darkSlate);
  drawText(
    'This receipt was electronically generated by the Finger of God Estate Portal.',
    142,
    sealTopY + 48,
    9,
    'F1',
    slateMuted
  );
  drawText(
    'It serves as official proof of payment and can be verified anytime at the Estate Security Gate.',
    142,
    sealTopY + 62,
    9,
    'F1',
    slateMuted
  );
  drawText(
    `Verification ID: ${data.receiptNumber}  |  Ref: ${data.paymentReference}`,
    142,
    sealTopY + 77,
    8.5,
    'F3',
    deepEmerald
  );

  // Bottom Footer Line
  drawLine(54, H - 74, W - 54, H - 74, borderGray, 0.8);
  drawText(
    `${data.estateName} - ${data.estateAddress}`,
    54,
    H - 56,
    8.5,
    'F1',
    slateMuted
  );
  drawText(
    `Generated: ${new Date().toLocaleDateString('en-NG')}`,
    W - 170,
    H - 56,
    8.5,
    'F1',
    slateMuted
  );

  // Assemble PDF 1.4 File
  const contentStream = ops.join('\n');
  const objects: string[] = [];

  // 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  // 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  // 3: Page
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(
      2
    )}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>\nendobj`
  );
  // 4: Font F1 (Helvetica)
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj');
  // 5: Font F2 (Helvetica-Bold)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj');
  // 6: Font F3 (Courier-Bold)
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>\nendobj');
  // 7: Content Stream
  objects.push(
    `7 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const safeReceiptName = data.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `FingerOfGod-Receipt-${safeReceiptName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Prints a clean, standalone single-page receipt with the official SVG Finger of God Estate Logo
 * using an invisible print iframe (no window.open popup required).
 */
export function printOfficialReceipt(data: OfficialReceiptDocumentData): void {
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(data.amountPaid || 0);

  const formattedDate = formatReadableDate(data.paymentDate);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${data.receiptNumber} — ${data.estateName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 28px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .receipt-card {
      max-width: 720px;
      margin: 0 auto;
      border: 2px solid #cbd5e1;
      border-radius: 20px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%);
      color: #ffffff;
      padding: 28px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 4px solid #10b981;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #34d399;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-top: 3px;
    }
    .brand-addr {
      font-size: 12px;
      color: #cbd5e1;
      margin-top: 4px;
    }
    .badge {
      background: rgba(16, 185, 129, 0.2);
      border: 1.5px solid #34d399;
      color: #ecfdf5;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .body {
      padding: 28px 32px;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 20px;
      margin-bottom: 22px;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .meta-value {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .amount-box {
      background: #ecfdf5;
      border: 1.5px solid #6ee7b7;
      border-radius: 16px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .amount-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #047857;
    }
    .amount-value {
      font-size: 30px;
      font-weight: 900;
      color: #064e3b;
      margin-top: 4px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .details-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .details-table td {
      padding: 12px 10px;
      font-size: 13px;
    }
    .details-table td.label {
      color: #64748b;
      font-weight: 600;
      width: 40%;
    }
    .details-table td.val {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }
    .footer-seal {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #475569;
    }
    @media print {
      body { padding: 0; }
      .receipt-card { border: 1.5px solid #94a3b8; }
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div class="brand">
        <svg width="60" height="60" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 4L56 14V34C56 49.5 45.8 57.8 32 60C18.2 57.8 8 49.5 8 34V14L32 4Z" fill="#064e3b" stroke="#f59e0b" stroke-width="2.5"/>
          <path d="M32 7.5L52.5 16V33.5C52.5 46.8 43.8 54.1 32 56.2C20.2 54.1 11.5 46.8 11.5 33.5V16L32 7.5Z" stroke="#10b981" stroke-width="1" stroke-opacity="0.6"/>
          <path d="M18 44V29L25 25V44H18Z" fill="#10b981" fill-opacity="0.85"/>
          <path d="M27 44V18L32 14L37 18V44H27Z" fill="#f59e0b"/>
          <path d="M39 44V25L46 29V44H39Z" fill="#10b981" fill-opacity="0.85"/>
          <rect x="30" y="20" width="4" height="4" rx="0.5" fill="#042f2e"/>
          <rect x="30" y="27" width="4" height="4" rx="0.5" fill="#042f2e"/>
          <rect x="30" y="34" width="4" height="4" rx="0.5" fill="#042f2e"/>
          <path d="M14 45C20 42 44 42 50 45" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="10.5" r="1.5" fill="#fef08a"/>
        </svg>
        <div>
          <div class="brand-title">${data.estateName}</div>
          <div class="brand-sub">${data.estateSubtitle}</div>
          <div class="brand-addr">${data.estateAddress}</div>
        </div>
      </div>
      <div class="badge">✓ Verified Paid</div>
    </div>

    <div class="body">
      <div class="meta-bar">
        <div>
          <div class="meta-label">Official Receipt Number</div>
          <div class="meta-value">${data.receiptNumber}</div>
        </div>
        <div style="text-align: right;">
          <div class="meta-label">Payment Date &amp; Time</div>
          <div class="meta-value" style="font-family: inherit;">${formattedDate}</div>
        </div>
      </div>

      <div class="amount-box">
        <div>
          <div class="amount-title">${data.levyTitle}</div>
          <div class="amount-value">${formattedAmount}</div>
        </div>
        <div style="text-align: right;">
          <div class="meta-label" style="color: #047857;">Billing Period</div>
          <div style="font-size: 16px; font-weight: 800; color: #064e3b; margin-top: 4px;">${data.periodCovered}</div>
        </div>
      </div>

      <table class="details-table">
        <tbody>
          <tr>
            <td class="label">Resident Full Name</td>
            <td class="val">${data.residentName}</td>
          </tr>
          <tr>
            <td class="label">Resident ID Number</td>
            <td class="val" style="font-family: monospace;">#${data.residentNumber}</td>
          </tr>
          <tr>
            <td class="label">House / Building Number</td>
            <td class="val">${data.buildingName ? `${data.houseNumber} (${data.buildingName})` : data.houseNumber}</td>
          </tr>
          <tr>
            <td class="label">Levy Category</td>
            <td class="val">${data.levyTitle}</td>
          </tr>
          <tr>
            <td class="label">Payment Reference</td>
            <td class="val" style="font-family: monospace;">${data.paymentReference}</td>
          </tr>
          <tr>
            <td class="label">Payment Status</td>
            <td class="val" style="color: #047857;">${data.status} (Verified)</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-seal">
        <div>
          <strong style="color: #0f172a; display: block; margin-bottom: 3px;">Authentic Digital Estate Receipt</strong>
          Generated by the ${data.estateName} Portal. Present this receipt for gate or audit verification.
        </div>
        <div style="text-align: right; font-family: monospace; font-weight: 700; color: #064e3b;">
          ${data.receiptNumber}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 250);
  }
}
