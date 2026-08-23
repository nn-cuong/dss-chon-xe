'use client';

/** Bảng thông số: nhãn nhỏ ở trên, số liệu mono ở dưới, ngăn bằng kẻ mảnh. */
import { formatAbs, formatNumber, formatPowertrain } from '@/lib/dss/format';
import type { RankedBike } from '@/types/dss';

export function SpecGrid({ bike }: { bike: RankedBike }) {
  const specs = [
    { label: 'Nhiên liệu', value: formatPowertrain(bike.powertrain), mono: false },
    { label: 'Công suất', value: `${formatNumber(bike.max_power_kw, 2)} kW` },
    { label: 'Tiêu hao', value: `${formatNumber(bike.fuel_consumption_l_per_100km, 2)} L` },
    { label: 'Cốp xe', value: `${formatNumber(bike.underseat_storage_l, 1)} L` },
    { label: 'Trọng lượng', value: `${formatNumber(bike.curb_weight_kg, 0)} kg` },
    { label: 'Phanh ABS', value: formatAbs(bike.abs), mono: false },
    { label: 'Bảo hành', value: `${formatNumber(bike.vehicle_warranty_months, 0)} tháng` },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-7">
      {specs.map((s) => (
        <div key={s.label} className="flex flex-col gap-1">
          <dt className="label-eyebrow text-default-400">{s.label}</dt>
          <dd
            className={
              s.mono === false
                ? 'text-sm font-semibold'
                : 'font-mono text-sm font-medium tabular-nums'
            }
          >
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
