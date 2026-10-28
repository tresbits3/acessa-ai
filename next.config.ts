import type { NextConfig } from 'next';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CONTACT_HASH_SECRET', 'APP_ORIGIN']) {
  if (!process.env[name]) throw new Error(`Variável ${name} não configurada para o build`);
}

const certificateRenderHash = createHash('sha256');
for (const file of ['src/lib/pdf-render.ts', 'models/modelo-palestra.pdf', 'models/modelo-minicurso.pdf',
  'assets/LiberationSans-Regular.ttf']) {
  certificateRenderHash.update(readFileSync(path.join(process.cwd(), file)));
}

const nextConfig: NextConfig = {
  env: {
    CERTIFICATE_RENDER_VERSION: certificateRenderHash.digest('hex').slice(0, 24)
  },
  serverExternalPackages: ['pdf-lib'],
  outputFileTracingIncludes: {
    '/*': ['./models/*.pdf', './assets/LiberationSans-Regular.ttf']
  }
};
export default nextConfig;
