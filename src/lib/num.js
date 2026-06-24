// src/lib/num.js
// Helpers para que los montos se escriban con separador de miles (estilo chileno: 80.000).

// Deja solo dígitos (quita puntos, espacios, etc.).
export const soloDigitos = (s) => String(s ?? '').replace(/[^\d]/g, '');

// Formatea un valor con separador de miles: "80000" -> "80.000".
export const fmtMiles = (s) => {
  const d = soloDigitos(s);
  return d ? Number(d).toLocaleString('es-CL') : '';
};
