import React, { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || user) return;

    const loadProfile = async () => {
      try {
        // try admin first
        const adminRes = await api.get("/api/admin/me");
        setUser(adminRes.data.admin);
        localStorage.setItem("user", JSON.stringify(adminRes.data.admin));
      } catch {
        try {
          // fallback to user
          const userRes = await api.get("/api/user/me");
          setUser(userRes.data.user);
          localStorage.setItem("user", JSON.stringify(userRes.data.user));
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      }
    };

    loadProfile();
  }, [user]);

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
