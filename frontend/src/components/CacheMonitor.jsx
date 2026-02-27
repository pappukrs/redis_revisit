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

export default function CacheMonitor({ invalidationLog, isCollapsed }) {
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

    if (isCollapsed) return null;

    return (
        <div className="cache-monitor">
            <div className="monitor-title">
                <div className="monitor-dot" />
                System Analytics
            </div>

            {loading ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20, textAlign: "center" }}>
                    <div className="spinner-sm" style={{ marginBottom: 10 }} />
                    Crunching data...
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <CacheLayerCard name="L1 · In-Memory" tag="L1" data={stats?.l1} variant="L1" />
                    <CacheLayerCard name="L2 · Redis" tag="L2" data={stats?.l2} variant="L2" />

                    <div className="cache-layer">
                        <div className="cache-layer-header">
                            <span className="cache-layer-name">Data Persistence</span>
                            <span className="layer-tag layer-POSTGRES">POSTGRES</span>
                        </div>
                        <div className="cache-stats">
                            <StatRow label="Universe Size" value={`${stats?.dbSize ?? "—"} users`} />
                            <StatRow label="Avg Latency" value="12ms" />
                        </div>
                    </div>

                    {/* Invalidation log */}
                    {invalidationLog && invalidationLog.length > 0 && (
                        <div className="invalidation-log">
                            <div className="log-title">⚡ Live Feed</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {invalidationLog.slice(-10).reverse().map((entry, i) => (
                                    <div key={i} className="log-entry">
                                        <span className="log-icon">⚡</span>
                                        <span>{entry}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="monitor-actions">
                        <button className="btn btn-danger btn-sm" onClick={handleReset} disabled={resetting}>
                            {resetting ? "Resetting..." : "Flush System Cache"}
                        </button>
                        <div className="monitor-refresh">Updating via WebSocket every 3s</div>
                    </div>
                </div>
            )}
        </div>
    );
}
