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

console.log("Testing Supabase URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAll() {
  console.log("\n--- 1. Testing schools table ---");
  const { data: schools, error: schoolErr } = await supabase.from("schools").select("*");
  if (schoolErr) {
    console.error("❌ school select error:", schoolErr);
  } else {
    console.log("✅ schools count:", schools.length, schools[0]);
  }

  console.log("\n--- 2. Testing schools upsert (Branding update) ---");
  if (schools && schools.length > 0) {
    const target = schools[0];
    const { data: upData, error: upErr } = await supabase
      .from("schools")
      .update({
        name_th: "GradeD Portal Test",
        name_en: "ระบบบันทึกผลการเรียน",
        logo_url: target.logo_url || "test-logo"
      })
      .eq("id", target.id)
      .select();
    
    if (upErr) {
      console.error("❌ schools update error (RLS or Constraint?):", upErr);
    } else {
      console.log("✅ schools update SUCCESS:", upData);
    }
  }

  console.log("\n--- 3. Testing classrooms table ---");
  const { data: classes, error: classErr } = await supabase.from("classrooms").select("*");
  if (classErr) {
    console.error("❌ classrooms select error:", classErr);
  } else {
    console.log("✅ classrooms count:", classes.length);
  }

  console.log("\n--- 4. Testing grade_rules table ---");
  const { data: rules, error: ruleErr } = await supabase.from("grade_rules").select("*");
  if (ruleErr) {
    console.error("❌ grade_rules select error:", ruleErr);
  } else {
    console.log("✅ grade_rules count:", rules.length, rules[0]);
  }

  console.log("\n--- 5. Testing subjects table ---");
  const { data: subjects, error: subErr } = await supabase.from("subjects").select("*");
  if (subErr) {
    console.error("❌ subjects select error:", subErr);
  } else {
    console.log("✅ subjects count:", subjects.length);
  }
}

testAll();
