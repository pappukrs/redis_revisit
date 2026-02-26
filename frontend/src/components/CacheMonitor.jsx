import { useEffect, useState } from "react";
import { fetchCacheStats, resetCache } from "../services/api";

function parseRate(rate) {
    if (!rate || rate === "0%") return 0;
    return parseFloat(rate.replace("%", "")) || 0;
}

function StatRow({ label, value }) {
    return (
        <div className="stat-row">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
        </div>
    );
}

function CacheLayerCard({ name, tag, data, variant }) {
    const rate = parseRate(data?.hitRate);
    return (
        <div className="cache-layer">
            <div className="cache-layer-header">
                <span className="cache-layer-name">{name}</span>
                <span className={`layer-tag layer-${tag}`}>{tag}</span>
            </div>
            <div className="cache-stats">
                <StatRow label="Hits" value={data?.hits ?? "—"} />
                <StatRow label="Misses" value={data?.misses ?? "—"} />
                <StatRow label="Sets" value={data?.sets ?? "—"} />
                <StatRow label="Evictions" value={data?.deletes ?? "—"} />
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span className="stat-label">Hit Rate</span>
                        <span className={`hit-rate-label`} style={{ color: variant === "L1" ? "var(--accent-green)" : "var(--accent-blue)" }}>
                            {data?.hitRate ?? "0%"}
                        </span>
                    </div>
                    <div className="hit-rate-bar">
                        <div
                            className={`hit-rate-fill hit-rate-${variant === "L1" ? "green" : "blue"}`}
                            style={{ width: `${rate}%` }}
                        />
                    </div>
                </div>
                {data?.currentSize !== undefined && (
                    <StatRow label="Size" value={`${data.currentSize} / ${data.maxSize}`} />
                )}
                {data?.ttlUserMs && (
                    <StatRow label="TTL (user)" value={`${data.ttlUserMs / 1000}s`} />
                )}
                {data?.ttlUserSeconds && (
                    <StatRow label="TTL (user)" value={`${data.ttlUserSeconds}s`} />
                )}
            </div>
        </div>
    );
}

export default function CacheMonitor({ invalidationLog }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resetting, setResetting] = useState(false);

    const refresh = async () => {
        try {
            const res = await fetchCacheStats();
            if (res.success) setStats(res.data);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => {
        refresh();
        const iv = setInterval(refresh, 3000);
        return () => clearInterval(iv);
    }, []);

    const handleReset = async () => {
        setResetting(true);
        try { await resetCache(); await refresh(); } finally { setResetting(false); }
    };

    return (
        <div className="cache-monitor">
            <div className="monitor-title">
                <div className="monitor-dot" />
                Cache Monitor
            </div>

            {loading ? (
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading stats...</div>
            ) : (
                <>
                    <CacheLayerCard name="Node.js In-Memory" tag="L1" data={stats?.l1} variant="L1" />
                    <CacheLayerCard name="Redis" tag="L2" data={stats?.l2} variant="L2" />

                    <div className="cache-layer">
                        <div className="cache-layer-header">
                            <span className="cache-layer-name">Mock DB</span>
                            <span className="layer-tag layer-DB">DB</span>
                        </div>
                        <div className="cache-stats">
                            <StatRow label="Total Records" value={stats?.dbSize ?? "—"} />
                            <StatRow label="Latency" value="5–15ms" />
                        </div>
                    </div>

                    {/* Invalidation log */}
                    {invalidationLog && invalidationLog.length > 0 && (
                        <div className="invalidation-log">
                            <div className="log-title">⚡ Recent Invalidations</div>
                            {invalidationLog.slice(-8).reverse().map((entry, i) => (
                                <div key={i} className="log-entry">
                                    <span className="log-icon">🗑</span>
                                    <span>{entry}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="monitor-actions">
                        <button className="btn btn-danger btn-sm" onClick={handleReset} disabled={resetting}>
                            {resetting ? "Flushing..." : "🗑 Flush All Caches"}
                        </button>
                        <div className="monitor-refresh">Auto-refreshes every 3s</div>
                    </div>
                </>
            )}
        </div>
    );
}
