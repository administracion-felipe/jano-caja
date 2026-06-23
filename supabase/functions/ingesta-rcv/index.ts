// ============================================================
// Supabase Edge Function — Ingesta del RCV de ventas del SII
// Ruta sugerida: supabase/functions/ingesta-rcv/index.ts
// ------------------------------------------------------------
// Baja los documentos emitidos del período desde el RCV del SII
// (vía gateway) y los concilia en la tabla `documentos`.
//
// Gateway por defecto: BaseAPI -> https://api.baseapi.cl/sii/rcv
// Para cambiar de gateway solo se tocan: GATEWAY_URL, el fetch y mapRcvVenta.
//
// Secrets (supabase secrets set NOMBRE=valor):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (los inyecta Supabase)
//   BASEAPI_KEY   -> tu API key de baseapi.cl
//   SII_RUT       -> RUT empresa, ej: 78155468-5
//   SII_CLAVE     -> clave tributaria del SII  (DATO SENSIBLE)
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://api.baseapi.cl/sii/rcv';

type DocDocumentos = {
  tipo_dte: number;
  folio: number;
  rut_receptor: string | null;
  razon_receptor: string | null;
  fecha_emision: string | null;
  neto: number | null;
  iva: number | null;
  total: number;
  estado_sii: string;
  origen: string;
};

// Período actual YYYY-MM en hora Chile.
function periodoActual(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function normalizaFecha(v: string | null): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);        // YYYY-MM-DD
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);                 // DD/MM/YYYY
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(String(v).replace(/\./g, ''));

// ----- Normalizador del RCV de ventas -----
// OJO: confirma los nombres de campo contra la PRIMERA respuesta real de BaseAPI.
// Aquí se cubren los nombres estándar del RCV del SII y variantes comunes.
function mapRcvVenta(row: Record<string, any>): DocDocumentos | null {
  const tipo = Number(row.tipoDTE ?? row.tipo_doc ?? row.TipoDoc ?? row.tipo);
  const folio = Number(row.folio ?? row.Folio);
  if (!tipo || !folio) return null;

  return {
    tipo_dte: tipo,
    folio,
    rut_receptor: row.rutCliente ?? row.rut_cliente ?? row.RUTDoc ?? null,
    razon_receptor: row.razonSocial ?? row.razon_social ?? row.RznSoc ?? null,
    fecha_emision: normalizaFecha(row.fechaDocto ?? row.fecha_docto ?? row.FchDoc ?? null),
    neto: num(row.montoNeto ?? row.monto_neto ?? row.MntNeto),
    iva: num(row.montoIVA ?? row.monto_iva ?? row.IVA),
    total: num(row.montoTotal ?? row.monto_total ?? row.MntTotal) ?? 0,
    estado_sii: 'confirmado',
    origen: 'rcv',
  };
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const periodo = url.searchParams.get('periodo') ?? periodoActual(); // backfill: ?periodo=2026-05

    // 1. Pedir el RCV de ventas al gateway.
    const resp = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': Deno.env.get('BASEAPI_KEY')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rut: Deno.env.get('SII_RUT'),
        clave: Deno.env.get('SII_CLAVE'),
        periodo,
        tipo: 'ventas',
      }),
    });

    if (!resp.ok) {
      const detalle = await resp.text();
      return Response.json({ error: 'gateway', status: resp.status, detalle }, { status: 502 });
    }

    const data = await resp.json();
    // El arreglo de documentos puede venir como data.documentos / data.detalle / data.data
    // o como arreglo directo. Confirma la ruta en la primera respuesta real.
    const filas: any[] = data.documentos ?? data.detalle ?? data.data ?? (Array.isArray(data) ? data : []);

    const docs = filas
      .map(mapRcvVenta)
      .filter((d): d is DocDocumentos => d !== null);

    if (docs.length === 0) {
      return Response.json({ periodo, procesados: 0, nota: 'sin documentos o revisar mapeo de campos' });
    }

    // 2. Upsert por clave compuesta (tipo_dte, folio). No toca la tabla cobros.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('documentos')
      .upsert(docs, { onConflict: 'tipo_dte,folio' });

    if (error) return Response.json({ error: 'db', detalle: error.message }, { status: 500 });

    return Response.json({ periodo, procesados: docs.length });
  } catch (e) {
    return Response.json({ error: 'inesperado', detalle: String(e) }, { status: 500 });
  }
});
