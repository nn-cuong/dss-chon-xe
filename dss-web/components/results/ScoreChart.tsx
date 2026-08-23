'use client';

/**
 * Biểu đồ so sánh độ phù hợp của 5 xe dẫn đầu.
 *
 * Một chuỗi dữ liệu duy nhất (điểm TOPSIS) nên không cần chú giải màu — tiêu
 * đề đã nói rõ đang đo gì, và mỗi cột đều được gắn nhãn giá trị trực tiếp.
 */
import { useTheme } from 'next-themes';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { bikeLabel, formatPercent } from '@/lib/dss/format';
import { shortLabels } from '@/lib/dss/labels';
import { useMounted } from '@/lib/dss/useMounted';
import type { RankedBike } from '@/types/dss';

/** Bảng màu đã kiểm tra đạt mọi cặp ở cả hai chế độ (xem CriteriaRadar). */
const ACCENT = { light: '#D2551F', dark: '#DA6B25' };
const MUTED = { light: '#B8B2A6', dark: '#4A463E' };
const TEXT = { light: '#5C574E', dark: '#ADA79A' };

export function ScoreChart({ rankings }: { rankings: RankedBike[] }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const mode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';

  const top = rankings.slice(0, 5);
  // Nhiều biến thể cùng dòng xe có tên gần giống nhau — rút gọn sao cho vẫn
  // phân biệt được, thay vì cắt cụt thành các nhãn trùng lặp.
  const names = shortLabels(top.map(bikeLabel), 24);
  const data = top.map((b, i) => ({
    name: names[i] ?? bikeLabel(b),
    fullName: bikeLabel(b),
    score: Number(b.topsis_score),
    rank: b.rank,
  }));

  if (data.length < 2) return null;

  return (
    <section className="rounded-lg border border-divider bg-content1 px-5 py-5">
      <div className="flex flex-col gap-1">
        <h3 className="label-eyebrow text-default-500">Độ phù hợp của 5 xe dẫn đầu</h3>
        <p className="text-xs leading-relaxed text-default-500">
          Điểm càng cao càng gần với mẫu xe lý tưởng theo ưu tiên của bạn.
        </p>
      </div>

      <div className="mt-4">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 56, bottom: 4, left: 4 }}
              barCategoryGap="28%"
            >
              <XAxis type="number" domain={[0, 1]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: TEXT[mode] }}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                formatter={(value) => [formatPercent(Number(value), 1), 'Độ phù hợp']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid rgb(0 0 0 / 0.1)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  // Xe hạng 1 dùng màu nhấn, các xe còn lại lùi về màu trung tính
                  // để mắt bắt ngay vào lựa chọn hàng đầu.
                  <Cell key={d.rank} fill={d.rank === 1 ? ACCENT[mode] : MUTED[mode]} />
                ))}
                <LabelList
                  dataKey="score"
                  position="right"
                  formatter={(v) => formatPercent(Number(v), 1)}
                  style={{ fontSize: 11, fill: TEXT[mode] }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
