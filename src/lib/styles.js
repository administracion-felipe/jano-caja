// src/lib/styles.js
export const CSS = `
.jc { --azul:#0840D0; --azul-700:#06309C; --azul-050:#EAF0FE;
  --bg:#F4F6FB; --surface:#fff; --border:#E4E9F2; --text:#0B1220; --muted:#6B7480;
  --ok:#0F7A53; --danger:#B3261E;
  min-height:100vh; background:var(--bg); color:var(--text);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; font-variant-numeric:tabular-nums; }
.jc * { box-sizing:border-box; }
.jc-wrap { max-width:1180px; margin:0 auto; padding:16px; }

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
.jc-btn.danger:hover { background:#FBEAE9; }
.jc-btn.ok { background:#0F9D58; border-color:#0F9D58; color:#fff; font-weight:600; }
.jc-btn.ok:hover { background:#0B8043; }
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
.jc-cand { display:flex; justify-content:space-between; align-items:center; gap:10px; background:#F7F9FC; border-radius:8px; padding:8px 10px; border-left:4px solid var(--border); }
.jc-cand.santander { border-left-color:#EC0000; }
.jc-cand.bancoestado { border-left-color:#F47B20; }
.jc-cand.mercadopago { border-left-color:#00A6E0; }
.jc-bank { display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; color:#fff; white-space:nowrap; }
.jc-bank.santander { background:#EC0000; }
.jc-bank.bancoestado { background:#F47B20; }
.jc-bank.mercadopago { background:#00A6E0; }
.jc-cand .info { font-size:13px; line-height:1.35; }
.jc-cand .info b { font-weight:600; }
.jc-cand .info span { color:var(--muted); }
.jc-nomatch { font-size:12px; color:#A65A00; background:#FBF0DF; border-radius:8px; padding:8px 10px; margin:10px 0; }

.jc-modal-bg { position:fixed; inset:0; background:rgba(11,18,32,.45); display:flex; align-items:center; justify-content:center; padding:16px; z-index:50; }
.jc-modal { background:var(--surface); border-radius:14px; padding:20px; max-width:380px; width:100%; box-shadow:0 20px 50px rgba(0,0,0,.2); }
.jc-modal h3 { margin:0 0 8px; font-size:16px; }
.jc-modal p { margin:0; font-size:14px; color:var(--muted); line-height:1.4; }
.jc-editrow { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:8px; align-items:end; }

.jc-lineas { display:flex; flex-direction:column; gap:6px; margin:10px 0; }
.jc-linea { display:flex; justify-content:space-between; align-items:center; background:var(--azul-050); border-radius:8px; padding:8px 10px; font-size:14px; font-weight:600; }
.jc-x { border:none; background:transparent; color:var(--muted); cursor:pointer; font-size:14px; padding:2px 8px; line-height:1; }
.jc-x:hover { color:var(--danger); }
.jc-restante { font-size:15px; font-weight:700; margin:8px 0; }
.jc-restante.ok { color:var(--ok); }
.jc-docrow { padding:10px 0; border-bottom:1px solid #F0F2F7; }
.jc-docrow:last-child { border-bottom:none; }
.jc-docrow-head { display:flex; justify-content:space-between; gap:10px; align-items:baseline; }
.jc-docrow-lines { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }

/* Tablero enriquecido */
.jc-card-top { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.jc-ic { width:30px; height:30px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; }
.jc-card-top .lbl { font-size:12.5px; color:var(--muted); font-weight:600; margin:0; }
.jc-trend { margin-left:auto; font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px; white-space:nowrap; }
.jc-trend.up { color:#0F7A53; background:#E6F4EC; }
.jc-trend.down { color:#B3261E; background:#FBEAE9; }
.jc-card .sub { font-size:11.5px; color:var(--muted); margin-top:3px; }

.jc-two { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
@media (max-width:880px){ .jc-two{ grid-template-columns:1fr; } }

.jc-meta { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.jc-metas { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.jc-metabox { display:flex; flex-direction:column; align-items:center; text-align:center; gap:5px; }
.jc-metabox .lbl { font-size:12px; color:var(--muted); font-weight:600; margin-top:3px; }
.jc-metabox .big { font-size:18px; font-weight:800; letter-spacing:-.02em; }
.jc-metabox .sub { font-size:11.5px; color:var(--muted); }
.jc-ring.sm { width:96px; height:96px; }
.jc-ring.sm .hole { width:68px; height:68px; font-size:17px; }
.jc-meta .lbl { font-size:12px; color:var(--muted); }
.jc-meta .big { font-size:26px; font-weight:800; letter-spacing:-.02em; margin:2px 0 6px; }
.jc-meta .sub { font-size:12px; color:var(--muted); margin-top:2px; }
.jc-ring { width:116px; height:116px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.jc-ring .hole { width:84px; height:84px; border-radius:50%; background:var(--surface); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; }
.jc-progress { height:8px; background:#E6ECF5; border-radius:999px; margin-top:14px; overflow:hidden; }
.jc-progress > div { height:100%; background:var(--azul); border-radius:999px; transition:width .3s; }

.jc-dist { display:flex; align-items:center; gap:18px; }
.jc-donut { width:130px; height:130px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.jc-donut .hole { width:78px; height:78px; border-radius:50%; background:var(--surface); }
.jc-legend { flex:1; display:flex; flex-direction:column; gap:8px; min-width:0; }
.jc-legend .it { display:flex; align-items:center; gap:8px; font-size:13px; }
.jc-legend .it b { margin-left:auto; }
.jc-legend .dot { width:10px; height:10px; border-radius:50%; flex:0 0 auto; }
.jc-legend .empty { font-size:13px; color:var(--muted); }

/* Pase moderno */
.jc-card, .jc-panel { border-radius:16px; border-color:#EDF0F6; box-shadow:0 1px 2px rgba(16,24,40,.04), 0 6px 16px rgba(16,24,40,.045); }
.jc-card { transition:box-shadow .2s ease, transform .2s ease; }
.jc-card:hover { box-shadow:0 8px 22px rgba(16,24,40,.10); transform:translateY(-2px); }
.jc-bar { border-radius:16px; border-color:#EDF0F6; box-shadow:0 2px 12px rgba(16,24,40,.05); }
.jc-btn { transition:background .15s, border-color .15s, box-shadow .15s, transform .05s; }
.jc-btn:active { transform:translateY(1px); }
.jc-btn.primary { box-shadow:0 2px 8px rgba(8,64,208,.22); }
.jc-tab { transition:background .15s, color .15s; }
.jc-tab:hover { background:#F1F4FB; color:var(--text); }
.jc-ic { box-shadow:inset 0 0 0 1px rgba(0,0,0,.03); }
.jc-input, .jc-select { transition:border-color .15s, box-shadow .15s; }
.jc-st { font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; }
.jc-st.ok { color:#0F7A53; background:#E6F4EC; }
.jc-st.warn { color:#A65A00; background:#FBF0DF; }
.jc-st.bad { color:#B3261E; background:#FBEAE9; }

/* ============ Rediseño SaaS premium ============ */
.jc {
  --azul:#1E4ED8; --azul-700:#1A43B8; --azul-050:#EEF4FF; --azul-100:#DBE6FF;
  --bg:#F8FAFC; --surface:#FFFFFF; --border:#E2E8F0; --text:#0F172A; --muted:#64748B;
  --ok:#16A34A; --warn:#D97706; --danger:#DC2626;
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; -webkit-font-smoothing:antialiased;
}
.jc-shell { display:grid; grid-template-columns:248px 1fr; min-height:100vh; }
.jc-side { position:sticky; top:0; align-self:start; height:100vh; background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; padding:18px 14px; gap:6px; }
.jc-side-brand { display:flex; align-items:center; gap:11px; padding:6px 8px 16px; }
.jc-side-brand img { width:40px; height:40px; border-radius:11px; }
.jc-side-brand .t b { font-size:16px; font-weight:800; letter-spacing:-.02em; display:block; line-height:1; color:var(--text); }
.jc-side-brand .t span { font-size:11px; color:var(--muted); font-weight:600; }
.jc-side-nav { display:flex; flex-direction:column; gap:3px; flex:1; }
.jc-side-item { display:flex; align-items:center; gap:11px; padding:10px 12px; border:none; background:transparent; border-radius:11px; cursor:pointer; font-size:14.5px; font-weight:500; color:var(--muted); text-align:left; position:relative; transition:background .15s,color .15s; font-family:inherit; }
.jc-side-item:hover { background:#F1F5F9; color:var(--text); }
.jc-side-item.on { background:var(--azul-050); color:var(--azul); font-weight:600; }
.jc-side-item.on::before { content:''; position:absolute; left:-14px; top:8px; bottom:8px; width:3px; border-radius:0 3px 3px 0; background:var(--azul); }
.jc-side-user { display:flex; align-items:center; gap:10px; padding:10px 8px; border-top:1px solid var(--border); margin-top:6px; }
.jc-side-user .av { width:34px; height:34px; border-radius:50%; background:var(--azul); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex:0 0 auto; }
.jc-side-user .meta b { font-size:13.5px; display:block; line-height:1.1; }
.jc-side-user .meta span { font-size:11.5px; color:var(--muted); }
.jc-main { min-width:0; display:flex; flex-direction:column; }
.jc-head { position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:12px; background:rgba(248,250,252,.85); backdrop-filter:blur(8px); border-bottom:1px solid var(--border); padding:16px 28px; }
.jc-head-title { font-size:21px; font-weight:800; letter-spacing:-.02em; }
.jc-head-right { display:flex; align-items:center; gap:14px; }
.jc-caja-state { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:var(--danger); background:#FEF2F2; padding:6px 12px; border-radius:999px; }
.jc-caja-state.on { color:var(--ok); background:#F0FDF4; }
.jc-caja-state .dot { width:8px; height:8px; border-radius:50%; background:currentColor; }
.jc-head-user { font-size:14px; font-weight:600; color:var(--text); }
.jc-content { padding:28px; max-width:1320px; width:100%; }
.jc-card, .jc-panel { border-radius:20px; border:1px solid var(--border); box-shadow:0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.04); }
.jc-card { padding:18px; transition:box-shadow .2s ease, transform .2s ease, border-color .2s; }
.jc-card:hover { box-shadow:0 10px 30px rgba(15,23,42,.10); transform:translateY(-2px); border-color:#D5DEEA; }
.jc-panel { padding:22px; }
.jc-panel h2 { font-size:15px; font-weight:700; letter-spacing:-.01em; }
.jc-card .val { font-size:25px; font-weight:800; letter-spacing:-.03em; }
.jc-cards { gap:14px; }
.jc-grid { gap:18px; }
.jc-two { gap:18px; }
.jc-btn { border-radius:11px; font-weight:600; font-family:inherit; }
.jc-btn.primary { background:var(--azul); border-color:var(--azul); box-shadow:0 2px 8px rgba(30,78,216,.25); }
.jc-btn.primary:hover { background:var(--azul-700); }
.jc-btn.ok { background:var(--ok); border-color:var(--ok); }
.jc-btn.ok:hover { background:#15803D; }
.jc-btn.danger { color:var(--danger); border-color:#FBD5D5; }
.jc-input, .jc-select { border-radius:11px; }
.jc-input:focus, .jc-select:focus { border-color:var(--azul); box-shadow:0 0 0 3px var(--azul-050); }
.jc-table th { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); font-weight:600; }
.jc-table td, .jc-table th { padding:11px 8px; }
.jc-table tbody tr { transition:background .12s; }
.jc-table tbody tr:hover { background:#F8FAFC; }
.jc-st { font-weight:600; }
.jc-st.ok { color:#15803D; background:#DCFCE7; }
.jc-st.warn { color:#B45309; background:#FEF3C7; }
.jc-st.bad { color:#B91C1C; background:#FEE2E2; }
.jc-alert { border-radius:12px; padding:12px 14px; font-size:13.5px; font-weight:600; margin:6px 0 12px; line-height:1.4; border:1px solid transparent; }
.jc-alert.danger { color:#991B1B; background:#FEF2F2; border-color:#FECACA; }
.jc-alert.warn { color:#92400E; background:#FFFBEB; border-color:#FDE68A; }
.jc-hint.warn { color:#B45309; font-weight:600; }
.jc-daytot { font-size:13.5px; color:var(--muted); font-weight:500; white-space:nowrap; }
.jc-daytot b { color:var(--text); font-weight:800; letter-spacing:-.01em; }
.jc-sumstrip { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:6px; }
.jc-sumpill { display:inline-flex; flex-direction:column; gap:1px; background:#F1F5F9; border:1px solid var(--border); border-radius:10px; padding:6px 11px; min-width:96px; }
.jc-sumpill i { font-style:normal; font-size:11px; color:var(--muted); font-weight:600; }
.jc-sumpill b { font-size:14px; font-weight:800; letter-spacing:-.01em; color:var(--text); }
.jc-doclist { max-height:560px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px; }
.jc-doclist::-webkit-scrollbar { width:8px; }
.jc-doclist::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:8px; }
.jc-tag { background:#F1F5F9; color:#334155; border-radius:8px; padding:4px 9px; font-size:12px; font-weight:500; }
.jc-badge { background:var(--azul-050); color:var(--azul); }
.jc-scan { border:2px dashed #CBD7E6; border-radius:18px; background:#FBFCFE; padding:30px 20px; text-align:center; transition:border-color .2s, background .2s; }
.jc-scan:focus-within { border-color:var(--azul); background:var(--azul-050); }
.jc-scan-ic { width:58px; height:58px; border-radius:16px; margin:0 auto 14px; display:flex; align-items:center; justify-content:center; background:var(--azul-050); color:var(--azul); }
.jc-scan-title { font-size:16px; font-weight:700; letter-spacing:-.01em; }
.jc-scan-sub { font-size:13px; color:var(--muted); margin-top:3px; }
.jc-scan-input { width:100%; margin-top:16px; text-align:center; padding:11px 12px; font-size:14px; border:1px solid var(--border); border-radius:11px; background:#fff; color:var(--text); outline:none; font-family:inherit; }
.jc-scan-input:focus { border-color:var(--azul); box-shadow:0 0 0 3px var(--azul-050); }
@media (max-width:860px){
  .jc-shell { grid-template-columns:1fr; }
  .jc-side { position:static; height:auto; flex-direction:row; align-items:center; overflow-x:auto; padding:10px 12px; gap:8px; border-right:none; border-bottom:1px solid var(--border); }
  .jc-side-brand { padding:0 8px 0 4px; flex:0 0 auto; }
  .jc-side-brand .t { display:none; }
  .jc-side-nav { flex-direction:row; flex:1; gap:4px; }
  .jc-side-item { white-space:nowrap; padding:8px 11px; }
  .jc-side-item.on::before { display:none; }
  .jc-side-item span { display:none; }
  .jc-side-user { display:none; }
  .jc-head { padding:14px 18px; }
  .jc-head-title { font-size:18px; }
  .jc-head-user { display:none; }
  .jc-content { padding:16px; }
}
`;
