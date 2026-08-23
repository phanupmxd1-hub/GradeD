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

async function testFullSave() {
  console.log("Testing Full Save to Supabase...");
  
  // 1. Fetch current school
  const { data: schools } = await supabase.from("schools").select("*");
  const schoolId = schools[0].id;
  console.log("School ID:", schoolId);

  // 2. Test saving school branding
  const { data: sData, error: sErr } = await supabase.from("schools").upsert([
    {
      id: schoolId,
      name_th: "โรงเรียนประชารักศึกษา (GradeD)",
      name_en: "ระบบบันทึกผลการเรียน 2026",
      logo_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      status: "active"
    }
  ], { onConflict: "id" }).select();

  if (sErr) console.error("❌ school save error:", sErr);
  else console.log("✅ school save SUCCESS:", sData[0].name_th, sData[0].name_en);

  // 3. Test saving grade rules
  const { data: rules } = await supabase.from("grade_rules").select("*");
  if (rules && rules.length > 0) {
    const { error: rErr } = await supabase.from("grade_rules").upsert([
      {
        id: rules[0].id,
        school_id: schoolId,
        subject_id: null,
        ranges: [
          { min: 80, max: 100, grade: "4", gpaPoints: 4 },
          { min: 75, max: 79.9, grade: "3.5", gpaPoints: 3.5 },
          { min: 70, max: 74.9, grade: "3", gpaPoints: 3 },
          { min: 65, max: 69.9, grade: "2.5", gpaPoints: 2.5 },
          { min: 60, max: 64.9, grade: "2", gpaPoints: 2 },
          { min: 55, max: 59.9, grade: "1.5", gpaPoints: 1.5 },
          { min: 50, max: 54.9, grade: "1", gpaPoints: 1 },
          { min: 0, max: 49.9, grade: "0", gpaPoints: 0 }
        ]
      }
    ], { onConflict: "id" });
    if (rErr) console.error("❌ grade_rules save error:", rErr);
    else console.log("✅ grade_rules save SUCCESS");
  }

  // 4. Test classrooms
  const { data: classrooms } = await supabase.from("classrooms").select("*");
  if (classrooms && classrooms.length > 0) {
    const { error: cErr } = await supabase.from("classrooms").upsert(
      classrooms.map(c => ({
        id: c.id,
        school_id: c.school_id,
        academic_year_id: c.academic_year_id,
        name: c.name,
        teacher_id: null,
        student_count: c.student_count || 0
      })),
      { onConflict: "id" }
    );
    if (cErr) console.error("❌ classrooms save error:", cErr);
    else console.log("✅ classrooms save SUCCESS");
  }

  // 5. Test subjects
  const { data: subjects } = await supabase.from("subjects").select("*");
  if (subjects && subjects.length > 0) {
    const { error: subErr } = await supabase.from("subjects").upsert(
      subjects.map(s => ({
        id: s.id,
        school_id: s.school_id,
        code: s.code,
        name: s.name,
        credit_points: s.credit_points,
        hours_per_week: s.hours_per_week
      })),
      { onConflict: "id" }
    );
    if (subErr) console.error("❌ subjects save error:", subErr);
    else console.log("✅ subjects save SUCCESS");
  }
}

testFullSave();
