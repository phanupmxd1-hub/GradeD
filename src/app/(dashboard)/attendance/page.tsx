"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useGMSStore, Student, AttendanceSession } from "@/lib/store";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Grid, 
  ListTodo, 
  Users,
  Search,
  BookOpen,
  Keyboard,
  Download,
  Check,
  Save,
  Edit2,
  Trash2
} from "lucide-react";

export default function AttendancePage() {
  const {
    students,
    activeClassroomId,
    activeSubjectId,
    activeSemesterId,
    attendanceSessions,
    attendanceRecords,
    createAttendanceSession,
    updateAttendanceRecord,
    bulkCheckAttendance,
    updateAttendanceSession,
    deleteAttendanceSession
  } = useGMSStore();

  const [viewMode, setViewMode] = useState<"daily" | "semester">("semester");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSessionNo, setSelectedSessionNo] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedCell, setFocusedCell] = useState<{ studentId: string; sessionId: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("saved");

  // Manage Sessions States
  const [isManageSessionOpen, setIsManageSessionOpen] = useState(false);
  const [managingSession, setManagingSession] = useState<AttendanceSession | null>(null);
  const [manageSessionDate, setManageSessionDate] = useState("");
  const [manageSessionNo, setManageSessionNo] = useState(1);

  const handleOpenManageSession = (session: AttendanceSession) => {
    setManagingSession(session);
    setManageSessionDate(session.date);
    setManageSessionNo(session.sessionNo);
    setIsManageSessionOpen(true);
  };

  const handleUpdateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingSession) return;
    updateAttendanceSession(managingSession.id, manageSessionDate, manageSessionNo);
    setIsManageSessionOpen(false);
    alert("แก้ไขข้อมูลคาบเรียนเรียบร้อยแล้ว");
  };

  const handleDeleteSession = () => {
    if (!managingSession) return;
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคาบเรียนวันที่ ${managingSession.date} คาบที่ ${managingSession.sessionNo}? ข้อมูลเวลาเรียนของนักเรียนทั้งหมดในคาบนี้จะถูกลบอย่างถาวร`)) {
      deleteAttendanceSession(managingSession.id);
      setIsManageSessionOpen(false);
      alert("ลบคาบเรียนเรียบร้อยแล้ว");
    }
  };

  // Get active students
  const activeStudents = useMemo(() => {
    return students
      .filter(s => s.classroomId === activeClassroomId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassroomId]);

  // Search filtered students
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return activeStudents;
    const query = searchQuery.toLowerCase();
    return activeStudents.filter(s => 
      s.firstName.toLowerCase().includes(query) ||
      s.lastName.toLowerCase().includes(query)
    );
  }, [activeStudents, searchQuery]);

  // Get active attendance sessions for this subject/classroom/semester
  const activeSessions = useMemo(() => {
    return attendanceSessions
      .filter(s => s.classroomId === activeClassroomId && 
                   s.subjectId === activeSubjectId && 
                   s.semesterId === activeSemesterId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [attendanceSessions, activeClassroomId, activeSubjectId, activeSemesterId]);

  // Current session for Daily View (defaults to the first session on the selected date or creates one)
  const currentDailySession = useMemo(() => {
    return activeSessions.find(s => s.date === selectedDate && s.sessionNo === selectedSessionNo);
  }, [activeSessions, selectedDate, selectedSessionNo]);

  // Map attendance record quick lookup
  const recordMap = useMemo(() => {
    const map: Record<string, "มา" | "ลา" | "ขาด" | "สาย" | "หยุด"> = {};
    attendanceRecords.forEach(rec => {
      map[`${rec.sessionId}_${rec.studentId}`] = rec.status;
    });
    return map;
  }, [attendanceRecords]);

  // Add new session handler
  const handleAddSession = () => {
    createAttendanceSession(selectedDate, selectedSessionNo);
    alert(`สร้างคาบการเช็คชื่อสำหรับวันที่ ${selectedDate} คาบที่ ${selectedSessionNo} เรียบร้อยแล้ว`);
  };

  // Keyboard navigation & editing listener in Semester view
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    student: Student,
    session: AttendanceSession,
    studentIndex: number,
    sessionIndex: number
  ) => {
    const key = e.key.toUpperCase();
    
    // Prevent scrolling default behavior
    if (["ARROWUP", "ARROWDOWN", "ARROWLEFT", "ROUTRIGHT", "ENTER", "BACKSPACE", "DELETE"].includes(e.key.toUpperCase())) {
      e.preventDefault();
    }

    // Edit commands
    const keyMap: Record<string, "มา" | "ลา" | "ขาด" | "สาย" | "หยุด"> = {
      "M": "มา",
      "L": "ลา",
      "A": "ขาด",
      "T": "สาย",
      "H": "หยุด"
    };

    if (keyMap[key]) {
      setSaveStatus("saving");
      updateAttendanceRecord(session.id, student.id, keyMap[key]);
      setTimeout(() => setSaveStatus("saved"), 300);
      
      // Auto move down after check
      focusCell(studentIndex + 1, sessionIndex);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      setSaveStatus("saving");
      // Set back to default มา
      updateAttendanceRecord(session.id, student.id, "มา");
      setTimeout(() => setSaveStatus("saved"), 300);
    }

    // Grid Navigation
    if (e.key === "ArrowDown" || e.key === "Enter") {
      focusCell(studentIndex + 1, sessionIndex);
    } else if (e.key === "ArrowUp") {
      focusCell(studentIndex - 1, sessionIndex);
    } else if (e.key === "ArrowRight") {
      focusCell(studentIndex, sessionIndex + 1);
    } else if (e.key === "ArrowLeft") {
      focusCell(studentIndex, sessionIndex - 1);
    }
  };

  const focusCell = (sIdx: number, sesIdx: number) => {
    if (sIdx >= 0 && sIdx < filteredStudents.length && sesIdx >= 0 && sesIdx < activeSessions.length) {
      const targetStd = filteredStudents[sIdx];
      const targetSes = activeSessions[sesIdx];
      const cellId = `cell-${targetStd.id}-${targetSes.id}`;
      const element = document.getElementById(cellId);
      if (element) {
        element.focus();
      }
    }
  };

  // Roll calculations per student
  const studentStats = useMemo(() => {
    const stats: Record<string, { present: number; leave: number; absent: number; late: number; exempt: number; percent: number }> = {};
    
    filteredStudents.forEach(std => {
      let present = 0;
      let leave = 0;
      let absent = 0;
      let late = 0;
      let exempt = 0;

      activeSessions.forEach(ses => {
        const status = recordMap[`${ses.id}_${std.id}`];
        if (status === "มา") present++;
        else if (status === "ลา") leave++;
        else if (status === "ขาด") absent++;
        else if (status === "สาย") late++;
        else if (status === "หยุด") exempt++;
      });

      const total = activeSessions.length;
      // % มาเรียน = (มา + ลา + สาย + หยุด) / ทั้งหมด * 100
      const percent = total > 0 ? Math.round(((present + leave + late + exempt) / total) * 100) : 100;

      stats[std.id] = { present, leave, absent, late, exempt, percent };
    });

    return stats;
  }, [filteredStudents, activeSessions, recordMap]);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ระบบบันทึกเวลาเรียน (Attendance Grid)</h2>
          <p className="text-sm text-muted-foreground">
            เช็คชื่อนักเรียนรายวัน คาบเรียน สรุปสถิติมาเรียน ขาด ลา สาย แบบเรียลไทม์
          </p>
        </div>

        {/* View Mode Toggle / Auto save indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <div className={`h-2 w-2 rounded-full ${saveStatus === "saving" ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
            <span>{saveStatus === "saving" ? "กำลังบันทึก..." : "ระบบบันทึกอัตโนมัติ"}</span>
          </div>

          <div className="flex p-0.5 rounded-2xl bg-muted border border-border">
            <button
              onClick={() => setViewMode("semester")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === "semester" ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid className="h-4 w-4" />
              ตาราง 100 วัน
            </button>
            <button
              onClick={() => setViewMode("daily")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === "daily" ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ListTodo className="h-4 w-4" />
              เช็คชื่อรายวัน
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel: Add Sessions & Options */}
      <div className="glass rounded-3xl p-5 border border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">คาบที่:</span>
            <select
              value={selectedSessionNo}
              onChange={(e) => setSelectedSessionNo(parseInt(e.target.value))}
              className="rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddSession}
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            เพิ่มวันที่สอน
          </button>
        </div>

        {/* Global check buttons for selected daily date */}
        {viewMode === "daily" && currentDailySession && (
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                if (confirm("เช็คชื่อ มาเรียน ทั้งห้องเรียนหรือไม่?")) {
                  bulkCheckAttendance(currentDailySession.id, "มา");
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 text-xs font-semibold hover:bg-emerald-500/10 active:scale-95 transition-all"
            >
              มาทั้งห้อง
            </button>
            <button
              onClick={() => {
                if (confirm("เช็คชื่อ ขาดเรียน ทั้งห้องเรียนหรือไม่?")) {
                  bulkCheckAttendance(currentDailySession.id, "ขาด");
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 text-xs font-semibold hover:bg-red-500/10 active:scale-95 transition-all"
            >
              ขาดทั้งห้อง
            </button>
          </div>
        )}
      </div>

      {/* Attendance Content views */}
      {viewMode === "daily" ? (
        // DAILY VIEW
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-3xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                บันทึกการเช็คชื่อวันที่: {selectedDate} (คาบที่ {selectedSessionNo})
              </span>
              <div className="relative max-w-xs">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-2xl border border-border bg-background py-1.5 pr-3 pl-8 text-xs outline-none"
                />
              </div>
            </div>

            {!currentDailySession ? (
              <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-3">
                <Calendar className="h-12 w-12 text-muted-foreground/30 animate-bounce" />
                <p className="font-semibold text-sm">ไม่พบประวัติการเรียนการสอนในวันที่เลือก</p>
                <p className="text-xs max-w-sm">
                  กรุณากดปุ่ม <strong>"เพิ่มวันที่สอน"</strong> ด้านบน เพื่อสร้างใบเช็คชื่อสำหรับวันที่ {selectedDate}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredStudents.map((std) => {
                  const status = recordMap[`${currentDailySession.id}_${std.id}`] || "มา";
                  return (
                    <div key={std.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-8 text-center">{std.rollNo}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{std.prefix}{std.firstName} {std.lastName}</p>
                          <p className="text-[10px] text-muted-foreground">เลขประจำตัว: {std.id.substring(std.id.lastIndexOf("-") + 1)}</p>
                        </div>
                      </div>

                      {/* Status selectors */}
                      <div className="flex flex-wrap gap-1 bg-muted p-0.5 rounded-2xl border border-border self-end sm:self-auto">
                        {[
                          { key: "มา", label: "มา", color: "bg-emerald-500 text-white" },
                          { key: "ลา", label: "ลา", color: "bg-amber-400 text-amber-950" },
                          { key: "ขาด", label: "ขาด", color: "bg-red-500 text-white" },
                          { key: "สาย", label: "สาย", color: "bg-orange-500 text-white" },
                          { key: "หยุด", label: "หยุด", color: "bg-slate-500 text-white" },
                        ].map((btn) => {
                          const active = status === btn.key;
                          return (
                            <button
                              key={btn.key}
                              onClick={() => {
                                setSaveStatus("saving");
                                updateAttendanceRecord(currentDailySession.id, std.id, btn.key as any);
                                setTimeout(() => setSaveStatus("saved"), 300);
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${active ? btn.color + " shadow-sm scale-105" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Statistics Summary Widget Side Panel */}
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-border">
              <h3 className="text-sm font-bold mb-4">สถิติห้องเรียนคาบนี้</h3>
              
              {!currentDailySession ? (
                <p className="text-xs text-muted-foreground text-center py-6">เลือกหรือสร้างคาบเรียนเพื่อคำนวณสถิติ</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    let m = 0, l = 0, a = 0, t = 0, h = 0;
                    filteredStudents.forEach(std => {
                      const status = recordMap[`${currentDailySession.id}_${std.id}`];
                      if (status === "มา") m++;
                      else if (status === "ลา") l++;
                      else if (status === "ขาด") a++;
                      else if (status === "สาย") t++;
                      else if (status === "หยุด") h++;
                    });
                    const total = filteredStudents.length;
                    const percent = total > 0 ? Math.round(((m + l + t + h) / total) * 100) : 100;

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{m}</span>
                            <span className="text-[10px] text-muted-foreground">มาเรียน (มา)</span>
                          </div>
                          <div className="bg-amber-400/5 dark:bg-amber-400/10 border border-amber-400/10 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-amber-500">{l}</span>
                            <span className="text-[10px] text-muted-foreground">ลากิจ/ลาป่วย (ลา)</span>
                          </div>
                          <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-red-500">{a}</span>
                            <span className="text-[10px] text-muted-foreground">ขาดเรียน (ขาด)</span>
                          </div>
                          <div className="bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/10 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-orange-500">{t}</span>
                            <span className="text-[10px] text-muted-foreground">เข้าสาย (สาย)</span>
                          </div>
                          <div className="bg-slate-500/5 dark:bg-slate-500/10 border border-slate-500/10 rounded-2xl p-3 flex flex-col items-center justify-center col-span-2">
                            <span className="text-xl font-bold text-slate-500">{h}</span>
                            <span className="text-[10px] text-muted-foreground">วันหยุด/งดเรียน (หยุด)</span>
                          </div>
                        </div>

                        <div className="h-px bg-border my-2" />

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">เปอร์เซ็นต์การเข้าเรียนรวม:</span>
                          <span className={`text-sm font-bold ${percent >= 80 ? "text-emerald-600" : "text-red-500"}`}>{percent}%</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-6 border border-border">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                <Keyboard className="h-4 w-4" />
                คีย์บอร์ดความเร็วสูง
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                คุณสามารถกรอกสถิติเวลาเรียนได้รวดเร็วขึ้นในโหมด <strong>ตาราง 100 วัน</strong> โดยใช้แป้นพิมพ์คีย์บอร์ด:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted px-3 py-2 rounded-xl flex justify-between"><strong className="text-emerald-600">M</strong> <span>มาเรียน</span></div>
                <div className="bg-muted px-3 py-2 rounded-xl flex justify-between"><strong className="text-amber-500">L</strong> <span>ลากิจ/ป่วย</span></div>
                <div className="bg-muted px-3 py-2 rounded-xl flex justify-between"><strong className="text-red-500">A</strong> <span>ขาดเรียน</span></div>
                <div className="bg-muted px-3 py-2 rounded-xl flex justify-between"><strong className="text-orange-500">T</strong> <span>เข้าสาย</span></div>
                <div className="bg-muted px-3 py-2 rounded-xl flex justify-between col-span-2"><strong className="text-slate-500">H</strong> <span>วันหยุด/งดเรียน</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // SEMESTER VIEW (EXCEL-STYLE SHEET)
        <div className="rounded-3xl border border-border bg-card/65 backdrop-blur-md overflow-hidden">
          
          <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-foreground">
                มุมมองตารางเช็คชื่อยาวต่อเนื่อง (Semester View)
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                คลิกเลือกช่องตารางแล้วใช้ปุ่ม <strong>M/L/A/T/H</strong> ในการเช็คชื่อด่วน สามารถเลื่อนทิศทางด้วยปุ่มลูกศร
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background py-1.5 pr-3 pl-8 text-xs outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                <tr>
                  {/* Sticky Columns Header */}
                  <th className="p-3 w-12 text-center bg-muted border-r border-border sticky left-0 z-20">เลขที่</th>
                  <th className="p-3 w-40 bg-muted border-r border-border sticky left-12 z-20">ชื่อนักเรียน</th>
                  
                  {/* Dates Headers */}
                  {activeSessions.length === 0 ? (
                    <th className="p-3 text-center text-muted-foreground">ไม่มีประวัติคาบเรียน</th>
                  ) : (
                    activeSessions.map((session, sIdx) => (
                      <th 
                        key={session.id} 
                        className="p-2.5 text-center border-r border-border min-w-[85px] hover:bg-muted/80 transition-all cursor-pointer relative group"
                        onClick={() => handleOpenManageSession(session)}
                        title="คลิกเพื่อแก้ไขหรือลบคาบเรียนนี้"
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                            {session.date.substring(5)}
                          </div>
                          <div className="text-[9px] text-muted-foreground group-hover:text-emerald-500 font-medium flex items-center justify-center gap-0.5">
                            คาบ {session.sessionNo}
                            <Edit2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 shrink-0" />
                          </div>
                        </div>
                      </th>
                    ))
                  )}

                  {/* Summary Columns Header */}
                  <th className="p-3 w-12 text-center bg-emerald-500/5 text-emerald-600 border-r border-border font-bold">มา</th>
                  <th className="p-3 w-12 text-center bg-amber-400/5 text-amber-500 border-r border-border font-bold">ลา</th>
                  <th className="p-3 w-12 text-center bg-red-500/5 text-red-500 border-r border-border font-bold">ขาด</th>
                  <th className="p-3 w-12 text-center bg-orange-500/5 text-orange-500 border-r border-border font-bold">สาย</th>
                  <th className="p-3 w-12 text-center bg-slate-500/5 text-slate-500 border-r border-border font-bold">หยุด</th>
                  <th className="p-3 w-16 text-center bg-emerald-600/10 text-emerald-700 font-bold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={activeSessions.length + 7} className="p-12 text-center text-muted-foreground">
                      <p className="font-semibold text-sm">ไม่พบรายชื่อนักเรียนในห้องเรียนนี้</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std, stdIdx) => {
                    const stats = studentStats[std.id] || { present: 0, leave: 0, absent: 0, late: 0, exempt: 0, percent: 100 };
                    
                    return (
                      <tr key={std.id} className="hover:bg-muted/10">
                        {/* Sticky Columns Data */}
                        <td className="p-3 text-center font-semibold bg-card border-r border-border sticky left-0 z-10">{std.rollNo}</td>
                        <td className="p-3 font-semibold text-foreground bg-card border-r border-border sticky left-12 z-10 truncate max-w-[160px]">
                          {std.prefix}{std.firstName} {std.lastName}
                        </td>

                        {/* Interactive Cells */}
                        {activeSessions.map((session, sesIdx) => {
                          const status = recordMap[`${session.id}_${std.id}`] || "มา";
                          const isFocused = focusedCell?.studentId === std.id && focusedCell?.sessionId === session.id;
                          
                          // Style based on status
                          let badgeStyle = "bg-muted text-muted-foreground";
                          if (status === "มา") badgeStyle = "bg-m text-emerald-800 dark:text-emerald-300 font-bold";
                          else if (status === "ลา") badgeStyle = "bg-l text-amber-800 dark:text-amber-300 font-bold";
                          else if (status === "ขาด") badgeStyle = "bg-a text-red-800 dark:text-red-300 font-bold";
                          else if (status === "สาย") badgeStyle = "bg-t text-orange-800 dark:text-orange-300 font-bold";
                          else if (status === "หยุด") badgeStyle = "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold";

                          return (
                            <td 
                              key={session.id}
                              id={`cell-${std.id}-${session.id}`}
                              tabIndex={0}
                              onFocus={() => setFocusedCell({ studentId: std.id, sessionId: session.id })}
                              onBlur={() => setFocusedCell(null)}
                              onKeyDown={(e) => handleCellKeyDown(e, std, session, stdIdx, sesIdx)}
                              className={`p-1.5 text-center border-r border-border outline-none transition-all cursor-pointer ${isFocused ? "ring-2 ring-emerald-500 bg-emerald-500/10 scale-105 z-10" : ""}`}
                            >
                              <select
                                value={status}
                                onChange={(e) => {
                                  setSaveStatus("saving");
                                  updateAttendanceRecord(session.id, std.id, e.target.value as any);
                                  setTimeout(() => setSaveStatus("saved"), 300);
                                }}
                                style={{ textAlignLast: "center" }}
                                className={`w-9 h-8 rounded-xl text-center text-xs font-bold cursor-pointer outline-none border-none appearance-none transition-all ${badgeStyle}`}
                              >
                                <option value="มา" className="bg-card text-emerald-600 font-bold dark:bg-card">มา</option>
                                <option value="ลา" className="bg-card text-amber-500 font-bold dark:bg-card">ลา</option>
                                <option value="ขาด" className="bg-card text-red-500 font-bold dark:bg-card">ขาด</option>
                                <option value="สาย" className="bg-card text-orange-500 font-bold dark:bg-card">สาย</option>
                                <option value="หยุด" className="bg-card text-slate-500 font-bold dark:bg-card">หยุด</option>
                              </select>
                            </td>
                          );
                        })}

                        {/* Summary Columns Data */}
                        <td className="p-3 text-center font-bold bg-emerald-500/5 text-emerald-600 border-r border-border">{stats.present}</td>
                        <td className="p-3 text-center font-bold bg-amber-400/5 text-amber-500 border-r border-border">{stats.leave}</td>
                        <td className="p-3 text-center font-bold bg-red-500/5 text-red-500 border-r border-border">{stats.absent}</td>
                        <td className="p-3 text-center font-bold bg-orange-500/5 text-orange-500 border-r border-border">{stats.late}</td>
                        <td className="p-3 text-center font-bold bg-slate-500/5 text-slate-500 border-r border-border">{stats.exempt}</td>
                        <td className={`p-3 text-center font-bold bg-emerald-600/10 border-r border-border ${stats.percent >= 80 ? "text-emerald-700" : "text-red-500"}`}>{stats.percent}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manage Session Modal */}
      {isManageSessionOpen && managingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">แก้ไข/ลบคาบเรียน</h3>
              <button
                onClick={() => setIsManageSessionOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ปิด
              </button>
            </div>

            <form onSubmit={handleUpdateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">วันที่สอน</label>
                <input
                  type="date"
                  value={manageSessionDate}
                  onChange={(e) => setManageSessionDate(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">คาบที่</label>
                <select
                  value={manageSessionNo}
                  onChange={(e) => setManageSessionNo(parseInt(e.target.value))}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500 text-foreground"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>คาบที่ {n}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={handleDeleteSession}
                  className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs font-bold hover:bg-red-500/10 text-red-600 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  ลบคาบเรียน
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManageSessionOpen(false)}
                    className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted text-foreground"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
