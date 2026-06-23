// src/components/CobroCaja.jsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseTimbre } from '../lib/parseTimbre';

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

export default function CobroCaja({ perfil }) {
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
      const { data: docs } = await supabase.from('documentos').select('tipo_dte,folio,razon_receptor,primer_item');
      const map = {};
      (docs || []).forEach((d) => { map[`${d.tipo_dte}-${d.folio}`] = d; });
      setCobros((cs || []).map((c) => {
        const d = map[`${c.tipo_dte}-${c.folio}`] || {};
        return { ...c, cliente: d.razon_receptor || null, descripcion: d.primer_item || null };
      }));
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
      fecha_emision: doc.fechaEmision, primer_item: doc.primerItem, canal: 'mostrador',
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

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  if (!sesion) {
    return (
      <div className="jc-panel jc-open">
        <h2>Abrir caja</h2>
        <p className="jc-cajero">Cajero: <b>{perfil.nombre}</b></p>
        <label className="jc-lbl">Fondo inicial</label>
        <input className="jc-input" type="number" value={fondo} onChange={(e) => setFondo(e.target.value)} placeholder="800000" />
        {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}
        <div className="jc-row"><button className="jc-btn primary" onClick={abrirCaja}>Abrir caja</button></div>
      </div>
    );
  }

  return (
    <>
      <div className="jc-substrip">
        <span className="jc-badge">Caja abierta · {perfil.nombre}</span>
        <button className="jc-btn" onClick={() => setCerrando(true)}>Cerrar caja</button>
      </div>

      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Total del día</div><div className="val">{clp(totalDia)}</div></div>
        <div className="jc-card"><div className="lbl">Documentos</div><div className="val">{cobros.length}</div></div>
        <div className="jc-card"><div className="lbl">Efectivo</div><div className="val">{clp(tot.efectivo)}</div></div>
        <div className="jc-card"><div className="lbl">Tarjeta</div><div className="val">{clp(tot.tarjeta)}</div></div>
        <div className="jc-card"><div className="lbl">Transferencia</div><div className="val">{clp(tot.transferencia)}</div></div>
        <div className="jc-card"><div className="lbl">Crédito</div><div className="val">{clp(tot.credito_cta_cte)}</div></div>
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
                    <td>{c.cliente || '—'}{c.descripcion && <span className="jc-sub">{c.descripcion}</span>}</td>
                    <td><span className="jc-tag">{medioLabel(c.medio_pago)}</span></td>
                    <td className="num">{clp(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
