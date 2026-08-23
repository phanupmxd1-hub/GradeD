"use client";

import React, { useMemo } from "react";
import { useGMSStore, Student, ScoreComponent, AttendanceSession } from "@/lib/store";
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  BookOpen, 
  Calendar,
  Sparkles
} from "lucide-react";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const {
    students,
    activeClassroomId,
    activeSubjectId,
    activeSemesterId,
    classrooms,
    subjects,
    semesters,
    scoreComponents,
    scores,
    bonusScores,
    gradeResults,
    attendanceSessions,
    attendanceRecords
  } = useGMSStore();

  const currentClass = classrooms.find(c => c.id === activeClassroomId);
  const currentSubject = subjects.find(s => s.id === activeSubjectId);
  const currentSemester = semesters.find(s => s.id === activeSemesterId);

  // Active students
  const activeStudents = useMemo(() => {
    return students
      .filter(s => s.classroomId === activeClassroomId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassroomId]);

  // Active score components
  const activeComponents = useMemo(() => {
    return scoreComponents
      .filter(c => c.classroomId === activeClassroomId && 
                   c.subjectId === activeSubjectId && 
                   c.semesterId === activeSemesterId)
      .sort((a, b) => a.order - b.order);
  }, [scoreComponents, activeClassroomId, activeSubjectId, activeSemesterId]);

  // Active attendance sessions
  const activeSessions = useMemo(() => {
    return attendanceSessions
      .filter(s => s.classroomId === activeClassroomId && 
                   s.subjectId === activeSubjectId && 
                   s.semesterId === activeSemesterId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [attendanceSessions, activeClassroomId, activeSubjectId, activeSemesterId]);

  // Map scores
  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    scores.forEach(s => {
      map[`${s.studentId}_${s.scoreComponentId}`] = s.score;
    });
    return map;
  }, [scores]);

  // Map grade outcomes
  const gradeMap = useMemo(() => {
    const map: Record<string, typeof gradeResults[0]> = {};
    gradeResults
      .filter(g => g.classroomId === activeClassroomId && g.subjectId === activeSubjectId && g.semesterId === activeSemesterId)
      .forEach(g => {
        map[g.studentId] = g;
      });
    return map;
  }, [gradeResults, activeClassroomId, activeSubjectId, activeSemesterId]);

  // Map attendance record lookup
  const recordMap = useMemo(() => {
    const map: Record<string, "มา" | "ลา" | "ขาด" | "สาย" | "หยุด"> = {};
    attendanceRecords.forEach(rec => {
      map[`${rec.sessionId}_${rec.studentId}`] = rec.status;
    });
    return map;
  }, [attendanceRecords]);

  // EXPORT 1: Scores and Grades Excel
  const exportScoresExcel = () => {
    if (activeStudents.length === 0) return;

    // Prepare table headers
    const headers = ["เลขที่", "เลขประจำตัว", "ชื่อ-นามสกุล"];
    activeComponents.forEach(c => {
      headers.push(`${c.name} (เต็ม ${c.maxScore})`);
    });
    headers.push("คะแนนรวมดิบ", "จิตพิสัยพิเศษ", "คะแนนรวมสุทธิ", "เกรด");

    // Prepare data rows
    const dataRows = activeStudents.map(std => {
      const row: any[] = [
        std.rollNo,
        std.id.substring(std.id.lastIndexOf("-") + 1),
        `${std.prefix}${std.firstName} ${std.lastName}`
      ];

      activeComponents.forEach(c => {
        row.push(scoreMap[`${std.id}_${c.id}`] ?? 0);
      });

      const res = gradeMap[std.id];
      row.push(
        res?.rawScoreSum ?? 0,
        res?.bonusScoreSum ?? 0,
        res?.totalScore ?? 0,
        res?.grade ?? "0"
      );

      return row;
    });

    const sheetData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานคะแนน");
    XLSX.writeFile(wb, `gms_scores_${currentClass?.name}_${currentSubject?.code}.xlsx`);
  };

  // EXPORT 2: Attendance Excel
  const exportAttendanceExcel = () => {
    if (activeStudents.length === 0) return;

    // Prepare headers
    const headers = ["เลขที่", "ชื่อ-นามสกุล"];
    activeSessions.forEach(ses => {
      headers.push(ses.date);
    });
    headers.push("มา (วัน)", "ลา (วัน)", "ขาด (วัน)", "สาย (วัน)", "หยุด (วัน)", "ร้อยละเข้าเรียน");

    // Prepare data rows
    const dataRows = activeStudents.map(std => {
      const row: any[] = [
        std.rollNo,
        `${std.prefix}${std.firstName} ${std.lastName}`
      ];

      let present = 0, leave = 0, absent = 0, late = 0, exempt = 0;
      activeSessions.forEach(ses => {
        const status = recordMap[`${ses.id}_${std.id}`] || "มา";
        row.push(status);
        if (status === "มา") present++;
        else if (status === "ลา") leave++;
        else if (status === "ขาด") absent++;
        else if (status === "สาย") late++;
        else if (status === "หยุด") exempt++;
      });

      const total = activeSessions.length;
      const percent = total > 0 ? Math.round(((present + leave + late + exempt) / total) * 100) : 100;

      row.push(present, leave, absent, late, exempt, `${percent}%`);
      return row;
    });

    const sheetData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานเวลาเรียน");
    XLSX.writeFile(wb, `gms_attendance_${currentClass?.name}_${currentSubject?.code}.xlsx`);
  };

  // RENDER REPORT PDF PRINT PREVIEW
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">รายงานและส่งออกข้อมูล (Reports Hub)</h2>
          <p className="text-sm text-muted-foreground">
            จัดทำรายงานคะแนนดิบ เวลาเรียน และเกรดประมวลผล เพื่อส่งออกเป็นไฟล์เอกสารหรือสั่งพิมพ์ทางเครื่องพิมพ์
          </p>
        </div>
      </div>

      {/* Reports Options Cards (Hide on Print) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        
        {/* Card 1: Score sheet excel */}
        <div className="glass rounded-3xl p-6 border border-border flex flex-col justify-between h-56 hover:shadow-lg transition-shadow">
          <div>
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 mb-4">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">รายงานคะแนนและเกรดผู้เรียน (Excel)</h3>
            <p className="text-xs text-muted-foreground mt-2">
              ดาวน์โหลดตารางบันทึกคะแนนรวมรายบุคคล คะแนนดิบชิ้นงานย่อย คะแนนจิตพิสัยสะสม และระดับเกรดผลลัพธ์
            </p>
          </div>
          <button
            onClick={exportScoresExcel}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all mt-4"
          >
            <Download className="h-4 w-4" />
            ส่งออกไฟล์คะแนน Excel
          </button>
        </div>

        {/* Card 2: Attendance excel */}
        <div className="glass rounded-3xl p-6 border border-border flex flex-col justify-between h-56 hover:shadow-lg transition-shadow">
          <div>
            <div className="h-10 w-10 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 mb-4">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">รายงานเวลาเรียนและการขาดเรียน (Excel)</h3>
            <p className="text-xs text-muted-foreground mt-2">
              ดาวน์โหลดรายงานประวัติการเช็คชื่อเข้าชั้นเรียนตลอดปีการศึกษา แยกรายละเอียดเป็น มา ลา ขาด สาย
            </p>
          </div>
          <button
            onClick={exportAttendanceExcel}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all mt-4"
          >
            <Download className="h-4 w-4" />
            ส่งออกไฟล์เวลาเรียน Excel
          </button>
        </div>

        {/* Card 3: Print layout PDF */}
        <div className="glass rounded-3xl p-6 border border-border flex flex-col justify-between h-56 hover:shadow-lg transition-shadow">
          <div>
            <div className="h-10 w-10 rounded-2xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 mb-4">
              <Printer className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">พิมพ์รายงานผลสัมฤทธิ์อย่างเป็นทางการ</h3>
            <p className="text-xs text-muted-foreground mt-2">
              จัดรูปแบบรายงานสรุปยอดใบงานเกรดเรียนแบบกระดาษ เพื่อส่งตรงฝ่ายวิชาการโรงเรียน หรือบันทึกเป็น PDF
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all mt-4"
          >
            <Printer className="h-4 w-4" />
            สั่งพิมพ์รายงาน (Print / Save PDF)
          </button>
        </div>

      </div>

      {/* Printable Report View (Visible both in UI preview and during window.print()) */}
      <div className="rounded-3xl border border-border bg-white text-black p-8 md:p-12 shadow-sm print:shadow-none print:border-none print:p-0">
        
        {/* Print Header */}
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl font-bold tracking-tight">รายงานสรุปผลคะแนนและผลการเรียนรายบุคคล</h2>
          <p className="text-sm font-medium">โรงเรียนประชารักศึกษา (Pracharuksa Academy)</p>
          <div className="flex justify-center gap-4 text-xs text-zinc-600 font-semibold">
            <span>วิชา: {currentSubject?.name} ({currentSubject?.code})</span>
            <span>ชั้นเรียน: {currentClass?.name}</span>
            <span>ภาคเรียนที่: {currentSemester?.semesterNo}</span>
            <span>ปีการศึกษา: 2569</span>
          </div>
          <div className="h-px bg-zinc-200 w-full mt-4" />
        </div>

        {/* Report summary table */}
        <table className="w-full text-left text-xs border border-zinc-200">
          <thead>
            <tr className="bg-zinc-100 border-b border-zinc-200">
              <th className="p-3 w-16 text-center border-r border-zinc-200">เลขที่</th>
              <th className="p-3 w-28 border-r border-zinc-200">เลขประจำตัว</th>
              <th className="p-3 border-r border-zinc-200">ชื่อ-นามสกุล</th>
              <th className="p-3 w-28 text-center border-r border-zinc-200">คะแนนเก็บดิบ</th>
              <th className="p-3 w-24 text-center border-r border-zinc-200">คะแนนจิตพิสัย</th>
              <th className="p-3 w-28 text-center border-r border-zinc-200">คะแนนรวมสุทธิ</th>
              <th className="p-3 w-20 text-center">ระดับผลเรียน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {activeStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-zinc-400">ไม่พบข้อมูลรายชื่อนักเรียน</td>
              </tr>
            ) : (
              activeStudents.map(std => {
                const res = gradeMap[std.id];
                return (
                  <tr key={std.id} className="hover:bg-zinc-50/50">
                    <td className="p-3 text-center border-r border-zinc-200 font-semibold">{std.rollNo}</td>
                    <td className="p-3 border-r border-zinc-200 font-mono text-zinc-600">{std.id.substring(std.id.lastIndexOf("-") + 1)}</td>
                    <td className="p-3 border-r border-zinc-200 font-semibold">{std.prefix}{std.firstName} {std.lastName}</td>
                    <td className="p-3 text-center border-r border-zinc-200">{res?.rawScoreSum ?? 0}</td>
                    <td className="p-3 text-center border-r border-zinc-200">{res?.bonusScoreSum ?? 0}</td>
                    <td className="p-3 text-center border-r border-zinc-200 font-bold">{res?.totalScore ?? 0}</td>
                    <td className="p-3 text-center font-bold text-emerald-800">{res?.grade ?? "0"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Print Signature Box */}
        <div className="mt-16 flex justify-end gap-16 text-xs text-center text-zinc-600 select-none">
          <div className="space-y-12">
            <p>ลงชื่อ.............................................................. ครูผู้สอน</p>
            <p>( นายสมคิด รักเรียน )</p>
            <p>วันที่พิมพ์: {new Date().toLocaleDateString("th-TH")}</p>
          </div>
        </div>

      </div>

    </div>
  );
}
