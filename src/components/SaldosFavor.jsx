// src/components/SaldosFavor.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const MEDIOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'webpay', label: 'Webpay' },
  { id: 'credito_cta_cte', label: 'Crédito' },
];
const medioLabel = (id) => MEDIOS.find((m) => m.id === id)?.label ?? (id || '—');

export default function SaldosFavor({ perfil }) {
  const [saldos, setSaldos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState('efectivo');
  const [origen, setOrigen] = useState('');
  const [nota, setNota] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from('saldos_favor').select('*').order('creado_en', { ascending: false });
    setSaldos(data || []); setCargando(false);
  }

  async function crear() {
    const m = Number(monto) || 0;
    if (m <= 0) return setMsg({ tipo: 'error', txt: 'Ingresa un monto válido.' });
    if (!rut.trim() && !nombre.trim()) return setMsg({ tipo: 'error', txt: 'Indica el cliente (nombre o RUT).' });
    setBusy(true);
    const { data, error } = await supabase.from('saldos_favor').insert({
      cliente_nombre: nombre || null, cliente_rut: rut || null, monto: m, saldo: m,
      medio_pago: medio, documento_origen: origen || null, nota: nota || null, creado_por: perfil.nombre,
    }).select().single();
    setBusy(false);
    if (error) return setMsg({ tipo: 'error', txt: error.message });
    setSaldos((prev) => [data, ...prev]);
    setNombre(''); setRut(''); setMonto(''); setMedio('efectivo'); setOrigen(''); setNota(''); setCreando(false);
    setMsg({ tipo: 'ok', txt: 'Saldo a favor registrado.' });
  }

  if (cargando) return <p className="jc-cajero">Cargando…</p>;

  const disponibles = saldos.filter((s) => s.estado === 'disponible' && s.saldo > 0);
  const totalDisponible = disponibles.reduce((s, x) => s + x.saldo, 0);

  return (
    <>
      <div className="jc-cards">
        <div className="jc-card hero"><div className="lbl">Saldo a favor disponible</div><div className="val">{clp(totalDisponible)}</div></div>
        <div className="jc-card"><div className="lbl">Clientes con saldo</div><div className="val">{disponibles.length}</div></div>
      </div>

      <div className="jc-panel">
        <div className="jc-substrip">
          <h2>Saldos a favor</h2>
          <button className="jc-btn sm" onClick={() => { setCreando(!creando); setMsg(null); }}>
            {creando ? 'Cancelar' : 'Registrar saldo'}
          </button>
        </div>

        {creando && (
          <div style={{ marginBottom: 14 }}>
            <p className="jc-hint" style={{ marginTop: 0 }}>En boleta, anota el nombre y RUT del cliente. En factura, usa los datos del documento.</p>
            <div className="jc-editrow">
              <div><label className="jc-lbl">Nombre cliente</label><input className="jc-input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
              <div><label className="jc-lbl">RUT cliente</label><input className="jc-input" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" /></div>
              <div><label className="jc-lbl">Monto</label><input className="jc-input" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
              <div>
                <label className="jc-lbl">Medio de pago original</label>
                <select className="jc-select" value={medio} onChange={(e) => setMedio(e.target.value)}>
                  {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div><label className="jc-lbl">Documento origen</label><input className="jc-input" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Folio anulado" /></div>
            </div>
            <label className="jc-lbl">Nota (opcional)</label>
            <input className="jc-input" value={nota} onChange={(e) => setNota(e.target.value)} />
            <div className="jc-row">
              <button className="jc-btn primary" disabled={busy} onClick={crear}>{busy ? 'Guardando…' : 'Registrar saldo a favor'}</button>
            </div>
          </div>
        )}
        {msg && <p className={`jc-msg ${msg.tipo}`}>{msg.txt}</p>}

        {saldos.length === 0 ? (
          <div className="jc-empty">No hay saldos a favor registrados.</div>
        ) : (
          <table className="jc-table">
            <thead><tr><th>Cliente</th><th>RUT</th><th>Medio</th><th>Origen</th><th className="num">Original</th><th className="num">Disponible</th><th>Estado</th></tr></thead>
            <tbody>
              {saldos.map((s) => (
                <tr key={s.id}>
                  <td>{s.cliente_nombre || '—'}{s.nota && <span className="jc-sub">{s.nota}</span>}</td>
                  <td>{s.cliente_rut || '—'}</td>
                  <td>{medioLabel(s.medio_pago)}</td>
                  <td>{s.documento_origen || '—'}</td>
                  <td className="num">{clp(s.monto)}</td>
                  <td className="num">{clp(s.saldo)}</td>
                  <td><span className={`jc-st ${s.saldo > 0 && s.estado === 'disponible' ? 'ok' : 'warn'}`}>{s.saldo > 0 && s.estado === 'disponible' ? 'Disponible' : 'Agotado'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
