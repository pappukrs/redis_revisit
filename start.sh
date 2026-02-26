#!/usr/bin/env bash
# start.sh - Start all services for the Redis Cache Demo
set -e

echo "============================================"
echo " Redis L1/L2 Cache Demo - Startup Script"
echo "============================================"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Start Redis ────────────────────────────────────────────────────
echo ""
echo "▶ Starting Redis (Docker Compose)..."
cd "$ROOT_DIR"
docker compose up -d redis
echo "  ✓ Redis running at localhost:6379"

# Wait for Redis health check
echo "  Waiting for Redis health..."
until docker exec redis_cache redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 0.5
done
echo "  ✓ Redis is healthy"

# ── 2. Start Backend ──────────────────────────────────────────────────
echo ""
echo "▶ Starting Backend (Express) on http://localhost:3001..."
cd "$ROOT_DIR/backend"
npm install --silent
npm run dev &
BACKEND_PID=$!
echo "  ✓ Backend PID: $BACKEND_PID"

# ── 3. Start Frontend ─────────────────────────────────────────────────
echo ""
echo "▶ Starting Frontend (Vite/React) on http://localhost:5173..."
cd "$ROOT_DIR/frontend"
npm install --silent
npm run dev &
FRONTEND_PID=$!
echo "  ✓ Frontend PID: $FRONTEND_PID"

echo ""
echo "============================================"
echo " All services started!"
echo ""
echo "  Frontend  ▶  http://localhost:5173"
echo "  Backend   ▶  http://localhost:3001"
echo "  Cache API ▶  http://localhost:3001/api/cache/stats"
echo ""
echo "Press Ctrl+C to stop all services"
echo "============================================"

# Trap Ctrl+C and kill both processes
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  docker compose -f "$ROOT_DIR/docker-compose.yml" stop redis 2>/dev/null
  echo "Done."
}
trap cleanup SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
