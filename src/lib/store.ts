"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";

// Global cache for tracking raw database state differences (avoids infinite save loops)
let _lastSerializedData = "";

// TypeScript Interfaces based on Firestore Schema
export interface School {
  id: string;
  nameTh: string;
  nameEn: string;
  logoUrl?: string;
  status: "active" | "suspended";
}

export interface User {
  id: string;
  email: string;
  role: "system_admin" | "school_admin" | "teacher";
  schoolId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  year: number;
  status: "active" | "closed";
}

export interface Semester {
  id: string;
  academicYearId: string;
  semesterNo: 1 | 2;
  status: "active" | "closed";
}

export interface Classroom {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  teacherId: string;
  studentCount: number;
}

export interface Subject {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  creditPoints: number;
  hoursPerWeek: number;
}

export interface Student {
  id: string;
  schoolId: string;
  classroomId: string;
  prefix: "เด็กชาย" | "เด็กหญิง" | "นาย" | "นางสาว";
  firstName: string;
  lastName: string;
  gender: "M" | "F";
  rollNo: number;
  status: "active" | "dropped" | "transferred" | "graduated";
}

export interface Enrollment {
  id: string;
  studentId: string;
  subjectId: string;
  semesterId: string;
  classroomId: string;
  status: "active" | "dropped";
}

export interface AttendanceSession {
  id: string;
  schoolId: string;
  classroomId: string;
  subjectId: string;
  semesterId: string;
  date: string; // YYYY-MM-DD
  sessionNo: number;
}

export interface AttendanceRecord {
  id: string; // sessionId_studentId
  sessionId: string;
  studentId: string;
  status: "มา" | "ลา" | "ขาด" | "สาย" | "หยุด"; // มา ลา ขาด สาย หยุด
  remarks?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ScoreComponent {
  id: string;
  subjectId: string;
  semesterId: string;
  classroomId: string;
  name: string;
  type: "assignment" | "quiz" | "exam" | "project" | "other";
  maxScore: number;
  weightPercent: number;
  order: number;
}

export interface Score {
  id: string; // studentId_scoreComponentId
  studentId: string;
  scoreComponentId: string;
  score: number;
  isGraded: boolean;
  remarks?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface BonusScore {
  id: string;
  studentId: string;
  subjectId: string;
  semesterId: string;
  points: number;
  reason: string;
  timestamp: string;
  createdBy: string;
}

export interface GradeRange {
  min: number;
  max: number;
  grade: string;
  gpaPoints: number;
}

export interface GradeRules {
  id: string;
  schoolId: string;
  subjectId?: string;
  ranges: GradeRange[];
}

export interface GradeResult {
  id: string; // studentId_subjectId_semesterId
  studentId: string;
  subjectId: string;
  semesterId: string;
  classroomId: string;
  rawScoreSum: number;
  bonusScoreSum: number;
  totalScore: number;
  grade: string;
  gpaPoints: number;
  isLocked: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "EXPORT";
  resourceType: string;
  resourceId: string;
  description: string;
  timestamp: string;
}

// Initial Data Generators
const generateInitialStudents = (schoolId: string, classroomId: string): Student[] => {
  const prefixesM = ["เด็กชาย", "นาย"] as const;
  const prefixesF = ["เด็กหญิง", "นางสาว"] as const;
  
  const thaiFirstNamesM = [
    "สมชาย", "ประยุทธ์", "สันติ", "กิตติพงษ์", "ณัฐวุฒิ", "สุรชัย", "เกียรติศักดิ์", "เอกราช", 
    "อภิสิทธิ์", "ชัชชาติ", "ทักษิณ", "วันเฉลิม", "รุ่งโรจน์", "สมบัติ", "ธนพล", "ภาณุพงศ์", 
    "ยุทธนา", "วรวุฒิ", "อนันต์", "กอบศักดิ์"
  ];
  
  const thaiLastNamesM = [
    "ดีใจ", "สมบูรณ์", "ศรีสุข", "แก้วมณี", "ทองดี", "มีทรัพย์", "ชัยชนะ", "ศรีวิชัย", 
    "วงศ์ธัญญา", "สิทธิพันธุ์", "รักชาติ", "สมศรี", "สุวรรณ", "บัญชาเมฆ", "แก้วใส", "ทองคำ", 
    "มะลิวัลย์", "อิ่มใจ", "รักษ์ดี", "วงศ์ษา"
  ];

  const thaiFirstNamesF = [
    "วิภา", "อรวรรณ", "จิราภรณ์", "พัชราภา", "ศิริพร", "ยิ่งลักษณ์", "ชลธิชา", "นภัสสร", 
    "ปนัดดา", "มณีรัตน์", "ศิริลักษณ์", "กมลชนก", "อลิสา", "วิไลวรรณ", "สุนิสา", "สุทัตตา",
    "วรรณรท", "ชลดา", "นภัสสร", "กนกวรรณ"
  ];

  const thaiLastNamesF = [
    "วงศ์สุวรรณ", "ขยันยิ่ง", "ตั้งใจ", "เลิศวิจิตร", "เกียรติยศ", "ชินวัตร", "บุญช่วย", "ดวงใจ", 
    "ทวีศิลป์", "บุญรัตน์", "ปัญญา", "วิไลลักษณ์", "ปรีชา", "รุ่งเรือง", "เลิศปัญญา", "แก้วเกตุ",
    "ประเสริฐยิ่ง", "ทวีวัฒนา", "ชื่นบาน", "งามวิจิตร"
  ];

  const students: Student[] = [];

  // Generate 40 students
  for (let i = 1; i <= 40; i++) {
    const isMale = i % 2 !== 0;
    const rollNo = i;
    
    if (isMale) {
      const fn = thaiFirstNamesM[(i - 1) / 2 % thaiFirstNamesM.length];
      const ln = thaiLastNamesM[(i - 1) / 2 % thaiLastNamesM.length];
      const prefix = rollNo > 30 ? "นาย" : "เด็กชาย";
      students.push({
        id: `std-${classroomId}-${i}`,
        schoolId,
        classroomId,
        prefix,
        firstName: fn,
        lastName: ln,
        gender: "M",
        rollNo,
        status: "active"
      });
    } else {
      const fn = thaiFirstNamesF[(i / 2 - 1) % thaiFirstNamesF.length];
      const ln = thaiLastNamesF[(i / 2 - 1) % thaiLastNamesF.length];
      const prefix = rollNo > 30 ? "นางสาว" : "เด็กหญิง";
      students.push({
        id: `std-${classroomId}-${i}`,
        schoolId,
        classroomId,
        prefix,
        firstName: fn,
        lastName: ln,
        gender: "F",
        rollNo,
        status: "active"
      });
    }
  }

  return students;
};

// State Interface
interface GMSState {
  // Metadata selection
  activeSchoolId: string;
  activeAcademicYearId: string;
  activeSemesterId: string;
  activeClassroomId: string;
  activeSubjectId: string;

  // DB Collections
  schools: School[];
  users: User[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  scoreComponents: ScoreComponent[];
  scores: Score[];
  bonusScores: BonusScore[];
  gradeRules: GradeRules;
  gradeResults: GradeResult[];
  auditLogs: AuditLog[];

  // Undo / Redo stacks for score editing
  undoStack: string[]; // JSON snapshots of scores
  redoStack: string[];

  // Actions
  setActiveSchoolId: (id: string) => void;
  setActiveAcademicYearId: (id: string) => void;
  setActiveSemesterId: (id: string) => void;
  setActiveClassroomId: (id: string) => void;
  setActiveSubjectId: (id: string) => void;

  // Add / Edit / Delete Student
  addStudent: (student: Omit<Student, "id" | "schoolId" | "classroomId">) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  bulkAddStudents: (students: Omit<Student, "id" | "schoolId" | "classroomId">[]) => void;
  bulkMoveStudents: (studentIds: string[], targetClassroomId: string) => void;
  promoteStudents: (studentIds: string[], targetClassroomId: string) => void;

  // Attendance Actions
  createAttendanceSession: (date: string, sessionNo: number) => string;
  updateAttendanceRecord: (sessionId: string, studentId: string, status: "มา" | "ลา" | "ขาด" | "สาย" | "หยุด", remarks?: string) => void;
  bulkCheckAttendance: (sessionId: string, status: "มา" | "ลา" | "ขาด" | "สาย" | "หยุด") => void;
  updateAttendanceSession: (id: string, date: string, sessionNo: number) => void;
  deleteAttendanceSession: (id: string) => void;

  // Score Component Actions
  addScoreComponent: (component: Omit<ScoreComponent, "id" | "subjectId" | "semesterId" | "classroomId" | "order"> & { order?: number }) => void;
  updateScoreComponent: (component: ScoreComponent) => void;
  deleteScoreComponent: (id: string) => void;

  // Score Actions
  updateScore: (studentId: string, scoreComponentId: string, scoreVal: number, remarks?: string) => void;
  bulkUpdateScores: (updates: { studentId: string; scoreComponentId: string; scoreVal: number }[]) => void;
  pushScoreHistory: () => void;
  undoScore: () => void;
  redoScore: () => void;

  // Bonus Score Actions
  addBonusScore: (studentId: string, points: number, reason: string) => void;
  updateBonusScore: (id: string, points: number, reason: string) => void;
  deleteBonusScore: (id: string) => void;

  // Grade Result Actions
  calculateGrades: () => void;
  updateGradeOverride: (studentId: string, grade: string, gpaPoints: number) => void;
  toggleGradeLock: (studentId: string) => void;

  // Audit Logs
  addAuditLog: (action: AuditLog["action"], resourceType: string, resourceId: string, description: string) => void;
  
  // Settings
  mainTitle: string;
  subTitle: string;
  teacherName: string;
  teacherAvatar: string | null;
  schoolLogo: string | null;
  updateSystemSettings: (settings: {
    mainTitle?: string;
    subTitle?: string;
    teacherName?: string;
    teacherAvatar?: string | null;
    schoolLogo?: string | null;
  }) => void;
  updateGradeRules: (ranges: GradeRange[]) => void;
  addClassroom: (name: string, teacherId?: string) => void;
  updateClassroom: (classroom: Classroom) => void;
  deleteClassroom: (id: string) => void;
  addSubject: (code: string, name: string, creditPoints: number, hoursPerWeek: number) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  addAcademicYear: (year: number) => void;
  updateAcademicYear: (id: string, year: number) => void;
  deleteAcademicYear: (id: string) => void;

  // Account Data Persistence Actions
  currentAccountEmail: string;
  isDataLoaded: boolean;
  syncStatus: "idle" | "saving" | "saved" | "error";
  syncError: string | null;
  lastSavedTime: string | null;
  loadAccountData: (email: string) => void;
  saveAccountData: () => void;
}

const createDefaultInitialState = () => {
  const defaultSchool: School = {
    id: "school-1",
    nameTh: "โรงเรียนประชารักศึกษา",
    nameEn: "Pracharuksa Academy",
    status: "active"
  };

  const defaultAcademicYears: AcademicYear[] = [
    { id: "school-1_2568", schoolId: "school-1", year: 2568, status: "closed" },
    { id: "school-1_2569", schoolId: "school-1", year: 2569, status: "active" }
  ];

  const defaultSemesters: Semester[] = [
    { id: "school-1_2569_1", academicYearId: "school-1_2569", semesterNo: 1, status: "active" },
    { id: "school-1_2569_2", academicYearId: "school-1_2569", semesterNo: 2, status: "closed" }
  ];

  const defaultClassrooms: Classroom[] = [
    { id: "class-m1-1", schoolId: "school-1", academicYearId: "school-1_2569", name: "ม.1/1", teacherId: "mock-teacher-id-1", studentCount: 40 },
    { id: "class-m1-2", schoolId: "school-1", academicYearId: "school-1_2569", name: "ม.1/2", teacherId: "mock-teacher-id-2", studentCount: 20 },
    { id: "class-m2-1", schoolId: "school-1", academicYearId: "school-1_2569", name: "ม.2/1", teacherId: "mock-teacher-id-1", studentCount: 0 }
  ];

  const defaultSubjects: Subject[] = [
    { id: "sub-sci", schoolId: "school-1", code: "ว21101", name: "วิทยาศาสตร์ 1", creditPoints: 1.5, hoursPerWeek: 3 },
    { id: "sub-math", schoolId: "school-1", code: "ค21101", name: "คณิตศาสตร์พื้นฐาน 1", creditPoints: 1.5, hoursPerWeek: 3 },
    { id: "sub-eng", schoolId: "school-1", code: "อ21101", name: "ภาษาอังกฤษ 1", creditPoints: 1.0, hoursPerWeek: 2 }
  ];

  const defaultStudents = [
    ...generateInitialStudents("school-1", "class-m1-1"),
    ...generateInitialStudents("school-1", "class-m1-2").slice(0, 20)
  ];

  const defaultEnrollments: Enrollment[] = defaultStudents.map(std => ({
    id: `enroll-${std.id}-${defaultSubjects[0].id}`,
    studentId: std.id,
    subjectId: defaultSubjects[0].id,
    semesterId: "school-1_2569_1",
    classroomId: std.classroomId,
    status: "active"
  }));

  const defaultGradeRules: GradeRules = {
    id: "rule-default",
    schoolId: "school-1",
    ranges: [
      { min: 80, max: 100, grade: "4", gpaPoints: 4.0 },
      { min: 75, max: 79.9, grade: "3.5", gpaPoints: 3.5 },
      { min: 70, max: 74.9, grade: "3", gpaPoints: 3.0 },
      { min: 65, max: 69.9, grade: "2.5", gpaPoints: 2.5 },
      { min: 60, max: 64.9, grade: "2", gpaPoints: 2.0 },
      { min: 55, max: 59.9, grade: "1.5", gpaPoints: 1.5 },
      { min: 50, max: 54.9, grade: "1", gpaPoints: 1.0 },
      { min: 0, max: 49.9, grade: "0", gpaPoints: 0.0 }
    ]
  };

  const defaultScoreComponents: ScoreComponent[] = [
    { id: "comp-hw1", subjectId: "sub-sci", semesterId: "school-1_2569_1", classroomId: "class-m1-1", name: "ใบงานที่ 1", type: "assignment", maxScore: 10, weightPercent: 10, order: 1 },
    { id: "comp-hw2", subjectId: "sub-sci", semesterId: "school-1_2569_1", classroomId: "class-m1-1", name: "ใบงานที่ 2", type: "assignment", maxScore: 10, weightPercent: 10, order: 2 },
    { id: "comp-quiz", subjectId: "sub-sci", semesterId: "school-1_2569_1", classroomId: "class-m1-1", name: "ทดสอบท้ายบท", type: "quiz", maxScore: 20, weightPercent: 20, order: 3 },
    { id: "comp-mid", subjectId: "sub-sci", semesterId: "school-1_2569_1", classroomId: "class-m1-1", name: "สอบกลางภาค", type: "exam", maxScore: 30, weightPercent: 30, order: 4 },
    { id: "comp-final", subjectId: "sub-sci", semesterId: "school-1_2569_1", classroomId: "class-m1-1", name: "สอบปลายภาค", type: "exam", maxScore: 30, weightPercent: 30, order: 5 }
  ];

  const defaultScores: Score[] = [];
  const defaultGradeResults: GradeResult[] = [];

  const calcGrade = (scoreSum: number, ranges: GradeRange[]) => {
    const found = ranges.find(r => scoreSum >= r.min && scoreSum <= r.max);
    return found ? { grade: found.grade, gpa: found.gpaPoints } : { grade: "0", gpa: 0 };
  };

  defaultStudents.filter(s => s.classroomId === "class-m1-1").forEach(std => {
    let totalScore = 0;
    defaultScoreComponents.forEach(comp => {
      let val = 0;
      if (comp.id === "comp-hw1" || comp.id === "comp-hw2") {
        val = Math.floor(Math.random() * 4) + 7;
      } else if (comp.id === "comp-quiz") {
        val = Math.floor(Math.random() * 8) + 12;
      } else if (comp.id === "comp-mid" || comp.id === "comp-final") {
        val = Math.floor(Math.random() * 12) + 18;
      }
      totalScore += (val / comp.maxScore) * comp.weightPercent;

      defaultScores.push({
        id: `${std.id}_${comp.id}`,
        studentId: std.id,
        scoreComponentId: comp.id,
        score: val,
        isGraded: true,
        updatedAt: new Date().toISOString(),
        updatedBy: "mock-teacher-id-1"
      });
    });

    const { grade, gpa } = calcGrade(totalScore, defaultGradeRules.ranges);

    defaultGradeResults.push({
      id: `${std.id}_sub-sci_school-1_2569_1`,
      studentId: std.id,
      subjectId: "sub-sci",
      semesterId: "school-1_2569_1",
      classroomId: "class-m1-1",
      rawScoreSum: Math.round(totalScore * 10) / 10,
      bonusScoreSum: 0,
      totalScore: Math.round(totalScore * 10) / 10,
      grade,
      gpaPoints: gpa,
      isLocked: false,
      updatedAt: new Date().toISOString(),
      updatedBy: "mock-teacher-id-1"
    });
  });

  const defaultAttendanceSessions: AttendanceSession[] = [];
  const defaultAttendanceRecords: AttendanceRecord[] = [];
  const datePrefixes = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-13", "2026-07-14"];

  datePrefixes.forEach((dateStr, idx) => {
    const sesId = `session-sci-${idx}`;
    defaultAttendanceSessions.push({
      id: sesId,
      schoolId: "school-1",
      classroomId: "class-m1-1",
      subjectId: "sub-sci",
      semesterId: "school-1_2569_1",
      date: dateStr,
      sessionNo: 1
    });

    defaultStudents.filter(s => s.classroomId === "class-m1-1").forEach(std => {
      const rand = Math.random();
      let status: "มา" | "ลา" | "ขาด" | "สาย" | "หยุด" = "มา";
      if (rand > 0.97) status = "ขาด";
      else if (rand > 0.93) status = "สาย";
      else if (rand > 0.85) status = "ลา";
      else if (rand > 0.82) status = "หยุด";

      defaultAttendanceRecords.push({
        id: `${sesId}_${std.id}`,
        sessionId: sesId,
        studentId: std.id,
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: "mock-teacher-id-1"
      });
    });
  });

  const defaultBonusScores: BonusScore[] = [
    { id: "bonus-1", studentId: "std-class-m1-1-1", subjectId: "sub-sci", semesterId: "school-1_2569_1", points: 2, reason: "ช่วยตอบคำถามยากในห้องเรียน", timestamp: new Date().toISOString(), createdBy: "mock-teacher-id-1" },
    { id: "bonus-2", studentId: "std-class-m1-1-3", subjectId: "sub-sci", semesterId: "school-1_2569_1", points: 1, reason: "ช่วยจัดโต๊ะสาธิตวิทยาศาสตร์", timestamp: new Date().toISOString(), createdBy: "mock-teacher-id-1" }
  ];

  return {
    activeSchoolId: "school-1",
    activeAcademicYearId: "school-1_2569",
    activeSemesterId: "school-1_2569_1",
    activeClassroomId: "class-m1-1",
    activeSubjectId: "sub-sci",
    mainTitle: "GradeD Portal",
    subTitle: "ระบบบันทึกผลการเรียนและเช็คชื่อนักเรียน",
    teacherName: "คุณครูผู้สอน",
    teacherAvatar: null,
    schoolLogo: null,
    schools: [defaultSchool],
    users: [],
    academicYears: defaultAcademicYears,
    semesters: defaultSemesters,
    classrooms: defaultClassrooms,
    subjects: defaultSubjects,
    students: defaultStudents,
    enrollments: defaultEnrollments,
    attendanceSessions: defaultAttendanceSessions,
    attendanceRecords: defaultAttendanceRecords,
    scoreComponents: defaultScoreComponents,
    scores: defaultScores,
    bonusScores: defaultBonusScores,
    gradeRules: defaultGradeRules,
    gradeResults: defaultGradeResults,
    auditLogs: []
  };
};

export const useGMSStore = create<GMSState>()(
    (set, get) => {
      const initial = createDefaultInitialState();

      return {
        ...initial,
        currentAccountEmail: "",
        isDataLoaded: false,
        syncStatus: "idle",
        syncError: null,
        lastSavedTime: null,
        undoStack: [],
        redoStack: [],

        loadAccountData: async (email: string) => {
          if (!email) return;
          const normalized = email.toLowerCase().trim();
          set({ currentAccountEmail: normalized, isDataLoaded: false });

          const isSupabaseAvailable = () => {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            return Boolean(url && url.includes("supabase.co") && key && key.length > 20 && !url.includes("placeholder"));
          };

          // 1. Try loading from Supabase Cloud if configured
          if (isSupabaseAvailable()) {
            try {
              const [
                schoolsRes,
                yearsRes,
                semsRes,
                classesRes,
                subsRes,
                stdsRes,
                enrollsRes,
                sessionsRes,
                recordsRes,
                compsRes,
                scoresRes,
                bonusRes,
                rulesRes,
                resultsRes
              ] = await Promise.all([
                supabase.from("schools").select("*"),
                supabase.from("academic_years").select("*"),
                supabase.from("semesters").select("*"),
                supabase.from("classrooms").select("*"),
                supabase.from("subjects").select("*"),
                supabase.from("students").select("*"),
                supabase.from("enrollments").select("*"),
                supabase.from("attendance_sessions").select("*"),
                supabase.from("attendance_records").select("*"),
                supabase.from("score_components").select("*"),
                supabase.from("scores").select("*"),
                supabase.from("bonus_scores").select("*"),
                supabase.from("grade_rules").select("*"),
                supabase.from("grade_results").select("*")
              ]);

              if (schoolsRes.data && schoolsRes.data.length > 0) {
                let savedBranding: any = {};
                try {
                  const raw = localStorage.getItem("graded_branding");
                  if (raw) savedBranding = JSON.parse(raw);
                } catch (e) {}

                const mappedSchools = schoolsRes.data.map((s: any) => ({
                  id: s.id,
                  nameTh: s.name_th,
                  nameEn: s.name_en,
                  logoUrl: s.logo_url,
                  status: s.status
                }));

                const mappedYears = (yearsRes.data || []).map((y: any) => ({
                  id: y.id,
                  schoolId: y.school_id,
                  year: y.year,
                  status: y.status
                }));

                const mappedSemesters = (semsRes.data || []).map((s: any) => ({
                  id: s.id,
                  academicYearId: s.academic_year_id,
                  semesterNo: s.semester_no,
                  status: s.status
                }));

                const mappedClassrooms = (classesRes.data || []).map((c: any) => ({
                  id: c.id,
                  schoolId: c.school_id,
                  academicYearId: c.academic_year_id,
                  name: c.name,
                  teacherId: c.teacher_id,
                  studentCount: c.student_count
                }));

                const mappedSubjects = (subsRes.data || []).map((s: any) => ({
                  id: s.id,
                  schoolId: s.school_id,
                  code: s.code,
                  name: s.name,
                  creditPoints: Number(s.credit_points),
                  hoursPerWeek: Number(s.hours_per_week)
                }));

                const mappedStudents = (stdsRes.data || []).map((s: any) => ({
                  id: s.id,
                  schoolId: s.school_id,
                  classroomId: s.classroom_id,
                  prefix: s.prefix,
                  firstName: s.first_name,
                  lastName: s.last_name,
                  gender: s.gender,
                  rollNo: s.roll_no,
                  status: s.status
                }));

                const mappedEnrollments = (enrollsRes.data || []).map((e: any) => ({
                  id: e.id,
                  studentId: e.student_id,
                  subjectId: e.subject_id,
                  semesterId: e.semester_id,
                  classroomId: e.classroom_id,
                  status: e.status
                }));

                const mappedSessions = (sessionsRes.data || []).map((s: any) => ({
                  id: s.id,
                  schoolId: s.school_id,
                  classroomId: s.classroom_id,
                  subjectId: s.subject_id,
                  semesterId: s.semester_id,
                  date: s.date,
                  sessionNo: s.session_no
                }));

                const mappedRecords = (recordsRes.data || []).map((r: any) => ({
                  id: r.id,
                  sessionId: r.session_id,
                  studentId: r.student_id,
                  status: r.status,
                  remarks: r.remarks,
                  updatedAt: r.updated_at,
                  updatedBy: r.updated_by
                }));

                const mappedComponents = (compsRes.data || []).map((c: any) => ({
                  id: c.id,
                  subjectId: c.subject_id,
                  semesterId: c.semester_id,
                  classroomId: c.classroom_id,
                  name: c.name,
                  type: c.type,
                  maxScore: Number(c.max_score),
                  weightPercent: Number(c.weight_percent),
                  order: c.order_no
                }));

                const mappedScores = (scoresRes.data || []).map((sc: any) => ({
                  id: sc.id,
                  studentId: sc.student_id,
                  scoreComponentId: sc.score_component_id,
                  score: Number(sc.score),
                  isGraded: sc.is_graded,
                  remarks: sc.remarks,
                  updatedAt: sc.updated_at,
                  updatedBy: sc.updated_by
                }));

                const mappedBonus = (bonusRes.data || []).map((b: any) => ({
                  id: b.id,
                  studentId: b.student_id,
                  subjectId: b.subject_id,
                  semesterId: b.semester_id,
                  points: Number(b.points),
                  reason: b.reason,
                  timestamp: b.created_at,
                  createdBy: b.created_by
                }));

                const rawRule = (rulesRes.data && rulesRes.data[0]) || null;
                const mappedRule = rawRule ? {
                  id: rawRule.id,
                  schoolId: rawRule.school_id,
                  subjectId: rawRule.subject_id,
                  ranges: Array.isArray(rawRule.ranges) ? rawRule.ranges : JSON.parse(rawRule.ranges || "[]")
                } : createDefaultInitialState().gradeRules;

                const mappedResults = (resultsRes.data || []).map((gr: any) => ({
                  id: gr.id,
                  studentId: gr.student_id,
                  subjectId: gr.subject_id,
                  semesterId: gr.semester_id,
                  classroomId: gr.classroom_id || gr.classroomid || mappedClassrooms[0]?.id || "class-m1-1",
                  rawScoreSum: Number(gr.raw_score_sum),
                  bonusScoreSum: Number(gr.bonus_score_sum),
                  totalScore: Number(gr.total_score),
                  grade: gr.grade,
                  gpaPoints: Number(gr.gpa_points),
                  isLocked: Boolean(gr.is_locked),
                  updatedAt: gr.updated_at,
                  updatedBy: gr.updated_by
                }));

                set({
                  activeSchoolId: mappedSchools[0]?.id || "school-1",
                  activeAcademicYearId: mappedYears.find((y: any) => y.status === "active")?.id || mappedYears[0]?.id || "",
                  activeSemesterId: mappedSemesters.find((s: any) => s.status === "active")?.id || mappedSemesters[0]?.id || "",
                  activeClassroomId: mappedClassrooms[0]?.id || "",
                  activeSubjectId: mappedSubjects[0]?.id || "",
                  mainTitle: savedBranding.mainTitle || "GradeD Portal",
                  subTitle: savedBranding.subTitle || "ระบบบันทึกผลการเรียนและเช็คชื่อนักเรียน",
                  teacherName: savedBranding.teacherName || "คุณครูผู้สอน",
                  teacherAvatar: savedBranding.teacherAvatar || null,
                  schoolLogo: savedBranding.schoolLogo || null,
                  schools: mappedSchools,
                  academicYears: mappedYears,
                  semesters: mappedSemesters,
                  classrooms: mappedClassrooms,
                  subjects: mappedSubjects,
                  students: mappedStudents,
                  enrollments: mappedEnrollments,
                  attendanceSessions: mappedSessions,
                  attendanceRecords: mappedRecords,
                  scoreComponents: mappedComponents,
                  scores: mappedScores,
                  bonusScores: mappedBonus,
                  gradeRules: mappedRule,
                  gradeResults: mappedResults,
                  currentAccountEmail: normalized,
                  isDataLoaded: true,
                  undoStack: [],
                  redoStack: []
                });

                get().calculateGrades();
                return;
              }
            } catch (e) {
              console.warn("Could not load from Supabase, trying SQLite / local fallback:", e);
            }
          }

          // 2. Try loading from SQLite /api/db
          try {
            const res = await fetch("/api/db");
            if (res.ok) {
              const text = await res.text();
              try {
                const json = JSON.parse(text);
                if (json.success && json.data && json.data.schools && json.data.schools.length > 0) {
                  set({
                    ...json.data,
                    currentAccountEmail: normalized,
                    isDataLoaded: true,
                    undoStack: [],
                    redoStack: []
                  });
                  get().calculateGrades();
                  return;
                }
              } catch (e) {}
            }
          } catch (err) {}

          // 3. Fallback to default state
          const defaultData = createDefaultInitialState();
          let savedBranding: any = {};
          try {
            const raw = localStorage.getItem("graded_branding");
            if (raw) savedBranding = JSON.parse(raw);
          } catch (e) {}

          set({
            ...defaultData,
            mainTitle: savedBranding.mainTitle || defaultData.mainTitle,
            subTitle: savedBranding.subTitle || defaultData.subTitle,
            teacherName: savedBranding.teacherName || defaultData.teacherName,
            teacherAvatar: savedBranding.teacherAvatar || defaultData.teacherAvatar,
            schoolLogo: savedBranding.schoolLogo || defaultData.schoolLogo,
            currentAccountEmail: normalized,
            isDataLoaded: true,
            undoStack: [],
            redoStack: []
          });
          get().calculateGrades();
        },

        saveAccountData: async () => {
          const state = get();
          const email = state.currentAccountEmail;
          if (!email || !state.isDataLoaded) return;

          set({ syncStatus: "saving", syncError: null });

          // Save branding locally in browser
          try {
            localStorage.setItem("graded_branding", JSON.stringify({
              mainTitle: state.mainTitle,
              subTitle: state.subTitle,
              teacherName: state.teacherName,
              teacherAvatar: state.teacherAvatar,
              schoolLogo: state.schoolLogo
            }));
          } catch (e) {}

          const isSupabaseAvailable = () => {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            return Boolean(url && url.includes("supabase.co") && key && key.length > 20 && !url.includes("placeholder"));
          };

          try {
            // 1. If Supabase is available, save to Supabase Cloud
            if (isSupabaseAvailable()) {
              // Save schools & branding
              if (state.schools && state.schools.length > 0) {
                const schoolRows = state.schools.map((s, idx) => ({
                  id: s.id,
                  name_th: idx === 0 ? (state.mainTitle || s.nameTh) : s.nameTh,
                  name_en: idx === 0 ? (state.subTitle || s.nameEn) : s.nameEn,
                  logo_url: idx === 0 ? (state.schoolLogo || s.logoUrl || null) : (s.logoUrl || null),
                  status: s.status || "active"
                }));
                await supabase.from("schools").upsert(schoolRows, { onConflict: "id" });
              }

              // Save academic years
              if (state.academicYears && state.academicYears.length > 0) {
                const yearRows = state.academicYears.map(y => ({
                  id: y.id,
                  school_id: y.schoolId,
                  year: Number(y.year),
                  status: y.status || "active"
                }));
                await supabase.from("academic_years").upsert(yearRows, { onConflict: "id" });
              }

              // Save semesters
              if (state.semesters && state.semesters.length > 0) {
                const semRows = state.semesters.map(s => ({
                  id: s.id,
                  academic_year_id: s.academicYearId,
                  semester_no: Number(s.semesterNo),
                  status: s.status || "active"
                }));
                await supabase.from("semesters").upsert(semRows, { onConflict: "id" });
              }

              // Save classrooms
              if (state.classrooms && state.classrooms.length > 0) {
                const classRows = state.classrooms.map(c => ({
                  id: c.id,
                  school_id: c.schoolId,
                  academic_year_id: c.academicYearId,
                  name: c.name,
                  teacher_id: null,
                  student_count: Number(c.studentCount) || 0
                }));
                await supabase.from("classrooms").upsert(classRows, { onConflict: "id" });
              }

              // Save subjects
              if (state.subjects && state.subjects.length > 0) {
                const subRows = state.subjects.map(s => ({
                  id: s.id,
                  school_id: s.schoolId,
                  code: s.code,
                  name: s.name,
                  credit_points: Number(s.creditPoints) || 1.0,
                  hours_per_week: Number(s.hoursPerWeek) || 2
                }));
                await supabase.from("subjects").upsert(subRows, { onConflict: "id" });
              }

              // Save grade rules
              if (state.gradeRules) {
                const ruleRow = {
                  id: state.gradeRules.id || "rule-default",
                  school_id: state.gradeRules.schoolId || state.schools[0]?.id || "school-1",
                  subject_id: state.gradeRules.subjectId || null,
                  ranges: state.gradeRules.ranges || []
                };
                await supabase.from("grade_rules").upsert(ruleRow, { onConflict: "id" });
              }

              // Save students
              if (state.students && state.students.length > 0) {
                const studentRows = state.students.map(std => ({
                  id: std.id,
                  school_id: std.schoolId,
                  classroom_id: std.classroomId,
                  prefix: std.prefix,
                  first_name: std.firstName,
                  last_name: std.lastName,
                  gender: std.gender,
                  roll_no: Number(std.rollNo),
                  status: std.status || "active"
                }));
                await supabase.from("students").upsert(studentRows, { onConflict: "id" });
              }

              // Save enrollments
              if (state.enrollments && state.enrollments.length > 0) {
                const enrollRows = state.enrollments.map(e => ({
                  id: e.id,
                  student_id: e.studentId,
                  subject_id: e.subjectId,
                  semester_id: e.semesterId,
                  classroom_id: e.classroomId,
                  status: e.status || "active"
                }));
                await supabase.from("enrollments").upsert(enrollRows, { onConflict: "id" });
              }

              // Save score components
              if (state.scoreComponents && state.scoreComponents.length > 0) {
                const compRows = state.scoreComponents.map(c => ({
                  id: c.id,
                  subject_id: c.subjectId,
                  semester_id: c.semesterId,
                  classroom_id: c.classroomId,
                  name: c.name,
                  type: c.type || "assignment",
                  max_score: Number(c.maxScore) || 10,
                  weight_percent: Number(c.weightPercent) || 10,
                  order_no: Number(c.order) || 1
                }));
                await supabase.from("score_components").upsert(compRows, { onConflict: "id" });
              }

              // Save attendance sessions
              if (state.attendanceSessions && state.attendanceSessions.length > 0) {
                const sesRows = state.attendanceSessions.map(ses => ({
                  id: ses.id,
                  school_id: ses.schoolId,
                  classroom_id: ses.classroomId,
                  subject_id: ses.subjectId,
                  semester_id: ses.semesterId,
                  date: ses.date,
                  session_no: Number(ses.sessionNo) || 1
                }));
                await supabase.from("attendance_sessions").upsert(sesRows, { onConflict: "id" });
              }

              // Save attendance records
              if (state.attendanceRecords && state.attendanceRecords.length > 0) {
                const recordsToSave = state.attendanceRecords.map(r => ({
                  id: r.id,
                  session_id: r.sessionId,
                  student_id: r.studentId,
                  status: r.status,
                  remarks: r.remarks || null,
                  updated_at: r.updatedAt || new Date().toISOString()
                }));
                await supabase.from("attendance_records").upsert(recordsToSave, { onConflict: "session_id,student_id" });
              }

              // Save scores
              if (state.scores && state.scores.length > 0) {
                const scoresToSave = state.scores.map(sc => ({
                  id: sc.id,
                  student_id: sc.studentId,
                  score_component_id: sc.scoreComponentId,
                  score: sc.score,
                  is_graded: sc.isGraded,
                  remarks: sc.remarks || null,
                  updated_at: sc.updatedAt || new Date().toISOString()
                }));
                await supabase.from("scores").upsert(scoresToSave, { onConflict: "student_id,score_component_id" });
              }

              // Save bonus scores
              if (state.bonusScores && state.bonusScores.length > 0) {
                const bonusRows = state.bonusScores.map(b => ({
                  id: b.id,
                  student_id: b.studentId,
                  subject_id: b.subjectId,
                  semester_id: b.semesterId,
                  points: Number(b.points),
                  reason: b.reason || "",
                  created_at: b.timestamp || new Date().toISOString()
                }));
                await supabase.from("bonus_scores").upsert(bonusRows, { onConflict: "id" });
              }

              // Save grade results
              if (state.gradeResults && state.gradeResults.length > 0) {
                const resultsToSave = state.gradeResults.map(gr => ({
                  id: gr.id,
                  student_id: gr.studentId,
                  subject_id: gr.subjectId,
                  semester_id: gr.semesterId,
                  classroomid: gr.classroomId,
                  raw_score_sum: gr.rawScoreSum,
                  bonus_score_sum: gr.bonusScoreSum,
                  total_score: gr.totalScore,
                  grade: gr.grade,
                  gpa_points: gr.gpaPoints,
                  is_locked: gr.isLocked,
                  updated_at: gr.updatedAt || new Date().toISOString()
                }));
                await supabase.from("grade_results").upsert(resultsToSave, { onConflict: "student_id,subject_id,semester_id" });
              }
            } else {
              // 2. Local SQLite mode via /api/db
              const accountData = {
                activeSchoolId: state.activeSchoolId,
                activeAcademicYearId: state.activeAcademicYearId,
                activeSemesterId: state.activeSemesterId,
                activeClassroomId: state.activeClassroomId,
                activeSubjectId: state.activeSubjectId,
                mainTitle: state.mainTitle,
                subTitle: state.subTitle,
                teacherName: state.teacherName,
                teacherAvatar: state.teacherAvatar,
                schoolLogo: state.schoolLogo,
                schools: state.schools,
                academicYears: state.academicYears,
                semesters: state.semesters,
                classrooms: state.classrooms,
                subjects: state.subjects,
                students: state.students,
                enrollments: state.enrollments,
                attendanceSessions: state.attendanceSessions,
                attendanceRecords: state.attendanceRecords,
                scoreComponents: state.scoreComponents,
                scores: state.scores,
                bonusScores: state.bonusScores,
                gradeRules: state.gradeRules,
                gradeResults: state.gradeResults
              };

              const res = await fetch("/api/db", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(accountData)
              });
              if (res.ok) {
                const text = await res.text();
                try {
                  const result = JSON.parse(text);
                  if (!result.success && !result.isServerless) {
                    throw new Error(result.error || "Save failed");
                  }
                } catch (e) {}
              }
            }

            const nowString = new Date().toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            });

            set({
              syncStatus: "saved",
              syncError: null,
              lastSavedTime: nowString
            });
            setTimeout(() => {
              if (get().syncStatus === "saved") {
                set({ syncStatus: "idle" });
              }
            }, 3000);
          } catch (err: any) {
            console.error("Save error:", err);
            set({
              syncStatus: "error",
              syncError: err.message || "ไม่สามารถบันทึกลง Database ได้"
            });
          }
        },

        // Selection Handlers
        setActiveSchoolId: (id) => set({ activeSchoolId: id }),
        setActiveAcademicYearId: (id) => set({ activeAcademicYearId: id }),
        setActiveSemesterId: (id) => set({ activeSemesterId: id }),
        setActiveClassroomId: (id) => set({ activeClassroomId: id }),
        setActiveSubjectId: (id) => set({ activeSubjectId: id }),

        // Add / Edit / Delete Student
        addStudent: (std) => set((state) => {
          const newId = `std-${state.activeClassroomId}-${Date.now()}`;
          const newStudent: Student = {
            id: newId,
            schoolId: state.activeSchoolId,
            classroomId: state.activeClassroomId,
            ...std,
            rollNo: std.rollNo || (state.students.filter(s => s.classroomId === state.activeClassroomId).length + 1),
          };
          
          // Add enrollment automatically
          const newEnrollment: Enrollment = {
            id: `enroll-${newId}-${state.activeSubjectId}`,
            studentId: newId,
            subjectId: state.activeSubjectId,
            semesterId: state.activeSemesterId,
            classroomId: state.activeClassroomId,
            status: "active"
          };

          // Setup initial scores for components
          const newScores = [...state.scores];
          const activeComps = state.scoreComponents.filter(
            c => c.subjectId === state.activeSubjectId && c.classroomId === state.activeClassroomId
          );
          activeComps.forEach(comp => {
            newScores.push({
              id: `${newId}_${comp.id}`,
              studentId: newId,
              scoreComponentId: comp.id,
              score: 0,
              isGraded: false,
              updatedAt: new Date().toISOString(),
              updatedBy: "mock-teacher-id-1"
            });
          });

          // Setup initial grade results
          const newGradeResult: GradeResult = {
            id: `${newId}_${state.activeSubjectId}_${state.activeSemesterId}`,
            studentId: newId,
            subjectId: state.activeSubjectId,
            semesterId: state.activeSemesterId,
            classroomId: state.activeClassroomId,
            rawScoreSum: 0,
            bonusScoreSum: 0,
            totalScore: 0,
            grade: "0",
            gpaPoints: 0,
            isLocked: false,
            updatedAt: new Date().toISOString(),
            updatedBy: "mock-teacher-id-1"
          };

          // Update student count in classroom
          const updatedClassrooms = state.classrooms.map(c => 
            c.id === state.activeClassroomId ? { ...c, studentCount: c.studentCount + 1 } : c
          );

          const updatedStudents = [...state.students, newStudent];
          
          return {
            students: updatedStudents,
            enrollments: [...state.enrollments, newEnrollment],
            scores: newScores,
            gradeResults: [...state.gradeResults, newGradeResult],
            classrooms: updatedClassrooms,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "CREATE",
                resourceType: "student",
                resourceId: newId,
                description: `เพิ่มนักเรียนใหม่ ${std.prefix}${std.firstName} ${std.lastName} เลขที่ ${newStudent.rollNo}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        updateStudent: (student) => set((state) => ({
          students: state.students.map(s => s.id === student.id ? student : s),
          auditLogs: [
            ...state.auditLogs,
            {
              id: `log-${Date.now()}`,
              userId: "mock-teacher-id-1",
              action: "UPDATE",
              resourceType: "student",
              resourceId: student.id,
              description: `แก้ไขข้อมูลนักเรียน ${student.prefix}${student.firstName} ${student.lastName}`,
              timestamp: new Date().toISOString()
            }
          ]
        })),

        deleteStudent: (id) => set((state) => {
          const target = state.students.find(s => s.id === id);
          const updatedStudents = state.students.filter(s => s.id !== id);
          
          // Re-index roll numbers for the classroom
          const classroomId = target?.classroomId;
          if (classroomId) {
            let roll = 1;
            updatedStudents.forEach(s => {
              if (s.classroomId === classroomId) {
                s.rollNo = roll++;
              }
            });
          }

          // Update student count
          const updatedClassrooms = state.classrooms.map(c => 
            c.id === classroomId ? { ...c, studentCount: Math.max(0, c.studentCount - 1) } : c
          );

          return {
            students: updatedStudents,
            classrooms: updatedClassrooms,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "DELETE",
                resourceType: "student",
                resourceId: id,
                description: `ลบนักเรียน ${target?.prefix || ""}${target?.firstName || ""} ${target?.lastName || ""}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        bulkAddStudents: (newStds) => set((state) => {
          const startingRollNo = state.students.filter(s => s.classroomId === state.activeClassroomId).length + 1;
          const addedStudents: Student[] = [];
          const addedEnrollments: Enrollment[] = [];
          const addedGradeResults: GradeResult[] = [];
          const activeComps = state.scoreComponents.filter(
            c => c.subjectId === state.activeSubjectId && c.classroomId === state.activeClassroomId
          );
          const newScores = [...state.scores];

          newStds.forEach((std, idx) => {
            const stdId = `std-${state.activeClassroomId}-${Date.now()}-${idx}`;
            const student: Student = {
              id: stdId,
              schoolId: state.activeSchoolId,
              classroomId: state.activeClassroomId,
              ...std,
              rollNo: std.rollNo || (startingRollNo + idx),
            };
            addedStudents.push(student);

            addedEnrollments.push({
              id: `enroll-${stdId}-${state.activeSubjectId}`,
              studentId: stdId,
              subjectId: state.activeSubjectId,
              semesterId: state.activeSemesterId,
              classroomId: state.activeClassroomId,
              status: "active"
            });

            addedGradeResults.push({
              id: `${stdId}_${state.activeSubjectId}_${state.activeSemesterId}`,
              studentId: stdId,
              subjectId: state.activeSubjectId,
              semesterId: state.activeSemesterId,
              classroomId: state.activeClassroomId,
              rawScoreSum: 0,
              bonusScoreSum: 0,
              totalScore: 0,
              grade: "0",
              gpaPoints: 0,
              isLocked: false,
              updatedAt: new Date().toISOString(),
              updatedBy: "mock-teacher-id-1"
            });

            activeComps.forEach(comp => {
              newScores.push({
                id: `${stdId}_${comp.id}`,
                studentId: stdId,
                scoreComponentId: comp.id,
                score: 0,
                isGraded: false,
                updatedAt: new Date().toISOString(),
                updatedBy: "mock-teacher-id-1"
              });
            });
          });

          const updatedClassrooms = state.classrooms.map(c => 
            c.id === state.activeClassroomId ? { ...c, studentCount: c.studentCount + newStds.length } : c
          );

          return {
            students: [...state.students, ...addedStudents],
            enrollments: [...state.enrollments, ...addedEnrollments],
            scores: newScores,
            gradeResults: [...state.gradeResults, ...addedGradeResults],
            classrooms: updatedClassrooms,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "CREATE",
                resourceType: "student",
                resourceId: "bulk",
                description: `นำเข้านักเรียนรายชื่อจำนวน ${newStds.length} คน ไปยังห้องเรียน`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        bulkMoveStudents: (studentIds, targetClassroomId) => set((state) => {
          const updatedStudents = state.students.map(s => {
            if (studentIds.includes(s.id)) {
              return { ...s, classroomId: targetClassroomId };
            }
            return s;
          });

          // Re-index roll numbers for BOTH classrooms
          const sourceClassroomId = state.activeClassroomId;
          let sourceRoll = 1;
          let targetRoll = updatedStudents.filter(s => s.classroomId === targetClassroomId).length + 1;

          updatedStudents.forEach(s => {
            if (s.classroomId === sourceClassroomId) {
              s.rollNo = sourceRoll++;
            } else if (studentIds.includes(s.id)) {
              s.rollNo = targetRoll++;
            }
          });

          // Recalculate classrooms student counts
          const updatedClassrooms = state.classrooms.map(c => {
            if (c.id === sourceClassroomId) {
              return { ...c, studentCount: Math.max(0, c.studentCount - studentIds.length) };
            }
            if (c.id === targetClassroomId) {
              return { ...c, studentCount: c.studentCount + studentIds.length };
            }
            return c;
          });

          return {
            students: updatedStudents,
            classrooms: updatedClassrooms,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "UPDATE",
                resourceType: "student",
                resourceId: "bulk",
                description: `ย้ายห้องเรียนนักเรียนจำนวน ${studentIds.length} คน ไปยังห้อง ${state.classrooms.find(c => c.id === targetClassroomId)?.name}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        promoteStudents: (studentIds, targetClassroomId) => set((state) => {
          // Promote behaves similarly to bulk move for graduation/new year
          const updatedStudents = state.students.map(s => {
            if (studentIds.includes(s.id)) {
              return { ...s, classroomId: targetClassroomId };
            }
            return s;
          });

          return {
            students: updatedStudents,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "UPDATE",
                resourceType: "student",
                resourceId: "bulk",
                description: `เลื่อนชั้นนักเรียนจำนวน ${studentIds.length} คน ไปยังห้อง ${state.classrooms.find(c => c.id === targetClassroomId)?.name}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        // Attendance
        createAttendanceSession: (date, sessionNo) => {
          const state = get();
          const exist = state.attendanceSessions.find(
            s => s.classroomId === state.activeClassroomId && 
                 s.subjectId === state.activeSubjectId && 
                 s.date === date && 
                 s.sessionNo === sessionNo
          );
          if (exist) return exist.id;

          const newId = `session-${Date.now()}`;
          const newSession: AttendanceSession = {
            id: newId,
            schoolId: state.activeSchoolId,
            classroomId: state.activeClassroomId,
            subjectId: state.activeSubjectId,
            semesterId: state.activeSemesterId,
            date,
            sessionNo
          };

          const newRecords: AttendanceRecord[] = state.students
            .filter(s => s.classroomId === state.activeClassroomId)
            .map(std => ({
              id: `${newId}_${std.id}`,
              sessionId: newId,
              studentId: std.id,
              status: "มา", // Default: Present
              updatedAt: new Date().toISOString(),
              updatedBy: "mock-teacher-id-1"
            }));

          set((state) => ({
            attendanceSessions: [...state.attendanceSessions, newSession],
            attendanceRecords: [...state.attendanceRecords, ...newRecords]
          }));

          return newId;
        },

        updateAttendanceRecord: (sessionId, studentId, status, remarks) => set((state) => {
          const recId = `${sessionId}_${studentId}`;
          const exists = state.attendanceRecords.some(r => r.id === recId);
          
          let newRecords = [];
          if (exists) {
            newRecords = state.attendanceRecords.map(r => 
              r.id === recId ? { ...r, status, remarks, updatedAt: new Date().toISOString() } : r
            );
          } else {
            newRecords = [...state.attendanceRecords, {
              id: recId,
              sessionId,
              studentId,
              status,
              remarks,
              updatedAt: new Date().toISOString(),
              updatedBy: "mock-teacher-id-1"
            }];
          }

          return { attendanceRecords: newRecords };
        }),

        bulkCheckAttendance: (sessionId, status) => set((state) => {
          const newRecords = state.attendanceRecords.map(r => {
            if (r.sessionId === sessionId) {
              return { ...r, status, updatedAt: new Date().toISOString() };
            }
            return r;
          });
          return { attendanceRecords: newRecords };
        }),

        updateAttendanceSession: (id, date, sessionNo) => set((state) => ({
          attendanceSessions: state.attendanceSessions.map(s => s.id === id ? { ...s, date, sessionNo } : s)
        })),

        deleteAttendanceSession: (id) => set((state) => ({
          attendanceSessions: state.attendanceSessions.filter(s => s.id !== id),
          attendanceRecords: state.attendanceRecords.filter(r => r.sessionId !== id)
        })),

        // Score Components
        addScoreComponent: (comp) => set((state) => {
          const newId = `comp-${Date.now()}`;
          const newComp: ScoreComponent = {
            id: newId,
            subjectId: state.activeSubjectId,
            semesterId: state.activeSemesterId,
            classroomId: state.activeClassroomId,
            order: state.scoreComponents.filter(c => c.classroomId === state.activeClassroomId && c.subjectId === state.activeSubjectId).length + 1,
            ...comp
          };

          // Setup initial scores for all students in classroom
          const activeStudents = state.students.filter(s => s.classroomId === state.activeClassroomId);
          const newScores = [...state.scores];
          activeStudents.forEach(std => {
            newScores.push({
              id: `${std.id}_${newId}`,
              studentId: std.id,
              scoreComponentId: newId,
              score: 0,
              isGraded: false,
              updatedAt: new Date().toISOString(),
              updatedBy: "mock-teacher-id-1"
            });
          });

          return {
            scoreComponents: [...state.scoreComponents, newComp],
            scores: newScores
          };
        }),

        updateScoreComponent: (comp) => set((state) => ({
          scoreComponents: state.scoreComponents.map(c => c.id === comp.id ? comp : c)
        })),

        deleteScoreComponent: (id) => set((state) => {
          const updatedComps = state.scoreComponents.filter(c => c.id !== id);
          const updatedScores = state.scores.filter(s => s.scoreComponentId !== id);
          return {
            scoreComponents: updatedComps,
            scores: updatedScores
          };
        }),

        // Scores
        updateScore: (studentId, scoreComponentId, scoreVal, remarks) => {
          const state = get();
          const recId = `${studentId}_${scoreComponentId}`;
          const maxScore = state.scoreComponents.find(c => c.id === scoreComponentId)?.maxScore || 100;
          
          if (scoreVal > maxScore) {
            console.warn(`Score ${scoreVal} exceeds max score ${maxScore}`);
            return;
          }

          state.pushScoreHistory();

          const exists = state.scores.some(s => s.id === recId);
          let newScores = [];

          if (exists) {
            newScores = state.scores.map(s => 
              s.id === recId ? { ...s, score: scoreVal, isGraded: true, remarks, updatedAt: new Date().toISOString() } : s
            );
          } else {
            newScores = [...state.scores, {
              id: recId,
              studentId,
              scoreComponentId,
              score: scoreVal,
              isGraded: true,
              remarks,
              updatedAt: new Date().toISOString(),
              updatedBy: "mock-teacher-id-1"
            }];
          }

          set({ scores: newScores });
          
          // Re-calculate grade outcomes
          get().calculateGrades();
        },

        bulkUpdateScores: (updates) => {
          const state = get();
          state.pushScoreHistory();

          const newScores = [...state.scores];

          updates.forEach(({ studentId, scoreComponentId, scoreVal }) => {
            const recId = `${studentId}_${scoreComponentId}`;
            const idx = newScores.findIndex(s => s.id === recId);

            if (idx > -1) {
              newScores[idx] = {
                ...newScores[idx],
                score: scoreVal,
                isGraded: true,
                updatedAt: new Date().toISOString()
              };
            } else {
              newScores.push({
                id: recId,
                studentId,
                scoreComponentId,
                score: scoreVal,
                isGraded: true,
                updatedAt: new Date().toISOString(),
                updatedBy: "mock-teacher-id-1"
              });
            }
          });

          set({ scores: newScores });
          get().calculateGrades();
        },

        pushScoreHistory: () => {
          const currentScores = JSON.stringify(get().scores);
          set((state) => ({
            undoStack: [...state.undoStack, currentScores].slice(-30), // Max 30 undo depth
            redoStack: [] // Clear redo
          }));
        },

        undoScore: () => {
          const state = get();
          if (state.undoStack.length === 0) return;

          const previous = state.undoStack[state.undoStack.length - 1];
          const newUndo = state.undoStack.slice(0, -1);
          const current = JSON.stringify(state.scores);

          set({
            scores: JSON.parse(previous),
            undoStack: newUndo,
            redoStack: [...state.redoStack, current]
          });
          state.calculateGrades();
        },

        redoScore: () => {
          const state = get();
          if (state.redoStack.length === 0) return;

          const next = state.redoStack[state.redoStack.length - 1];
          const newRedo = state.redoStack.slice(0, -1);
          const current = JSON.stringify(state.scores);

          set({
            scores: JSON.parse(next),
            redoStack: newRedo,
            undoStack: [...state.undoStack, current]
          });
          state.calculateGrades();
        },

        // Bonus Score
        addBonusScore: (studentId, points, reason) => set((state) => {
          const newBonus: BonusScore = {
            id: `bonus-${Date.now()}`,
            studentId,
            subjectId: state.activeSubjectId,
            semesterId: state.activeSemesterId,
            points,
            reason,
            timestamp: new Date().toISOString(),
            createdBy: "mock-teacher-id-1"
          };

          const updatedBonusList = [...state.bonusScores, newBonus];

          // Trigger grade re-calculate for this student
          setTimeout(() => {
            get().calculateGrades();
          }, 0);

          return {
            bonusScores: updatedBonusList,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "CREATE",
                resourceType: "bonus",
                resourceId: studentId,
                description: `บันทึกคะแนนพิเศษ ${points > 0 ? "+" : ""}${points} คะแนน เหตุผล: ${reason}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        updateBonusScore: (id, points, reason) => set((state) => {
          const updatedBonusList = state.bonusScores.map(b => 
            b.id === id ? { ...b, points, reason } : b
          );

          setTimeout(() => {
            get().calculateGrades();
          }, 0);

          return {
            bonusScores: updatedBonusList,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "UPDATE",
                resourceType: "bonus",
                resourceId: id,
                description: `แก้ไขคะแนนพิเศษเป็น ${points > 0 ? "+" : ""}${points} คะแนน เหตุผล: ${reason}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        deleteBonusScore: (id) => set((state) => {
          const updatedBonusList = state.bonusScores.filter(b => b.id !== id);

          setTimeout(() => {
            get().calculateGrades();
          }, 0);

          return {
            bonusScores: updatedBonusList,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "DELETE",
                resourceType: "bonus",
                resourceId: id,
                description: `ลบการบันทึกคะแนนพิเศษ`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        // Calculate Grades
        calculateGrades: () => set((state) => {
          const calculateFinalGrade = (scoreSum: number, ranges: GradeRange[]) => {
            const found = ranges.find(r => scoreSum >= r.min && scoreSum <= r.max);
            return found ? { grade: found.grade, gpa: found.gpaPoints } : { grade: "0", gpa: 0 };
          };

          const activeComps = state.scoreComponents.filter(
            c => c.subjectId === state.activeSubjectId && c.classroomId === state.activeClassroomId && c.semesterId === state.activeSemesterId
          );

          const classroomStudents = state.students.filter(s => s.classroomId === state.activeClassroomId);
          const updatedGradeResults = [...state.gradeResults];

          classroomStudents.forEach(std => {
            // Sum scores
            let rawScore = 0;
            activeComps.forEach(comp => {
              const studentScore = state.scores.find(
                s => s.studentId === std.id && s.scoreComponentId === comp.id
              );
              if (studentScore && studentScore.isGraded) {
                rawScore += (studentScore.score / comp.maxScore) * comp.weightPercent;
              }
            });

            // Sum bonus scores
            const studentBonus = state.bonusScores
              .filter(b => b.studentId === std.id && b.subjectId === state.activeSubjectId && b.semesterId === state.activeSemesterId)
              .reduce((sum, b) => sum + b.points, 0);

            const totalScore = Math.min(100, Math.max(0, rawScore + studentBonus));
            
            // Check override or locked grade result
            const resId = `${std.id}_${state.activeSubjectId}_${state.activeSemesterId}`;
            const existingRes = state.gradeResults.find(r => r.id === resId);

            if (existingRes && existingRes.isLocked) {
              return; // Keep as is
            }

            const { grade, gpa } = calculateFinalGrade(totalScore, state.gradeRules.ranges);

            const resultIdx = updatedGradeResults.findIndex(r => r.id === resId);
            const dataResult: GradeResult = {
              id: resId,
              studentId: std.id,
              subjectId: state.activeSubjectId,
              semesterId: state.activeSemesterId,
              classroomId: state.activeClassroomId,
              rawScoreSum: Math.round(rawScore * 10) / 10,
              bonusScoreSum: studentBonus,
              totalScore: Math.round(totalScore * 10) / 10,
              grade,
              gpaPoints: gpa,
              isLocked: existingRes?.isLocked || false,
              updatedAt: new Date().toISOString(),
              updatedBy: "mock-teacher-id-1"
            };

            if (resultIdx > -1) {
              updatedGradeResults[resultIdx] = dataResult;
            } else {
              updatedGradeResults.push(dataResult);
            }
          });

          return { gradeResults: updatedGradeResults };
        }),

        updateGradeOverride: (studentId, grade, gpaPoints) => set((state) => {
          const resId = `${studentId}_${state.activeSubjectId}_${state.activeSemesterId}`;
          return {
            gradeResults: state.gradeResults.map(r => 
              r.id === resId ? { ...r, grade, gpaPoints, updatedAt: new Date().toISOString() } : r
            )
          };
        }),

        toggleGradeLock: (studentId) => set((state) => {
          const resId = `${studentId}_${state.activeSubjectId}_${state.activeSemesterId}`;
          return {
            gradeResults: state.gradeResults.map(r => 
              r.id === resId ? { ...r, isLocked: !r.isLocked, updatedAt: new Date().toISOString() } : r
            )
          };
        }),

        addAuditLog: (action, resourceType, resourceId, description) => set((state) => ({
          auditLogs: [
            ...state.auditLogs,
            {
              id: `log-${Date.now()}`,
              userId: "mock-teacher-id-1",
              action,
              resourceType,
              resourceId,
              description,
              timestamp: new Date().toISOString()
            }
          ]
        })),

        updateGradeRules: (ranges) => set((state) => ({
          gradeRules: { ...state.gradeRules, ranges },
          auditLogs: [
            ...state.auditLogs,
            {
              id: `log-${Date.now()}`,
              userId: "mock-teacher-id-1",
              action: "UPDATE",
              resourceType: "settings",
              resourceId: "gradeRules",
              description: "แก้ไขเกณฑ์การตัดเกรดของระบบ",
              timestamp: new Date().toISOString()
            }
          ]
        })),

        addClassroom: (name, teacherId) => set((state) => {
          const newId = `class-${Date.now()}`;
          const newClassroom: Classroom = {
            id: newId,
            schoolId: state.activeSchoolId,
            academicYearId: state.activeAcademicYearId,
            name,
            teacherId: teacherId || "mock-teacher-id-1",
            studentCount: 0
          };
          return {
            classrooms: [...state.classrooms, newClassroom],
            activeClassroomId: newId,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "CREATE",
                resourceType: "classroom",
                resourceId: newId,
                description: `สร้างห้องเรียนใหม่ ห้อง ${name}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        updateClassroom: (classroom) => set((state) => ({
          classrooms: state.classrooms.map(c => c.id === classroom.id ? classroom : c),
          auditLogs: [
            ...state.auditLogs,
            {
              id: `log-${Date.now()}`,
              userId: "mock-teacher-id-1",
              action: "UPDATE",
              resourceType: "classroom",
              resourceId: classroom.id,
              description: `แก้ไขข้อมูลห้องเรียน ${classroom.name}`,
              timestamp: new Date().toISOString()
            }
          ]
        })),

        deleteClassroom: (id) => set((state) => {
          const target = state.classrooms.find(c => c.id === id);
          const remainingClassrooms = state.classrooms.filter(c => c.id !== id);
          const newActiveId = state.activeClassroomId === id ? (remainingClassrooms[0]?.id || "") : state.activeClassroomId;
          return {
            classrooms: remainingClassrooms,
            students: state.students.filter(s => s.classroomId !== id),
            activeClassroomId: newActiveId,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "DELETE",
                resourceType: "classroom",
                resourceId: id,
                description: `ลบห้องเรียน ${target?.name || ""}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        addAcademicYear: (year) => set((state) => {
          const id = `school-1_${year}`;
          const newYear: AcademicYear = { id, schoolId: "school-1", year, status: "active" };
          const sem1: Semester = { id: `${id}_1`, academicYearId: id, semesterNo: 1, status: "active" };
          const sem2: Semester = { id: `${id}_2`, academicYearId: id, semesterNo: 2, status: "closed" };

          return {
            academicYears: [...state.academicYears, newYear],
            semesters: [...state.semesters, sem1, sem2],
            activeAcademicYearId: id,
            activeSemesterId: sem1.id
          };
        }),

        updateAcademicYear: (id, year) => set((state) => ({
          academicYears: state.academicYears.map(ay => ay.id === id ? { ...ay, year } : ay)
        })),

        deleteAcademicYear: (id) => set((state) => {
          const remainingYears = state.academicYears.filter(ay => ay.id !== id);
          let newActiveYearId = state.activeAcademicYearId;
          let newActiveSemesterId = state.activeSemesterId;
          let newActiveClassroomId = state.activeClassroomId;

          if (state.activeAcademicYearId === id) {
            newActiveYearId = remainingYears.length > 0 ? remainingYears[0].id : "";
            if (newActiveYearId) {
              const activeSems = state.semesters.filter(s => s.academicYearId !== id && s.academicYearId === newActiveYearId);
              newActiveSemesterId = activeSems.length > 0 ? activeSems[0].id : "";
            } else {
              newActiveSemesterId = "";
            }
          }

          const remainingClassrooms = state.classrooms.filter(c => c.academicYearId !== id);
          if (state.classrooms.find(c => c.id === state.activeClassroomId)?.academicYearId === id) {
            newActiveClassroomId = remainingClassrooms.length > 0 ? remainingClassrooms[0].id : "";
          }

          return {
            academicYears: remainingYears,
            semesters: state.semesters.filter(s => s.academicYearId !== id),
            classrooms: remainingClassrooms,
            activeAcademicYearId: newActiveYearId,
            activeSemesterId: newActiveSemesterId,
            activeClassroomId: newActiveClassroomId
          };
        }),

        addSubject: (code, name, creditPoints, hoursPerWeek) => set((state) => {
          const newId = `sub-${Date.now()}`;
          const newSubject: Subject = {
            id: newId,
            schoolId: state.activeSchoolId,
            code,
            name,
            creditPoints,
            hoursPerWeek
          };
          return {
            subjects: [...state.subjects, newSubject],
            activeSubjectId: newId,
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "CREATE",
                resourceType: "subject",
                resourceId: newId,
                description: `สร้างรายวิชาใหม่ ${code} ${name}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        updateSubject: (subject) => set((state) => ({
          subjects: state.subjects.map(s => s.id === subject.id ? subject : s),
          auditLogs: [
            ...state.auditLogs,
            {
              id: `log-${Date.now()}`,
              userId: "mock-teacher-id-1",
              action: "UPDATE",
              resourceType: "subject",
              resourceId: subject.id,
              description: `แก้ไขข้อมูลรายวิชา ${subject.code} ${subject.name}`,
              timestamp: new Date().toISOString()
            }
          ]
        })),

        deleteSubject: (id) => set((state) => {
          const target = state.subjects.find(s => s.id === id);
          return {
            subjects: state.subjects.filter(s => s.id !== id),
            auditLogs: [
              ...state.auditLogs,
              {
                id: `log-${Date.now()}`,
                userId: "mock-teacher-id-1",
                action: "DELETE",
                resourceType: "subject",
                resourceId: id,
                description: `ลบรายวิชา ${target?.code || ""} ${target?.name || ""}`,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }),

        updateSystemSettings: (settings) => set((state) => ({
          ...state,
          mainTitle: settings.mainTitle !== undefined ? settings.mainTitle : state.mainTitle,
          subTitle: settings.subTitle !== undefined ? settings.subTitle : state.subTitle,
          teacherName: settings.teacherName !== undefined ? settings.teacherName : state.teacherName,
          teacherAvatar: settings.teacherAvatar !== undefined ? settings.teacherAvatar : state.teacherAvatar,
          schoolLogo: settings.schoolLogo !== undefined ? settings.schoolLogo : state.schoolLogo
        }))
      };
    }
);

// Auto-save disabled by user request. Saving is strictly manual via Save button or Ctrl+S.
