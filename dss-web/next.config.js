/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bỏ output: 'standalone' để tránh lỗi .nft.json trên Vercel
  agentRules: false,
};

module.exports = nextConfig;
