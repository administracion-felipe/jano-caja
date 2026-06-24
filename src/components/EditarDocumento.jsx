// src/components/EditarDocumento.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MEDIOS, medioLabel, REQUIERE_CONFIRMACION as REQ } from '../lib/medios';
import { fmtMiles, soloDigitos } from '../lib/num';
import Confirm from './Confirm';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

export default function EditarDocumento({ grupo, onClose, onSaved }) {
  const [lineas, setLineas] = useState(grupo.lineas.map((l) => ({ id: l.id, medio: l.medio_pago, monto: l.monto, _del: false })));
  const [aMedio, setAMedio] = useState('efectivo');
  const [aMonto, setAMonto] = useState('');
  const [docTotal, setDocTotal] = useState(grupo.total);
  const [confirmar, setConfirmar] = useState(false);
  const [confirmarDel, setConfirmarDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.from('documentos').select('total').eq('tipo_dte', grupo.tipo_dte).eq('folio', grupo.folio).maybeSingle()
      .then(({ data }) => { if (data) setDocTotal(data.total); });
  }, []);

  const suma = lineas.filter((l) => !l._del).reduce((s, l) => s + (Number(l.monto) || 0), 0);
  const diferencia = suma - docTotal;
  const balanceado = Math.abs(diferencia) < 1;          // la suma debe igualar el total del documento
  const sobra = Math.abs(suma) > Math.abs(docTotal);
  const hayLineas = lineas.filter((l) => !l._del).length > 0;
  const puedeGuardar = balanceado && hayLineas;
  const faltaAsignar = Math.max(0, docTotal - suma);

  function setLinea(i, campo, val) { setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, [campo]: val } : l)); }
  function toggleDel(i) { setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, _del: !l._del } : l)); }
  function agregar() {
    const m = Number(aMonto) || 0;
    if (m <= 0) return setError('Ingresa un monto válido.');
    setLineas((prev) => [...prev, { id: null, medio: aMedio, monto: m, _del: false }]);
    setAMonto(''); setError(null);
  }

  async function guardar() {
    if (!puedeGuardar) { setConfirmar(false); setError('La suma de las formas de pago debe ser igual al total del documento.'); return; }
    setBusy(true); setError(null);
    try {
      const aEliminar = lineas.filter((l) => l.id && l._del).map((l) => l.id);
      if (aEliminar.length) {
        await supabase.from('transferencias_recibidas').update({ cobro_id: null, estado: 'disponible' }).in('cobro_id', aEliminar);
        const { error } = await supabase.from('cobros').delete().in('id', aEliminar);
        if (error) throw error;
      }
      for (const l of lineas.filter((l) => l.id && !l._del && l.medio !== 'saldo_favor')) {
        const { error } = await supabase.from('cobros').update({
          medio_pago: l.medio, monto: Number(l.monto) || 0,
          estado_pago: REQ.includes(l.medio) ? 'por_confirmar' : 'confirmado',
        }).eq('id', l.id);
        if (error) throw error;
      }
      const nuevas = lineas.filter((l) => !l.id && !l._del);
      if (nuevas.length) {
        const base = grupo.lineas[0];
        const filas = nuevas.map((l) => ({
          sesion_id: base.sesion_id, tipo_dte: grupo.tipo_dte, folio: grupo.folio,
          monto: Number(l.monto) || 0, medio_pago: l.medio, vuelto: 0, cajero: base.cajero,
          estado_pago: REQ.includes(l.medio) ? 'por_confirmar' : 'confirmado',
        }));
        const { error } = await supabase.from('cobros').insert(filas);
        if (error) throw error;
      }
      setBusy(false); setConfirmar(false); onSaved();
    } catch (e) { setBusy(false); setConfirmar(false); setError(e.message); }
  }

  async function eliminarDocumento() {
    setBusy(true); setError(null);
    try {
      const ids = grupo.lineas.map((l) => l.id).filter(Boolean);
      if (ids.length) {
        await supabase.from('transferencias_recibidas').update({ cobro_id: null, estado: 'disponible' }).in('cobro_id', ids);
        const { error } = await supabase.from('cobros').delete().in('id', ids);
        if (error) throw error;
      }
      const { error: e2 } = await supabase.from('documentos').delete().eq('tipo_dte', grupo.tipo_dte).eq('folio', grupo.folio);
      if (e2) throw e2;
      setBusy(false); setConfirmarDel(false); onSaved();
    } catch (e) { setBusy(false); setConfirmarDel(false); setError(e.message); }
  }

  const rowStyle = { display: 'flex', gap: 8, alignItems: 'center', background: 'var(--azul-050)', borderRadius: 8, padding: '8px 10px' };

  return (
    <div className="jc-modal-bg" onClick={onClose}>
      <div className="jc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Editar formas de pago · Folio {grupo.folio}</h3>
        <p style={{ marginBottom: 6 }}>Total del documento: <b>{clp(docTotal)}</b> <span className="jc-sub" style={{ display: 'inline' }}>(fijo, no se puede cambiar)</span></p>

        <div className={`jc-cover ${balanceado ? 'ok' : sobra ? 'over' : 'falta'}`}>
          <div className="jc-cover-top">
            <span className="jc-cover-lbl">{balanceado ? 'Asignación completa' : sobra ? 'Asignado de más' : 'Falta por asignar'}</span>
            <b className="jc-cover-val">{balanceado ? '✓ Calza' : clp(Math.abs(diferencia))}</b>
          </div>
          <div className="jc-cover-bar">
            <div style={{ width: `${Math.abs(docTotal) > 0 ? Math.min(100, (Math.abs(suma) / Math.abs(docTotal)) * 100) : 0}%` }} />
          </div>
          <div className="jc-cover-sub">Asignado {clp(suma)} de {clp(docTotal)}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
          {lineas.map((l, i) => (
            <div key={i} style={{ ...rowStyle, opacity: l._del ? 0.5 : 1 }}>
              {l.medio === 'saldo_favor' ? (
                <span style={{ flex: 1 }}>Saldo a favor · {clp(l.monto)} <span style={{ color: 'var(--muted)', fontSize: 12 }}>(no editable aquí)</span></span>
              ) : l._del ? (
                <>
                  <span style={{ flex: 1, textDecoration: 'line-through' }}>{medioLabel(l.medio)} · {clp(l.monto)}</span>
                  <button className="jc-btn sm" onClick={() => toggleDel(i)}>Deshacer</button>
                </>
              ) : (
                <>
                  <select className="jc-select" style={{ maxWidth: 150 }} value={l.medio} onChange={(e) => setLinea(i, 'medio', e.target.value)}>
                    {MEDIOS.filter((m) => m.id !== 'saldo_favor').map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <input className="jc-input" style={{ maxWidth: 120 }} type="text" inputMode="numeric" value={fmtMiles(l.monto)} onChange={(e) => setLinea(i, 'monto', soloDigitos(e.target.value))} />
                  <button className="jc-x" title="Eliminar" onClick={() => toggleDel(i)}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>

        <label className="jc-lbl">Agregar forma de pago</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="jc-select" style={{ maxWidth: 150 }} value={aMedio} onChange={(e) => setAMedio(e.target.value)}>
            {MEDIOS.filter((m) => m.id !== 'saldo_favor').map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(aMonto)} onChange={(e) => setAMonto(soloDigitos(e.target.value))} placeholder={faltaAsignar > 0 ? fmtMiles(faltaAsignar) : 'Monto'} />
          <button className="jc-btn sm" onClick={agregar}>Agregar</button>
        </div>

        {error && <p className="jc-msg error">{error}</p>}

        <div className="jc-row">
          <button className="jc-btn" onClick={onClose}>Cancelar</button>
          <button className="jc-btn primary" disabled={!puedeGuardar} onClick={() => setConfirmar(true)}>Guardar cambios</button>
        </div>
        {!puedeGuardar && (
          <p className="jc-hint warn" style={{ marginTop: 6 }}>
            {hayLineas ? 'La suma de las formas de pago debe ser igual al total del documento para poder guardar.' : 'El documento debe tener al menos una forma de pago.'}
          </p>
        )}

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12 }}>
          <button className="jc-btn danger" style={{ width: '100%' }} onClick={() => setConfirmarDel(true)}>Eliminar documento completo</button>
          <p className="jc-hint" style={{ marginTop: 6 }}>Para folios ingresados por error (ej. de otro día). Borra todas sus formas de pago y el documento.</p>
        </div>

        {confirmar && (
          <Confirm
            titulo="Confirmar cambios"
            mensaje={`Vas a guardar las formas de pago del folio ${grupo.folio} (suma ${clp(suma)}).`}
            busy={busy}
            onCancel={() => setConfirmar(false)}
            onConfirm={guardar}
          />
        )}

        {confirmarDel && (
          <Confirm
            titulo="Eliminar documento"
            mensaje={`Vas a eliminar por completo el folio ${grupo.folio} y todas sus formas de pago. Esta acción no se puede deshacer.`}
            busy={busy}
            onCancel={() => setConfirmarDel(false)}
            onConfirm={eliminarDocumento}
          />
        )}
      </div>
    </div>
  );
}
