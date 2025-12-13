// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // forgot/reset modal
  const [showReset, setShowReset] = useState(false);
  const [step, setStep] = useState("email"); // email | reset
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const callLoginEndpoint = async (url) => {
    return api.post(url, { email, password });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      try {
        const res = await callLoginEndpoint("/api/user/login");
        login(res.data.token, res.data.user);
        navigate("/");
        return;
      } catch (err) {
        if (err?.response?.status !== 404) {
          alert(err?.response?.data?.message || "Login failed");
          return;
        }
      }

      const resAdmin = await callLoginEndpoint("/api/admin/login");
      login(resAdmin.data.token, {
        ...resAdmin.data.admin,
        role: "admin",
      });
      navigate("/admin");
    } catch (err) {
      alert(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FORGOT PASSWORD FLOW ---------------- */

  const sendResetCode = async () => {
    setResetLoading(true);
    try {
      await api.post("/api/password/send-reset", { email: resetEmail });
      setStep("reset");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to send code");
    } finally {
      setResetLoading(false);
    }
  };

  const resetPassword = async () => {
    setResetLoading(true);
    try {
      await api.post("/api/password/verify-reset", {
        email: resetEmail,
        code: otp,
        newPassword,
      });
      alert("Password reset successfully. Please login.");
      setShowReset(false);
      setStep("email");
      setOtp("");
      setNewPassword("");
    } catch (err) {
      alert(err?.response?.data?.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      {/* LOGIN CARD */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-white p-6 rounded shadow"
      >
        <h2 className="text-2xl font-bold mb-4">Login</h2>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full border p-2 rounded"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full border p-2 rounded"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="w-full bg-blue-600 text-white py-2 rounded"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <button
            onClick={() => {
              setShowReset(true);
              setResetEmail(email);
            }}
            className="text-blue-600 hover:underline"
          >
            Forgot password?
          </button>

          <Link to="/register" className="text-blue-600">
            Create account
          </Link>
        </div>
      </motion.div>

      {/* FORGOT / RESET MODAL */}
      <AnimatePresence>
        {showReset && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm"
            >
              <h3 className="text-lg font-semibold mb-4">
                {step === "email" ? "Forgot Password" : "Reset Password"}
              </h3>

              {step === "email" ? (
                <>
                  <input
                    className="w-full border p-2 rounded mb-3"
                    placeholder="Enter registered email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                  <button
                    onClick={sendResetCode}
                    disabled={resetLoading}
                    className="w-full bg-blue-600 text-white py-2 rounded"
                  >
                    {resetLoading ? "Sending…" : "Send reset code"}
                  </button>
                </>
              ) : (
                <>
                  <input
                    className="w-full border p-2 rounded mb-2"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <input
                    className="w-full border p-2 rounded mb-3"
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    onClick={resetPassword}
                    disabled={resetLoading}
                    className="w-full bg-blue-600 text-white py-2 rounded"
                  >
                    {resetLoading ? "Resetting…" : "Reset password"}
                  </button>
                </>
              )}

              <button
                onClick={() => setShowReset(false)}
                className="mt-3 w-full text-sm text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
