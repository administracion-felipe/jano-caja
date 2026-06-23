// src/lib/styles.js
export const CSS = `
.jc { --azul:#0840D0; --azul-700:#06309C; --azul-050:#EAF0FE;
  --bg:#F4F6FB; --surface:#fff; --border:#E4E9F2; --text:#0B1220; --muted:#6B7480;
  --ok:#0F7A53; --danger:#B3261E;
  min-height:100vh; background:var(--bg); color:var(--text);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; font-variant-numeric:tabular-nums; }
.jc * { box-sizing:border-box; }
.jc-wrap { max-width:1080px; margin:0 auto; padding:16px; }

.jc-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:12px 16px; margin-bottom:16px; }
.jc-brand { display:flex; align-items:center; gap:12px; }
.jc-brand img { width:38px; height:38px; display:block; }
.jc-brand .t b { font-size:17px; letter-spacing:-0.01em; }
.jc-brand .t span { display:block; font-size:12px; color:var(--muted); }
.jc-tabs { display:flex; gap:4px; flex-wrap:wrap; }
.jc-tab { padding:8px 14px; border:none; background:transparent; border-radius:8px; cursor:pointer; font-size:14px; color:var(--muted); }
.jc-tab.on { background:var(--azul-050); color:var(--azul); font-weight:600; }
.jc-session { display:flex; align-items:center; gap:12px; }
.jc-badge { font-size:12px; font-weight:600; padding:4px 10px; border-radius:999px; background:var(--azul-050); color:var(--azul); }
.jc-cajero { font-size:13px; color:var(--muted); }

.jc-substrip { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
.jc-substrip h2 { font-size:14px; margin:0; font-weight:600; }

.jc-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:16px; }
.jc-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; }
.jc-card.hero { background:var(--azul); border-color:var(--azul); color:#fff; }
.jc-card .lbl { font-size:12px; color:var(--muted); margin-bottom:6px; }
.jc-card.hero .lbl { color:rgba(255,255,255,.85); }
.jc-card .val { font-size:22px; font-weight:700; letter-spacing:-0.02em; }

.jc-grid { display:grid; grid-template-columns:380px 1fr; gap:16px; align-items:start; }
@media (max-width:880px){ .jc-grid{ grid-template-columns:1fr; } }

.jc-panel { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; }
.jc-panel h2 { font-size:14px; margin:0 0 12px; font-weight:600; }
.jc-lbl { display:block; font-size:12px; color:var(--muted); margin:10px 0 4px; }
.jc-input, .jc-select { width:100%; padding:11px 12px; font-size:15px; border:1px solid var(--border); border-radius:9px;
  background:#fff; color:var(--text); outline:none; }
.jc-input:focus, .jc-select:focus { border-color:var(--azul); box-shadow:0 0 0 3px var(--azul-050); }

.jc-doc .meta { font-size:12px; color:var(--muted); }
.jc-doc .cliente { font-size:15px; font-weight:600; margin:2px 0; }
.jc-doc .monto { font-size:34px; font-weight:800; letter-spacing:-0.02em; margin:8px 0 14px; }

.jc-medios { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.jc-medio { padding:12px; font-size:14px; border:1px solid var(--border); border-radius:9px; background:#fff; cursor:pointer; color:var(--text); }
.jc-medio:hover { border-color:var(--azul); }
.jc-medio.on { border:2px solid var(--azul); background:var(--azul-050); color:var(--azul-700); font-weight:600; }
.jc-vuelto { margin-top:10px; font-size:18px; font-weight:700; }

.jc-row { display:flex; gap:8px; margin-top:14px; }
.jc-btn { padding:12px 16px; font-size:15px; border-radius:9px; cursor:pointer; border:1px solid var(--border); background:#fff; color:var(--text); }
.jc-btn.primary { flex:1; background:var(--azul); border-color:var(--azul); color:#fff; font-weight:600; }
.jc-btn.primary:hover { background:var(--azul-700); }
.jc-btn.sm { padding:8px 12px; font-size:13px; flex:0 0 auto; }
.jc-btn.danger { color:var(--danger); border-color:#F2C9C6; }
.jc-btn:disabled { opacity:.5; cursor:default; }
.jc-acts { display:flex; gap:6px; justify-content:flex-end; }

.jc-table { width:100%; border-collapse:collapse; font-size:13px; }
.jc-table th { text-align:left; font-weight:600; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.03em; padding:8px 10px; border-bottom:1px solid var(--border); }
.jc-table td { padding:10px; border-bottom:1px solid #F0F2F7; vertical-align:middle; }
.jc-table tr:last-child td { border-bottom:none; }
.jc-table .num { text-align:right; font-weight:600; }
.jc-sub { display:block; font-size:11px; color:var(--muted); margin-top:2px; }
.jc-empty { padding:28px 10px; text-align:center; color:var(--muted); font-size:13px; }
.jc-tag { font-size:11px; font-weight:600; padding:3px 8px; border-radius:999px; background:#EEF1F7; color:#46506A; }

.jc-st { font-size:11px; font-weight:600; padding:3px 8px; border-radius:999px; white-space:nowrap; }
.jc-st.ok { background:#E6F4EE; color:#0F7A53; }
.jc-st.warn { background:#FBF0DF; color:#A65A00; }
.jc-st.bad { background:#FBEAE9; color:#B3261E; }

.jc-msg { margin-top:12px; font-size:13px; }
.jc-msg.ok { color:var(--ok); } .jc-msg.error { color:var(--danger); }
.jc-open { max-width:420px; margin:8vh auto 0; }
.jc-hint { font-size:12px; color:var(--muted); margin-top:4px; }

.jc-conflist { display:flex; flex-direction:column; gap:12px; }
.jc-confcard { border:1px solid var(--border); border-radius:12px; padding:12px 14px; }
.jc-confhead { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.jc-confhead .who { font-size:14px; font-weight:600; }
.jc-confhead .monto { font-size:18px; font-weight:700; letter-spacing:-0.01em; }
.jc-cands { display:flex; flex-direction:column; gap:6px; margin:10px 0; }
.jc-cands .lbl { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.03em; margin-bottom:2px; }
.jc-cand { display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--azul-050); border-radius:8px; padding:8px 10px; }
.jc-cand .info { font-size:13px; line-height:1.35; }
.jc-cand .info b { font-weight:600; }
.jc-cand .info span { color:var(--muted); }
.jc-nomatch { font-size:12px; color:#A65A00; background:#FBF0DF; border-radius:8px; padding:8px 10px; margin:10px 0; }
`;
