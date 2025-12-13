// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

function StatCard({ title, value, sub, children }) {
  return (
    <div className="bg-white p-4 rounded shadow flex flex-col justify-between">
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-bold mt-2">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsersCount, setLoadingUsersCount] = useState(false);
  const [computedUsersCount, setComputedUsersCount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get("/api/admin-dashboard/stats")
      .then(res => {
        if (cancelled) return;
        setStats(res.data || {});
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.response?.data?.message || err.message || "Failed to load stats");
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, []);

  // Compute total users by merging both endpoints if stats doesn't include users total
  useEffect(() => {
    let cancelled = false;
    const needManual = !stats || (typeof (stats.users?.total) === "undefined" && typeof (stats.admins?.totalAdmins) === "undefined");
    if (!needManual) return;

    setLoadingUsersCount(true);

    Promise.allSettled([api.get("/api/admin/users"), api.get("/api/admin/users/admins")])
      .then(([uRes, aRes]) => {
        if (cancelled) return;
        const usersList = uRes.status === "fulfilled" ? (Array.isArray(uRes.value.data) ? uRes.value.data : (uRes.value.data.users || [])) : [];
        const adminsList = aRes.status === "fulfilled" ? (Array.isArray(aRes.value.data) ? aRes.value.data : (aRes.value.data.admins || [])) : [];

        const seen = new Set();
        let total = 0;
        const add = (it) => {
          const key = it._id || it.id || it.email || JSON.stringify(it);
          if (!seen.has(key)) { seen.add(key); total++; }
        };

        usersList.forEach(add);
        adminsList.forEach(add);

        setComputedUsersCount(total);
      })
      .catch(err => {
        console.warn("compute users failed", err);
      })
      .finally(() => { if (!cancelled) setLoadingUsersCount(false); });

    return () => { cancelled = true; };
  }, [stats]);

  if (loading) return <div className="mt-6 text-gray-500">Loading stats…</div>;
  if (error) return <div className="mt-6 p-4 bg-red-50 text-red-700 rounded">Failed to load stats: {String(error)}</div>;
  if (!stats) return <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded">No stats available</div>;

  const p = stats.properties || {};
  const a = stats.admins || {};
  const u = stats.users || {};
  const l = stats.leads || {};
  const i = stats.inquiries || {};
  const r = stats.reviews || {};
  const t = stats.traffic || {};

  // Prefer explicit stats.users.total, else computedUsersCount, else admins.totalAdmins
  const totalUsers = (typeof u.total === "number" ? u.total : (computedUsersCount ?? (a.totalAdmins ?? 0)));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <div className="text-sm text-gray-600">Overview • Quick actions</div>
      </div>

      {/* Top summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <StatCard title="Total Properties" value={p.total ?? 0} sub={`Available: ${p.available ?? 0} • Sold: ${p.sold ?? 0}`}>
          <Link to="/admin/properties" className="text-sm text-blue-600 hover:underline">Manage properties →</Link>
        </StatCard>

        <StatCard title="Total Users" value={loadingUsersCount ? "…" : (totalUsers ?? 0)} sub={null}>
          <Link to="/admin/users" className="text-sm text-blue-600 hover:underline">Manage users →</Link>
        </StatCard>

        <StatCard title="Total Leads" value={l.totalLeads ?? 0} sub={`Brochure downloads: ${l.brochureDownloads ?? 0}`}>
          <Link to="/admin/leads" className="text-sm text-blue-600 hover:underline">View leads →</Link>
        </StatCard>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <StatCard title="Brochures & Images" value={`${p.totalBrochuresUploaded ?? 0} brochures`}>
          <div className="text-xs text-gray-500">Images: {p.totalImagesUploaded ?? 0}</div>
        </StatCard>

        <StatCard title="Inquiries" value={i.totalInquiries ?? 0} sub={`Pending: ${i.pendingInquiries ?? 0}`}>
          <Link to="/admin/inquiries" className="text-sm text-blue-600 hover:underline">Handle inquiries →</Link>
        </StatCard>

        <StatCard title="Reviews" value={r.approvedReviews ?? 0} sub="Approved reviews">
          <Link to="/admin/reviews" className="text-sm text-blue-600 hover:underline">Manage reviews →</Link>
        </StatCard>
      </div>

      {/* Traffic + debug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <StatCard title="Traffic" value={t.totalViews ?? 0} sub={`Brochure downloads tracked: ${t.brochureDownloadsTracked ?? 0}`}>
          <div className="text-xs text-gray-500">Use analytics page for graphs</div>
        </StatCard>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Raw response (debug)</div>
          <pre className="mt-2 text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-auto" style={{ maxHeight: 220 }}>
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-600">Tip: click the "Manage ..." links to jump into admin sections (you can build the pages next).</div>
    </motion.div>
  );
}
