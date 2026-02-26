/**
 * API Service - communicates with backend
 */

const BASE_URL = "http://localhost:3001/api";

async function request(method, path, body) {
    const opts = {
        method,
        headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, opts);
    const source = res.headers.get("X-Cache-Source") || "UNKNOWN";
    const data = await res.json();
    return { ...data, _source: source };
}

export const fetchUsers = () => request("GET", "/users");
export const fetchUser = (id) => request("GET", `/users/${id}`);
export const updateUser = (id, patch) => request("PUT", `/users/${id}`, patch);
export const fetchCacheStats = () => request("GET", "/cache/stats");
export const resetCache = () => request("POST", "/cache/reset");
