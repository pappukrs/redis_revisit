/**
 * Express Application Factory
 */

"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const usersRouter = require("../routes/users");

const app = express();

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "*", exposedHeaders: ["X-Cache-Source"] }));
app.use(express.json({ limit: "1mb" }));

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(
    morgan(":method :url :status :response-time ms - source::res[X-Cache-Source]")
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", usersRouter);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error("[ERROR]", err);
    res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});

module.exports = app;
