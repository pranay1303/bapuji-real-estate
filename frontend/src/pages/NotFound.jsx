import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-4 text-gray-600">Page not found</p>
      <Link to="/" className="mt-6 inline-block bg-blue-600 text-white px-4 py-2 rounded">Go home</Link>
    </motion.div>
  );
}
