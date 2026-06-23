# jano-caja

App para control de caja — JANO Repuestos.

React + Vite, datos en Supabase, deploy en Netlify.

## Estructura
- `src/components/CobroCaja.jsx` — pantalla de cobro (apertura, escaneo de timbre, cobro, cierre)
- `src/lib/parseTimbre.ts` — lee el timbre electrónico (PDF417) del documento
- `src/lib/supabase.js` — cliente de Supabase (usa la anon key)
- `sql/schema_caja.sql` — tablas y vista de conciliación (correr en el SQL Editor de Supabase)
- `supabase/functions/ingesta-rcv/index.ts` — ingesta del RCV del SII (Edge Function)

## Variables de entorno (en Netlify)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
