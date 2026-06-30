// src/components/PlanillaCaja.jsx
// Vista tipo planilla (parecida al Excel de la cajera): una fila por documento,
// una columna por medio de pago, totales (sumatoria) y filtros para buscar descuadres.
import { useMemo, useState } from 'react';
import { MEDIOS, medioLabel } from '../lib/medios';
import { clienteDisplay } from '../lib/parseTimbre';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
const hora = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';

const TIPO = { 33: 'Factura', 34: 'Factura exenta', 39: 'Boleta', 41: 'Boleta exenta', 61: 'Nota de crédito' };
const tipoLabel = (t) => TIPO[t] || `Tipo ${t}`;
const esNC = (t) => t === 61;
const esBoleta = (t) => t === 39 || t === 41;
const esFactura = (t) => t === 33 || t === 34;

export default function PlanillaCaja({ cobros, retiros, sesion, fondoBase, onEditar }) {
  const [q, setQ] = useState('');
  const [fTipo, setFTipo] = useState('todos');
  const [fMedio, setFMedio] = useState('todos');

  // Agrupar cobros por documento (folio), con desglose por medio.
  const grupos = useMemo(() => {
    const g = {};
    cobros.forEach((c) => {
      const k = `${c.tipo_dte}-${c.folio}`;
      if (!g[k]) g[k] = {
        tipo_dte: c.tipo_dte, folio: c.folio, cliente: c.cliente, descripcion: c.descripcion,
        fuera_horario: c.fuera_horario, emitido_en: c.emitido_en, creado_en: c.creado_en,
        lineas: [], total: 0, medios: {}, porConfirmar: false,
      };
      g[k].lineas.push(c);
      g[k].total += c.monto;
      g[k].medios[c.medio_pago] = (g[k].medios[c.medio_pago] || 0) + c.monto;
      if (c.estado_pago === 'por_confirmar') g[k].porConfirmar = true;
      if (c.creado_en && (!g[k].creado_en || c.creado_en < g[k].creado_en)) g[k].creado_en = c.creado_en;
    });
    return Object.values(g).sort((a, b) => String(a.creado_en).localeCompare(String(b.creado_en)));
  }, [cobros]);

  // Sólo columnas de medio con movimiento (para que la tabla no sea infinita).
  const mediosActivos = useMemo(
    () => MEDIOS.filter((m) => grupos.some((g) => (g.medios[m.id] || 0) !== 0)),
    [grupos]
  );

  const filtrados = grupos.filter((g) => {
    const t = q.trim().toLowerCase();
    if (t && !(String(g.folio).includes(t) || (g.cliente || '').toLowerCase().includes(t))) return false;
    if (fTipo === 'boleta' && !esBoleta(g.tipo_dte)) return false;
    if (fTipo === 'factura' && !esFactura(g.tipo_dte)) return false;
    if (fTipo === 'nc' && !esNC(g.tipo_dte)) return false;
    if (fMedio !== 'todos' && !g.medios[fMedio]) return false;
    return true;
  });

  // Totales (sumatoria) sobre lo filtrado.
  const totMedio = {};
  MEDIOS.forEach((m) => { totMedio[m.id] = filtrados.reduce((a, g) => a + (g.medios[m.id] || 0), 0); });
  const totalGeneral = filtrados.reduce((a, g) => a + g.total, 0);

  // Cuadre de efectivo (ayuda a detectar descuadres).
  const efectivoVentas = grupos.reduce(
    (a, g) => a + g.lineas.filter((l) => l.medio_pago === 'efectivo' && l.monto > 0 && !l.saldo_id).reduce((s, l) => s + l.monto, 0),
    0
  );
  const retAut = (retiros || []).filter((r) => r.estado === 'autorizado').reduce((a, r) => a + r.monto, 0);
  const fondo = sesion?.fondo_inicial || 0;
  const efectivoEsperado = fondo + efectivoVentas - retAut;
  const enContra = efectivoEsperado < 0;
  const bajoBase = efectivoEsperado < fondoBase;

  const limpiar = () => { setQ(''); setFTipo('todos'); setFMedio('todos'); };
  const hayFiltro = q.trim() || fTipo !== 'todos' || fMedio !== 'todos';

  return (
    <>
      {/* Cuadre de efectivo */}
      <div className="jc-cuadre">
        <div className="it"><span>Fondo inicial</span><b>{clp(fondo)}</b></div>
        <div className="op">+</div>
        <div className="it"><span>Efectivo (ventas)</span><b>{clp(efectivoVentas)}</b></div>
        <div className="op">−</div>
        <div className="it"><span>Retiros autorizados</span><b>{clp(retAut)}</b></div>
        <div className="op">=</div>
        <div className={`it total ${enContra ? 'bad' : bajoBase ? 'warn' : 'ok'}`}>
          <span>Efectivo esperado</span><b>{clp(efectivoEsperado)}</b>
        </div>
      </div>
      {enContra && <div className="jc-alert danger">⚠ El efectivo esperado quedó negativo. Hay un descuadre: revisa retiros y cobros en efectivo.</div>}
      {!enContra && bajoBase && <div className="jc-alert warn">El efectivo esperado está bajo el fondo base de {clp(fondoBase)}.</div>}

      {/* Filtros */}
      <div className="jc-panel" style={{ marginBottom: 14 }}>
        <div className="jc-pfiltros">
          <input className="jc-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar folio o cliente…" />
          <select className="jc-select" value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
            <option value="todos">Todos los documentos</option>
            <option value="boleta">Boletas</option>
            <option value="factura">Facturas</option>
            <option value="nc">Notas de crédito</option>
          </select>
          <select className="jc-select" value={fMedio} onChange={(e) => setFMedio(e.target.value)}>
            <option value="todos">Todas las formas de pago</option>
            {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {hayFiltro && <button className="jc-btn sm" onClick={limpiar}>Limpiar</button>}
        </div>
        <p className="jc-hint" style={{ marginTop: 8 }}>
          {filtrados.length} documento(s) · Total {clp(totalGeneral)}
          {hayFiltro ? ' (filtrado)' : ''}
        </p>
      </div>

      {/* Planilla */}
      <div className="jc-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="jc-planilla-wrap">
          <table className="jc-ptable">
            <thead>
              <tr>
                <th className="folio">Folio</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th className="hora">Hora</th>
                {mediosActivos.map((m) => (
                  <th key={m.id} className="num"><span className="jc-medio-dot" style={{ background: m.color }} />{m.label}</th>
                ))}
                <th className="num total">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={5 + mediosActivos.length} className="vacio">No hay documentos que coincidan.</td></tr>
              ) : (
                filtrados.map((g) => (
                  <tr key={`${g.tipo_dte}-${g.folio}`} className={esNC(g.tipo_dte) ? 'nc' : ''}>
                    <td className="folio"><b>{g.folio}</b></td>
                    <td>
                      <span className={`jc-st ${esNC(g.tipo_dte) ? 'bad' : esFactura(g.tipo_dte) ? 'ok' : ''}`}>{tipoLabel(g.tipo_dte)}</span>
                      {g.fuera_horario && <span className="jc-st warn" style={{ marginLeft: 4 }}>Fuera hor.</span>}
                      {g.porConfirmar && <span className="jc-st warn" style={{ marginLeft: 4 }}>Por confirmar</span>}
                    </td>
                    <td className="cli">{clienteDisplay(g.cliente)}{g.descripcion && <span className="jc-sub">{g.descripcion}</span>}</td>
                    <td className="hora">{hora(g.creado_en)}</td>
                    {mediosActivos.map((m) => (
                      <td key={m.id} className="num">{g.medios[m.id] ? clp(g.medios[m.id]) : <span className="cero">·</span>}</td>
                    ))}
                    <td className="num total"><b>{clp(g.total)}</b></td>
                    <td><button className="jc-btn sm" onClick={() => onEditar(g)}>Editar</button></td>
                  </tr>
                ))
              )}
            </tbody>
            {filtrados.length > 0 && (
              <tfoot>
                <tr className="sumatoria">
                  <td className="folio">Σ</td>
                  <td colSpan={3}>Sumatoria</td>
                  {mediosActivos.map((m) => (
                    <td key={m.id} className="num">{totMedio[m.id] ? clp(totMedio[m.id]) : <span className="cero">·</span>}</td>
                  ))}
                  <td className="num total"><b>{clp(totalGeneral)}</b></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Retiros, gastos y devoluciones */}
      <div className="jc-panel" style={{ marginTop: 14 }}>
        <h2>Retiros, gastos y devoluciones</h2>
        {(retiros || []).length === 0 ? (
          <div className="jc-empty">Sin movimientos de efectivo en este turno.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th className="num">Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {retiros.map((r) => (
                <tr key={r.id}>
                  <td>{hora(r.creado_en)}</td>
                  <td>{r.motivo || '—'}</td>
                  <td>{r.descripcion || '—'}{r.nota && <span className="jc-sub">{r.nota}</span>}</td>
                  <td className="num">{clp(r.monto)}</td>
                  <td><span className={`jc-st ${r.estado === 'autorizado' ? 'ok' : r.estado === 'rechazado' ? 'bad' : 'warn'}`}>{r.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
