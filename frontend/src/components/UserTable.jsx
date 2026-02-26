import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchUsers } from "../services/api";
import EditUserModal from "./EditUserModal";

const PAGE_SIZE = 25;

const SORT_KEYS = {
    name: (a, b) => a.name.localeCompare(b.name),
    department: (a, b) => a.department.localeCompare(b.department),
    status: (a, b) => a.status.localeCompare(b.status),
    salary: (a, b) => a.salary - b.salary,
    joinedAt: (a, b) => a.joinedAt.localeCompare(b.joinedAt),
};

function SourceBadge({ source }) {
    return <span className={`source-badge source-${source}`}>{source}</span>;
}

function StatusBadge({ status }) {
    return <span className={`badge badge-${status}`}>{status}</span>;
}

export default function UserTable({ onUserUpdated }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cacheSource, setCacheSource] = useState("—");
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sortKey, setSortKey] = useState("name");
    const [sortDir, setSortDir] = useState(1);
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState(null);
    const [updatedRowId, setUpdatedRowId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchUsers();
            if (!res.success) throw new Error(res.message);
            setUsers(res.data);
            setCacheSource(res.source || res._source || "—");
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Filtering & Sorting ────────────────────────────────────────────
    const departments = useMemo(() => {
        const set = new Set(users.map((u) => u.department));
        return [...set].sort();
    }, [users]);

    const filtered = useMemo(() => {
        let list = users;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(
                (u) =>
                    u.name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    u.id.includes(q)
            );
        }
        if (deptFilter) list = list.filter((u) => u.department === deptFilter);
        if (statusFilter) list = list.filter((u) => u.status === statusFilter);
        const fn = SORT_KEYS[sortKey];
        if (fn) list = [...list].sort((a, b) => fn(a, b) * sortDir);
        return list;
    }, [users, search, deptFilter, statusFilter, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir((d) => -d);
        else { setSortKey(key); setSortDir(1); }
        setPage(1);
    };

    const handleUserSaved = (updatedUser, invalidated) => {
        setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        setEditing(null);
        setUpdatedRowId(updatedUser.id);
        setTimeout(() => setUpdatedRowId(null), 1400);
        onUserUpdated?.(updatedUser, invalidated);
    };

    const sortIcon = (key) => {
        if (sortKey !== key) return <span className="sort-icon">↕</span>;
        return <span className="sort-icon">{sortDir === 1 ? "↑" : "↓"}</span>;
    };

    const pageNums = useMemo(() => {
        const total = totalPages;
        const cur = safePage;
        const delta = 2;
        const range = [];
        for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
            range.push(i);
        }
        if (range[0] > 1) range.unshift("...");
        if (range[range.length - 1] < total) range.push("...");
        return range;
    }, [totalPages, safePage]);

    if (loading) return (
        <div className="loading-state">
            <div className="spinner" />
            <div className="loading-text">Loading 500 users…</div>
        </div>
    );

    if (error) return (
        <div className="error-state">
            ❌ {error}<br />
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={load}>
                Retry
            </button>
        </div>
    );

    return (
        <div className="card">
            {/* ── Header ── */}
            <div className="section-header">
                <div className="section-title">
                    Users
                    <span className="count-badge">{filtered.length} / {users.length}</span>
                    <span className={`source-badge source-${cacheSource}`} style={{ fontSize: 10 }}>
                        LIST: {cacheSource}
                    </span>
                </div>
                <div className="table-toolbar">
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder="Search name, email, id…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select className="filter-select" value={deptFilter}
                        onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
                        <option value="">All Departments</option>
                        {departments.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <select className="filter-select" value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                        <option value="">All Status</option>
                        <option>active</option>
                        <option>inactive</option>
                        <option>pending</option>
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={load}>⟳ Reload</button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 100 }}>ID</th>
                            <th onClick={() => handleSort("name")} className={sortKey === "name" ? "sorted" : ""}>
                                Name {sortIcon("name")}
                            </th>
                            <th>Email</th>
                            <th onClick={() => handleSort("department")} className={sortKey === "department" ? "sorted" : ""}>
                                Dept {sortIcon("department")}
                            </th>
                            <th>Role</th>
                            <th onClick={() => handleSort("status")} className={sortKey === "status" ? "sorted" : ""}>
                                Status {sortIcon("status")}
                            </th>
                            <th onClick={() => handleSort("salary")} className={sortKey === "salary" ? "sorted" : ""}>
                                Salary {sortIcon("salary")}
                            </th>
                            <th onClick={() => handleSort("joinedAt")} className={sortKey === "joinedAt" ? "sorted" : ""}>
                                Joined {sortIcon("joinedAt")}
                            </th>
                            <th>Cache</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((user) => (
                            <tr key={user.id} className={updatedRowId === user.id ? "updated-row" : ""}>
                                <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>
                                    {user.id}
                                </td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.city} · {user.age}y</div>
                                </td>
                                <td style={{ maxWidth: 200 }}>{user.email}</td>
                                <td>{user.department}</td>
                                <td style={{ color: "var(--text-secondary)" }}>{user.role}</td>
                                <td><StatusBadge status={user.status} /></td>
                                <td>${user.salary?.toLocaleString()}</td>
                                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{user.joinedAt}</td>
                                <td>
                                    <SourceBadge source={updatedRowId === user.id ? "DB" : cacheSource} />
                                </td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(user)}>
                                        ✏ Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ── */}
            <div className="pagination">
                <div className="pagination-info">
                    Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </div>
                <div className="pagination-controls">
                    <button className="page-btn" onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
                    <button className="page-btn" onClick={() => setPage((p) => p - 1)} disabled={safePage === 1}>‹</button>
                    {pageNums.map((n, i) =>
                        n === "..." ? (
                            <span key={`el-${i}`} style={{ color: "var(--text-muted)", padding: "0 4px" }}>…</span>
                        ) : (
                            <button key={n} className={`page-btn${n === safePage ? " active" : ""}`}
                                onClick={() => setPage(n)}>{n}</button>
                        )
                    )}
                    <button className="page-btn" onClick={() => setPage((p) => p + 1)} disabled={safePage === totalPages}>›</button>
                    <button className="page-btn" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
                </div>
            </div>

            {/* ── Edit Modal ── */}
            {editing && (
                <EditUserModal
                    user={editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleUserSaved}
                />
            )}
        </div>
    );
}
