// src/components/Pagos.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const BANCO = { santander: 'Santander', bancoestado: 'BancoEstado', mercadopago: 'Mercado Pago' };
const bancoLabel = (b) => BANCO[b] || b;

function calza(t, cobro) {
  if (t.monto !== cobro.monto) return false;
  if (cobro.medio_pago === 'webpay') return t.banco === 'mercadopago';
  return t.banco === 'santander' || t.banco === 'bancoestado';
}

export default function Pagos({ perfil }) {
  const [cobros, setCobros] = useState([]);
  const [transfs, setTransfs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data: c } = await supabase.from('cobros').select('*').eq('estado_pago', 'por_confirmar').order('creado_en', { ascending: true });
    const { data: t } = await supabase.from('transferencias_recibidas').select('*').eq('estado', 'disponible').order('fecha', { ascending: false });
    setCobros(c || []); setTransfs(t || []); setCargando(false);
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

  const puede = perfil.puede_autorizar;

  return (
    <>
      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Pagos por confirmar</div><div className="val">{cobros.length}</div></div>
        <div className="jc-card"><div className="lbl">Transferencias sin asignar</div><div className="val">{transfs.length}</div></div>
      </div>

      {error && <p className="jc-msg error" style={{ marginTop: 0 }}>{error}</p>}
      {!puede && <p className="jc-hint" style={{ marginTop: 0, marginBottom: 12 }}>Puedes ver los pagos y las transferencias. Confirmar o rechazar un pago es solo para autorizadores.</p>}

      <div className="jc-panel" style={{ marginBottom: 16 }}>
        <h2>Pagos por confirmar · transferencia / webpay</h2>
        {cobros.length === 0 ? (
          <div className="jc-empty">No hay pagos por confirmar.</div>
        ) : (
          <div className="jc-conflist">
            {cobros.map((cobro) => {
              const candidatos = transfs.filter((t) => calza(t, cobro));
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
                        <div className={`jc-cand ${t.banco}`} key={t.id}>
                          <div className="info">
                            <b>{t.pagador || 'Sin nombre'}</b>{' '}
                            <span className={`jc-bank ${t.banco}`}>{bancoLabel(t.banco)}</span>{' '}
                            <span>{t.fecha}</span>
                            {t.comentario && <div><span>{t.comentario}</span></div>}
                          </div>
                          {puede && <button className="jc-btn sm ok" disabled={bloqueado} onClick={() => resolverCobro(cobro, 'confirmado', t)}>Usar esta</button>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="jc-nomatch">No hay transferencias recibidas que calcen por monto.</div>
                  )}

                  {puede && (
                    <div className="jc-acts">
                      <button className="jc-btn sm danger" disabled={bloqueado} onClick={() => resolverCobro(cobro, 'rechazado')}>Rechazar</button>
                      <button className="jc-btn sm" disabled={bloqueado} onClick={() => resolverCobro(cobro, 'confirmado')}>Confirmar sin transferencia</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="jc-panel">
        <h2>Transferencias recibidas sin asignar</h2>
        {transfs.length === 0 ? (
          <div className="jc-empty">No hay transferencias pendientes de asignar.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Fecha</th><th>Banco</th><th>Pagador</th><th>Detalle</th><th className="num">Monto</th></tr></thead>
            <tbody>
              {transfs.map((t) => (
                <tr key={t.id}>
                  <td>{t.fecha}</td>
                  <td><span className={`jc-bank ${t.banco}`}>{bancoLabel(t.banco)}</span></td>
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
