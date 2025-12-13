import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, X, Download, Filter, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "../../hooks/useToast";

/**
 * src/pages/admin/ReviewsAdmin.jsx
 * Admin page to list, filter, export and moderate reviews.
 * - GET /api/reviews?propertyId=&approved=&page=&limit=
 * - PUT /api/reviews/:id/moderate  (body: { approve: true | false })  (protected)
 *
 * Usage:
 * - Requires admin JWT to moderate reviews. Put token in localStorage key "token" (other admin pages follow same convention).
 */

export default function ReviewsAdmin({ baseUrl = "" , pageSize = 20 }) {
  const { show, Toast } = useToast();

  const [reviews, setReviews] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(pageSize);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({ propertyId: "", approved: "" });

  const [viewReview, setViewReview] = useState(null);
  const [moderating, setModerating] = useState(false);

  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const authHeaders = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const buildUrl = useCallback((path, params = {}) => {
    const base = baseUrl ? baseUrl.replace(/\/$/, "") : window.location.origin;
    const url = new URL(path, base);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
    return url.toString();
  }, [baseUrl]);

  const tryParseJson = async (res) => {
    const ct = res.headers.get("content-type") || "";
    const txt = await res.text();
    if (ct.includes("json") || ct.includes("application/json")) {
      try { return JSON.parse(txt); } catch (e) { return { _parseError: true, _rawText: txt }; }
    }
    return { _notJson: true, _rawText: txt };
  };

  // fetch properties for filter dropdown (non-protected endpoint)
  const fetchProperties = useCallback(async () => {
    try {
      const url = buildUrl("/api/properties");
      const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
      if (!res.ok) return;
      const parsed = await tryParseJson(res);
      if (parsed._notJson || parsed._parseError) return;
      setProperties(parsed.properties || parsed || []);
    } catch (err) {
      console.warn("properties fetch error", err);
    }
  }, [buildUrl]);

  // fetch reviews (protected read not required in backend but admin page may want all statuses)
  const fetchReviews = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { page, limit, propertyId: filters.propertyId, approved: filters.approved };
      const url = buildUrl("/api/reviews", params);
      const res = await fetch(url, { headers: authHeaders });

      if (res.status === 401 || res.status === 403) {
        let parsed = null;
        try { parsed = await res.json(); } catch {}
        setError(parsed?.message ? `Unauthorized: ${parsed.message}` : "Unauthorized — admin token required.");
        setReviews([]); setTotal(0); return;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Status ${res.status}`);
      }

      const parsed = await tryParseJson(res);
      if (parsed._notJson || parsed._parseError) {
        setError("Server returned non-JSON response"); setReviews([]); setTotal(0); return;
      }

      setReviews(parsed.reviews || parsed.data || parsed || []);
      const totalVal = (parsed && (parsed.total !== undefined && parsed.total !== null)) ? parsed.total : (Array.isArray(parsed.reviews) ? parsed.reviews.length : 0);
      setTotal(Number.isFinite(totalVal) ? totalVal : 0);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load reviews");
    } finally { setLoading(false); }
  }, [page, limit, filters, authHeaders, buildUrl]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // moderate single review
  const moderate = async (reviewId, approve) => {
    if (!reviewId) return;
    if (!window.confirm(approve ? "Approve this review?" : "Reject (unapprove) this review?")) return;
    setModerating(true);
    try {
      const url = buildUrl(`/api/reviews/${reviewId}/moderate`);
      const res = await fetch(url, { method: "PUT", headers: authHeaders, body: JSON.stringify({ approve }) });
      if (!res.ok) {
        const t = await res.text(); throw new Error(t || `Status ${res.status}`);
      }
      const parsed = await tryParseJson(res);
      if (parsed._notJson || parsed._parseError) throw new Error("Invalid server response");
      const updated = parsed.review || parsed;
      setReviews(prev => prev.map(r => (r._id === updated._id ? updated : r)));
      if (viewReview && viewReview._id === updated._id) setViewReview(updated);
      show(parsed.message || "Review updated", { type: "success" });
    } catch (err) {
      console.error("moderate error", err);
      show(err.message || "Failed to moderate review", { type: "error" });
    } finally { setModerating(false); }
  };

  // export csv of current page
  const exportCsv = () => {
    if (!reviews || reviews.length === 0) return show("No reviews to export", { type: "info" });
    const header = ["Property","User","Phone","Rating","Comment","Approved","CreatedAt"];
    const rows = reviews.map(r => [ (r.property && (r.property.name || r.property.title)) || r.property || "", r.userName || "", r.userPhone || "", r.rating || "", r.comment || "", r.approved ? "true" : "false", r.createdAt ? new Date(r.createdAt).toLocaleString() : "" ]);
    const all = [header].concat(rows);
    const csv = all.map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `reviews_page${page}.csv`; a.click(); URL.revokeObjectURL(u);
    show("CSV exported", { type: "success" });
  };

  const totalPages = Math.max(1, Math.ceil(total / limit || 1));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Reviews Moderation</h1>
            <p className="text-sm text-gray-500">Approve or reject reviews before publishing.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportCsv} className="inline-flex items-center gap-2 border px-3 py-2 rounded-md">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </header>

        {/* Filters */}
        <section className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-gray-600">Property</label>
              <select value={filters.propertyId} onChange={e => { setFilters(f => ({ ...f, propertyId: e.target.value })); setPage(1); }} className="w-full border rounded px-3 py-2">
                <option value="">All Properties</option>
                {properties.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.title || p._id}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Status</label>
              <select value={filters.approved} onChange={e => { setFilters(f => ({ ...f, approved: e.target.value })); setPage(1); }} className="w-full border rounded px-3 py-2">
                <option value="">All</option>
                <option value="true">Approved</option>
                <option value="false">Pending / Unapproved</option>
              </select>
            </div>

            <div className="flex items-end">
              <button onClick={() => { setFilters({ propertyId: "", approved: "" }); setPage(1); }} className="px-3 py-2 border rounded">Reset</button>
            </div>

            <div className="flex items-end justify-end gap-2">
              <div className="text-sm text-gray-600">Rows</div>
              <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <button onClick={() => fetchReviews()} className="px-3 py-2 bg-indigo-600 text-white rounded">Apply</button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="text-sm text-gray-600">Showing {reviews.length} of {total} reviews</div>
            <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Property</th>
                  <th className="px-4 py-3 text-left">Rating</th>
                  <th className="px-4 py-3 text-left">Comment</th>
                  <th className="px-4 py-3 text-left">Approved</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={8} className="p-8 text-center text-red-600 whitespace-pre-wrap">{error}</td></tr>
                ) : reviews.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center">No reviews found</td></tr>
                ) : (
                  reviews.map(r => (
                    <tr key={r._id || r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{r.userName || "Anonymous"}</td>
                      <td className="px-4 py-3">{r.userPhone || "-"}</td>
                      <td className="px-4 py-3">{r.property && (r.property.name || r.property.title || r.property._id)}</td>
                      <td className="px-4 py-3">{r.rating}</td>
                      <td className="px-4 py-3 max-w-xl truncate">{r.comment}</td>
                      <td className="px-4 py-3">{r.approved ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-gray-600">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button title="View" onClick={() => setViewReview(r)} className="px-2 py-1 border rounded text-sm"><Eye size={14} /></button>
                          {!r.approved ? (
                            <button title="Approve" onClick={() => moderate(r._id || r.id, true)} className="px-2 py-1 bg-green-50 text-green-700 rounded border text-sm inline-flex items-center gap-1"><Check size={14}/>Approve</button>
                          ) : (
                            <button title="Unapprove" onClick={() => moderate(r._id || r.id, false)} className="px-2 py-1 bg-red-50 text-red-700 rounded border text-sm inline-flex items-center gap-1"><X size={14}/>Unapprove</button>
                          )}
                        </div>
                      </td>
                    </tr>
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
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-50"><ChevronLeft size={16} /></button>
              <div className="px-3 py-1 border rounded">{page}</div>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="px-3 py-1 border rounded disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        </section>
      </div>

      {/* View / moderate modal */}
      {viewReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setViewReview(null)} />
          <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Review details</h3>
                <div className="text-sm text-gray-500">{viewReview.userName || "Anonymous"} · {viewReview.userPhone || "-"}</div>
              </div>
              <div className="flex gap-2">
                {!viewReview.approved ? (
                  <button onClick={() => moderate(viewReview._id || viewReview.id, true)} disabled={moderating} className="px-3 py-2 bg-green-600 text-white rounded">{moderating ? '...' : 'Approve'}</button>
                ) : (
                  <button onClick={() => moderate(viewReview._id || viewReview.id, false)} disabled={moderating} className="px-3 py-2 bg-red-600 text-white rounded">{moderating ? '...' : 'Unapprove'}</button>
                )}
                <button onClick={() => setViewReview(null)} className="px-3 py-2 border rounded">Close</button>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-600">Property</div>
              <div className="font-medium">{viewReview.property && (viewReview.property.name || viewReview.property.title || viewReview.property._id)}</div>
            </div>

            <div className="mt-3">
              <div className="text-sm text-gray-600">Rating</div>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} filled={i < (viewReview.rating || 0)} />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-600">Comment</div>
              <div className="mt-2 p-3 bg-gray-50 rounded">{viewReview.comment || "-"}</div>
            </div>

            <div className="mt-4 text-sm text-gray-500">Created: {viewReview.createdAt ? new Date(viewReview.createdAt).toLocaleString() : '-'}</div>
          </motion.div>
        </div>
      )}

      <Toast />
    </div>
  );
}

// Simple star component used inside modal (keeps dependency to lucide small)
function Star({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : '#e5e7eb'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <path d="M12 .587l3.668 7.431L24 9.748l-6 5.84 1.416 8.274L12 19.771 4.584 23.862 6 15.587 0 9.748l8.332-1.73z" />
    </svg>
  );
}
