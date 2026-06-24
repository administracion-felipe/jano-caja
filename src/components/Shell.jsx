// src/components/Shell.jsx
import { useState } from 'react';
import { CSS } from '../lib/styles';
import logo from '../lib/logo';
import CobroCaja from './CobroCaja';
import Conciliacion from './Conciliacion';
import Pagos from './Pagos';
import SaldosFavor from './SaldosFavor';
import Autorizaciones from './Autorizaciones';

const TABS = [
  { id: 'caja', label: 'Caja' },
  { id: 'conc', label: 'Conciliación' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'saldos', label: 'Saldos' },
  { id: 'autoriz', label: 'Autorizaciones' },
];

export default function Shell({ perfil, onSalir }) {
  const [tab, setTab] = useState('caja');

  return (
    <div className="jc">
      <style>{CSS}</style>
      <div className="jc-wrap">
        <div className="jc-bar">
          <div className="jc-brand">
            <img src={logo} alt="JANO Repuestos" />
            <div className="t"><b>JANO Repuestos</b><span>Caja</span></div>
          </div>
          <div className="jc-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`jc-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="jc-session">
            <span className="jc-cajero">{perfil.nombre}</span>
            <button className="jc-btn" onClick={onSalir}>Salir</button>
          </div>
        </div>
        {tab === 'caja' && <CobroCaja perfil={perfil} />}
        {tab === 'conc' && <Conciliacion />}
        {tab === 'pagos' && <Pagos perfil={perfil} />}
        {tab === 'saldos' && <SaldosFavor perfil={perfil} />}
        {tab === 'autoriz' && <Autorizaciones perfil={perfil} />}
      </div>
    </div>
  );
}
