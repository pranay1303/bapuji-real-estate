// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
    console.error("Render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ color: "#b91c1c" }}>😵‍💫 Something crashed</h1>
          <pre style={{ whiteSpace: "pre-wrap", background: "#111827", color: "#f8fafc", padding: 12, borderRadius: 8 }}>
            {String(this.state.error && this.state.error.toString())}
            {"\n"}
            {this.state.info && this.state.info.componentStack}
          </pre>
          <p>Open console for full trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById("root");
if (!container) throw new Error('No element with id="root" in index.html');

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
