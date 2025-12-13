// src/pages/admin/InquiriesAdmin.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * InquiriesAdmin.jsx
 * - Read admin JWT from localStorage or authToken prop.
 * - Uses internal Toasts & ConfirmModal components (no external hook required).
 * - Features: list, filters, search, pagination, view/reply, close (single + bulk), export CSV.
 *
 * Make sure backend has:
 *  POST /api/inquiries/:id/reply
 *  POST /api/inquiries/:id/close
 *  GET  /api/inquiries
 */

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);
  const show = useCallback((text, { type = "info", duration = 4000 } = {}) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, text, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
    }
  }, []);
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  return { toasts, show, remove };
}

function Toasts({ toasts, onRemove }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={
              "max-w-sm px-4 py-2 rounded shadow-lg text-sm border " +
              (t.type === "error" ? "bg-red-50 text-red-800 border-red-200" :
               t.type === "success" ? "bg-green-50 text-green-800 border-green-200" :
               t.type === "warning" ? "bg-yellow-50 text-yellow-800 border-yellow-200" :
               "bg-white text-gray-800 border-gray-200")
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">{t.text}</div>
              <button onClick={() => onRemove(t.id)} className="text-xs opacity-60">✕</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmText = "Yes", cancelText = "Cancel" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onCancel}></div>
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 bg-white rounded shadow max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 border rounded">{cancelText}</button>
          <button onClick={onConfirm} className="px-3 py-2 bg-red-600 text-white rounded">{confirmText}</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function InquiriesAdmin({ baseUrl = "", authToken = "", pageSize = 20 }) {
  // toasts
  const { toasts, show, remove } = useToasts();

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(pageSize);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // selection for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // slide-over / detail view
  const [openInquiry, setOpenInquiry] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // confirm modal
  const [confirmState, setConfirmState] = useState({ open: false, onConfirm: null, title: "", message: "" });

  const token = authToken && authToken.length ? authToken : (localStorage.getItem("token") || "");
  const authHeaders = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = "Bearer " + token;
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
    if (ct.includes("json")) {
      try { return JSON.parse(txt); } catch { return { _parseError: true, _rawText: txt }; }
    }
    return { _notJson: true, _rawText: txt };
  };

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = buildUrl("/api/inquiries", { status: statusFilter, page, limit });
      const res = await fetch(url, { headers: authHeaders });

      if (res.status === 401 || res.status === 403) {
        let parsed = null;
        try { parsed = await res.json(); } catch {}
        const msg = parsed?.message ? "Unauthorized: " + parsed.message : "Unauthorized — admin token needed.";
        setError(msg);
        setInquiries([]);
        setTotal(0);
        show(msg, { type: "error" });
        setLoading(false);
        return;
      }

      const parsed = await tryParseJson(res);
      if (!res.ok || parsed._notJson || parsed._parseError) {
        const msg = "Invalid server response while fetching inquiries";
        setError(msg);
        setInquiries([]);
        setTotal(0);
        show(msg, { type: "error" });
        setLoading(false);
        return;
      }

      setInquiries(parsed.inquiries || []);
      setTotal(parsed.total || 0);
      // reset selection on new fetch
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (err) {
      setError("Failed to load inquiries");
      show("Failed to load inquiries", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, limit, authHeaders, buildUrl, show]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  // client-side search filter for the currently loaded page
  const visibleInquiries = useMemo(() => {
    if (!searchQuery) return inquiries;
    const q = searchQuery.toLowerCase();
    return inquiries.filter(i =>
      (i.userName || "").toLowerCase().includes(q) ||
      (i.userPhone || "").toLowerCase().includes(q) ||
      (i.message || "").toLowerCase().includes(q) ||
      (i.property && (i.property.name || i.property.title) || "").toLowerCase().includes(q)
    );
  }, [inquiries, searchQuery]);

  // selection helpers
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      setSelectAll(false);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set((visibleInquiries || []).map(i => i._id || i.id));
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  };

  // open details
  const openDetails = (inq) => {
    setOpenInquiry(inq);
    setReplyText("");
  };

  // reply
  const sendReply = async () => {
    if (!openInquiry) return;
    if (!replyText || !replyText.trim()) { show("Enter a reply message", { type: "warning" }); return; }
    setReplying(true);
    try {
      const id = openInquiry._id || openInquiry.id;
      const url = buildUrl("/api/inquiries/" + id + "/reply");
      const res = await fetch(url, { method: "POST", headers: authHeaders, body: JSON.stringify({ reply: replyText.trim() }) });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || ("Status " + res.status));
      }
      const parsed = await tryParseJson(res);
      if (parsed._notJson || parsed._parseError) throw new Error("Reply: invalid server response");
      const updated = parsed.inquiry || parsed;
      setOpenInquiry(updated);
      setInquiries(prev => prev.map(i => (i._id === updated._id ? updated : i)));
      setReplyText("");
      show(parsed.message || "Reply added", { type: "success" });
    } catch (err) {
      console.error("reply error", err);
      show(err.message || "Failed to send reply", { type: "error" });
    } finally {
      setReplying(false);
    }
  };

  // close single
  const closeInquiry = (inqId) => {
    setConfirmState({
      open: true,
      title: "Close inquiry",
      message: "Are you sure you want to mark this inquiry as CLOSED? This action can be reversed by replying or changing status on server.",
      onConfirm: async () => {
        setConfirmState({ open: false });
        try {
          const url = buildUrl("/api/inquiries/" + inqId + "/close");
          const res = await fetch(url, { method: "POST", headers: authHeaders });
          if (!res.ok) {
            const t = await res.text();
            throw new Error(t || ("Status " + res.status));
          }
          const parsed = await tryParseJson(res);
          if (parsed._notJson || parsed._parseError) throw new Error("Close: invalid server response");
          const updated = parsed.inquiry || parsed;
          setInquiries(prev => prev.map(i => (i._id === updated._id ? updated : i)));
          if (openInquiry && openInquiry._id === updated._id) setOpenInquiry(updated);
          show(parsed.message || "Inquiry closed", { type: "success" });
        } catch (err) {
          console.error("close error", err);
          show(err.message || "Failed to close inquiry", { type: "error" });
        }
      }
    });
  };

  // bulk close
  const bulkClose = () => {
    if (!selectedIds || selectedIds.size === 0) { show("No inquiries selected", { type: "warning" }); return; }
    setConfirmState({
      open: true,
      title: "Close selected inquiries",
      message: `Close ${selectedIds.size} selected inquiry(ies)?`,
      onConfirm: async () => {
        setConfirmState({ open: false });
        try {
          show("Closing selected...", { type: "info" });
          // sequentially close to keep it simple; could parallelize with Promise.all if desired
          const ids = Array.from(selectedIds);
          for (const id of ids) {
            const url = buildUrl("/api/inquiries/" + id + "/close");
            const res = await fetch(url, { method: "POST", headers: authHeaders });
            if (!res.ok) {
              const t = await res.text();
              show("Close failed for one item: " + (t || res.status), { type: "error" });
              // continue others
              continue;
            }
            const parsed = await tryParseJson(res);
            const updated = parsed.inquiry || parsed;
            setInquiries(prev => prev.map(i => (i._id === updated._id ? updated : i)));
          }
          setSelectedIds(new Set());
          setSelectAll(false);
          show("Bulk close completed", { type: "success" });
        } catch (err) {
          console.error("bulk close error", err);
          show("Bulk close encountered errors", { type: "error" });
        }
      }
    });
  };

  // export CSV
  const exportCsv = () => {
    if (!inquiries || inquiries.length === 0) { show("No inquiries to export", { type: "warning" }); return; }
    const header = ["Property", "UserName", "UserPhone", "Message", "Status", "Replies", "CreatedAt"];
    const rows = inquiries.map(function (iq) {
      const repliesText = (iq.replies || []).map(r => (r.from + ": " + (r.message || ""))).join(" || ");
      return [
        (iq.property && (iq.property.name || iq.property.title)) || "",
        iq.userName || "",
        iq.userPhone || "",
        iq.message || "",
        iq.status || "",
        repliesText,
        iq.createdAt ? new Date(iq.createdAt).toLocaleString() : ""
      ];
    });
    const all = [header].concat(rows);
    const csv = all.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell || "").replace(/"/g, '""');
        return '"' + s + '"';
      }).join(",");
    }).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inquiries_page_" + String(page) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    show("CSV exported", { type: "success" });
  };

  const totalPages = Math.max(1, Math.ceil(total / limit || 1));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toasts toasts={toasts} onRemove={remove} />
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => confirmState.onConfirm && confirmState.onConfirm()}
        onCancel={() => setConfirmState({ open: false })}
      />

      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Inquiries</h1>
            <p className="mt-1 text-sm text-gray-500">User messages and admin replies for properties.</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={exportCsv} className="inline-flex items-center gap-2 border px-4 py-2 rounded-md">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </header>

        {/* filter + search + bulk toolbar */}
        <section className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="w-full border rounded px-3 py-2" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Search</label>
              <input className="w-full border rounded px-3 py-2" placeholder="Search by name, phone, property or message..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setStatusFilter(""); setSearchQuery(""); setPage(1); }} className="px-3 py-2 border rounded">Reset</button>
              <button onClick={() => fetchInquiries()} className="px-3 py-2 bg-indigo-600 text-white rounded">Apply</button>
            </div>

            <div className="md:col-span-6 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="h-4 w-4" />
                <span className="text-sm">Select all visible</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={bulkClose} className="px-3 py-2 bg-red-600 text-white rounded" disabled={selectedIds.size === 0}>Close selected ({selectedIds.size})</button>
              </div>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="text-sm text-gray-600">Showing {visibleInquiries.length} of {total} inquiries</div>
            <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Select</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Property</th>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Replies</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y">
                {loading ? (
                  <tr><td colSpan={9} className="p-8 text-center">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={9} className="p-8 text-center text-red-600 whitespace-pre-wrap">{error}</td></tr>
                ) : visibleInquiries.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center">No inquiries found</td></tr>
                ) : (
                  visibleInquiries.map((iq) => {
                    const id = iq._id || iq.id;
                    const checked = selectedIds.has(id);
                    return (
                      <tr key={id} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={checked} onChange={() => toggleSelect(id)} className="h-4 w-4" />
                        </td>
                        <td className="px-4 py-3 font-medium">{iq.userName || "-"}</td>
                        <td className="px-4 py-3">{iq.userPhone || "-"}</td>
                        <td className="px-4 py-3">{iq.property && (iq.property.name || iq.property.title || "-")}</td>
                        <td className="px-4 py-3 max-w-xl truncate">{iq.message}</td>
                        <td className="px-4 py-3 capitalize">{iq.status}</td>
                        <td className="px-4 py-3">{(iq.replies || []).length}</td>
                        <td className="px-4 py-3 text-gray-600">{iq.createdAt ? new Date(iq.createdAt).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openDetails(iq)} className="px-2 py-1 border rounded text-sm">View</button>
                            <button
                              onClick={() => closeInquiry(id)}
                              disabled={iq.status === "closed"}
                              className={"px-2 py-1 text-sm rounded " + (iq.status === "closed" ? "bg-gray-100 text-gray-500 border" : "bg-red-50 text-red-700 border")}
                            >
                              Close
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm">Rows:</label>
              <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
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

      {/* Slide-over detail + reply */}
      {openInquiry && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setOpenInquiry(null)} />

          <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} className="relative ml-auto w-full max-w-2xl bg-white h-full shadow-xl overflow-auto p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">Inquiry Details</h2>
                <div className="text-sm text-gray-500">{openInquiry.property && (openInquiry.property.name || openInquiry.property.title)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => closeInquiry(openInquiry._id || openInquiry.id)}
                  disabled={openInquiry.status === "closed"}
                  className={"px-3 py-2 text-sm rounded " + (openInquiry.status === "closed" ? "bg-gray-100 text-gray-500 border" : "bg-red-600 text-white")}
                >
                  Mark Closed
                </button>
                <button onClick={() => setOpenInquiry(null)} className="px-3 py-2 border rounded">Close</button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700">From</h3>
              <div className="mt-1">{openInquiry.userName || "-"} · {openInquiry.userPhone || "-"}</div>
              <div className="mt-2 text-sm text-gray-600">Created: {openInquiry.createdAt ? new Date(openInquiry.createdAt).toLocaleString() : "-"}</div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700">Message</h3>
              <div className="mt-2 p-3 bg-gray-50 rounded">{openInquiry.message}</div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700">Conversation</h3>
              <div className="mt-3 space-y-3">
                {(openInquiry.replies || []).length === 0 && <div className="text-sm text-gray-500">No replies yet</div>}
                {(openInquiry.replies || []).map((r, idx) => (
                  <div key={idx} className={"p-3 rounded " + (r.from === "admin" ? "bg-indigo-50" : "bg-gray-100")}>
                    <div className="text-xs text-gray-500">{r.from === "admin" ? "Admin" : "User"} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
                    <div className="mt-1">{r.message}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700">Reply as Admin</h3>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} className="w-full border rounded p-3 mt-2" placeholder="Write your reply..."></textarea>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setReplyText("")} className="px-3 py-2 border rounded">Clear</button>
                <button onClick={sendReply} disabled={replying} className="px-4 py-2 bg-indigo-600 text-white rounded">{replying ? "Sending..." : "Send Reply"}</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
