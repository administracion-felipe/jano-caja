// src/components/Autorizaciones.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

export default function Autorizaciones({ perfil }) {
  const [retiros, setRetiros] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data: r } = await supabase.from('retiros').select('*').eq('estado', 'pendiente').order('creado_en', { ascending: true });
    const { data: c } = await supabase.from('cobros').select('*').eq('estado_pago', 'por_confirmar').order('creado_en', { ascending: true });
    setRetiros(r || []); setCobros(c || []); setCargando(false);
  }

  async function resolverRetiro(id, estado) {
    setBusy('r' + id); setError(null);
    const { error } = await supabase.from('retiros').update({
      estado, autorizado_por: perfil.nombre, autorizador_id: perfil.id, resuelto_en: new Date().toISOString(),
    }).eq('id', id);
    setBusy(null);
    if (error) return setError(error.message);
    setRetiros((prev) => prev.filter((x) => x.id !== id));
  }

  async function resolverCobro(id, estado) {
    setBusy('c' + id); setError(null);
    const { error } = await supabase.from('cobros').update({
      estado_pago: estado, confirmado_por: perfil.nombre, confirmado_en: new Date().toISOString(),
    }).eq('id', id);
    setBusy(null);
    if (error) return setError(error.message);
    setCobros((prev) => prev.filter((x) => x.id !== id));
  }

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  return (
    <>
      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Retiros por autorizar</div><div className="val">{retiros.length}</div></div>
        <div className="jc-card"><div className="lbl">Pagos por confirmar</div><div className="val">{cobros.length}</div></div>
      </div>

      {error && <p className="jc-msg error" style={{ marginTop: 0 }}>{error}</p>}

      <div className="jc-panel" style={{ marginBottom: 16 }}>
        <h2>Retiros y devoluciones por autorizar</h2>
        {retiros.length === 0 ? (
          <div className="jc-empty">No hay retiros pendientes.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Solicita</th><th>Tipo</th><th>Detalle</th><th className="num">Monto</th><th></th></tr></thead>
            <tbody>
              {retiros.map((r) => (
                <tr key={r.id}>
                  <td>{r.solicitado_por || '—'}</td>
                  <td>{r.motivo === 'devolucion' ? 'Devolución' : 'Retiro'}</td>
                  <td>{r.descripcion || '—'}</td>
                  <td className="num">{clp(r.monto)}</td>
                  <td><div className="jc-acts">
                    <button className="jc-btn sm danger" disabled={busy === 'r' + r.id} onClick={() => resolverRetiro(r.id, 'rechazado')}>Rechazar</button>
                    <button className="jc-btn sm primary" disabled={busy === 'r' + r.id} onClick={() => resolverRetiro(r.id, 'autorizado')}>Autorizar</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="jc-panel">
        <h2>Pagos por confirmar · transferencia / webpay</h2>
        {cobros.length === 0 ? (
          <div className="jc-empty">No hay pagos por confirmar.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Folio</th><th>Medio</th><th>Cajero</th><th className="num">Monto</th><th></th></tr></thead>
            <tbody>
              {cobros.map((c) => (
                <tr key={c.id}>
                  <td>{c.folio}</td>
                  <td>{c.medio_pago === 'webpay' ? 'Webpay' : 'Transferencia'}</td>
                  <td>{c.cajero || '—'}</td>
                  <td className="num">{clp(c.monto)}</td>
                  <td><div className="jc-acts">
                    <button className="jc-btn sm danger" disabled={busy === 'c' + c.id} onClick={() => resolverCobro(c.id, 'rechazado')}>Rechazar</button>
                    <button className="jc-btn sm primary" disabled={busy === 'c' + c.id} onClick={() => resolverCobro(c.id, 'confirmado')}>Confirmar</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
