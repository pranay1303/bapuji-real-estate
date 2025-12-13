import React, { useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";
import { useToast } from "../context/ToastContext";

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const { push } = useToast();

  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    mobile: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || "",
      email: user.email || "",
      username: user.username || "",
      mobile: user.mobile || "",
    });
  }, [user]);

  const change = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = isAdmin
        ? await api.put("/api/admin/me", {
            name: form.name,
            email: form.email,
          })
        : await api.put("/api/user/me", {
            name: form.name,
            username: form.username,
            mobile: form.mobile,
          });

      const updated = isAdmin ? res.data.admin : res.data.user;
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));

      push("Profile updated successfully", { type: "success" });
    } catch (err) {
      push(
        err?.response?.data?.message || "Profile update failed",
        { type: "error" }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow"
    >
      <h2 className="text-2xl font-bold mb-4">Profile</h2>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" value={form.name} onChange={change("name")} />

        {isAdmin ? (
          <Field label="Email" value={form.email} onChange={change("email")} />
        ) : (
          <>
            <Field
              label="Username"
              value={form.username}
              onChange={change("username")}
            />
            <Field
              label="Mobile"
              value={form.mobile}
              onChange={change("mobile")}
            />
          </>
        )}

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
      </form>
    </motion.div>
  );
}

const Field = ({ label, ...props }) => (
  <div>
    <label className="text-sm text-gray-600">{label}</label>
    <input
      {...props}
      className="mt-1 w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
    />
  </div>
);
