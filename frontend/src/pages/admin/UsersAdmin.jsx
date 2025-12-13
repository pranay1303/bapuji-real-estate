// src/pages/admin/UsersAdmin.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { motion } from "framer-motion";

/* ============================
   Helper components & utils
   ============================ */
function Badge({ children }) {
  return <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{children}</span>;
}

const normalizeUsersEndpoint = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

const normalizeAdminsEndpoint = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.admins)) return data.admins;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

const normalizeAdmin = (a) => {
  if (!a) return null;
  const admin = a.admin || a; // accept { admin: {...} } or raw admin
  return {
    _id: admin._id || admin.id,
    name: admin.name || admin.email || "Admin",
    email: admin.email || "",
    username: admin.username || (admin.email ? admin.email.split("@")[0] : ""),
    mobile: admin.mobile || admin.phone || "",
    profileImage: admin.profileImage || "",
    preferences: admin.preferences || { city: "", minBudget: 0, maxBudget: 0, bhk: "" },
    role: admin.role || "admin",
    isVerified: typeof admin.isVerified === "boolean" ? admin.isVerified : true,
    isActive: typeof admin.isActive === "boolean" ? admin.isActive : true,
    createdAt: admin.createdAt,
    lastLogin: admin.lastLogin || admin.updatedAt || admin.createdAt,
    // meta
    __rawAdmin: admin,
  };
};

const dedupeMerge = (users = [], admins = []) => {
  const out = [];
  const seen = new Set();
  const add = (it, source = "user") => {
    const key = it._id || it.id || it.email || JSON.stringify(it);
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ ...it, source });
    }
  };
  users.forEach(u => add(u, "user"));
  admins.forEach(a => add(a, "admin"));
  return out;
};

/* ============================
   Main component
   ============================ */
export default function UsersAdmin() {
  const [items, setItems] = useState([]); // merged users+admins
  const [rawResponse, setRawResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all | user | admin
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    setRawResponse(null);

    try {
      const [usersRes, adminsRes] = await Promise.allSettled([
        api.get("/api/admin/users"),
        api.get("/api/admin/users/admins"),
      ]);

      const usersList = usersRes.status === "fulfilled" ? normalizeUsersEndpoint(usersRes.value.data) : [];
      const adminsListRaw = adminsRes.status === "fulfilled" ? normalizeAdminsEndpoint(adminsRes.value.data) : [];

      // normalize admin objects
      const adminsNormalized = adminsListRaw.map(normalizeAdmin);

      const merged = dedupeMerge(usersList, adminsNormalized)
        .map(it => ({ ...it, role: it.role || (it.source === "admin" ? "admin" : "user") }));

      setItems(merged);

      setRawResponse({
        usersEndpoint: usersRes.status === "fulfilled" ? usersRes.value.data : (usersRes.reason?.response?.data || String(usersRes.reason)),
        adminsEndpoint: adminsRes.status === "fulfilled" ? adminsRes.value.data : (adminsRes.reason?.response?.data || String(adminsRes.reason)),
      });
    } catch (err) {
      console.error("fetchAll error", err);
      setError(err?.response?.data?.message || err.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => fetchAll();

  const filtered = items.filter(u => {
    if (roleFilter !== "all" && (u.role || "user") !== roleFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q);
  });

  // For admin-collection items we will try admin-specific endpoints first.
  const apiFor = (item, actionPath) => {
    // actionPath e.g. 'role', 'block', '' (delete)
    if (item.source === "user") {
      return { url: `/api/admin/users/${item._id}${actionPath ? `/${actionPath}` : ""}`, isAdminCollection: false };
    } else {
      // try admin management API path
      return { url: `/api/admin/admins/${item._id}${actionPath ? `/${actionPath}` : ""}`, isAdminCollection: true };
    }
  };

  // Attempt action for given item:
  // 1) try admin-collection endpoint (if item.source==='admin')
  // 2) if 404 or not found, fallback to user-collection endpoint
  const performAction = async ({ item, action, payload = null }) => {
    // action: 'role' (PUT), 'block' (PUT), 'delete' (DELETE)
    const { url: primaryUrl, isAdminCollection } = apiFor(item, action === "delete" ? "" : action);
    const method = action === "delete" ? "delete" : "put";

    try {
      // primary attempt
      if (method === "put") {
        await api.put(primaryUrl, payload || {});
      } else {
        await api.delete(primaryUrl);
      }
      return { ok: true, used: primaryUrl };
    } catch (err) {
      // if primary was admin-collection and failed with 404/501, fallback to users collection
      const status = err?.response?.status;
      if (isAdminCollection && (status === 404 || status === 501 || status === 405)) {
        // fallback to user endpoint
        const fallbackUrl = `/api/admin/users/${item._id}${action === "delete" ? "" : `/${action}`}`;
        try {
          if (method === "put") {
            await api.put(fallbackUrl, payload || {});
          } else {
            await api.delete(fallbackUrl);
          }
          return { ok: true, used: fallbackUrl, fallback: true };
        } catch (err2) {
          return { ok: false, error: err2 };
        }
      }
      return { ok: false, error: err };
    }
  };

  /* ============================
     Action handlers
     ============================ */
  const toggleRole = async (user) => {
    if (!user || !user._id) return;
    const nextRole = (user.role === "admin") ? "user" : "admin";
    if (!confirm(`Change role of ${user.name || user.email} to ${nextRole}?`)) return;

    try {
      setBusyId(user._id);
      const result = await performAction({ item: user, action: "role", payload: { role: nextRole } });
      if (!result.ok) throw result.error;
      // reflect in UI
      setItems(prev => prev.map(p => p._id === user._id ? { ...p, role: nextRole } : p));
      alert(`Role updated (via ${result.used}${result.fallback ? " - fallback" : ""})`);
    } catch (err) {
      console.error("toggleRole error", err);
      alert(err?.response?.data?.message || err.message || "Failed to change role");
    } finally {
      setBusyId(null);
    }
  };

  const toggleBlock = async (user) => {
    if (!user || !user._id) return;
    const block = !user.blocked;
    if (!confirm(`${block ? "Block" : "Unblock"} ${user.name || user.email}?`)) return;

    try {
      setBusyId(user._id);
      const result = await performAction({ item: user, action: "block", payload: { block } });
      if (!result.ok) throw result.error;
      setItems(prev => prev.map(p => p._id === user._id ? { ...p, blocked: block } : p));
      alert(`Updated (via ${result.used}${result.fallback ? " - fallback" : ""})`);
    } catch (err) {
      console.error("toggleBlock error", err);
      alert(err?.response?.data?.message || err.message || "Failed to update");
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (user) => {
    if (!user || !user._id) return;
    if (!confirm(`Permanently delete user ${user.name || user.email}? This cannot be undone.`)) return;

    try {
      setBusyId(user._id);
      const result = await performAction({ item: user, action: "delete" });
      if (!result.ok) throw result.error;
      setItems(prev => prev.filter(p => p._id !== user._id));
      alert(`Deleted (via ${result.used}${result.fallback ? " - fallback" : ""})`);
    } catch (err) {
      console.error("removeUser error", err);
      alert(err?.response?.data?.message || err.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const loadDetails = async (item) => {
    // If admin and we already have raw admin, show that
    if (item.source === "admin" && item.__rawAdmin) {
      // normalize details for modal too (so fields exist)
      const normalized = {
        ...item,
        username: item.username || (item.email ? item.email.split("@")[0] : "-"),
        lastLogin: item.lastLogin || item.updatedAt || item.createdAt,
      };
      setSelected(normalized);
      return;
    }
    // otherwise fetch details from user endpoint
    try {
      setBusyId(item._id);
      const res = await api.get(`/api/admin/users/${item._id}`);
      setSelected(res.data.user || res.data);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to load details");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="text-sm text-gray-500">Manage app users and admins</div>
      </div>

      <div className="mt-4 bg-white p-4 rounded shadow-sm">
        <div className="flex gap-3 items-center">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, email or username" className="border px-3 py-2 rounded flex-1" />
          <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="border px-3 py-2 rounded">
            <option value="all">All roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
          <button onClick={refresh} className="px-3 py-2 border rounded">Refresh</button>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Loading users…</div>
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50 rounded">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-gray-500">No users found.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {filtered.map(u => (
              <div key={u._id || u.id || u.email} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-blue-600 text-white flex items-center justify-center font-bold">
                    { (u.name || u.email || "U").slice(0,1).toUpperCase() }
                  </div>
                  <div>
                    <div className="font-medium">{u.name || u.email}</div>
                    <div className="text-sm text-gray-500">{u.email} • {u.username || "-"}</div>
                    <div className="mt-1">
                      <Badge>{u.role || "user"}</Badge>
                      {u.source === "admin" && <span className="ml-2 text-xs text-indigo-600">admin (Admin collection)</span>}
                      {u.blocked && <span className="ml-2 text-xs text-red-600">Blocked</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={()=>loadDetails(u)} className="px-3 py-1 border rounded text-sm" disabled={busyId===u._id}>{busyId===u._id ? "..." : "Details"}</button>

                  <button
                    onClick={()=>toggleRole(u)}
                    className="px-3 py-1 border rounded text-sm"
                    disabled={busyId===u._id}
                    title="Change role"
                  >
                    {u.role === "admin" ? "Demote" : "Promote"}
                  </button>

                  <button
                    onClick={()=>toggleBlock(u)}
                    className={`px-3 py-1 rounded text-sm ${u.blocked ? "border" : "bg-yellow-100 border"}`}
                    disabled={busyId===u._id}
                    title="Block/Unblock user"
                  >
                    {u.blocked ? "Unblock" : "Block"}
                  </button>

                  <button onClick={()=>removeUser(u)} className="px-3 py-1 bg-red-600 text-white rounded text-sm" disabled={busyId===u._id}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details drawer/modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded shadow-lg p-6 relative">
            <button onClick={()=>setSelected(null)} className="absolute right-3 top-3 text-gray-500">✕</button>
            <h3 className="text-xl font-semibold mb-2">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium">{selected.name || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{selected.email || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Username</div>
                <div className="font-medium">{selected.username || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Role</div>
                <div className="font-medium">{selected.role ?? "-"}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-medium">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Last login</div>
                <div className="font-medium">{selected.lastLogin ? new Date(selected.lastLogin).toLocaleString() : (selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "-")}</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={()=>{ if (selected._id) toggleRole(selected); setSelected(null); }} className="px-3 py-2 border rounded">Change role</button>
              <button onClick={()=>{ if (selected._id) toggleBlock(selected); setSelected(null); }} className="px-3 py-2 border rounded">Block / Unblock</button>
              <button onClick={()=>{ if (selected._id) removeUser(selected); setSelected(null); }} className="px-3 py-2 bg-red-600 text-white rounded">Delete</button>
              <button onClick={()=>setSelected(null)} className="px-3 py-2 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Raw response debug panel */}
      <div className="mt-4">
        <div className="text-xs text-gray-500">Raw response (helpful while debugging API shapes)</div>
        <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto" style={{ maxHeight: 200, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(rawResponse, null, 2)}
        </pre>
      </div>
    </motion.div>
  );
}
