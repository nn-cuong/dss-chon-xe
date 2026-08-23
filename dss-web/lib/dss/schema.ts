/** Zod schema xác thực form khảo sát (dùng với React Hook Form). */
import { z } from 'zod';

import {
  BUDGET_MAX,
  BUDGET_MIN,
  DAILY_KM_MAX,
  PRIORITY_QUESTIONS,
  type PriorityKey,
} from '@/config/survey';

const priorityScore = z
  .number({ message: 'Vui lòng chọn mức độ ưu tiên.' })
  .int()
  .min(1)
  .max(5);

const prioritiesShape = Object.fromEntries(
  PRIORITY_QUESTIONS.map((q) => [q.key, priorityScore]),
) as Record<PriorityKey, typeof priorityScore>;

export const needsSchema = z.object({
  budgetVnd: z
    .number({ message: 'Vui lòng nhập ngân sách.' })
    .min(BUDGET_MIN, `Ngân sách tối thiểu là ${(BUDGET_MIN / 1_000_000).toLocaleString('vi-VN')} triệu đồng.`)
    .max(BUDGET_MAX, 'Ngân sách quá lớn, vui lòng kiểm tra lại.'),
  powertrain: z.enum(['ICE', 'EV', 'ALL'], { message: 'Vui lòng chọn loại xe.' }),
  dailyKm: z
    .number({ message: 'Vui lòng nhập số km mỗi ngày.' })
    .min(0, 'Số km không được âm.')
    .max(DAILY_KM_MAX, `Tối đa ${DAILY_KM_MAX} km/ngày.`),
  purpose: z.enum(['di_hoc', 'di_lam', 'ca_nhan', 'dua_don', 'mua_sam', 'duong_dai'], {
    message: 'Vui lòng chọn mục đích sử dụng.',
  }),
});

export const prioritiesSchema = z.object({
  priorities: z.object(prioritiesShape),
});

export const surveySchema = needsSchema.merge(prioritiesSchema);

export type NeedsFormValues = z.infer<typeof needsSchema>;
export type PrioritiesFormValues = z.infer<typeof prioritiesSchema>;
export type SurveyFormValues = z.infer<typeof surveySchema>;
