// src/lib/medios.js
// Taxonomía de medios de pago, alineada con la planilla de la cajera.
export const MEDIOS = [
  { id: 'efectivo',                label: 'Efectivo',         color: '#0F9D58' },
  { id: 'debito',                  label: 'Débito',           color: '#E0A106' },
  { id: 'credito',                 label: 'Crédito',          color: '#D97706' },
  { id: 'transferencia_estado',    label: 'Transf. Estado',   color: '#F47B20' },
  { id: 'transferencia_santander', label: 'Transf. Santander', color: '#EC0000' },
  { id: 'cheque',                  label: 'Cheque',           color: '#7C3AED' },
  { id: 'webpay',                  label: 'Webpay',           color: '#DB2777' },
  { id: 'mercado_libre',           label: 'Mercado Libre',    color: '#00A6E0' },
  { id: 'credito_cta_cte',         label: 'Cuenta corriente', color: '#64748B' },
  { id: 'saldo_favor',             label: 'Saldo a favor',    color: '#8B5CF6' },
];

// Etiquetas heredadas (registros antiguos guardados con otros nombres).
const HEREDADOS = { tarjeta: 'Tarjeta', transferencia: 'Transferencia', banco: 'Banco' };

export const medioLabel = (id) =>
  MEDIOS.find((m) => m.id === id)?.label ?? HEREDADOS[id] ?? id ?? '—';

export const medioColor = (id) =>
  MEDIOS.find((m) => m.id === id)?.color ?? '#94A3B8';

// Medios que quedan "por confirmar" hasta validarse contra el correo del banco.
export const REQUIERE_CONFIRMACION = ['transferencia_estado', 'transferencia_santander', 'transferencia', 'webpay'];
