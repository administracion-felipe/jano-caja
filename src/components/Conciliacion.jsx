// src/components/Conciliacion.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const clp = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const TIPO = { 33: 'Factura', 34: 'Factura exenta', 39: 'Boleta', 41: 'Boleta exenta', 52: 'Guía', 56: 'N. débito', 61: 'N. crédito' };
const tipoNombre = (t) => TIPO[t] ?? `Tipo ${t}`;

const EST = {
  ok: { label: 'OK', cls: 'ok' },
  sin_cobro: { label: 'Sin cobro', cls: 'warn' },
  sin_documento: { label: 'Sin documento', cls: 'warn' },
  monto_no_calza: { label: 'Monto no calza', cls: 'bad' },
};

export default function Conciliacion() {
  const [rows, setRows] = useState(null);
  const [soloDesc, setSoloDesc] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data, error } = await supabase.from('conciliacion').select('*').order('folio', { ascending: false }).limit(500);
    if (error) { setError(error.message); setRows([]); return; }
    setRows(data || []);
  }

  if (rows === null) return <p className="jc-cajero">Cargando…</p>;

  const resumen = rows.reduce((a, r) => { a[r.estado_conciliacion] = (a[r.estado_conciliacion] || 0) + 1; return a; }, {});
  const visibles = soloDesc ? rows.filter((r) => r.estado_conciliacion !== 'ok') : rows;

  return (
    <>
      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Documentos</div><div className="val">{rows.length}</div></div>
        <div className="jc-card"><div className="lbl">Conciliados</div><div className="val">{resumen.ok || 0}</div></div>
        <div className="jc-card"><div className="lbl">Sin cobro</div><div className="val">{resumen.sin_cobro || 0}</div></div>
        <div className="jc-card"><div className="lbl">Sin documento</div><div className="val">{resumen.sin_documento || 0}</div></div>
        <div className="jc-card"><div className="lbl">Monto no calza</div><div className="val">{resumen.monto_no_calza || 0}</div></div>
      </div>

      <div className="jc-panel">
        <div className="jc-substrip">
          <h2>Conciliación · SII ↔ Caja</h2>
          <label className="jc-cajero" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={soloDesc} onChange={(e) => setSoloDesc(e.target.checked)} />
            Solo descuadres
          </label>
        </div>

        {error && <p className="jc-msg error">{error}</p>}

        {visibles.length === 0 ? (
          <div className="jc-empty">{soloDesc ? 'Sin descuadres. Todo cuadra.' : 'Aún no hay documentos registrados.'}</div>
        ) : (
          <table className="jc-table">
            <thead>
              <tr><th>Tipo</th><th>Folio</th><th className="num">Documento</th><th className="num">Cobrado</th><th>SII</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {visibles.map((r, i) => {
                const e = EST[r.estado_conciliacion] || { label: r.estado_conciliacion, cls: '' };
                return (
                  <tr key={`${r.tipo_dte}-${r.folio}-${i}`}>
                    <td>{tipoNombre(r.tipo_dte)}</td>
                    <td>{r.folio}</td>
                    <td className="num">{clp(r.monto_documento)}</td>
                    <td className="num">{clp(r.monto_cobrado)}</td>
                    <td><span className="jc-tag">{r.estado_sii || '—'}</span></td>
                    <td><span className={`jc-st ${e.cls}`}>{e.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
