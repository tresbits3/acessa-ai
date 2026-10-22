import type { NextConfig } from 'next';

for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CONTACT_HASH_SECRET', 'APP_ORIGIN']) {
  if (!process.env[name]) throw new Error(`Variável ${name} não configurada para o build`);
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-lib'],
  outputFileTracingIncludes: {
    '/*': ['./models/*.pdf', './assets/GreatVibes-Regular.ttf']
  }
};
export default nextConfig;
