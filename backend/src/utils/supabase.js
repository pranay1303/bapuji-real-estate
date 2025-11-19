import dotenv from "dotenv";
dotenv.config(); // ensure env is loaded even if this file loads first

import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  console.error("❌ SUPABASE_URL missing from .env");
}
if (!process.env.SUPABASE_SERVICE_ROLE) {
  console.error("❌ SUPABASE_SERVICE_ROLE missing from .env");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default supabase;
