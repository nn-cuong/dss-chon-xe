export function SiteFooter() {
  return (
    <footer className="no-print mt-8 border-t border-divider py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:px-6">
        <p className="label-eyebrow text-default-400">Về kết quả</p>
        <p className="max-w-[68ch] text-xs leading-relaxed text-default-500">
          Xếp hạng tính bằng thuật toán TOPSIS dựa trên mức ưu tiên bạn cung cấp và thông số xe thu
          thập từ trang chủ các hãng. Đây là công cụ tham khảo — hãy đối chiếu giá và thông số với
          đại lý trước khi quyết định.
        </p>
      </div>
    </footer>
  );
}
