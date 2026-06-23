// src/lib/supabase.js
// Cliente de Supabase para el front. Usa la ANON key (nunca la service_role).
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
