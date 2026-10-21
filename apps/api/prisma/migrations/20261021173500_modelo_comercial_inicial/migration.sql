-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "etapa_comercial" AS ENUM ('POR_CONTACTAR', 'BUSCANDO_ENCARGADO', 'CONTACTADO', 'DEMO_PENDIENTE', 'DEMO_REALIZADA', 'PROPUESTA_ENVIADA', 'EN_NEGOCIACION', 'CLIENTE', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "nivel_interes" AS ENUM ('SIN_EVALUAR', 'BAJO', 'MEDIO', 'ALTO');

-- CreateEnum
CREATE TYPE "tipo_actividad" AS ENUM ('LLAMADA', 'WHATSAPP', 'VISITA', 'DEMO', 'NOTA');

-- CreateEnum
CREATE TYPE "tipo_tarea" AS ENUM ('LLAMADA', 'WHATSAPP', 'VISITA', 'DEMO', 'ENVIAR_PROPUESTA', 'OTRO');

-- CreateEnum
CREATE TYPE "estado_tarea" AS ENUM ('PENDIENTE', 'COMPLETADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "usuarios_nombre_no_vacio" CHECK (char_length(btrim("nombre")) > 0),
    CONSTRAINT "usuarios_correo_no_vacio" CHECK (char_length(btrim("correo")) > 0)
);

-- CreateTable
CREATE TABLE "proyectos_comerciales" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "descripcion" TEXT,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,
    "archivado_en" TIMESTAMPTZ(3),

    CONSTRAINT "proyectos_comerciales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "proyectos_comerciales_nombre_no_vacio" CHECK (char_length(btrim("nombre")) > 0)
);

-- CreateTable
CREATE TABLE "registros_comerciales" (
    "id" UUID NOT NULL,
    "proyecto_id" UUID NOT NULL,
    "nombre_negocio" VARCHAR(180) NOT NULL,
    "nombre_encargado" VARCHAR(160),
    "telefono" VARCHAR(16),
    "correo" VARCHAR(254),
    "direccion" TEXT,
    "latitud" DECIMAL(9,6),
    "longitud" DECIMAL(9,6),
    "notas_generales" TEXT,
    "etapa" "etapa_comercial" NOT NULL DEFAULT 'POR_CONTACTAR',
    "nivel_interes" "nivel_interes" NOT NULL DEFAULT 'SIN_EVALUAR',
    "motivo_descarte" TEXT,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,
    "archivado_en" TIMESTAMPTZ(3),

    CONSTRAINT "registros_comerciales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "registros_comerciales_nombre_no_vacio" CHECK (char_length(btrim("nombre_negocio")) > 0),
    CONSTRAINT "registros_comerciales_telefono_e164" CHECK ("telefono" IS NULL OR "telefono" ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "registros_comerciales_coordenadas_completas" CHECK (("latitud" IS NULL) = ("longitud" IS NULL)),
    CONSTRAINT "registros_comerciales_latitud_valida" CHECK ("latitud" IS NULL OR "latitud" BETWEEN -90 AND 90),
    CONSTRAINT "registros_comerciales_longitud_valida" CHECK ("longitud" IS NULL OR "longitud" BETWEEN -180 AND 180)
);

-- CreateTable
CREATE TABLE "actividades" (
    "id" UUID NOT NULL,
    "proyecto_id" UUID NOT NULL,
    "registro_id" UUID NOT NULL,
    "tipo" "tipo_actividad" NOT NULL,
    "detalle" TEXT NOT NULL,
    "ocurrida_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "actividades_detalle_no_vacio" CHECK (char_length(btrim("detalle")) > 0)
);

-- CreateTable
CREATE TABLE "tareas_seguimiento" (
    "id" UUID NOT NULL,
    "proyecto_id" UUID NOT NULL,
    "registro_id" UUID NOT NULL,
    "descripcion" VARCHAR(240) NOT NULL,
    "tipo" "tipo_tarea" NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" "estado_tarea" NOT NULL DEFAULT 'PENDIENTE',
    "completada_en" TIMESTAMPTZ(3),
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tareas_seguimiento_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tareas_seguimiento_descripcion_no_vacia" CHECK (char_length(btrim("descripcion")) > 0),
    CONSTRAINT "tareas_seguimiento_estado_completada" CHECK (
        ("estado" = 'PENDIENTE' AND "completada_en" IS NULL)
        OR ("estado" = 'COMPLETADA' AND "completada_en" IS NOT NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "proyectos_comerciales_usuario_id_archivado_en_idx" ON "proyectos_comerciales"("usuario_id", "archivado_en");

-- CreateIndex
CREATE UNIQUE INDEX "proyectos_comerciales_usuario_id_nombre_key" ON "proyectos_comerciales"("usuario_id", "nombre");

-- CreateIndex
CREATE INDEX "registros_comerciales_proyecto_id_etapa_archivado_en_idx" ON "registros_comerciales"("proyecto_id", "etapa", "archivado_en");

-- CreateIndex
CREATE INDEX "registros_comerciales_proyecto_id_nivel_interes_idx" ON "registros_comerciales"("proyecto_id", "nivel_interes");

-- La clave compuesta permite que actividades y tareas incluyan el proyecto en su FK.
CREATE UNIQUE INDEX "registros_comerciales_id_proyecto_id_key" ON "registros_comerciales"("id", "proyecto_id");

-- CreateIndex
CREATE INDEX "actividades_proyecto_id_registro_id_ocurrida_en_idx" ON "actividades"("proyecto_id", "registro_id", "ocurrida_en" DESC);

-- Estos índices permiten obtener la próxima tarea pendiente por proyecto o registro.
CREATE INDEX "tareas_seguimiento_proyecto_id_estado_fecha_vencimiento_idx" ON "tareas_seguimiento"("proyecto_id", "estado", "fecha_vencimiento");

CREATE INDEX "tareas_seguimiento_proyecto_id_registro_id_estado_fecha_ven_idx" ON "tareas_seguimiento"("proyecto_id", "registro_id", "estado", "fecha_vencimiento");

-- AddForeignKey
ALTER TABLE "proyectos_comerciales" ADD CONSTRAINT "proyectos_comerciales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_comerciales" ADD CONSTRAINT "registros_comerciales_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- La FK compuesta impide asociar una actividad con un proyecto distinto al de su registro.
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_registro_id_proyecto_id_fkey" FOREIGN KEY ("registro_id", "proyecto_id") REFERENCES "registros_comerciales"("id", "proyecto_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- La FK compuesta aplica el mismo aislamiento a las tareas de seguimiento.
ALTER TABLE "tareas_seguimiento" ADD CONSTRAINT "tareas_seguimiento_registro_id_proyecto_id_fkey" FOREIGN KEY ("registro_id", "proyecto_id") REFERENCES "registros_comerciales"("id", "proyecto_id") ON DELETE RESTRICT ON UPDATE CASCADE;
