/**
 * Users Router
 * Mounts at: /api/users and /api/cache
 */

"use strict";

const express = require("express");
const router = express.Router();
const cacheManager = require("../cache/cacheManager");

// ─── GET /api/users ───────────────────────────────────────────────────────────

/**
 * Returns all 500 users.
 * Response includes cache source: 'L1', 'L2', or 'DB'.
 */
router.get("/users", async (req, res, next) => {
    try {
        const { users, source } = await cacheManager.getAllUsers();
        res.set("X-Cache-Source", source);
        res.json({
            success: true,
            source,
            count: users.length,
            data: users,
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

/**
 * Returns a single user.
 */
router.get("/users/:id", async (req, res, next) => {
    try {
        const { user, source } = await cacheManager.getUser(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.set("X-Cache-Source", source);
        res.json({ success: true, source, data: user });
    } catch (err) {
        next(err);
    }
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────

/**
 * Updates a user and performs selective cache invalidation.
 * Only the updated user's cache key is evicted.
 */
router.put("/users/:id", async (req, res, next) => {
    try {
        const { user, invalidated } = await cacheManager.updateUser(
            req.params.id,
            req.body
        );
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({
            success: true,
            message: "User updated. Selective cache invalidation applied.",
            invalidated,
            data: user,
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/cache/stats ─────────────────────────────────────────────────────

/**
 * Returns L1 + L2 cache hit/miss statistics.
 */
router.get("/cache/stats", async (req, res, next) => {
    try {
        const data = await cacheManager.stats();
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/cache/reset ────────────────────────────────────────────────────

/**
 * Flushes all cache layers and resets counters. Dev utility.
 */
router.post("/cache/reset", async (req, res, next) => {
    try {
        await cacheManager.flushAll();
        cacheManager.resetCounters();
        res.json({ success: true, message: "All cache layers flushed and counters reset." });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
