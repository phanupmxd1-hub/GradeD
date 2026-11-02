"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// TypeScript Interfaces based on PostgreSQL / Supabase Schema
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
  classroomId?: string;
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
  id: string;
  sessionId: string;
  studentId: string;
  status: "มา" | "ลา" | "ขาด" | "สาย" | "หยุด";
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
  id: string;
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
  id: string;
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

// Initial State Creator
const createDefaultInitialState = () => {
  const schoolId = "f35acdc8-233d-b572-eedf-8f6d7da0ef49";
  const defaultSchool: School = {
    id: schoolId,
    nameTh: "โรงเรียนคำยางพิทยา",
    nameEn: "ระบบบันทึกผลการเรียน 2026",
    status: "active"
  };

  const defaultAcademicYears: AcademicYear[] = [
    { id: "1f94a998-a9a3-ed58-172a-77da9a3fc379", schoolId, year: 2568, status: "closed" },
    { id: "5da4f03a-f5aa-5b74-53e4-26539da2bed7", schoolId, year: 2569, status: "active" }
  ];

  const defaultSemesters: Semester[] = [
    { id: "0849a2cf-3ef4-265a-e5e1-3764b589c499", academicYearId: "5da4f03a-f5aa-5b74-53e4-26539da2bed7", semesterNo: 1, status: "active" },
    { id: "1cbcae4f-21f4-3d96-c67b-1cbcae4f21f4", academicYearId: "5da4f03a-f5aa-5b74-53e4-26539da2bed7", semesterNo: 2, status: "closed" }
  ];

  const defaultGradeRules: GradeRules = {
    id: "2b1285b8-2f73-2e44-fc6e-dbf6a08ace71",
    schoolId,
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

  return {
    activeSchoolId: schoolId,
    activeAcademicYearId: "5da4f03a-f5aa-5b74-53e4-26539da2bed7",
    activeSemesterId: "0849a2cf-3ef4-265a-e5e1-3764b589c499",
    activeClassroomId: "",
    activeSubjectId: "",
    mainTitle: "GradeD Portal",
    subTitle: "ระบบบันทึกผลการเรียนและเช็คชื่อนักเรียน",
    teacherName: "คุณครูผู้สอน",
    teacherAvatar: null,
    schoolLogo: null,
    schools: [defaultSchool],
    users: [],
    academicYears: defaultAcademicYears,
    semesters: defaultSemesters,
    classrooms: [],
    subjects: [],
    students: [],
    enrollments: [],
    attendanceSessions: [],
    attendanceRecords: [],
    scoreComponents: [],
    scores: [],
    bonusScores: [],
    gradeRules: defaultGradeRules,
    gradeResults: [],
    auditLogs: []
  };
};

// State Interface
interface GMSState {
  activeSchoolId: string;
  activeAcademicYearId: string;
  activeSemesterId: string;
  activeClassroomId: string;
  activeSubjectId: string;

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

  undoStack: string[];
  redoStack: string[];

  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (val: boolean) => void;

  setActiveSchoolId: (id: string) => void;
  setActiveAcademicYearId: (id: string) => void;
  setActiveSemesterId: (id: string) => void;
  setActiveClassroomId: (id: string) => void;
  setActiveSubjectId: (id: string) => void;

  addStudent: (student: Omit<Student, "id" | "schoolId" | "classroomId">) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  bulkAddStudents: (students: Omit<Student, "id" | "schoolId" | "classroomId">[]) => void;
  bulkMoveStudents: (studentIds: string[], targetClassroomId: string) => void;
  promoteStudents: (studentIds: string[], targetClassroomId: string) => void;

  createAttendanceSession: (date: string, sessionNo: number) => string;
  updateAttendanceRecord: (sessionId: string, studentId: string, status: "มา" | "ลา" | "ขาด" | "สาย" | "หยุด", remarks?: string) => void;
  bulkCheckAttendance: (sessionId: string, status: "มา" | "ลา" | "ขาด" | "สาย" | "หยุด") => void;
  updateAttendanceSession: (id: string, date: string, sessionNo: number) => void;
  deleteAttendanceSession: (id: string) => void;

  addScoreComponent: (component: Omit<ScoreComponent, "id" | "subjectId" | "semesterId" | "classroomId" | "order"> & { order?: number }) => void;
  updateScoreComponent: (component: ScoreComponent) => void;
  deleteScoreComponent: (id: string) => void;

  updateScore: (studentId: string, scoreComponentId: string, scoreVal: number, remarks?: string) => void;
  bulkUpdateScores: (updates: { studentId: string; scoreComponentId: string; scoreVal: number }[]) => void;
  pushScoreHistory: () => void;
  undoScore: () => void;
  redoScore: () => void;

  addBonusScore: (studentId: string, points: number, reason: string) => void;
  updateBonusScore: (id: string, points: number, reason: string) => void;
  deleteBonusScore: (id: string) => void;

  calculateGrades: () => void;
  updateGradeOverride: (studentId: string, grade: string, gpaPoints: number) => void;
  toggleGradeLock: (studentId: string) => void;

  addAuditLog: (action: AuditLog["action"], resourceType: string, resourceId: string, description: string) => void;
  
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
  addSubject: (code: string, name: string, creditPoints: number, hoursPerWeek: number, classroomId?: string) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  addAcademicYear: (year: number) => void;
  updateAcademicYear: (id: string, year: number) => void;
  deleteAcademicYear: (id: string) => void;

  currentAccountEmail: string;
  isDataLoaded: boolean;
  syncStatus: "idle" | "saving" | "saved" | "error";
  syncError: string | null;
  lastSavedTime: string | null;
  loadAccountData: (email: string) => Promise<void>;
  saveAccountData: () => Promise<void>;
}

export const useGMSStore = create<GMSState>()((set, get) => {
  const initial = createDefaultInitialState();

  return {
    ...initial,
    currentAccountEmail: "",
    isDataLoaded: false,
    syncStatus: "idle",
    syncError: null,
    lastSavedTime: null,
    hasUnsavedChanges: false,
    undoStack: [],
    redoStack: [],

    setHasUnsavedChanges: (val: boolean) => set({ hasUnsavedChanges: val }),

    loadAccountData: async (email: string) => {
      if (!email) return;
      const normalized = email.toLowerCase().trim();
      set({ currentAccountEmail: normalized });

      const isSupabaseAvailable = () => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        return Boolean(url && url.includes("supabase.co") && key && key.length > 20 && !url.includes("placeholder"));
      };

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

            let mappedComponents = (compsRes.data || []).map((c: any) => ({
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

            // If score components are empty in database, initialize standard default components for available classrooms and subjects
            if (mappedComponents.length === 0 && mappedClassrooms.length > 0 && mappedSubjects.length > 0 && mappedSemesters.length > 0) {
              const defaultComps: ScoreComponent[] = [];
              mappedClassrooms.forEach((cls: any) => {
                mappedSubjects.forEach((sub: any) => {
                  const sem = mappedSemesters[0];
                  defaultComps.push(
                    { id: generateUUID(), subjectId: sub.id, semesterId: sem.id, classroomId: cls.id, name: "งาน 1", type: "assignment", maxScore: 10, weightPercent: 10, order: 1 },
                    { id: generateUUID(), subjectId: sub.id, semesterId: sem.id, classroomId: cls.id, name: "งาน 2", type: "assignment", maxScore: 10, weightPercent: 10, order: 2 },
                    { id: generateUUID(), subjectId: sub.id, semesterId: sem.id, classroomId: cls.id, name: "งาน 3", type: "assignment", maxScore: 10, weightPercent: 10, order: 3 },
                    { id: generateUUID(), subjectId: sub.id, semesterId: sem.id, classroomId: cls.id, name: "สอบกลางภาค", type: "exam", maxScore: 20, weightPercent: 20, order: 4 },
                    { id: generateUUID(), subjectId: sub.id, semesterId: sem.id, classroomId: cls.id, name: "งาน 4", type: "assignment", maxScore: 10, weightPercent: 10, order: 5 },
                    { id: generateUUID(), subjectId: sub.id, semesterId: sem.id, classroomId: cls.id, name: "งาน 5", type: "assignment", maxScore: 10, weightPercent: 10, order: 6 },
                    { id: generateUUID(), subjectId: sub.id, semesterId: sem.id, classroomId: cls.id, name: "งาน 6", type: "assignment", maxScore: 10, weightPercent: 10, order: 7 },
                    { id: generateUUID(), subjectId: sub.id, semesterId: sem.id, classroomId: cls.id, name: "สอบปลายภาค", type: "exam", maxScore: 20, weightPercent: 20, order: 8 }
                  );
                });
              });
              mappedComponents = defaultComps;
            }

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
              classroomId: gr.classroom_id || gr.classroomid || mappedClassrooms[0]?.id || "",
              rawScoreSum: Number(gr.raw_score_sum),
              bonusScoreSum: Number(gr.bonus_score_sum),
              totalScore: Number(gr.totalScore) || Number(gr.total_score) || 0,
              grade: gr.grade,
              gpaPoints: Number(gr.gpa_points),
              isLocked: Boolean(gr.is_locked),
              updatedAt: gr.updated_at,
              updatedBy: gr.updated_by
            }));

            const curState = get();
            const activeYear = (curState.activeAcademicYearId && mappedYears.some((y: any) => y.id === curState.activeAcademicYearId))
              ? curState.activeAcademicYearId
              : (mappedYears.find((y: any) => y.status === "active")?.id || mappedYears[0]?.id || "");

            const activeSem = (curState.activeSemesterId && mappedSemesters.some((s: any) => s.id === curState.activeSemesterId))
              ? curState.activeSemesterId
              : (mappedSemesters.find((s: any) => s.status === "active" && s.academicYearId === activeYear)?.id || mappedSemesters[0]?.id || "");

            const activeClass = (curState.activeClassroomId && mappedClassrooms.some((c: any) => c.id === curState.activeClassroomId))
              ? curState.activeClassroomId
              : (mappedClassrooms[0]?.id || "");

            const activeSub = (curState.activeSubjectId && mappedSubjects.some((s: any) => s.id === curState.activeSubjectId))
              ? curState.activeSubjectId
              : (mappedSubjects[0]?.id || "");

            set({
              activeSchoolId: mappedSchools[0]?.id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
              activeAcademicYearId: activeYear,
              activeSemesterId: activeSem,
              activeClassroomId: activeClass,
              activeSubjectId: activeSub,
              mainTitle: mappedSchools[0]?.nameTh || savedBranding.mainTitle || "GradeD Portal",
              subTitle: mappedSchools[0]?.nameEn || savedBranding.subTitle || "ระบบบันทึกผลการเรียนและเช็คชื่อนักเรียน",
              teacherName: savedBranding.teacherName || "คุณครูผู้สอน",
              teacherAvatar: savedBranding.teacherAvatar || null,
              schoolLogo: mappedSchools[0]?.logoUrl || savedBranding.schoolLogo || null,
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
              hasUnsavedChanges: false,
              undoStack: [],
              redoStack: []
            });

            get().calculateGrades();
            return;
          }
        } catch (e) {
          console.warn("Error loading from Supabase:", e);
        }
      }

      // Fallback
      set({ isDataLoaded: true, hasUnsavedChanges: false });
    },

    saveAccountData: async () => {
      const state = get();
      const email = state.currentAccountEmail;
      if (!email || !state.isDataLoaded) return;

      set({ syncStatus: "saving", syncError: null });

      try {
        localStorage.setItem("graded_branding", JSON.stringify({
          mainTitle: state.mainTitle,
          subTitle: state.subTitle,
          teacherName: state.teacherName,
          teacherAvatar: state.teacherAvatar,
          schoolLogo: state.schoolLogo
        }));
      } catch (e) {}

      try {
        const defaultSchoolId = state.activeSchoolId || state.schools[0]?.id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49";

        // 1. Schools
        if (state.schools && state.schools.length > 0) {
          const schoolRows = state.schools.map((s, idx) => ({
            id: s.id && s.id.length === 36 ? s.id : defaultSchoolId,
            name_th: idx === 0 ? (state.mainTitle || s.nameTh) : s.nameTh,
            name_en: idx === 0 ? (state.subTitle || s.nameEn) : s.nameEn,
            logo_url: idx === 0 ? (state.schoolLogo || s.logoUrl || null) : (s.logoUrl || null),
            status: s.status || "active"
          }));
          await supabase.from("schools").upsert(schoolRows, { onConflict: "id" });
        }

        // 2. Academic Years
        if (state.academicYears && state.academicYears.length > 0) {
          const yearRows = state.academicYears.map(y => ({
            id: y.id && y.id.length === 36 ? y.id : generateUUID(),
            school_id: y.schoolId && y.schoolId.length === 36 ? y.schoolId : defaultSchoolId,
            year: Number(y.year),
            status: y.status || "active"
          }));
          await supabase.from("academic_years").upsert(yearRows, { onConflict: "id" });
        }

        // 3. Semesters
        if (state.semesters && state.semesters.length > 0) {
          const semRows = state.semesters.map(s => ({
            id: s.id && s.id.length === 36 ? s.id : generateUUID(),
            academic_year_id: s.academicYearId,
            semester_no: Number(s.semesterNo),
            status: s.status || "active"
          }));
          await supabase.from("semesters").upsert(semRows, { onConflict: "id" });
        }

        // 4. Classrooms
        if (state.classrooms && state.classrooms.length > 0) {
          const classRows = state.classrooms.map(c => ({
            id: c.id && c.id.length === 36 ? c.id : generateUUID(),
            school_id: c.schoolId && c.schoolId.length === 36 ? c.schoolId : defaultSchoolId,
            academic_year_id: c.academicYearId,
            name: c.name,
            teacher_id: null,
            student_count: Number(c.studentCount) || 0
          }));
          await supabase.from("classrooms").upsert(classRows, { onConflict: "id" });
        }

        // 5. Subjects
        if (state.subjects && state.subjects.length > 0) {
          const subRows = state.subjects.map(s => ({
            id: s.id && s.id.length === 36 ? s.id : generateUUID(),
            school_id: s.schoolId && s.schoolId.length === 36 ? s.schoolId : defaultSchoolId,
            code: s.code,
            name: s.name,
            credit_points: Number(s.creditPoints) || 1.0,
            hours_per_week: Number(s.hoursPerWeek) || 2
          }));
          await supabase.from("subjects").upsert(subRows, { onConflict: "id" });
        }

        // 6. Grade Rules
        if (state.gradeRules) {
          const ruleRow = {
            id: state.gradeRules.id && state.gradeRules.id.length === 36 ? state.gradeRules.id : "2b1285b8-2f73-2e44-fc6e-dbf6a08ace71",
            school_id: defaultSchoolId,
            subject_id: null,
            ranges: state.gradeRules.ranges || []
          };
          await supabase.from("grade_rules").upsert(ruleRow, { onConflict: "id" });
        }

        // 7. Students
        if (state.students && state.students.length > 0) {
          const studentRows = state.students.map(std => ({
            id: std.id && std.id.length === 36 ? std.id : generateUUID(),
            school_id: std.schoolId && std.schoolId.length === 36 ? std.schoolId : defaultSchoolId,
            classroom_id: std.classroomId,
            prefix: std.prefix || "ด.ช.",
            first_name: std.firstName,
            last_name: std.lastName,
            gender: std.gender || "M",
            roll_no: Number(std.rollNo) || 1,
            status: std.status || "active"
          }));
          await supabase.from("students").upsert(studentRows, { onConflict: "id" });
        }

        // 8. Enrollments
        if (state.enrollments && state.enrollments.length > 0) {
          const enrollRows = state.enrollments
            .filter(e => e.studentId && e.subjectId && e.studentId.length === 36 && e.subjectId.length === 36)
            .map(e => ({
              id: e.id && e.id.length === 36 ? e.id : generateUUID(),
              student_id: e.studentId,
              subject_id: e.subjectId,
              semester_id: e.semesterId,
              classroom_id: e.classroomId,
              status: e.status || "active"
            }));
          if (enrollRows.length > 0) {
            await supabase.from("enrollments").upsert(enrollRows, { onConflict: "id" });
          }
        }

        // 9. Score Components
        if (state.scoreComponents && state.scoreComponents.length > 0) {
          const compRows = state.scoreComponents
            .filter(c => c.subjectId && c.semesterId && c.classroomId && c.subjectId.length === 36 && c.semesterId.length === 36 && c.classroomId.length === 36)
            .map(c => ({
              id: c.id && c.id.length === 36 ? c.id : generateUUID(),
              subject_id: c.subjectId,
              semester_id: c.semesterId,
              classroom_id: c.classroomId,
              name: c.name,
              type: c.type || "assignment",
              max_score: Number(c.maxScore) || 10,
              weight_percent: Number(c.weightPercent) || 10,
              order_no: Number(c.order) || 1
            }));
          if (compRows.length > 0) {
            await supabase.from("score_components").upsert(compRows, { onConflict: "id" });
          }
        }

        // 10. Attendance Sessions
        if (state.attendanceSessions && state.attendanceSessions.length > 0) {
          const sesRows = state.attendanceSessions
            .filter(ses => ses.classroomId && ses.subjectId && ses.semesterId && ses.classroomId.length === 36 && ses.subjectId.length === 36 && ses.semesterId.length === 36)
            .map(ses => ({
              id: ses.id && ses.id.length === 36 ? ses.id : generateUUID(),
              school_id: defaultSchoolId,
              classroom_id: ses.classroomId,
              subject_id: ses.subjectId,
              semester_id: ses.semesterId,
              date: ses.date,
              session_no: Number(ses.sessionNo) || 1
            }));
          if (sesRows.length > 0) {
            await supabase.from("attendance_sessions").upsert(sesRows, { onConflict: "id" });
          }
        }

        // 11. Attendance Records
        if (state.attendanceRecords && state.attendanceRecords.length > 0) {
          const recordsToSave = state.attendanceRecords
            .filter(r => r.sessionId && r.studentId && r.sessionId.length === 36 && r.studentId.length === 36)
            .map(r => ({
              id: r.id && r.id.length === 36 ? r.id : generateUUID(),
              session_id: r.sessionId,
              student_id: r.studentId,
              status: r.status || "มา",
              remarks: r.remarks || null,
              updated_at: r.updatedAt || new Date().toISOString()
            }));
          if (recordsToSave.length > 0) {
            await supabase.from("attendance_records").upsert(recordsToSave, { onConflict: "session_id,student_id" });
          }
        }

        // 12. Scores
        if (state.scores && state.scores.length > 0) {
          const scoresToSave = state.scores
            .filter(sc => sc.studentId && sc.scoreComponentId && sc.studentId.length === 36 && sc.scoreComponentId.length === 36)
            .map(sc => ({
              id: sc.id && sc.id.length === 36 ? sc.id : generateUUID(),
              student_id: sc.studentId,
              score_component_id: sc.scoreComponentId,
              score: Number(sc.score) || 0,
              is_graded: Boolean(sc.isGraded),
              remarks: sc.remarks || null,
              updated_at: sc.updatedAt || new Date().toISOString()
            }));
          if (scoresToSave.length > 0) {
            await supabase.from("scores").upsert(scoresToSave, { onConflict: "student_id,score_component_id" });
          }
        }

        // 13. Bonus Scores
        if (state.bonusScores && state.bonusScores.length > 0) {
          const bonusRows = state.bonusScores
            .filter(b => b.studentId && b.subjectId && b.semesterId && b.studentId.length === 36 && b.subjectId.length === 36 && b.semesterId.length === 36)
            .map(b => ({
              id: b.id && b.id.length === 36 ? b.id : generateUUID(),
              student_id: b.studentId,
              subject_id: b.subjectId,
              semester_id: b.semesterId,
              points: Number(b.points) || 1,
              reason: b.reason || "",
              created_at: b.timestamp || new Date().toISOString()
            }));
          if (bonusRows.length > 0) {
            await supabase.from("bonus_scores").upsert(bonusRows, { onConflict: "id" });
          }
        }

        // 14. Grade Results
        if (state.gradeResults && state.gradeResults.length > 0) {
          const resultsToSave = state.gradeResults
            .filter(gr => gr.studentId && gr.subjectId && gr.semesterId && gr.classroomId && gr.studentId.length === 36 && gr.subjectId.length === 36 && gr.semesterId.length === 36 && gr.classroomId.length === 36)
            .map(gr => ({
              id: gr.id && gr.id.length === 36 ? gr.id : generateUUID(),
              student_id: gr.studentId,
              subject_id: gr.subjectId,
              semester_id: gr.semesterId,
              classroomid: gr.classroomId,
              raw_score_sum: Number(gr.rawScoreSum) || 0,
              bonus_score_sum: Number(gr.bonusScoreSum) || 0,
              total_score: Number(gr.totalScore) || 0,
              grade: String(gr.grade || "0"),
              gpa_points: Number(gr.gpaPoints) || 0,
              is_locked: Boolean(gr.isLocked),
              updated_at: gr.updatedAt || new Date().toISOString()
            }));
          if (resultsToSave.length > 0) {
            await supabase.from("grade_results").upsert(resultsToSave, { onConflict: "student_id,subject_id,semester_id" });
          }
        }

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        set({
          syncStatus: "saved",
          syncError: null,
          lastSavedTime: timeStr,
          hasUnsavedChanges: false
        });

        setTimeout(() => {
          if (get().syncStatus === "saved") {
            set({ syncStatus: "idle" });
          }
        }, 3000);
      } catch (err: any) {
        console.error("Cloud Save Error:", err);
        set({
          syncStatus: "error",
          syncError: err.message || "ไม่สามารถบันทึกลง Supabase ได้"
        });
      }
    },

    setActiveSchoolId: (id) => set({ activeSchoolId: id }),
    setActiveAcademicYearId: (id) => set({ activeAcademicYearId: id }),
    setActiveSemesterId: (id) => set({ activeSemesterId: id }),
    setActiveClassroomId: (id) => set({ activeClassroomId: id }),
    setActiveSubjectId: (id) => set({ activeSubjectId: id }),

    addStudent: (std) => {
      const state = get();
      const schoolId = state.activeSchoolId || state.schools[0]?.id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49";
      const newId = generateUUID();
      const newStudent: Student = {
        id: newId,
        schoolId,
        classroomId: state.activeClassroomId,
        ...std,
        rollNo: std.rollNo || (state.students.filter(s => s.classroomId === state.activeClassroomId).length + 1),
      };
      
      const newEnrollment: Enrollment = {
        id: generateUUID(),
        studentId: newId,
        subjectId: state.activeSubjectId,
        semesterId: state.activeSemesterId,
        classroomId: state.activeClassroomId,
        status: "active"
      };

      const newScores = [...state.scores];
      const activeComps = state.scoreComponents.filter(
        c => c.subjectId === state.activeSubjectId && c.classroomId === state.activeClassroomId
      );
      activeComps.forEach(comp => {
        newScores.push({
          id: generateUUID(),
          studentId: newId,
          scoreComponentId: comp.id,
          score: 0,
          isGraded: false,
          updatedAt: new Date().toISOString(),
          updatedBy: "mock-teacher-id-1"
        });
      });

      const newGradeResult: GradeResult = {
        id: generateUUID(),
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

      const updatedClassrooms = state.classrooms.map(c => 
        c.id === state.activeClassroomId ? { ...c, studentCount: c.studentCount + 1 } : c
      );

      set({
        students: [...state.students, newStudent],
        enrollments: [...state.enrollments, newEnrollment],
        scores: newScores,
        gradeResults: [...state.gradeResults, newGradeResult],
        classrooms: updatedClassrooms,
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "CREATE",
            resourceType: "student",
            resourceId: newId,
            description: `เพิ่มนักเรียนใหม่ ${std.prefix}${std.firstName} ${std.lastName} เลขที่ ${newStudent.rollNo}`,
            timestamp: new Date().toISOString()
          }
        ]
      });
    },

    updateStudent: (student) => {
      set((state) => ({
        students: state.students.map(s => s.id === student.id ? student : s),
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "UPDATE",
            resourceType: "student",
            resourceId: student.id,
            description: `แก้ไขข้อมูลนักเรียน ${student.prefix}${student.firstName} ${student.lastName}`,
            timestamp: new Date().toISOString()
          }
        ]
      }));
    },

    deleteStudent: (id) => {
      const state = get();
      const target = state.students.find(s => s.id === id);
      const updatedStudents = state.students.filter(s => s.id !== id);
      const classroomId = target?.classroomId;
      
      if (classroomId) {
        let roll = 1;
        updatedStudents.forEach(s => {
          if (s.classroomId === classroomId) {
            s.rollNo = roll++;
          }
        });
      }

      const updatedClassrooms = state.classrooms.map(c => 
        c.id === classroomId ? { ...c, studentCount: Math.max(0, c.studentCount - 1) } : c
      );

      try {
        supabase.from("students").delete().eq("id", id).then();
        supabase.from("scores").delete().eq("student_id", id).then();
        supabase.from("attendance_records").delete().eq("student_id", id).then();
        supabase.from("bonus_scores").delete().eq("student_id", id).then();
        supabase.from("grade_results").delete().eq("student_id", id).then();
      } catch (e) {}

      set({
        students: updatedStudents,
        classrooms: updatedClassrooms,
        scores: state.scores.filter(s => s.studentId !== id),
        attendanceRecords: state.attendanceRecords.filter(r => r.studentId !== id),
        bonusScores: state.bonusScores.filter(b => b.studentId !== id),
        gradeResults: state.gradeResults.filter(g => g.studentId !== id),
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "DELETE",
            resourceType: "student",
            resourceId: id,
            description: `ลบนักเรียน ${target?.prefix || ""}${target?.firstName || ""} ${target?.lastName || ""}`,
            timestamp: new Date().toISOString()
          }
        ]
      });
    },

    bulkAddStudents: (newStds) => {
      const state = get();
      const schoolId = state.activeSchoolId || state.schools[0]?.id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49";
      const startingRollNo = state.students.filter(s => s.classroomId === state.activeClassroomId).length + 1;
      const addedStudents: Student[] = [];
      const addedEnrollments: Enrollment[] = [];
      const addedGradeResults: GradeResult[] = [];
      const activeComps = state.scoreComponents.filter(
        c => c.subjectId === state.activeSubjectId && c.classroomId === state.activeClassroomId
      );
      const newScores = [...state.scores];

      newStds.forEach((std, idx) => {
        const stdId = generateUUID();
        const student: Student = {
          id: stdId,
          schoolId,
          classroomId: state.activeClassroomId,
          ...std,
          rollNo: std.rollNo || (startingRollNo + idx),
        };
        addedStudents.push(student);

        addedEnrollments.push({
          id: generateUUID(),
          studentId: stdId,
          subjectId: state.activeSubjectId,
          semesterId: state.activeSemesterId,
          classroomId: state.activeClassroomId,
          status: "active"
        });

        activeComps.forEach(comp => {
          newScores.push({
            id: generateUUID(),
            studentId: stdId,
            scoreComponentId: comp.id,
            score: 0,
            isGraded: false,
            updatedAt: new Date().toISOString(),
            updatedBy: "mock-teacher-id-1"
          });
        });

        addedGradeResults.push({
          id: generateUUID(),
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
      });

      const updatedClassrooms = state.classrooms.map(c => 
        c.id === state.activeClassroomId 
          ? { ...c, studentCount: c.studentCount + newStds.length } 
          : c
      );

      set({
        students: [...state.students, ...addedStudents],
        enrollments: [...state.enrollments, ...addedEnrollments],
        scores: newScores,
        gradeResults: [...state.gradeResults, ...addedGradeResults],
        classrooms: updatedClassrooms,
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "CREATE",
            resourceType: "student",
            resourceId: state.activeClassroomId,
            description: `นำเข้ารายชื่อนักเรียนแบบกลุ่ม จำนวน ${newStds.length} คน`,
            timestamp: new Date().toISOString()
          }
        ]
      });
    },

    bulkMoveStudents: (studentIds, targetClassroomId) => {
      const state = get();
      const updatedStudents = state.students.map(s => 
        studentIds.includes(s.id) ? { ...s, classroomId: targetClassroomId } : s
      );

      set({
        students: updatedStudents,
        hasUnsavedChanges: true,
        classrooms: state.classrooms.map(c => {
          const count = updatedStudents.filter(s => s.classroomId === c.id).length;
          return { ...c, studentCount: count };
        })
      });
    },

    promoteStudents: (studentIds, targetClassroomId) => {
      get().bulkMoveStudents(studentIds, targetClassroomId);
    },

    createAttendanceSession: (date, sessionNo) => {
      const state = get();
      const exist = state.attendanceSessions.find(
        s => s.classroomId === state.activeClassroomId && 
             s.subjectId === state.activeSubjectId && 
             s.date === date && 
             s.sessionNo === sessionNo
      );
      if (exist) return exist.id;

      const schoolId = state.activeSchoolId || state.schools[0]?.id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49";
      const newId = generateUUID();
      const newSession: AttendanceSession = {
        id: newId,
        schoolId,
        classroomId: state.activeClassroomId,
        subjectId: state.activeSubjectId,
        semesterId: state.activeSemesterId,
        date,
        sessionNo
      };

      const newRecords: AttendanceRecord[] = state.students
        .filter(s => s.classroomId === state.activeClassroomId)
        .map(std => ({
          id: generateUUID(),
          sessionId: newId,
          studentId: std.id,
          status: "มา",
          updatedAt: new Date().toISOString(),
          updatedBy: "mock-teacher-id-1"
        }));

      set({
        attendanceSessions: [...state.attendanceSessions, newSession],
        attendanceRecords: [...state.attendanceRecords, ...newRecords],
        hasUnsavedChanges: true
      });

      return newId;
    },

    updateAttendanceRecord: (sessionId, studentId, status, remarks) => {
      const state = get();
      const exists = state.attendanceRecords.some(r => r.sessionId === sessionId && r.studentId === studentId);
      
      let newRecords = [];
      if (exists) {
        newRecords = state.attendanceRecords.map(r => 
          (r.sessionId === sessionId && r.studentId === studentId) ? { ...r, status, remarks, updatedAt: new Date().toISOString() } : r
        );
      } else {
        newRecords = [...state.attendanceRecords, {
          id: generateUUID(),
          sessionId,
          studentId,
          status,
          remarks,
          updatedAt: new Date().toISOString(),
          updatedBy: "mock-teacher-id-1"
        }];
      }

      set({ attendanceRecords: newRecords, hasUnsavedChanges: true });
    },

    bulkCheckAttendance: (sessionId, status) => {
      const state = get();
      const newRecords = state.attendanceRecords.map(r => {
        if (r.sessionId === sessionId) {
          return { ...r, status, updatedAt: new Date().toISOString() };
        }
        return r;
      });
      set({ attendanceRecords: newRecords, hasUnsavedChanges: true });
    },

    updateAttendanceSession: (id, date, sessionNo) => {
      set((state) => ({
        attendanceSessions: state.attendanceSessions.map(s => s.id === id ? { ...s, date, sessionNo } : s),
        hasUnsavedChanges: true
      }));
    },

    deleteAttendanceSession: (id) => {
      try {
        supabase.from("attendance_sessions").delete().eq("id", id).then();
        supabase.from("attendance_records").delete().eq("session_id", id).then();
      } catch (e) {}
      set((state) => ({
        attendanceSessions: state.attendanceSessions.filter(s => s.id !== id),
        attendanceRecords: state.attendanceRecords.filter(r => r.sessionId !== id),
        hasUnsavedChanges: true
      }));
    },

    addScoreComponent: (comp) => {
      const state = get();
      const newId = generateUUID();
      const newComp: ScoreComponent = {
        id: newId,
        subjectId: state.activeSubjectId,
        semesterId: state.activeSemesterId,
        classroomId: state.activeClassroomId,
        order: state.scoreComponents.filter(c => c.classroomId === state.activeClassroomId && c.subjectId === state.activeSubjectId).length + 1,
        ...comp
      };

      const activeStudents = state.students.filter(s => s.classroomId === state.activeClassroomId);
      const newScores = [...state.scores];
      activeStudents.forEach(std => {
        newScores.push({
          id: generateUUID(),
          studentId: std.id,
          scoreComponentId: newId,
          score: 0,
          isGraded: false,
          updatedAt: new Date().toISOString(),
          updatedBy: "mock-teacher-id-1"
        });
      });

      set({
        scoreComponents: [...state.scoreComponents, newComp],
        scores: newScores,
        hasUnsavedChanges: true
      });
    },

    updateScoreComponent: (comp) => {
      set((state) => ({
        scoreComponents: state.scoreComponents.map(c => c.id === comp.id ? comp : c),
        hasUnsavedChanges: true
      }));
    },

    deleteScoreComponent: (id) => {
      try {
        supabase.from("score_components").delete().eq("id", id).then();
        supabase.from("scores").delete().eq("score_component_id", id).then();
      } catch (e) {}
      set((state) => ({
        scoreComponents: state.scoreComponents.filter(c => c.id !== id),
        scores: state.scores.filter(s => s.scoreComponentId !== id),
        hasUnsavedChanges: true
      }));
    },

    updateScore: (studentId, scoreComponentId, scoreVal, remarks) => {
      const state = get();
      const maxScore = state.scoreComponents.find(c => c.id === scoreComponentId)?.maxScore || 100;
      
      if (scoreVal > maxScore) {
        console.warn(`Score ${scoreVal} exceeds max score ${maxScore}`);
        return;
      }

      state.pushScoreHistory();

      const exists = state.scores.some(s => s.studentId === studentId && s.scoreComponentId === scoreComponentId);
      let newScores = [];

      if (exists) {
        newScores = state.scores.map(s => 
          (s.studentId === studentId && s.scoreComponentId === scoreComponentId)
            ? { ...s, score: scoreVal, isGraded: true, remarks, updatedAt: new Date().toISOString() } 
            : s
        );
      } else {
        newScores = [...state.scores, {
          id: generateUUID(),
          studentId,
          scoreComponentId,
          score: scoreVal,
          isGraded: true,
          remarks,
          updatedAt: new Date().toISOString(),
          updatedBy: "mock-teacher-id-1"
        }];
      }

      set({ scores: newScores, hasUnsavedChanges: true });
      get().calculateGrades();
    },

    bulkUpdateScores: (updates) => {
      const state = get();
      state.pushScoreHistory();

      const newScores = [...state.scores];

      updates.forEach(({ studentId, scoreComponentId, scoreVal }) => {
        const idx = newScores.findIndex(s => s.studentId === studentId && s.scoreComponentId === scoreComponentId);

        if (idx > -1) {
          newScores[idx] = {
            ...newScores[idx],
            score: scoreVal,
            isGraded: true,
            updatedAt: new Date().toISOString()
          };
        } else {
          newScores.push({
            id: generateUUID(),
            studentId,
            scoreComponentId,
            score: scoreVal,
            isGraded: true,
            updatedAt: new Date().toISOString(),
            updatedBy: "mock-teacher-id-1"
          });
        }
      });

      set({ scores: newScores, hasUnsavedChanges: true });
      get().calculateGrades();
    },

    pushScoreHistory: () => {
      const currentScores = JSON.stringify(get().scores);
      set((state) => ({
        undoStack: [...state.undoStack, currentScores].slice(-30),
        redoStack: []
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
        redoStack: [...state.redoStack, current],
        hasUnsavedChanges: true
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
        undoStack: [...state.undoStack, current],
        hasUnsavedChanges: true
      });
      state.calculateGrades();
    },

    addBonusScore: (studentId, points, reason) => {
      const state = get();
      const newBonus: BonusScore = {
        id: generateUUID(),
        studentId,
        subjectId: state.activeSubjectId,
        semesterId: state.activeSemesterId,
        points,
        reason,
        timestamp: new Date().toISOString(),
        createdBy: "mock-teacher-id-1"
      };

      set({
        bonusScores: [...state.bonusScores, newBonus],
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "CREATE",
            resourceType: "bonus",
            resourceId: studentId,
            description: `บันทึกคะแนนพิเศษ ${points > 0 ? "+" : ""}${points} คะแนน เหตุผล: ${reason}`,
            timestamp: new Date().toISOString()
          }
        ]
      });

      get().calculateGrades();
    },

    updateBonusScore: (id, points, reason) => {
      set((state) => ({
        bonusScores: state.bonusScores.map(b => 
          b.id === id ? { ...b, points, reason } : b
        ),
        hasUnsavedChanges: true
      }));
      get().calculateGrades();
    },

    deleteBonusScore: (id) => {
      try {
        supabase.from("bonus_scores").delete().eq("id", id).then();
      } catch (e) {}
      set((state) => ({
        bonusScores: state.bonusScores.filter(b => b.id !== id),
        hasUnsavedChanges: true
      }));
      get().calculateGrades();
    },

    calculateGrades: () => {
      const state = get();
      const calculateFinalGrade = (scoreSum: number, ranges: GradeRange[]) => {
        const found = ranges.find(r => scoreSum >= r.min && scoreSum <= r.max);
        return found ? { grade: found.grade, gpa: found.gpaPoints } : { grade: "0", gpa: 0 };
      };

      const activeComps = state.scoreComponents.filter(
        c => c.subjectId === state.activeSubjectId && 
             c.semesterId === state.activeSemesterId && 
             c.classroomId === state.activeClassroomId
      );

      const classroomStudents = state.students.filter(s => s.classroomId === state.activeClassroomId);
      const updatedGradeResults = [...state.gradeResults];

      classroomStudents.forEach(std => {
        let rawScore = 0;
        activeComps.forEach(comp => {
          const studentScore = state.scores.find(
            s => s.studentId === std.id && s.scoreComponentId === comp.id
          );
          if (studentScore && studentScore.isGraded) {
            rawScore += (studentScore.score / comp.maxScore) * comp.weightPercent;
          }
        });

        const studentBonus = state.bonusScores
          .filter(b => b.studentId === std.id && (!b.subjectId || b.subjectId === state.activeSubjectId) && (!b.semesterId || b.semesterId === state.activeSemesterId))
          .reduce((sum, b) => sum + (Number(b.points) || 0), 0);

        const totalScore = Math.min(100, Math.max(0, rawScore + studentBonus));
        
        const existingRes = state.gradeResults.find(
          r => r.studentId === std.id && r.subjectId === state.activeSubjectId && r.semesterId === state.activeSemesterId
        );

        if (existingRes && existingRes.isLocked) {
          return;
        }

        const { grade, gpa } = calculateFinalGrade(totalScore, state.gradeRules.ranges);

        const dataResult: GradeResult = {
          id: existingRes?.id || generateUUID(),
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

        const resultIdx = updatedGradeResults.findIndex(
          r => r.studentId === std.id && r.subjectId === state.activeSubjectId && r.semesterId === state.activeSemesterId
        );

        if (resultIdx > -1) {
          updatedGradeResults[resultIdx] = dataResult;
        } else {
          updatedGradeResults.push(dataResult);
        }
      });

      set({ gradeResults: updatedGradeResults });
    },

    updateGradeOverride: (studentId, grade, gpaPoints) => {
      set((state) => ({
        gradeResults: state.gradeResults.map(r => 
          (r.studentId === studentId && r.subjectId === state.activeSubjectId && r.semesterId === state.activeSemesterId)
            ? { ...r, grade, gpaPoints, updatedAt: new Date().toISOString() } 
            : r
        ),
        hasUnsavedChanges: true
      }));
    },

    toggleGradeLock: (studentId) => {
      set((state) => ({
        gradeResults: state.gradeResults.map(r => 
          (r.studentId === studentId && r.subjectId === state.activeSubjectId && r.semesterId === state.activeSemesterId)
            ? { ...r, isLocked: !r.isLocked, updatedAt: new Date().toISOString() } 
            : r
        ),
        hasUnsavedChanges: true
      }));
    },

    addAuditLog: (action, resourceType, resourceId, description) => set((state) => ({
      auditLogs: [
        ...state.auditLogs,
        {
          id: generateUUID(),
          userId: "mock-teacher-id-1",
          action,
          resourceType,
          resourceId,
          description,
          timestamp: new Date().toISOString()
        }
      ],
      hasUnsavedChanges: true
    })),

    updateGradeRules: (ranges) => {
      set((state) => ({
        gradeRules: { ...state.gradeRules, ranges },
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "UPDATE",
            resourceType: "settings",
            resourceId: "gradeRules",
            description: "แก้ไขเกณฑ์การตัดเกรดของระบบ",
            timestamp: new Date().toISOString()
          }
        ]
      }));
      get().calculateGrades();
    },

    addClassroom: (name, teacherId) => {
      const state = get();
      const schoolId = state.activeSchoolId || state.schools[0]?.id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49";
      const newId = generateUUID();
      const newClassroom: Classroom = {
        id: newId,
        schoolId,
        academicYearId: state.activeAcademicYearId || state.academicYears[0]?.id,
        name,
        teacherId: teacherId || "mock-teacher-id-1",
        studentCount: 0
      };
      set({
        classrooms: [...state.classrooms, newClassroom],
        activeClassroomId: newId,
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "CREATE",
            resourceType: "classroom",
            resourceId: newId,
            description: `สร้างห้องเรียนใหม่ ห้อง ${name}`,
            timestamp: new Date().toISOString()
          }
        ]
      });
    },

    updateClassroom: (classroom) => {
      set((state) => ({
        classrooms: state.classrooms.map(c => c.id === classroom.id ? classroom : c),
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "UPDATE",
            resourceType: "classroom",
            resourceId: classroom.id,
            description: `แก้ไขข้อมูลห้องเรียน ${classroom.name}`,
            timestamp: new Date().toISOString()
          }
        ]
      }));
    },

    deleteClassroom: (id) => {
      const state = get();
      const target = state.classrooms.find(c => c.id === id);
      const remainingClassrooms = state.classrooms.filter(c => c.id !== id);
      const newActiveId = state.activeClassroomId === id ? (remainingClassrooms[0]?.id || "") : state.activeClassroomId;
      try {
        supabase.from("classrooms").delete().eq("id", id).then();
      } catch (e) {}
      set({
        classrooms: remainingClassrooms,
        students: state.students.filter(s => s.classroomId !== id),
        activeClassroomId: newActiveId,
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "DELETE",
            resourceType: "classroom",
            resourceId: id,
            description: `ลบห้องเรียน ${target?.name || ""}`,
            timestamp: new Date().toISOString()
          }
        ]
      });
    },

    addAcademicYear: (year) => {
      const state = get();
      const schoolId = state.activeSchoolId || state.schools[0]?.id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49";
      const id = generateUUID();
      const sem1Id = generateUUID();
      const sem2Id = generateUUID();
      const newYear: AcademicYear = { id, schoolId, year: Number(year), status: "active" };
      const sem1: Semester = { id: sem1Id, academicYearId: id, semesterNo: 1, status: "active" };
      const sem2: Semester = { id: sem2Id, academicYearId: id, semesterNo: 2, status: "closed" };

      set({
        academicYears: [...state.academicYears, newYear],
        semesters: [...state.semesters, sem1, sem2],
        activeAcademicYearId: id,
        activeSemesterId: sem1.id,
        hasUnsavedChanges: true
      });
    },

    updateAcademicYear: (id, year) => {
      set((state) => ({
        academicYears: state.academicYears.map(ay => ay.id === id ? { ...ay, year: Number(year) } : ay),
        hasUnsavedChanges: true
      }));
    },

    deleteAcademicYear: (id) => {
      const state = get();
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

      try {
        supabase.from("academic_years").delete().eq("id", id).then();
        supabase.from("semesters").delete().eq("academic_year_id", id).then();
      } catch (e) {}

      set({
        academicYears: remainingYears,
        semesters: state.semesters.filter(s => s.academicYearId !== id),
        classrooms: remainingClassrooms,
        activeAcademicYearId: newActiveYearId,
        activeSemesterId: newActiveSemesterId,
        activeClassroomId: newActiveClassroomId,
        hasUnsavedChanges: true
      });
    },

    addSubject: (code, name, creditPoints, hoursPerWeek, classroomId) => {
      const state = get();
      const schoolId = state.activeSchoolId || state.schools[0]?.id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49";
      const targetClassroomId = classroomId || state.activeClassroomId || state.classrooms[0]?.id;
      const targetSemesterId = state.activeSemesterId || state.semesters[0]?.id;
      const newId = generateUUID();
      const newSubject: Subject = {
        id: newId,
        schoolId,
        code,
        name,
        creditPoints: Number(creditPoints),
        hoursPerWeek: Number(hoursPerWeek),
        classroomId: targetClassroomId
      };

      const newEnrollments = [...state.enrollments];
      const newScores = [...state.scores];
      const newScoreComponents = [...state.scoreComponents];
      const newGradeResults = [...state.gradeResults];

      if (targetClassroomId) {
        const studentsInClass = state.students.filter(s => s.classroomId === targetClassroomId);

        // Enroll students in this subject
        studentsInClass.forEach(std => {
          newEnrollments.push({
            id: generateUUID(),
            studentId: std.id,
            subjectId: newId,
            semesterId: targetSemesterId,
            classroomId: targetClassroomId,
            status: "active"
          });

          newGradeResults.push({
            id: generateUUID(),
            studentId: std.id,
            subjectId: newId,
            semesterId: targetSemesterId,
            classroomId: targetClassroomId,
            rawScoreSum: 0,
            bonusScoreSum: 0,
            totalScore: 0,
            grade: "0",
            gpaPoints: 0,
            isLocked: false,
            updatedAt: new Date().toISOString(),
            updatedBy: "mock-teacher-id-1"
          });
        });

        // Initialize standard score components for this subject & classroom
        const defaultComps = [
          { name: "งาน 1", type: "assignment" as const, maxScore: 10, weightPercent: 10, order: 1 },
          { name: "งาน 2", type: "assignment" as const, maxScore: 10, weightPercent: 10, order: 2 },
          { name: "งาน 3", type: "assignment" as const, maxScore: 10, weightPercent: 10, order: 3 },
          { name: "สอบกลางภาค", type: "exam" as const, maxScore: 20, weightPercent: 20, order: 4 },
          { name: "งาน 4", type: "assignment" as const, maxScore: 10, weightPercent: 10, order: 5 },
          { name: "งาน 5", type: "assignment" as const, maxScore: 10, weightPercent: 10, order: 6 },
          { name: "งาน 6", type: "assignment" as const, maxScore: 10, weightPercent: 10, order: 7 },
          { name: "สอบปลายภาค", type: "exam" as const, maxScore: 20, weightPercent: 20, order: 8 },
        ];

        defaultComps.forEach(comp => {
          const compId = generateUUID();
          newScoreComponents.push({
            id: compId,
            subjectId: newId,
            semesterId: targetSemesterId,
            classroomId: targetClassroomId,
            name: comp.name,
            type: comp.type,
            maxScore: comp.maxScore,
            weightPercent: comp.weightPercent,
            order: comp.order
          });

          studentsInClass.forEach(std => {
            newScores.push({
              id: generateUUID(),
              studentId: std.id,
              scoreComponentId: compId,
              score: 0,
              isGraded: false,
              updatedAt: new Date().toISOString(),
              updatedBy: "mock-teacher-id-1"
            });
          });
        });
      }

      set({
        subjects: [...state.subjects, newSubject],
        activeSubjectId: newId,
        activeClassroomId: targetClassroomId || state.activeClassroomId,
        enrollments: newEnrollments,
        scoreComponents: newScoreComponents,
        scores: newScores,
        gradeResults: newGradeResults,
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "CREATE",
            resourceType: "subject",
            resourceId: newId,
            description: `สร้างรายวิชาใหม่ ${code} ${name}${targetClassroomId ? ` (สำหรับห้อง ${state.classrooms.find(c => c.id === targetClassroomId)?.name || ""})` : ""}`,
            timestamp: new Date().toISOString()
          }
        ]
      });
    },

    updateSubject: (subject) => {
      set((state) => ({
        subjects: state.subjects.map(s => s.id === subject.id ? subject : s),
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "UPDATE",
            resourceType: "subject",
            resourceId: subject.id,
            description: `แก้ไขข้อมูลรายวิชา ${subject.code} ${subject.name}`,
            timestamp: new Date().toISOString()
          }
        ]
      }));
    },

    deleteSubject: (id) => {
      const state = get();
      const target = state.subjects.find(s => s.id === id);
      try {
        supabase.from("subjects").delete().eq("id", id).then();
      } catch (e) {}
      set({
        subjects: state.subjects.filter(s => s.id !== id),
        hasUnsavedChanges: true,
        auditLogs: [
          ...state.auditLogs,
          {
            id: generateUUID(),
            userId: "mock-teacher-id-1",
            action: "DELETE",
            resourceType: "subject",
            resourceId: id,
            description: `ลบรายวิชา ${target?.code || ""} ${target?.name || ""}`,
            timestamp: new Date().toISOString()
          }
        ]
      });
    },

    updateSystemSettings: (settings) => {
      set((state) => ({
        ...state,
        mainTitle: settings.mainTitle !== undefined ? settings.mainTitle : state.mainTitle,
        subTitle: settings.subTitle !== undefined ? settings.subTitle : state.subTitle,
        teacherName: settings.teacherName !== undefined ? settings.teacherName : state.teacherName,
        teacherAvatar: settings.teacherAvatar !== undefined ? settings.teacherAvatar : state.teacherAvatar,
        schoolLogo: settings.schoolLogo !== undefined ? settings.schoolLogo : state.schoolLogo,
        hasUnsavedChanges: true
      }));
    }
  };
});
