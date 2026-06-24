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

export default function Historial({ perfil }) {
  const [fecha, setFecha] = useState(hoyStr());
  const [sesiones, setSesiones] = useState([]);
  const [fuera, setFuera] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => { cargar(); }, [fecha]);
  useEffect(() => { cargarFuera(); }, []);

  async function cargarFuera() {
    const { data } = await supabase.from('documentos').select('tipo_dte,folio,razon_receptor,total,emitido_en,fecha_emision')
      .eq('fuera_horario', true).order('emitido_en', { ascending: false }).limit(50);
    setFuera(data || []);
  }

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

  async function reabrir(s) {
    setAviso(null);
    // No permitir dos cajas abiertas a la vez.
    const { data: ab } = await supabase.from('caja_sesiones').select('id,cajero')
      .eq('estado', 'abierta').limit(1).maybeSingle();
    if (ab) {
      setConfirmId(null);
      setAviso({ tipo: 'error', txt: `Ya hay una caja abierta (${ab.cajero}). Ciérrala antes de reabrir otra.` });
      return;
    }
    const { error } = await supabase.from('caja_sesiones')
      .update({ estado: 'abierta', cerrada_en: null, arqueo_efectivo: null, diferencia: null })
      .eq('id', s.id);
    setConfirmId(null);
    if (error) { setAviso({ tipo: 'error', txt: error.message }); return; }
    setAviso({ tipo: 'ok', txt: 'Caja reabierta. Ve a la pestaña Caja para editar cobros, retiros y volver a cerrarla.' });
    cargar();
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
        {aviso && <p className={`jc-msg ${aviso.tipo}`}>{aviso.txt}</p>}
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
              <>
                <p className="jc-hint">Fondo {clp(s.fondo_inicial)} · Arqueo {clp(s.arqueo_efectivo)} · Diferencia {clp(s.diferencia)}</p>
                {confirmId === s.id ? (
                  <div className="jc-row" style={{ alignItems: 'center', gap: 10 }}>
                    <span className="jc-hint" style={{ margin: 0 }}>¿Reabrir esta caja para editarla?</span>
                    <button className="jc-btn sm primary" onClick={() => reabrir(s)}>Sí, reabrir</button>
                    <button className="jc-btn sm" onClick={() => setConfirmId(null)}>Cancelar</button>
                  </div>
                ) : (
                  <div className="jc-row">
                    <button className="jc-btn sm" onClick={() => { setAviso(null); setConfirmId(s.id); }}>Reabrir caja</button>
                  </div>
                )}
              </>
            )}
            {s.estado === 'abierta' && (
              <p className="jc-hint warn">Esta caja está abierta. Edítala desde la pestaña Caja y ciérrala ahí.</p>
            )}
          </div>
        ))
      )}

      <div className="jc-panel" style={{ marginTop: 16 }}>
        <h2>Documentos fuera de horario</h2>
        <p className="jc-hint" style={{ marginTop: 0 }}>Emitidos fuera de lun–vie 9:00–17:30. Se listan por su fecha real de emisión para que no se pierdan del registro.</p>
        {fuera.length === 0 ? (
          <div className="jc-empty">No hay documentos fuera de horario.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Emitido</th><th>Folio</th><th>Cliente</th><th className="num">Monto</th></tr></thead>
            <tbody>
              {fuera.map((d) => (
                <tr key={`${d.tipo_dte}-${d.folio}`}>
                  <td>{d.emitido_en ? new Date(d.emitido_en).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : (d.fecha_emision || '—')}</td>
                  <td>{d.folio}</td>
                  <td>{d.razon_receptor || '—'}</td>
                  <td className="num">{clp(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
