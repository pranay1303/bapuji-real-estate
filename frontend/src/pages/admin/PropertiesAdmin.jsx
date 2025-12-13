// src/pages/admin/PropertiesAdmin.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

export default function PropertiesAdmin() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get("/api/properties")
      .then(res => {
        if (cancelled) return;
        const arr = Array.isArray(res.data) ? res.data : (res.data.properties || []);
        setProperties(arr);
      })
      .catch(err => {
        console.error("Failed to fetch properties:", err);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this property?")) return;
    try {
      await api.delete(`/api/properties/${id}`);
      setProperties(p => p.filter(x => x._id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || "Delete failed");
    }
  };

  const filtered = properties.filter(p => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (p.title || "").toLowerCase().includes(q) ||
           (p.city || "").toLowerCase().includes(q) ||
           (p.location || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Properties</h1>
        <div>
          <button onClick={()=>navigate("/admin/properties/create")} className="bg-blue-600 text-white px-3 py-2 rounded">Create property</button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input placeholder="Search title / city / location" value={query} onChange={e=>setQuery(e.target.value)} className="border px-3 py-2 rounded flex-1" />
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500">No properties found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map(p => (
              <div key={p._id} className="bg-white border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-gray-500">{p.city} • {p.location}</div>
                  <div className="text-sm text-gray-700 mt-1">₹{Number(p.price || 0).toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={()=>navigate(`/admin/properties/${p._id}/edit`)} className="px-3 py-1 border rounded text-sm">Edit</button>
                  <button onClick={()=>handleDelete(p._id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
