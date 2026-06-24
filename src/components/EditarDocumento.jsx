// src/components/EditarDocumento.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Confirm from './Confirm';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const MEDIOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'webpay', label: 'Webpay' },
  { id: 'credito_cta_cte', label: 'Crédito' },
];
const medioLabel = (id) => MEDIOS.find((m) => m.id === id)?.label ?? id;
const REQ = ['transferencia', 'webpay'];

export default function EditarDocumento({ grupo, onClose, onSaved }) {
  const [lineas, setLineas] = useState(grupo.lineas.map((l) => ({ id: l.id, medio: l.medio_pago, monto: l.monto, _del: false })));
  const [aMedio, setAMedio] = useState('efectivo');
  const [aMonto, setAMonto] = useState('');
  const [docTotal, setDocTotal] = useState(grupo.total);
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.from('documentos').select('total').eq('tipo_dte', grupo.tipo_dte).eq('folio', grupo.folio).maybeSingle()
      .then(({ data }) => { if (data) setDocTotal(data.total); });
  }, []);

  const suma = lineas.filter((l) => !l._del).reduce((s, l) => s + (Number(l.monto) || 0), 0);

  function setLinea(i, campo, val) { setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, [campo]: val } : l)); }
  function toggleDel(i) { setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, _del: !l._del } : l)); }
  function agregar() {
    const m = Number(aMonto) || 0;
    if (m <= 0) return setError('Ingresa un monto válido.');
    setLineas((prev) => [...prev, { id: null, medio: aMedio, monto: m, _del: false }]);
    setAMonto(''); setError(null);
  }

  async function guardar() {
    setBusy(true); setError(null);
    try {
      const aEliminar = lineas.filter((l) => l.id && l._del).map((l) => l.id);
      if (aEliminar.length) {
        const { error } = await supabase.from('cobros').delete().in('id', aEliminar);
        if (error) throw error;
      }
      for (const l of lineas.filter((l) => l.id && !l._del)) {
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

  const rowStyle = { display: 'flex', gap: 8, alignItems: 'center', background: 'var(--azul-050)', borderRadius: 8, padding: '8px 10px' };

  return (
    <div className="jc-modal-bg" onClick={onClose}>
      <div className="jc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Editar formas de pago · Folio {grupo.folio}</h3>
        <p>
          Total documento: <b>{clp(docTotal)}</b> · Suma actual: <b>{clp(suma)}</b>
          {suma !== docTotal && <span style={{ color: '#B3261E' }}> · diferencia {clp(suma - docTotal)}</span>}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
          {lineas.map((l, i) => (
            <div key={i} style={{ ...rowStyle, opacity: l._del ? 0.5 : 1 }}>
              {l._del ? (
                <>
                  <span style={{ flex: 1, textDecoration: 'line-through' }}>{medioLabel(l.medio)} · {clp(l.monto)}</span>
                  <button className="jc-btn sm" onClick={() => toggleDel(i)}>Deshacer</button>
                </>
              ) : (
                <>
                  <select className="jc-select" style={{ maxWidth: 150 }} value={l.medio} onChange={(e) => setLinea(i, 'medio', e.target.value)}>
                    {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <input className="jc-input" style={{ maxWidth: 120 }} type="number" value={l.monto} onChange={(e) => setLinea(i, 'monto', e.target.value)} />
                  <button className="jc-x" title="Eliminar" onClick={() => toggleDel(i)}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>

        <label className="jc-lbl">Agregar forma de pago</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="jc-select" style={{ maxWidth: 150 }} value={aMedio} onChange={(e) => setAMedio(e.target.value)}>
            {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <input className="jc-input" type="number" value={aMonto} onChange={(e) => setAMonto(e.target.value)} placeholder="Monto" />
          <button className="jc-btn sm" onClick={agregar}>Agregar</button>
        </div>

        {error && <p className="jc-msg error">{error}</p>}

        <div className="jc-row">
          <button className="jc-btn" onClick={onClose}>Cancelar</button>
          <button className="jc-btn primary" onClick={() => setConfirmar(true)}>Guardar cambios</button>
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
      </div>
    </div>
  );
}
