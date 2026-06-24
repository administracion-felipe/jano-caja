// src/components/Shell.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CSS } from '../lib/styles';
import logo from '../lib/logo';
import CobroCaja from './CobroCaja';
import Conciliacion from './Conciliacion';
import Historial from './Historial';
import Pagos from './Pagos';
import SaldosFavor from './SaldosFavor';
import Autorizaciones from './Autorizaciones';
import Configuracion from './Configuracion';

const ICON = {
  caja: 'M3 7h18v12H3z M3 11h18 M7 15h4',
  conc: 'M21 6L10 17l-5-5 M3 12h2',
  historial: 'M12 8v4l3 2 M3 12a9 9 0 1018 0 9 9 0 00-18 0',
  pagos: 'M3 9l9-5 9 5 M5 9v8 M19 9v8 M3 20h18 M10 13v2 M14 13v2',
  saldos: 'M3 7a2 2 0 012-2h12l2 3v9a2 2 0 01-2 2H5a2 2 0 01-2-2z M16 12h3',
  autoriz: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z M9 12l2 2 4-4',
  config: 'M4 21v-6 M4 11V3 M12 21v-8 M12 9V3 M20 21v-4 M20 13V3 M1 15h6 M9 9h6 M17 17h6',
};
function Ico({ name }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON[name]} />
    </svg>
  );
}

const TABS = [
  { id: 'caja', label: 'Caja', titulo: 'Caja Operativa' },
  { id: 'conc', label: 'Conciliación', titulo: 'Conciliación' },
  { id: 'historial', label: 'Historial', titulo: 'Historial de cajas' },
  { id: 'pagos', label: 'Pagos', titulo: 'Pagos' },
  { id: 'saldos', label: 'Saldos', titulo: 'Saldos a favor' },
  { id: 'autoriz', label: 'Autorizaciones', titulo: 'Autorizaciones' },
  { id: 'config', label: 'Configuración', titulo: 'Configuración' },
];

export default function Shell({ perfil, onSalir }) {
  const [tab, setTab] = useState('caja');
  const [caja, setCaja] = useState(null);

  useEffect(() => {
    supabase.from('caja_sesiones').select('id,cajero,abierta_en').eq('estado', 'abierta')
      .order('abierta_en', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setCaja(data ?? null));
  }, [tab]);

  const actual = TABS.find((t) => t.id === tab) || TABS[0];

  return (
    <div className="jc">
      <style>{CSS}</style>
      <div className="jc-shell">
        <aside className="jc-side">
          <div className="jc-side-brand">
            <img src={logo} alt="JANO Repuestos" />
            <div className="t"><b>JANO</b><span>Repuestos</span></div>
          </div>
          <nav className="jc-side-nav">
            {TABS.map((t) => (
              <button key={t.id} className={`jc-side-item${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                <Ico name={t.id === 'autoriz' ? 'autoriz' : t.id} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="jc-side-user">
            <div className="av">{(perfil.nombre || '?').slice(0, 1).toUpperCase()}</div>
            <div className="meta"><b>{perfil.nombre}</b><span>{perfil.puede_autorizar ? 'Autorizador' : 'Cajero'}</span></div>
          </div>
        </aside>

        <div className="jc-main">
          <header className="jc-head">
            <div className="jc-head-title">{actual.titulo}</div>
            <div className="jc-head-right">
              <span className={`jc-caja-state${caja ? ' on' : ''}`}>
                <span className="dot" />{caja ? 'Caja abierta' : 'Caja cerrada'}
              </span>
              <span className="jc-head-user">{perfil.nombre}</span>
              <button className="jc-btn sm" onClick={onSalir}>Salir</button>
            </div>
          </header>

          <div className="jc-content">
            {tab === 'caja' && <CobroCaja perfil={perfil} />}
            {tab === 'conc' && <Conciliacion />}
            {tab === 'historial' && <Historial />}
            {tab === 'pagos' && <Pagos perfil={perfil} />}
            {tab === 'saldos' && <SaldosFavor perfil={perfil} />}
            {tab === 'autoriz' && <Autorizaciones perfil={perfil} />}
            {tab === 'config' && <Configuracion perfil={perfil} />}
          </div>
        </div>
      </div>
    </div>
  );
}
