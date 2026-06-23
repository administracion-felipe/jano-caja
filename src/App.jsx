// src/App.jsx
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Shell from './components/Shell';
import logo from './lib/logo';

const wrap = { minHeight: '100vh', background: '#F4F6FB', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", color: '#0B1220', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const card = { background: '#fff', border: '1px solid #E4E9F2', borderRadius: 14, padding: 24, maxWidth: 420, width: '100%', textAlign: 'center' };
const btn = { marginTop: 16, padding: '10px 16px', border: '1px solid #E4E9F2', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 14 };

function Aviso({ titulo, texto, onSalir }) {
  return (
    <div style={wrap}><div style={card}>
      <img src={logo} alt="JANO" style={{ width: 44, height: 44 }} />
      <h2 style={{ fontSize: 18, margin: '12px 0 6px' }}>{titulo}</h2>
      <p style={{ color: '#6B7480', fontSize: 14, margin: 0 }}>{texto}</p>
      <button style={btn} onClick={onSalir}>Cerrar sesión</button>
    </div></div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setPerfil(null); setCargando(false); return; }
    setCargando(true);
    supabase.from('perfiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { setPerfil(data); setCargando(false); });
  }, [session]);

  const salir = () => supabase.auth.signOut();

  if (!session) return <Login />;
  if (cargando) return <div style={wrap}><div style={card}>Cargando…</div></div>;
  if (!perfil || !perfil.activo) {
    return <Aviso titulo="Sin perfil asignado"
      texto="Tu usuario aún no tiene un perfil activo. Avisa al administrador." onSalir={salir} />;
  }
  if (!perfil.puede_operar_caja) {
    return <Aviso titulo={`Hola, ${perfil.nombre}`}
      texto="Tu perfil es de autorización. Esas funciones (confirmar transferencias y autorizar retiros) se habilitarán en el próximo paso."
      onSalir={salir} />;
  }
  return <Shell perfil={perfil} onSalir={salir} />;
}
