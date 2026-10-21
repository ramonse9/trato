ALTER TABLE "usuarios"
ADD COLUMN "password_hash" VARCHAR(255);

CREATE TABLE "sesiones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "csrf_token" CHAR(64) NOT NULL,
    "expira_en" TIMESTAMPTZ(3) NOT NULL,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sesiones_usuario_id_fkey"
      FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sesiones_token_hash_formato_check"
      CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "sesiones_csrf_token_formato_check"
      CHECK ("csrf_token" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "sesiones_token_hash_key" ON "sesiones"("token_hash");
CREATE INDEX "sesiones_usuario_id_expira_en_idx" ON "sesiones"("usuario_id", "expira_en");
CREATE INDEX "sesiones_expira_en_idx" ON "sesiones"("expira_en");
