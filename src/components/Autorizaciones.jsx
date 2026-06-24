// src/components/Autorizaciones.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Confirm from './Confirm';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

export default function Autorizaciones({ perfil }) {
  const [retiros, setRetiros] = useState([]);
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
    const { data: r } = await supabase.from('retiros').select('*').eq('estado', 'pendiente').order('creado_en', { ascending: true });
    const { data: t } = await supabase.from('tipos_retiro').select('*').order('nombre');
    setRetiros(r || []); setTipos(t || []); setCargando(false);
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
    setConfirmar({
      mensaje: cambios.length ? `Vas a cambiar: ${cambios.join(', ')}.` : 'No hay cambios para guardar.',
      accion: () => guardarEdicion(r.id),
    });
  }

  async function guardarEdicion(id) {
    setBusy('e' + id); setError(null);
    const { error } = await supabase.from('retiros').update({
      monto: Number(eMonto) || 0, motivo: eMotivo, descripcion: eDesc || null, nota: eNota || null,
    }).eq('id', id);
    setBusy(null); setConfirmar(null);
    if (error) return setError(error.message);
    setRetiros((prev) => prev.map((x) => x.id === id ? { ...x, monto: Number(eMonto) || 0, motivo: eMotivo, descripcion: eDesc || null, nota: eNota || null } : x));
    setEditId(null);
  }

  async function resolver(id, estado) {
    setBusy('r' + id); setError(null);
    const { error } = await supabase.from('retiros').update({
      estado, autorizado_por: perfil.nombre, autorizador_id: perfil.id, resuelto_en: new Date().toISOString(),
    }).eq('id', id);
    setBusy(null);
    if (error) return setError(error.message);
    setRetiros((prev) => prev.filter((x) => x.id !== id));
  }

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  return (
    <>
      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Retiros por autorizar</div><div className="val">{retiros.length}</div></div>
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
        <h2>Retiros y devoluciones por autorizar</h2>
        {retiros.length === 0 ? (
          <div className="jc-empty">No hay retiros pendientes.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Solicita</th><th>Tipo</th><th>Detalle / Nota</th><th className="num">Monto</th><th></th></tr></thead>
            <tbody>
              {retiros.map((r) => {
                const editando = editId === r.id;
                return (
                  <tr key={r.id}>
                    <td>{r.solicitado_por || '—'}</td>
                    {editando ? (
                      <>
                        <td>
                          <select className="jc-select" value={eMotivo} onChange={(e) => setEMotivo(e.target.value)}>
                            <option value="">Elegir tipo…</option>
                            {tiposActivos.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                            {eMotivo && !tiposActivos.some((t) => t.nombre === eMotivo) && <option value={eMotivo}>{eMotivo}</option>}
                          </select>
                        </td>
                        <td>
                          <input className="jc-input" value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Detalle" style={{ marginBottom: 6 }} />
                          <input className="jc-input" value={eNota} onChange={(e) => setENota(e.target.value)} placeholder="Nota" />
                        </td>
                        <td className="num"><input className="jc-input" type="number" value={eMonto} onChange={(e) => setEMonto(e.target.value)} /></td>
                        <td><div className="jc-acts">
                          <button className="jc-btn sm" onClick={() => setEditId(null)}>Cancelar</button>
                          <button className="jc-btn sm primary" disabled={busy === 'e' + r.id} onClick={() => pedirGuardar(r)}>Guardar</button>
                        </div></td>
                      </>
                    ) : (
                      <>
                        <td>{r.motivo || '—'}</td>
                        <td>{r.descripcion || '—'}{r.nota && <span className="jc-sub">{r.nota}</span>}</td>
                        <td className="num">{clp(r.monto)}</td>
                        <td><div className="jc-acts">
                          <button className="jc-btn sm" onClick={() => abrirEdicion(r)}>Editar</button>
                          {puedeAutorizar && <button className="jc-btn sm danger" disabled={busy === 'r' + r.id} onClick={() => resolver(r.id, 'rechazado')}>Rechazar</button>}
                          {puedeAutorizar && <button className="jc-btn sm ok" disabled={busy === 'r' + r.id} onClick={() => resolver(r.id, 'autorizado')}>Autorizar</button>}
                        </div></td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
