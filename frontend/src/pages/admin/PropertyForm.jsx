// src/pages/admin/PropertyForm.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

export default function PropertyForm({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    location: "",
    category: "",
    status: "Available",
    amenities: [], // array of strings
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [images, setImages] = useState([]); // newly selected File objects
  const [brochure, setBrochure] = useState(null); // newly selected File object

  const [existingImages, setExistingImages] = useState([]); // URL strings
  const [existingBrochureUrl, setExistingBrochureUrl] = useState(null);

  const [statusMsg, setStatusMsg] = useState("");

  // Amenity input state
  const [amenityInput, setAmenityInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (mode === "edit" && id) {
      setLoading(true);
      setStatusMsg("Loading property...");
      api.get(`/api/properties/${id}`)
        .then(res => {
          if (cancelled) return;
          const p = res.data;
          setForm({
            title: p.title || "",
            description: p.description || "",
            price: p.price || "",
            city: p.city || "",
            location: p.location || "",
            category: p.category || "",
            status: p.status || "Available",
            amenities: Array.isArray(p.amenities) ? p.amenities : (p.amenities ? String(p.amenities).split(",").map(s => s.trim()).filter(Boolean) : []),
          });

          const imgs = Array.isArray(p.images) ? p.images.map(i => (typeof i === "string" ? i : (i.url || i.path || ""))) : [];
          setExistingImages(imgs.filter(Boolean));
          if (p.brochureUrl) setExistingBrochureUrl(p.brochureUrl);
          setStatusMsg("");
        })
        .catch(err => {
          console.error(err);
          setStatusMsg("Failed to load property — check console.");
        })
        .finally(() => !cancelled && setLoading(false));
    }

    return () => { cancelled = true; };
  }, [mode, id]);

  const change = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  // ---------- Amenities handlers ----------
  const addAmenity = (raw) => {
    const a = String(raw || "").trim();
    if (!a) return;
    setForm(s => {
      if (s.amenities.includes(a)) return s;
      return { ...s, amenities: [...s.amenities, a] };
    });
    setAmenityInput("");
  };

  const onAmenityKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addAmenity(amenityInput);
    } else if (e.key === "Backspace" && !amenityInput) {
      // remove last amenity if input empty
      setForm(s => ({ ...s, amenities: s.amenities.slice(0, -1) }));
    }
  };

  const removeAmenity = (idx) => {
    setForm(s => ({ ...s, amenities: s.amenities.filter((_, i) => i !== idx) }));
  };
  // ----------------------------------------

  const onSelectImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImages(prev => [...prev, ...files]);
  };

  const onRemoveSelectedImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const onDeleteExistingImage = async (idx) => {
    if (!id) return alert("No property id");
    if (!confirm("Delete this image permanently?")) return;

    try {
      setStatusMsg("Deleting image...");
      const res = await api.delete(`/api/properties/${id}/images/${idx}`);
      const updated = res.data.images || [];
      setExistingImages(updated);
      setStatusMsg("Image deleted");
    } catch (err) {
      console.error("Delete image failed:", err);
      alert(err?.response?.data?.message || "Delete failed");
      setStatusMsg("");
    } finally {
      setTimeout(()=>setStatusMsg(""), 1500);
    }
  };

  const onSelectBrochure = (e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setBrochure(f);
  };

  const onDeleteExistingBrochure = async () => {
    if (!id) return alert("No property id");
    if (!confirm("Remove brochure from this property?")) return;

    try {
      setStatusMsg("Removing brochure...");
      await api.delete(`/api/properties/${id}/brochure`);
      setExistingBrochureUrl(null);
      setStatusMsg("Brochure removed");
    } catch (err) {
      console.error("Delete brochure failed:", err);
      alert(err?.response?.data?.message || "Delete failed");
    } finally {
      setTimeout(()=>setStatusMsg(""), 1500);
    }
  };

  const validate = () => {
    if (!form.title.trim()) { setStatusMsg("Title is required"); return false; }
    if (!form.city.trim()) { setStatusMsg("City is required"); return false; }
    if (!form.location.trim()) { setStatusMsg("Location is required"); return false; }
    if (form.price && isNaN(Number(form.price))) { setStatusMsg("Price must be a number"); return false; }
    return true;
  };

  const uploadFilesForProperty = async (propId) => {
    if (images.length > 0) {
      setStatusMsg("Uploading images...");
      const fd = new FormData();
      images.forEach(f => fd.append("images", f));
      await api.post(`/api/properties/${propId}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      }).then(res => {
        if (res.data && Array.isArray(res.data.urls)) {
          setExistingImages(prev => [...prev, ...res.data.urls]);
        }
      });
    }

    if (brochure) {
      setStatusMsg("Uploading brochure...");
      const fd2 = new FormData();
      fd2.append("brochure", brochure);
      await api.post(`/api/properties/${propId}/brochure`, fd2, {
        headers: { "Content-Type": "multipart/form-data" }
      }).then(res => {
        if (res.data && res.data.url) setExistingBrochureUrl(res.data.url);
      });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setStatusMsg(mode === "create" ? "Creating property..." : "Saving property...");

    try {
      let propId = id;
      const payload = {
        ...form,
        // ensure amenities is an array
        amenities: Array.isArray(form.amenities) ? form.amenities : (form.amenities ? String(form.amenities).split(",").map(s => s.trim()).filter(Boolean) : []),
      };

      if (mode === "create") {
        const res = await api.post("/api/properties", payload);
        const created = res.data;
        propId = created.property?._id || created.property?.id || created._id || created.id || created.property;
        if (!propId) {
          if (typeof created === "object" && created.property && (created.property._id || created.property.id)) {
            propId = created.property._id || created.property.id;
          }
        }
        if (!propId) throw new Error("Could not determine created property id from response");
      } else {
        await api.put(`/api/properties/${id}`, payload);
      }

      if ((images.length > 0) || brochure) {
        setStatusMsg("Uploading media...");
        await uploadFilesForProperty(propId);
      }

      setStatusMsg("Done");
      alert(mode === "create" ? "Property created." : "Property updated.");
      navigate("/admin/properties");
    } catch (err) {
      console.error("Save error:", err);
      const message = err?.response?.data?.message || err.message || "Save failed";
      setStatusMsg(String(message));
      alert("Save failed: " + message);
    } finally {
      setSaving(false);
      setTimeout(()=>setStatusMsg(""), 2000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{mode === "create" ? "Create property" : "Edit property"}</h1>
        <div className="text-sm text-gray-500">{mode === "create" ? "Add a new listing" : "Update property details"}</div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left / main column (fields) */}
        <div className="md:col-span-2 bg-white p-6 rounded shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input value={form.title} onChange={change("title")} placeholder="e.g. Luxury 3BHK Flat" className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input value={form.category} onChange={change("category")} placeholder="3BHK, Plot, Bungalow..." className="mt-1 block w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
              <input value={form.price} onChange={change("price")} placeholder="e.g. 6800000" className="mt-1 block w-full border rounded px-3 py-2" inputMode="numeric" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={form.status} onChange={change("status")} className="mt-1 block w-full border rounded px-3 py-2">
                <option>Available</option>
                <option>Sold</option>
                <option>Upcoming</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">City *</label>
              <input value={form.city} onChange={change("city")} placeholder="e.g. Pune" className="mt-1 block w-full border rounded px-3 py-2" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Location / Locality *</label>
              <input value={form.location} onChange={change("location")} placeholder="e.g. Karjat" className="mt-1 block w-full border rounded px-3 py-2" required />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={change("description")} placeholder="Write a short description" rows={6} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>

          {/* Amenities editor */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Amenities</label>
            <p className="text-xs text-gray-500 mt-1">Add amenities (press Enter or comma). Examples: Parking, Gym, Swimming Pool, Lift</p>

            <div className="mt-2">
              <div className="flex gap-2 flex-wrap">
                {form.amenities.map((a, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 bg-gray-100 text-sm px-3 py-1 rounded-full">
                    <span>{a}</span>
                    <button type="button" onClick={() => removeAmenity(idx)} className="text-xs text-red-600 px-1">✕</button>
                  </span>
                ))}
              </div>

              <input
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={onAmenityKeyDown}
                placeholder="Type and press Enter or comma to add"
                className="mt-3 block w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="mt-2 text-xs text-gray-500">Tip: You can add multiple amenities quickly by typing a comma-separated list and pressing Enter.</div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button type="submit" disabled={saving} className={`px-4 py-2 rounded text-white ${saving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:opacity-95"}`}>
              {saving ? "Saving…" : (mode === "create" ? "Create property" : "Save changes")}
            </button>

            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Cancel</button>

            <div className="ml-auto text-sm text-gray-500">{statusMsg}</div>
          </div>
        </div>

        {/* Right column (media / uploads) */}
        <aside className="bg-white p-6 rounded shadow-sm">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Images</h3>
            <p className="text-xs text-gray-500 mt-1">Upload multiple images (JPEG/PNG). You can preview selected files below.</p>

            {/* Selected new images preview */}
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {images.map((f, idx) => {
                  const url = URL.createObjectURL(f);
                  return (
                    <div key={idx} className="relative rounded overflow-hidden border">
                      <img src={url} alt={f.name} className="w-full h-24 object-cover" />
                      <button type="button" onClick={() => onRemoveSelectedImage(idx)} className="absolute right-1 top-1 bg-black/70 text-white rounded-full p-1 text-xs">✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Existing images preview with delete action */}
            {existingImages.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-2">Existing images</div>
                <div className="grid grid-cols-3 gap-2">
                  {existingImages.map((url, idx) => (
                    <div key={idx} className="relative rounded overflow-hidden border">
                      <img src={url} alt={`img-${idx}`} className="w-full h-24 object-cover" />
                      <button type="button" onClick={() => onDeleteExistingImage(idx)} className="absolute right-1 top-1 bg-red-600 text-white rounded-full p-1 text-xs">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <input id="images" type="file" accept="image/*" multiple onChange={onSelectImages} className="block w-full text-sm text-gray-600" />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700">Brochure (PDF)</h3>
            <p className="text-xs text-gray-500 mt-1">Upload a PDF brochure. If a brochure already exists you'll see a link below.</p>

            {existingBrochureUrl && (
              <div className="mt-3 flex items-center gap-2">
                <a href={existingBrochureUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Open existing brochure</a>
                <button type="button" onClick={onDeleteExistingBrochure} className="text-sm text-red-600 px-2 py-1 border rounded">Remove</button>
              </div>
            )}

            {brochure && (
              <div className="mt-3 text-sm">
                <div className="font-medium">{brochure.name}</div>
                <div className="text-xs text-gray-500">{(brochure.size / 1024).toFixed(1)} KB</div>
              </div>
            )}

            <div className="mt-3">
              <input id="brochure" type="file" accept="application/pdf" onChange={onSelectBrochure} className="block w-full text-sm text-gray-600" />
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <div><strong>Tip:</strong> Upload images first for a better preview. Brochure should be a PDF under 5MB.</div>
          </div>
        </aside>
      </form>
    </motion.div>
  );
}
