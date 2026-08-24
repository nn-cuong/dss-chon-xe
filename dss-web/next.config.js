/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Chỉ copy runtime cần thiết sang image production.
  output: 'standalone',
  // Next 16 tự sinh AGENTS.md / CLAUDE.md ở thư mục gốc; dự án này không dùng.
  agentRules: false,
};

module.exports = nextConfig;
