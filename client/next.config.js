/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost:5000',
      'happygames-tfdz.onrender.com',
      '*.onrender.com',
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'happygames-tfdz.onrender.com',
        pathname: '/**',
      },
    ],
  },
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;
