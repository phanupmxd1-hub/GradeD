"use client";

import React, { useState, useMemo } from "react";
import { useGMSStore, Student, ScoreComponent } from "@/lib/store";
import { 
  Plus, 
  Trash2, 
  Settings, 
  ClipboardPaste, 
  Undo2, 
  Redo2, 
  Sliders, 
  Award, 
  BookOpen, 
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  Users,
  GraduationCap,
  Sparkles,
  Zap,
  MoreVertical,
  Check,
  RotateCcw
} from "lucide-react";

export default function ScoresPage() {
  const {
    students,
    activeClassroomId,
    activeSubjectId,
    activeSemesterId,
    activeAcademicYearId,
    academicYears,
    semesters,
    classrooms,
    subjects,
    scoreComponents,
    scores,
    bonusScores,
    gradeResults,
    updateScore,
    bulkUpdateScores,
    undoScore,
    redoScore,
    undoStack,
    redoStack,
    addScoreComponent,
    updateScoreComponent,
    deleteScoreComponent,
    addBonusScore,
    calculateGrades,
    saveAccountData,
    syncStatus,
    lastSavedTime
  } = useGMSStore();

  // Active Context metadata
  const currentClass = classrooms.find(c => c.id === activeClassroomId);
  const currentSubject = subjects.find(s => s.id === activeSubjectId);
  const currentYear = academicYears.find(y => y.id === activeAcademicYearId);
  const currentSemester = semesters.find(s => s.id === activeSemesterId);

  // Modals state
  const [isCompOpen, setIsCompOpen] = useState(false);
  const [isEditCompOpen, setIsEditCompOpen] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [isFillDefaultOpen, setIsFillDefaultOpen] = useState(false);
  
  // Selection/State for actions
  const [editingComp, setEditingComp] = useState<ScoreComponent | null>(null);
  const [activeCompForPaste, setActiveCompForPaste] = useState<string | null>(null);
  const [activeCompForFill, setActiveCompForFill] = useState<ScoreComponent | null>(null);
  const [pastedScoresText, setPastedScoresText] = useState("");
  const [defaultFillValue, setDefaultFillValue] = useState<number>(10);
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);
  
  // Bonus score form
  const [bonusStudentId, setBonusStudentId] = useState("");
  const [bonusPoints, setBonusPoints] = useState(1);
  const [bonusReason, setBonusReason] = useState("");

  // Score Component Form
  const [compName, setCompName] = useState("");
  const [compType, setCompType] = useState<ScoreComponent["type"]>("assignment");
  const [compMaxScore, setCompMaxScore] = useState(10);
  const [compWeight, setCompWeight] = useState(10);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");

  // Save feedback state
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ studentId: string; compId: string } | null>(null);

  // Active students sorted by roll number
  const activeStudents = useMemo(() => {
    return students
      .filter(s => s.classroomId === activeClassroomId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassroomId]);

  // Active score components sorted by order
  const activeComponents = useMemo(() => {
    return scoreComponents
      .filter(c => c.classroomId === activeClassroomId && 
                   c.subjectId === activeSubjectId && 
                   c.semesterId === activeSemesterId)
      .sort((a, b) => a.order - b.order);
  }, [scoreComponents, activeClassroomId, activeSubjectId, activeSemesterId]);

  // Total weight percentage
  const totalWeightPercent = useMemo(() => {
    return activeComponents.reduce((sum, c) => sum + (Number(c.weightPercent) || 0), 0);
  }, [activeComponents]);

  // Map scores by studentId_scoreComponentId
  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    scores.forEach(s => {
      map[`${s.studentId}_${s.scoreComponentId}`] = s.score;
    });
    return map;
  }, [scores]);

  // Map grade results by studentId
  const gradeMap = useMemo(() => {
    const map: Record<string, { total: number; grade: string; bonus: number; gpa: number; isLocked: boolean }> = {};
    gradeResults
      .filter(g => g.subjectId === activeSubjectId && g.semesterId === activeSemesterId)
      .forEach(g => {
        map[g.studentId] = { 
          total: g.totalScore, 
          grade: g.grade, 
          bonus: g.bonusScoreSum,
          gpa: g.gpaPoints,
          isLocked: g.isLocked
        };
      });
    return map;
  }, [gradeResults, activeSubjectId, activeSemesterId]);

  // Filtered students by search query and grade filter
  const filteredStudents = useMemo(() => {
    return activeStudents.filter(std => {
      const matchQuery = !searchQuery.trim() || 
        std.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(std.rollNo).includes(searchQuery.trim());

      if (!matchQuery) return false;

      const res = gradeMap[std.id];
      if (gradeFilter === "ALL") return true;
      if (gradeFilter === "GRADE_4") return res?.grade === "4";
      if (gradeFilter === "GRADE_0") return res?.grade === "0";
      if (gradeFilter === "UNGRADED") {
        return activeComponents.some(c => scoreMap[`${std.id}_${c.id}`] === undefined);
      }
      if (gradeFilter === "PASSED") return res && res.grade !== "0";

      return true;
    });
  }, [activeStudents, searchQuery, gradeFilter, gradeMap, activeComponents, scoreMap]);

  // Live Overall Class Analytics
  const classAnalytics = useMemo(() => {
    let totalGradedStudents = 0;
    let sumGpa = 0;
    let countGpa = 0;
    let gradeCounts: Record<string, number> = { "4": 0, "3.5": 0, "3": 0, "2.5": 0, "2": 0, "1.5": 0, "1": 0, "0": 0 };

    activeStudents.forEach(std => {
      const res = gradeMap[std.id];
      if (res) {
        if (gradeCounts[res.grade] !== undefined) {
          gradeCounts[res.grade]++;
        }
        sumGpa += res.gpa;
        countGpa++;
        
        // Check if student has at least 1 graded score
        const hasScore = activeComponents.some(c => scoreMap[`${std.id}_${c.id}`] !== undefined);
        if (hasScore) totalGradedStudents++;
      }
    });

    const meanGPA = countGpa > 0 ? (sumGpa / countGpa).toFixed(2) : "0.00";
    const passCount = countGpa - (gradeCounts["0"] || 0);
    const passRate = countGpa > 0 ? Math.round((passCount / countGpa) * 100) : 100;

    return {
      totalGradedStudents,
      meanGPA,
      passRate,
      gradeCounts
    };
  }, [activeStudents, gradeMap, activeComponents, scoreMap]);

  // Calculation for columns statistics
  const columnStats = useMemo(() => {
    const stats: Record<string, { mean: number; max: number; min: number; passRate: number }> = {};

    activeComponents.forEach(comp => {
      let sum = 0;
      let count = 0;
      let maxVal = -Infinity;
      let minVal = Infinity;
      let passCount = 0;

      activeStudents.forEach(std => {
        const val = scoreMap[`${std.id}_${comp.id}`];
        if (val !== undefined) {
          sum += val;
          count++;
          if (val > maxVal) maxVal = val;
          if (val < minVal) minVal = val;
          if (val >= comp.maxScore * 0.5) {
            passCount++;
          }
        }
      });

      stats[comp.id] = {
        mean: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
        max: maxVal === -Infinity ? 0 : maxVal,
        min: minVal === Infinity ? 0 : minVal,
        passRate: count > 0 ? Math.round((passCount / count) * 100) : 100
      };
    });

    return stats;
  }, [activeComponents, activeStudents, scoreMap]);

  // Cell keydown navigations (Arrow keys / Enter / Tab)
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    componentIndex: number
  ) => {
    const inputEl = e.currentTarget;

    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(studentIndex + 1, componentIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(studentIndex - 1, componentIndex);
    } else if (e.key === "ArrowRight" && inputEl.selectionStart === inputEl.value.length) {
      e.preventDefault();
      focusCell(studentIndex, componentIndex + 1);
    } else if (e.key === "ArrowLeft" && inputEl.selectionStart === 0) {
      e.preventDefault();
      focusCell(studentIndex, componentIndex - 1);
    }
  };

  const focusCell = (stdIdx: number, compIdx: number) => {
    if (stdIdx >= 0 && stdIdx < filteredStudents.length && compIdx >= 0 && compIdx < activeComponents.length) {
      const targetStd = filteredStudents[stdIdx];
      const targetComp = activeComponents[compIdx];
      const inputId = `score-${targetStd.id}-${targetComp.id}`;
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    }
  };

  const handleScoreChange = (studentId: string, comp: ScoreComponent, valString: string) => {
    if (valString === "") {
      const cellId = `${studentId}_${comp.id}`;
      setSavingCell(cellId);
      updateScore(studentId, comp.id, 0);
      setTimeout(() => setSavingCell(null), 400);
      return;
    }

    let val = parseFloat(valString);
    if (isNaN(val)) return;
    
    if (val > comp.maxScore) {
      alert(`⚠️ คะแนนห้ามเกินคะแนนเต็ม (${comp.maxScore} คะแนน) สำหรับช่อง ${comp.name}`);
      return;
    }
    if (val < 0) return;

    const cellId = `${studentId}_${comp.id}`;
    setSavingCell(cellId);
    updateScore(studentId, comp.id, val);
    
    setTimeout(() => {
      setSavingCell(null);
    }, 400);
  };

  // Quick Action: Fill Max / Default to all students
  const handleFillAllScores = (comp: ScoreComponent, fillScore: number) => {
    const updates = filteredStudents.map(std => ({
      studentId: std.id,
      scoreComponentId: comp.id,
      scoreVal: Math.min(comp.maxScore, Math.max(0, fillScore))
    }));

    bulkUpdateScores(updates);
    setOpenColumnMenuId(null);
    setIsFillDefaultOpen(false);
  };

  // Quick Action: Clear Column Scores
  const handleClearColumnScores = (comp: ScoreComponent) => {
    if (confirm(`คุณต้องการล้างคะแนนทั้งหมดในช่อง "${comp.name}" ใช่หรือไม่?`)) {
      const updates = filteredStudents.map(std => ({
        studentId: std.id,
        scoreComponentId: comp.id,
        scoreVal: 0
      }));
      bulkUpdateScores(updates);
      setOpenColumnMenuId(null);
    }
  };

  // Bulk Paste Scores from Excel
  const handleExecutePasteScores = () => {
    if (!activeCompForPaste || !pastedScoresText.trim()) return;

    const comp = activeComponents.find(c => c.id === activeCompForPaste);
    if (!comp) return;

    const lines = pastedScoresText.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    const updates: { studentId: string; scoreComponentId: string; scoreVal: number }[] = [];

    filteredStudents.forEach((std, idx) => {
      if (lines[idx] !== undefined) {
        let val = parseFloat(lines[idx]);
        if (isNaN(val)) val = 0;
        if (val <= comp.maxScore && val >= 0) {
          updates.push({
            studentId: std.id,
            scoreComponentId: comp.id,
            scoreVal: val
          });
        }
      }
    });

    if (updates.length > 0) {
      bulkUpdateScores(updates);
      setPastedScoresText("");
      setIsPasteOpen(false);
      alert(`✅ วางคะแนนคอลัมน์ "${comp.name}" จำนวน ${updates.length} คน เรียบร้อยแล้ว`);
    } else {
      alert("⚠️ ไม่พบข้อมูลตัวเลขคะแนนที่ถูกต้อง");
    }
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (activeStudents.length === 0) return;

    let headers = ["เลขที่", "คำนำหน้า", "ชื่อ", "นามสกุล"];
    activeComponents.forEach(c => {
      headers.push(`${c.name} (${c.maxScore})`);
    });
    headers.push("จิตพิสัย", "คะแนนรวม", "เกรด", "GPA");

    let rows: string[][] = [];
    activeStudents.forEach(std => {
      const res = gradeMap[std.id] || { total: 0, grade: "0", bonus: 0, gpa: 0 };
      let row = [
        String(std.rollNo),
        std.prefix || "",
        std.firstName,
        std.lastName
      ];
      activeComponents.forEach(c => {
        row.push(String(scoreMap[`${std.id}_${c.id}`] ?? 0));
      });
      row.push(String(res.bonus), String(res.total), String(res.grade), String(res.gpa));
      rows.push(row);
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ตารางคะแนน_${currentClass?.name || "ห้อง"}_${currentSubject?.code || "วิชา"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Component Creator
  const handleAddComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;

    addScoreComponent({
      name: compName,
      type: compType,
      maxScore: compMaxScore,
      weightPercent: compWeight
    });

    setCompName("");
    setCompMaxScore(10);
    setCompWeight(10);
    setIsCompOpen(false);
  };

  // Component Editor
  const handleEditComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp || !compName.trim()) return;

    updateScoreComponent({
      ...editingComp,
      name: compName,
      type: compType,
      maxScore: compMaxScore,
      weightPercent: compWeight
    });

    setIsEditCompOpen(false);
    setEditingComp(null);
    setCompName("");
    setCompMaxScore(10);
    setCompWeight(10);
  };

  const handleOpenEditComponent = (comp: ScoreComponent) => {
    setEditingComp(comp);
    setCompName(comp.name);
    setCompType(comp.type);
    setCompMaxScore(comp.maxScore);
    setCompWeight(comp.weightPercent);
    setIsEditCompOpen(true);
    setOpenColumnMenuId(null);
  };

  const handleDeleteComponent = (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบชิ้นงาน "${name}"? ข้อมูลคะแนนในช่องนี้จะถูกลบ`)) {
      deleteScoreComponent(id);
      setOpenColumnMenuId(null);
    }
  };

  // Bonus Points Submit
  const handleAddBonusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusStudentId || !bonusReason.trim()) return;

    addBonusScore(bonusStudentId, bonusPoints, bonusReason);
    setBonusReason("");
    setIsBonusOpen(false);
  };

  // Helper Badge Color for Component Types
  const getComponentTypeBadge = (type: ScoreComponent["type"]) => {
    switch (type) {
      case "assignment":
        return { label: "ใบงาน", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      case "quiz":
        return { label: "สอบย่อย", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
      case "exam":
        return { label: "สอบกลาง/ปลาย", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      case "project":
        return { label: "โครงงาน", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
      default:
        return { label: "อื่นๆ", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" };
    }
  };

  // Helper Badge Color for Grade Pills
  const getGradePill = (grade: string) => {
    if (grade === "4" || grade === "3.5") {
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    }
    if (grade === "3" || grade === "2.5") {
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    }
    if (grade === "2" || grade === "1.5" || grade === "1") {
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    }
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Hero Context Card & Class Summary */}
      <div className="glass rounded-3xl p-6 border border-border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              ห้อง {currentClass?.name || "ระบุห้องเรียน"}
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {currentSubject ? `${currentSubject.code} ${currentSubject.name}` : "ระบุวิชาเรียน"}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              ปี {currentYear?.year || 2569} / เทอม {currentSemester?.semesterNo || 1}
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-emerald-600" />
            ตารางบันทึกผลการเรียนและตัดเกรด
          </h2>

          {/* Weight percentage indicator */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-muted-foreground">น้ำหนักคะแนนรวม:</span>
              <span className={`font-bold ${totalWeightPercent === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                {totalWeightPercent}% / 100%
              </span>
              {totalWeightPercent === 100 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
              ) : (
                <span className="text-[10px] text-amber-500 font-normal">
                  (แนะนำให้ตั้งให้ครบ 100%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Class Metric Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center min-w-[90px]">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">นักเรียนทั้งหมด</span>
            <span className="text-lg font-black text-foreground">{activeStudents.length} คน</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center justify-center min-w-[90px]">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">ตรวจแล้ว</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{classAnalytics.totalGradedStudents} คน</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex flex-col items-center justify-center min-w-[90px]">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">GPAX เฉลี่ย</span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{classAnalytics.meanGPA}</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex flex-col items-center justify-center min-w-[90px]">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">สอบผ่าน</span>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400">{classAnalytics.passRate}%</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Search and Grade Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือเลขที่..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card/80 pl-9 pr-4 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all text-foreground"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-2xl border border-border text-xs">
            {[
              { id: "ALL", label: "ทั้งหมด" },
              { id: "PASSED", label: "ผ่านเกณฑ์" },
              { id: "GRADE_4", label: "เกรด 4" },
              { id: "GRADE_0", label: "ติด 0" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setGradeFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  gradeFilter === f.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex bg-muted/50 p-1 rounded-2xl border border-border">
            <button
              onClick={undoScore}
              disabled={undoStack.length === 0}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 hover:bg-card active:scale-95 transition-all"
              title="ย้อนกลับ (Undo)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redoScore}
              disabled={redoStack.length === 0}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 hover:bg-card active:scale-95 transition-all"
              title="ทำซ้ำ (Redo)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setIsBonusOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 px-3.5 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Award className="h-4 w-4" />
            คะแนนจิตพิสัย (+/-)
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-2xl bg-card border border-border px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm"
            title="ดาวน์โหลดไฟล์ Excel (.csv)"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            ส่งออก Excel
          </button>

          <button
            onClick={() => setIsCompOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-600/15"
          >
            <Plus className="h-4 w-4" />
            เพิ่มชิ้นงานเก็บคะแนน
          </button>
        </div>
      </div>

      {/* Main Score Grid Table */}
      <div className="glass rounded-3xl border border-border overflow-hidden shadow-sm">
        
        {/* Table Instructions / Quick Info Bar */}
        <div className="p-3 px-5 border-b border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>ใช้ปุ่มลูกศร <strong>(↑ ↓ ← →)</strong> หรือ <strong>Enter</strong> เพื่อเลื่อนช่องคะแนนอัตโนมัติ</span>
          </div>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
            ⚡ ระบบ Auto-Save บันทึกขึ้น Cloud อัตโนมัติ
          </span>
        </div>

        {/* Scrollable Data Table */}
        <div className="overflow-x-auto max-h-[560px] relative">
          <table className="w-full text-left text-xs border-collapse">
            
            {/* Table Header */}
            <thead className="bg-muted/70 sticky top-0 z-30 border-b border-border select-none backdrop-blur-md">
              <tr>
                <th className="p-3.5 w-14 text-center bg-muted/95 border-r border-border sticky left-0 z-30 font-bold text-foreground">
                  เลขที่
                </th>
                <th className="p-3.5 w-48 bg-muted/95 border-r border-border sticky left-14 z-30 font-bold text-foreground">
                  ชื่อ - นามสกุล
                </th>
                
                {/* Dynamic Component Columns */}
                {activeComponents.length === 0 ? (
                  <th className="p-4 text-center text-muted-foreground italic font-medium">
                    ยังไม่มีชิ้นงานเก็บคะแนน (กด &quot;+ เพิ่มชิ้นงานเก็บคะแนน&quot; ด้านบนเพื่อเริ่มต้น)
                  </th>
                ) : (
                  activeComponents.map((comp, compIdx) => {
                    const typeBadge = getComponentTypeBadge(comp.type);
                    const isMenuOpen = openColumnMenuId === comp.id;

                    return (
                      <th 
                        key={comp.id} 
                        className={`p-3 text-center border-r border-border min-w-[130px] hover:bg-muted/80 transition-colors relative group ${
                          focusedCell?.compId === comp.id ? "bg-emerald-500/10" : ""
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border mb-1 ${typeBadge.bg}`}>
                            {typeBadge.label}
                          </span>
                          <div className="font-bold text-foreground text-xs truncate max-w-[110px]" title={comp.name}>
                            {comp.name}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            เต็ม {comp.maxScore} ({comp.weightPercent}%)
                          </div>
                        </div>

                        {/* Column Quick Action Dropdown Trigger */}
                        <div className="absolute right-1 top-2">
                          <button
                            onClick={() => setOpenColumnMenuId(isMenuOpen ? null : comp.id)}
                            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                            title="ตัวเลือกคอลัมน์"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {/* Column Action Dropdown Menu */}
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl bg-card border border-border p-1.5 shadow-2xl z-50 animate-in zoom-in-95 duration-150 text-left">
                              <button
                                onClick={() => {
                                  setActiveCompForPaste(comp.id);
                                  setIsPasteOpen(true);
                                  setOpenColumnMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-xl"
                              >
                                <ClipboardPaste className="h-3.5 w-3.5 text-emerald-600" />
                                วางคะแนนจาก Excel
                              </button>
                              <button
                                onClick={() => {
                                  setActiveCompForFill(comp);
                                  setDefaultFillValue(comp.maxScore);
                                  setIsFillDefaultOpen(true);
                                  setOpenColumnMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-xl"
                              >
                                <Zap className="h-3.5 w-3.5 text-amber-500" />
                                ให้คะแนนเท่ากันทุกคน
                              </button>
                              <button
                                onClick={() => handleFillAllScores(comp, comp.maxScore)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-xl"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                                ให้คะแนนเต็มทุกคน ({comp.maxScore})
                              </button>
                              <button
                                onClick={() => handleClearColumnScores(comp)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 rounded-xl"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                ล้างคะแนนในช่องนี้
                              </button>
                              <div className="h-px bg-border my-1" />
                              <button
                                onClick={() => handleOpenEditComponent(comp)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-xl"
                              >
                                <Settings className="h-3.5 w-3.5 text-slate-500" />
                                แก้ไขชื่อ / คะแนนเต็ม
                              </button>
                              <button
                                onClick={() => handleDeleteComponent(comp.id, comp.name)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 rounded-xl"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                ลบคอลัมน์นี้
                              </button>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })
                )}

                {/* Summaries Headers */}
                <th className="p-3 w-16 text-center bg-amber-500/5 text-amber-600 border-r border-border font-bold">
                  จิตพิสัย
                </th>
                <th className="p-3 w-20 text-center bg-emerald-500/5 text-emerald-600 border-r border-border font-bold">
                  คะแนนรวม
                </th>
                <th className="p-3 w-16 text-center bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-black">
                  เกรด
                </th>
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={activeComponents.length + 5} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-bold text-sm text-foreground">ไม่พบรายชื่อนักเรียนตามเงื่อนไข</p>
                      <p className="text-xs">กรุณาตรวจสอบการค้นหา หรือเลือกห้องเรียนที่มีนักเรียน</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, stdIdx) => {
                  const result = gradeMap[std.id] || { total: 0, grade: "0", bonus: 0, gpa: 0, isLocked: false };
                  const isCurrentRowFocused = focusedCell?.studentId === std.id;
                  
                  return (
                    <tr 
                      key={std.id} 
                      className={`hover:bg-muted/15 transition-colors ${isCurrentRowFocused ? "bg-emerald-500/5" : ""}`}
                    >
                      {/* Frozen Left Columns */}
                      <td className="p-3 text-center font-bold bg-card border-r border-border sticky left-0 z-20 text-foreground">
                        {std.rollNo}
                      </td>
                      <td className="p-3 font-semibold text-foreground bg-card border-r border-border sticky left-14 z-20 truncate max-w-[190px]">
                        <span className="text-muted-foreground text-[11px] mr-1">{std.prefix}</span>
                        {std.firstName} {std.lastName}
                      </td>

                      {/* Dynamic Score Cells */}
                      {activeComponents.map((comp, compIdx) => {
                        const rawVal = scoreMap[`${std.id}_${comp.id}`];
                        const scoreVal = rawVal !== undefined ? rawVal : "";
                        const cellId = `${std.id}_${comp.id}`;
                        const isSaving = savingCell === cellId;
                        const isCellFocused = focusedCell?.studentId === std.id && focusedCell?.compId === comp.id;

                        // Score Coloring
                        const isHighScore = rawVal !== undefined && rawVal >= comp.maxScore * 0.8;
                        const isLowScore = rawVal !== undefined && rawVal < comp.maxScore * 0.5;

                        return (
                          <td 
                            key={comp.id} 
                            className={`p-1 text-center border-r border-border relative transition-all ${
                              isSaving ? "bg-emerald-500/20" : isCellFocused ? "bg-emerald-500/10 ring-2 ring-emerald-500/30 rounded-xl" : ""
                            }`}
                          >
                            <input
                              type="number"
                              id={`score-${std.id}-${comp.id}`}
                              value={scoreVal}
                              onChange={(e) => handleScoreChange(std.id, comp, e.target.value)}
                              onKeyDown={(e) => handleInputKeyDown(e, stdIdx, compIdx)}
                              onFocus={() => setFocusedCell({ studentId: std.id, compId: comp.id })}
                              onBlur={() => setFocusedCell(null)}
                              min={0}
                              max={comp.maxScore}
                              step={0.5}
                              className={`w-full text-center font-bold py-2 outline-none rounded-xl transition-all ${
                                isHighScore
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : isLowScore
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-foreground"
                              } focus:bg-background focus:ring-2 focus:ring-emerald-500 shadow-sm`}
                            />
                            
                            {/* Saving status indicator */}
                            {isSaving && (
                              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            )}
                          </td>
                        );
                      })}

                      {/* Summaries Columns */}
                      <td className="p-3 text-center font-bold bg-amber-500/5 text-amber-600 dark:text-amber-400 border-r border-border">
                        {result.bonus > 0 ? `+${result.bonus}` : result.bonus}
                      </td>
                      <td className="p-3 text-center font-black bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-r border-border">
                        {result.total}
                      </td>
                      <td className="p-3 text-center font-black">
                        <span className={`px-2.5 py-1 rounded-xl text-xs border font-black ${getGradePill(result.grade)}`}>
                          {result.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Statistics Summary Rows */}
              {activeComponents.length > 0 && filteredStudents.length > 0 && (
                <>
                  {/* Mean Score */}
                  <tr className="bg-muted/40 font-bold border-t-2 border-border text-foreground">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/95 border-r border-border text-xs">
                      คะแนนเฉลี่ย (Mean)
                    </td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border text-emerald-600 dark:text-emerald-400 font-bold">
                        {columnStats[comp.id]?.mean ?? 0}
                      </td>
                    ))}
                    <td colSpan={3} className="bg-muted/30" />
                  </tr>
                  
                  {/* Max Score */}
                  <tr className="bg-muted/20 font-semibold text-foreground">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/90 border-r border-border text-xs">
                      คะแนนสูงสุด (Max)
                    </td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border text-blue-600 dark:text-blue-400 font-bold">
                        {columnStats[comp.id]?.max ?? 0}
                      </td>
                    ))}
                    <td colSpan={3} className="bg-muted/15" />
                  </tr>
                  
                  {/* Min Score */}
                  <tr className="bg-muted/20 font-semibold text-foreground">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/90 border-r border-border text-xs">
                      คะแนนต่ำสุด (Min)
                    </td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border text-rose-500 font-bold">
                        {columnStats[comp.id]?.min ?? 0}
                      </td>
                    ))}
                    <td colSpan={3} className="bg-muted/15" />
                  </tr>
                  
                  {/* Pass Rate */}
                  <tr className="bg-emerald-500/5 font-black text-emerald-700 dark:text-emerald-400">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/90 border-r border-border text-xs">
                      เปอร์เซ็นต์ผ่าน (&ge; 50%)
                    </td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border">
                        {columnStats[comp.id]?.passRate ?? 100}%
                      </td>
                    ))}
                    <td colSpan={3} className="bg-emerald-500/5" />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade Distribution Bar */}
      <div className="glass rounded-3xl p-5 border border-border">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          การกระจายตัวของเกรดทั้งห้องเรียน (Live Grade Distribution)
        </h4>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {["4", "3.5", "3", "2.5", "2", "1.5", "1", "0"].map((g) => {
            const count = classAnalytics.gradeCounts[g] || 0;
            const percent = activeStudents.length > 0 ? Math.round((count / activeStudents.length) * 100) : 0;

            return (
              <div 
                key={g} 
                className="p-3 rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center text-center transition-all hover:bg-muted/70"
              >
                <span className={`px-2 py-0.5 rounded-lg text-xs font-black mb-1 ${getGradePill(g)}`}>
                  เกรด {g}
                </span>
                <span className="text-base font-black text-foreground">{count} คน</span>
                <span className="text-[10px] text-muted-foreground font-semibold">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Component Dialog Modal */}
      {isCompOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-foreground">
              <Sliders className="h-5 w-5 text-emerald-600" />
              เพิ่มชิ้นงานเก็บคะแนนใหม่
            </h3>

            <form onSubmit={handleAddComponentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อชิ้นงาน / ใบงาน</label>
                <input
                  type="text"
                  placeholder="เช่น ใบงานที่ 3: ระบบนิเวศ"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-foreground font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ประเภทคะแนน</label>
                <select
                  value={compType}
                  onChange={(e: any) => setCompType(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500 text-foreground cursor-pointer font-medium"
                >
                  <option value="assignment">📝 การบ้าน / ใบงาน (Assignment)</option>
                  <option value="quiz">⚡ ทดสอบย่อย (Quiz)</option>
                  <option value="exam">🎯 สอบกลาง/ปลายภาค (Exam)</option>
                  <option value="project">💡 โครงงาน/ชิ้นงานใหญ่ (Project)</option>
                  <option value="other">📦 คะแนนอื่นๆ (Other)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">คะแนนเต็ม (Max Score)</label>
                  <input
                    type="number"
                    value={compMaxScore}
                    onChange={(e) => setCompMaxScore(parseFloat(e.target.value))}
                    min={1}
                    max={100}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none text-foreground font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">น้ำหนักคะแนน (%)</label>
                  <input
                    type="number"
                    value={compWeight}
                    onChange={(e) => setCompWeight(parseFloat(e.target.value))}
                    min={1}
                    max={100}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none text-foreground font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCompOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  บันทึกชิ้นงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Component Dialog Modal */}
      {isEditCompOpen && editingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
            <h3 className="text-lg font-black mb-4 text-foreground flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-600" />
              แก้ไขข้อมูลชิ้นงานคะแนน
            </h3>

            <form onSubmit={handleEditComponentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อชิ้นงาน / ใบงาน</label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-foreground font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ประเภทคะแนน</label>
                <select
                  value={compType}
                  onChange={(e: any) => setCompType(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500 text-foreground cursor-pointer font-medium"
                >
                  <option value="assignment">📝 การบ้าน / ใบงาน</option>
                  <option value="quiz">⚡ ทดสอบย่อย</option>
                  <option value="exam">🎯 สอบกลาง/ปลายภาค</option>
                  <option value="project">💡 โครงงาน/ชิ้นงานใหญ่</option>
                  <option value="other">📦 คะแนนอื่นๆ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">คะแนนเต็ม</label>
                  <input
                    type="number"
                    value={compMaxScore}
                    onChange={(e) => setCompMaxScore(parseFloat(e.target.value))}
                    min={1}
                    max={100}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none text-foreground font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">น้ำหนักคะแนน (%)</label>
                  <input
                    type="number"
                    value={compWeight}
                    onChange={(e) => setCompWeight(parseFloat(e.target.value))}
                    min={1}
                    max={100}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none text-foreground font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditCompOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Paste Dialog Modal */}
      {isPasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass w-full max-w-lg rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
            <h3 className="text-lg font-black mb-2 flex items-center gap-2 text-foreground">
              <ClipboardPaste className="h-5 w-5 text-emerald-600" />
              วางคะแนนจาก Excel ในคอลัมน์นี้
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              คัดลอกเฉพาะคะแนน 1 คอลัมน์จาก Excel แล้วนำมาวางในกล่องด้านล่างนี้ ระบบจะเรียงใส่คะแนนให้นักเรียนตามเลขที่ 1, 2, 3... อัตโนมัติ
            </p>

            <textarea
              placeholder="วางคะแนนที่คัดลอกมา เช่น:&#10;10&#10;8.5&#10;9&#10;7.5"
              value={pastedScoresText}
              onChange={(e) => setPastedScoresText(e.target.value)}
              className="w-full h-44 rounded-2xl border border-border bg-background py-3 px-4 text-xs font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-foreground"
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setIsPasteOpen(false)}
                className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted text-foreground"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleExecutePasteScores}
                className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
              >
                บันทึกคะแนนด่วน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fill Default Score Dialog Modal */}
      {isFillDefaultOpen && activeCompForFill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass w-full max-w-sm rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
            <h3 className="text-lg font-black mb-2 flex items-center gap-2 text-foreground">
              <Zap className="h-5 w-5 text-amber-500" />
              กำหนดคะแนนเท่ากันทุกคน
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              ระบุคะแนนที่ต้องการใส่ให้กับนักเรียนทุกคนในคอลัมน์ <strong>&quot;{activeCompForFill.name}&quot;</strong> (คะแนนเต็ม {activeCompForFill.maxScore})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">คะแนนเริ่มต้น</label>
                <input
                  type="number"
                  value={defaultFillValue}
                  onChange={(e) => setDefaultFillValue(parseFloat(e.target.value))}
                  min={0}
                  max={activeCompForFill.maxScore}
                  step={0.5}
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-4 text-sm font-black text-center text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsFillDefaultOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleFillAllScores(activeCompForFill, defaultFillValue)}
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  ปรับใช้ทุกคน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Score Dialog Modal */}
      {isBonusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-foreground">
              <Award className="h-5 w-5 text-amber-500" />
              บันทึกคะแนนจิตพิสัย / ความประพฤติพิเศษ
            </h3>

            <form onSubmit={handleAddBonusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">เลือกนักเรียน</label>
                <select
                  value={bonusStudentId}
                  onChange={(e) => setBonusStudentId(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-xs font-semibold outline-none focus:border-emerald-500 text-foreground cursor-pointer"
                >
                  <option value="">-- กรุณาเลือกนักเรียน --</option>
                  {filteredStudents.map(std => (
                    <option key={std.id} value={std.id}>
                      เลขที่ {std.rollNo} - {std.prefix}{std.firstName} {std.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">คะแนน (Points)</label>
                  <select
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(parseInt(e.target.value))}
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-xs font-bold outline-none focus:border-emerald-500 text-foreground cursor-pointer"
                  >
                    <option value={1}>+1 คะแนน</option>
                    <option value={2}>+2 คะแนน</option>
                    <option value={3}>+3 คะแนน</option>
                    <option value={5}>+5 คะแนน</option>
                    <option value={-1}>-1 คะแนน (หักคะแนน)</option>
                    <option value={-2}>-2 คะแนน (หักคะแนน)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">กิจกรรม / พฤติกรรม</label>
                  <input
                    type="text"
                    placeholder="เช่น ช่วยจัดบอร์ดกิจกรรม"
                    value={bonusReason}
                    onChange={(e) => setBonusReason(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-xs outline-none text-foreground font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBonusOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"
                >
                  บันทึกคะแนนจิตพิสัย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
