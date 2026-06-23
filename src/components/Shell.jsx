// src/components/Shell.jsx
import { useState } from 'react';
import { CSS } from '../lib/styles';
import logo from '../lib/logo';
import CobroCaja from './CobroCaja';
import Conciliacion from './Conciliacion';
import Pagos from './Pagos';
import Autorizaciones from './Autorizaciones';

export default function Shell({ perfil, onSalir }) {
  const tabs = [];
  if (perfil.puede_operar_caja) { tabs.push({ id: 'caja', label: 'Caja' }); tabs.push({ id: 'conc', label: 'Conciliación' }); }
  if (perfil.puede_operar_caja || perfil.puede_autorizar) tabs.push({ id: 'pagos', label: 'Pagos' });
  if (perfil.puede_autorizar) tabs.push({ id: 'autoriz', label: 'Autorizaciones' });
  const [tab, setTab] = useState(tabs[0]?.id);

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
            {tabs.map((t) => (
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
        {tab === 'autoriz' && <Autorizaciones perfil={perfil} />}
      </div>
    </div>
  );
}
