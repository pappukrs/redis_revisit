/**
 * L2 Cache - Redis via ioredis
 * Second-fastest layer. Shared across restarts and processes.
 * Longer TTL than L1.
 */

"use strict";

const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const L2_TTL_USER = parseInt(process.env.L2_TTL_USER_SECONDS, 10) || 60;   // 60s
const L2_TTL_LIST = parseInt(process.env.L2_TTL_LIST_SECONDS, 10) || 120;  // 120s

// ─── Redis Client ─────────────────────────────────────────────────────────────

const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
        if (times > 10) return null; // Stop retrying after 10 attempts
        return Math.min(times * 200, 2000);
    },
});

client.on("connect", () => console.log("[L2] Redis connected"));
client.on("error", (err) => console.error("[L2] Redis error:", err.message));
client.on("reconnecting", () => console.warn("[L2] Redis reconnecting..."));

// ─── Counters ─────────────────────────────────────────────────────────────────

const counters = { hits: 0, misses: 0, sets: 0, deletes: 0 };

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Get a value from Redis. Returns parsed JSON or undefined.
 * @param {string} key
 * @returns {Promise<any|undefined>}
 */
async function get(key) {
    const raw = await client.get(key);
    if (raw !== null) {
        counters.hits++;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }
    counters.misses++;
    return undefined;
}

/**
 * Set a value in Redis with a TTL (seconds).
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds] - defaults to L2_TTL_USER
 */
async function set(key, value, ttlSeconds = L2_TTL_USER) {
    counters.sets++;
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

/**
 * Delete one or more keys from Redis.
 * @param {...string} keys
 * @returns {Promise<number>}
 */
async function del(...keys) {
    counters.deletes += keys.length;
    return client.del(...keys);
}

/**
 * Check existence of a key.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function exists(key) {
    return (await client.exists(key)) === 1;
}

/**
 * Flush all Redis keys.
 */
async function flush() {
    await client.flushdb();
}

/**
 * Ping Redis.
 * @returns {Promise<string>}
 */
async function ping() {
    return client.ping();
}

/**
 * Get TTL of a key (seconds).
 * @param {string} key
 * @returns {Promise<number>}
 */
async function ttl(key) {
    return client.ttl(key);
}

/**
 * Get cache stats.
 */
async function stats() {
    const total = counters.hits + counters.misses;
    let info = {};
    try {
        const raw = await client.info("stats");
        const lines = raw.split("\r\n");
        lines.forEach((line) => {
            const [k, v] = line.split(":");
            if (k && v) info[k.trim()] = v.trim();
        });
    } catch { }

    return {
        layer: "L2 (Redis)",
        hits: counters.hits,
        misses: counters.misses,
        hitRate: total > 0 ? ((counters.hits / total) * 100).toFixed(2) + "%" : "0%",
        sets: counters.sets,
        deletes: counters.deletes,
        ttlUserSeconds: L2_TTL_USER,
        ttlListSeconds: L2_TTL_LIST,
        redisKeyspaceHits: info["keyspace_hits"] || "N/A",
        redisKeyspaceMisses: info["keyspace_misses"] || "N/A",
    };
}

/**
 * Reset counters.
 */
function resetCounters() {
    counters.hits = 0;
    counters.misses = 0;
    counters.sets = 0;
    counters.deletes = 0;
}

module.exports = {
    get, set, del, exists, flush, ping, ttl, stats, resetCounters,
    L2_TTL_USER, L2_TTL_LIST,
};
