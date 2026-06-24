// src/components/CobroCaja.jsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseTimbre } from '../lib/parseTimbre';
import EditarDocumento from './EditarDocumento';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const hora = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';

const MEDIOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'webpay', label: 'Webpay' },
  { id: 'credito_cta_cte', label: 'Crédito' },
];
const medioLabel = (id) => MEDIOS.find((m) => m.id === id)?.label ?? id;
const REQUIERE_CONFIRMACION = ['transferencia', 'webpay'];

const EST_RET = { pendiente: { t: 'Pendiente', c: 'warn' }, autorizado: { t: 'Autorizado', c: 'ok' }, rechazado: { t: 'Rechazado', c: 'bad' } };

export default function CobroCaja({ perfil }) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cobros, setCobros] = useState([]);
  const [retiros, setRetiros] = useState([]);

  const [fondo, setFondo] = useState('800000');
  const [fondoNota, setFondoNota] = useState(null);

  const [scan, setScan] = useState('');
  const [doc, setDoc] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [lMedio, setLMedio] = useState('efectivo');
  const [lMonto, setLMonto] = useState('');
  const [lRecibido, setLRecibido] = useState('');
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const [cerrando, setCerrando] = useState(false);
  const [arqueo, setArqueo] = useState('');
  const [editandoDoc, setEditandoDoc] = useState(null);

  const [pidiendo, setPidiendo] = useState(false);
  const [montoRet, setMontoRet] = useState('');
  const [motivoRet, setMotivoRet] = useState('retiro');
  const [descRet, setDescRet] = useState('');
  const [ocupadoRet, setOcupadoRet] = useState(false);
  const [msgRet, setMsgRet] = useState(null);

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
      const { data: rs } = await supabase.from('retiros').select('*')
        .eq('sesion_id', data.id).order('creado_en', { ascending: false });
      setRetiros(rs || []);
    } else {
      await sugerirFondo();
    }
    setCargando(false);
  }

  async function sugerirFondo() {
    const { data: ult } = await supabase.from('caja_sesiones').select('*')
      .eq('estado', 'cerrada').order('cerrada_en', { ascending: false }).limit(1).maybeSingle();
    if (!ult) { setFondo('800000'); setFondoNota(null); return; }
    const { data: rs } = await supabase.from('retiros').select('monto,estado')
      .eq('sesion_id', ult.id).eq('estado', 'autorizado');
    const usado = (rs || []).reduce((s, x) => s + x.monto, 0);
    const saldo = Math.max(0, (ult.fondo_inicial || 0) - usado);
    setFondo(String(saldo));
    setFondoNota(usado > 0
      ? `Saldo traspasado del cierre anterior: ${clp(ult.fondo_inicial)} − ${clp(usado)} en retiros. Ajusta si repusiste el fondo.`
      : 'Saldo traspasado del cierre anterior. Ajusta si repusiste el fondo.');
  }

  async function abrirCaja() {
    const { data, error } = await supabase.from('caja_sesiones')
      .insert({ cajero: perfil.nombre, fondo_inicial: Number(fondo) || 0 }).select().single();
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setSesion(data); setCobros([]); setRetiros([]); setMsg(null);
  }

  function leerTimbre() {
    if (!scan.trim()) return;
    try {
      const d = parseTimbre(scan);
      setDoc(d); setLineas([]); setLMedio('efectivo'); setLMonto(String(d.total)); setLRecibido(''); setScan(''); setMsg(null);
    } catch (e) { setMsg({ tipo: 'error', txt: e.message }); setScan(''); }
  }

  const sumaLineas = lineas.reduce((s, l) => s + l.monto, 0);
  const restante = doc ? doc.total - sumaLineas : 0;

  function agregarLinea() {
    const m = Number(lMonto) || 0;
    if (m <= 0) return setMsg({ tipo: 'error', txt: 'Ingresa un monto válido.' });
    if (m > restante) return setMsg({ tipo: 'error', txt: `El monto supera lo que falta (${clp(restante)}).` });
    const vuelto = lMedio === 'efectivo' ? Math.max(0, (Number(lRecibido) || m) - m) : 0;
    const nuevas = [...lineas, { id: 't' + Date.now(), medio: lMedio, monto: m, vuelto }];
    setLineas(nuevas);
    const nuevoRestante = doc.total - nuevas.reduce((s, l) => s + l.monto, 0);
    setLMonto(nuevoRestante > 0 ? String(nuevoRestante) : '');
    setLRecibido(''); setMsg(null);
  }

  function quitarLinea(id) {
    const nuevas = lineas.filter((l) => l.id !== id);
    setLineas(nuevas);
    setLMonto(String(doc.total - nuevas.reduce((s, l) => s + l.monto, 0)));
  }

  async function registrarCobro() {
    if (!doc || lineas.length === 0 || restante !== 0) return;
    setOcupado(true);
    await supabase.from('documentos').upsert({
      tipo_dte: doc.tipoDte, folio: doc.folio, total: doc.total,
      rut_receptor: doc.rutReceptor, razon_receptor: doc.razonReceptor,
      fecha_emision: doc.fechaEmision, primer_item: doc.primerItem, canal: 'mostrador',
      forma_pago: lineas.length > 1 ? 'mixto' : lineas[0].medio, estado_sii: 'pendiente', origen: 'timbre',
    }, { onConflict: 'tipo_dte,folio' });
    const filas = lineas.map((l) => ({
      sesion_id: sesion.id, tipo_dte: doc.tipoDte, folio: doc.folio,
      monto: l.monto, medio_pago: l.medio, vuelto: l.vuelto || 0, cajero: perfil.nombre,
      estado_pago: REQUIERE_CONFIRMACION.includes(l.medio) ? 'por_confirmar' : 'confirmado',
    }));
    const { data, error } = await supabase.from('cobros').insert(filas).select();
    setOcupado(false);
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    const conMeta = (data || []).map((c) => ({ ...c, cliente: doc.razonReceptor, descripcion: doc.primerItem }));
    setCobros((prev) => [...conMeta, ...prev]);
    const hayPorConfirmar = filas.some((f) => f.estado_pago === 'por_confirmar');
    setDoc(null); setLineas([]);
    setMsg({ tipo: 'ok', txt: `Documento ${doc.folio} cobrado en ${filas.length} forma(s) de pago${hayPorConfirmar ? ' · hay pagos por confirmar' : ''}.` });
  }

  async function solicitarRetiro() {
    const m = Number(montoRet) || 0;
    if (m <= 0) return setMsgRet({ tipo: 'error', txt: 'Ingresa un monto válido.' });
    setOcupadoRet(true);
    const { data, error } = await supabase.from('retiros').insert({
      sesion_id: sesion.id, monto: m, motivo: motivoRet, descripcion: descRet || null, solicitado_por: perfil.nombre,
    }).select().single();
    setOcupadoRet(false);
    if (error) return setMsgRet({ tipo: 'error', txt: error.message });
    setRetiros((prev) => [data, ...prev]);
    setMontoRet(''); setDescRet(''); setMotivoRet('retiro'); setPidiendo(false);
    setMsgRet({ tipo: 'ok', txt: 'Solicitud enviada a autorización.' });
  }

  const tot = MEDIOS.reduce((a, m) => {
    a[m.id] = cobros.filter((c) => c.medio_pago === m.id).reduce((s, c) => s + c.monto, 0);
    return a;
  }, {});
  const totalDia = cobros.reduce((s, c) => s + c.monto, 0);
  const retirosAutorizados = retiros.filter((r) => r.estado === 'autorizado').reduce((s, r) => s + r.monto, 0);
  const retirosPendientes = retiros.filter((r) => r.estado === 'pendiente').length;
  const efectivoEsperado = (sesion?.fondo_inicial || 0) + (tot.efectivo || 0) - retirosAutorizados;

  // Agrupar los cobros del día por documento (folio)
  const grupos = {};
  cobros.forEach((c) => {
    const k = `${c.tipo_dte}-${c.folio}`;
    if (!grupos[k]) grupos[k] = { tipo_dte: c.tipo_dte, folio: c.folio, cliente: c.cliente, descripcion: c.descripcion, lineas: [], total: 0 };
    grupos[k].lineas.push(c);
    grupos[k].total += c.monto;
  });
  const docsDia = Object.values(grupos);

  async function cerrarCaja() {
    const arq = Number(arqueo) || 0;
    const { error } = await supabase.from('caja_sesiones').update({
      cerrada_en: new Date().toISOString(),
      total_efectivo: tot.efectivo || 0, total_tarjeta: tot.tarjeta || 0, total_transferencia: tot.transferencia || 0,
      arqueo_efectivo: arq, diferencia: arq - efectivoEsperado, estado: 'cerrada',
    }).eq('id', sesion.id);
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setSesion(null); setCobros([]); setRetiros([]); setCerrando(false); setArqueo('');
    await sugerirFondo();
  }

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  if (!sesion) {
    return (
      <div className="jc-panel jc-open">
        <h2>Abrir caja</h2>
        <p className="jc-cajero">Cajero: <b>{perfil.nombre}</b></p>
        <label className="jc-lbl">Fondo inicial</label>
        <input className="jc-input" type="number" value={fondo} onChange={(e) => setFondo(e.target.value)} placeholder="800000" />
        {fondoNota && <p className="jc-hint">{fondoNota}</p>}
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
        <div className="jc-card"><div className="lbl">Documentos</div><div className="val">{docsDia.length}</div></div>
        <div className="jc-card"><div className="lbl">Efectivo</div><div className="val">{clp(tot.efectivo)}</div></div>
        <div className="jc-card"><div className="lbl">Tarjeta</div><div className="val">{clp(tot.tarjeta)}</div></div>
        <div className="jc-card"><div className="lbl">Transferencia</div><div className="val">{clp(tot.transferencia)}</div></div>
        <div className="jc-card"><div className="lbl">Webpay</div><div className="val">{clp(tot.webpay)}</div></div>
        <div className="jc-card"><div className="lbl">Crédito</div><div className="val">{clp(tot.credito_cta_cte)}</div></div>
        <div className="jc-card"><div className="lbl">Retiros aut.</div><div className="val">{clp(retirosAutorizados)}</div></div>
      </div>

      {cerrando && (
        <div className="jc-panel" style={{ marginBottom: 16 }}>
          <h2>Cierre de caja</h2>
          <p className="jc-cajero">Efectivo esperado en cajón: <b>{clp(efectivoEsperado)}</b></p>
          <p className="jc-hint">Fondo {clp(sesion.fondo_inicial)} + efectivo del día {clp(tot.efectivo)} − retiros autorizados {clp(retirosAutorizados)}</p>
          <label className="jc-lbl">Efectivo contado (arqueo)</label>
          <input className="jc-input" type="number" value={arqueo} onChange={(e) => setArqueo(e.target.value)} placeholder="0" />
          {arqueo !== '' && <p className="jc-hint">Diferencia: {clp((Number(arqueo) || 0) - efectivoEsperado)}</p>}
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

              {lineas.length > 0 && (
                <div className="jc-lineas">
                  {lineas.map((l) => (
                    <div className="jc-linea" key={l.id}>
                      <span>{medioLabel(l.medio)} · {clp(l.monto)}{l.vuelto ? ` · vuelto ${clp(l.vuelto)}` : ''}</span>
                      <button className="jc-x" onClick={() => quitarLinea(l.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className={`jc-restante${restante === 0 ? ' ok' : ''}`}>
                {restante > 0 ? <>Falta: {clp(restante)}</> : 'Total cubierto ✓'}
              </div>

              {restante > 0 && (
                <>
                  <div className="jc-medios">
                    {MEDIOS.map((m) => (
                      <button key={m.id} className={`jc-medio${lMedio === m.id ? ' on' : ''}`} onClick={() => setLMedio(m.id)}>{m.label}</button>
                    ))}
                  </div>
                  <label className="jc-lbl">Monto de esta forma de pago</label>
                  <input className="jc-input" type="number" value={lMonto} onChange={(e) => setLMonto(e.target.value)} />
                  {lMedio === 'efectivo' && (
                    <>
                      <label className="jc-lbl">Efectivo recibido (opcional)</label>
                      <input className="jc-input" type="number" value={lRecibido} onChange={(e) => setLRecibido(e.target.value)} placeholder={lMonto} />
                      <div className="jc-hint">Vuelto: {clp(Math.max(0, (Number(lRecibido) || Number(lMonto) || 0) - (Number(lMonto) || 0)))}</div>
                    </>
                  )}
                  {REQUIERE_CONFIRMACION.includes(lMedio) && <p className="jc-hint">Esta forma de pago quedará "por confirmar" hasta validación.</p>}
                  <div className="jc-row">
                    <button className="jc-btn sm" onClick={agregarLinea}>Agregar forma de pago</button>
                  </div>
                </>
              )}

              {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}

              <div className="jc-row">
                <button className="jc-btn" onClick={() => { setDoc(null); setLineas([]); }}>Cancelar</button>
                <button className="jc-btn primary" disabled={restante !== 0 || ocupado} onClick={registrarCobro}>
                  {ocupado ? 'Registrando…' : 'Registrar cobro'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="jc-panel">
          <h2>Documentos del día</h2>
          {docsDia.length === 0 ? (
            <div className="jc-empty">Aún no hay cobros en este turno.</div>
          ) : (
            docsDia.map((d) => (
              <div className="jc-docrow" key={`${d.tipo_dte}-${d.folio}`}>
                <div className="jc-docrow-head">
                  <div>
                    <b>Folio {d.folio}</b> · {d.cliente || '—'}
                    {d.descripcion && <span className="jc-sub">{d.descripcion}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b className="num">{clp(d.total)}</b>
                    {perfil.puede_autorizar && <button className="jc-btn sm" onClick={() => setEditandoDoc(d)}>Editar</button>}
                  </div>
                </div>
                <div className="jc-docrow-lines">
                  {d.lineas.map((l) => (
                    <span key={l.id} className="jc-tag">
                      {medioLabel(l.medio_pago)} · {clp(l.monto)}{l.estado_pago === 'por_confirmar' && ' (por confirmar)'}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="jc-panel" style={{ marginTop: 16 }}>
        <div className="jc-substrip">
          <h2>Retiros y devoluciones</h2>
          <button className="jc-btn sm" onClick={() => { setPidiendo(!pidiendo); setMsgRet(null); }}>
            {pidiendo ? 'Cancelar' : 'Solicitar retiro'}
          </button>
        </div>

        {pidiendo && (
          <div style={{ marginBottom: 14 }}>
            <label className="jc-lbl">Tipo</label>
            <select className="jc-select" value={motivoRet} onChange={(e) => setMotivoRet(e.target.value)}>
              <option value="retiro">Retiro de efectivo</option>
              <option value="devolucion">Devolución a cliente</option>
            </select>
            <label className="jc-lbl">Monto</label>
            <input className="jc-input" type="number" value={montoRet} onChange={(e) => setMontoRet(e.target.value)} placeholder="0" />
            <label className="jc-lbl">Detalle (opcional)</label>
            <input className="jc-input" value={descRet} onChange={(e) => setDescRet(e.target.value)} placeholder="Motivo o referencia…" />
            <div className="jc-row">
              <button className="jc-btn primary" disabled={ocupadoRet} onClick={solicitarRetiro}>
                {ocupadoRet ? 'Enviando…' : 'Enviar a autorización'}
              </button>
            </div>
          </div>
        )}
        {msgRet && <p className={`jc-msg ${msgRet.tipo}`}>{msgRet.txt}</p>}

        {retiros.length === 0 ? (
          <div className="jc-empty">No hay retiros en este turno.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th className="num">Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {retiros.map((r) => {
                const e = EST_RET[r.estado] || { t: r.estado, c: '' };
                return (
                  <tr key={r.id}>
                    <td>{hora(r.creado_en)}</td>
                    <td>{r.motivo === 'devolucion' ? 'Devolución' : 'Retiro'}</td>
                    <td>{r.descripcion || '—'}</td>
                    <td className="num">{clp(r.monto)}</td>
                    <td><span className={`jc-st ${e.c}`}>{e.t}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {retirosPendientes > 0 && <p className="jc-hint">{retirosPendientes} solicitud(es) esperando autorización.</p>}
      </div>

      {editandoDoc && (
        <EditarDocumento
          grupo={editandoDoc}
          onClose={() => setEditandoDoc(null)}
          onSaved={() => { setEditandoDoc(null); cargarSesion(); }}
        />
      )}
    </>
  );
}
