import React from "react";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  // AppRoutes contains the BrowserRouter and Layout (Header/Footer),
  // so we just render it here to avoid duplicate routers.
  return <AppRoutes />;
}
