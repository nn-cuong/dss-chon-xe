import { heroui } from '@heroui/theme';

/**
 * Bảng màu lấy từ thế giới của chủ đề: biển số xe máy Việt Nam (nền xanh lá
 * đậm, chữ trắng), giấy in bảng giá ngả vàng, và màu sơn cam của xe.
 *
 * - jade  #0F5C4D : màu chủ đạo, dùng cho hành động chính và trạng thái chọn.
 * - lacquer #C4491A : chỉ dành cho xe hạng 1 — điểm nhấn duy nhất của trang.
 * - nền là giấy ấm #FAF9F7 / mực #12110F, không phải xám trung tính.
 */
export default heroui({
  themes: {
    light: {
      colors: {
        background: '#FAF9F7',
        foreground: '#12110F',
        divider: '#E4E0D8',
        focus: '#0F5C4D',
        content1: '#FFFFFF',
        content2: '#F3F1EC',
        content3: '#E9E6DE',
        content4: '#DEDAD0',
        default: {
          50: '#F7F5F1',
          100: '#F0EDE7',
          200: '#E4E0D8',
          300: '#D2CCC0',
          400: '#A8A296',
          500: '#7C766B',
          600: '#5C574E',
          700: '#403C35',
          800: '#2A2721',
          900: '#12110F',
          foreground: '#12110F',
          DEFAULT: '#E4E0D8',
        },
        primary: {
          50: '#EAF3F0',
          100: '#CFE3DC',
          200: '#A6CDC1',
          300: '#6FB09E',
          400: '#3C8874',
          500: '#0F5C4D',
          600: '#0C4B3F',
          700: '#093A31',
          800: '#062822',
          900: '#031714',
          foreground: '#FFFFFF',
          DEFAULT: '#0F5C4D',
        },
        secondary: {
          foreground: '#FFFFFF',
          DEFAULT: '#C4491A',
        },
        success: { foreground: '#FFFFFF', DEFAULT: '#1F7A4D' },
        warning: { foreground: '#FFFFFF', DEFAULT: '#966610' },
        danger: { foreground: '#FFFFFF', DEFAULT: '#B4331F' },
      },
    },
    dark: {
      colors: {
        background: '#12110F',
        foreground: '#F2EFE9',
        divider: '#2E2B26',
        focus: '#5FBFA6',
        content1: '#1A1816',
        content2: '#232019',
        content3: '#2E2B26',
        content4: '#3A362F',
        default: {
          50: '#1A1816',
          100: '#232019',
          200: '#2E2B26',
          300: '#403C35',
          400: '#5C574E',
          500: '#8A8478',
          600: '#ADA79A',
          700: '#CDC8BC',
          800: '#E4E0D8',
          900: '#F2EFE9',
          foreground: '#F2EFE9',
          DEFAULT: '#2E2B26',
        },
        primary: {
          50: '#041A16',
          100: '#07291F',
          200: '#0B4034',
          300: '#12604F',
          400: '#1D8770',
          500: '#35A98D',
          600: '#5FBFA6',
          700: '#8FD5C2',
          800: '#BDE7DC',
          900: '#E4F5F0',
          foreground: '#04140F',
          DEFAULT: '#35A98D',
        },
        secondary: {
          foreground: '#12110F',
          DEFAULT: '#F0762F',
        },
        success: { foreground: '#04140F', DEFAULT: '#3FA772' },
        warning: { foreground: '#12110F', DEFAULT: '#E0A526' },
        danger: { foreground: '#FFFFFF', DEFAULT: '#E05B42' },
      },
    },
  },
});
