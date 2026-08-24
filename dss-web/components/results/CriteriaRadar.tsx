'use client';

/**
 * So sánh hồ sơ 3 xe dẫn đầu trên 7 tiêu chí.
 *
 * Mỗi trục được chuẩn hoá về 0–100 theo hướng "càng ra ngoài càng tốt": với
 * tiêu chí kiểu Cost (giá, tiêu hao, trọng lượng) giá trị được đảo chiều, nên
 * diện tích lớn hơn luôn có nghĩa là xe tốt hơn.
 */
import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { CRITERION_ORDER } from '@/config/survey';
import { bikeLabel } from '@/lib/dss/format';
import { shortLabels } from '@/lib/dss/labels';
import { useMounted } from '@/lib/dss/useMounted';
import type { CriterionKey, RankedBike } from '@/types/dss';

/**
 * Ba màu chuỗi, đã chạy qua bộ kiểm tra: đạt cả 6 tiêu chí (dải sáng, độ bão
 * hoà, tách biệt với mù màu, tách biệt mắt thường, tương phản nền) trên toàn
 * bộ các cặp, ở cả chế độ sáng và tối.
 */
const SERIES = {
  light: ['#17876E', '#D2551F', '#5B62C4'],
  dark: ['#22A183', '#DA6B25', '#7D80DC'],
};
const GRID = { light: '#E4E0D8', dark: '#2E2B26' };
const TEXT = { light: '#5C574E', dark: '#ADA79A' };

const AXIS_LABEL: Record<CriterionKey, string> = {
  price_vnd: 'Giá',
  fuel_consumption_l_per_100km: 'Tiết kiệm',
  max_power_kw: 'Hiệu năng',
  underseat_storage_l: 'Chứa đồ',
  abs: 'An toàn',
  curb_weight_kg: 'Nhẹ',
  vehicle_warranty_months: 'Bảo hành',
};

const IS_BENEFIT: Record<CriterionKey, boolean> = {
  price_vnd: false,
  fuel_consumption_l_per_100km: false,
  max_power_kw: true,
  underseat_storage_l: true,
  abs: true,
  curb_weight_kg: false,
  vehicle_warranty_months: true,
};

export function CriteriaRadar({ rankings }: { rankings: RankedBike[] }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const mode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const top = useMemo(() => rankings.slice(0, 3), [rankings]);

  // Tên các biến thể thường trùng nhau ở phần đầu ("Yamaha Freego phiên bản …"),
  // cắt cụt sẽ ra 3 nhãn giống hệt. Bỏ phần tiền tố chung để legend đọc được.
  const labels = useMemo(() => shortLabels(top.map(bikeLabel)), [top]);

  const data = useMemo(() => {
    // Chuẩn hoá min-max trên toàn bộ tập kết quả để tỷ lệ phản ánh đúng
    // vị trí của xe trong thị trường, không chỉ trong nhóm 3 xe đầu.
    return CRITERION_ORDER.map((criterion) => {
      const values = rankings
        .map((b) => Number(b[criterion]))
        .filter((v) => Number.isFinite(v));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min;

      const row: Record<string, string | number> = { axis: AXIS_LABEL[criterion] };
      top.forEach((bike, i) => {
        const raw = Number(bike[criterion]);
        let pct = 50;
        if (Number.isFinite(raw) && span > 0) {
          const scaled = ((raw - min) / span) * 100;
          pct = IS_BENEFIT[criterion] ? scaled : 100 - scaled;
        }
        row[`bike${i}`] = Math.round(pct);
      });
      return row;
    });
  }, [rankings, top]);

  if (top.length < 2) return null;

  return (
    <section className="rounded-lg border border-divider bg-content1 px-5 py-5">
      <div className="flex flex-col gap-1">
        <h3 className="label-eyebrow text-default-500">Hồ sơ 3 xe dẫn đầu trên 7 tiêu chí</h3>
        <p className="text-xs leading-relaxed text-default-500">
          Điểm càng ra ngoài càng tốt ở tiêu chí đó (giá, tiêu hao và trọng lượng đã được đảo
          chiều).
        </p>
      </div>

      <div className="mt-4">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="70%">
              <PolarGrid stroke={GRID[mode]} />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: TEXT[mode] }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              {top.map((bike, i) => {
                const color = SERIES[mode][i] ?? SERIES[mode][0];
                return (
                <Radar
                  key={`${bike.rank}-${bikeLabel(bike)}`}
                  name={labels[i] ?? bikeLabel(bike)}
                  dataKey={`bike${i}`}
                  stroke={color}
                  strokeWidth={2}
                  fill={color}
                  fillOpacity={0.12}
                  isAnimationActive={false}
                />
                );
              })}
              <Tooltip
                formatter={(value) => `${Number(value)}/100`}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid rgb(0 0 0 / 0.1)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: TEXT[mode] }} iconSize={10} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
