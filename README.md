# Redis Revisit — Production-Grade L1/L2 Cache Demo

A full-stack application demonstrating a **two-tier cache hierarchy** with **selective invalidation** on row-level updates.

```
Frontend (React/Vite :5173)
      │ REST calls
      ▼
Backend (Express :3001)
      │
      ├── L1 Cache (Node.js in-memory LRU)  ← fastest, ~0ms, 15s TTL
      ├── L2 Cache (Redis :6379)             ← shared, ~1ms, 60s TTL
      └── Mock DB (500 users, 5–15ms)        ← source of truth
```

## How Selective Invalidation Works

On `PUT /api/users/:id`:
1. DB is updated first (source of truth).
2. **Only** `user:<id>` is deleted from L1 + L2 — not the whole cache.
3. The `users:all` list is **patched in-place** (the updated entry replaces the old one), preserving the rest of the list in cache.

Result: 499 users stay cache-warm, 1 user is re-fetched from DB on next access.

## Prerequisites

- **Docker** (for Redis)
- **Node.js ≥ 18**
- **npm ≥ 9**

## Quick Start

```bash
# 1. Start everything with one command:
chmod +x start.sh && ./start.sh
```

Or manually:

```bash
# Terminal 1 - Redis
docker compose up redis

# Terminal 2 - Backend
cd backend && npm install && npm run dev

# Terminal 3 - Frontend
cd frontend && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | All 500 users (L1 → L2 → DB) |
| `GET` | `/api/users/:id` | Single user |
| `PUT` | `/api/users/:id` | Update + selective invalidation |
| `GET` | `/api/cache/stats` | L1 + L2 hit/miss counters |
| `POST` | `/api/cache/reset` | Flush all caches |

The `X-Cache-Source` response header tells you which layer served the response: `L1`, `L2`, or `DB`.

## Cache Configuration

| Setting | Value |
|---------|-------|
| L1 max entries | 500 |
| L1 TTL (users) | 15s |
| L1 TTL (list) | 30s |
| L2 TTL (users) | 60s |
| L2 TTL (list) | 120s |
| DB latency | 5–15ms |

Override via `backend/.env`.

## Project Structure

```
redis_revisit/
├── docker-compose.yml          # Redis 7 Alpine
├── start.sh                    # One-shot startup
├── backend/
│   ├── db/
│   │   └── mockDb.js           # 500 deterministic users (Map + seeded RNG)
│   ├── cache/
│   │   ├── l1Cache.js          # LRU in-memory, lru-cache library
│   │   ├── l2Cache.js          # Redis via ioredis
│   │   └── cacheManager.js     # Orchestrates L1→L2→DB + selective invalidation
│   ├── routes/
│   │   └── users.js            # Express router
│   └── src/
│       ├── app.js              # Express factory (cors, helmet, morgan)
│       └── server.js           # Entry point, Redis ping check
└── frontend/
    └── src/
        ├── components/
        │   ├── UserTable.jsx    # 500-row table, sort, filter, pagination
        │   ├── EditUserModal.jsx # Edit form with diff preview
        │   └── CacheMonitor.jsx # Live L1/L2 stats sidebar
        ├── services/api.js      # Fetch wrapper
        └── App.jsx              # Root layout
```

## Verifying Selective Invalidation

1. Load the app → first request hits **DB** (cold cache)
2. Refresh → **L1** or **L2** cache serves the response
3. Edit any user → toast shows `N cache key(s) evicted`
4. Check `/api/cache/stats` → only 1 `user:<id>` key was evicted
5. The sidebar's "Recent Invalidations" shows exactly which keys were evicted
