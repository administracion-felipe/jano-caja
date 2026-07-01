-- ============================================================
-- Mejoras "día 0" — cambios ADITIVOS y seguros.
-- Ejecutar una vez en Supabase → SQL Editor.
-- Todo es "if not exists" / "do nothing": no borra ni altera datos.
-- La app funciona con o sin esto (tiene respaldo), pero con esto
-- se guarda la observación y el estado de cuadratura de cada cierre.
-- ============================================================

-- 1. Observación y estado de cuadratura en el cierre de caja.
alter table caja_sesiones add column if not exists observacion       text;
alter table caja_sesiones add column if not exists estado_cuadratura text;  -- cuadrada / sobrante / faltante

-- 2. Umbral del aviso de efectivo alto (también se puede ajustar desde Configuración).
insert into configuracion (clave, valor)
values ('alerta_efectivo', '2000000')
on conflict (clave) do nothing;
