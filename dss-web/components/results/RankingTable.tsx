'use client';

/** Bảng xếp hạng đầy đủ: tìm kiếm, lọc hãng, phân trang, mở chi tiết. */
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Pagination } from '@heroui/pagination';
import { Select, SelectItem } from '@heroui/select';
import { useMemo, useState } from 'react';

import { bikeBrand, bikeLabel, formatNumber, formatPercent, formatVndShort } from '@/lib/dss/format';
import type { RankedBike } from '@/types/dss';

const PAGE_SIZE = 10;

interface RankingTableProps {
  rankings: RankedBike[];
  onSelect: (bike: RankedBike) => void;
}

export function RankingTable({ rankings, onSelect }: RankingTableProps) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState<string>('');

  const brands = useMemo(
    () => Array.from(new Set(rankings.map(bikeBrand))).sort((a, b) => a.localeCompare(b, 'vi')),
    [rankings],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rankings.filter((b) => {
      if (brand && bikeBrand(b) !== brand) return false;
      if (!q) return true;
      return bikeLabel(b).toLowerCase().includes(q);
    });
  }, [rankings, query, brand]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          size="sm"
          radius="sm"
          variant="bordered"
          placeholder="Tìm theo tên xe…"
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          isClearable
          onClear={() => setQuery('')}
          className="sm:max-w-[16rem]"
          aria-label="Tìm theo tên xe"
        />
        <Select
          size="sm"
          radius="sm"
          variant="bordered"
          placeholder="Tất cả hãng"
          aria-label="Lọc theo hãng"
          selectedKeys={brand ? [brand] : []}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0];
            setBrand(value ? String(value) : '');
            setPage(1);
          }}
          className="sm:max-w-[11rem]"
        >
          {brands.map((b) => (
            <SelectItem key={b}>{b}</SelectItem>
          ))}
        </Select>
        {(query || brand) && (
          <Button
            size="sm"
            variant="light"
            radius="sm"
            onPress={() => {
              setQuery('');
              setBrand('');
              setPage(1);
            }}
          >
            Xoá lọc
          </Button>
        )}
        <span className="font-mono text-[11px] tabular-nums text-default-500 sm:ml-auto">
          {filtered.length} / {rankings.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-divider">
              <Th className="w-14 text-left">Hạng</Th>
              <Th className="text-left">Tên xe</Th>
              <Th className="text-right">Giá</Th>
              <Th className="text-right">Công suất (kW)</Th>
              <Th className="text-right">Cốp (L)</Th>
              <Th className="text-center">ABS</Th>
              <Th className="w-40 text-right">Độ phù hợp</Th>
              <Th className="w-20 text-right">
                <span className="sr-only">Chi tiết</span>
              </Th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-default-500">
                  Không có xe nào khớp bộ lọc.
                </td>
              </tr>
            )}

            {rows.map((bike) => (
              <tr
                key={`${bike.rank}-${bikeLabel(bike)}`}
                className="border-b border-divider/60 transition-colors last:border-0 hover:bg-default-50"
              >
                <Td>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      bike.rank <= 3 ? 'font-semibold text-primary' : 'text-default-400'
                    }`}
                  >
                    {String(bike.rank).padStart(2, '0')}
                  </span>
                </Td>
                <Td>
                  <p className="font-medium leading-tight">{bikeLabel(bike)}</p>
                  <p className="mt-0.5 text-[11px] text-default-500">
                    {bikeBrand(bike)} · {String(bike.vehicle_type ?? '—')}
                  </p>
                </Td>
                <Td className="text-right font-mono text-[13px] tabular-nums">
                  {formatVndShort(bike.price_vnd)}
                </Td>
                <Td className="text-right font-mono text-[13px] tabular-nums text-default-600">
                  {formatNumber(bike.max_power_kw, 2)}
                </Td>
                <Td className="text-right font-mono text-[13px] tabular-nums text-default-600">
                  {formatNumber(bike.underseat_storage_l, 1)}
                </Td>
                <Td className="text-center">
                  {Number(bike.abs) > 0 ? (
                    <span className="font-mono text-[11px] text-primary">có</span>
                  ) : (
                    <span className="text-default-300" aria-label="không có">
                      —
                    </span>
                  )}
                </Td>
                <Td>
                  <ScoreBar score={Number(bike.topsis_score)} top={bike.rank === 1} />
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(bike)}
                    className="rounded-sm font-mono text-[11px] text-default-500 underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    chi tiết
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="no-print flex justify-center">
          <Pagination
            page={safePage}
            total={pages}
            onChange={setPage}
            size="sm"
            radius="sm"
            variant="light"
            showControls
            aria-label="Phân trang bảng xếp hạng"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Tiêu đề cột dùng chữ thường: in hoa kèm giãn chữ làm dấu tiếng Việt bị rời
 * khỏi nguyên âm và rất khó đọc ("CÔNG SUẤT" → "CONG SUAT").
 */
function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`pb-2.5 text-[11px] font-semibold text-default-500 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-3 pr-3 align-middle ${className}`}>{children}</td>;
}

function ScoreBar({ score, top }: { score: number; top: boolean }) {
  const pct = Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
  return (
    <div className="flex items-center justify-end gap-2.5">
      <span className="h-[6px] w-20 overflow-hidden rounded-full bg-default-200">
        <span
          className={`block h-full rounded-full ${top ? 'bg-secondary' : 'bg-primary/70'}`}
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className="w-12 text-right font-mono text-[11px] tabular-nums text-default-600">
        {formatPercent(pct, 1)}
      </span>
    </div>
  );
}
