-- Las actividades y tareas conservan el resultado sin mezclarlo con el resumen.
ALTER TABLE "actividades" ADD COLUMN "resultado" TEXT;
ALTER TABLE "tareas_seguimiento" ADD COLUMN "resultado" TEXT;

-- Una solicitud identifica de forma estable una mutacion del historial. La fila se
-- crea en la misma transaccion que sus efectos y evita duplicados por reenvios.
CREATE TABLE "operaciones_registro" (
    "solicitud_id" UUID NOT NULL,
    "proyecto_id" UUID NOT NULL,
    "registro_id" UUID NOT NULL,
    "tipo" VARCHAR(80) NOT NULL,
    "actividad_id" UUID,
    "tarea_id" UUID,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operaciones_registro_pkey" PRIMARY KEY ("solicitud_id")
);

CREATE INDEX "operaciones_registro_proyecto_id_registro_id_creada_en_idx"
ON "operaciones_registro"("proyecto_id", "registro_id", "creada_en");

ALTER TABLE "operaciones_registro"
ADD CONSTRAINT "operaciones_registro_registro_id_proyecto_id_fkey"
FOREIGN KEY ("registro_id", "proyecto_id")
REFERENCES "registros_comerciales"("id", "proyecto_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
