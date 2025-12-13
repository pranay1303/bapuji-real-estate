// src/pages/admin/LeadsAdmin.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, Plus, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * LeadsAdmin.jsx
 * - Reads admin JWT from localStorage key "token" or from authToken prop.
 * - Token input removed from UI to avoid accidental disclosure.
 * - baseUrl: optional prop to point to backend (e.g. "http://localhost:5000")
 */

export default function LeadsAdmin({ baseUrl = "", authToken = "", pageSize = 20 }) {
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(pageSize);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({ propertyId: "", from: "", to: "" });

  const [showCreate, setShowCreate] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    email: "",
    property: "",
    action: "interested",
    source: "web",
  });
  const [creating, setCreating] = useState(false);

  // Read token from prop OR localStorage; do not expose in UI
  const token = authToken && authToken.length ? authToken : (localStorage.getItem("token") || "");

  const authHeaders = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = "Bearer " + token;
    return h;
  }, [token]);

  const buildUrl = useCallback(
    (path, params = {}) => {
      const base = baseUrl ? baseUrl.replace(/\/$/, "") : window.location.origin;
      const url = new URL(path, base);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
      });
      return url.toString();
    },
    [baseUrl]
  );

  const tryParseJson = async (res) => {
    const ct = res.headers.get("content-type") || "";
    const txt = await res.text();
    if (ct.includes("json")) {
      try {
        return JSON.parse(txt);
      } catch (err) {
        return { _parseError: true, _rawText: txt };
      }
    }
    return { _notJson: true, _rawText: txt };
  };

  const fetchProperties = useCallback(async () => {
    try {
      const url = buildUrl("/api/properties");
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) {
        const body = await res.text();
        console.warn("Properties fetch failed:", res.status, body);
        return;
      }
      const parsed = await tryParseJson(res);
      if (parsed._notJson || parsed._parseError) {
        console.warn("Properties non-json:", parsed._rawText);
        return;
      }
      setProperties(parsed.properties || parsed || []);
    } catch (err) {
      console.error("fetchProperties error", err);
    }
  }, [authHeaders, buildUrl]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit, propertyId: filters.propertyId, from: filters.from, to: filters.to };
      const url = buildUrl("/api/leads", params);
      const res = await fetch(url, { headers: authHeaders });

      if (res.status === 401 || res.status === 403) {
        let parsedBody = null;
        try { parsedBody = await res.json(); } catch {}
        setError(parsedBody?.message ? "Unauthorized: " + parsedBody.message : "Unauthorized — admin token required.");
        setLeads([]);
        setTotal(0);
        return;
      }

      if (!res.ok) {
        const body = await res.text();
        console.error("Leads fetch failed:", res.status, res.statusText, body);
        throw new Error("Failed to load leads");
      }

      const parsed = await tryParseJson(res);
      if (parsed._notJson) {
        console.error("Non-JSON response for leads:", parsed._rawText);
        setError("Server returned non-JSON response. Check API URL / proxy / auth.");
        setLeads([]);
        setTotal(0);
        return;
      }
      if (parsed._parseError) {
        console.error("JSON parse error for leads:", parsed._rawText);
        setError("Malformed JSON returned by server.");
        setLeads([]);
        setTotal(0);
        return;
      }

      const leadList = parsed.leads || parsed.data || parsed || [];
      setLeads(leadList);
      const totalVal = parsed && (parsed.total !== undefined && parsed.total !== null) ? parsed.total : (Array.isArray(leadList) ? leadList.length : 0);
      setTotal(Number.isFinite(totalVal) ? totalVal : 0);
    } catch (err) {
      console.error("fetchLeads error", err);
      setError(err.message || "Error fetching leads");
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, authHeaders, buildUrl]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const createLead = async (ev) => {
    ev && ev.preventDefault();
    setCreating(true);
    try {
      if (!newLead.phone || !newLead.property || !newLead.action) throw new Error("phone, property and action are required");

      const url = buildUrl("/api/leads");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newLead.phone, name: newLead.name, email: newLead.email, propertyId: newLead.property, action: newLead.action, source: newLead.source })
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("Create lead failed:", res.status, res.statusText, body);
        throw new Error("Failed to create lead");
      }

      const parsed = await tryParseJson(res);
      if (parsed._notJson || parsed._parseError) throw new Error("Create lead: invalid server response");

      const createdLead = parsed.lead || parsed.data || parsed;
      if (createdLead && !createdLead.createdAt) createdLead.createdAt = new Date().toISOString();

      setLeads(prev => [createdLead, ...(prev || [])]);
      setTotal(prev => (Number.isFinite(prev) ? prev + 1 : 1));

      setShowCreate(false);
      setNewLead({ name: "", phone: "", email: "", property: "", action: "interested", source: "web" });
    } catch (err) {
      console.error("createLead error", err);
      // optionally show an alert or toast
    } finally {
      setCreating(false);
    }
  };

  // Export current page to CSV (no template literals in critical area)
  const exportCsv = () => {
    if (!leads || leads.length === 0) {
      alert("No leads to export");
      return;
    }
    const header = ["Name", "Phone", "Email", "Property", "Action", "Source", "CreatedAt"];
    const rows = leads.map(function (l) {
      return [
        l.name || "",
        l.phone || "",
        l.email || "",
        (l.property && (l.property.name || l.property.title || l.property._id)) || "",
        l.action || "",
        l.source || "",
        l.createdAt ? new Date(l.createdAt).toLocaleString() : ""
      ];
    });
    const all = [header].concat(rows);
    const csv = all.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell || "").replace(/"/g, '""');
        return '"' + s + '"';
      }).join(",");
    }).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_page_" + String(page) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Leads Admin</h1>
            <p className="mt-1 text-sm text-gray-500">All enquiries collected from website.</p>
          </div>

          <div className="flex gap-3 items-center">
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-md shadow hover:bg-indigo-700">
              <Plus size={16} /> Add Lead
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 border px-3 py-2 rounded-md">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </header>

        <section className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property</label>
              <select value={filters.propertyId} onChange={e => { setFilters(f => ({ ...f, propertyId: e.target.value })); setPage(1); }} className="w-full border rounded px-3 py-2">
                <option value="">All Properties</option>
                {properties.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.title || p.address || p._id}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <input type="date" value={filters.from} onChange={e => { setFilters(f => ({ ...f, from: e.target.value })); setPage(1); }} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <input type="date" value={filters.to} onChange={e => { setFilters(f => ({ ...f, to: e.target.value })); setPage(1); }} className="w-full border rounded px-3 py-2" />
            </div>

            <div className="flex items-end gap-2">
              <button onClick={() => { setFilters({ propertyId: "", from: "", to: "" }); setPage(1); }} className="px-3 py-2 border rounded">Reset</button>
              <button onClick={() => fetchLeads()} className="px-3 py-2 bg-indigo-600 text-white rounded">Apply</button>
            </div>
          </div>
        </section>

        <section className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="text-sm text-gray-600">Showing {leads.length} of {total} leads</div>
            <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
          </div>

          <div className="overflow-x-auto min-h-[180px]">
            <table className="min-w-full text-sm divide-y">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Property</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="p-8 text-center text-red-600 whitespace-pre-wrap">{error}</td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center">No leads found</td></tr>
                ) : (
                  leads.map(lead => (
                    <motion.tr key={lead._id || lead.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                      <td className="px-4 py-3 font-medium">{lead.name || "-"}</td>
                      <td className="px-4 py-3">{lead.phone || "-"}</td>
                      <td className="px-4 py-3">{lead.email || "-"}</td>
                      <td className="px-4 py-3">{lead.property && (lead.property.name || lead.property.title || lead.property._id)}</td>
                      <td className="px-4 py-3 capitalize text-indigo-700">{lead.action}</td>
                      <td className="px-4 py-3">{lead.source}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "-"}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm">Rows:</label>
              <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <div className="px-3 py-1 border rounded">{page}</div>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="px-3 py-1 border rounded disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Create Lead Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowCreate(false)} />

          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium mb-4">Add Lead</h3>
            <form onSubmit={createLead} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input value={newLead.name} onChange={e => setNewLead(n => ({ ...n, name: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone *</label>
                <input value={newLead.phone} onChange={e => setNewLead(n => ({ ...n, phone: e.target.value }))} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input value={newLead.email} onChange={e => setNewLead(n => ({ ...n, email: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm mb-1">Property *</label>
                <select value={newLead.property} onChange={e => setNewLead(n => ({ ...n, property: e.target.value }))} className="w-full border rounded px-3 py-2" required>
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.title || p._id}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Action *</label>
                <select value={newLead.action} onChange={e => setNewLead(n => ({ ...n, action: e.target.value }))} className="w-full border rounded px-3 py-2" required>
                  <option value="interested">Interested</option>
                  <option value="download_brochure">Download Brochure</option>
                  <option value="contacted">Contacted</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
