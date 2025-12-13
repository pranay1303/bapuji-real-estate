import React, { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Register() {
  const [form, setForm] = useState({ name: "", username: "", email: "", mobile: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const change = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/user/register", form);
      alert("Registration successful — login now");
      navigate("/login");
    } catch (err) {
      alert(err?.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Create account</h2>
      <form onSubmit={submit} className="grid gap-3">
        <input value={form.name} onChange={change("name")} className="border p-2 rounded" placeholder="Full name" />
        <input value={form.username} onChange={change("username")} className="border p-2 rounded" placeholder="Username (optional)" />
        <input value={form.email} onChange={change("email")} className="border p-2 rounded" placeholder="Email" />
        <input value={form.mobile} onChange={change("mobile")} className="border p-2 rounded" placeholder="Mobile number" />
        <input value={form.password} onChange={change("password")} className="border p-2 rounded" placeholder="Password" type="password" />
        <button className="bg-blue-600 text-white py-2 rounded" disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
      </form>
    </motion.div>
  );
}
