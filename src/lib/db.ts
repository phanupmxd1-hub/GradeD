import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// 1. Ensure data directory exists before opening database
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "graded.db");

// 2. Global Singleton Pattern to prevent connection leaks during Next.js Hot Reloading
const globalForDb = globalThis as unknown as { db: Database.Database | undefined };

export function getDb(): Database.Database {
  if (!globalForDb.db) {
    const db = new Database(DB_PATH);
    
    // 3. SQLite Concurrency & Reliability Pragmas
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");
    
    initSchema(db);
    globalForDb.db = db;
  }
  return globalForDb.db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      nameTh TEXT NOT NULL,
      nameEn TEXT NOT NULL,
      logoUrl TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      schoolId TEXT NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(schoolId, year)
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      academicYearId TEXT NOT NULL,
      semesterNo INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(academicYearId, semesterNo)
    );

    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      schoolId TEXT NOT NULL,
      academicYearId TEXT NOT NULL,
      name TEXT NOT NULL,
      teacherId TEXT,
      studentCount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      schoolId TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      creditPoints REAL NOT NULL DEFAULT 1.0,
      hoursPerWeek INTEGER NOT NULL DEFAULT 2,
      UNIQUE(schoolId, code)
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      schoolId TEXT NOT NULL,
      classroomId TEXT NOT NULL,
      prefix TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      gender TEXT NOT NULL,
      rollNo INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      semesterId TEXT NOT NULL,
      classroomId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(studentId, subjectId, semesterId)
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      schoolId TEXT NOT NULL,
      classroomId TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      semesterId TEXT NOT NULL,
      date TEXT NOT NULL,
      sessionNo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      studentId TEXT NOT NULL,
      status TEXT NOT NULL,
      remarks TEXT,
      updatedAt TEXT NOT NULL,
      updatedBy TEXT,
      UNIQUE(sessionId, studentId)
    );

    CREATE TABLE IF NOT EXISTS score_components (
      id TEXT PRIMARY KEY,
      subjectId TEXT NOT NULL,
      semesterId TEXT NOT NULL,
      classroomId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      maxScore REAL NOT NULL,
      weightPercent REAL NOT NULL,
      orderNo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      scoreComponentId TEXT NOT NULL,
      score REAL NOT NULL,
      isGraded INTEGER NOT NULL DEFAULT 1,
      remarks TEXT,
      updatedAt TEXT NOT NULL,
      updatedBy TEXT,
      UNIQUE(studentId, scoreComponentId)
    );

    CREATE TABLE IF NOT EXISTS bonus_scores (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      semesterId TEXT NOT NULL,
      points REAL NOT NULL,
      reason TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      createdBy TEXT
    );

    CREATE TABLE IF NOT EXISTS grade_rules (
      id TEXT PRIMARY KEY,
      schoolId TEXT NOT NULL,
      subjectId TEXT,
      ranges TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grade_results (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      semesterId TEXT NOT NULL,
      classroomId TEXT NOT NULL,
      rawScoreSum REAL NOT NULL,
      bonusScoreSum REAL NOT NULL,
      totalScore REAL NOT NULL,
      grade TEXT NOT NULL,
      gpaPoints REAL NOT NULL,
      isLocked INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL,
      updatedBy TEXT,
      UNIQUE(studentId, subjectId, semesterId)
    );
  `);
}

// 4. Granular Domain Query Functions
export function loadAllDataFromDb() {
  const db = getDb();
  
  const activeSchoolId = db.prepare("SELECT value FROM system_state WHERE key = 'activeSchoolId'").get() as { value: string } | undefined;
  const activeAcademicYearId = db.prepare("SELECT value FROM system_state WHERE key = 'activeAcademicYearId'").get() as { value: string } | undefined;
  const activeSemesterId = db.prepare("SELECT value FROM system_state WHERE key = 'activeSemesterId'").get() as { value: string } | undefined;
  const activeClassroomId = db.prepare("SELECT value FROM system_state WHERE key = 'activeClassroomId'").get() as { value: string } | undefined;
  const activeSubjectId = db.prepare("SELECT value FROM system_state WHERE key = 'activeSubjectId'").get() as { value: string } | undefined;

  const schools = db.prepare("SELECT * FROM schools").all();
  const academicYears = db.prepare("SELECT * FROM academic_years").all();
  const semesters = db.prepare("SELECT * FROM semesters").all();
  const classrooms = db.prepare("SELECT * FROM classrooms").all();
  const subjects = db.prepare("SELECT * FROM subjects").all();
  const students = db.prepare("SELECT * FROM students").all();
  const enrollments = db.prepare("SELECT * FROM enrollments").all();
  const attendanceSessions = db.prepare("SELECT * FROM attendance_sessions").all();
  const attendanceRecords = db.prepare("SELECT * FROM attendance_records").all();
  const scoreComponents = db.prepare("SELECT id, subjectId, semesterId, classroomId, name, type, maxScore, weightPercent, orderNo as 'order' FROM score_components").all();
  const scores = db.prepare("SELECT id, studentId, scoreComponentId, score, isGraded = 1 as isGraded, remarks, updatedAt, updatedBy FROM scores").all();
  const bonusScores = db.prepare("SELECT * FROM bonus_scores").all();
  const rawGradeRule = db.prepare("SELECT * FROM grade_rules LIMIT 1").get() as any;
  const gradeRules = rawGradeRule ? { ...rawGradeRule, ranges: JSON.parse(rawGradeRule.ranges) } : null;
  const gradeResults = db.prepare("SELECT id, studentId, subjectId, semesterId, classroomId, rawScoreSum, bonusScoreSum, totalScore, grade, gpaPoints, isLocked = 1 as isLocked, updatedAt, updatedBy FROM grade_results").all();

  return {
    activeSchoolId: activeSchoolId?.value || null,
    activeAcademicYearId: activeAcademicYearId?.value || null,
    activeSemesterId: activeSemesterId?.value || null,
    activeClassroomId: activeClassroomId?.value || null,
    activeSubjectId: activeSubjectId?.value || null,
    schools,
    academicYears,
    semesters,
    classrooms,
    subjects,
    students,
    enrollments,
    attendanceSessions,
    attendanceRecords,
    scoreComponents,
    scores,
    bonusScores,
    gradeRules,
    gradeResults
  };
}

// 5. Granular UPSERT Functions (Prevents Data Overwriting)

export function saveAttendanceGranular(sessions: any[], records: any[]) {
  const db = getDb();
  const tx = db.transaction(() => {
    const upsertSession = db.prepare(`
      INSERT INTO attendance_sessions (id, schoolId, classroomId, subjectId, semesterId, date, sessionNo)
      VALUES (@id, @schoolId, @classroomId, @subjectId, @semesterId, @date, @sessionNo)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        sessionNo = excluded.sessionNo
    `);

    const upsertRecord = db.prepare(`
      INSERT INTO attendance_records (id, sessionId, studentId, status, remarks, updatedAt, updatedBy)
      VALUES (@id, @sessionId, @studentId, @status, @remarks, @updatedAt, @updatedBy)
      ON CONFLICT(sessionId, studentId) DO UPDATE SET
        status = excluded.status,
        remarks = excluded.remarks,
        updatedAt = excluded.updatedAt,
        updatedBy = excluded.updatedBy
    `);

    if (Array.isArray(sessions)) {
      sessions.forEach(s => upsertSession.run({ sessionNo: 1, ...s }));
    }

    if (Array.isArray(records)) {
      records.forEach(r => upsertRecord.run({
        id: `${r.sessionId}_${r.studentId}`,
        remarks: null,
        updatedBy: null,
        ...r
      }));
    }
  });

  tx();
  return { success: true };
}

export function saveScoresGranular(components: any[], scores: any[], bonusScores: any[], gradeResults: any[]) {
  const db = getDb();
  const tx = db.transaction(() => {
    const upsertComp = db.prepare(`
      INSERT INTO score_components (id, subjectId, semesterId, classroomId, name, type, maxScore, weightPercent, orderNo)
      VALUES (@id, @subjectId, @semesterId, @classroomId, @name, @type, @maxScore, @weightPercent, @order)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        maxScore = excluded.maxScore,
        weightPercent = excluded.weightPercent,
        orderNo = excluded.orderNo
    `);

    const upsertScore = db.prepare(`
      INSERT INTO scores (id, studentId, scoreComponentId, score, isGraded, remarks, updatedAt, updatedBy)
      VALUES (@id, @studentId, @scoreComponentId, @score, @isGraded, @remarks, @updatedAt, @updatedBy)
      ON CONFLICT(studentId, scoreComponentId) DO UPDATE SET
        score = excluded.score,
        isGraded = excluded.isGraded,
        remarks = excluded.remarks,
        updatedAt = excluded.updatedAt,
        updatedBy = excluded.updatedBy
    `);

    const upsertBonus = db.prepare(`
      INSERT INTO bonus_scores (id, studentId, subjectId, semesterId, points, reason, timestamp, createdBy)
      VALUES (@id, @studentId, @subjectId, @semesterId, @points, @reason, @timestamp, @createdBy)
      ON CONFLICT(id) DO UPDATE SET
        points = excluded.points,
        reason = excluded.reason
    `);

    const upsertGradeRes = db.prepare(`
      INSERT INTO grade_results (id, studentId, subjectId, semesterId, classroomId, rawScoreSum, bonusScoreSum, totalScore, grade, gpaPoints, isLocked, updatedAt, updatedBy)
      VALUES (@id, @studentId, @subjectId, @semesterId, @classroomId, @rawScoreSum, @bonusScoreSum, @totalScore, @grade, @gpaPoints, @isLocked, @updatedAt, @updatedBy)
      ON CONFLICT(studentId, subjectId, semesterId) DO UPDATE SET
        rawScoreSum = excluded.rawScoreSum,
        bonusScoreSum = excluded.bonusScoreSum,
        totalScore = excluded.totalScore,
        grade = excluded.grade,
        gpaPoints = excluded.gpaPoints,
        isLocked = excluded.isLocked,
        updatedAt = excluded.updatedAt,
        updatedBy = excluded.updatedBy
    `);

    if (Array.isArray(components)) {
      components.forEach(c => upsertComp.run({ order: 1, ...c }));
    }

    if (Array.isArray(scores)) {
      scores.forEach(sc => upsertScore.run({
        id: `${sc.studentId}_${sc.scoreComponentId}`,
        isGraded: sc.isGraded ? 1 : 0,
        remarks: null,
        updatedBy: null,
        ...sc
      }));
    }

    if (Array.isArray(bonusScores)) {
      bonusScores.forEach(b => upsertBonus.run({ createdBy: null, ...b }));
    }

    if (Array.isArray(gradeResults)) {
      gradeResults.forEach(gr => upsertGradeRes.run({
        id: `${gr.studentId}_${gr.subjectId}_${gr.semesterId}`,
        isLocked: gr.isLocked ? 1 : 0,
        updatedBy: null,
        ...gr
      }));
    }
  });

  tx();
  return { success: true };
}

export function saveAllDataToDb(data: any) {
  const db = getDb();
  
  const tx = db.transaction(() => {
    // 1. System state
    const upsertState = db.prepare("INSERT INTO system_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    if (data.activeSchoolId) upsertState.run("activeSchoolId", data.activeSchoolId);
    if (data.activeAcademicYearId) upsertState.run("activeAcademicYearId", data.activeAcademicYearId);
    if (data.activeSemesterId) upsertState.run("activeSemesterId", data.activeSemesterId);
    if (data.activeClassroomId) upsertState.run("activeClassroomId", data.activeClassroomId);
    if (data.activeSubjectId) upsertState.run("activeSubjectId", data.activeSubjectId);

    // 2. Schools UPSERT
    if (Array.isArray(data.schools)) {
      const upsertSchool = db.prepare(`
        INSERT INTO schools (id, nameTh, nameEn, logoUrl, status) 
        VALUES (@id, @nameTh, @nameEn, @logoUrl, @status)
        ON CONFLICT(id) DO UPDATE SET nameTh = excluded.nameTh, nameEn = excluded.nameEn, status = excluded.status
      `);
      data.schools.forEach((s: any) => upsertSchool.run({ logoUrl: null, status: 'active', ...s }));
    }

    // 3. Academic Years UPSERT
    if (Array.isArray(data.academicYears)) {
      const upsertYear = db.prepare(`
        INSERT INTO academic_years (id, schoolId, year, status) 
        VALUES (@id, @schoolId, @year, @status)
        ON CONFLICT(id) DO UPDATE SET year = excluded.year, status = excluded.status
      `);
      data.academicYears.forEach((y: any) => upsertYear.run({ status: 'active', ...y }));
    }

    // 4. Semesters UPSERT
    if (Array.isArray(data.semesters)) {
      const upsertSem = db.prepare(`
        INSERT INTO semesters (id, academicYearId, semesterNo, status) 
        VALUES (@id, @academicYearId, @semesterNo, @status)
        ON CONFLICT(id) DO UPDATE SET semesterNo = excluded.semesterNo, status = excluded.status
      `);
      data.semesters.forEach((s: any) => upsertSem.run({ status: 'active', ...s }));
    }

    // 5. Classrooms UPSERT
    if (Array.isArray(data.classrooms)) {
      const upsertClass = db.prepare(`
        INSERT INTO classrooms (id, schoolId, academicYearId, name, teacherId, studentCount) 
        VALUES (@id, @schoolId, @academicYearId, @name, @teacherId, @studentCount)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, studentCount = excluded.studentCount
      `);
      data.classrooms.forEach((c: any) => upsertClass.run({ teacherId: null, studentCount: 0, ...c }));
    }

    // 6. Subjects UPSERT
    if (Array.isArray(data.subjects)) {
      const upsertSub = db.prepare(`
        INSERT INTO subjects (id, schoolId, code, name, creditPoints, hoursPerWeek) 
        VALUES (@id, @schoolId, @code, @name, @creditPoints, @hoursPerWeek)
        ON CONFLICT(id) DO UPDATE SET code = excluded.code, name = excluded.name, creditPoints = excluded.creditPoints, hoursPerWeek = excluded.hoursPerWeek
      `);
      data.subjects.forEach((sub: any) => upsertSub.run(sub));
    }

    // 7. Students UPSERT
    if (Array.isArray(data.students)) {
      const upsertStd = db.prepare(`
        INSERT INTO students (id, schoolId, classroomId, prefix, firstName, lastName, gender, rollNo, status) 
        VALUES (@id, @schoolId, @classroomId, @prefix, @firstName, @lastName, @gender, @rollNo, @status)
        ON CONFLICT(id) DO UPDATE SET 
          classroomId = excluded.classroomId,
          prefix = excluded.prefix,
          firstName = excluded.firstName,
          lastName = excluded.lastName,
          gender = excluded.gender,
          rollNo = excluded.rollNo,
          status = excluded.status
      `);
      data.students.forEach((std: any) => upsertStd.run({ status: "active", ...std }));
    }

    // 8. Enrollments UPSERT
    if (Array.isArray(data.enrollments)) {
      const upsertEnroll = db.prepare(`
        INSERT INTO enrollments (id, studentId, subjectId, semesterId, classroomId, status) 
        VALUES (@id, @studentId, @subjectId, @semesterId, @classroomId, @status)
        ON CONFLICT(id) DO UPDATE SET status = excluded.status
      `);
      data.enrollments.forEach((e: any) => upsertEnroll.run({ status: "active", ...e }));
    }

    // 9. Grade Rules UPSERT
    if (data.gradeRules) {
      db.prepare(`
        INSERT INTO grade_rules (id, schoolId, subjectId, ranges) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET ranges = excluded.ranges
      `).run(
        data.gradeRules.id || "rule-default",
        data.gradeRules.schoolId || "school-1",
        data.gradeRules.subjectId || null,
        JSON.stringify(data.gradeRules.ranges || [])
      );
    }

    // Attendance & Scores Granular updates
    saveAttendanceGranular(data.attendanceSessions, data.attendanceRecords);
    saveScoresGranular(data.scoreComponents, data.scores, data.bonusScores, data.gradeResults);
  });

  tx();
  return { success: true };
}

// 6. Safe WAL-mode Database Backup Helper
export async function backupDatabase(targetFileName?: string): Promise<string> {
  const db = getDb();
  const filename = targetFileName || `graded-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  const targetPath = path.join(DATA_DIR, filename);
  await db.backup(targetPath);
  return targetPath;
}
