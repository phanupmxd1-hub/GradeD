import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [k, ...v] = trimmed.split("=");
      if (k && v.length > 0) {
        process.env[k.trim()] = v.join("=").replace(/^["']|["']$/g, "").trim();
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectProfiles() {
  console.log("Checking profiles table in Supabase...");
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) {
    console.error("❌ profiles select error:", error);
  } else {
    console.log("✅ profiles data:", data);
  }
}

inspectProfiles();
