import type { Metadata } from 'next';

import { ResultsView } from '@/components/results/ResultsView';

export const metadata: Metadata = {
  title: 'Kết quả gợi ý xe',
  description: 'Bảng xếp hạng các mẫu xe máy phù hợp nhất với nhu cầu của bạn.',
};

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <ResultsView />
    </div>
  );
}
