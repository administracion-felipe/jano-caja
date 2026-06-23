// src/components/Autorizaciones.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const BANCO = { santander: 'Santander', bancoestado: 'BancoEstado', mercadopago: 'Mercado Pago' };
const bancoLabel = (b) => BANCO[b] || b;

// ¿la transferencia calza con el cobro? mismo monto + medio compatible
function calza(t, cobro) {
  if (t.monto !== cobro.monto) return false;
  if (cobro.medio_pago === 'webpay') return t.banco === 'mercadopago';
  return t.banco === 'santander' || t.banco === 'bancoestado'; // transferencia
}

export default function Autorizaciones({ perfil }) {
  const [retiros, setRetiros] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [transfs, setTransfs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data: r } = await supabase.from('retiros').select('*').eq('estado', 'pendiente').order('creado_en', { ascending: true });
    const { data: c } = await supabase.from('cobros').select('*').eq('estado_pago', 'por_confirmar').order('creado_en', { ascending: true });
    const { data: t } = await supabase.from('transferencias_recibidas').select('*').eq('estado', 'disponible').order('fecha', { ascending: false });
    setRetiros(r || []); setCobros(c || []); setTransfs(t || []); setCargando(false);
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

  async function resolverCobro(cobro, estado, transf) {
    setBusy('c' + cobro.id); setError(null);
    const { error } = await supabase.from('cobros').update({
      estado_pago: estado, confirmado_por: perfil.nombre, confirmado_en: new Date().toISOString(),
    }).eq('id', cobro.id);
    if (!error && transf && estado === 'confirmado') {
      await supabase.from('transferencias_recibidas').update({ estado: 'asignada', cobro_id: cobro.id }).eq('id', transf.id);
      setTransfs((prev) => prev.filter((x) => x.id !== transf.id));
    }
    setBusy(null);
    if (error) return setError(error.message);
    setCobros((prev) => prev.filter((x) => x.id !== cobro.id));
  }

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  const disponibles = transfs;

  return (
    <>
      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Retiros por autorizar</div><div className="val">{retiros.length}</div></div>
        <div className="jc-card"><div className="lbl">Pagos por confirmar</div><div className="val">{cobros.length}</div></div>
        <div className="jc-card"><div className="lbl">Transferencias sin asignar</div><div className="val">{disponibles.length}</div></div>
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

      <div className="jc-panel" style={{ marginBottom: 16 }}>
        <h2>Pagos por confirmar · transferencia / webpay</h2>
        {cobros.length === 0 ? (
          <div className="jc-empty">No hay pagos por confirmar.</div>
        ) : (
          <div className="jc-conflist">
            {cobros.map((cobro) => {
              const candidatos = disponibles.filter((t) => calza(t, cobro));
              const bloqueado = busy === 'c' + cobro.id;
              return (
                <div className="jc-confcard" key={cobro.id}>
                  <div className="jc-confhead">
                    <div className="who">Folio {cobro.folio} · {cobro.medio_pago === 'webpay' ? 'Webpay' : 'Transferencia'} · {cobro.cajero || '—'}</div>
                    <div className="monto">{clp(cobro.monto)}</div>
                  </div>

                  {candidatos.length > 0 ? (
                    <div className="jc-cands">
                      <div className="lbl">Transferencias recibidas que calzan</div>
                      {candidatos.map((t) => (
                        <div className="jc-cand" key={t.id}>
                          <div className="info">
                            <b>{t.pagador || 'Sin nombre'}</b> · <span>{bancoLabel(t.banco)} · {t.fecha}</span>
                            {t.comentario && <div><span>{t.comentario}</span></div>}
                          </div>
                          <button className="jc-btn sm primary" disabled={bloqueado} onClick={() => resolverCobro(cobro, 'confirmado', t)}>Confirmar con esta</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="jc-nomatch">No hay transferencias recibidas que calcen por monto. Confirma manualmente solo si verificaste el pago.</div>
                  )}

                  <div className="jc-acts">
                    <button className="jc-btn sm danger" disabled={bloqueado} onClick={() => resolverCobro(cobro, 'rechazado')}>Rechazar</button>
                    <button className="jc-btn sm" disabled={bloqueado} onClick={() => resolverCobro(cobro, 'confirmado')}>Confirmar sin transferencia</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="jc-panel">
        <h2>Transferencias recibidas sin asignar</h2>
        {disponibles.length === 0 ? (
          <div className="jc-empty">No hay transferencias pendientes de asignar.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Fecha</th><th>Banco</th><th>Pagador</th><th>Detalle</th><th className="num">Monto</th></tr></thead>
            <tbody>
              {disponibles.map((t) => (
                <tr key={t.id}>
                  <td>{t.fecha}</td>
                  <td>{bancoLabel(t.banco)}</td>
                  <td>{t.pagador || '—'}</td>
                  <td>{t.comentario || '—'}</td>
                  <td className="num">{clp(t.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
