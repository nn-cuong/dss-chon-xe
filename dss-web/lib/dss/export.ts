/** Xuất kết quả xếp hạng ra CSV và PDF. */
import { stringify } from 'csv-stringify/browser/esm/sync';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { bikeBrand, bikeLabel, formatNumber, formatScore } from '@/lib/dss/format';
import type { RankedBike } from '@/types/dss';

const HEADERS = [
  'Hạng',
  'Tên xe',
  'Hãng',
  'Loại xe',
  'Nhiên liệu',
  'Giá (VNĐ)',
  'Công suất (kW)',
  'Cốp (L)',
  'ABS',
  'Trọng lượng (kg)',
  'Bảo hành (tháng)',
  'Điểm TOPSIS',
];

function toRow(bike: RankedBike): (string | number)[] {
  return [
    bike.rank,
    bikeLabel(bike),
    bikeBrand(bike),
    String(bike.vehicle_type ?? '—'),
    String(bike.powertrain ?? '—'),
    Number(bike.price_vnd ?? 0),
    formatNumber(bike.max_power_kw, 2),
    formatNumber(bike.underseat_storage_l, 1),
    Number(bike.abs) > 0 ? 'Có' : 'Không',
    formatNumber(bike.curb_weight_kg, 0),
    formatNumber(bike.vehicle_warranty_months, 0),
    formatScore(bike.topsis_score),
  ];
}

function timestamp(): string {
  return format(new Date(), 'yyyy-MM-dd_HHmm', { locale: vi });
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportRankingsCsv(rankings: RankedBike[]): void {
  const csv = stringify([HEADERS, ...rankings.map(toRow)]);
  // BOM để Excel trên Windows đọc đúng tiếng Việt.
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `ket-qua-chon-xe_${timestamp()}.csv`);
}

export function exportRankingsPdf(rankings: RankedBike[], explanation?: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.text('Ket qua goi y xe may (TOPSIS)', 40, 40);
  doc.setFontSize(9);
  doc.text(`Xuat luc: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}`, 40, 58);
  doc.text(`Tong so xe duoc xep hang: ${rankings.length}`, 40, 72);

  autoTable(doc, {
    startY: 90,
    // jsPDF core fonts không có glyph tiếng Việt có dấu; bỏ dấu ở phần bảng.
    head: [HEADERS.map(stripDiacritics)],
    body: rankings.map((b) => toRow(b).map((c) => stripDiacritics(String(c)))),
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [24, 119, 242] },
    columnStyles: {
      5: { halign: 'right' },
      11: { halign: 'right' },
    },
  });

  if (explanation) {
    const y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(stripDiacritics(explanation.replace(/\*\*/g, '')), 760), 40, y + 24);
  }

  doc.save(`ket-qua-chon-xe_${timestamp()}.pdf`);
}

/** jsPDF dùng font Helvetica không hỗ trợ tiếng Việt có dấu — chuyển sang không dấu. */
function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
