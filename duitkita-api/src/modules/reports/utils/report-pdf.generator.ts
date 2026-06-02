import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { finished } from 'stream/promises';
import PDFDocument from 'pdfkit';
import type {
  CategoryReportItem,
  CoupleReport,
  FinancialHealthScore,
  MonthlyReport,
  ReportTopExpense,
  SpendingForecast,
} from '../reports.service';

// ─── palette ─────────────────────────────────────────────────────────────────
// All solid hex — PDFKit does not support 8-digit rgba hex notation.
const C = {
  brand:        '#7C3AED',
  brandMid:     '#8B5CF6',
  brandLight:   '#EDE9FE',
  brandBorder:  '#DDD6FE',

  textDark:     '#111827',
  textMid:      '#374151',
  textMuted:    '#6B7280',
  textFaint:    '#9CA3AF',

  white:        '#FFFFFF',
  surface:      '#F9FAFB',
  surfaceAlt:   '#F3F4F6',
  border:       '#E5E7EB',
  borderLight:  '#F3F4F6',

  // Status — solid light bg + dark text (no alpha needed)
  okBg:         '#D1FAE5',
  okText:       '#065F46',
  okDot:        '#10B981',

  warnBg:       '#FEF9C3',
  warnText:     '#854D0E',
  warnDot:      '#CA8A04',

  dangerBg:     '#FEE2E2',
  dangerText:   '#991B1B',
  dangerDot:    '#EF4444',
} as const;

const MARGIN         = 48;
const FOOTER_RESERVE = 44;
const TOP_EXPENSE_LIMIT = 5;
const TOP_CATEGORY_LIMIT = 5;

const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

type PdfDoc = InstanceType<typeof PDFDocument>;

export type ReportPdfPayload = {
  year:         number;
  month:        number;
  scope:        string;
  report:       MonthlyReport | CoupleReport;
  healthScore?: FinancialHealthScore | null;
  forecast?:    SpendingForecast | null;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function cw(doc: PdfDoc): number {
  return doc.page.width - MARGIN * 2;
}

function contentBottom(doc: PdfDoc): number {
  return doc.page.height - doc.page.margins.bottom - FOOTER_RESERVE;
}

function footerY(doc: PdfDoc): number {
  return doc.page.height - doc.page.margins.bottom - 22;
}

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function expenseDescription(note: string | null): string {
  const t = note?.trim();
  return t && t.length > 0 ? t : '—';
}

function ensureSpace(doc: PdfDoc, needed: number): void {
  if (doc.y + needed > contentBottom(doc)) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
}

function statusColors(status: CategoryReportItem['alertStatus']): {
  bg: string; text: string; dot: string; label: string;
} {
  switch (status) {
    case 'over':
    case 'danger':
      return { bg: C.dangerBg, text: C.dangerText, dot: C.dangerDot, label: status === 'over' ? 'Melebihi' : 'Kritis' };
    case 'warning':
      return { bg: C.warnBg, text: C.warnText, dot: C.warnDot, label: 'Waspada' };
    default:
      return { bg: C.okBg, text: C.okText, dot: C.okDot, label: 'Aman' };
  }
}

// ─── drawing primitives ──────────────────────────────────────────────────────

/** Pill badge with light bg + dark matching text */
function drawStatusPill(
  doc:    PdfDoc,
  label:  string,
  pct:    number,
  x:      number,
  y:      number,
  status: CategoryReportItem['alertStatus'],
): void {
  const { bg, text } = statusColors(status);
  const pillW  = 72;
  const pillH  = 14;
  const pillY  = y - 1;

  doc.save();
  doc.roundedRect(x, pillY, pillW, pillH, pillH / 2).fill(bg);
  doc.fillColor(text).fontSize(7).font('Helvetica-Bold');
  doc.text(`${label} · ${pct}%`, x, pillY + 3.5, {
    width: pillW, align: 'center', lineBreak: false,
  });
  doc.restore();
}

/** Section heading: bold label + full-width thin rule */
function drawSectionTitle(doc: PdfDoc, title: string, gap = 8): void {
  ensureSpace(doc, 36);
  doc.y += gap;
  const y  = doc.y;
  const w  = cw(doc);

  // left accent bar
  doc.save();
  doc.rect(MARGIN, y, 3, 18).fill(C.brand);
  doc.restore();

  doc.fillColor(C.textDark).fontSize(10.5).font('Helvetica-Bold');
  doc.text(title, MARGIN + 10, y + 3, { width: w - 10, lineBreak: false });

  doc.y = y + 26;

  // thin divider
  doc.save();
  doc.moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + w, doc.y)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();
  doc.restore();
  doc.y += 10;
}

// ─── header ──────────────────────────────────────────────────────────────────

function drawHeader(doc: PdfDoc, periodLabel: string, scopeLabel: string): void {
  const pw = doc.page.width;

  // Purple gradient bar at top (simulate with two rects)
  doc.save();
  doc.rect(0, 0, pw / 2, 5).fill(C.brand);
  doc.rect(pw / 2, 0, pw / 2, 5).fill(C.brandMid);
  doc.restore();

  // White header bg (logo area)
  doc.save();
  doc.rect(0, 5, pw, 70).fill(C.white);
  doc.restore();

  // "DuitKita" wordmark in brand purple
  doc.fillColor(C.brand).fontSize(20).font('Helvetica-Bold');
  doc.text('DuitKita', MARGIN, 16, { lineBreak: false });

  // Subtitle
  doc.fillColor(C.textMuted).fontSize(8.5).font('Helvetica');
  doc.text('Laporan Anggaran Bulanan', MARGIN, 38, { lineBreak: false });

  // Period + scope — right aligned
  const pw2 = pw - MARGIN;
  doc.fillColor(C.textMid).fontSize(10).font('Helvetica-Bold');
  doc.text(periodLabel, MARGIN, 16, { width: cw(doc), align: 'right', lineBreak: false });
  doc.fillColor(C.textFaint).fontSize(8.5).font('Helvetica');
  doc.text(scopeLabel, MARGIN, 38, { width: cw(doc), align: 'right', lineBreak: false });

  // bottom divider
  doc.save();
  doc.moveTo(0, 75).lineTo(pw, 75).strokeColor(C.border).lineWidth(1).stroke();
  doc.restore();

  doc.y = 88;
}

// ─── executive summary ────────────────────────────────────────────────────────

function drawExecutiveSummary(
  doc:         PdfDoc,
  healthScore: FinancialHealthScore | null | undefined,
  forecast:    SpendingForecast | null | undefined,
): void {
  if (!healthScore && !forecast) return;
  drawSectionTitle(doc, 'Ringkasan bulan ini');

  const w = cw(doc);

  if (healthScore) {
    ensureSpace(doc, 74);
    const by     = doc.y;
    const bh     = 66;
    const { dot: scoreColor } =
      healthScore.score >= 70 ? statusColors('ok') :
      healthScore.score >= 45 ? statusColors('warning') :
      statusColors('danger');

    doc.save();
    doc.roundedRect(MARGIN, by, w, bh, 6)
      .fillAndStroke(C.surface, C.border);
    doc.restore();

    const pad = 14;

    // score label
    doc.fillColor(C.textFaint).fontSize(7.5).font('Helvetica');
    doc.text('SKOR KESEHATAN KEUANGAN', MARGIN + pad, by + 10, { lineBreak: false });

    // big number
    doc.fillColor(scoreColor).fontSize(26).font('Helvetica-Bold');
    doc.text(`${healthScore.score}`, MARGIN + pad, by + 20, { lineBreak: false });
    doc.fillColor(C.textMuted).fontSize(9).font('Helvetica');
    doc.text('/100', MARGIN + pad + 38, by + 30, { lineBreak: false });

    // stats on right
    const statsX = MARGIN + pad + 90;
    doc.fillColor(C.textMuted).fontSize(8.5).font('Helvetica');
    doc.text(
      `Tabungan ${healthScore.savingRate}%   ·   Kepatuhan anggaran ${healthScore.budgetAdherence}%   ·   Volatilitas ${healthScore.expenseVolatility}%`,
      statsX, by + 28,
      { width: w - pad - 90, lineBreak: false },
    );

    doc.y = by + bh + 10;
  }

  if (forecast) {
    ensureSpace(doc, 64);
    const fy = doc.y;
    const fh = 58;

    doc.save();
    doc.roundedRect(MARGIN, fy, w, fh, 6)
      .fillAndStroke(C.surface, C.border);
    // left purple accent
    doc.roundedRect(MARGIN, fy, 3, fh, 2).fill(C.brand);
    doc.restore();

    const pad = 14;
    doc.fillColor(C.textFaint).fontSize(7.5).font('Helvetica');
    doc.text('PROYEKSI AKHIR BULAN', MARGIN + pad, fy + 10, { lineBreak: false });

    doc.fillColor(C.textDark).fontSize(11).font('Helvetica-Bold');
    doc.text(`${formatRupiah(forecast.projectedSpent)} terpakai`, MARGIN + pad, fy + 22, {
      width: w - pad * 2, lineBreak: false,
    });

    const conf = forecast.confidenceLevel === 'high' ? 'tinggi' :
                 forecast.confidenceLevel === 'medium' ? 'sedang' : 'rendah';
    doc.fillColor(C.textMuted).fontSize(8.5).font('Helvetica');
    doc.text(
      `Sisa proyeksi ${formatRupiah(forecast.projectedRemaining)}   ·   ${formatRupiah(forecast.burnRatePerDay)}/hari   ·   keyakinan ${conf}`,
      MARGIN + pad, fy + 38,
      { width: w - pad * 2, lineBreak: false },
    );

    doc.y = fy + fh + 10;
  }
}

// ─── summary cards ────────────────────────────────────────────────────────────

function drawSummaryCards(doc: PdfDoc, report: MonthlyReport): void {
  ensureSpace(doc, 78);
  const w      = cw(doc);
  const gap    = 10;
  const cardW  = (w - gap * 2) / 3;
  const cardH  = 62;
  const sy     = doc.y;

  const pct = Math.min(100, report.overallPercentageUsed);
  const remainColor = report.totalRemaining < 0 ? C.dangerDot :
                      pct >= 80              ? C.warnDot  : C.okDot;

  const cards = [
    { label: 'Anggaran bulan ini', value: formatRupiah(report.totalEffectiveBudget), dot: C.brand },
    { label: 'Sudah terpakai',     value: formatRupiah(report.totalSpent),            dot: C.brandMid },
    { label: 'Sisa anggaran',      value: formatRupiah(report.totalRemaining),        dot: remainColor },
  ];

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + gap);

    doc.save();
    doc.roundedRect(x, sy, cardW, cardH, 6)
      .fillAndStroke(C.white, C.border);
    // top stripe
    doc.roundedRect(x, sy, cardW, 3, 2).fill(card.dot);
    doc.restore();

    doc.fillColor(C.textFaint).fontSize(7.5).font('Helvetica');
    doc.text(card.label.toUpperCase(), x + 12, sy + 14, { width: cardW - 24, lineBreak: false });

    doc.fillColor(C.textDark).fontSize(12).font('Helvetica-Bold');
    doc.text(card.value, x + 12, sy + 30, { width: cardW - 24, lineBreak: false });
  });

  doc.y = sy + cardH + 14;

  // usage bar
  doc.fillColor(C.textMuted).fontSize(8.5).font('Helvetica');
  doc.text(`Pemakaian bulan ini  ${pct}%`, MARGIN, doc.y, { lineBreak: false });
  doc.y += 13;

  const barColor = pct >= 100 ? C.dangerDot : pct >= 80 ? C.warnDot : C.brand;
  doc.save();
  doc.roundedRect(MARGIN, doc.y, w, 7, 3).fill(C.surfaceAlt);
  const fw = Math.max(6, (w * pct) / 100);
  doc.roundedRect(MARGIN, doc.y, fw, 7, 3).fill(barColor);
  doc.restore();
  doc.y += 20;
}

function drawActivityStats(doc: PdfDoc, report: MonthlyReport): void {
  const parts = [
    `${report.totalExpenseCount} transaksi`,
    report.totalExpenseCount > 0
      ? `rata-rata ${formatRupiah(report.averageExpenseAmount)}` : null,
    report.totalRollover > 0
      ? `rollover ${formatRupiah(report.totalRollover)}` : null,
    report.totalBudgeted !== report.totalEffectiveBudget
      ? `anggaran dasar ${formatRupiah(report.totalBudgeted)}` : null,
  ].filter(Boolean);

  doc.fillColor(C.textFaint).fontSize(8.5).font('Helvetica');
  doc.text(parts.join('   ·   '), MARGIN, doc.y, { width: cw(doc) });
  doc.y += 16;
}

// ─── category table ──────────────────────────────────────────────────────────

function drawCategoryTable(doc: PdfDoc, categories: CategoryReportItem[]): void {
  const w    = cw(doc);
  const cols = {
    category:  { x: MARGIN,          w: 118 },
    budget:    { x: MARGIN + 120,    w: 78 },
    spent:     { x: MARGIN + 200,    w: 78 },
    remaining: { x: MARGIN + 280,    w: 78 },
    tx:        { x: MARGIN + 360,    w: 26 },
    status:    { x: MARGIN + 388,    w: w - 388 },
  };

  const drawHeader = () => {
    ensureSpace(doc, 26);
    const hy = doc.y;
    doc.save();
    doc.rect(MARGIN, hy, w, 22).fill(C.surface);
    // bottom rule
    doc.moveTo(MARGIN, hy + 22).lineTo(MARGIN + w, hy + 22)
      .strokeColor(C.border).lineWidth(0.5).stroke();
    doc.restore();

    doc.fillColor(C.textFaint).fontSize(7.5).font('Helvetica-Bold');
    doc.text('KATEGORI',  cols.category.x  + 8, hy + 7,  { width: cols.category.w,  lineBreak: false });
    doc.text('ANGGARAN',  cols.budget.x,          hy + 7,  { width: cols.budget.w,    lineBreak: false });
    doc.text('TERPAKAI',  cols.spent.x,            hy + 7,  { width: cols.spent.w,     lineBreak: false });
    doc.text('SISA',      cols.remaining.x,        hy + 7,  { width: cols.remaining.w, lineBreak: false });
    doc.text('TX',        cols.tx.x,               hy + 7,  { width: cols.tx.w,        lineBreak: false });
    doc.text('STATUS',    cols.status.x,            hy + 7,  { width: cols.status.w,    lineBreak: false });
    doc.y = hy + 26;
  };

  drawHeader();

  categories.forEach((cat, idx) => {
    ensureSpace(doc, 24);
    if (doc.y <= doc.page.margins.top + 4) drawHeader();

    const ry = doc.y;
    if (idx % 2 === 0) {
      doc.save();
      doc.rect(MARGIN, ry - 1, w, 22).fill(C.surface);
      doc.restore();
    }

    doc.fillColor(C.textDark).fontSize(8.5).font('Helvetica');
    doc.text(cat.categoryName,              cols.category.x + 8, ry + 2, { width: cols.category.w - 8,  lineBreak: false });
    doc.fillColor(C.textMid);
    doc.text(formatRupiah(cat.totalAmount), cols.budget.x,       ry + 2, { width: cols.budget.w,         lineBreak: false });
    doc.text(formatRupiah(cat.totalSpent),  cols.spent.x,        ry + 2, { width: cols.spent.w,          lineBreak: false });

    // remaining: color by sign
    const remColor = cat.remaining < 0 ? C.dangerDot : C.textMid;
    doc.fillColor(remColor);
    doc.text(formatRupiah(cat.remaining),   cols.remaining.x,    ry + 2, { width: cols.remaining.w,      lineBreak: false });

    doc.fillColor(C.textFaint);
    doc.text(String(cat.expenseCount),      cols.tx.x,           ry + 2, { width: cols.tx.w,             lineBreak: false });

    drawStatusPill(doc, statusColors(cat.alertStatus).label, cat.percentageUsed,
      cols.status.x, ry + 2, cat.alertStatus);

    doc.y = ry + 22;
  });

  // bottom rule
  doc.save();
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + w, doc.y)
    .strokeColor(C.border).lineWidth(0.5).stroke();
  doc.restore();
  doc.y += 4;
}

// ─── top expenses ─────────────────────────────────────────────────────────────

function drawTopExpensesTable(doc: PdfDoc, expenses: ReportTopExpense[]): void {
  drawSectionTitle(doc, `${TOP_EXPENSE_LIMIT} pengeluaran terbesar bulan ini`);

  const w = cw(doc);

  if (expenses.length === 0) {
    doc.fillColor(C.textMuted).fontSize(9).font('Helvetica');
    doc.text('Belum ada pengeluaran tercatat pada periode ini.', MARGIN, doc.y, { width: w });
    doc.y += 18;
    return;
  }

  const cols = {
    rank:     { x: MARGIN,           w: 18 },
    date:     { x: MARGIN + 20,      w: 64 },
    category: { x: MARGIN + 86,      w: 90 },
    note:     { x: MARGIN + 178,     w: w - 178 - 84 },
    amount:   { x: MARGIN + w - 82,  w: 82 },
  };

  const drawHeader = () => {
    const hy = doc.y;
    doc.save();
    doc.rect(MARGIN, hy, w, 22).fill(C.surface);
    doc.moveTo(MARGIN, hy + 22).lineTo(MARGIN + w, hy + 22)
      .strokeColor(C.border).lineWidth(0.5).stroke();
    doc.restore();

    doc.fillColor(C.textFaint).fontSize(7.5).font('Helvetica-Bold');
    doc.text('#',           cols.rank.x + 3,  hy + 7, { width: cols.rank.w,     lineBreak: false });
    doc.text('TANGGAL',     cols.date.x,       hy + 7, { width: cols.date.w,     lineBreak: false });
    doc.text('KATEGORI',    cols.category.x,   hy + 7, { width: cols.category.w, lineBreak: false });
    doc.text('KETERANGAN',  cols.note.x,       hy + 7, { width: cols.note.w,     lineBreak: false });
    doc.text('JUMLAH',      cols.amount.x,     hy + 7, { width: cols.amount.w,   align: 'right', lineBreak: false });
    doc.y = hy + 26;
  };

  drawHeader();

  expenses.slice(0, TOP_EXPENSE_LIMIT).forEach((exp, idx) => {
    ensureSpace(doc, 24);
    if (doc.y <= doc.page.margins.top + 4) drawHeader();

    const ry = doc.y;
    if (idx % 2 === 0) {
      doc.save();
      doc.rect(MARGIN, ry - 1, w, 22).fill(C.surface);
      doc.restore();
    }

    // rank in brand color
    doc.fillColor(C.brand).fontSize(8).font('Helvetica-Bold');
    doc.text(String(idx + 1), cols.rank.x + 3, ry + 2, { width: cols.rank.w, lineBreak: false });

    doc.fillColor(C.textMuted).font('Helvetica').fontSize(8.5);
    doc.text(formatDate(exp.expenseDate), cols.date.x,     ry + 2, { width: cols.date.w,     lineBreak: false });
    doc.fillColor(C.textDark);
    doc.text(exp.categoryName,            cols.category.x, ry + 2, { width: cols.category.w, lineBreak: false });
    doc.fillColor(C.textMuted);
    doc.text(expenseDescription(exp.note), cols.note.x,   ry + 2, { width: cols.note.w, ellipsis: true, lineBreak: false });
    doc.fillColor(C.textDark).font('Helvetica-Bold');
    doc.text(formatRupiah(exp.amount),    cols.amount.x,   ry + 2, { width: cols.amount.w, align: 'right', lineBreak: false });

    doc.y = ry + 22;
  });

  // bottom rule
  doc.save();
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + w, doc.y)
    .strokeColor(C.border).lineWidth(0.5).stroke();
  doc.restore();
  doc.y += 12;
}

// ─── category breakdown bars ──────────────────────────────────────────────────

function drawCategoryBreakdown(doc: PdfDoc, report: MonthlyReport): void {
  const ranked = [...report.categories]
    .filter((c) => c.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, TOP_CATEGORY_LIMIT);

  if (ranked.length === 0) return;
  drawSectionTitle(doc, 'Distribusi pengeluaran per kategori');

  const w        = cw(doc);
  const labelW   = 100;
  const pctW     = 34;
  const amountW  = 96;
  const gap      = 8;
  const barX     = MARGIN + labelW + pctW + gap;
  const barMaxW  = w - labelW - pctW - gap - amountW;
  const amountX  = MARGIN + w - amountW;

  ranked.forEach((cat) => {
    ensureSpace(doc, 22);
    const ry    = doc.y;
    const share = report.totalSpent > 0
      ? Math.round((cat.totalSpent / report.totalSpent) * 100) : 0;
    const bw = Math.max(4, (barMaxW * share) / 100);

    doc.fillColor(C.textDark).fontSize(8.5).font('Helvetica');
    doc.text(cat.categoryName, MARGIN, ry + 1, { width: labelW, ellipsis: true, lineBreak: false });

    doc.fillColor(C.brand).fontSize(8).font('Helvetica-Bold');
    doc.text(`${share}%`, MARGIN + labelW, ry + 1, { width: pctW, align: 'right', lineBreak: false });

    // bar track + fill
    doc.save();
    doc.roundedRect(barX, ry + 3, barMaxW, 7, 3.5).fill(C.surfaceAlt);
    doc.roundedRect(barX, ry + 3, bw,      7, 3.5).fill(C.brand);
    doc.restore();

    doc.fillColor(C.textMid).fontSize(8.5).font('Helvetica-Bold');
    doc.text(formatRupiah(cat.totalSpent), amountX, ry + 1, {
      width: amountW, align: 'right', lineBreak: false,
    });

    doc.y = ry + 19;
  });

  doc.y += 8;
}

// ─── attention box ────────────────────────────────────────────────────────────

function drawAttentionBox(doc: PdfDoc, categories: CategoryReportItem[]): void {
  const atRisk = categories.filter((c) => c.alertStatus !== 'ok');
  if (atRisk.length === 0) return;
  drawSectionTitle(doc, 'Kategori yang perlu diperhatikan');

  const w = cw(doc);

  atRisk.forEach((cat) => {
    ensureSpace(doc, 22);
    const ry    = doc.y;
    const sc    = statusColors(cat.alertStatus);

    doc.save();
    doc.roundedRect(MARGIN, ry, w, 20, 4).fill(sc.bg);
    doc.restore();

    // dot
    doc.save();
    doc.circle(MARGIN + 10, ry + 10, 3).fill(sc.dot);
    doc.restore();

    doc.fillColor(sc.text).fontSize(8.5).font('Helvetica-Bold');
    doc.text(sc.label, MARGIN + 18, ry + 6, { width: 48, lineBreak: false });

    doc.fillColor(C.textMid).font('Helvetica');
    doc.text(
      `${cat.categoryName} — ${cat.percentageUsed}% terpakai, sisa ${formatRupiah(cat.remaining)}`,
      MARGIN + 70, ry + 6,
      { width: w - 74, lineBreak: false },
    );

    doc.y = ry + 24;
  });

  doc.y += 4;
}

// ─── person section ───────────────────────────────────────────────────────────

function drawPersonSection(doc: PdfDoc, report: MonthlyReport): void {
  ensureSpace(doc, 90);
  const w  = cw(doc);
  const by = doc.y;
  const bh = 30;

  // subtle person banner — light brand bg, brand text
  doc.save();
  doc.roundedRect(MARGIN, by, w, bh, 5).fill(C.brandLight);
  doc.restore();

  doc.fillColor(C.brand).fontSize(11).font('Helvetica-Bold');
  doc.text(report.userName, MARGIN + 12, by + 9, { width: w - 24, lineBreak: false });
  doc.y = by + bh + 14;

  drawSummaryCards(doc, report);
  drawActivityStats(doc, report);

  if (report.categories.length === 0) {
    doc.fillColor(C.textMuted).fontSize(9).font('Helvetica');
    doc.text('Belum ada data anggaran untuk periode ini.', MARGIN, doc.y, { width: w });
    doc.y += 16;
    return;
  }

  drawSectionTitle(doc, 'Rincian per kategori');
  drawCategoryTable(doc, report.categories);
  drawTopExpensesTable(doc, report.topExpenses);
  drawCategoryBreakdown(doc, report);
  drawAttentionBox(doc, report.categories);
  doc.y += 10;
}

// ─── footer ───────────────────────────────────────────────────────────────────

function drawFooterOnPage(
  doc:       PdfDoc,
  pageIndex: number,
  total:     number,
  exportedAt: string,
): void {
  const y  = footerY(doc);
  const pw = doc.page.width;
  const w  = cw(doc);

  doc.save();
  doc.moveTo(MARGIN, y - 8)
    .lineTo(pw - MARGIN, y - 8)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();

  doc.fillColor(C.brand).fontSize(7.5).font('Helvetica-Bold');
  doc.text('DuitKita', MARGIN, y, { width: 46, lineBreak: false });

  doc.fillColor(C.textFaint).fontSize(7.5).font('Helvetica');
  doc.text(`Diekspor ${exportedAt}`, MARGIN + 46, y, {
    width: w - 46 - 32, align: 'center', lineBreak: false,
  });

  doc.fillColor(C.textMuted).fontSize(7.5);
  doc.text(`${pageIndex + 1} / ${total}`, pw - MARGIN - 30, y, {
    width: 30, align: 'right', lineBreak: false,
  });
  doc.restore();
}

function trimTrailingBlankPage(doc: PdfDoc): number {
  const range = doc.bufferedPageRange();
  if (range.count <= 1) return range.count;
  const last = range.start + range.count - 1;
  doc.switchToPage(last);
  return doc.y > doc.page.margins.top + 48 ? range.count : range.count - 1;
}

function drawFooters(doc: PdfDoc): void {
  const exportedAt = new Date().toLocaleString('id-ID');
  const range      = doc.bufferedPageRange();
  const total      = trimTrailingBlankPage(doc);
  for (let i = range.start; i < range.start + total; i++) {
    doc.switchToPage(i);
    drawFooterOnPage(doc, i - range.start, total, exportedAt);
  }
}

// ─── scope label ──────────────────────────────────────────────────────────────

function scopeLabel(scope: string): string {
  return scope === 'both' ? 'Saya & pasangan' : 'Hanya saya';
}

// ─── main entry ───────────────────────────────────────────────────────────────

export async function writeMonthlyReportPdf(
  outputPath: string,
  payload:    ReportPdfPayload,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });

  const doc = new PDFDocument({
    size:          'A4',
    margin:        MARGIN,
    bufferPages:   true,
    autoFirstPage: true,
    info: {
      Title:   `DuitKita — Laporan ${payload.year}-${String(payload.month).padStart(2, '0')}`,
      Author:  'DuitKita',
      Subject: 'Laporan anggaran bulanan',
    },
  });

  const stream = createWriteStream(outputPath);
  doc.pipe(stream);

  // ensure white page bg
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.white);

  const periodLabel = `${MONTH_NAMES[payload.month - 1]} ${payload.year}`;
  drawHeader(doc, periodLabel, scopeLabel(payload.scope));
  drawExecutiveSummary(doc, payload.healthScore, payload.forecast);

  if ('me' in payload.report) {
    const couple = payload.report;
    ensureSpace(doc, 30);
    const w = cw(doc);
    doc.save();
    doc.roundedRect(MARGIN, doc.y, w, 26, 4).fill(C.surface);
    doc.restore();
    doc.fillColor(C.textMuted).fontSize(8.5).font('Helvetica');
    doc.text(
      `Gabungan: ${formatRupiah(couple.combinedTotalSpent)} terpakai dari ${formatRupiah(couple.combinedTotalBudget)}`,
      MARGIN + 12, doc.y + 8,
      { width: w - 24, lineBreak: false },
    );
    doc.y += 38;

    drawPersonSection(doc, couple.me);
    drawPersonSection(doc, couple.partner);
  } else {
    drawPersonSection(doc, payload.report);
  }

  drawFooters(doc);
  doc.end();
  await finished(stream);
}
