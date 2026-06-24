// src/components/Autorizaciones.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Confirm from './Confirm';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

export default function Autorizaciones({ perfil }) {
  const [retiros, setRetiros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const [editId, setEditId] = useState(null);
  const [eMonto, setEMonto] = useState('');
  const [eMotivo, setEMotivo] = useState('retiro');
  const [eDesc, setEDesc] = useState('');
  const [confirmar, setConfirmar] = useState(null); // { mensaje, accion }

  const puedeAutorizar = perfil.puede_autorizar;

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data: r } = await supabase.from('retiros').select('*').eq('estado', 'pendiente').order('creado_en', { ascending: true });
    setRetiros(r || []); setCargando(false);
  }

  function abrirEdicion(r) {
    setEditId(r.id); setEMonto(String(r.monto)); setEMotivo(r.motivo || 'retiro'); setEDesc(r.descripcion || '');
  }

  function pedirGuardar(r) {
    const nuevoMonto = Number(eMonto) || 0;
    if (nuevoMonto <= 0) { setError('Ingresa un monto válido.'); return; }
    const cambios = [];
    if (nuevoMonto !== r.monto) cambios.push(`monto ${clp(r.monto)} → ${clp(nuevoMonto)}`);
    if (eMotivo !== r.motivo) cambios.push(`tipo → ${eMotivo === 'devolucion' ? 'Devolución' : 'Retiro'}`);
    if ((eDesc || '') !== (r.descripcion || '')) cambios.push('detalle');
    setConfirmar({
      mensaje: cambios.length ? `Vas a cambiar: ${cambios.join(', ')}.` : 'No hay cambios para guardar.',
      accion: () => guardarEdicion(r.id),
    });
  }

  async function guardarEdicion(id) {
    setBusy('e' + id); setError(null);
    const { error } = await supabase.from('retiros').update({
      monto: Number(eMonto) || 0, motivo: eMotivo, descripcion: eDesc || null,
    }).eq('id', id);
    setBusy(null); setConfirmar(null);
    if (error) return setError(error.message);
    setRetiros((prev) => prev.map((x) => x.id === id ? { ...x, monto: Number(eMonto) || 0, motivo: eMotivo, descripcion: eDesc || null } : x));
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
      </div>

      {error && <p className="jc-msg error" style={{ marginTop: 0 }}>{error}</p>}
      {!puedeAutorizar && <p className="jc-hint" style={{ marginTop: 0, marginBottom: 12 }}>Puedes ver y editar las solicitudes. Autorizar o rechazar es solo para autorizadores.</p>}

      <div className="jc-panel">
        <h2>Retiros y devoluciones por autorizar</h2>
        {retiros.length === 0 ? (
          <div className="jc-empty">No hay retiros pendientes.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Solicita</th><th>Tipo</th><th>Detalle</th><th className="num">Monto</th><th></th></tr></thead>
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
                            <option value="retiro">Retiro</option>
                            <option value="devolucion">Devolución</option>
                          </select>
                        </td>
                        <td><input className="jc-input" value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Detalle" /></td>
                        <td className="num"><input className="jc-input" type="number" value={eMonto} onChange={(e) => setEMonto(e.target.value)} /></td>
                        <td><div className="jc-acts">
                          <button className="jc-btn sm" onClick={() => setEditId(null)}>Cancelar</button>
                          <button className="jc-btn sm primary" disabled={busy === 'e' + r.id} onClick={() => pedirGuardar(r)}>Guardar</button>
                        </div></td>
                      </>
                    ) : (
                      <>
                        <td>{r.motivo === 'devolucion' ? 'Devolución' : 'Retiro'}</td>
                        <td>{r.descripcion || '—'}</td>
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
