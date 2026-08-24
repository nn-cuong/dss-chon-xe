'use client';

/** Bước 4 — Kết quả: xe hạng 1, biểu đồ so sánh và bảng xếp hạng đầy đủ. */
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BikeDetailModal } from '@/components/results/BikeDetailModal';
import { CriteriaRadar } from '@/components/results/CriteriaRadar';
import { EmptyResult } from '@/components/results/EmptyResult';
import { RankingTable } from '@/components/results/RankingTable';
import { ResultSummaryBar } from '@/components/results/ResultSummaryBar';
import { ScoreChart } from '@/components/results/ScoreChart';
import { TopChoiceCard } from '@/components/results/TopChoiceCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { StepIndicator } from '@/components/wizard/StepIndicator';
import { StepSearching } from '@/components/wizard/StepSearching';
import { useSurvey } from '@/contexts/SurveyContext';
import { getApiErrorMessage } from '@/lib/api/client';
import { useRunDss } from '@/lib/api/hooks';
import { buildRunRequest, type SurveyAnswers } from '@/lib/dss/mapping';
import type { Powertrain, RankedBike } from '@/types/dss';

export function ResultsView() {
  const router = useRouter();
  const { answers, hasAnswers, isHydrated, result, setResult, updateAnswers, reset } = useSurvey();

  const [selected, setSelected] = useState<RankedBike | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runDss = useRunDss();

  const rerun = useCallback(
    async (nextAnswers: SurveyAnswers) => {
      setErrorMessage(null);
      try {
        const next = await runDss.mutateAsync(buildRunRequest(nextAnswers));
        setResult(next);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    },
    [runDss, setResult],
  );

  // Chỉ tự chạy lại đúng một lần cho mỗi lần vào trang.
  const autoRunStarted = useRef(false);

  // Vào thẳng /ket-qua (F5 hoặc mở link) mà chưa có kết quả: chạy lại từ câu
  // trả lời đã lưu trong sessionStorage; nếu chưa có gì thì quay về wizard.
  useEffect(() => {
    if (!isHydrated || result || autoRunStarted.current) return;
    autoRunStarted.current = true;

    if (hasAnswers) {
      // rerun() là hàm async: mọi setState thật sự đều nằm sau `await`, nhưng
      // linter không lần được qua ranh giới đó nên báo nhầm ở đây.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void rerun(answers);
    } else {
      router.replace('/tim-xe');
    }
  }, [isHydrated, result, hasAnswers, answers, rerun, router]);

  const goEdit = useCallback(() => router.push('/tim-xe'), [router]);
  const restart = useCallback(() => {
    reset();
    router.push('/tim-xe');
  }, [reset, router]);

  if (!isHydrated || (!result && runDss.isPending)) {
    return (
      <div className="space-y-8">
        <StepIndicator current="searching" />
        <StepSearching />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-8">
        <StepIndicator current="results" />
        <ErrorState message={errorMessage} onRetry={() => void rerun(answers)} />
        <div className="flex justify-center">
          <Button variant="light" onPress={goEdit}>
            Quay lại sửa câu trả lời
          </Button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="space-y-8">
        <StepIndicator current="results" />
        <Card shadow="sm">
          <CardBody className="items-center gap-3 py-12 text-center">
            <p className="text-sm text-default-500">Chưa có kết quả nào để hiển thị.</p>
            <Button color="primary" onPress={goEdit}>
              Bắt đầu chọn xe
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (result.status === 'empty') {
    return (
      <div className="space-y-8">
        <StepIndicator current="results" />
        <EmptyResult
          message={result.message}
          answers={answers}
          onRelaxBudget={(budget) => {
            const next = { ...answers, budgetVnd: budget };
            updateAnswers({ budgetVnd: budget });
            void rerun(next);
          }}
          onRelaxPowertrain={() => {
            const powertrain: Powertrain = 'ALL';
            const next = { ...answers, powertrain };
            updateAnswers({ powertrain });
            void rerun(next);
          }}
          onEdit={goEdit}
        />
      </div>
    );
  }

  const rankings = result.rankings ?? [];
  const top = rankings[0];

  return (
    <div className="space-y-8">
      <StepIndicator current="results" />

      <ResultSummaryBar
        answers={answers}
        rankings={rankings}
        totalCandidates={result.total_candidates}
        explanation={result.explanation}
        onEdit={goEdit}
        onRestart={restart}
      />

      {top && (
        <TopChoiceCard
          bike={top}
          allBikes={rankings}
          weights={result.weights}
          explanation={result.explanation}
          dailyKm={answers.dailyKm}
        />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ScoreChart rankings={rankings} />
        <CriteriaRadar rankings={rankings} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="label-eyebrow text-default-500">Bảng xếp hạng đầy đủ</h2>
        <RankingTable rankings={rankings} onSelect={setSelected} />
      </section>

      <BikeDetailModal
        bike={selected}
        allBikes={rankings}
        weights={result.weights}
        dailyKm={answers.dailyKm}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
