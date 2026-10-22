import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-lib'],
  outputFileTracingIncludes: {
    '/*': ['./models/*.pdf', './assets/GreatVibes-Regular.ttf']
  }
};
export default nextConfig;
