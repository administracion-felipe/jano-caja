// src/components/Configuracion.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

function diasHabilesMes(d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth();
  const ult = new Date(y, m + 1, 0).getDate();
  let n = 0;
  for (let dia = 1; dia <= ult; dia++) { const wd = new Date(y, m, dia).getDay(); if (wd >= 1 && wd <= 5) n++; }
  return n;
}

export default function Configuracion({ perfil }) {
  const [meta, setMeta] = useState(0);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const puede = perfil.puede_autorizar;
  const diasHab = diasHabilesMes();

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data } = await supabase.from('configuracion').select('valor').eq('clave', 'meta_mensual').maybeSingle();
    const v = Number(data?.valor) || 0;
    setMeta(v); setInput(String(v)); setCargando(false);
  }

  async function guardar() {
    const v = Number(input) || 0;
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('configuracion').upsert({ clave: 'meta_mensual', valor: String(v), actualizado_en: new Date().toISOString() }, { onConflict: 'clave' });
    setBusy(false);
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setMeta(v); setMsg({ tipo: 'ok', txt: 'Meta mensual actualizada.' });
  }

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  const metaDiaria = meta > 0 && diasHab > 0 ? Math.round(meta / diasHab) : 0;

  return (
    <div className="jc-panel" style={{ maxWidth: 560 }}>
      <h2>Meta de ventas</h2>
      <p className="jc-hint" style={{ marginTop: 0 }}>La meta mensual se reparte entre los {diasHab} días hábiles del mes para calcular la meta diaria.</p>

      {puede ? (
        <>
          <label className="jc-lbl">Meta mensual</label>
          <input className="jc-input" type="number" value={input} onChange={(e) => setInput(e.target.value)} />
          <div className="jc-row">
            <button className="jc-btn primary" disabled={busy} onClick={guardar}>{busy ? 'Guardando…' : 'Guardar meta mensual'}</button>
          </div>
          {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}
        </>
      ) : (
        <p className="jc-cajero">Meta mensual: <b>{clp(meta)}</b></p>
      )}

      <div className="jc-cards" style={{ marginTop: 18 }}>
        <div className="jc-card"><div className="lbl">Meta mensual</div><div className="val">{clp(meta)}</div></div>
        <div className="jc-card"><div className="lbl">Días hábiles</div><div className="val">{diasHab}</div></div>
        <div className="jc-card"><div className="lbl">Meta diaria</div><div className="val">{clp(metaDiaria)}</div></div>
      </div>
    </div>
  );
}
