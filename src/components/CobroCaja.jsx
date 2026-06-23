// src/components/CobroCaja.jsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseTimbre } from '../lib/parseTimbre';
import logo from '../lib/logo';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const hora = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';

const MEDIOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'credito_cta_cte', label: 'Crédito' },
];
const medioLabel = (id) => MEDIOS.find((m) => m.id === id)?.label ?? id;

const CSS = `
.jc { --azul:#0840D0; --azul-700:#06309C; --azul-050:#EAF0FE;
  --bg:#F4F6FB; --surface:#fff; --border:#E4E9F2; --text:#0B1220; --muted:#6B7480;
  --ok:#0F7A53; --danger:#B3261E;
  min-height:100vh; background:var(--bg); color:var(--text);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; font-variant-numeric:tabular-nums; }
.jc * { box-sizing:border-box; }
.jc-wrap { max-width:1080px; margin:0 auto; padding:16px; }

.jc-bar { display:flex; align-items:center; justify-content:space-between; gap:12px;
  background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:12px 16px; margin-bottom:16px; }
.jc-brand { display:flex; align-items:center; gap:12px; }
.jc-brand img { width:38px; height:38px; display:block; }
.jc-brand .t b { font-size:17px; letter-spacing:-0.01em; }
.jc-brand .t span { display:block; font-size:12px; color:var(--muted); }
.jc-session { display:flex; align-items:center; gap:12px; flex-wrap:wrap; justify-content:flex-end; }
.jc-badge { font-size:12px; font-weight:600; padding:4px 10px; border-radius:999px; background:var(--azul-050); color:var(--azul); }
.jc-cajero { font-size:13px; color:var(--muted); }

.jc-cards { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:16px; }
.jc-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; }
.jc-card.hero { background:var(--azul); border-color:var(--azul); color:#fff; }
.jc-card .lbl { font-size:12px; color:var(--muted); margin-bottom:6px; }
.jc-card.hero .lbl { color:rgba(255,255,255,.85); }
.jc-card .val { font-size:22px; font-weight:700; letter-spacing:-0.02em; }
@media (max-width:880px){ .jc-cards{ grid-template-columns:repeat(2,1fr);} .jc-card.hero{ grid-column:span 2;} }

.jc-grid { display:grid; grid-template-columns:380px 1fr; gap:16px; align-items:start; }
@media (max-width:880px){ .jc-grid{ grid-template-columns:1fr; } }

.jc-panel { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; }
.jc-panel h2 { font-size:14px; margin:0 0 12px; font-weight:600; }
.jc-lbl { display:block; font-size:12px; color:var(--muted); margin:10px 0 4px; }
.jc-input { width:100%; padding:11px 12px; font-size:15px; border:1px solid var(--border); border-radius:9px;
  background:#fff; color:var(--text); outline:none; }
.jc-input:focus { border-color:var(--azul); box-shadow:0 0 0 3px var(--azul-050); }

.jc-doc .meta { font-size:12px; color:var(--muted); }
.jc-doc .cliente { font-size:15px; font-weight:600; margin:2px 0; }
.jc-doc .monto { font-size:34px; font-weight:800; letter-spacing:-0.02em; margin:8px 0 14px; }

.jc-medios { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.jc-medio { padding:12px; font-size:14px; border:1px solid var(--border); border-radius:9px; background:#fff; cursor:pointer; color:var(--text); }
.jc-medio:hover { border-color:var(--azul); }
.jc-medio.on { border:2px solid var(--azul); background:var(--azul-050); color:var(--azul-700); font-weight:600; }
.jc-vuelto { margin-top:10px; font-size:18px; font-weight:700; }

.jc-row { display:flex; gap:8px; margin-top:14px; }
.jc-btn { padding:12px 16px; font-size:15px; border-radius:9px; cursor:pointer; border:1px solid var(--border); background:#fff; color:var(--text); }
.jc-btn.primary { flex:1; background:var(--azul); border-color:var(--azul); color:#fff; font-weight:600; }
.jc-btn.primary:hover { background:var(--azul-700); }
.jc-btn:disabled { opacity:.5; cursor:default; }

.jc-table { width:100%; border-collapse:collapse; font-size:13px; }
.jc-table th { text-align:left; font-weight:600; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.03em; padding:8px 10px; border-bottom:1px solid var(--border); }
.jc-table td { padding:10px; border-bottom:1px solid #F0F2F7; }
.jc-table tr:last-child td { border-bottom:none; }
.jc-table .num { text-align:right; font-weight:600; }
.jc-empty { padding:28px 10px; text-align:center; color:var(--muted); font-size:13px; }
.jc-tag { font-size:11px; font-weight:600; padding:3px 8px; border-radius:999px; background:#EEF1F7; color:#46506A; }

.jc-msg { margin-top:12px; font-size:13px; }
.jc-msg.ok { color:var(--ok); } .jc-msg.error { color:var(--danger); }
.jc-open { max-width:420px; margin:8vh auto 0; }
`;

export default function CobroCaja({ perfil, onSalir }) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cobros, setCobros] = useState([]);

  const [fondo, setFondo] = useState('800000');

  const [scan, setScan] = useState('');
  const [doc, setDoc] = useState(null);
  const [medio, setMedio] = useState(null);
  const [recibido, setRecibido] = useState('');
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const [cerrando, setCerrando] = useState(false);
  const [arqueo, setArqueo] = useState('');

  const scanRef = useRef(null);

  useEffect(() => { cargarSesion(); }, []);
  useEffect(() => { if (sesion && !doc && !cerrando) scanRef.current?.focus(); }, [sesion, doc, cerrando]);

  async function cargarSesion() {
    setCargando(true);
    const { data } = await supabase.from('caja_sesiones').select('*')
      .eq('estado', 'abierta').order('abierta_en', { ascending: false }).limit(1).maybeSingle();
    setSesion(data ?? null);
    if (data) {
      const { data: cs } = await supabase.from('cobros').select('*')
        .eq('sesion_id', data.id).order('creado_en', { ascending: false });
      const { data: docs } = await supabase.from('documentos').select('tipo_dte,folio,razon_receptor');
      const map = {};
      (docs || []).forEach((d) => { map[`${d.tipo_dte}-${d.folio}`] = d.razon_receptor; });
      setCobros((cs || []).map((c) => ({ ...c, cliente: map[`${c.tipo_dte}-${c.folio}`] || null })));
    }
    setCargando(false);
  }

  async function abrirCaja() {
    const { data, error } = await supabase.from('caja_sesiones')
      .insert({ cajero: perfil.nombre, fondo_inicial: Number(fondo) || 0 }).select().single();
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setSesion(data); setCobros([]); setMsg(null);
  }

  function leerTimbre() {
    if (!scan.trim()) return;
    try {
      const d = parseTimbre(scan);
      setDoc(d); setMedio(null); setRecibido(''); setScan(''); setMsg(null);
    } catch (e) { setMsg({ tipo: 'error', txt: e.message }); setScan(''); }
  }

  async function confirmarCobro() {
    if (!doc || !medio) return;
    setOcupado(true);
    const vuelto = medio === 'efectivo' ? Math.max(0, (Number(recibido) || 0) - doc.total) : 0;
    await supabase.from('documentos').upsert({
      tipo_dte: doc.tipoDte, folio: doc.folio, total: doc.total,
      rut_receptor: doc.rutReceptor, razon_receptor: doc.razonReceptor,
      fecha_emision: doc.fechaEmision, canal: 'mostrador',
      forma_pago: medio, estado_sii: 'pendiente', origen: 'timbre',
    }, { onConflict: 'tipo_dte,folio' });
    const { data, error } = await supabase.from('cobros').insert({
      sesion_id: sesion.id, tipo_dte: doc.tipoDte, folio: doc.folio,
      monto: doc.total, medio_pago: medio, vuelto, cajero: perfil.nombre,
    }).select().single();
    setOcupado(false);
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setCobros((prev) => [{ ...data, cliente: doc.razonReceptor, descripcion: doc.primerItem }, ...prev]);
    setDoc(null); setMedio(null); setRecibido('');
    setMsg({ tipo: 'ok', txt: `Cobro registrado · folio ${doc.folio}${vuelto ? ` · vuelto ${clp(vuelto)}` : ''}` });
  }

  const tot = MEDIOS.reduce((a, m) => {
    a[m.id] = cobros.filter((c) => c.medio_pago === m.id).reduce((s, c) => s + c.monto, 0);
    return a;
  }, {});
  const totalDia = cobros.reduce((s, c) => s + c.monto, 0);
  const efectivoEsperado = (sesion?.fondo_inicial || 0) + (tot.efectivo || 0);

  async function cerrarCaja() {
    const arq = Number(arqueo) || 0;
    const { error } = await supabase.from('caja_sesiones').update({
      cerrada_en: new Date().toISOString(),
      total_efectivo: tot.efectivo || 0, total_tarjeta: tot.tarjeta || 0, total_transferencia: tot.transferencia || 0,
      arqueo_efectivo: arq, diferencia: arq - efectivoEsperado, estado: 'cerrada',
    }).eq('id', sesion.id);
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setSesion(null); setCobros([]); setCerrando(false); setArqueo(''); setFondo('800000');
  }

  const Bar = (
    <div className="jc-bar">
      <div className="jc-brand">
        <img src={logo} alt="JANO Repuestos" />
        <div className="t"><b>JANO Repuestos</b><span>Caja</span></div>
      </div>
      <div className="jc-session">
        {sesion && <span className="jc-badge">Caja abierta</span>}
        <span className="jc-cajero">{perfil.nombre}</span>
        {sesion && <button className="jc-btn" onClick={() => setCerrando(true)}>Cerrar caja</button>}
        <button className="jc-btn" onClick={onSalir}>Salir</button>
      </div>
    </div>
  );

  if (cargando) {
    return <div className="jc"><style>{CSS}</style><div className="jc-wrap">{Bar}<p className="jc-cajero">Cargando…</p></div></div>;
  }

  if (!sesion) {
    return (
      <div className="jc"><style>{CSS}</style><div className="jc-wrap">
        {Bar}
        <div className="jc-panel jc-open">
          <h2>Abrir caja</h2>
          <p className="jc-cajero">Cajero: <b>{perfil.nombre}</b></p>
          <label className="jc-lbl">Fondo inicial</label>
          <input className="jc-input" type="number" value={fondo} onChange={(e) => setFondo(e.target.value)} placeholder="800000" />
          {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}
          <div className="jc-row"><button className="jc-btn primary" onClick={abrirCaja}>Abrir caja</button></div>
        </div>
      </div></div>
    );
  }

  return (
    <div className="jc"><style>{CSS}</style><div className="jc-wrap">
      {Bar}

      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Total del día</div><div className="val">{clp(totalDia)}</div></div>
        <div className="jc-card"><div className="lbl">Documentos</div><div className="val">{cobros.length}</div></div>
        <div className="jc-card"><div className="lbl">Efectivo</div><div className="val">{clp(tot.efectivo)}</div></div>
        <div className="jc-card"><div className="lbl">Tarjeta</div><div className="val">{clp(tot.tarjeta)}</div></div>
        <div className="jc-card"><div className="lbl">Transferencia</div><div className="val">{clp(tot.transferencia)}</div></div>
      </div>

      {cerrando && (
        <div className="jc-panel" style={{ marginBottom: 16 }}>
          <h2>Cierre de caja</h2>
          <p className="jc-cajero">Efectivo esperado en cajón: <b>{clp(efectivoEsperado)}</b> (fondo {clp(sesion.fondo_inicial)} + efectivo del día)</p>
          <label className="jc-lbl">Efectivo contado (arqueo)</label>
          <input className="jc-input" type="number" value={arqueo} onChange={(e) => setArqueo(e.target.value)} placeholder="0" />
          <div className="jc-row">
            <button className="jc-btn" onClick={() => setCerrando(false)}>Cancelar</button>
            <button className="jc-btn primary" onClick={cerrarCaja}>Confirmar cierre</button>
          </div>
        </div>
      )}

      <div className="jc-grid">
        <div className="jc-panel">
          <h2>Nuevo cobro</h2>
          {!doc ? (
            <>
              <label className="jc-lbl">Escanea el timbre (PDF417) y presiona Enter</label>
              <input ref={scanRef} className="jc-input" value={scan} autoFocus
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && leerTimbre()}
                placeholder="Escaneo del timbre…" />
              {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}
            </>
          ) : (
            <div className="jc-doc">
              <div className="meta">{doc.tipoNombre} · folio {doc.folio}</div>
              {doc.razonReceptor && <div className="cliente">{doc.razonReceptor}</div>}
              {doc.primerItem && <div className="meta">{doc.primerItem}</div>}
              <div className="monto">{clp(doc.total)}</div>
              <div className="jc-medios">
                {MEDIOS.map((m) => (
                  <button key={m.id} className={`jc-medio${medio === m.id ? ' on' : ''}`} onClick={() => setMedio(m.id)}>{m.label}</button>
                ))}
              </div>
              {medio === 'efectivo' && (
                <div>
                  <label className="jc-lbl">Monto recibido</label>
                  <input className="jc-input" type="number" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder="0" />
                  <div className="jc-vuelto">Vuelto: {clp(Math.max(0, (Number(recibido) || 0) - doc.total))}</div>
                </div>
              )}
              <div className="jc-row">
                <button className="jc-btn" onClick={() => { setDoc(null); setMedio(null); }}>Cancelar</button>
                <button className="jc-btn primary" disabled={!medio || ocupado} onClick={confirmarCobro}>
                  {ocupado ? 'Registrando…' : 'Registrar cobro'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="jc-panel">
          <h2>Documentos del día</h2>
          {cobros.length === 0 ? (
            <div className="jc-empty">Aún no hay cobros en este turno.</div>
          ) : (
            <table className="jc-table">
              <thead>
                <tr><th>Hora</th><th>Folio</th><th>Cliente</th><th>Medio</th><th className="num">Monto</th></tr>
              </thead>
              <tbody>
                {cobros.map((c) => (
                  <tr key={c.id}>
                    <td>{hora(c.creado_en)}</td>
                    <td>{c.folio}</td>
                    <td>{c.cliente || '—'}</td>
                    <td><span className="jc-tag">{medioLabel(c.medio_pago)}</span></td>
                    <td className="num">{clp(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div></div>
  );
}
