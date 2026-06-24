// src/components/Historial.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
const hora = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';

const MEDIOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'webpay', label: 'Webpay' },
  { id: 'credito_cta_cte', label: 'Crédito' },
  { id: 'saldo_favor', label: 'Saldo a favor' },
];

const hoyStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

export default function Historial() {
  const [fecha, setFecha] = useState(hoyStr());
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [fecha]);

  async function cargar() {
    setCargando(true);
    const ini = new Date(fecha + 'T00:00:00');
    const fin = new Date(fecha + 'T23:59:59.999');
    const { data: ss } = await supabase.from('caja_sesiones').select('*')
      .gte('abierta_en', ini.toISOString()).lte('abierta_en', fin.toISOString())
      .order('abierta_en', { ascending: true });
    const lista = ss || [];
    if (lista.length === 0) { setSesiones([]); setCargando(false); return; }
    const ids = lista.map((s) => s.id);
    const { data: cobros } = await supabase.from('cobros').select('*').in('sesion_id', ids);
    const { data: retiros } = await supabase.from('retiros').select('*').in('sesion_id', ids);
    const enriquecidas = lista.map((s) => {
      const cs = (cobros || []).filter((c) => c.sesion_id === s.id);
      const rs = (retiros || []).filter((r) => r.sesion_id === s.id);
      const tot = {};
      MEDIOS.forEach((m) => { tot[m.id] = cs.filter((c) => c.medio_pago === m.id).reduce((a, c) => a + c.monto, 0); });
      const folios = new Set(cs.map((c) => `${c.tipo_dte}-${c.folio}`));
      return {
        ...s, tot, totalDia: cs.reduce((a, c) => a + c.monto, 0), nDocs: folios.size,
        retAut: rs.filter((r) => r.estado === 'autorizado').reduce((a, r) => a + r.monto, 0),
      };
    });
    setSesiones(enriquecidas); setCargando(false);
  }

  function mover(dias) {
    const d = new Date(fecha + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    setFecha(d.toLocaleDateString('en-CA'));
  }

  const totalDelDia = sesiones.reduce((a, s) => a + s.totalDia, 0);

  return (
    <>
      <div className="jc-panel" style={{ marginBottom: 16 }}>
        <div className="jc-substrip">
          <h2>Historial de cajas</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="jc-btn sm" onClick={() => mover(-1)}>← Anterior</button>
            <input className="jc-input" type="date" style={{ maxWidth: 170 }} value={fecha} max={hoyStr()} onChange={(e) => setFecha(e.target.value)} />
            <button className="jc-btn sm" onClick={() => mover(1)} disabled={fecha >= hoyStr()}>Siguiente →</button>
            <button className="jc-btn sm" onClick={() => setFecha(hoyStr())}>Hoy</button>
          </div>
        </div>
        {!cargando && sesiones.length > 0 && (
          <p className="jc-hint" style={{ marginTop: 8 }}>Total del día: <b>{clp(totalDelDia)}</b> en {sesiones.length} caja(s).</p>
        )}
      </div>

      {cargando ? (
        <p className="jc-cajero">Cargando…</p>
      ) : sesiones.length === 0 ? (
        <div className="jc-panel"><div className="jc-empty">No hubo caja ese día.</div></div>
      ) : (
        sesiones.map((s) => (
          <div className="jc-panel" key={s.id} style={{ marginBottom: 16 }}>
            <div className="jc-substrip">
              <h2>{s.cajero}</h2>
              <span className="jc-badge">{s.estado === 'abierta' ? 'Abierta' : 'Cerrada'} · {hora(s.abierta_en)}{s.cerrada_en ? ` – ${hora(s.cerrada_en)}` : ''}</span>
            </div>
            <div className="jc-cards">
              <div className="jc-card hero"><div className="lbl">Total</div><div className="val">{clp(s.totalDia)}</div></div>
              <div className="jc-card"><div className="lbl">Documentos</div><div className="val">{s.nDocs}</div></div>
              <div className="jc-card"><div className="lbl">Efectivo</div><div className="val">{clp(s.tot.efectivo)}</div></div>
              <div className="jc-card"><div className="lbl">Tarjeta</div><div className="val">{clp(s.tot.tarjeta)}</div></div>
              <div className="jc-card"><div className="lbl">Transferencia</div><div className="val">{clp(s.tot.transferencia)}</div></div>
              <div className="jc-card"><div className="lbl">Webpay</div><div className="val">{clp(s.tot.webpay)}</div></div>
              <div className="jc-card"><div className="lbl">Crédito</div><div className="val">{clp(s.tot.credito_cta_cte)}</div></div>
              <div className="jc-card"><div className="lbl">Saldo a favor</div><div className="val">{clp(s.tot.saldo_favor)}</div></div>
              <div className="jc-card"><div className="lbl">Retiros aut.</div><div className="val">{clp(s.retAut)}</div></div>
            </div>
            {s.estado === 'cerrada' && (
              <p className="jc-hint">Fondo {clp(s.fondo_inicial)} · Arqueo {clp(s.arqueo_efectivo)} · Diferencia {clp(s.diferencia)}</p>
            )}
          </div>
        ))
      )}
    </>
  );
}
