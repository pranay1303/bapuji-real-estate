import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion } from "framer-motion";

import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";

import Home from "../pages/Home";
import Property from "../pages/Property";     // detail page (/property/:id)
import About from "../pages/About";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Profile from "../pages/Profile";
import AdminDashboard from "../pages/AdminDashboard";
import NotFound from "../pages/NotFound";

/* admin pages */
import PropertiesAdmin from "../pages/admin/PropertiesAdmin";
import PropertyForm from "../pages/admin/PropertyForm";
import LeadsAdmin from "../pages/admin/LeadsAdmin";
import InquiriesAdmin from "../pages/admin/InquiriesAdmin";
import ReviewsAdmin from "../pages/admin/ReviewsAdmin";
import AdminsAdmin from "../pages/admin/AdminsAdmin";
import UsersAdmin from "../pages/admin/UsersAdmin";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<div className="p-6 text-center">Loading…</div>}>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <Routes>
              {/* root — can be a hero / landing */}
              <Route path="/" element={<Home />} />

              {/* dedicated properties LISTING page */}
              <Route path="/property" element={<Property />} />

              {/* property DETAIL */}
              <Route path="/property/:id" element={<Property />} />

              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Admin section (protected) */}
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/properties" element={<ProtectedRoute adminOnly><PropertiesAdmin /></ProtectedRoute>} />
              <Route path="/admin/properties/create" element={<ProtectedRoute adminOnly><PropertyForm mode="create" /></ProtectedRoute>} />
              <Route path="/admin/properties/:id/edit" element={<ProtectedRoute adminOnly><PropertyForm mode="edit" /></ProtectedRoute>} />

              <Route path="/admin/leads" element={<ProtectedRoute adminOnly><LeadsAdmin /></ProtectedRoute>} />
              <Route path="/admin/inquiries" element={<ProtectedRoute adminOnly><InquiriesAdmin /></ProtectedRoute>} />
              <Route path="/admin/reviews" element={<ProtectedRoute adminOnly><ReviewsAdmin /></ProtectedRoute>} />
              <Route path="/admin/admins" element={<ProtectedRoute adminOnly><AdminsAdmin /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><UsersAdmin /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
