import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
// Load environment variables from .env.local natively
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [k, ...v] = trimmed.split("=");
      if (k && v.length > 0) {
        const val = v.join("=").replace(/^["']|["']$/g, "").trim();
        process.env[k.trim()] = val;
      }
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC21MEJiqcyNi0FLO_Q6AD5Gqo0t2sEtyE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "graded-26cb0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "graded-26cb0",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "graded-26cb0.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "28821492974",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:28821492974:web:a5362ed4fb78bc057bcfff"
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

// Deterministic String to UUID converter
function toUUID(str) {
  if (!str) return null;
  const s = String(str);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  const hash = crypto.createHash("md5").update(s).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

async function migrate() {
  console.log("==========================================");
  console.log("🔥 Starting Migration: Firebase -> Supabase");
  console.log("==========================================");
  console.log("Connecting to Firebase project:", firebaseConfig.projectId);
  console.log("Connecting to Supabase project:", supabaseUrl);

  const fbApp = initializeApp(firebaseConfig);
  const fbDb = getFirestore(fbApp);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Fetch all documents from Firestore 'userData' collection
  console.log("\n1. Fetching userData from Firestore...");
  const userDataCol = collection(fbDb, "userData");
  let docs = [];
  try {
    const snap = await getDocs(userDataCol);
    snap.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    console.log(`Found ${docs.length} user documents in Firestore.`);
  } catch (err) {
    console.warn("⚠️ Could not read Firestore collections directly:", err.message);
  }

  // If no cloud data found, check if local SQLite has data to migrate as well
  if (docs.length === 0) {
    console.log("Checking local database for records...");
    const dbPath = path.join(process.cwd(), "data", "graded.db");
    if (fs.existsSync(dbPath)) {
      try {
        const { loadAllDataFromDb } = await import("../src/lib/db.js").catch(async () => {
          return await import("../src/lib/db.ts");
        });
        const localData = loadAllDataFromDb();
        if (localData && localData.schools && localData.schools.length > 0) {
          docs.push({ id: "local_default", ...localData });
          console.log("Loaded local dataset for migration.");
        }
      } catch (e) {
        console.log("No local database module loaded, using Firestore data.");
      }
    }
  }

  if (docs.length === 0) {
    console.log("❌ No data found to migrate. Please make sure Firebase contains data or tables are seeded.");
    return;
  }

  // Process and Insert into Supabase
  for (const doc of docs) {
    console.log(`\n📦 Processing dataset: ${doc.id}`);

    // A. Schools
    if (Array.isArray(doc.schools)) {
      const rows = doc.schools.map(s => ({
        id: toUUID(s.id),
        name_th: s.nameTh || "โรงเรียน",
        name_en: s.nameEn || "School",
        logo_url: s.logoUrl || null,
        status: s.status || "active"
      }));
      const { error } = await supabase.from("schools").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting schools:", error.message);
      else console.log(`✅ Inserted ${rows.length} schools`);
    }

    // B. Academic Years
    if (Array.isArray(doc.academicYears)) {
      const rows = doc.academicYears.map(y => ({
        id: toUUID(y.id),
        school_id: toUUID(y.schoolId),
        year: Number(y.year),
        status: y.status || "active"
      }));
      const { error } = await supabase.from("academic_years").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting academic_years:", error.message);
      else console.log(`✅ Inserted ${rows.length} academic_years`);
    }

    // C. Semesters
    if (Array.isArray(doc.semesters)) {
      const rows = doc.semesters.map(s => ({
        id: toUUID(s.id),
        academic_year_id: toUUID(s.academicYearId),
        semester_no: Number(s.semesterNo),
        status: s.status || "active"
      }));
      const { error } = await supabase.from("semesters").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting semesters:", error.message);
      else console.log(`✅ Inserted ${rows.length} semesters`);
    }

    // D. Classrooms (Set teacher_id to null to satisfy foreign key until teacher registers)
    if (Array.isArray(doc.classrooms)) {
      const rows = doc.classrooms.map(c => ({
        id: toUUID(c.id),
        school_id: toUUID(c.schoolId),
        academic_year_id: toUUID(c.academicYearId),
        name: c.name,
        teacher_id: null,
        student_count: Number(c.studentCount) || 0
      }));
      const { error } = await supabase.from("classrooms").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting classrooms:", error.message);
      else console.log(`✅ Inserted ${rows.length} classrooms`);
    }

    // E. Subjects (Deduplicate by code & Upsert)
    let subjectIdMap = {};
    if (Array.isArray(doc.subjects)) {
      const uniqueSubjectsMap = new Map();
      doc.subjects.forEach(s => {
        if (!uniqueSubjectsMap.has(s.code)) {
          uniqueSubjectsMap.set(s.code, s);
        }
      });
      const rows = Array.from(uniqueSubjectsMap.values()).map(s => {
        const uid = toUUID(s.id);
        subjectIdMap[s.id] = uid;
        subjectIdMap[s.code] = uid;
        return {
          id: uid,
          school_id: toUUID(s.schoolId),
          code: s.code,
          name: s.name,
          credit_points: Number(s.creditPoints) || 1.0,
          hours_per_week: Number(s.hoursPerWeek) || 2
        };
      });
      const { error } = await supabase.from("subjects").upsert(rows, { onConflict: "school_id,code" });
      if (error) console.error("Error inserting subjects:", error.message);
      else console.log(`✅ Inserted/Updated ${rows.length} unique subjects`);
    }

    // F. Students
    let validStudentIds = new Set();
    if (Array.isArray(doc.students)) {
      const rows = doc.students.map(std => {
        const uid = toUUID(std.id);
        validStudentIds.add(uid);
        return {
          id: uid,
          school_id: toUUID(std.schoolId),
          classroom_id: toUUID(std.classroomId),
          prefix: std.prefix || "เด็กชาย",
          first_name: std.firstName,
          last_name: std.lastName,
          gender: std.gender || "M",
          roll_no: Number(std.rollNo),
          status: std.status || "active"
        };
      });
      const { error } = await supabase.from("students").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting students:", error.message);
      else console.log(`✅ Inserted ${rows.length} students`);
    }

    // G. Enrollments (Only for valid students)
    if (Array.isArray(doc.enrollments)) {
      const rows = doc.enrollments
        .filter(e => validStudentIds.has(toUUID(e.studentId)))
        .map(e => ({
          id: toUUID(e.id),
          student_id: toUUID(e.studentId),
          subject_id: toUUID(e.subjectId),
          semester_id: toUUID(e.semesterId),
          classroom_id: toUUID(e.classroomId),
          status: e.status || "active"
        }));
      const { error } = await supabase.from("enrollments").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting enrollments:", error.message);
      else console.log(`✅ Inserted ${rows.length} enrollments`);
    }

    // H. Attendance Sessions & Records
    if (Array.isArray(doc.attendanceSessions)) {
      const rows = doc.attendanceSessions.map(ses => ({
        id: toUUID(ses.id),
        school_id: toUUID(ses.schoolId),
        classroom_id: toUUID(ses.classroomId),
        subject_id: toUUID(ses.subjectId),
        semester_id: toUUID(ses.semesterId),
        date: ses.date,
        session_no: Number(ses.sessionNo) || 1
      }));
      const { error } = await supabase.from("attendance_sessions").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting attendance_sessions:", error.message);
      else console.log(`✅ Inserted ${rows.length} attendance_sessions`);
    }

    if (Array.isArray(doc.attendanceRecords)) {
      const rows = doc.attendanceRecords
        .filter(r => validStudentIds.has(toUUID(r.studentId)))
        .map(r => ({
          id: toUUID(r.id || `${r.sessionId}_${r.studentId}`),
          session_id: toUUID(r.sessionId),
          student_id: toUUID(r.studentId),
          status: r.status || "มา",
          remarks: r.remarks || null,
          updated_at: r.updatedAt || new Date().toISOString()
        }));
      const { error } = await supabase.from("attendance_records").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting attendance_records:", error.message);
      else console.log(`✅ Inserted ${rows.length} attendance_records`);
    }

    // I. Score Components & Scores
    let validComponentIds = new Set();
    if (Array.isArray(doc.scoreComponents)) {
      const rows = doc.scoreComponents.map(c => {
        const uid = toUUID(c.id);
        validComponentIds.add(uid);
        return {
          id: uid,
          subject_id: toUUID(c.subjectId),
          semester_id: toUUID(c.semesterId),
          classroom_id: toUUID(c.classroomId),
          name: c.name,
          type: c.type || "assignment",
          max_score: Number(c.maxScore) || 10,
          weight_percent: Number(c.weightPercent) || 10,
          order_no: Number(c.order || c.orderNo) || 1
        };
      });
      const { error } = await supabase.from("score_components").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting score_components:", error.message);
      else console.log(`✅ Inserted ${rows.length} score_components`);
    }

    if (Array.isArray(doc.scores)) {
      const rows = doc.scores
        .filter(sc => validStudentIds.has(toUUID(sc.studentId)) && validComponentIds.has(toUUID(sc.scoreComponentId)))
        .map(sc => ({
          id: toUUID(sc.id || `${sc.studentId}_${sc.scoreComponentId}`),
          student_id: toUUID(sc.studentId),
          score_component_id: toUUID(sc.scoreComponentId),
          score: Number(sc.score) || 0,
          is_graded: Boolean(sc.isGraded),
          remarks: sc.remarks || null,
          updated_at: sc.updatedAt || new Date().toISOString()
        }));
      const { error } = await supabase.from("scores").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting scores:", error.message);
      else console.log(`✅ Inserted ${rows.length} scores`);
    }

    // J. Bonus Scores
    if (Array.isArray(doc.bonusScores)) {
      const rows = doc.bonusScores
        .filter(b => validStudentIds.has(toUUID(b.studentId)))
        .map(b => ({
          id: toUUID(b.id),
          student_id: toUUID(b.studentId),
          subject_id: toUUID(b.subjectId),
          semester_id: toUUID(b.semesterId),
          points: Number(b.points) || 1,
          reason: b.reason || "จิตพิสัย"
        }));
      const { error } = await supabase.from("bonus_scores").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting bonus_scores:", error.message);
      else console.log(`✅ Inserted ${rows.length} bonus_scores`);
    }

    // K. Grade Rules & Results
    if (doc.gradeRules) {
      const row = {
        id: toUUID(doc.gradeRules.id || "rule-default"),
        school_id: toUUID(doc.gradeRules.schoolId || "school-1"),
        subject_id: doc.gradeRules.subjectId ? toUUID(doc.gradeRules.subjectId) : null,
        ranges: doc.gradeRules.ranges || []
      };
      const { error } = await supabase.from("grade_rules").upsert(row, { onConflict: "id" });
      if (error) console.error("Error inserting grade_rules:", error.message);
      else console.log("✅ Inserted grade_rules");
    }

    if (Array.isArray(doc.gradeResults)) {
      const rows = doc.gradeResults
        .filter(gr => validStudentIds.has(toUUID(gr.studentId)))
        .map(gr => ({
          id: toUUID(gr.id || `${gr.studentId}_${gr.subjectId}_${gr.semesterId}`),
          student_id: toUUID(gr.studentId),
          subject_id: toUUID(gr.subjectId),
          semester_id: toUUID(gr.semesterId),
          classroomid: toUUID(gr.classroomId || doc.activeClassroomId || "class-m1-1"),
          raw_score_sum: Number(gr.rawScoreSum) || 0,
          bonus_score_sum: Number(gr.bonusScoreSum) || 0,
          total_score: Number(gr.totalScore) || 0,
          grade: String(gr.grade || "0"),
          gpa_points: Number(gr.gpaPoints) || 0,
          is_locked: Boolean(gr.isLocked),
          updated_at: gr.updatedAt || new Date().toISOString()
        }));
      const { error } = await supabase.from("grade_results").upsert(rows, { onConflict: "id" });
      if (error) console.error("Error inserting grade_results:", error.message);
      else console.log(`✅ Inserted ${rows.length} grade_results`);
    }
  }

  console.log("\n🎉 ==========================================");
  console.log("✅ Migration to Supabase Completed Successfully!");
  console.log("==========================================");
}

migrate().catch(e => {
  console.error("❌ Fatal Migration Error:", e);
});
