#!/usr/bin/env bash
set -euo pipefail

# Copia de seguridad de los DATOS de Ratta App (Fase 15).
#
# El esquema (las tablas, RLS, etc.) ya está a salvo en
# supabase/migrations/, versionado en git. Lo único que no está
# respaldado en ningún sitio son los datos reales: notas, El Trono,
# respuestas de Pregunta del día, mensajitos de cariño... Este script
# vuelca solo eso.
#
# Para restaurar desde cero: (1) crear un proyecto Supabase nuevo,
# (2) aplicar las migraciones de supabase/migrations/ en orden,
# (3) cargar el volcado que genera este script.
#
# Uso:
#   DATABASE_URL="postgresql://postgres:TU-PASSWORD@db.xxxx.supabase.co:5432/postgres" \
#     ./scripts/backup.sh
#
# La cadena de conexión se saca de Supabase: Project Settings >
# Database > Connection string > URI. Usa "Direct connection" o
# "Session pooler" — NO la de "Transaction pooler" (puerto 6543), que
# no soporta pg_dump.

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta la variable DATABASE_URL. Ejemplo de uso:"
  echo '  DATABASE_URL="postgresql://postgres:TU-PASSWORD@db.xxxx.supabase.co:5432/postgres" ./scripts/backup.sh'
  exit 1
fi

output="ratta-backup-$(date +%Y-%m-%d_%H%M).sql"

pg_dump "$DATABASE_URL" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-privileges \
  --file="$output"

echo "Copia guardada en: $output"
echo "Guárdala en un sitio privado tuyo (Google Drive, iCloud...)."
echo "Nunca la subas a GitHub: contiene datos personales."
