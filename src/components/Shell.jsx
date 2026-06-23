// src/components/Shell.jsx
import { useState } from 'react';
import { CSS } from '../lib/styles';
import logo from '../lib/logo';
import CobroCaja from './CobroCaja';
import Conciliacion from './Conciliacion';

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
            <button className={`jc-tab${tab === 'caja' ? ' on' : ''}`} onClick={() => setTab('caja')}>Caja</button>
            <button className={`jc-tab${tab === 'conc' ? ' on' : ''}`} onClick={() => setTab('conc')}>Conciliación</button>
          </div>
          <div className="jc-session">
            <span className="jc-cajero">{perfil.nombre}</span>
            <button className="jc-btn" onClick={onSalir}>Salir</button>
          </div>
        </div>
        {tab === 'caja' ? <CobroCaja perfil={perfil} /> : <Conciliacion />}
      </div>
    </div>
  );
}
