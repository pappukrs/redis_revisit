/**
 * Cache Manager - Orchestrates L1 → L2 → DB read/write/invalidation.
 *
 * Key naming:
 *   user:<id>   → single user object
 *   users:all   → full list of users (array)
 */

"use strict";

const l1 = require("./l1Cache");
const l2 = require("./l2Cache");
const db = require("../db/mockDb");

const KEY_LIST = "users:all";
const userKey = (id) => `user:${id}`;

// ─── Read: Single User ────────────────────────────────────────────────────────

/**
 * Get a single user with L1 → L2 → DB fallback.
 * Returns { user, source } where source is 'L1' | 'L2' | 'DB'.
 *
 * @param {string} id
 * @returns {Promise<{ user: object|null, source: string }>}
 */
async function getUser(id) {
    const key = userKey(id);

    // ── L1 check ──
    const fromL1 = l1.get(key);
    if (fromL1 !== undefined) {
        return { user: fromL1, source: "L1" };
    }

    // ── L2 check ──
    const fromL2 = await l2.get(key);
    if (fromL2 !== undefined) {
        // Backfill L1
        l1.set(key, fromL2, l1.L1_TTL_USER_MS);
        return { user: fromL2, source: "L2" };
    }

    // ── DB fallback ──
    const user = await db.findById(id);
    if (user) {
        await l2.set(key, user, l2.L2_TTL_USER);
        l1.set(key, user, l1.L1_TTL_USER_MS);
    }
    return { user, source: "DB" };
}

// ─── Read: All Users ──────────────────────────────────────────────────────────

/**
 * Get all users with L1 → L2 → DB fallback.
 * Returns { users, source }.
 *
 * @returns {Promise<{ users: object[], source: string }>}
 */
async function getAllUsers() {
    // ── L1 check ──
    const fromL1 = l1.get(KEY_LIST);
    if (fromL1 !== undefined) {
        return { users: fromL1, source: "L1" };
    }

    // ── L2 check ──
    const fromL2 = await l2.get(KEY_LIST);
    if (fromL2 !== undefined) {
        l1.set(KEY_LIST, fromL2, l1.L1_TTL_LIST_MS);
        return { users: fromL2, source: "L2" };
    }

    // ── DB fallback ──
    const users = await db.findAll();
    await l2.set(KEY_LIST, users, l2.L2_TTL_LIST);
    l1.set(KEY_LIST, users, l1.L1_TTL_LIST_MS);
    return { users, source: "DB" };
}

// ─── Write: Update + Selective Invalidation ───────────────────────────────────

/**
 * Updates a user in DB, then selectively invalidates only that user's
 * cache entries (L1 + L2). Also patches the cached list in-place if it
 * exists, so the list doesn't go stale without a full reload.
 *
 * @param {string} id
 * @param {object} patch
 * @returns {Promise<{ user: object|null, invalidated: string[] }>}
 */
async function updateUser(id, patch) {
    // 1. Update DB (source of truth)
    const updatedUser = await db.update(id, patch);
    if (!updatedUser) return { user: null, invalidated: [] };

    const key = userKey(id);
    const invalidated = [];

    // 2. Invalidate ONLY this user's key in L1
    if (l1.del(key)) invalidated.push(`L1:${key}`);

    // 3. Invalidate ONLY this user's key in L2
    const deleted = await l2.del(key);
    if (deleted > 0) invalidated.push(`L2:${key}`);

    // 4. Patch the list cache in-place (avoid full list eviction)
    //    L1 list patch
    const l1List = l1.get(KEY_LIST);
    if (l1List !== undefined) {
        const idx = l1List.findIndex((u) => u.id === id);
        if (idx !== -1) {
            const newList = [...l1List];
            newList[idx] = updatedUser;
            l1.set(KEY_LIST, newList, l1.L1_TTL_LIST_MS);
        }
    }

    //    L2 list patch
    const l2List = await l2.get(KEY_LIST);
    if (l2List !== undefined) {
        const idx = l2List.findIndex((u) => u.id === id);
        if (idx !== -1) {
            l2List[idx] = updatedUser;
            // Get remaining TTL so we don't reset it
            const remaining = await l2.ttl(KEY_LIST);
            await l2.set(KEY_LIST, l2List, remaining > 0 ? remaining : l2.L2_TTL_LIST);
            invalidated.push(`L2:${KEY_LIST}[patched]`);
        }
    }

    return { user: updatedUser, invalidated };
}

// ─── Cache Flush ──────────────────────────────────────────────────────────────

/**
 * Flush all cache layers (dev utility).
 */
async function flushAll() {
    l1.flush();
    await l2.flush();
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Get combined stats from both cache layers.
 */
async function stats() {
    const [l2Stats] = await Promise.all([l2.stats()]);
    return {
        l1: l1.stats(),
        l2: l2Stats,
        dbSize: db.size(),
    };
}

/**
 * Reset hit/miss counters on both layers.
 */
function resetCounters() {
    l1.resetCounters();
    l2.resetCounters();
}

module.exports = { getUser, getAllUsers, updateUser, flushAll, stats, resetCounters };
