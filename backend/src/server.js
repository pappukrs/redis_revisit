/**
 * Server Entry Point
 */

"use strict";

require("dotenv").config();

const app = require("./app");
const l2Cache = require("../cache/l2Cache");

const PORT = parseInt(process.env.PORT, 10) || 3001;

async function start() {
    // Verify Redis connection
    try {
        const pong = await l2Cache.ping();
        console.log(`[Redis] Ping: ${pong}`);
    } catch (err) {
        console.error("[Redis] Could not connect:", err.message);
        console.error("Ensure Redis is running: docker compose up -d redis");
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`\n🚀 Server running at http://localhost:${PORT}`);
        console.log(`   GET  /api/users          → all 500 users (L1 → L2 → DB)`);
        console.log(`   GET  /api/users/:id      → single user`);
        console.log(`   PUT  /api/users/:id      → update + selective invalidation`);
        console.log(`   GET  /api/cache/stats    → hit/miss counters`);
        console.log(`   POST /api/cache/reset    → flush all caches\n`);
    });
}

start();
