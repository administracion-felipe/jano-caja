// src/components/Cuadre.jsx
// Cuadre de la caja contra los tres reportes oficiales del sistema:
//   - RESUMEN FLUJO DE CAJA  -> totales por medio de pago
//   - FLUJO DE CAJAS         -> retiros / gastos
//   - LIBRO DE VENTAS        -> documentos emitidos (boletas, facturas, NC)
// Los .xls del sistema son HTML; se parsean en el navegador.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MEDIOS, medioLabel } from '../lib/medios';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const num = (s) => Number(String(s ?? '').replace(/[^\d-]/g, '')) || 0;

// dd/mm/yyyy -> yyyy-mm-dd
const aISO = (dmy) => {
  const m = (dmy || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

function parseTabla(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const caption = doc.querySelector('caption')?.textContent || '';
  const fechas = caption.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  const fecha = aISO(fechas[fechas.length - 1] || null);
  const table = doc.querySelector('table');
  const filas = [];
  let headers = [];
  if (table) {
    for (const tr of Array.from(table.querySelectorAll('tr'))) {
      const ths = Array.from(tr.querySelectorAll('th')).map((c) => c.textContent.trim());
      const tds = Array.from(tr.querySelectorAll('td')).map((c) => c.textContent.trim());
      if (ths.length && !tds.length) { headers = ths; continue; }
      if (tds.length) filas.push(tds);
    }
  }
  return { fecha, headers, filas };
}

// "Tipo de Pago" del sistema -> id de medio en la app
function medioDeTipo(s) {
  const u = (s || '').toUpperCase();
  if (u.includes('EFECTIVO')) return 'efectivo';
  if (u.includes('DEBITO') || u.includes('DÉBITO')) return 'debito';
  if (u.includes('TARJETA') && (u.includes('CREDITO') || u.includes('CRÉDITO'))) return 'credito';
  if (u.includes('ESTADO')) return 'transferencia_estado';
  if (u.includes('SANTANDER')) return 'transferencia_santander';
  if (u.includes('WEBPAY')) return 'webpay';
  if (u.includes('CHEQUE')) return 'cheque';
  if (u.includes('MERCADO')) return 'mercado_libre';
  if (u.includes('UTILIZACION') || u.includes('UTILIZACIÓN')) return 'saldo_favor';
  if (u.includes('SALDO POR PAGAR')) return 'saldo_por_pagar';
  if (u.includes('CTA') || u.includes('CUENTA CORRIENTE')) return 'credito_cta_cte';
  return null;
}

const colIdx = (headers, nombre) => headers.findIndex((h) => h.toLowerCase().includes(nombre.toLowerCase()));

export default function Cuadre() {
  const [fecha, setFecha] = useState('');
  const [resumen, setResumen] = useState(null);   // { medio: monto }
  const [flujo, setFlujo] = useState(null);        // { ops:[], total }
  const [libro, setLibro] = useState(null);        // { boletas:{cant,total}, facturas, nc, rango }
  const [caja, setCaja] = useState(null);          // datos de la app para la fecha
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function leerArchivo(e, cual) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const { fecha: f, headers, filas } = parseTabla(text);
      if (f) setFecha(f);

      if (cual === 'resumen') {
        const iTipo = colIdx(headers, 'Tipo de Pago');
        const iMonto = colIdx(headers, 'Monto Ventas');
        const map = {};
        filas.forEach((r) => {
          const tipo = r[iTipo] || '';
          if (/totales/i.test(tipo) || !tipo) return;
          const medio = medioDeTipo(tipo);
          if (!medio) return;
          map[medio] = (map[medio] || 0) + num(r[iMonto]);
        });
        setResumen(map);
      } else if (cual === 'flujo') {
        const iOp = colIdx(headers, 'Operacion');
        const iGlosa = colIdx(headers, 'Glosa');
        const iValor = colIdx(headers, 'Valor');
        const ops = [];
        filas.forEach((r) => {
          const op = r[iOp] || '';
          if (/^total/i.test(op) || !op) return;
          ops.push({ op, glosa: r[iGlosa] || '', valor: num(r[iValor]) });
        });
        setFlujo({ ops, total: ops.reduce((a, o) => a + o.valor, 0) });
      } else if (cual === 'libro') {
        const iTipo = colIdx(headers, 'Tipo Documento');
        const iCant = colIdx(headers, 'Cantidad Folios');
        const iMin = colIdx(headers, 'Folio Menor');
        const iMax = colIdx(headers, 'Folio Mayor');
        const iTotal = colIdx(headers, 'Total');
        const out = { boletas: { cant: 0, total: 0 }, facturas: { cant: 0, total: 0 }, nc: { cant: 0, total: 0 }, rango: null };
        filas.forEach((r) => {
          const tipo = (r[iTipo] || '').toUpperCase();
          if (tipo.startsWith('SUBTOTAL E.BOLETA')) { out.boletas = { cant: num(r[iCant]), total: num(r[iTotal]) }; }
          else if (tipo.startsWith('SUBTOTAL E.FACTURA')) { out.facturas = { cant: num(r[iCant]), total: num(r[iTotal]) }; }
          else if (tipo.startsWith('SUBTOTAL E.NOTA')) { out.nc = { cant: num(r[iCant]), total: num(r[iTotal]) }; }
          else if (tipo === 'E.BOLETA' && iMin >= 0) { out.rango = { min: num(r[iMin]), max: num(r[iMax]) }; }
        });
        setLibro(out);
      }
    } catch (err) {
      setError('No se pudo leer el archivo: ' + err.message);
    }
  }

  // Cargar datos de la app para la fecha detectada
  useEffect(() => { if (fecha) cargarCaja(fecha); }, [fecha]);

  async function cargarCaja(f) {
    setCargando(true);
    const ini = new Date(f + 'T00:00:00');
    const fin = new Date(f + 'T23:59:59.999');
    const { data: cobros } = await supabase.from('cobros').select('*')
      .gte('creado_en', ini.toISOString()).lte('creado_en', fin.toISOString());
    const { data: retiros } = await supabase.from('retiros').select('*')
      .gte('creado_en', ini.toISOString()).lte('creado_en', fin.toISOString());

    const porMedio = {};
    (cobros || []).forEach((c) => { porMedio[c.medio_pago] = (porMedio[c.medio_pago] || 0) + c.monto; });

    // Documentos por tipo (distintos folios)
    const folios = {};
    (cobros || []).forEach((c) => {
      const k = `${c.tipo_dte}-${c.folio}`;
      if (!folios[k]) folios[k] = { tipo_dte: c.tipo_dte, folio: c.folio, total: 0 };
      folios[k].total += c.monto;
    });
    const docs = Object.values(folios);
    const grupo = (tipos) => {
      const g = docs.filter((d) => tipos.includes(d.tipo_dte));
      return { cant: g.length, total: g.reduce((a, d) => a + Math.abs(d.total), 0), folios: g.map((d) => d.folio) };
    };

    setCaja({
      porMedio,
      boletas: grupo([39, 41]),
      facturas: grupo([33, 34]),
      nc: grupo([61]),
      retirosAut: (retiros || []).filter((r) => r.estado === 'autorizado').reduce((a, r) => a + r.monto, 0),
      nCobros: (cobros || []).length,
    });
    setCargando(false);
  }

  const FInput = ({ cual, label, hecho }) => (
    <label className={`jc-fileup${hecho ? ' ok' : ''}`}>
      <input type="file" accept=".xls,.html,.htm" style={{ display: 'none' }} onChange={(e) => leerArchivo(e, cual)} />
      <span className="ic">{hecho ? '✓' : '+'}</span>
      <span>{label}{hecho ? ' · cargado' : ''}</span>
    </label>
  );

  return (
    <>
      <div className="jc-panel" style={{ marginBottom: 16 }}>
        <h2>Cuadre con el sistema</h2>
        <p className="jc-hint" style={{ marginTop: 0 }}>
          Sube los tres reportes del sistema (Resumen Flujo de Caja, Flujo de Cajas y Libro de Ventas) y se comparan con lo registrado en la caja para ese día.
        </p>
        <div className="jc-fileups">
          <FInput cual="resumen" label="Resumen flujo de caja" hecho={!!resumen} />
          <FInput cual="flujo" label="Flujo de cajas (retiros)" hecho={!!flujo} />
          <FInput cual="libro" label="Libro de ventas" hecho={!!libro} />
        </div>
        <div className="jc-row" style={{ alignItems: 'center', gap: 10 }}>
          <label className="jc-lbl" style={{ margin: 0 }}>Fecha del cuadre</label>
          <input className="jc-input" type="date" style={{ maxWidth: 180 }} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          {cargando && <span className="jc-hint" style={{ margin: 0 }}>Cargando caja…</span>}
        </div>
        {error && <p className="jc-msg error">{error}</p>}
      </div>

      {!fecha && <div className="jc-panel"><div className="jc-empty">Sube al menos un reporte para empezar.</div></div>}

      {/* Cuadre por medio de pago */}
      {fecha && resumen && caja && (
        <div className="jc-panel" style={{ marginBottom: 16 }}>
          <h2>Por medio de pago</h2>
          <table className="jc-table">
            <thead><tr><th>Medio</th><th className="num">Sistema</th><th className="num">Caja</th><th className="num">Diferencia</th></tr></thead>
            <tbody>
              {medioFilas(resumen, caja.porMedio).map((r) => (
                <tr key={r.id}>
                  <td><span className="jc-medio-dot" style={{ background: r.color }} />{r.label}</td>
                  <td className="num">{clp(r.sistema)}</td>
                  <td className="num">{clp(r.caja)}</td>
                  <td className="num"><span className={`jc-st ${r.dif === 0 ? 'ok' : 'bad'}`}>{r.dif === 0 ? '✓' : clp(r.dif)}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="sumatoria">
                <td>Total</td>
                <td className="num">{clp(sum(resumen))}</td>
                <td className="num">{clp(sum(caja.porMedio))}</td>
                <td className="num">{clp(sum(caja.porMedio) - sum(resumen))}</td>
              </tr>
            </tfoot>
          </table>
          <p className="jc-hint">Sistema = "$ Monto Ventas" por tipo de pago. Caja = lo ingresado por el lector. Las diferencias en rojo son lo que hay que revisar.</p>
        </div>
      )}

      {/* Cuadre de retiros */}
      {fecha && flujo && caja && (
        <div className="jc-panel" style={{ marginBottom: 16 }}>
          <h2>Retiros y gastos</h2>
          <div className="jc-cards" style={{ marginBottom: 12 }}>
            <div className="jc-card"><div className="lbl">Sistema</div><div className="val">{clp(flujo.total)}</div></div>
            <div className="jc-card"><div className="lbl">Caja (autorizados)</div><div className="val">{clp(caja.retirosAut)}</div></div>
            <div className="jc-card"><div className="lbl">Diferencia</div><div className="val"><span className={`jc-st ${caja.retirosAut - flujo.total === 0 ? 'ok' : 'bad'}`}>{caja.retirosAut - flujo.total === 0 ? '✓ Calza' : clp(caja.retirosAut - flujo.total)}</span></div></div>
          </div>
          <table className="jc-table">
            <thead><tr><th>Operación</th><th>Glosa</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {flujo.ops.map((o, i) => (
                <tr key={i}><td>{o.op}</td><td>{o.glosa || '—'}</td><td className="num">{clp(o.valor)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cuadre de documentos */}
      {fecha && libro && caja && (
        <div className="jc-panel" style={{ marginBottom: 16 }}>
          <h2>Documentos emitidos</h2>
          <table className="jc-table">
            <thead><tr><th>Tipo</th><th className="num">Sistema (cant)</th><th className="num">Caja (cant)</th><th className="num">Sistema ($)</th><th className="num">Caja ($)</th></tr></thead>
            <tbody>
              <tr>
                <td>Boletas</td>
                <td className="num">{libro.boletas.cant}</td>
                <td className="num"><span className={`jc-st ${caja.boletas.cant === libro.boletas.cant ? 'ok' : 'warn'}`}>{caja.boletas.cant}</span></td>
                <td className="num">{clp(libro.boletas.total)}</td>
                <td className="num">{clp(caja.boletas.total)}</td>
              </tr>
              <tr>
                <td>Facturas</td>
                <td className="num">{libro.facturas.cant}</td>
                <td className="num"><span className={`jc-st ${caja.facturas.cant === libro.facturas.cant ? 'ok' : 'warn'}`}>{caja.facturas.cant}</span></td>
                <td className="num">{clp(libro.facturas.total)}</td>
                <td className="num">{clp(caja.facturas.total)}</td>
              </tr>
              <tr>
                <td>Notas de crédito</td>
                <td className="num">{libro.nc.cant}</td>
                <td className="num"><span className={`jc-st ${caja.nc.cant === libro.nc.cant ? 'ok' : 'warn'}`}>{caja.nc.cant}</span></td>
                <td className="num">{clp(libro.nc.total)}</td>
                <td className="num">{clp(caja.nc.total)}</td>
              </tr>
            </tbody>
          </table>
          {libro.rango && (
            <p className={`jc-hint ${faltantesBoletas(libro.rango, caja.boletas.folios) > 0 ? 'warn' : ''}`}>
              Boletas del sistema: folios {libro.rango.min} a {libro.rango.max}.
              {' '}{faltantesBoletas(libro.rango, caja.boletas.folios) > 0
                ? `Faltan ${faltantesBoletas(libro.rango, caja.boletas.folios)} boleta(s) por ingresar en la caja dentro de ese rango.`
                : 'Todas las boletas del rango están ingresadas en la caja.'}
            </p>
          )}
          <p className="jc-hint">Si la cantidad de la caja es menor a la del sistema, hay documentos emitidos que no se escanearon.</p>
        </div>
      )}
    </>
  );
}

function sum(obj) { return Object.values(obj || {}).reduce((a, b) => a + b, 0); }

function medioFilas(sistema, cajaMedios) {
  const orden = [...MEDIOS.map((m) => m.id), 'saldo_por_pagar'];
  const ids = new Set([...orden, ...Object.keys(sistema || {}), ...Object.keys(cajaMedios || {})]);
  const extraLabel = { saldo_por_pagar: 'Saldo por pagar (NC)' };
  const extraColor = { saldo_por_pagar: '#94A3B8' };
  return orden
    .filter((id) => ids.has(id))
    .concat([...ids].filter((id) => !orden.includes(id)))
    .map((id) => {
      const sistemaV = (sistema || {})[id] || 0;
      const cajaV = (cajaMedios || {})[id] || 0;
      if (sistemaV === 0 && cajaV === 0) return null;
      const m = MEDIOS.find((x) => x.id === id);
      return {
        id, label: m?.label || extraLabel[id] || medioLabel(id), color: m?.color || extraColor[id] || '#94A3B8',
        sistema: sistemaV, caja: cajaV, dif: cajaV - sistemaV,
      };
    })
    .filter(Boolean);
}

function faltantesBoletas(rango, folios) {
  if (!rango) return 0;
  const set = new Set((folios || []).map(Number));
  let faltan = 0;
  for (let f = rango.min; f <= rango.max; f++) if (!set.has(f)) faltan++;
  return faltan;
}
