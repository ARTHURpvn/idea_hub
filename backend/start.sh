#!/usr/bin/env bash
set -euo pipefail

# start.sh - aguarda o Postgres, executa o create_db e inicia o servidor Uvicorn
# Uso: no Render, configure o Start Command para: bash backend/start.sh

cd "$(dirname "$0")"

# If DATABASE_URL is provided (e.g. Render), parse it and export POSTGRES_* variables for compatibility
if [ -n "${DATABASE_URL-}" ]; then
  echo "[start] parseando DATABASE_URL para variáveis POSTGRES_*"
  eval "$(python3 - <<'PY'
import os
from urllib.parse import urlparse
u = urlparse(os.environ.get('DATABASE_URL'))
if u.scheme and u.scheme.startswith('postgres'):
    user = u.username or ''
    pwd = u.password or ''
    host = u.hostname or ''
    port = u.port or ''
    db = u.path.lstrip('/') or ''
    # print shell assignments
    print(f"POSTGRES_USER='{user}'")
    print(f"POSTGRES_PASSWORD='{pwd}'")
    print(f"POSTGRES_HOST='{host}'")
    print(f"POSTGRES_PORT='{port}'")
    print(f"POSTGRES_DB='{db}'")
PY
  )"
fi

MAX_RETRIES=${MAX_RETRIES:-30}
SLEEP=${SLEEP:-2}
TRIED=0

# Função para tentar rodar create_db via Python
run_create_db() {
  echo "[start] executando create_db.py..."
  if python app/database/create_db.py; then
    return 0
  else
    return 1
  fi
}

# Aguarda o postgres usando pg_isready (se disponível), senão tenta conectar com python
echo "[start] aguardando Postgres ficar disponível..."
# Se pg_isready existir, usamos ele
if command -v pg_isready >/dev/null 2>&1; then
  until pg_isready -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}"; do
    TRIED=$((TRIED+1))
    if [ "$TRIED" -ge "$MAX_RETRIES" ]; then
      echo "[start] excedeu $MAX_RETRIES tentativas esperando o Postgres" >&2
      exit 1
    fi
    echo "[start] Postgres não disponível ainda (tentativa $TRIED/$MAX_RETRIES), aguardando $SLEEP s..."
    sleep "$SLEEP"
  done
else
  # fallback: tenta executar create_db até conseguir
  until run_create_db; do
    TRIED=$((TRIED+1))
    if [ "$TRIED" -ge "$MAX_RETRIES" ]; then
      echo "[start] excedeu $MAX_RETRIES tentativas ao executar create_db" >&2
      exit 1
    fi
    echo "[start] create_db falhou (tentativa $TRIED/$MAX_RETRIES), aguardando $SLEEP s..."
    sleep "$SLEEP"
  done
  echo "[start] create_db executado com sucesso (fallback)"
fi

# Se chegamos aqui e pg_isready funcionou, tenta executar create_db (pode falhar algumas vezes)
if command -v pg_isready >/dev/null 2>&1; then
  TRIED=0
  until run_create_db; do
    TRIED=$((TRIED+1))
    if [ "$TRIED" -ge "$MAX_RETRIES" ]; then
      echo "[start] excedeu $MAX_RETRIES tentativas ao executar create_db" >&2
      exit 1
    fi
    echo "[start] create_db falhou (tentativa $TRIED/$MAX_RETRIES), aguardando $SLEEP s..."
    sleep "$SLEEP"
  done
  echo "[start] create_db executado com sucesso"
fi

# Iniciar o servidor
echo "[start] iniciando uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers ${UVICORN_WORKERS:-1}
