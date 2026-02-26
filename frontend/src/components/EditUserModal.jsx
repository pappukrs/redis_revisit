import { useState, useCallback } from "react";
import { updateUser } from "../services/api";

const DEPARTMENTS = [
    "Engineering", "Marketing", "Sales", "HR", "Finance",
    "Operations", "Product", "Design", "Legal", "Customer Success",
];
const ROLES = ["admin", "manager", "engineer", "analyst", "designer", "intern"];
const STATUSES = ["active", "inactive", "pending"];
const CITIES = [
    "New York", "San Francisco", "Austin", "Seattle", "Chicago",
    "Boston", "Los Angeles", "Denver", "Miami", "Atlanta",
];

export default function EditUserModal({ user, onClose, onSaved }) {
    const [form, setForm] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department,
        role: user.role,
        status: user.status,
        city: user.city,
        salary: user.salary,
        age: user.age,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }, []);

    const changedFields = Object.keys(form).filter(
        (k) => String(form[k]) !== String(user[k])
    );

    const handleSave = async () => {
        if (changedFields.length === 0) { onClose(); return; }
        setSaving(true);
        setError(null);
        try {
            const patch = {};
            changedFields.forEach((k) => { patch[k] = form[k]; });
            // Cast numerics
            if (patch.salary) patch.salary = Number(patch.salary);
            if (patch.age) patch.age = Number(patch.age);

            const res = await updateUser(user.id, patch);
            if (!res.success) throw new Error(res.message || "Update failed");
            onSaved(res.data, res.invalidated || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const isChanged = (field) => String(form[field]) !== String(user[field]);

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card">
                <div className="modal-header">
                    <div>
                        <div className="modal-title">Edit User</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {user.id} · {user.name}
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <input name="firstName" className={`form-input${isChanged("firstName") ? " changed" : ""}`}
                                value={form.firstName} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <input name="lastName" className={`form-input${isChanged("lastName") ? " changed" : ""}`}
                                value={form.lastName} onChange={handleChange} />
                        </div>
                        <div className="form-group full">
                            <label className="form-label">Email</label>
                            <input name="email" className={`form-input${isChanged("email") ? " changed" : ""}`}
                                value={form.email} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <select name="department" className={`form-select${isChanged("department") ? " changed" : ""}`}
                                value={form.department} onChange={handleChange}>
                                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select name="role" className={`form-select${isChanged("role") ? " changed" : ""}`}
                                value={form.role} onChange={handleChange}>
                                {ROLES.map((r) => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select name="status" className={`form-select${isChanged("status") ? " changed" : ""}`}
                                value={form.status} onChange={handleChange}>
                                {STATUSES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">City</label>
                            <select name="city" className={`form-select${isChanged("city") ? " changed" : ""}`}
                                value={form.city} onChange={handleChange}>
                                {CITIES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Salary ($)</label>
                            <input name="salary" type="number" min="30000" max="300000"
                                className={`form-input${isChanged("salary") ? " changed" : ""}`}
                                value={form.salary} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Age</label>
                            <input name="age" type="number" min="18" max="70"
                                className={`form-input${isChanged("age") ? " changed" : ""}`}
                                value={form.age} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Diff preview */}
                    {changedFields.length > 0 && (
                        <div className="diff-preview">
                            <div className="diff-title">⚡ Changes ({changedFields.length} field{changedFields.length > 1 ? "s" : ""})</div>
                            {changedFields.map((k) => (
                                <div key={k} className="diff-row">
                                    <span style={{ color: "var(--text-secondary)", width: 90 }}>{k}:</span>
                                    <span className="diff-old">{String(user[k])}</span>
                                    <span className="diff-arrow">→</span>
                                    <span className="diff-new">{String(form[k])}</span>
                                </div>
                            ))}
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>
                                Only <strong style={{ color: "var(--accent-yellow)" }}>user:{user.id}</strong> will be evicted from L1 + L2 cache.
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="error-state" style={{ marginTop: 12 }}>❌ {error}</div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving || changedFields.length === 0}
                    >
                        {saving ? "Saving..." : `Save Changes${changedFields.length > 0 ? ` (${changedFields.length})` : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
