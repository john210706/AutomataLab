#!/usr/bin/env bash
# Run both local servers. Ctrl+C stops only the processes this script started.
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -x "$project_root/.venv/bin/python" || ! -f "$project_root/frontend/node_modules/vite/bin/vite.js" ]]; then
  echo "Install the backend and frontend dependencies first; see README.md."
  exit 1
fi
pids=()
cleanup() {
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT
trap 'exit 130' INT TERM
"$project_root/.venv/bin/python" -m uvicorn app.main:app --app-dir "$project_root/backend" --host 127.0.0.1 --port 8000 --reload --reload-dir "$project_root/backend/app" &
pids+=("$!")
(
  cd "$project_root/frontend"
  exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
) &
pids+=("$!")
echo "AutomataLab: http://127.0.0.1:5173 | API docs: http://127.0.0.1:8000/docs"
wait -n "${pids[@]}"
