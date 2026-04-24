#!/usr/bin/env bash
# Ollama modellerini ilk kurulumda çek. docker-compose up sonrası bir kez çalıştırılır.
#
# Kullanım:
#   bash scripts/pull-models.sh
#   OLLAMA_HOST=http://localhost:11434 bash scripts/pull-models.sh

set -euo pipefail

OLLAMA_HOST="${OLLAMA_URL:-http://localhost:11434}"

echo "[pull] Using Ollama at $OLLAMA_HOST"

models=(
  "qwen3.6:32b-instruct-q4_K_M"   # Ana model — karmaşık hukuki analiz, RAG, dilekçe
  "qwen3.6:14b"                   # Fallback — düşük RAM ortamı
  "gemma4:9b"                     # Yardımcı — router, PII agent, sınıflandırma
  "multilingual-e5-large"         # Embedding — TR hukuki recall
)

for m in "${models[@]}"; do
  echo "[pull] $m"
  curl -s -X POST "$OLLAMA_HOST/api/pull" -H 'Content-Type: application/json' \
    -d "{\"model\": \"$m\", \"stream\": false}" | head -c 500
  echo
done

echo "[pull] Done. Loaded models:"
curl -s "$OLLAMA_HOST/api/tags" | python3 -c "import sys, json; [print(' -', m['name']) for m in json.load(sys.stdin).get('models', [])]" || true
