'use client';

/** Modal chi tiết một mẫu xe: thông số + lý do xếp hạng + độ phù hợp quãng đường. */
import { Button } from '@heroui/button';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/modal';
import { useMemo } from 'react';

import { SpecGrid } from '@/components/results/SpecGrid';
import { computeStrengths, StrengthChips } from '@/components/results/WhyThisBike';
import { assessRangeFit } from '@/lib/dss/mapping';
import { bikeBrand, bikeLabel, formatPercent, formatScore, formatVnd } from '@/lib/dss/format';
import type { RankedBike } from '@/types/dss';

interface BikeDetailModalProps {
  bike: RankedBike | null;
  allBikes: RankedBike[];
  weights: number[];
  dailyKm: number;
  onClose: () => void;
}

export function BikeDetailModal({
  bike,
  allBikes,
  weights,
  dailyKm,
  onClose,
}: BikeDetailModalProps) {
  const strengths = useMemo(
    () => (bike ? computeStrengths(bike, allBikes, weights, 4) : []),
    [bike, allBikes, weights],
  );
  const rangeFit = useMemo(() => (bike ? assessRangeFit(bike, dailyKm) : null), [bike, dailyKm]);
  const top = allBikes[0];

  return (
    <Modal isOpen={bike !== null} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        {bike && (
          <>
            <ModalHeader className="flex flex-col items-start gap-2 pb-3">
              <p className="label-eyebrow text-default-400">
                Hạng {String(bike.rank).padStart(2, '0')} · {bikeBrand(bike)}
                {bike.vehicle_type ? ` · ${String(bike.vehicle_type)}` : ''}
              </p>
              <h2 className="font-display text-xl font-bold leading-tight tracking-tight">
                {bikeLabel(bike)}
              </h2>
            </ModalHeader>

            <ModalBody className="gap-0 pb-2">
              <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
                <div>
                  <p className="label-eyebrow text-default-400">Giá bán</p>
                  <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums">
                    {formatVnd(bike.price_vnd)}
                  </p>
                </div>
                <div>
                  <p className="label-eyebrow text-default-400">Độ phù hợp</p>
                  <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-primary">
                    {formatPercent(bike.topsis_score, 1)}
                    <span className="ml-2 text-[10px] font-normal text-default-400">
                      Ci {formatScore(bike.topsis_score)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rule-t mt-6 pt-5">
                <SpecGrid bike={bike} />
              </div>

              <section className="rule-t mt-6 pt-5">
                <h3 className="label-eyebrow text-default-500">Điểm mạnh</h3>
                <div className="mt-3">
                  <StrengthChips strengths={strengths} />
                </div>
              </section>

              {rangeFit && (
                <section className="rule-t mt-6 pt-5">
                  <h3 className="label-eyebrow text-default-500">Quãng đường</h3>
                  <p
                    className={`mt-3 border-l-2 pl-3.5 text-sm leading-relaxed ${
                      rangeFit.level === 'warning'
                        ? 'border-warning text-default-700'
                        : 'border-primary text-default-600'
                    }`}
                  >
                    {rangeFit.message}
                  </p>
                </section>
              )}

              {top && bike.rank > 1 && (
                <p className="rule-t mt-6 pt-5 text-xs leading-relaxed text-default-500">
                  Xe hạng 1 (<strong className="font-medium text-default-700">{bikeLabel(top)}</strong>)
                  đạt {formatPercent(top.topsis_score, 1)} — cao hơn{' '}
                  {formatPercent(Number(top.topsis_score) - Number(bike.topsis_score), 1)}.
                </p>
              )}
            </ModalBody>

            <ModalFooter>
              <Button variant="light" radius="sm" onPress={onClose}>
                Đóng
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
