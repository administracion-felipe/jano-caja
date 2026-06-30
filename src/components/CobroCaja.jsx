// src/components/CobroCaja.jsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseTimbre, clienteDisplay } from '../lib/parseTimbre';
import { MEDIOS, medioLabel, REQUIERE_CONFIRMACION } from '../lib/medios';
import { fmtMiles, soloDigitos } from '../lib/num';
import EditarDocumento from './EditarDocumento';
import PlanillaCaja from './PlanillaCaja';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const hora = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';

const EST_RET = { pendiente: { t: 'Pendiente', c: 'warn' }, autorizado: { t: 'Autorizado', c: 'ok' }, rechazado: { t: 'Rechazado', c: 'bad' } };

const ICONOS = {
  money: 'M2 7h20v10H2z M2 11h20',
  doc: 'M6 2h9l3 3v17H6z M14 2v4h4',
  cash: 'M2 6h20v12H2z M12 9a3 3 0 100 6 3 3 0 000-6',
  card: 'M2 6h20v12H2z M2 10h20',
  bank: 'M3 9l9-5 9 5 M4 9v9 M9 9v9 M15 9v9 M20 9v9 M3 21h18',
  web: 'M12 3a9 9 0 100 18 9 9 0 000-18 M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  credit: 'M2 6h20v12H2z M2 10h20 M6 15h4',
  retiro: 'M12 4v10 M8 11l4 4 4-4 M5 20h14',
};
function Ic({ name, bg, fg }) {
  return (
    <span className="jc-ic" style={{ background: bg, color: fg }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONOS[name]} /></svg>
    </span>
  );
}

function diasHabilesMes(d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth();
  const ult = new Date(y, m + 1, 0).getDate();
  let n = 0;
  for (let dia = 1; dia <= ult; dia++) { const wd = new Date(y, m, dia).getDay(); if (wd >= 1 && wd <= 5) n++; }
  return n;
}

// Mar-vie 9:00–17:30. Si no hay hora (solo fecha), solo se evalúa el día.
function esFueraHorario(emitidoEn, fechaEmision) {
  const iso = emitidoEn || (fechaEmision ? fechaEmision + 'T12:00:00' : null);
  if (!iso) return false;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return false;
  const wd = dt.getDay();
  if (wd === 0 || wd === 6) return true;
  if (emitidoEn) {
    const min = dt.getHours() * 60 + dt.getMinutes();
    if (min < 540 || min > 1050) return true;
  }
  return false;
}

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
  const [saldos, setSaldos] = useState([]);
  const [lSaldoId, setLSaldoId] = useState('');
  const [ncMedio, setNcMedio] = useState('');
  const [ncNombre, setNcNombre] = useState('');
  const [ncRut, setNcRut] = useState('');
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [dupAviso, setDupAviso] = useState(false);

  const [cerrando, setCerrando] = useState(false);
  const [arqueo, setArqueo] = useState('');
  const [editandoDoc, setEditandoDoc] = useState(null);
  const [ayerTotal, setAyerTotal] = useState(0);
  const [metaMensual, setMetaMensual] = useState(0);
  const [diasHabCfg, setDiasHabCfg] = useState(0);
  const [fondoBase, setFondoBase] = useState(800000);
  const [verResumen, setVerResumen] = useState(false);
  const [vista, setVista] = useState('cobro');
  const [filtroDoc, setFiltroDoc] = useState('');
  const [mtdTotal, setMtdTotal] = useState(0);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');

  const [pidiendo, setPidiendo] = useState(false);
  const [montoRet, setMontoRet] = useState('');
  const [tiposRet, setTiposRet] = useState([]);
  const [motivoRet, setMotivoRet] = useState('');
  const [descRet, setDescRet] = useState('');
  const [notaRet, setNotaRet] = useState('');
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
      const { data: docs } = await supabase.from('documentos').select('tipo_dte,folio,razon_receptor,primer_item,fuera_horario,emitido_en');
      const map = {};
      (docs || []).forEach((d) => { map[`${d.tipo_dte}-${d.folio}`] = d; });
      setCobros((cs || []).map((c) => {
        const d = map[`${c.tipo_dte}-${c.folio}`] || {};
        return { ...c, cliente: d.razon_receptor || null, descripcion: d.primer_item || null, fuera_horario: d.fuera_horario || false, emitido_en: d.emitido_en || null };
      }));
      const { data: rs } = await supabase.from('retiros').select('*')
        .eq('sesion_id', data.id).order('creado_en', { ascending: false });
      setRetiros(rs || []);
      await cargarSaldos();
      await cargarTipos();
    } else {
      await sugerirFondo();
    }
    await cargarComparativos();
    setCargando(false);
  }

  async function cargarComparativos() {
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    const yyyy = ayer.toLocaleDateString('en-CA');
    const ini = new Date(yyyy + 'T00:00:00'), fin = new Date(yyyy + 'T23:59:59.999');
    const { data: ss } = await supabase.from('caja_sesiones').select('id')
      .gte('abierta_en', ini.toISOString()).lte('abierta_en', fin.toISOString());
    let total = 0;
    if (ss && ss.length) {
      const { data: cs } = await supabase.from('cobros').select('monto').in('sesion_id', ss.map((s) => s.id));
      total = (cs || []).reduce((a, c) => a + c.monto, 0);
    }
    setAyerTotal(total);
    const { data: cfg } = await supabase.from('configuracion').select('clave,valor').in('clave', ['meta_mensual', 'dias_habiles', 'fondo_base']);
    const cmap = {};
    (cfg || []).forEach((r) => { cmap[r.clave] = r.valor; });
    setMetaMensual(Number(cmap.meta_mensual) || 0);
    setDiasHabCfg(Number(cmap.dias_habiles) || 0);
    setFondoBase(Number(cmap.fondo_base) || 800000);
    const now = new Date();
    const iniMes = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const { data: ms } = await supabase.from('caja_sesiones').select('id').gte('abierta_en', iniMes.toISOString());
    let mtd = 0;
    if (ms && ms.length) {
      const { data: mc } = await supabase.from('cobros').select('monto').in('sesion_id', ms.map((s) => s.id));
      mtd = (mc || []).reduce((a, c) => a + c.monto, 0);
    }
    setMtdTotal(mtd);
  }

  async function guardarMeta() {
    const v = Number(metaInput) || 0;
    await supabase.from('configuracion').upsert({ clave: 'meta_mensual', valor: String(v), actualizado_en: new Date().toISOString() }, { onConflict: 'clave' });
    setMetaMensual(v); setEditandoMeta(false);
  }

  async function cargarSaldos() {
    const { data } = await supabase.from('saldos_favor').select('*')
      .eq('estado', 'disponible').gt('saldo', 0).order('creado_en', { ascending: false });
    setSaldos(data || []);
  }

  async function cargarTipos() {
    const { data } = await supabase.from('tipos_retiro').select('*').eq('activo', true).order('nombre');
    setTiposRet(data || []);
    setMotivoRet((m) => m || data?.[0]?.nombre || '');
  }

  async function sugerirFondo() {
    const { data: cfgFB } = await supabase.from('configuracion').select('valor').eq('clave', 'fondo_base').maybeSingle();
    const base = Number(cfgFB?.valor) || 800000;
    setFondoBase(base);
    const { data: ult } = await supabase.from('caja_sesiones').select('*')
      .eq('estado', 'cerrada').order('cerrada_en', { ascending: false }).limit(1).maybeSingle();
    if (!ult) { setFondo(String(base)); setFondoNota(`Fondo base ${clp(base)}. Es la primera caja registrada.`); return; }
    // Lo que se traspasa es el efectivo físico contado en el cierre anterior.
    const saldo = ult.arqueo_efectivo != null ? ult.arqueo_efectivo : (ult.fondo_inicial || base);
    setFondo(String(saldo));
    if (saldo < base) {
      setFondoNota(`⚠ La caja anterior cerró con ${clp(saldo)}, bajo el fondo base de ${clp(base)} (faltan ${clp(base - saldo)}). Revisa o repón el fondo antes de abrir.`);
    } else {
      setFondoNota(`Saldo traspasado del cierre anterior: ${clp(saldo)}. Ajústalo si depositaste el excedente o repusiste el fondo.`);
    }
  }

  async function abrirCaja() {
    const { data, error } = await supabase.from('caja_sesiones')
      .insert({ cajero: perfil.nombre, fondo_inicial: Number(fondo) || 0 }).select().single();
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setSesion(data); setCobros([]); setRetiros([]); setMsg(null);
  }

  async function leerTimbre() {
    if (!scan.trim()) return;
    let d;
    try {
      d = parseTimbre(scan);
    } catch (e) { setMsg({ tipo: 'error', txt: e.message }); setScan(''); return; }
    setDupAviso(false);
    setDoc(d); setLineas([]); setLMedio('efectivo'); setLMonto(String(d.total)); setLRecibido(''); setLSaldoId(''); setScan(''); setMsg(null);
    if (d.tipoDte === 61) {
      setNcMedio('');
      setNcNombre(d.razonReceptor && d.razonReceptor !== 'DESCONOCIDO' ? d.razonReceptor : '');
      setNcRut(d.rutReceptor && d.rutReceptor !== '66666666-6' ? d.rutReceptor : '');
    }
    // ¿Este documento ya fue cobrado antes? No se puede ingresar dos veces.
    const { data: ya } = await supabase.from('cobros').select('id').eq('tipo_dte', d.tipoDte).eq('folio', d.folio).limit(1);
    if ((ya || []).length > 0) setDupAviso(true);
  }

  const sumaLineas = lineas.reduce((s, l) => s + l.monto, 0);
  const restante = doc ? doc.total - sumaLineas : 0;

  function agregarLinea() {
    const m = Number(lMonto) || 0;
    if (m <= 0) return setMsg({ tipo: 'error', txt: 'Ingresa un monto válido.' });
    if (m > restante) return setMsg({ tipo: 'error', txt: `El monto supera lo que falta (${clp(restante)}).` });
    let saldoId = null, clienteSaldo = null, medioOriginal = null;
    if (lMedio === 'saldo_favor') {
      const s = saldos.find((x) => String(x.id) === String(lSaldoId));
      if (!s) return setMsg({ tipo: 'error', txt: 'Elige el saldo a favor a usar.' });
      const yaUsado = lineas.filter((l) => l.saldo_id === s.id).reduce((a, l) => a + l.monto, 0);
      if (m > s.saldo - yaUsado) return setMsg({ tipo: 'error', txt: `El saldo disponible de ese cliente es ${clp(s.saldo - yaUsado)}.` });
      saldoId = s.id; clienteSaldo = s.cliente_nombre || s.cliente_rut || 'Cliente'; medioOriginal = s.medio_pago || null;
    }
    const vuelto = lMedio === 'efectivo' ? Math.max(0, (Number(lRecibido) || m) - m) : 0;
    const nuevas = [...lineas, { id: 't' + Date.now(), medio: lMedio, monto: m, vuelto, saldo_id: saldoId, cliente_saldo: clienteSaldo, medio_original: medioOriginal }];
    setLineas(nuevas);
    const nuevoRestante = doc.total - nuevas.reduce((s, l) => s + l.monto, 0);
    setLMonto(nuevoRestante > 0 ? String(nuevoRestante) : '');
    setLRecibido(''); setLSaldoId(''); setMsg(null);
  }

  function quitarLinea(id) {
    const nuevas = lineas.filter((l) => l.id !== id);
    setLineas(nuevas);
    setLMonto(String(doc.total - nuevas.reduce((s, l) => s + l.monto, 0)));
  }

  async function registrarCobro() {
    if (!doc || lineas.length === 0 || restante !== 0 || dupAviso) return;
    setOcupado(true);
    // Doble verificación: que no se haya cobrado este folio mientras tanto.
    const { data: ya } = await supabase.from('cobros').select('id').eq('tipo_dte', doc.tipoDte).eq('folio', doc.folio).limit(1);
    if ((ya || []).length > 0) {
      setOcupado(false); setDupAviso(true);
      return setMsg({ tipo: 'error', txt: `El documento ${doc.folio} ya fue cobrado. No se puede ingresar dos veces.` });
    }
    const fuera = esFueraHorario(doc.emitidoEn, doc.fechaEmision);
    await supabase.from('documentos').upsert({
      tipo_dte: doc.tipoDte, folio: doc.folio, total: doc.total,
      rut_receptor: doc.rutReceptor, razon_receptor: doc.razonReceptor,
      fecha_emision: doc.fechaEmision, emitido_en: doc.emitidoEn || null, fuera_horario: fuera,
      primer_item: doc.primerItem, canal: 'mostrador',
      forma_pago: lineas.length > 1 ? 'mixto' : lineas[0].medio, estado_sii: 'pendiente', origen: 'timbre',
    }, { onConflict: 'tipo_dte,folio' });
    const filas = lineas.map((l) => ({
      sesion_id: sesion.id, tipo_dte: doc.tipoDte, folio: doc.folio,
      monto: l.monto, medio_pago: l.medio === 'saldo_favor' ? (l.medio_original || 'saldo_favor') : l.medio,
      vuelto: l.vuelto || 0, cajero: perfil.nombre, saldo_id: l.saldo_id || null,
      estado_pago: REQUIERE_CONFIRMACION.includes(l.medio) ? 'por_confirmar' : 'confirmado',
    }));
    const { data, error } = await supabase.from('cobros').insert(filas).select();
    if (error) { setOcupado(false); return setMsg({ tipo: 'error', txt: error.message }); }
    const usoPorSaldo = {};
    lineas.forEach((l) => { if (l.saldo_id) usoPorSaldo[l.saldo_id] = (usoPorSaldo[l.saldo_id] || 0) + l.monto; });
    for (const sid of Object.keys(usoPorSaldo)) {
      const s = saldos.find((x) => String(x.id) === String(sid));
      if (!s) continue;
      const nuevo = Math.max(0, s.saldo - usoPorSaldo[sid]);
      await supabase.from('saldos_favor').update({ saldo: nuevo, estado: nuevo <= 0 ? 'agotado' : 'disponible' }).eq('id', sid);
    }
    setOcupado(false);
    const conMeta = (data || []).map((c) => ({ ...c, cliente: doc.razonReceptor, descripcion: doc.primerItem, fuera_horario: fuera, emitido_en: doc.emitidoEn || null }));
    setCobros((prev) => [...conMeta, ...prev]);
    const hayPorConfirmar = filas.some((f) => f.estado_pago === 'por_confirmar');
    setDoc(null); setLineas([]);
    if (Object.keys(usoPorSaldo).length) await cargarSaldos();
    setMsg({ tipo: 'ok', txt: `Documento ${doc.folio} cobrado en ${filas.length} forma(s) de pago${hayPorConfirmar ? ' · hay pagos por confirmar' : ''}.` });
  }

  async function registrarNC() {
    if (dupAviso) return setMsg({ tipo: 'error', txt: `La nota de crédito ${doc.folio} ya fue registrada. No se puede ingresar dos veces.` });
    if (!ncMedio) return setMsg({ tipo: 'error', txt: 'Elige el medio de pago original.' });
    if (!ncNombre.trim() && !ncRut.trim()) return setMsg({ tipo: 'error', txt: 'Indica el cliente (nombre o RUT).' });
    setOcupado(true);
    const { data: yaNC } = await supabase.from('cobros').select('id').eq('tipo_dte', doc.tipoDte).eq('folio', doc.folio).limit(1);
    if ((yaNC || []).length > 0) {
      setOcupado(false); setDupAviso(true);
      return setMsg({ tipo: 'error', txt: `La nota de crédito ${doc.folio} ya fue registrada. No se puede ingresar dos veces.` });
    }
    const fuera = esFueraHorario(doc.emitidoEn, doc.fechaEmision);
    await supabase.from('documentos').upsert({
      tipo_dte: doc.tipoDte, folio: doc.folio, total: -doc.total,
      rut_receptor: ncRut || doc.rutReceptor, razon_receptor: ncNombre || doc.razonReceptor,
      fecha_emision: doc.fechaEmision, emitido_en: doc.emitidoEn || null, fuera_horario: fuera,
      primer_item: doc.primerItem, canal: 'mostrador', forma_pago: ncMedio, estado_sii: 'pendiente', origen: 'timbre',
    }, { onConflict: 'tipo_dte,folio' });
    const { error: eS } = await supabase.from('saldos_favor').insert({
      cliente_nombre: ncNombre || null, cliente_rut: ncRut || null, monto: doc.total, saldo: doc.total,
      medio_pago: ncMedio, documento_origen: `NC ${doc.folio}`, nota: 'Generado por nota de crédito', creado_por: perfil.nombre,
    });
    const { data: cob, error: eC } = await supabase.from('cobros').insert({
      sesion_id: sesion.id, tipo_dte: doc.tipoDte, folio: doc.folio, monto: -doc.total,
      medio_pago: ncMedio, vuelto: 0, cajero: perfil.nombre, estado_pago: 'confirmado',
    }).select().single();
    setOcupado(false);
    if (eS || eC) return setMsg({ tipo: 'error', txt: (eS || eC).message });
    setCobros((prev) => [{ ...cob, cliente: ncNombre || doc.razonReceptor, descripcion: 'Nota de crédito', fuera_horario: fuera }, ...prev]);
    await cargarSaldos();
    const nombre = ncNombre || 'cliente';
    setDoc(null);
    setMsg({ tipo: 'ok', txt: `Nota de crédito ${doc.folio}: −${clp(doc.total)} en ${medioLabel(ncMedio)}. Saldo a favor de ${nombre} disponible para usar en ${medioLabel(ncMedio)}.` });
  }

  async function solicitarRetiro() {
    const m = Number(montoRet) || 0;
    if (m <= 0) return setMsgRet({ tipo: 'error', txt: 'Ingresa un monto válido.' });
    if (!motivoRet) return setMsgRet({ tipo: 'error', txt: 'Elige el tipo de retiro.' });
    setOcupadoRet(true);
    const { data, error } = await supabase.from('retiros').insert({
      sesion_id: sesion.id, monto: m, motivo: motivoRet, descripcion: descRet || null, nota: notaRet || null, solicitado_por: perfil.nombre,
    }).select().single();
    setOcupadoRet(false);
    if (error) return setMsgRet({ tipo: 'error', txt: error.message });
    await supabase.from('retiros_historial').insert({
      retiro_id: data.id, accion: 'solicitado', monto: m, detalle: motivoRet, usuario: perfil.nombre, usuario_id: perfil.id,
    });
    setRetiros((prev) => [data, ...prev]);
    setMontoRet(''); setDescRet(''); setNotaRet(''); setMotivoRet(tiposRet[0]?.nombre || ''); setPidiendo(false);
    setMsgRet({ tipo: 'ok', txt: 'Solicitud enviada a autorización.' });
  }

  const tot = MEDIOS.reduce((a, m) => {
    a[m.id] = cobros.filter((c) => c.medio_pago === m.id).reduce((s, c) => s + c.monto, 0);
    return a;
  }, {});
  const totalDia = cobros.reduce((s, c) => s + c.monto, 0);
  const retirosAutorizados = retiros.filter((r) => r.estado === 'autorizado').reduce((s, r) => s + r.monto, 0);
  const retirosPendientes = retiros.filter((r) => r.estado === 'pendiente').length;
  // Efectivo que realmente entró al cajón: ventas en efectivo reales (excluye notas de crédito y saldos a favor usados)
  const efectivoCajon = cobros.filter((c) => c.medio_pago === 'efectivo' && c.monto > 0 && !c.saldo_id).reduce((s, c) => s + c.monto, 0);
  const efectivoEsperado = (sesion?.fondo_inicial || 0) + efectivoCajon - retirosAutorizados;

  // Agrupar los cobros del día por documento (folio)
  const grupos = {};
  cobros.forEach((c) => {
    const k = `${c.tipo_dte}-${c.folio}`;
    if (!grupos[k]) grupos[k] = { tipo_dte: c.tipo_dte, folio: c.folio, cliente: c.cliente, descripcion: c.descripcion, fuera_horario: c.fuera_horario, emitido_en: c.emitido_en, lineas: [], total: 0 };
    grupos[k].lineas.push(c);
    grupos[k].total += c.monto;
  });
  const docsDia = Object.values(grupos);

  const pctDe = (v) => (totalDia > 0 ? Math.round((v / totalDia) * 100) : 0);
  const boletas = docsDia.filter((d) => [39, 41].includes(d.tipo_dte)).length;
  const facturas = docsDia.filter((d) => [33, 34].includes(d.tipo_dte)).length;
  const trend = ayerTotal > 0 ? Math.round(((totalDia - ayerTotal) / ayerTotal) * 100) : null;
  const diasHab = diasHabCfg > 0 ? diasHabCfg : diasHabilesMes();
  const metaDiaria = metaMensual > 0 && diasHab > 0 ? Math.round(metaMensual / diasHab) : 0;
  const diaPct = metaDiaria > 0 ? Math.min(100, (totalDia / metaDiaria) * 100) : 0;
  const mesPct = metaMensual > 0 ? Math.min(100, (mtdTotal / metaMensual) * 100) : 0;
  const faltaDia = Math.max(0, metaDiaria - totalDia);
  const segs = MEDIOS
    .map((m) => ({ label: m.label, val: tot[m.id] || 0, color: m.color }))
    .filter((s) => s.val > 0);
  let acc = 0;
  const donutBg = totalDia > 0
    ? `conic-gradient(${segs.map((s) => { const a = (acc / totalDia) * 360; acc += s.val; const b = (acc / totalDia) * 360; return `${s.color} ${a}deg ${b}deg`; }).join(', ')})`
    : '#E6ECF5';

  async function cerrarCaja() {
    const arq = Number(arqueo) || 0;
    const { error } = await supabase.from('caja_sesiones').update({
      cerrada_en: new Date().toISOString(),
      total_efectivo: tot.efectivo || 0, total_tarjeta: (tot.debito || 0) + (tot.credito || 0) + (tot.tarjeta || 0), total_transferencia: tot.transferencia || 0,
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
        <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(fondo)} onChange={(e) => setFondo(soloDigitos(e.target.value))} placeholder="800.000" />
        {fondoNota && <p className={`jc-hint ${(Number(fondo) || 0) < fondoBase ? 'warn' : ''}`}>{fondoNota}</p>}
        {(Number(fondo) || 0) < fondoBase && (
          <div className="jc-alert warn">La caja abriría con {clp(Number(fondo) || 0)}, bajo el fondo base de {clp(fondoBase)} (faltan {clp(fondoBase - (Number(fondo) || 0))}).</div>
        )}
        {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}
        <div className="jc-row"><button className="jc-btn primary" onClick={abrirCaja}>Abrir caja</button></div>
      </div>
    );
  }

  return (
    <>
      <div className="jc-substrip">
        <span className="jc-badge">Caja abierta · {perfil.nombre}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span className="jc-daytot">Total del día <b>{clp(totalDia)}</b> · {docsDia.length} doc.</span>
          <button className="jc-btn" onClick={() => setCerrando(true)}>Cerrar caja</button>
        </div>
      </div>

      {efectivoEsperado < 0 && (
        <div className="jc-alert danger">⚠ La caja quedó en contra: el efectivo esperado es {clp(efectivoEsperado)}. Revisa los retiros y los cobros en efectivo.</div>
      )}
      {(sesion?.fondo_inicial || 0) < fondoBase && (
        <div className="jc-alert warn">La caja abrió con {clp(sesion?.fondo_inicial || 0)}, bajo el fondo base de {clp(fondoBase)} (faltan {clp(fondoBase - (sesion?.fondo_inicial || 0))}).</div>
      )}

      <div className="jc-viewtabs">
        <button className={`jc-viewtab${vista === 'cobro' ? ' on' : ''}`} onClick={() => setVista('cobro')}>Cobro</button>
        <button className={`jc-viewtab${vista === 'planilla' ? ' on' : ''}`} onClick={() => setVista('planilla')}>Planilla</button>
      </div>

      {cerrando && (
        <div className="jc-panel" style={{ marginBottom: 16 }}>
          <h2>Cierre de caja</h2>
          <p className="jc-cajero">Efectivo esperado en cajón: <b>{clp(efectivoEsperado)}</b></p>
          <p className="jc-hint">Fondo {clp(sesion.fondo_inicial)} + efectivo en caja {clp(efectivoCajon)} − retiros autorizados {clp(retirosAutorizados)}</p>
          <p className="jc-hint">No incluye notas de crédito ni saldos a favor: esa plata queda en la caja.</p>
          {efectivoEsperado < 0 && (
            <div className="jc-alert danger">⚠ El efectivo esperado es negativo ({clp(efectivoEsperado)}): la caja está en contra. Revisa retiros y cobros antes de cerrar.</div>
          )}
          <label className="jc-lbl">Efectivo contado (arqueo)</label>
          <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(arqueo)} onChange={(e) => setArqueo(soloDigitos(e.target.value))} placeholder="0" />
          {arqueo !== '' && <p className="jc-hint">Diferencia: {clp((Number(arqueo) || 0) - efectivoEsperado)}</p>}
          {arqueo !== '' && (
            <p className={`jc-hint ${(Number(arqueo) || 0) < fondoBase ? 'warn' : ''}`}>
              Se traspasa al día siguiente: <b>{clp(Number(arqueo) || 0)}</b>
              {(Number(arqueo) || 0) < fondoBase ? ` · bajo el fondo base de ${clp(fondoBase)} (faltan ${clp(fondoBase - (Number(arqueo) || 0))})` : ''}
            </p>
          )}
          <div className="jc-row">
            <button className="jc-btn" onClick={() => setCerrando(false)}>Cancelar</button>
            <button className="jc-btn primary" onClick={cerrarCaja}>Confirmar cierre</button>
          </div>
        </div>
      )}

      {vista === 'cobro' && (<>
      <div className="jc-grid">
        <div className="jc-panel">
          <h2>Nuevo cobro</h2>
          {!doc ? (
            <>
              <div className="jc-scan">
                <div className="jc-scan-ic">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 012-2h2 M17 3h2a2 2 0 012 2v2 M21 17v2a2 2 0 01-2 2h-2 M7 21H5a2 2 0 01-2-2v-2 M3 12h18" />
                  </svg>
                </div>
                <div className="jc-scan-title">Escanee el timbre PDF417</div>
                <div className="jc-scan-sub">Esperando lectura…</div>
                <input ref={scanRef} className="jc-scan-input" value={scan} autoFocus
                  onChange={(e) => setScan(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && leerTimbre()}
                  placeholder="Apunta el lector al código y presiona Enter" />
              </div>
              {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}
            </>
          ) : doc.tipoDte === 61 ? (
            <div className="jc-doc">
              <div className="meta">{doc.tipoNombre} · folio {doc.folio}</div>
              <div className="cliente">Nota de crédito</div>
              {doc.primerItem && <div className="meta">{doc.primerItem}</div>}
              <div className="monto">{clp(doc.total)}</div>
              {dupAviso && <div className="jc-alert danger">⚠ Esta nota de crédito (folio {doc.folio}) ya fue registrada. No se puede ingresar dos veces.</div>}
              <p className="jc-hint">Resta este monto de lo recibido en el medio original y queda como saldo a favor del cliente, usable en ese mismo medio.</p>
              <label className="jc-lbl">Cliente</label>
              <input className="jc-input" value={ncNombre} onChange={(e) => setNcNombre(e.target.value)} placeholder="Nombre del cliente" />
              <label className="jc-lbl">RUT</label>
              <input className="jc-input" value={ncRut} onChange={(e) => setNcRut(e.target.value)} placeholder="RUT del cliente" />
              <label className="jc-lbl">Medio de pago original</label>
              <select className="jc-select" value={ncMedio} onChange={(e) => setNcMedio(e.target.value)}>
                <option value="">Elegir medio…</option>
                {MEDIOS.filter((m) => m.id !== 'saldo_favor').map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}
              <div className="jc-row">
                <button className="jc-btn" onClick={() => { setDoc(null); setDupAviso(false); }}>Cancelar</button>
                <button className="jc-btn primary" disabled={ocupado || dupAviso} onClick={registrarNC}>{ocupado ? 'Registrando…' : 'Registrar nota de crédito'}</button>
              </div>
            </div>
          ) : (
            <div className="jc-doc">
              <div className="meta">{doc.tipoNombre} · folio {doc.folio}</div>
              <div className="cliente">{clienteDisplay(doc.razonReceptor, doc.rutReceptor)}</div>
              {doc.primerItem && <div className="meta">{doc.primerItem}</div>}
              <div className="monto">{clp(doc.total)}</div>
              {dupAviso && <div className="jc-alert danger">⚠ El documento {doc.folio} ya fue cobrado. No se puede ingresar dos veces.</div>}

              {lineas.length > 0 && (
                <div className="jc-lineas">
                  {lineas.map((l) => (
                    <div className="jc-linea" key={l.id}>
                      <span>{medioLabel(l.medio)}{l.cliente_saldo ? ` (${l.cliente_saldo})` : ''} · {clp(l.monto)}{l.vuelto ? ` · vuelto ${clp(l.vuelto)}` : ''}</span>
                      <button className="jc-x" onClick={() => quitarLinea(l.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className={`jc-cover ${restante === 0 ? 'ok' : restante < 0 ? 'over' : 'falta'}`}>
                <div className="jc-cover-top">
                  <span className="jc-cover-lbl">
                    {restante > 0 ? 'Falta por cubrir' : restante < 0 ? 'Pago en exceso' : 'Pago completo'}
                  </span>
                  <b className="jc-cover-val">
                    {restante > 0 ? clp(restante) : restante < 0 ? `+${clp(-restante)}` : '✓ Cubierto'}
                  </b>
                </div>
                <div className="jc-cover-bar">
                  <div style={{ width: `${doc.total > 0 ? Math.min(100, (sumaLineas / doc.total) * 100) : 0}%` }} />
                </div>
                <div className="jc-cover-sub">Pagado {clp(sumaLineas)} de {clp(doc.total)}</div>
              </div>

              {restante > 0 && !dupAviso && (
                <>
                  <div className="jc-medios">
                    {MEDIOS.map((m) => (
                      <button key={m.id} className={`jc-medio${lMedio === m.id ? ' on' : ''}`} onClick={() => setLMedio(m.id)}>
                        <span className="jc-medio-dot" style={{ background: m.color }} />{m.label}
                      </button>
                    ))}
                  </div>
                  {lMedio === 'saldo_favor' && (
                    <>
                      <label className="jc-lbl">Saldo a favor del cliente</label>
                      <select className="jc-select" value={lSaldoId} onChange={(e) => {
                        setLSaldoId(e.target.value);
                        const s = saldos.find((x) => String(x.id) === e.target.value);
                        if (s) setLMonto(String(Math.min(restante, s.saldo)));
                      }}>
                        <option value="">Elegir cliente…</option>
                        {saldos.map((s) => (
                          <option key={s.id} value={s.id}>{(s.cliente_nombre || s.cliente_rut || 'Cliente')} · {medioLabel(s.medio_pago)} · {clp(s.saldo)}</option>
                        ))}
                      </select>
                      {saldos.length === 0 && <p className="jc-hint">No hay saldos a favor disponibles. Regístralos en la pestaña Saldos.</p>}
                    </>
                  )}
                  <label className="jc-lbl">Monto de esta forma de pago</label>
                  <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(lMonto)} onChange={(e) => setLMonto(soloDigitos(e.target.value))} />
                  {lMedio === 'efectivo' && (
                    <>
                      <label className="jc-lbl">Efectivo recibido (opcional)</label>
                      <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(lRecibido)} onChange={(e) => setLRecibido(soloDigitos(e.target.value))} placeholder={fmtMiles(lMonto)} />
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
                <button className="jc-btn" onClick={() => { setDoc(null); setLineas([]); setDupAviso(false); }}>Cancelar</button>
                <button className="jc-btn primary" disabled={restante !== 0 || ocupado || dupAviso} onClick={registrarCobro}>
                  {ocupado ? 'Registrando…' : 'Registrar cobro'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="jc-panel">
          <div className="jc-substrip" style={{ marginBottom: 10 }}>
            <h2>Documentos del día</h2>
            <span className="jc-daytot">{docsDia.length} doc. · {clp(totalDia)}</span>
          </div>

          <div className="jc-sumstrip">
            {MEDIOS.filter((m) => (tot[m.id] || 0) !== 0).map((m) => (
              <span key={m.id} className="jc-sumpill"><i>{medioLabel(m.id)}</i><b>{clp(tot[m.id])}</b></span>
            ))}
            {(tot.efectivo || 0) === 0 && totalDia === 0 && <span className="jc-sub">Sin cobros aún</span>}
          </div>

          {docsDia.length > 0 && (
            <input className="jc-input" style={{ margin: '4px 0 12px' }} value={filtroDoc}
              onChange={(e) => setFiltroDoc(e.target.value)} placeholder="Filtrar por folio o cliente…" />
          )}

          {docsDia.length === 0 ? (
            <div className="jc-empty">Aún no hay cobros en este turno.</div>
          ) : (
            <div className="jc-doclist">
              {docsDia
                .filter((d) => {
                  const q = filtroDoc.trim().toLowerCase();
                  if (!q) return true;
                  return String(d.folio).includes(q) || (d.cliente || '').toLowerCase().includes(q);
                })
                .map((d) => (
                  <div className="jc-docrow" key={`${d.tipo_dte}-${d.folio}`}>
                    <div className="jc-docrow-head">
                      <div>
                        <b>Folio {d.folio}</b> · {clienteDisplay(d.cliente)}
                        {d.fuera_horario && <span className="jc-st warn" style={{ marginLeft: 6 }}>Fuera de horario</span>}
                        {d.descripcion && <span className="jc-sub">{d.descripcion}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <b className="num">{clp(d.total)}</b>
                        <button className="jc-btn sm" onClick={() => setEditandoDoc(d)}>Editar</button>
                      </div>
                    </div>
                    <div className="jc-docrow-lines">
                      {d.lineas.map((l) => (
                        <span key={l.id} className="jc-tag">
                          {medioLabel(l.medio_pago)} · {clp(l.monto)}{l.saldo_id ? ' (saldo a favor)' : ''}{l.estado_pago === 'por_confirmar' && ' (por confirmar)'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
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
            <label className="jc-lbl">Tipo de retiro</label>
            <select className="jc-select" value={motivoRet} onChange={(e) => setMotivoRet(e.target.value)}>
              <option value="">Elegir tipo…</option>
              {tiposRet.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
            </select>
            <label className="jc-lbl">Monto</label>
            <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(montoRet)} onChange={(e) => setMontoRet(soloDigitos(e.target.value))} placeholder="0" />
            <label className="jc-lbl">Detalle (opcional)</label>
            <input className="jc-input" value={descRet} onChange={(e) => setDescRet(e.target.value)} placeholder="Referencia…" />
            <label className="jc-lbl">Nota (opcional)</label>
            <input className="jc-input" value={notaRet} onChange={(e) => setNotaRet(e.target.value)} placeholder="Descripción adicional…" />
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
                    <td>{r.motivo || '—'}</td>
                    <td>{r.descripcion || '—'}{r.nota && <span className="jc-sub">{r.nota}</span>}</td>
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

      <div className="jc-substrip" style={{ marginTop: 16 }}>
        <h2>Resumen del día</h2>
        <button className="jc-btn sm" onClick={() => setVerResumen((v) => !v)}>{verResumen ? 'Ocultar ▲' : 'Ver resumen ▼'}</button>
      </div>
      {verResumen && (
        <>
      <div className="jc-cards">
        <div className="jc-card">
          <div className="jc-card-top">
            <Ic name="money" bg="#EAF0FE" fg="#0840D0" /><span className="lbl">Total del día</span>
            {trend != null && <span className={`jc-trend ${trend >= 0 ? 'up' : 'down'}`}>{trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%</span>}
          </div>
          <div className="val">{clp(totalDia)}</div>
          <div className="sub">{ayerTotal > 0 ? `vs ayer ${clp(ayerTotal)}` : 'sin datos de ayer'}</div>
        </div>
        <div className="jc-card">
          <div className="jc-card-top"><Ic name="doc" bg="#EEF1F6" fg="#475569" /><span className="lbl">Documentos</span></div>
          <div className="val">{docsDia.length}</div>
          <div className="sub">Boletas {boletas} · Facturas {facturas}</div>
        </div>
        {MEDIOS.filter((m) => (tot[m.id] || 0) !== 0).map((m) => (
          <div className="jc-card" key={m.id}>
            <div className="jc-card-top"><span className="jc-dot" style={{ background: m.color }} /><span className="lbl">{m.label}</span></div>
            <div className="val">{clp(tot[m.id])}</div>
            <div className="sub">{pctDe(tot[m.id])}% del total</div>
          </div>
        ))}
        <div className="jc-card">
          <div className="jc-card-top"><Ic name="retiro" bg="#FCF3DA" fg="#B7791F" /><span className="lbl">Retiros aut.</span></div>
          <div className="val">{clp(retirosAutorizados)}</div>
          <div className="sub">Hoy</div>
        </div>
      </div>

      <div className="jc-two">
        <div className="jc-panel">
          <div className="jc-substrip" style={{ marginBottom: 12 }}>
            <h2>Metas</h2>
            {perfil.puede_autorizar && !editandoMeta && <button className="jc-btn sm" onClick={() => { setMetaInput(String(metaMensual)); setEditandoMeta(true); }}>Ajustar meta mensual</button>}
          </div>
          {editandoMeta ? (
            <div>
              <label className="jc-lbl">Meta mensual de ventas</label>
              <input className="jc-input" type="text" inputMode="numeric" value={fmtMiles(metaInput)} onChange={(e) => setMetaInput(soloDigitos(e.target.value))} />
              <p className="jc-hint">Se divide por los {diasHab} días hábiles del mes para la meta diaria.</p>
              <div className="jc-row">
                <button className="jc-btn" onClick={() => setEditandoMeta(false)}>Cancelar</button>
                <button className="jc-btn primary" onClick={guardarMeta}>Guardar meta</button>
              </div>
            </div>
          ) : (
            <div className="jc-metas">
              <div className="jc-metabox">
                <div className="jc-ring sm" style={{ background: `conic-gradient(var(--azul) ${diaPct * 3.6}deg, #E6ECF5 0deg)` }}>
                  <div className="hole">{Math.round(diaPct)}%</div>
                </div>
                <div className="lbl">Meta diaria</div>
                <div className="big">{clp(totalDia)}</div>
                <div className="sub">de {clp(metaDiaria)}</div>
                <div className="sub">{metaDiaria <= 0 ? 'Define la meta mensual' : faltaDia > 0 ? `Faltan ${clp(faltaDia)}` : 'Lograda hoy'}</div>
              </div>
              <div className="jc-metabox">
                <div className="jc-ring sm" style={{ background: `conic-gradient(#0F9D58 ${mesPct * 3.6}deg, #E6ECF5 0deg)` }}>
                  <div className="hole">{Math.round(mesPct)}%</div>
                </div>
                <div className="lbl">Meta mensual</div>
                <div className="big">{clp(mtdTotal)}</div>
                <div className="sub">de {clp(metaMensual)}</div>
                <div className="sub">{diasHab} días hábiles</div>
              </div>
            </div>
          )}
        </div>

        <div className="jc-panel">
          <h2>Distribución de ventas</h2>
          <div className="jc-dist">
            <div className="jc-donut" style={{ background: donutBg }}><div className="hole" /></div>
            <div className="jc-legend">
              {segs.length === 0 ? (
                <span className="empty">Aún no hay ventas registradas hoy.</span>
              ) : (
                segs.map((s) => (
                  <div className="it" key={s.label}>
                    <span className="dot" style={{ background: s.color }} />{s.label}<b>{pctDe(s.val)}%</b>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
      </>
      )}

      {vista === 'planilla' && (
        <PlanillaCaja cobros={cobros} retiros={retiros} sesion={sesion} fondoBase={fondoBase} onEditar={setEditandoDoc} />
      )}

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
