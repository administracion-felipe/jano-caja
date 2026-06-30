// ============================================================
// parseTimbre.ts
// Parser del Timbre Electrónico (TED) de un DTE chileno.
//
// Entrada : el string que entrega el lector 2D al escanear el PDF417
//           del timbre (el cuadro grande al pie del documento).
//           Formato: <TED ...><DD>...</DD><FRMT>...</FRMT></TED>
// Salida  : los datos que la Caja necesita para pre-llenar el cobro.
//
// Nota: el bloque <CAF> dentro de <DD> repite <RE> y <TD>, por eso
//       lo descartamos antes de extraer los campos del documento.
// ============================================================

export type DocumentoEscaneado = {
  tipoDte: number;              // 33 factura, 39 boleta, 61 NC...
  tipoNombre: string;
  folio: number;
  rutEmisor: string;
  rutReceptor: string | null;   // null en boletas a consumidor final
  razonReceptor: string | null;
  fechaEmision: string | null;  // YYYY-MM-DD (formato nativo del TED)
  emitidoEn: string | null;     // TSTED: fecha-hora de timbrado (YYYY-MM-DDThh:mm:ss)
  total: number;
  primerItem: string | null;
};

const NOMBRE_TIPO: Record<number, string> = {
  33: 'Factura electrónica',
  34: 'Factura exenta',
  39: 'Boleta electrónica',
  41: 'Boleta exenta',
  52: 'Guía de despacho',
  56: 'Nota de débito',
  61: 'Nota de crédito',
};

export function nombreTipo(tipo: number): string {
  return NOMBRE_TIPO[tipo] ?? `Tipo ${tipo}`;
}

// RUT genérico que el SII usa en boletas a consumidor final.
const RUT_CONSUMIDOR_FINAL = '66666666-6';

// Etiqueta amable del cliente para mostrar en pantalla.
// Las boletas a consumidor final traen la razón social como "DESCONOCIDO"
// y/o el RUT genérico 66666666-6; en esos casos mostramos "Consumidor final"
// en vez de "DESCONOCIDO". No altera los datos guardados del documento.
export function clienteDisplay(razon?: string | null, rut?: string | null): string {
  const r = (razon ?? '').trim();
  if (r && r.toUpperCase() !== 'DESCONOCIDO') return r;
  if (rut && rut.replace(/\./g, '') !== RUT_CONSUMIDOR_FINAL) return rut;
  return 'Consumidor final';
}

export function parseTimbre(raw: string): DocumentoEscaneado {
  // 1. Aislar el bloque <DD> y eliminar el <CAF> (que repite RE/TD internamente).
  const dd = (raw.match(/<DD>([\s\S]*?)<\/DD>/)?.[1] ?? raw)
    .replace(/<CAF[\s\S]*?<\/CAF>/g, '');

  const get = (tag: string): string | null =>
    dd.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() ?? null;

  const tipoDte = Number(get('TD'));
  const folio = Number(get('F'));

  if (!tipoDte || !folio) {
    throw new Error('Timbre no reconocido: faltan tipo (TD) o folio (F). ¿Escaneaste el PDF417 del pie?');
  }

  return {
    tipoDte,
    tipoNombre: nombreTipo(tipoDte),
    folio,
    rutEmisor: get('RE') ?? '',
    rutReceptor: get('RR'),
    razonReceptor: get('RSR'),
    fechaEmision: get('FE'),
    emitidoEn: get('TSTED'),
    total: Number(get('MNT') ?? 0),
    primerItem: get('IT1'),
  };
}

// ------------------------------------------------------------
// Borrador de cobro a partir del escaneo.
// La forma de pago NO viene en el timbre: la elige la cajera
// (o se infiere si el cliente es de cuenta corriente).
// ------------------------------------------------------------
export type BorradorCobro = {
  tipo_dte: number;
  folio: number;
  monto: number;
  medio_pago: string | null;   // lo completa la cajera
  receptor: string | null;
  descripcion: string | null;
};

export function borradorCobro(doc: DocumentoEscaneado): BorradorCobro {
  return {
    tipo_dte: doc.tipoDte,
    folio: doc.folio,
    monto: doc.total,
    medio_pago: null,
    receptor: doc.razonReceptor ?? doc.rutReceptor,
    descripcion: doc.primerItem,
  };
}
