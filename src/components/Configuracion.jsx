// src/components/Configuracion.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtMiles, soloDigitos } from '../lib/num';

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
  const [metaInput, setMetaInput] = useState('');
  const [diasInput, setDiasInput] = useState('');
  const [fondoInput, setFondoInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const puede = perfil.puede_autorizar;

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data } = await supabase.from('configuracion').select('clave,valor').in('clave', ['meta_mensual', 'dias_habiles', 'fondo_base', 'apps_script_url']);
    const map = {};
    (data || []).forEach((r) => { map[r.clave] = r.valor; });
    setMetaInput(map.meta_mensual || '0');
    setDiasInput(map.dias_habiles || String(diasHabilesMes()));
    setFondoInput(map.fondo_base || '800000');
    setUrlInput(map.apps_script_url || '');
    setCargando(false);
  }

  async function guardar() {
    const meta = Number(metaInput) || 0;
    const dias = Number(diasInput) || 0;
    const fondo = Number(fondoInput) || 0;
    if (dias <= 0) return setMsg({ tipo: 'error', txt: 'Los días hábiles deben ser mayores a 0.' });
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('configuracion').upsert([
      { clave: 'meta_mensual', valor: String(meta), actualizado_en: new Date().toISOString() },
      { clave: 'dias_habiles', valor: String(dias), actualizado_en: new Date().toISOString() },
      { clave: 'fondo_base', valor: String(fondo), actualizado_en: new Date().toISOString() },
      { clave: 'apps_script_url', valor: urlInput.trim(), actualizado_en: new Date().toISOString() },
    ], { onConflict: 'clave' });
    setBusy(false);
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setMsg({ tipo: 'ok', txt: 'Configuración guardada.' });
  }

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  const meta = Number(metaInput) || 0;
  const dias = Number(diasInput) || 0;
  const metaDiaria = meta > 0 && dias > 0 ? Math.round(meta / dias) : 0;
  const statVal = { fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, wordBreak: 'break-word' };

  return (
    <div className="jc-panel" style={{ maxWidth: 720 }}>
      <h2>Meta de ventas</h2>
      <p className="jc-hint" style={{ marginTop: 0 }}>La meta mensual se reparte entre los días hábiles para la meta diaria. El fondo base es el efectivo con que debe iniciar cada día.</p>

      {puede ? (
        <>
          <label className="jc-lbl">Meta mensual</label>
          <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(metaInput)} onChange={(e) => setMetaInput(soloDigitos(e.target.value))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label className="jc-lbl">Días hábiles del mes</label>
              <input className="jc-input" type="number" value={diasInput} onChange={(e) => setDiasInput(e.target.value)} />
            </div>
            <div>
              <label className="jc-lbl">Fondo base de caja</label>
              <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(fondoInput)} onChange={(e) => setFondoInput(soloDigitos(e.target.value))} />
            </div>
          </div>
          <label className="jc-lbl" style={{ marginTop: 12 }}>URL del revisor de correo (Apps Script)</label>
          <input className="jc-input" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec?token=…" />
          <p className="jc-hint" style={{ marginTop: 4 }}>Se usa en Pagos, en el botón "Revisar correo ahora".</p>
          <div className="jc-row">
            <button className="jc-btn primary" disabled={busy} onClick={guardar}>{busy ? 'Guardando…' : 'Guardar configuración'}</button>
          </div>
          {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}
        </>
      ) : (
        <p className="jc-cajero">Meta mensual: <b>{clp(meta)}</b> · Días hábiles: <b>{dias}</b> · Fondo base: <b>{clp(Number(fondoInput) || 0)}</b></p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginTop: 18 }}>
        <div className="jc-card"><div className="lbl">Meta mensual</div><div style={statVal}>{clp(meta)}</div></div>
        <div className="jc-card"><div className="lbl">Días hábiles</div><div style={statVal}>{dias}</div></div>
        <div className="jc-card"><div className="lbl">Meta diaria</div><div style={statVal}>{clp(metaDiaria)}</div></div>
        <div className="jc-card"><div className="lbl">Fondo base</div><div style={statVal}>{clp(Number(fondoInput) || 0)}</div></div>
      </div>
    </div>
  );
}
