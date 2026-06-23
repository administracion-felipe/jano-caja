-- ============================================================
-- Capa de datos central JANO — núcleo Caja
-- Postgres / Supabase
-- ------------------------------------------------------------
-- Idea: la emisión la sigue haciendo el sistema del vendedor (acesl).
-- Esta capa solo REGISTRA (cobros) y CONCILIA (documentos del SII vs cobros).
-- Clave de cruce en todo el modelo: (tipo_dte, folio) -> evita falsos positivos.
-- ============================================================

-- 1. documentos: verdad a nivel documento.
--    Se crea al escanear el timbre (PDF417) en el cobro,
--    y se confirma de forma asíncrona desde el RCV del SII.
create table if not exists documentos (
  id              bigint generated always as identity primary key,
  tipo_dte        smallint not null,              -- 33 factura, 39 boleta, 61 NC...
  folio           integer  not null,
  rut_emisor      text     not null default '78155468-5',
  rut_receptor    text,                           -- null en boletas a consumidor final
  razon_receptor  text,
  fecha_emision   date,
  neto            integer,
  iva             integer,
  total           integer  not null,
  vendedor        text,
  canal           text     default 'mostrador',   -- mostrador / web / ml
  forma_pago      text,                           -- contado_efectivo / contado_tarjeta /
                                                  -- contado_transferencia / credito_cta_cte
  estado_sii      text     default 'pendiente',   -- pendiente / confirmado / no_encontrado
  origen          text     default 'timbre',      -- timbre / rcv / pos
  creado_en       timestamptz default now(),
  constraint uq_documento unique (tipo_dte, folio)
);

-- 2. documento_lineas: detalle SKU. Viene del export del POS (el SII no lo entrega).
--    Sin FK dura para tolerar que el export llegue antes o después del escaneo;
--    se une por (tipo_dte, folio).
create table if not exists documento_lineas (
  id            bigint generated always as identity primary key,
  tipo_dte      smallint not null,
  folio         integer  not null,
  sku           text,
  descripcion   text,
  cantidad      numeric,
  precio_unit   integer,
  total_linea   integer
);
create index if not exists ix_lineas_doc on documento_lineas (tipo_dte, folio);

-- 3. caja_sesiones: turno de caja (apertura -> cierre).
create table if not exists caja_sesiones (
  id                   bigint generated always as identity primary key,
  cajero               text not null,
  caja                 text default 'principal',
  fondo_inicial        integer default 0,
  abierta_en           timestamptz default now(),
  cerrada_en           timestamptz,
  total_efectivo       integer,
  total_tarjeta        integer,
  total_transferencia  integer,
  arqueo_efectivo      integer,                    -- efectivo contado al cierre
  diferencia           integer,                    -- arqueo - esperado
  estado               text default 'abierta'      -- abierta / cerrada
);

-- 4. cobros: cada documento que pasa por caja.
--    Los de crédito quedan registrados pero NO suman al efectivo del cajón.
create table if not exists cobros (
  id            bigint generated always as identity primary key,
  sesion_id     bigint references caja_sesiones(id),
  tipo_dte      smallint not null,
  folio         integer  not null,
  monto         integer  not null,
  medio_pago    text     not null,                 -- efectivo / tarjeta / transferencia / credito_cta_cte
  vuelto        integer  default 0,
  cajero        text,
  creado_en     timestamptz default now()
);
create index if not exists ix_cobros_doc on cobros (tipo_dte, folio);

-- ============================================================
-- Vista de conciliación: cruza documentos (SII/timbre) vs cobros (caja)
-- por la clave compuesta tipo+folio.
-- ============================================================
create or replace view conciliacion as
select
  coalesce(d.tipo_dte, c.tipo_dte)  as tipo_dte,
  coalesce(d.folio, c.folio)        as folio,
  d.total                           as monto_documento,
  c.monto                           as monto_cobrado,
  d.forma_pago,
  d.estado_sii,
  case
    when c.id is null               then 'sin_cobro'        -- emitido, no pasó por caja
    when d.id is null               then 'sin_documento'    -- cobro sin documento -> revisar
    when d.total <> c.monto         then 'monto_no_calza'
    else 'ok'
  end                               as estado_conciliacion
from documentos d
full outer join cobros c
  on c.tipo_dte = d.tipo_dte
 and c.folio    = d.folio;
