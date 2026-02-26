/**
 * L1 Cache - Node.js in-process LRU cache
 * Fastest layer. Lives in-memory, no network hop.
 * Short TTL to avoid serving stale data too long.
 */

"use strict";

const { LRUCache } = require("lru-cache");

const L1_MAX_SIZE = parseInt(process.env.L1_MAX_SIZE, 10) || 500;
const L1_TTL_USER_MS = parseInt(process.env.L1_TTL_USER_MS, 10) || 15_000;  // 15s
const L1_TTL_LIST_MS = parseInt(process.env.L1_TTL_LIST_MS, 10) || 30_000;  // 30s

const cache = new LRUCache({
    max: L1_MAX_SIZE,
    ttl: L1_TTL_USER_MS,        // default TTL for individual items
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
});

// ─── Counters ─────────────────────────────────────────────────────────────────

const counters = { hits: 0, misses: 0, sets: 0, deletes: 0 };

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Get a value from L1.
 * @param {string} key
 * @returns {any|undefined}
 */
function get(key) {
    const value = cache.get(key);
    if (value !== undefined) {
        counters.hits++;
    } else {
        counters.misses++;
    }
    return value;
}

/**
 * Set a value in L1 with an optional TTL (ms).
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlMs] - Override default TTL in milliseconds
 */
function set(key, value, ttlMs) {
    counters.sets++;
    const opts = ttlMs ? { ttl: ttlMs } : {};
    cache.set(key, value, opts);
}

/**
 * Delete a key from L1.
 * @param {string} key
 * @returns {boolean}
 */
function del(key) {
    counters.deletes++;
    return cache.delete(key);
}

/**
 * Check if key exists without updating hit/miss counters.
 * @param {string} key
 * @returns {boolean}
 */
function has(key) {
    return cache.has(key);
}

/**
 * Clear entire L1 cache.
 */
function flush() {
    cache.clear();
}

/**
 * Get cache stats.
 * @returns {object}
 */
function stats() {
    const total = counters.hits + counters.misses;
    return {
        layer: "L1 (in-memory LRU)",
        hits: counters.hits,
        misses: counters.misses,
        hitRate: total > 0 ? ((counters.hits / total) * 100).toFixed(2) + "%" : "0%",
        sets: counters.sets,
        deletes: counters.deletes,
        currentSize: cache.size,
        maxSize: L1_MAX_SIZE,
        ttlUserMs: L1_TTL_USER_MS,
        ttlListMs: L1_TTL_LIST_MS,
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

module.exports = { get, set, del, has, flush, stats, resetCounters, L1_TTL_USER_MS, L1_TTL_LIST_MS };
