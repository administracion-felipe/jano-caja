// src/components/CobroCaja.jsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseTimbre } from '../lib/parseTimbre';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
    .format(n || 0);

// medio de pago -> cuenta al cajón? (crédito no entra plata)
const MEDIOS = [
  { id: 'efectivo', label: 'Efectivo', cajon: true },
  { id: 'tarjeta', label: 'Tarjeta', cajon: true },
  { id: 'transferencia', label: 'Transferencia', cajon: true },
  { id: 'credito_cta_cte', label: 'Crédito cta. cte.', cajon: false },
];

export default function CobroCaja() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cobros, setCobros] = useState([]);

  // apertura
  const [cajero, setCajero] = useState('');
  const [fondo, setFondo] = useState('');

  // cobro en curso
  const [scan, setScan] = useState('');
  const [doc, setDoc] = useState(null);
  const [medio, setMedio] = useState(null);
  const [recibido, setRecibido] = useState('');
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  // cierre
  const [cerrando, setCerrando] = useState(false);
  const [arqueo, setArqueo] = useState('');

  const scanRef = useRef(null);

  useEffect(() => { cargarSesion(); }, []);
  useEffect(() => { if (sesion && doc === null) scanRef.current?.focus(); }, [sesion, doc]);

  async function cargarSesion() {
    setCargando(true);
    const { data } = await supabase
      .from('caja_sesiones').select('*').eq('estado', 'abierta')
      .order('abierta_en', { ascending: false }).limit(1).maybeSingle();
    setSesion(data ?? null);
    if (data) {
      const { data: cs } = await supabase
        .from('cobros').select('*').eq('sesion_id', data.id)
        .order('creado_en', { ascending: false });
      setCobros(cs ?? []);
    }
    setCargando(false);
  }

  async function abrirCaja() {
    if (!cajero.trim()) return setMsg({ tipo: 'error', txt: 'Ingresa el nombre del cajero.' });
    const { data, error } = await supabase.from('caja_sesiones')
      .insert({ cajero: cajero.trim(), fondo_inicial: Number(fondo) || 0 })
      .select().single();
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setSesion(data); setCobros([]); setMsg(null);
  }

  function leerTimbre() {
    if (!scan.trim()) return;
    try {
      const d = parseTimbre(scan);
      setDoc(d); setMedio(null); setRecibido(''); setScan(''); setMsg(null);
    } catch (e) {
      setMsg({ tipo: 'error', txt: e.message }); setScan('');
    }
  }

  async function confirmarCobro() {
    if (!doc || !medio) return;
    setOcupado(true);
    const vuelto = medio === 'efectivo' ? Math.max(0, (Number(recibido) || 0) - doc.total) : 0;

    // 1. el documento existe para la conciliación (aún sin confirmar por el SII)
    await supabase.from('documentos').upsert({
      tipo_dte: doc.tipoDte, folio: doc.folio, total: doc.total,
      rut_receptor: doc.rutReceptor, razon_receptor: doc.razonReceptor,
      fecha_emision: doc.fechaEmision, canal: 'mostrador',
      forma_pago: medio, estado_sii: 'pendiente', origen: 'timbre',
    }, { onConflict: 'tipo_dte,folio' });

    // 2. el cobro
    const { data, error } = await supabase.from('cobros').insert({
      sesion_id: sesion.id, tipo_dte: doc.tipoDte, folio: doc.folio,
      monto: doc.total, medio_pago: medio, vuelto, cajero: sesion.cajero,
    }).select().single();

    setOcupado(false);
    if (error) return setMsg({ tipo: 'error', txt: error.message });

    setCobros((prev) => [data, ...prev]);
    setDoc(null); setMedio(null); setRecibido('');
    setMsg({ tipo: 'ok', txt: `Cobro registrado · folio ${doc.folio}${vuelto ? ` · vuelto ${clp(vuelto)}` : ''}` });
  }

  const totales = MEDIOS.reduce((acc, m) => {
    acc[m.id] = cobros.filter((c) => c.medio_pago === m.id).reduce((s, c) => s + c.monto, 0);
    return acc;
  }, {});
  const efectivoEsperado = (sesion?.fondo_inicial || 0) + (totales.efectivo || 0);

  async function cerrarCaja() {
    const arq = Number(arqueo) || 0;
    const { error } = await supabase.from('caja_sesiones').update({
      cerrada_en: new Date().toISOString(),
      total_efectivo: totales.efectivo || 0,
      total_tarjeta: totales.tarjeta || 0,
      total_transferencia: totales.transferencia || 0,
      arqueo_efectivo: arq,
      diferencia: arq - efectivoEsperado,
      estado: 'cerrada',
    }).eq('id', sesion.id);
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setSesion(null); setCobros([]); setCerrando(false); setArqueo('');
    setCajero(''); setFondo('');
  }

  if (cargando) return <div style={s.wrap}><p style={s.muted}>Cargando…</p></div>;

  // ---- Apertura de caja ----
  if (!sesion) {
    return (
      <div style={s.wrap}>
        <h1 style={s.h1}>Abrir caja</h1>
        <label style={s.lbl}>Cajero</label>
        <input style={s.input} value={cajero} onChange={(e) => setCajero(e.target.value)} placeholder="Nombre" />
        <label style={s.lbl}>Fondo inicial</label>
        <input style={s.input} type="number" value={fondo} onChange={(e) => setFondo(e.target.value)} placeholder="0" />
        {msg && <p style={msg.tipo === 'error' ? s.err : s.ok}>{msg.txt}</p>}
        <button style={s.btnPrim} onClick={abrirCaja}>Abrir caja</button>
      </div>
    );
  }

  // ---- Pantalla de cobro ----
  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <div>
          <div style={s.muted}>Caja abierta · {sesion.cajero}</div>
          <div style={s.totRow}>
            <span>Efectivo {clp(totales.efectivo)}</span>
            <span>Tarjeta {clp(totales.tarjeta)}</span>
            <span>Transf. {clp(totales.transferencia)}</span>
          </div>
        </div>
        <button style={s.btnGhost} onClick={() => setCerrando(true)}>Cerrar caja</button>
      </div>

      {cerrando && (
        <div style={s.panel}>
          <div style={s.muted}>Efectivo esperado en cajón: <b>{clp(efectivoEsperado)}</b> (fondo {clp(sesion.fondo_inicial)} + ventas)</div>
          <label style={s.lbl}>Efectivo contado (arqueo)</label>
          <input style={s.input} type="number" value={arqueo} onChange={(e) => setArqueo(e.target.value)} placeholder="0" />
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setCerrando(false)}>Cancelar</button>
            <button style={s.btnPrim} onClick={cerrarCaja}>Confirmar cierre</button>
          </div>
        </div>
      )}

      {!doc ? (
        <div style={s.panel}>
          <label style={s.lbl}>Escanea el timbre (PDF417) y presiona Enter</label>
          <input
            ref={scanRef} style={s.input} value={scan} autoFocus
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && leerTimbre()}
            placeholder="Escaneo del timbre…"
          />
        </div>
      ) : (
        <div style={s.panel}>
          <div style={s.muted}>{doc.tipoNombre} · folio {doc.folio}</div>
          {doc.razonReceptor && <div style={s.recv}>{doc.razonReceptor}</div>}
          {doc.primerItem && <div style={s.muted}>{doc.primerItem}</div>}
          <div style={s.monto}>{clp(doc.total)}</div>

          <div style={s.medios}>
            {MEDIOS.map((m) => (
              <button key={m.id}
                style={medio === m.id ? s.medioOn : s.medio}
                onClick={() => setMedio(m.id)}>{m.label}</button>
            ))}
          </div>

          {medio === 'efectivo' && (
            <div style={s.efe}>
              <label style={s.lbl}>Monto recibido</label>
              <input style={s.input} type="number" value={recibido}
                onChange={(e) => setRecibido(e.target.value)} placeholder="0" />
              <div style={s.vuelto}>Vuelto: {clp(Math.max(0, (Number(recibido) || 0) - doc.total))}</div>
            </div>
          )}

          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => { setDoc(null); setMedio(null); }}>Cancelar</button>
            <button style={{ ...s.btnPrim, opacity: medio && !ocupado ? 1 : 0.5 }}
              disabled={!medio || ocupado} onClick={confirmarCobro}>
              {ocupado ? 'Registrando…' : 'Registrar cobro'}
            </button>
          </div>
        </div>
      )}

      {msg && <p style={msg.tipo === 'error' ? s.err : s.ok}>{msg.txt}</p>}

      {cobros.length > 0 && (
        <div style={s.lista}>
          {cobros.slice(0, 8).map((c) => (
            <div key={c.id} style={s.item}>
              <span>Folio {c.folio} · {MEDIOS.find((m) => m.id === c.medio_pago)?.label}</span>
              <span>{clp(c.monto)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const AZUL = '#3296FF';
const s = {
  wrap: { maxWidth: 460, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif', color: '#0B1220' },
  h1: { fontSize: 22, fontWeight: 600, margin: '4px 0 16px' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  totRow: { display: 'flex', gap: 12, fontSize: 13, marginTop: 4, flexWrap: 'wrap' },
  muted: { color: '#5B6573', fontSize: 14 },
  recv: { fontSize: 16, fontWeight: 600, margin: '2px 0' },
  monto: { fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', margin: '10px 0 16px' },
  panel: { border: '1px solid #E3E7ED', borderRadius: 12, padding: 16, marginBottom: 14 },
  lbl: { display: 'block', fontSize: 13, color: '#5B6573', margin: '8px 0 4px' },
  input: { width: '100%', padding: '12px 14px', fontSize: 16, border: '1px solid #CBD2DC', borderRadius: 8, boxSizing: 'border-box', outlineColor: AZUL },
  medios: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  medio: { padding: '14px', fontSize: 15, border: '1px solid #CBD2DC', borderRadius: 8, background: '#fff', cursor: 'pointer' },
  medioOn: { padding: '14px', fontSize: 15, border: `2px solid ${AZUL}`, borderRadius: 8, background: '#EAF3FF', color: '#0C447C', cursor: 'pointer', fontWeight: 600 },
  efe: { marginTop: 12 },
  vuelto: { marginTop: 8, fontSize: 18, fontWeight: 600 },
  btnRow: { display: 'flex', gap: 8, marginTop: 16 },
  btnPrim: { flex: 1, padding: '14px', fontSize: 16, fontWeight: 600, color: '#fff', background: AZUL, border: 'none', borderRadius: 8, cursor: 'pointer' },
  btnGhost: { padding: '12px 16px', fontSize: 15, color: '#0B1220', background: '#fff', border: '1px solid #CBD2DC', borderRadius: 8, cursor: 'pointer' },
  lista: { marginTop: 8 },
  item: { display: 'flex', justifyContent: 'space-between', padding: '10px 4px', borderBottom: '1px solid #EEF1F5', fontSize: 14 },
  err: { color: '#A32D2D', fontSize: 14, margin: '12px 0' },
  ok: { color: '#0F6E56', fontSize: 14, margin: '12px 0' },
};
