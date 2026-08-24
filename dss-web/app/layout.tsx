import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

import { Providers } from '@/app/providers';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import '@/styles/globals.css';

/** Chữ tiêu đề: hơi cơ khí, gợi biển hiệu — dùng tiết chế. */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

/** Chữ nội dung: kỹ thuật, dễ đọc, hỗ trợ dấu tiếng Việt đầy đủ. */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-plex-sans',
  display: 'swap',
  weight: ['400', '500', '600'],
});

/** Chữ số liệu: giá, thông số, nhãn — cột số thẳng hàng. */
const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-plex-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'Chọn Xe — Hệ hỗ trợ lựa chọn xe máy',
    template: '%s · Chọn Xe',
  },
  description:
    'Trả lời vài câu hỏi ngắn về nhu cầu và mức độ ưu tiên, hệ thống sẽ xếp hạng các mẫu xe máy phù hợp nhất bằng thuật toán TOPSIS.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#12110f' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${bricolage.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="dss-page-bg min-h-dvh font-sans">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
