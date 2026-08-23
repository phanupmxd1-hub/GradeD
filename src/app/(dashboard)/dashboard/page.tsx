"use client";

import React, { useMemo } from "react";
import { useGMSStore } from "@/lib/store";
import { useAuth } from "@/features/auth/context";
import { 
  Users, 
  CalendarCheck, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  AlertTriangle,
  Award,
  BarChart2,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Sparkles
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    students,
    activeClassroomId,
    activeSubjectId,
    activeSemesterId,
    classrooms,
    subjects,
    semesters,
    attendanceSessions,
    attendanceRecords,
    scoreComponents,
    scores,
    bonusScores,
    gradeResults
  } = useGMSStore();

  const currentClass = classrooms.find(c => c.id === activeClassroomId);
  const currentSubject = subjects.find(s => s.id === activeSubjectId);

  // Active students
  const activeStudents = useMemo(() => {
    return students.filter(s => s.classroomId === activeClassroomId);
  }, [students, activeClassroomId]);

  // Active sessions
  const activeSessions = useMemo(() => {
    return attendanceSessions
      .filter(s => s.classroomId === activeClassroomId && 
                   s.subjectId === activeSubjectId && 
                   s.semesterId === activeSemesterId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [attendanceSessions, activeClassroomId, activeSubjectId, activeSemesterId]);

  // Map attendance record lookup
  const recordMap = useMemo(() => {
    const map: Record<string, "มา" | "ลา" | "ขาด" | "สาย" | "หยุด"> = {};
    attendanceRecords.forEach(rec => {
      map[`${rec.sessionId}_${rec.studentId}`] = rec.status;
    });
    return map;
  }, [attendanceRecords]);

  // Scores map lookup
  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    scores.forEach(s => {
      map[`${s.studentId}_${s.scoreComponentId}`] = s.score;
    });
    return map;
  }, [scores]);

  // Filtered components
  const activeComponents = useMemo(() => {
    return scoreComponents
      .filter(c => c.classroomId === activeClassroomId && 
                   c.subjectId === activeSubjectId && 
                   c.semesterId === activeSemesterId)
      .sort((a, b) => a.order - b.order);
  }, [scoreComponents, activeClassroomId, activeSubjectId, activeSemesterId]);

  // Active grade outcomes
  const activeGradeResults = useMemo(() => {
    return gradeResults
      .filter(g => g.classroomId === activeClassroomId && 
                   g.subjectId === activeSubjectId && 
                   g.semesterId === activeSemesterId);
  }, [gradeResults, activeClassroomId, activeSubjectId, activeSemesterId]);

  // Calculations for KPIs
  const kpis = useMemo(() => {
    const totalStudents = activeStudents.length;

    // 1. Attendance rate
    let totalRecordsCount = 0;
    let presentRecordsCount = 0;
    activeSessions.forEach(ses => {
      activeStudents.forEach(std => {
        const status = recordMap[`${ses.id}_${std.id}`];
        if (status) {
          totalRecordsCount++;
          if (status === "มา" || status === "ลา" || status === "สาย" || status === "หยุด") {
            presentRecordsCount++;
          }
        }
      });
    });
    const attendanceRate = totalRecordsCount > 0 ? Math.round((presentRecordsCount / totalRecordsCount) * 100) : 95;

    // 2. Class score average
    const classAverage = activeGradeResults.length > 0 
      ? Math.round((activeGradeResults.reduce((sum, r) => sum + r.totalScore, 0) / activeGradeResults.length) * 10) / 10
      : 74.5;

    // 3. Unchecked sessions (mocked or check empty days)
    const uncheckedDays = activeSessions.length === 0 ? 5 : 1; 

    // 4. Ungraded homework items (where student score is zero or missing)
    let ungradedCount = 0;
    activeComponents.forEach(comp => {
      activeStudents.forEach(std => {
        const val = scoreMap[`${std.id}_${comp.id}`];
        if (val === undefined || val === 0) {
          ungradedCount++;
        }
      });
    });

    return {
      attendanceRate,
      classAverage,
      uncheckedDays,
      ungradedCount,
      totalStudents
    };
  }, [activeStudents, activeSessions, activeGradeResults, activeComponents, recordMap, scoreMap]);

  // Chart Data: Attendance rate over dates
  const attendanceChartData = useMemo(() => {
    return activeSessions.map(ses => {
      let present = 0;
      let total = 0;
      activeStudents.forEach(std => {
        const status = recordMap[`${ses.id}_${std.id}`];
        if (status) {
          total++;
          if (status === "มา" || status === "ลา" || status === "สาย" || status === "หยุด") {
            present++;
          }
        }
      });
      return {
        date: ses.date.substring(5), // YYYY-MM-DD to MM-DD
        rate: total > 0 ? Math.round((present / total) * 100) : 100
      };
    });
  }, [activeSessions, activeStudents, recordMap]);

  // Chart Data: Grade distribution counts
  const gradeDistributionData = useMemo(() => {
    const grades = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0"];
    const counts: Record<string, number> = {};
    grades.forEach(g => { counts[g] = 0; });

    activeGradeResults.forEach(res => {
      if (counts[res.grade] !== undefined) {
        counts[res.grade]++;
      } else {
        counts["0"]++;
      }
    });

    return grades.map(g => ({
      name: `เกรด ${g}`,
      value: counts[g]
    }));
  }, [activeGradeResults]);

  // Chart Data: Average score per component
  const componentAverageData = useMemo(() => {
    return activeComponents.map(comp => {
      let sum = 0;
      let count = 0;
      activeStudents.forEach(std => {
        const val = scoreMap[`${std.id}_${comp.id}`] ?? 0;
        sum += val;
        count++;
      });
      // Percentage of average score relative to maximum
      const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      return {
        name: comp.name,
        average: avg,
        maxScore: comp.maxScore
      };
    });
  }, [activeComponents, activeStudents, scoreMap]);

  const COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#fef3c7", "#fde68a", "#fca5a5", "#f87171"];

  return (
    <div className="space-y-6">
      
      {/* Dashboard Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-emerald-600 p-6 sm:p-8 text-white shadow-xl shadow-emerald-600/10">
        <div className="absolute top-[-30%] right-[-10%] h-96 w-96 rounded-full bg-emerald-500/35 blur-3xl" />
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            ผู้เชี่ยวชาญการสอนพอร์ทัล
          </span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            สวัสดีครับคุณครู {user?.firstName || "สมคิด"} {user?.lastName || "รักเรียน"}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-lg">
            ยินดีต้อนรับสู่ระบบบริหารผลการเรียนวิชา <strong>{currentSubject?.name} ({currentSubject?.code})</strong> ห้อง <strong>{currentClass?.name}</strong> ยินดีช่วยจัดการข้อมูลทุกภาคส่วนให้สะดวกยิ่งขึ้นครับ
          </p>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Students */}
        <div className="glass rounded-2xl p-4 border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">นักเรียนทั้งหมด</span>
            <span className="text-lg font-bold text-foreground">{kpis.totalStudents} คน</span>
          </div>
        </div>

        {/* Card 2: Attendance rate */}
        <div className="glass rounded-2xl p-4 border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">อัตราเข้าเรียน</span>
            <span className="text-lg font-bold text-foreground">{kpis.attendanceRate}%</span>
          </div>
        </div>

        {/* Card 3: Class Average */}
        <div className="glass rounded-2xl p-4 border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">คะแนนเฉลี่ยห้อง</span>
            <span className="text-lg font-bold text-foreground">{kpis.classAverage}</span>
          </div>
        </div>

        {/* Card 4: Unchecked attendance days */}
        <div className="glass rounded-2xl p-4 border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">ยังไม่เช็คชื่อ</span>
            <span className="text-lg font-bold text-foreground">{kpis.uncheckedDays} วัน</span>
          </div>
        </div>

        {/* Card 5: Ungraded items */}
        <div className="glass rounded-2xl p-4 border border-border flex items-center gap-4 col-span-2 lg:col-span-1">
          <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">งานยังไม่ตรวจ</span>
            <span className="text-lg font-bold text-foreground">{kpis.ungradedCount} ชิ้น</span>
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Attendance Trends (Line chart) */}
        <div className="glass rounded-3xl p-5 border border-border flex flex-col">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            แนวโน้มการเข้าเรียนของชั้นเรียน (%)
          </h3>
          <div className="h-64 w-full text-xs">
            {attendanceChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">ไม่มีข้อมูลสถิติประวัติเช็คชื่อ</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceChartData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[50, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, "อัตราการเข้าเรียน"]} />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    activeDot={{ r: 8 }} 
                    dot={{ stroke: "#10b981", strokeWidth: 2, r: 4, fill: "#ffffff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Grade distribution (Pie Chart) */}
        <div className="glass rounded-3xl p-5 border border-border flex flex-col">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4 text-emerald-600" />
            สัดส่วนการตัดเกรดในรายวิชา (Grade Distribution)
          </h3>
          <div className="h-64 w-full flex flex-col sm:flex-row items-center justify-center text-xs">
            {activeGradeResults.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">ไม่มีข้อมูลประมวลผลเกรด</div>
            ) : (
              <>
                <div className="h-full w-full sm:w-2/3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gradeDistributionData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {gradeDistributionData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} คน`, "จำนวน"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="grid grid-cols-2 gap-2 w-full sm:w-1/3 p-2 bg-muted/20 rounded-2xl border border-border">
                  {gradeDistributionData.map((d, index) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[10px] font-semibold">{d.name}: <strong>{d.value} คน</strong></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart 3: Average score per component (Bar Chart) */}
        <div className="glass rounded-3xl p-5 border border-border flex flex-col lg:col-span-2">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            คะแนนเฉลี่ยผู้เรียนจำแนกตามชิ้นงาน (Average Scores)
          </h3>
          <div className="h-64 w-full text-xs">
            {componentAverageData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">ไม่มีโครงสร้างชิ้นงานเก็บคะแนน</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={componentAverageData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [value, name === "average" ? "คะแนนเฉลี่ยห้อง" : "คะแนนเต็ม"]} />
                  <Legend />
                  <Bar dataKey="average" name="คะแนนเฉลี่ย" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={45} />
                  <Bar dataKey="maxScore" name="คะแนนเต็ม" fill="#cbd5e1" radius={[8, 8, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
