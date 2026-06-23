// src/components/Login.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import logo from '../lib/logo';

const AZUL = '#0840D0';
const s = {
  wrap: { minHeight: '100vh', background: '#F4F6FB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", color: '#0B1220' },
  card: { background: '#fff', border: '1px solid #E4E9F2', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' },
  brand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  lbl: { display: 'block', fontSize: 12, color: '#6B7480', margin: '12px 0 4px' },
  input: { width: '100%', padding: '12px', fontSize: 15, border: '1px solid #E4E9F2', borderRadius: 9, boxSizing: 'border-box', outlineColor: AZUL },
  btn: { width: '100%', marginTop: 18, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', background: AZUL, border: 'none', borderRadius: 9, cursor: 'pointer' },
  err: { color: '#B3261E', fontSize: 13, marginTop: 12 },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function entrar() {
    if (!email.trim() || !pass) return setErr('Ingresa correo y contraseña.');
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    setBusy(false);
    if (error) setErr('Correo o contraseña incorrectos.');
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.brand}>
          <img src={logo} alt="JANO" style={{ width: 40, height: 40 }} />
          <div><b style={{ fontSize: 17 }}>JANO Repuestos</b><div style={{ fontSize: 12, color: '#6B7480' }}>Caja</div></div>
        </div>
        <label style={s.lbl}>Correo</label>
        <input style={s.input} type="email" value={email} autoFocus
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()} placeholder="nombre@janorepuestos.cl" />
        <label style={s.lbl}>Contraseña</label>
        <input style={s.input} type="password" value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()} placeholder="••••••••" />
        {err && <p style={s.err}>{err}</p>}
        <button style={s.btn} onClick={entrar} disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </div>
    </div>
  );
}
