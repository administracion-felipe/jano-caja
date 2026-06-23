// src/components/Confirm.jsx
export default function Confirm({ titulo, mensaje, onCancel, onConfirm, busy }) {
  return (
    <div className="jc-modal-bg" onClick={onCancel}>
      <div className="jc-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        {mensaje && <p>{mensaje}</p>}
        <div className="jc-row">
          <button className="jc-btn" onClick={onCancel}>Cancelar</button>
          <button className="jc-btn primary" disabled={busy} onClick={onConfirm}>{busy ? 'Guardando…' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}
