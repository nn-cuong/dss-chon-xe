# Tech Stack — dss-web

Bản ghi chính xác những gì **thực sự** được cài và dùng trong dự án này.

## Bảng công nghệ

| Lớp | Công nghệ | Version |
|-----|-----------|---------|
| Framework | Next.js (App Router, Turbopack ở dev) | `^16.0.7` |
| Ngôn ngữ | TypeScript (strict + `noUncheckedIndexedAccess`) | `5.6.3` |
| UI runtime | React | `18.3.1` |
| Component library | HeroUI (19 package lẻ `@heroui/*`) | `2.x` |
| CSS | Tailwind CSS v4 (qua `@tailwindcss/postcss`) | `4.1.11` |
| Animation | Framer Motion | `11.18.2` |
| Dark mode | next-themes | `0.4.6` |
| Server state | TanStack React Query + Devtools | `^5.90.11` |
| HTTP client | Axios (instance riêng + interceptor) | `^1.13.2` |
| API codegen | Orval (OpenAPI → React Query hooks) | `^7.17.0` |
| Form | React Hook Form + `@hookform/resolvers` | `^7.66.0` / `^5.2.2` |
| Validation | Zod | `^4.1.12` |
| Charts | Recharts | `^3.4.1` |
| Ngày giờ | date-fns | `^4.1.0` |
| Export | jsPDF (+ autotable) / csv-stringify | `^3.0.3` / `^6.6.0` |
| Lint/format | ESLint 9 (flat config) + Prettier | `9.25.1` / `3.5.3` |
| Package manager | Yarn (`nodeLinker: node-modules`) | `1.22.22` |
| Runtime | **Node >= 22.18.0** | — |

## ⚠️ Node 22, không phải Node 20

Spec ban đầu ghi Node 20, nhưng **Orval từ 7.14.0 trở lên bắt buộc
`node >= 22.18.0`**. Với Node 20, `yarn install` fail ngay:

```
error orval@7.x: The engine "node" is incompatible with this module.
Expected version ">=22.18.0". Got "20.20.0"
```

Dự án chọn giữ Orval `^7.17.0` và nâng Node lên 22 (`.nvmrc` = `22`).
Nếu buộc phải dùng Node 20, hạ Orval xuống `^7.13.2` — bản cuối cùng không
giới hạn engine, vẫn hỗ trợ đầy đủ `react-query` + `tags-split` + mutator.

## Các package đã CHỦ ĐỘNG loại bỏ

Bốn package sau có trong spec gốc nhưng **không được cài**, vì không chỗ nào
import và chúng gây hiểu nhầm về kiến trúc:

| Package | Lý do loại |
|---------|-----------|
| `next-auth` | Auth tự viết bằng `localStorage` + `AuthContext`, không dùng NextAuth |
| `@auth/prisma-adapter` | Không có Prisma, không có database |
| `nodemailer` | Lib server-side, vô nghĩa trong frontend thuần |
| `bcryptjs` | Lib server-side, vô nghĩa trong frontend thuần |

Ngoài ra 9 package HeroUI không dùng tới cũng bị loại (`alert`, `badge`,
`checkbox`, `dropdown`, `form`, `link`, `skeleton`, `switch`, `tabs`).
Chỉ giữ 19 package thực sự được import — cộng `@heroui/theme` cho `hero.ts`.

## Điểm kiến trúc

- **Orval** đọc OpenAPI (`../ingestion/dss-openapi.json`) sinh type + hook vào
  `lib/api/generated/` (mode `tags-split`). Không viết tay call API — chỉ viết
  `lib/api/client.ts` làm mutator (Bearer token, xử lý 401).
- **Không có backend trong repo này.** Pure frontend, gọi API ngoài qua
  `NEXT_PUBLIC_API_URL`. Không có `app/api/`, không database, không Prisma.
- **Auth**: JWT trong `localStorage`, bảo vệ route bằng `<RequireAuth>` phía
  client (`contexts/AuthContext.tsx`), **không dùng middleware**.
- **Không có `middleware.ts`.** Spec gốc có file này với toàn bộ logic bị
  comment out, khiến matcher chạy vô ích — nên dự án này không tạo nó.
- **`next.config.js` có nội dung thật** (`reactStrictMode`), không phải file
  rỗng. Lưu ý: Next 16 **không còn hỗ trợ** key `eslint` trong `next.config.js`.
- **Cấu trúc**: `app/` · `components/` · `lib/api/` · `lib/dss/` · `contexts/` ·
  `config/` · `types/` · `styles/`, alias `@/*` trỏ về root.

## Vì sao có `lib/api/hooks.ts` bên cạnh Orval

FastAPI khai báo `rankings: List[Dict[str, Any]]` và `top_choice: Dict[str, Any]`,
nên OpenAPI mô tả chúng là `object` và Orval chỉ sinh được `object[]`. Do đó
`types/dss.ts` + `lib/api/hooks.ts` bổ sung type domain chi tiết cho 4 endpoint
DSS. Cả hai lớp dùng chung một mutator nên hành vi HTTP là đồng nhất.

## Những chỗ phải xử lý riêng cho Next 16 / React 19 tooling

| Vấn đề | Cách xử lý |
|--------|-----------|
| `eslint-config-next@16` đã là flat config native | Bỏ `FlatCompat` (`@eslint/eslintrc` gây `TypeError: Converting circular structure to JSON`), import trực tiếp `eslint-config-next/core-web-vitals` và `/typescript` |
| React Compiler cấm `setState` đồng bộ trong `useEffect` | Thay pattern `useState(false)` + `useEffect(() => setMounted(true))` bằng `useSyncExternalStore` (`lib/dss/useMounted.ts`); `AuthContext` đọc token qua `useSyncExternalStore`, `SurveyContext` dùng lazy initializer |
| `as={Link}` trên HeroUI Button trong Server Component | Lỗi prerender *"Functions cannot be passed directly to Client Components"* — bọc `<Link>` bên ngoài `<Button>` ở `app/page.tsx` và `app/not-found.tsx` |
| Recharts v3 đổi kiểu `Formatter` | Formatter nhận `ValueType \| undefined`, phải ép `Number(value)` thay vì khai báo `(value: number)` |
| HeroUI `Slider` không nhận `color="default"` | Dùng `'foreground'` cho Slider, `'default'` cho Chip (hai hàm màu riêng) |
| Tailwind v4 `@plugin` với file TS | Đổi `hero.ts` → `hero.mjs` để Node không cảnh báo `MODULE_TYPELESS_PACKAGE_JSON` |

## Trạng thái kiểm thử

```
yarn typecheck   ✓ 0 lỗi
yarn lint        ✓ 0 lỗi (2 warning "Compilation Skipped" của React Compiler
                   trên component dùng React Hook Form — không phải lỗi)
yarn build       ✓ 4 route đều prerender static
yarn generate:api ✓ sinh 20 file vào lib/api/generated/
```

## Hệ thống thiết kế

Bảng màu và kiểu chữ lấy từ chính thế giới của chủ đề (biển số xe máy Việt Nam,
giấy in bảng giá, sơn xe) thay vì mặc định xanh dương / Inter.

| Vai trò | Sáng | Tối | Ghi chú |
|---------|------|-----|---------|
| Nền | `#FAF9F7` giấy ấm | `#12110F` mực | Không phải xám trung tính |
| Chủ đạo | `#0F5C4D` xanh biển số | `#35A98D` | Hành động chính, trạng thái chọn |
| Nhấn | `#C4491A` cam sơn | `#F0762F` | **Chỉ** dùng cho xe hạng 1 |

Kiểu chữ, 3 vai trò — cả ba đều có bộ dấu tiếng Việt đầy đủ trên Google Fonts:

- **Bricolage Grotesque** — tiêu đề (`.font-display`)
- **IBM Plex Sans** — nội dung (mặc định)
- **IBM Plex Mono** — số liệu, nhãn, giá (`.font-mono`, kèm `tabular-nums`)

### Hai điều cần nhớ khi sửa giao diện

**1. Không in hoa + giãn chữ với tiếng Việt.** `text-transform: uppercase` kèm
`letter-spacing` lớn làm dấu tách khỏi nguyên âm — "CÔNG SUẤT" đọc thành
"CONG SUAT". Class `.label-eyebrow` trong `styles/globals.css` vì vậy dùng chữ
thường cỡ nhỏ, không in hoa.

**2. Màu biểu đồ khác màu giao diện.** Xanh `#0F5C4D` quá trầm để làm màu chuỗi
dữ liệu (trượt ngưỡng độ bão hoà). Biểu đồ dùng bộ riêng đã kiểm tra đạt cả 6
tiêu chí (dải sáng, bão hoà, tách biệt mù màu, tách biệt mắt thường, tương phản)
trên **mọi cặp**, ở **cả hai** chế độ:

- Sáng: `#17876E` · `#D2551F` · `#5B62C4`
- Tối: `#22A183` · `#DA6B25` · `#7D80DC`

Đổi màu biểu đồ thì phải chạy lại kiểm tra, đừng chọn bằng mắt.
