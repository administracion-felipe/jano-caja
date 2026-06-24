// src/components/Autorizaciones.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Confirm from './Confirm';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
const fechaHora = (ts) =>
  ts ? new Date(ts).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

const ACCION = { solicitado: 'Solicitado', editado: 'Editado', autorizado: 'Autorizado', rechazado: 'Rechazado' };

export default function Autorizaciones({ perfil }) {
  const [retiros, setRetiros] = useState([]);
  const [hist, setHist] = useState({});
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const [editId, setEditId] = useState(null);
  const [eMotivo, setEMotivo] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eNota, setENota] = useState('');
  const [eMonto, setEMonto] = useState('');
  const [confirmar, setConfirmar] = useState(null);

  const [nuevoTipo, setNuevoTipo] = useState('');
  const [busyTipo, setBusyTipo] = useState(false);

  const puedeAutorizar = perfil.puede_autorizar;
  const tiposActivos = tipos.filter((t) => t.activo);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data: r } = await supabase.from('retiros').select('*')
      .in('estado', ['pendiente', 'autorizado']).order('creado_en', { ascending: false }).limit(60);
    const { data: t } = await supabase.from('tipos_retiro').select('*').order('nombre');
    const lista = r || [];
    let mapa = {};
    if (lista.length) {
      const { data: h } = await supabase.from('retiros_historial').select('*')
        .in('retiro_id', lista.map((x) => x.id)).order('creado_en', { ascending: true });
      (h || []).forEach((e) => { (mapa[e.retiro_id] = mapa[e.retiro_id] || []).push(e); });
    }
    setRetiros(lista); setTipos(t || []); setHist(mapa); setCargando(false);
  }

  async function crearTipo() {
    const nombre = nuevoTipo.trim();
    if (!nombre) return;
    setBusyTipo(true); setError(null);
    const { data, error } = await supabase.from('tipos_retiro').insert({ nombre, creado_por: perfil.nombre }).select().single();
    setBusyTipo(false);
    if (error) return setError(error.message);
    setTipos((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setNuevoTipo('');
  }

  async function toggleTipo(t) {
    const { error } = await supabase.from('tipos_retiro').update({ activo: !t.activo }).eq('id', t.id);
    if (error) return setError(error.message);
    setTipos((prev) => prev.map((x) => x.id === t.id ? { ...x, activo: !x.activo } : x));
  }

  function abrirEdicion(r) {
    setEditId(r.id); setEMotivo(r.motivo || ''); setEDesc(r.descripcion || ''); setENota(r.nota || ''); setEMonto(String(r.monto));
  }

  function pedirGuardar(r) {
    const nuevoMonto = Number(eMonto) || 0;
    if (nuevoMonto <= 0) { setError('Ingresa un monto válido.'); return; }
    const cambios = [];
    if (nuevoMonto !== r.monto) cambios.push(`monto ${clp(r.monto)} → ${clp(nuevoMonto)}`);
    if (eMotivo !== (r.motivo || '')) cambios.push(`tipo → ${eMotivo}`);
    if ((eDesc || '') !== (r.descripcion || '')) cambios.push('detalle');
    if ((eNota || '') !== (r.nota || '')) cambios.push('nota');
    const reauth = r.estado === 'autorizado' ? ' El retiro volverá a quedar pendiente de autorización.' : '';
    setConfirmar({
      mensaje: (cambios.length ? `Vas a cambiar: ${cambios.join(', ')}.` : 'Sin cambios de datos.') + reauth,
      accion: () => guardarEdicion(r),
    });
  }

  async function guardarEdicion(r) {
    setBusy('e' + r.id); setError(null);
    const nuevoMonto = Number(eMonto) || 0;
    const { error } = await supabase.from('retiros').update({
      monto: nuevoMonto, motivo: eMotivo, descripcion: eDesc || null, nota: eNota || null,
      estado: 'pendiente', autorizado_por: null, autorizador_id: null, resuelto_en: null,
    }).eq('id', r.id);
    if (!error) {
      await supabase.from('retiros_historial').insert({
        retiro_id: r.id, accion: 'editado', monto: nuevoMonto, detalle: eMotivo, usuario: perfil.nombre, usuario_id: perfil.id,
      });
    }
    setBusy(null); setConfirmar(null); setEditId(null);
    if (error) return setError(error.message);
    await cargar();
  }

  async function resolver(r, estado) {
    setBusy('r' + r.id); setError(null);
    const { error } = await supabase.from('retiros').update({
      estado, autorizado_por: perfil.nombre, autorizador_id: perfil.id, resuelto_en: new Date().toISOString(),
    }).eq('id', r.id);
    if (!error) {
      await supabase.from('retiros_historial').insert({
        retiro_id: r.id, accion: estado, monto: r.monto, detalle: r.motivo, usuario: perfil.nombre, usuario_id: perfil.id,
      });
    }
    setBusy(null);
    if (error) return setError(error.message);
    await cargar();
  }

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  const pendientes = retiros.filter((r) => r.estado === 'pendiente');

  return (
    <>
      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Retiros por autorizar</div><div className="val">{pendientes.length}</div></div>
        <div className="jc-card"><div className="lbl">Tipos de retiro</div><div className="val">{tiposActivos.length}</div></div>
      </div>

      {error && <p className="jc-msg error" style={{ marginTop: 0 }}>{error}</p>}
      {!puedeAutorizar && <p className="jc-hint" style={{ marginTop: 0, marginBottom: 12 }}>Puedes ver y editar las solicitudes. Autorizar, rechazar y crear tipos de retiro es solo para autorizadores.</p>}

      {puedeAutorizar && (
        <div className="jc-panel" style={{ marginBottom: 16 }}>
          <h2>Tipos de retiro</h2>
          <p className="jc-hint" style={{ marginTop: 0 }}>Define las categorías que aparecen al solicitar un retiro.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="jc-input" value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} placeholder="Nuevo tipo (ej. Pago a proveedor)" onKeyDown={(e) => e.key === 'Enter' && crearTipo()} />
            <button className="jc-btn primary" disabled={busyTipo} onClick={crearTipo}>{busyTipo ? 'Guardando…' : 'Agregar'}</button>
          </div>
          {tipos.length > 0 && (
            <table className="jc-table" style={{ marginTop: 12 }}>
              <thead><tr><th>Tipo</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td>{t.nombre}</td>
                    <td><span className={`jc-st ${t.activo ? 'ok' : 'warn'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td><div className="jc-acts"><button className="jc-btn sm" onClick={() => toggleTipo(t)}>{t.activo ? 'Desactivar' : 'Activar'}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="jc-panel">
        <h2>Retiros y devoluciones</h2>
        {retiros.length === 0 ? (
          <div className="jc-empty">No hay retiros pendientes ni autorizados recientes.</div>
        ) : (
          <div className="jc-conflist">
            {retiros.map((r) => {
              const editando = editId === r.id;
              const trail = hist[r.id] || [];
              return (
                <div className="jc-confcard" key={r.id}>
                  <div className="jc-confhead">
                    <div className="who">
                      {r.solicitado_por || '—'} · {r.motivo || '—'}
                      {' '}<span className={`jc-st ${r.estado === 'autorizado' ? 'ok' : 'warn'}`}>{r.estado === 'autorizado' ? `Autorizado · ${r.autorizado_por || ''}` : 'Pendiente'}</span>
                    </div>
                    <div className="monto">{clp(r.monto)}</div>
                  </div>

                  {editando ? (
                    <div style={{ marginTop: 8 }}>
                      <label className="jc-lbl">Tipo</label>
                      <select className="jc-select" value={eMotivo} onChange={(e) => setEMotivo(e.target.value)}>
                        <option value="">Elegir tipo…</option>
                        {tiposActivos.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                        {eMotivo && !tiposActivos.some((t) => t.nombre === eMotivo) && <option value={eMotivo}>{eMotivo}</option>}
                      </select>
                      <label className="jc-lbl">Detalle</label>
                      <input className="jc-input" value={eDesc} onChange={(e) => setEDesc(e.target.value)} />
                      <label className="jc-lbl">Nota</label>
                      <input className="jc-input" value={eNota} onChange={(e) => setENota(e.target.value)} />
                      <label className="jc-lbl">Monto</label>
                      <input className="jc-input" type="number" value={eMonto} onChange={(e) => setEMonto(e.target.value)} />
                      <p className="jc-hint">Al guardar, el retiro vuelve a quedar pendiente de autorización.</p>
                      <div className="jc-row">
                        <button className="jc-btn" onClick={() => setEditId(null)}>Cancelar</button>
                        <button className="jc-btn primary" disabled={busy === 'e' + r.id} onClick={() => pedirGuardar(r)}>Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(r.descripcion || r.nota) && <div className="jc-hint" style={{ marginTop: 6 }}>{r.descripcion || ''}{r.nota ? ` · ${r.nota}` : ''}</div>}
                      <div className="jc-acts" style={{ marginTop: 8 }}>
                        <button className="jc-btn sm" onClick={() => abrirEdicion(r)}>Editar</button>
                        {puedeAutorizar && r.estado === 'pendiente' && <button className="jc-btn sm danger" disabled={busy === 'r' + r.id} onClick={() => resolver(r, 'rechazado')}>Rechazar</button>}
                        {puedeAutorizar && r.estado === 'pendiente' && <button className="jc-btn sm ok" disabled={busy === 'r' + r.id} onClick={() => resolver(r, 'autorizado')}>Autorizar</button>}
                      </div>
                    </>
                  )}

                  {trail.length > 0 && (
                    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      {trail.map((e) => (
                        <div key={e.id} className="jc-sub" style={{ display: 'block', margin: '2px 0' }}>
                          {ACCION[e.accion] || e.accion} · {e.usuario || '—'} · {fechaHora(e.creado_en)}{e.accion === 'editado' && e.monto ? ` · ${clp(e.monto)}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmar && (
        <Confirm
          titulo="Confirmar cambios"
          mensaje={confirmar.mensaje}
          busy={!!busy}
          onCancel={() => setConfirmar(null)}
          onConfirm={confirmar.accion}
        />
      )}
    </>
  );
}
