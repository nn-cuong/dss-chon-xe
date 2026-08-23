/**
 * Rút gọn danh sách tên xe thành nhãn ngắn nhưng vẫn phân biệt được nhau.
 *
 * Cắt cụt thẳng sẽ cho ra các nhãn giống hệt khi nhiều biến thể cùng một dòng
 * xe xuất hiện (ví dụ "Yamaha Freego phiên bản đặc biệt" và "… đặc biệt màu
 * mới"). Khi phát hiện trùng, ta giữ vài từ đầu để nhận ra dòng xe rồi nối
 * phần đuôi — nơi chứa điểm khác biệt.
 */
export function shortLabels(names: string[], max = 22): string[] {
  const out = names.map((n) => truncate(n, max));
  if (new Set(out).size === out.length) return out;

  return names.map((name) => {
    if (name.length <= max) return name;

    const words = name.split(/\s+/);
    const head = words.slice(0, 2).join(' ');
    const tail = words.slice(2).join(' ');
    const room = max - head.length - 2;
    if (room <= 2) return truncate(name, max);

    // Cắt theo ranh giới từ để không đứt giữa chữ có dấu.
    const tailWords = tail.split(/\s+/);
    let kept = '';
    for (let i = tailWords.length - 1; i >= 0; i -= 1) {
      const next = kept ? `${tailWords[i]} ${kept}` : tailWords[i];
      if (!next || next.length > room) break;
      kept = next;
    }
    if (!kept) kept = tail.slice(Math.max(0, tail.length - room));
    return `${head} …${kept}`;
  });
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
