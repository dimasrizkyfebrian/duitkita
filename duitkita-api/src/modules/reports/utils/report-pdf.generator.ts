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

/** DuitKita Amber Slate — aligned with duitkita-web globals.css */
const BRAND = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryTint: '#FEF3C7',
  slateText: '#1E293B',
  slateAccent: '#334155',
  slateMuted: '#64748B',
  slateSurface: '#F1F5F9',
  slateBorder: '#E2E8F0',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F97316',
  danger: '#EF4444',
} as const;

const FOOTER_RESERVE = 36;
const TOP_EXPENSE_LIMIT = 5;
const TOP_CATEGORY_LIMIT = 5;

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

type PdfDoc = InstanceType<typeof PDFDocument>;

export type ReportPdfPayload = {
  year: number;
  month: number;
  scope: string;
  report: MonthlyReport | CoupleReport;
  healthScore?: FinancialHealthScore | null;
  forecast?: SpendingForecast | null;
};

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function expenseDescription(note: string | null): string {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Tanpa keterangan';
}

function contentBottom(doc: PdfDoc): number {
  return doc.page.height - doc.page.margins.bottom - FOOTER_RESERVE;
}

function footerY(doc: PdfDoc): number {
  return doc.page.height - doc.page.margins.bottom - 18;
}

function alertColor(status: CategoryReportItem['alertStatus']): string {
  switch (status) {
    case 'over':
      return BRAND.danger;
    case 'danger':
      return BRAND.danger;
    case 'warning':
      return BRAND.warning;
    default:
      return BRAND.success;
  }
}

function alertLabel(status: CategoryReportItem['alertStatus']): string {
  switch (status) {
    case 'over':
      return 'Melebihi';
    case 'danger':
      return 'Kritis';
    case 'warning':
      return 'Waspada';
    default:
      return 'Aman';
  }
}

function ensureSpace(doc: PdfDoc, needed: number): void {
  if (doc.y + needed > contentBottom(doc)) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
}

function drawSectionTitle(doc: PdfDoc, title: string): void {
  ensureSpace(doc, 28);
  const margin = doc.page.margins.left;
  const y = doc.y;
  doc.save();
  doc.rect(margin, y, 4, 16).fill(BRAND.primary);
  doc.restore();
  doc.fillColor(BRAND.slateText).fontSize(11).font('Helvetica-Bold');
  doc.text(title, margin + 10, y + 1, {
    width: doc.page.width - margin * 2 - 10,
  });
  doc.y = y + 22;
}

function drawHeader(doc: PdfDoc, periodLabel: string, scopeLabel: string): void {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;

  doc.save();
  doc.rect(0, 0, pageWidth, 88).fill(BRAND.primary);
  doc.fillColor(BRAND.white).fontSize(22).font('Helvetica-Bold');
  doc.text('DuitKita', margin, 22, { width: pageWidth - margin * 2 });
  doc.fontSize(11).font('Helvetica');
  doc.text('Laporan Anggaran Bulanan', margin, 48, { width: pageWidth - margin * 2 });
  doc.fontSize(10);
  doc.text(`${periodLabel}  ·  ${scopeLabel}`, margin, 64, { width: pageWidth - margin * 2 });
  doc.restore();

  doc.y = 104;
}

function drawExecutiveSummary(
  doc: PdfDoc,
  healthScore: FinancialHealthScore | null | undefined,
  forecast: SpendingForecast | null | undefined,
): void {
  if (!healthScore && !forecast) return;

  drawSectionTitle(doc, 'Ringkasan eksekutif');

  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const boxY = doc.y;

  if (healthScore) {
    const scoreColor =
      healthScore.score >= 70
        ? BRAND.success
        : healthScore.score >= 45
          ? BRAND.warning
          : BRAND.danger;

    const boxPad = 12;
    const boxHeight = 66;
    const innerWidth = contentWidth - boxPad * 2;

    doc.save();
    doc
      .roundedRect(margin, boxY, contentWidth, boxHeight, 6)
      .fillAndStroke(BRAND.primaryTint, BRAND.slateBorder);
    doc.restore();

    doc.fillColor(BRAND.slateMuted).fontSize(8).font('Helvetica');
    doc.text('SKOR KESEHATAN KEUANGAN', margin + boxPad, boxY + 10, {
      width: innerWidth,
    });

    doc.fillColor(scoreColor).fontSize(20).font('Helvetica-Bold');
    doc.text(`${healthScore.score}/100`, margin + boxPad, boxY + 24, {
      width: innerWidth,
    });

    doc.fillColor(BRAND.slateText).fontSize(9).font('Helvetica');
    doc.text(
      `Tabungan ${healthScore.savingRate}% · Kepatuhan anggaran ${healthScore.budgetAdherence}% · Volatilitas ${healthScore.expenseVolatility}%`,
      margin + boxPad,
      boxY + 48,
      { width: innerWidth },
    );

    doc.y = boxY + boxHeight + 8;
  }

  if (forecast) {
    ensureSpace(doc, 70);
    const fY = doc.y;
    doc.fontSize(9).fillColor(BRAND.slateMuted).font('Helvetica');
    doc.text('PROYEKSI AKHIR BULAN', margin, fY);
    doc.fillColor(BRAND.slateText).font('Helvetica-Bold');
    doc.text(
      `${formatRupiah(forecast.projectedSpent)} terpakai · sisa proyeksi ${formatRupiah(forecast.projectedRemaining)}`,
      margin,
      fY + 12,
      { width: contentWidth },
    );
    doc.font('Helvetica').fillColor(BRAND.slateMuted);
    doc.text(
      `Laju harian ${formatRupiah(forecast.burnRatePerDay)}/hari · keyakinan ${forecast.confidenceLevel === 'high' ? 'tinggi' : forecast.confidenceLevel === 'medium' ? 'sedang' : 'rendah'}`,
      margin,
      fY + 26,
      { width: contentWidth },
    );
    doc.y = fY + 40;

    if (forecast.keyDrivers.length > 0) {
      doc.fillColor(BRAND.slateAccent).fontSize(9).font('Helvetica-Bold');
      doc.text('Penggerak pengeluaran utama:', margin, doc.y);
      doc.y += 12;
      forecast.keyDrivers.slice(0, 3).forEach((driver) => {
        ensureSpace(doc, 14);
        doc.fillColor(BRAND.slateText).font('Helvetica').fontSize(9);
        doc.text(
          `• ${driver.categoryName} — ${formatRupiah(driver.totalSpent)} (${driver.shareOfSpend}% dari total)`,
          margin + 4,
          doc.y,
          { width: contentWidth - 8 },
        );
        doc.y += 12;
      });
    }
    doc.y += 6;
  }
}

function drawSummaryCards(doc: PdfDoc, report: MonthlyReport): void {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const cardGap = 10;
  const cardWidth = (contentWidth - cardGap * 2) / 3;
  const cardHeight = 52;
  const startY = doc.y;

  const cards = [
    { label: 'Anggaran efektif', value: formatRupiah(report.totalEffectiveBudget) },
    { label: 'Terpakai', value: formatRupiah(report.totalSpent) },
    { label: 'Sisa', value: formatRupiah(report.totalRemaining) },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + cardGap);
    doc.save();
    doc.roundedRect(x, startY, cardWidth, cardHeight, 6).fillAndStroke(BRAND.primaryTint, BRAND.slateBorder);
    doc.fillColor(BRAND.slateMuted).fontSize(8).font('Helvetica');
    doc.text(card.label.toUpperCase(), x + 10, startY + 10, { width: cardWidth - 20 });
    doc.fillColor(BRAND.slateText).fontSize(11).font('Helvetica-Bold');
    doc.text(card.value, x + 10, startY + 24, { width: cardWidth - 20 });
    doc.restore();
  });

  doc.y = startY + cardHeight + 14;

  const barX = margin;
  const barWidth = contentWidth;
  const pct = Math.min(100, report.overallPercentageUsed);
  doc.fontSize(9).fillColor(BRAND.slateMuted).font('Helvetica');
  doc.text(`Utilisasi bulan ini: ${pct}%`, barX, doc.y);
  doc.y += 12;
  doc.save();
  doc.roundedRect(barX, doc.y, barWidth, 8, 4).fill(BRAND.slateSurface);
  const fillWidth = Math.max(4, (barWidth * pct) / 100);
  const fillColor = pct >= 100 ? BRAND.danger : pct >= 80 ? BRAND.warning : BRAND.primary;
  doc.roundedRect(barX, doc.y, fillWidth, 8, 4).fill(fillColor);
  doc.restore();
  doc.y += 22;
}

function drawActivityStats(doc: PdfDoc, report: MonthlyReport): void {
  const margin = doc.page.margins.left;
  const parts = [
    `${report.totalExpenseCount} transaksi`,
    report.totalExpenseCount > 0
      ? `rata-rata ${formatRupiah(report.averageExpenseAmount)}`
      : null,
    report.totalRollover > 0 ? `rollover ${formatRupiah(report.totalRollover)}` : null,
    report.totalBudgeted !== report.totalEffectiveBudget
      ? `anggaran dasar ${formatRupiah(report.totalBudgeted)}`
      : null,
  ].filter(Boolean);

  doc.fontSize(9).fillColor(BRAND.slateMuted).font('Helvetica');
  doc.text(parts.join('  ·  '), margin, doc.y, {
    width: doc.page.width - margin * 2,
  });
  doc.y += 16;
}

function drawCategoryTable(doc: PdfDoc, categories: CategoryReportItem[]): void {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const cols = {
    category: { x: margin, w: 118 },
    budget: { x: margin + 120, w: 72 },
    spent: { x: margin + 194, w: 72 },
    remaining: { x: margin + 268, w: 72 },
    tx: { x: margin + 342, w: 28 },
    status: { x: margin + 372, w: contentWidth - 372 },
  };

  const drawTableHeader = () => {
    const headerY = doc.y;
    doc.save();
    doc.rect(margin, headerY, contentWidth, 22).fill(BRAND.slateText);
    doc.fillColor(BRAND.white).fontSize(8).font('Helvetica-Bold');
    doc.text('KATEGORI', cols.category.x + 8, headerY + 7, { width: cols.category.w });
    doc.text('ANGGARAN', cols.budget.x, headerY + 7, { width: cols.budget.w });
    doc.text('TERPAKAI', cols.spent.x, headerY + 7, { width: cols.spent.w });
    doc.text('SISA', cols.remaining.x, headerY + 7, { width: cols.remaining.w });
    doc.text('TX', cols.tx.x, headerY + 7, { width: cols.tx.w });
    doc.text('STATUS', cols.status.x, headerY + 7, { width: cols.status.w });
    doc.restore();
    doc.y = headerY + 26;
  };

  drawTableHeader();

  categories.forEach((cat, index) => {
    ensureSpace(doc, 22);
    if (doc.y <= doc.page.margins.top + 4) {
      drawTableHeader();
    }

    const rowY = doc.y;
    if (index % 2 === 0) {
      doc.save();
      doc.rect(margin, rowY - 2, contentWidth, 20).fill(BRAND.slateSurface);
      doc.restore();
    }

    doc.fontSize(9).fillColor(BRAND.slateText).font('Helvetica');
    doc.text(cat.categoryName, cols.category.x + 8, rowY, { width: cols.category.w - 8 });
    doc.text(formatRupiah(cat.totalAmount), cols.budget.x, rowY, { width: cols.budget.w });
    doc.text(formatRupiah(cat.totalSpent), cols.spent.x, rowY, { width: cols.spent.w });
    doc.text(formatRupiah(cat.remaining), cols.remaining.x, rowY, { width: cols.remaining.w });
    doc.text(String(cat.expenseCount), cols.tx.x, rowY, { width: cols.tx.w });

    doc.fillColor(alertColor(cat.alertStatus)).font('Helvetica-Bold');
    doc.text(
      `${alertLabel(cat.alertStatus)} (${cat.percentageUsed}%)`,
      cols.status.x,
      rowY,
      { width: cols.status.w },
    );

    doc.y = rowY + 18;
  });
}

function drawTopExpensesTable(doc: PdfDoc, expenses: ReportTopExpense[]): void {
  drawSectionTitle(doc, `Top ${TOP_EXPENSE_LIMIT} pengeluaran terbesar`);

  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;

  if (expenses.length === 0) {
    doc.fontSize(9).fillColor(BRAND.slateMuted).font('Helvetica');
    doc.text('Belum ada pengeluaran tercatat pada periode ini.', margin, doc.y, {
      width: contentWidth,
    });
    doc.y += 16;
    return;
  }

  const cols = {
    rank: { x: margin, w: 18 },
    date: { x: margin + 20, w: 62 },
    category: { x: margin + 84, w: 88 },
    note: { x: margin + 174, w: contentWidth - 174 - 78 },
    amount: { x: margin + contentWidth - 76, w: 76 },
  };

  const drawHeader = () => {
    const headerY = doc.y;
    doc.save();
    doc.rect(margin, headerY, contentWidth, 20).fill(BRAND.slateAccent);
    doc.fillColor(BRAND.white).fontSize(8).font('Helvetica-Bold');
    doc.text('#', cols.rank.x + 4, headerY + 6, { width: cols.rank.w });
    doc.text('TANGGAL', cols.date.x, headerY + 6, { width: cols.date.w });
    doc.text('KATEGORI', cols.category.x, headerY + 6, { width: cols.category.w });
    doc.text('UNTUK APA', cols.note.x, headerY + 6, { width: cols.note.w });
    doc.text('JUMLAH', cols.amount.x, headerY + 6, { width: cols.amount.w, align: 'right' });
    doc.restore();
    doc.y = headerY + 24;
  };

  drawHeader();

  expenses.slice(0, TOP_EXPENSE_LIMIT).forEach((expense, index) => {
    ensureSpace(doc, 22);
    if (doc.y <= doc.page.margins.top + 4) {
      drawHeader();
    }

    const rowY = doc.y;
    if (index % 2 === 0) {
      doc.save();
      doc.rect(margin, rowY - 2, contentWidth, 20).fill(BRAND.slateSurface);
      doc.restore();
    }

    doc.fontSize(9).fillColor(BRAND.slateMuted).font('Helvetica-Bold');
    doc.text(String(index + 1), cols.rank.x + 4, rowY, { width: cols.rank.w });
    doc.fillColor(BRAND.slateText).font('Helvetica');
    doc.text(formatDate(expense.expenseDate), cols.date.x, rowY, { width: cols.date.w });
    doc.text(expense.categoryName, cols.category.x, rowY, { width: cols.category.w });
    doc.text(expenseDescription(expense.note), cols.note.x, rowY, {
      width: cols.note.w,
      ellipsis: true,
    });
    doc.font('Helvetica-Bold');
    doc.text(formatRupiah(expense.amount), cols.amount.x, rowY, {
      width: cols.amount.w,
      align: 'right',
    });

    doc.y = rowY + 18;
  });

  doc.y += 8;
}

function drawCategoryBreakdown(doc: PdfDoc, report: MonthlyReport): void {
  const ranked = [...report.categories]
    .filter((c) => c.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, TOP_CATEGORY_LIMIT);

  if (ranked.length === 0) return;

  drawSectionTitle(doc, 'Kontribusi kategori terbesar');

  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const labelWidth = 92;
  const pctWidth = 28;
  const amountColWidth = 96;
  const colGap = 6;
  const barX = margin + labelWidth + pctWidth + colGap;
  const barMaxWidth = contentWidth - labelWidth - pctWidth - colGap - amountColWidth;
  const amountX = margin + contentWidth - amountColWidth;

  ranked.forEach((cat) => {
    ensureSpace(doc, 22);
    const rowY = doc.y;
    const share =
      report.totalSpent > 0 ? Math.round((cat.totalSpent / report.totalSpent) * 100) : 0;
    const barWidth = Math.max(4, (barMaxWidth * share) / 100);

    doc.fillColor(BRAND.slateText).fontSize(9).font('Helvetica');
    doc.text(cat.categoryName, margin, rowY, { width: labelWidth, ellipsis: true });
    doc.fillColor(BRAND.slateMuted).fontSize(8);
    doc.text(`${share}%`, margin + labelWidth, rowY + 1, { width: pctWidth, align: 'right' });

    doc.save();
    doc.roundedRect(barX, rowY + 2, barMaxWidth, 8, 3).fill(BRAND.slateSurface);
    doc.roundedRect(barX, rowY + 2, barWidth, 8, 3).fill(BRAND.primary);
    doc.restore();

    doc.fillColor(BRAND.slateAccent).fontSize(8).font('Helvetica-Bold');
    doc.text(formatRupiah(cat.totalSpent), amountX, rowY + 1, {
      width: amountColWidth,
      align: 'right',
    });

    doc.y = rowY + 16;
  });

  doc.y += 6;
}

function drawAttentionBox(doc: PdfDoc, categories: CategoryReportItem[]): void {
  const atRisk = categories.filter((c) => c.alertStatus !== 'ok');
  if (atRisk.length === 0) return;

  drawSectionTitle(doc, 'Perlu perhatian');

  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;

  atRisk.forEach((cat) => {
    ensureSpace(doc, 16);
    doc.fillColor(alertColor(cat.alertStatus)).fontSize(9).font('Helvetica-Bold');
    doc.text(
      `• ${cat.categoryName} — ${alertLabel(cat.alertStatus)} (${cat.percentageUsed}% terpakai, sisa ${formatRupiah(cat.remaining)})`,
      margin + 4,
      doc.y,
      { width: contentWidth - 8 },
    );
    doc.y += 13;
  });

  doc.y += 4;
}

function drawPersonSection(doc: PdfDoc, report: MonthlyReport): void {
  ensureSpace(doc, 120);
  doc.fillColor(BRAND.slateText).fontSize(13).font('Helvetica-Bold');
  doc.text(report.userName, doc.page.margins.left, doc.y, {
    width: doc.page.width - doc.page.margins.left * 2,
  });
  doc.y += 20;
  drawSummaryCards(doc, report);
  drawActivityStats(doc, report);

  if (report.categories.length === 0) {
    doc.fontSize(10).fillColor(BRAND.slateMuted).font('Helvetica');
    doc.text('Belum ada data anggaran untuk periode ini.', doc.page.margins.left, doc.y, {
      width: doc.page.width - doc.page.margins.left * 2,
    });
    doc.y += 16;
    return;
  }

  drawSectionTitle(doc, 'Rincian per kategori');
  drawCategoryTable(doc, report.categories);
  doc.y += 4;
  drawTopExpensesTable(doc, report.topExpenses);
  drawCategoryBreakdown(doc, report);
  drawAttentionBox(doc, report.categories);
  doc.y += 8;
}

function drawFooterOnPage(doc: PdfDoc, pageIndex: number, totalPages: number, exportedAt: string): void {
  const margin = doc.page.margins.left;
  const y = footerY(doc);
  const width = doc.page.width - margin * 2;

  doc.save();
  doc.moveTo(margin, y - 8)
    .lineTo(doc.page.width - doc.page.margins.right, y - 8)
    .strokeColor(BRAND.slateBorder)
    .stroke();
  doc.fillColor(BRAND.slateMuted).fontSize(8).font('Helvetica');
  doc.text(
    `DuitKita · Diekspor ${exportedAt} · Halaman ${pageIndex + 1} dari ${totalPages}`,
    margin,
    y,
    { align: 'center', width, lineBreak: false },
  );
  doc.restore();
}

function trimTrailingBlankPage(doc: PdfDoc): number {
  const range = doc.bufferedPageRange();
  if (range.count <= 1) {
    return range.count;
  }

  const lastIndex = range.start + range.count - 1;
  doc.switchToPage(lastIndex);
  if (doc.y > doc.page.margins.top + 48) {
    return range.count;
  }

  return range.count - 1;
}

function drawFooters(doc: PdfDoc): void {
  const exportedAt = new Date().toLocaleString('id-ID');
  const range = doc.bufferedPageRange();
  const totalPages = trimTrailingBlankPage(doc);

  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);
    drawFooterOnPage(doc, i - range.start, totalPages, exportedAt);
  }
}

function scopeLabel(scope: string): string {
  if (scope === 'both') return 'Saya & pasangan';
  return 'Hanya saya';
}

export async function writeMonthlyReportPdf(
  outputPath: string,
  payload: ReportPdfPayload,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `DuitKita — Laporan ${payload.year}-${String(payload.month).padStart(2, '0')}`,
      Author: 'DuitKita',
      Subject: 'Laporan anggaran bulanan',
    },
  });

  const stream = createWriteStream(outputPath);
  doc.pipe(stream);

  const periodLabel = `${MONTH_NAMES[payload.month - 1]} ${payload.year}`;
  drawHeader(doc, periodLabel, scopeLabel(payload.scope));
  drawExecutiveSummary(doc, payload.healthScore, payload.forecast);

  if ('me' in payload.report) {
    const couple = payload.report;
    doc.fontSize(10).fillColor(BRAND.slateAccent).font('Helvetica');
    doc.text(
      `Total gabungan: ${formatRupiah(couple.combinedTotalSpent)} terpakai dari ${formatRupiah(couple.combinedTotalBudget)}`,
      doc.page.margins.left,
      doc.y,
      { width: doc.page.width - doc.page.margins.left * 2 },
    );
    doc.y += 18;
    drawPersonSection(doc, couple.me);
    drawPersonSection(doc, couple.partner);
  } else {
    drawPersonSection(doc, payload.report);
  }

  drawFooters(doc);
  doc.end();
  await finished(stream);
}
