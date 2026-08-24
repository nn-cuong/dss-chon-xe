import { Button } from '@heroui/button';
import Link from 'next/link';

/** 4 bước — đánh số vì đây thực sự là một trình tự, không phải trang trí. */
const STEPS = [
  { n: '01', title: 'Nhu cầu', text: 'Ngân sách, loại xe, số km mỗi ngày, mục đích sử dụng.' },
  { n: '02', title: 'Ưu tiên', text: 'Chấm 1–5 cho 7 tiêu chí. Kéo thanh trượt là xong.' },
  { n: '03', title: 'Tìm xe', text: 'Lọc theo ngân sách rồi chấm điểm bằng TOPSIS.' },
  { n: '04', title: 'Kết quả', text: 'Bảng xếp hạng kèm lý do vì sao xe đó đứng đầu.' },
];

/** 7 tiêu chí, kèm hướng tối ưu — đây là thông tin, không phải nhãn trang trí. */
const CRITERIA = [
  { name: 'Giá mua', dir: 'thấp' },
  { name: 'Hiệu năng', dir: 'cao' },
  { name: 'An toàn', dir: 'cao' },
  { name: 'Quãng đường', dir: 'cao' },
  { name: 'Chứa đồ', dir: 'cao' },
  { name: 'Trọng lượng', dir: 'thấp' },
  { name: 'Bảo hành', dir: 'cao' },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="label-eyebrow text-primary">Hỗ trợ quyết định · TOPSIS</p>

          <h1 className="mt-5 text-balance font-display text-[2.5rem] font-extrabold leading-[1.04] tracking-[-0.025em] sm:text-[3.25rem] lg:text-[3.75rem]">
            Mua xe máy theo
            <br />
            nhu cầu của bạn!
          </h1>

          <p className="mt-6 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-default-600">
            Trả lời vài câu hỏi ngắn về điều bạn thực sự coi trọng. Hệ thống so sánh toàn bộ các
            mẫu xe đang bán tại Việt Nam trên 7 tiêu chí, rồi xếp hạng những chiếc hợp với bạn
            nhất — kèm lý do rõ ràng.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
            {/* Server Component không truyền được `as={Link}` — bọc Link bên ngoài. */}
            <Link href="/tim-xe">
              <Button color="primary" size="lg" radius="sm" className="px-7 font-medium">
                Bắt đầu chọn xe
              </Button>
            </Link>
            <p className="font-mono text-[11px] leading-relaxed tracking-wide text-default-500">
              1–2 phút · không cần đăng ký
            </p>
          </div>
        </div>

        <CriteriaPanel />
      </section>

      {/* ------------------------------------------------------------- Quy trình */}
      <section className="rule-t py-14">
        <h2 className="label-eyebrow text-default-500">Quy trình</h2>

        <ol className="mt-8 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.n} className="flex flex-col gap-2">
              <span className="font-mono text-xs font-medium tabular-nums text-primary">
                {step.n}
              </span>
              <h3 className="font-display text-lg font-bold tracking-tight">{step.title}</h3>
              <p className="text-sm leading-relaxed text-default-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------------------- Ghi chú */}
      <section className="rule-t py-14">
        <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:gap-16">
          <h2 className="label-eyebrow whitespace-nowrap text-default-500">Cách tính điểm</h2>
          <div className="max-w-[62ch] space-y-3 text-sm leading-relaxed text-default-600">
            <p>
              Mức độ ưu tiên bạn chấm được chuẩn hoá thành trọng số, rồi đưa vào{' '}
              <strong className="font-semibold text-foreground">TOPSIS</strong> — phương pháp xếp
              hạng theo khoảng cách tới phương án lý tưởng. Xe đứng đầu là xe gần nhất với mẫu xe
              tốt nhất có thể và xa nhất với mẫu xe tệ nhất, xét trên đúng những gì bạn coi trọng.
            </p>
            <p className="text-default-500">
              Dữ liệu thông số lấy từ trang chủ các hãng. Đây là công cụ tham khảo — hãy đối chiếu
              giá với đại lý trước khi quyết định.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Bảng 7 tiêu chí — mở đầu bằng chính thứ đặc trưng nhất của hệ thống, thay vì
 * một hình minh hoạ chung chung.
 */
function CriteriaPanel() {
  return (
    <div className="rounded-lg border border-divider bg-content1 p-1.5 shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <span className="label-eyebrow text-default-500">7 tiêu chí đánh giá</span>
        <span className="font-mono text-[11px] tabular-nums text-default-400">hướng tối ưu</span>
      </div>

      <ul className="overflow-hidden rounded-md bg-background">
        {CRITERIA.map((c, i) => (
          <li
            key={c.name}
            className={`flex items-center justify-between px-3.5 py-[0.7rem] text-sm ${
              i > 0 ? 'rule-t' : ''
            }`}
          >
            <span className="font-medium">{c.name}</span>
            <span
              className={`font-mono text-[11px] tracking-wide ${
                c.dir === 'cao' ? 'text-primary' : 'text-default-500'
              }`}
            >
              {c.dir === 'cao' ? '↑ càng cao' : '↓ càng thấp'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
