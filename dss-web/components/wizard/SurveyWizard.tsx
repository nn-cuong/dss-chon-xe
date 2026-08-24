'use client';

/**
 * Điều phối luồng Nhu cầu → Ưu tiên → Tìm xe → Kết quả.
 *
 * Kết quả được lưu vào SurveyContext rồi điều hướng sang /ket-qua, nên người
 * dùng có thể quay lại sửa câu trả lời mà không mất dữ liệu đã nhập.
 */
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { StepIndicator, type WizardStepId } from '@/components/wizard/StepIndicator';
import { StepNeeds } from '@/components/wizard/StepNeeds';
import { StepPriorities } from '@/components/wizard/StepPriorities';
import { StepSearching } from '@/components/wizard/StepSearching';
import { ErrorState } from '@/components/ui/ErrorState';
import { useSurvey } from '@/contexts/SurveyContext';
import { getApiErrorMessage } from '@/lib/api/client';
import { useRunDss } from '@/lib/api/hooks';
import { buildRunRequest, type SurveyAnswers } from '@/lib/dss/mapping';
import type { NeedsFormValues, PrioritiesFormValues } from '@/lib/dss/schema';

export function SurveyWizard() {
  const router = useRouter();
  const { answers, isHydrated, updateAnswers, setResult } = useSurvey();

  const [step, setStep] = useState<WizardStepId>('needs');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runDss = useRunDss();

  const submitSurvey = useCallback(
    async (finalAnswers: SurveyAnswers) => {
      setStep('searching');
      setErrorMessage(null);
      try {
        const result = await runDss.mutateAsync(buildRunRequest(finalAnswers));
        setResult(result);
        router.push('/ket-qua');
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
        setStep('priorities');
      }
    },
    [runDss, setResult, router],
  );

  const handleNeeds = useCallback(
    (values: NeedsFormValues) => {
      updateAnswers(values);
      setStep('priorities');
      // Cuộn lên đầu để người dùng thấy ngay phần câu hỏi mới.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateAnswers],
  );

  const handlePriorities = useCallback(
    (values: PrioritiesFormValues) => {
      const next: SurveyAnswers = { ...answers, priorities: values.priorities };
      updateAnswers(next);
      void submitSurvey(next);
    },
    [answers, updateAnswers, submitSurvey],
  );

  // Chờ đọc xong sessionStorage để không hiển thị sai giá trị mặc định.
  if (!isHydrated) {
    return <div className="h-96 animate-pulse rounded-xl bg-default-100" aria-hidden />;
  }

  return (
    <div className="space-y-8">
      <StepIndicator current={step} />

      {errorMessage && (
        <ErrorState
          title="Không tìm được xe"
          message={errorMessage}
          onRetry={() => {
            setErrorMessage(null);
            void submitSurvey(answers);
          }}
        />
      )}

      {step === 'needs' && (
        <StepNeeds
          defaultValues={{
            budgetVnd: answers.budgetVnd,
            powertrain: answers.powertrain,
            dailyKm: answers.dailyKm,
            purpose: answers.purpose,
          }}
          onSubmit={handleNeeds}
        />
      )}

      {step === 'priorities' && (
        <StepPriorities
          defaultValues={{ priorities: answers.priorities }}
          purpose={answers.purpose}
          isSubmitting={runDss.isPending}
          onBack={() => setStep('needs')}
          onSubmit={handlePriorities}
        />
      )}

      {step === 'searching' && <StepSearching />}
    </div>
  );
}
