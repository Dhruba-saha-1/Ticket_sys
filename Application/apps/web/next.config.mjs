/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@ticketing/shared', '@ticketing/api-client'],
};

export default nextConfig;
