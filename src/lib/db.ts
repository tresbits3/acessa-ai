import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { required } from './config';
export function db() {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
