import type { Metadata } from 'next';

import { SurveyWizard } from '@/components/wizard/SurveyWizard';

export const metadata: Metadata = {
  title: 'Tìm xe phù hợp',
  description:
    'Trả lời 4 câu hỏi về nhu cầu và chấm điểm 7 tiêu chí ưu tiên để nhận danh sách xe máy phù hợp nhất.',
};

export default function FindBikePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <SurveyWizard />
    </div>
  );
}
