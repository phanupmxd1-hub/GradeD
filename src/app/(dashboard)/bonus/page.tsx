"use client";

import React, { useState, useMemo } from "react";
import { useGMSStore } from "@/lib/store";
import { 
  Award, 
  TrendingUp, 
  Clock, 
  Plus, 
  AlertCircle, 
  Search, 
  ArrowUpRight, 
  ChevronRight,
  Sparkles,
  Edit2,
  Trash2
} from "lucide-react";

export default function BonusPage() {
  const {
    students,
    activeClassroomId,
    activeSubjectId,
    activeSemesterId,
    bonusScores,
    addBonusScore,
    updateBonusScore,
    deleteBonusScore
  } = useGMSStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState("");
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState("");

  const activeStudents = useMemo(() => {
    return students
      .filter(s => s.classroomId === activeClassroomId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassroomId]);

  // Filtered bonus logs for active classroom/subject/semester
  const activeBonusLogs = useMemo(() => {
    return bonusScores
      .filter(b => (!b.subjectId || b.subjectId === activeSubjectId) && (!b.semesterId || b.semesterId === activeSemesterId))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [bonusScores, activeSubjectId, activeSemesterId]);

  // Calculations for Leaderboard
  const leaderboard = useMemo(() => {
    const map: Record<string, { student: typeof activeStudents[0]; score: number }> = {};
    
    activeStudents.forEach(std => {
      map[std.id] = { student: std, score: 0 };
    });

    activeBonusLogs.forEach(log => {
      if (map[log.studentId]) {
        map[log.studentId].score += log.points;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
  }, [activeStudents, activeBonusLogs]);

  // Search filtered logs
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return activeBonusLogs;
    const query = searchQuery.toLowerCase();
    return activeBonusLogs.filter(log => {
      const std = activeStudents.find(s => s.id === log.studentId);
      return std?.firstName.toLowerCase().includes(query) || 
             std?.lastName.toLowerCase().includes(query) ||
             log.reason.toLowerCase().includes(query);
    });
  }, [activeBonusLogs, activeStudents, searchQuery]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !reason.trim()) return;

    addBonusScore(targetStudentId, points, reason);
    setReason("");
    setIsAddOpen(false);
    alert("บันทึกคะแนนจิตพิสัยพิเศษเรียบร้อยแล้ว");
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ระบบคะแนนจิตพิสัย & ความประพฤติ (Bonus System)</h2>
          <p className="text-sm text-muted-foreground">
            บันทึกคะแนนพฤติกรรมบวกและลบ เพื่อส่งเสริมการเรียนรู้ของนักเรียน พร้อมกระดานคะแนนผู้นำ
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          บันทึกพฤติกรรม
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Leaderboard Panel */}
        <div className="glass rounded-3xl p-6 border border-border flex flex-col h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              ผู้นำคะแนนพฤติกรรมดีเด่น (Top 10)
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">เรียลไทม์</span>
          </div>

          <div className="space-y-3">
            {leaderboard.map((item, index) => {
              const std = item.student;
              const place = index + 1;
              return (
                <div key={std.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      place === 1 ? "bg-amber-400 text-amber-950" :
                      place === 2 ? "bg-zinc-300 text-zinc-800" :
                      place === 3 ? "bg-amber-600 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {place}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{std.prefix}{std.firstName} {std.lastName}</p>
                      <p className="text-[9px] text-muted-foreground">เลขที่ {std.rollNo}</p>
                    </div>
                  </div>

                  <span className={`text-xs font-bold ${item.score > 0 ? "text-emerald-600" : item.score < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {item.score > 0 ? `+${item.score}` : item.score} คะแนน
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transactions Logs Panel */}
        <div className="lg:col-span-2 glass rounded-3xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              ประวัติการบันทึกคะแนนพฤติกรรมทั้งหมดในเทอมนี้
            </span>
            <div className="relative max-w-xs">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ค้นหารายการ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-2xl border border-border bg-background py-1.5 pr-3 pl-8 text-xs outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/20 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-4 w-16 text-center">เลขที่</th>
                  <th className="p-4">นักเรียน</th>
                  <th className="p-4">พฤติกรรม / กิจกรรม</th>
                  <th className="p-4 w-28 text-center">คะแนน</th>
                  <th className="p-4 w-32">วันที่บันทึก</th>
                  <th className="p-4 w-24 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      <p className="font-semibold text-sm">ไม่พบประวัติคะแนนจิตพิสัย</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const std = activeStudents.find(s => s.id === log.studentId);
                    return (
                      <tr key={log.id} className="hover:bg-muted/10">
                        <td className="p-4 text-center font-semibold text-muted-foreground">{std?.rollNo || "-"}</td>
                        <td className="p-4 font-semibold text-foreground">
                          {std ? `${std.prefix}${std.firstName} ${std.lastName}` : "ไม่ระบุชื่อ"}
                        </td>
                        <td className="p-4 text-foreground">{log.reason}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.points > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"}`}>
                            {log.points > 0 ? `+${log.points}` : log.points}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{new Date(log.timestamp).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                const newPoints = prompt("ระบุคะแนนใหม่ (เช่น 1, -1)", log.points.toString());
                                if (newPoints === null) return;
                                const parsedPoints = parseInt(newPoints);
                                if (isNaN(parsedPoints)) return alert("คะแนนต้องเป็นตัวเลข");
                                
                                const newReason = prompt("ระบุเหตุผล", log.reason);
                                if (newReason === null) return;
                                
                                updateBonusScore(log.id, parsedPoints, newReason);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="แก้ไข"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("คุณต้องการลบการบันทึกคะแนนนี้ใช่หรือไม่?")) {
                                  deleteBonusScore(log.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-emerald-600" />
              บันทึกคะแนนพฤติกรรม / กิจกรรมพิเศษ
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">เลือกนักเรียน</label>
                <select
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value="">-- กรุณาเลือกนักเรียน --</option>
                  {activeStudents.map(std => (
                    <option key={std.id} value={std.id}>
                      เลขที่ {std.rollNo} - {std.prefix}{std.firstName} {std.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">ประเภทรายการ</label>
                  <select
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value))}
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value={1}>+1 คะแนน (ชมเชย)</option>
                    <option value={2}>+2 คะแนน (ดีเด่น)</option>
                    <option value={3}>+3 คะแนน (พิเศษยอดเยี่ยม)</option>
                    <option value={5}>+5 คะแนน (เกียรติประวัติ)</option>
                    <option value={-1}>-1 คะแนน (หักคะแนนพฤติกรรม)</option>
                    <option value={-2}>-2 คะแนน (หักรุนแรง)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">เหตุผลพฤติกรรม</label>
                  <input
                    type="text"
                    placeholder="เช่น ตอบคำถามวิทย์ได้ดี"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  ยืนยันบันทึกพฤติกรรม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
