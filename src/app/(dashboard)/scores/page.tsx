"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  RotateCcw,
  Save,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  Pencil
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
    gradeRules,
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
    lastSavedTime,
    hasUnsavedChanges
  } = useGMSStore();

  // Active Context metadata
  const currentClass = classrooms.find(c => c.id === activeClassroomId);
  const currentSubject = subjects.find(s => s.id === activeSubjectId);
  const currentYear = academicYears.find(y => y.id === activeAcademicYearId);
  const currentSemester = semesters.find(s => s.id === activeSemesterId);

  // Modals & Mode States
  const [isCompOpen, setIsCompOpen] = useState(false);
  const [isEditCompOpen, setIsEditCompOpen] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [isSpeedGradingOpen, setIsSpeedGradingOpen] = useState(false);
  
  // Speed Grading Mode State
  const [speedCompId, setSpeedCompId] = useState<string>("");
  const [speedStudentIdx, setSpeedStudentIdx] = useState<number>(0);
  const speedInputRef = useRef<HTMLInputElement | null>(null);

  // Selection/State for actions
  const [editingComp, setEditingComp] = useState<ScoreComponent | null>(null);
  const [activeCompForPaste, setActiveCompForPaste] = useState<string | null>(null);
  const [pastedScoresText, setPastedScoresText] = useState("");
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

  // Save feedback state
  const [focusedCell, setFocusedCell] = useState<{ studentId: string; compId: string; stdIdx: number; compIdx: number } | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Warn before closing if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  // Auto-select initial speed grading component
  useEffect(() => {
    if (activeComponents.length > 0 && !speedCompId) {
      setSpeedCompId(activeComponents[0].id);
    }
  }, [activeComponents, speedCompId]);

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

  // Map bonus scores dynamically to sync 100% with Bonus Page
  const studentBonusMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeStudents.forEach(std => {
      const totalBonus = bonusScores
        .filter(b => b.studentId === std.id && 
          (!b.subjectId || b.subjectId === activeSubjectId) && 
          (!b.semesterId || b.semesterId === activeSemesterId))
        .reduce((sum, b) => sum + (Number(b.points) || 0), 0);
      map[std.id] = totalBonus;
    });
    return map;
  }, [activeStudents, bonusScores, activeSubjectId, activeSemesterId]);

  // Map Real-time Student Grade Summary (Raw, Bonus, Total Score, Grade, GPA)
  const studentGradeSummary = useMemo(() => {
    const map: Record<string, { rawScore: number; bonus: number; total: number; grade: string; gpa: number }> = {};
    
    const calculateFinalGrade = (scoreSum: number, ranges: any[]) => {
      const found = ranges.find(r => scoreSum >= r.min && scoreSum <= r.max);
      return found ? { grade: found.grade, gpa: found.gpaPoints } : { grade: "0", gpa: 0 };
    };

    const ranges = gradeRules?.ranges || [
      { min: 80, max: 100, grade: "4", gpaPoints: 4.0 },
      { min: 75, max: 79.9, grade: "3.5", gpaPoints: 3.5 },
      { min: 70, max: 74.9, grade: "3", gpaPoints: 3.0 },
      { min: 65, max: 69.9, grade: "2.5", gpaPoints: 2.5 },
      { min: 60, max: 64.9, grade: "2", gpaPoints: 2.0 },
      { min: 55, max: 59.9, grade: "1.5", gpaPoints: 1.5 },
      { min: 50, max: 54.9, grade: "1", gpaPoints: 1.0 },
      { min: 0, max: 49.9, grade: "0", gpaPoints: 0.0 }
    ];

    activeStudents.forEach(std => {
      let rawScore = 0;
      activeComponents.forEach(comp => {
        const val = scoreMap[`${std.id}_${comp.id}`] ?? 0;
        if (comp.maxScore > 0) {
          rawScore += (val / comp.maxScore) * comp.weightPercent;
        }
      });

      const bonus = studentBonusMap[std.id] ?? 0;
      const total = Math.min(100, Math.max(0, Math.round((rawScore + bonus) * 10) / 10));
      const { grade, gpa } = calculateFinalGrade(total, ranges);

      map[std.id] = {
        rawScore: Math.round(rawScore * 10) / 10,
        bonus,
        total,
        grade,
        gpa
      };
    });

    return map;
  }, [activeStudents, activeComponents, scoreMap, studentBonusMap, gradeRules]);

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    return activeStudents.filter(std => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        std.firstName.toLowerCase().includes(q) ||
        std.lastName.toLowerCase().includes(q) ||
        `${std.prefix}${std.firstName} ${std.lastName}`.toLowerCase().includes(q) ||
        String(std.rollNo).includes(q)
      );
    });
  }, [activeStudents, searchQuery]);

  // Calculation for columns statistics
  const columnStats = useMemo(() => {
    const stats: Record<string, { mean: number; max: number; min: number; passRate: number; gradedCount: number }> = {};

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
        passRate: count > 0 ? Math.round((passCount / count) * 100) : 100,
        gradedCount: count
      };
    });

    return stats;
  }, [activeComponents, activeStudents, scoreMap]);

  // Manual Save Handler
  const handleManualSave = async () => {
    calculateGrades();
    await saveAccountData();
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3000);
  };

  // Active Speed Grading Component & Student
  const currentSpeedComp = activeComponents.find(c => c.id === speedCompId) || activeComponents[0];
  const currentSpeedStudent = activeStudents[speedStudentIdx];
  const currentSpeedScore = currentSpeedStudent && currentSpeedComp ? scoreMap[`${currentSpeedStudent.id}_${currentSpeedComp.id}`] : undefined;

  // Auto-focus input in Speed Grading Mode
  useEffect(() => {
    if (isSpeedGradingOpen && speedInputRef.current) {
      speedInputRef.current.focus();
      speedInputRef.current.select();
    }
  }, [isSpeedGradingOpen, speedStudentIdx, speedCompId]);

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

  // Score Input Change with smart zero overwrite (ไม่ต้องลบเลข 0 ให้กรอกได้เลย)
  const handleScoreChange = (studentId: string, comp: ScoreComponent, valString: string) => {
    if (valString === "") {
      updateScore(studentId, comp.id, 0);
      return;
    }

    let val = parseFloat(valString);
    if (isNaN(val)) return;
    
    if (val > comp.maxScore) {
      alert(`⚠️ คะแนนห้ามเกินคะแนนเต็ม (${comp.maxScore} คะแนน) สำหรับช่อง "${comp.name}"`);
      return;
    }
    if (val < 0) return;

    updateScore(studentId, comp.id, val);
  };

  // Quick Score Button Click (แตะปุ่มลงคะแนนแล้วเลื่อนไปคนถัดไปทันที)
  const handleQuickScoreButton = (scoreVal: number) => {
    if (!focusedCell) return;
    const { studentId, compId, stdIdx, compIdx } = focusedCell;
    const comp = activeComponents.find(c => c.id === compId);
    if (!comp) return;

    updateScore(studentId, comp.id, scoreVal);

    // Auto advance to next student
    if (stdIdx < filteredStudents.length - 1) {
      setTimeout(() => {
        focusCell(stdIdx + 1, compIdx);
      }, 50);
    }
  };

  // Speed Grading Action (Apply Score and jump to next student immediately)
  const handleApplySpeedScore = (val: number) => {
    if (!currentSpeedStudent || !currentSpeedComp) return;

    updateScore(currentSpeedStudent.id, currentSpeedComp.id, val);

    if (speedStudentIdx < activeStudents.length - 1) {
      setSpeedStudentIdx(prev => prev + 1);
    }
  };

  // Quick Action: Fill Max to all students
  const handleFillAllScores = (comp: ScoreComponent, fillScore: number) => {
    const updates = filteredStudents.map(std => ({
      studentId: std.id,
      scoreComponentId: comp.id,
      scoreVal: Math.min(comp.maxScore, Math.max(0, fillScore))
    }));

    bulkUpdateScores(updates);
    setOpenColumnMenuId(null);
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
      const res = studentGradeSummary[std.id] || { total: 0, grade: "0", bonus: 0, gpa: 0 };
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

  // Open Add Component Modal with smart proposed name
  const handleOpenAddComp = () => {
    const nextNum = activeComponents.length + 1;
    setCompName(`งาน ${nextNum}`);
    setCompType("assignment");
    setCompMaxScore(10);
    setCompWeight(10);
    setIsCompOpen(true);
  };

  // Component Creator Form Submit
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
    if (confirm(`คุณต้องการลบ "${name}" ใช่หรือไม่? ข้อมูลคะแนนในช่องนี้จะถูกลบ`)) {
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

  // Quick Score pills for active focused column
  const activeFocusedComp = focusedCell ? activeComponents.find(c => c.id === focusedCell.compId) : null;
  const currentFocusedScore = focusedCell ? scoreMap[`${focusedCell.studentId}_${focusedCell.compId}`] : undefined;

  // Preset values for quick scoring pills
  const getQuickScorePills = (max: number) => {
    const pills: number[] = [max];
    if (max >= 10) {
      pills.push(max * 0.9, max * 0.8, max * 0.7, max * 0.5, 0);
    } else {
      pills.push(max - 1, max - 2, 0);
    }
    return Array.from(new Set(pills.filter(p => p >= 0))).sort((a, b) => b - a);
  };

  // Grade Pill styling matching the screenshot
  const getGradePill = (grade: string) => {
    if (grade === "4" || grade === "3.5") {
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold";
    }
    if (grade === "3" || grade === "2.5") {
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold";
    }
    if (grade === "2" || grade === "1.5" || grade === "1") {
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold";
    }
    return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-bold";
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-20">
      
      {/* Top Action Bar: Save Button & Main Tools */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-3xl border border-border shadow-sm">
        
        {/* Left: Save button & Status */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleManualSave}
            disabled={syncStatus === "saving"}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer ${
              hasUnsavedChanges
                ? "bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-500/40 shadow-emerald-600/20"
                : "bg-card border border-border text-foreground hover:bg-muted"
            }`}
            title="กดบันทึกข้อมูลลง Supabase (Ctrl+S)"
          >
            {syncStatus === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                <span>กำลังบันทึกลงฐานข้อมูล...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>บันทึกข้อมูล (Ctrl+S)</span>
              </>
            )}
          </button>

          {/* Save Status Badge */}
          {hasUnsavedChanges ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              มีการแก้ไขที่ยังไม่ได้บันทึก
            </span>
          ) : lastSavedTime ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              บันทึกล่าสุด {lastSavedTime} น.
            </span>
          ) : null}
        </div>

        {/* Right: Actions (เพิ่มงาน, จิตพิสัย, โหมดตรวจด่วน, Undo/Redo) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Undo / Redo */}
          <div className="flex bg-muted/60 p-0.5 rounded-2xl border border-border">
            <button
              onClick={undoScore}
              disabled={undoStack.length === 0}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 hover:bg-card active:scale-95 transition-all"
              title="ย้อนกลับ (Undo - Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redoScore}
              disabled={redoStack.length === 0}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 hover:bg-card active:scale-95 transition-all"
              title="ทำซ้ำ (Redo - Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setIsSpeedGradingOpen(true);
              setSpeedStudentIdx(0);
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Zap className="h-4 w-4" />
            โหมดตรวจด่วน
          </button>

          <button
            onClick={() => setIsBonusOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Award className="h-4 w-4" />
            จิตพิสัย (+/-)
          </button>

          <button
            onClick={handleOpenAddComp}
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            เพิ่มงาน
          </button>
        </div>
      </div>

      {/* Main Table Card (Designed Exactly like User's Image Reference) */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        
        {/* Table Top Header Bar: Title on Left, Search on Right */}
        <div className="p-4 px-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              ตารางบันทึกวิชา {currentSubject?.name || "วิทยาศาสตร์"} (อัตโนมัติ)
            </span>
            <span className="text-[11px] text-muted-foreground">
              - ห้อง {currentClass?.name || "ม.1"}
            </span>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหานักเรียนด้วยชื่อ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background py-1.5 pl-9 pr-4 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-foreground transition-all"
            />
          </div>
        </div>

        {/* Floating Quick Scoring Bar when a cell is selected */}
        {activeFocusedComp && (
          <div className="px-6 py-2.5 bg-emerald-500/5 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                กำลังกรอกช่อง &quot;{activeFocusedComp.name}&quot; (เต็ม {activeFocusedComp.maxScore}):
              </span>
              <span className="text-muted-foreground text-[11px]">แตะปุ่มเพื่อลงคะแนนและเลื่อนลงทันที</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {getQuickScorePills(activeFocusedComp.maxScore).map((pill) => (
                <button
                  key={pill}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleQuickScoreButton(pill);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 border ${
                    currentFocusedScore === pill
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-card border-border hover:bg-emerald-500/10 hover:border-emerald-500/30 text-foreground"
                  }`}
                >
                  {pill === activeFocusedComp.maxScore ? `เต็ม (${pill})` : pill}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Data Table */}
        <div className="overflow-x-auto max-h-[640px] relative">
          <table className="w-full text-left text-xs border-collapse">
            
            {/* Table Header */}
            <thead className="bg-muted/60 sticky top-0 z-30 border-b border-border select-none backdrop-blur-md">
              <tr>
                {/* Roll No */}
                <th className="p-3 w-12 text-center bg-muted/95 border-r border-border sticky left-0 z-30 font-bold text-foreground">
                  เลขที่
                </th>

                {/* Student Name */}
                <th className="p-3 w-48 bg-muted/95 border-r border-border sticky left-12 z-30 font-bold text-foreground">
                  ชื่อนักเรียน
                </th>
                
                {/* Dynamic Component Columns matching User's Image */}
                {activeComponents.length === 0 ? (
                  <th className="p-3 text-center border-r border-border text-muted-foreground font-normal">
                    ยังไม่มีชิ้นงานเก็บคะแนน (กดปุ่ม &quot;+ เพิ่มงาน&quot; ด้านบนเพื่อเริ่มต้น)
                  </th>
                ) : (
                  activeComponents.map((comp) => {
                    const isMenuOpen = openColumnMenuId === comp.id;
                    const isColFocused = focusedCell?.compId === comp.id;

                    return (
                      <th 
                        key={comp.id} 
                        className={`p-3 text-center border-r border-border min-w-[110px] hover:bg-muted/90 transition-colors relative group ${
                          isColFocused ? "bg-emerald-500/10" : ""
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-bold text-foreground text-xs truncate max-w-[95px]" title={comp.name}>
                            {comp.name}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            เต็ม {comp.maxScore} ({comp.weightPercent}%)
                          </span>
                        </div>

                        {/* Hover action toolbar directly on column header (ลบงาน / แก้ไข สะดวก) */}
                        <div className="absolute right-1 top-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 dark:bg-card/95 backdrop-blur-sm p-0.5 rounded-lg border border-border shadow-sm">
                          <button
                            onClick={() => handleOpenEditComponent(comp)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-emerald-600 transition-colors"
                            title="แก้ไขชิ้นงาน"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteComponent(comp.id, comp.name)}
                            className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-600 transition-colors"
                            title="ลบชิ้นงานนี้"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setOpenColumnMenuId(isMenuOpen ? null : comp.id)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="เมนูเพิ่มเติม"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Column Dropdown Menu */}
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
                              <ClipboardPaste className="h-3.5 w-3.5 text-blue-500" />
                              วางคะแนนจาก Excel
                            </button>
                            <button
                              onClick={() => handleFillAllScores(comp, comp.maxScore)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-xl"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ให้คะแนนเต็มทุกคน ({comp.maxScore})
                            </button>
                            <button
                              onClick={() => handleClearColumnScores(comp)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 rounded-xl"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              ล้างคะแนนในช่องนี้
                            </button>
                          </div>
                        )}
                      </th>
                    );
                  })
                )}

                {/* Inline "+ เพิ่มงาน" button at end of column list if activeComponents exist */}
                {activeComponents.length > 0 && (
                  <th className="p-3 w-16 text-center border-r border-border">
                    <button
                      onClick={handleOpenAddComp}
                      className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all font-bold text-[11px] inline-flex items-center gap-1"
                      title="เพิ่มชิ้นงานใหม่"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>เพิ่ม</span>
                    </button>
                  </th>
                )}

                {/* Summaries Headers */}
                <th className="p-3 w-16 text-center bg-amber-500/5 text-amber-600 border-r border-border font-bold">
                  จิตพิสัย
                </th>
                <th className="p-3 w-20 text-center bg-emerald-500/5 text-emerald-600 border-r border-border font-bold">
                  คะแนนรวม
                </th>
                <th className="p-3 w-16 text-center bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-bold">
                  เกรด
                </th>
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={activeComponents.length + (activeComponents.length > 0 ? 6 : 5)} className="p-12 text-center text-muted-foreground">
                    <p className="font-bold text-sm text-foreground">ไม่พบรายชื่อนักเรียน</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, stdIdx) => {
                  const summary = studentGradeSummary[std.id] || { rawScore: 0, bonus: 0, total: 0, grade: "0", gpa: 0 };
                  const isCurrentRowFocused = focusedCell?.studentId === std.id;
                  
                  return (
                    <tr 
                      key={std.id} 
                      className={`hover:bg-muted/15 transition-colors ${isCurrentRowFocused ? "bg-emerald-500/5" : ""}`}
                    >
                      {/* Roll No */}
                      <td className="p-3 text-center font-semibold bg-card border-r border-border sticky left-0 z-20 text-foreground">
                        {std.rollNo}
                      </td>

                      {/* Student Full Name */}
                      <td className="p-3 font-semibold text-foreground bg-card border-r border-border sticky left-12 z-20 truncate max-w-[190px]">
                        {std.prefix}{std.firstName} {std.lastName}
                      </td>

                      {/* Case 1: No Score Components yet */}
                      {activeComponents.length === 0 ? (
                        <td className="p-3 text-center border-r border-border text-muted-foreground italic">
                          -
                        </td>
                      ) : (
                        // Case 2: Dynamic Score Cells (Auto-select on focus, no need to delete 0)
                        activeComponents.map((comp, compIdx) => {
                          const rawVal = scoreMap[`${std.id}_${comp.id}`];
                          const scoreVal = rawVal !== undefined ? rawVal : 0;
                          const isCellFocused = focusedCell?.studentId === std.id && focusedCell?.compId === comp.id;

                          return (
                            <td 
                              key={comp.id} 
                              className={`p-1 text-center border-r border-border relative transition-all ${
                                isCellFocused ? "bg-emerald-500/15 ring-2 ring-emerald-500/40 rounded-xl" : ""
                              }`}
                            >
                              <input
                                type="number"
                                id={`score-${std.id}-${comp.id}`}
                                value={scoreVal}
                                onChange={(e) => handleScoreChange(std.id, comp, e.target.value)}
                                onKeyDown={(e) => handleInputKeyDown(e, stdIdx, compIdx)}
                                onFocus={(e) => {
                                  setFocusedCell({ studentId: std.id, compId: comp.id, stdIdx, compIdx });
                                  e.target.select(); // Auto-selects number so typing replaces 0 immediately!
                                }}
                                min={0}
                                max={comp.maxScore}
                                step={0.5}
                                className="w-full text-center font-bold py-1.5 outline-none rounded-xl transition-all text-foreground bg-transparent focus:bg-background focus:ring-2 focus:ring-emerald-500 shadow-none"
                              />
                            </td>
                          );
                        })
                      )}

                      {/* Spacer for inline Add button if components exist */}
                      {activeComponents.length > 0 && (
                        <td className="p-1 border-r border-border bg-muted/5 text-center"></td>
                      )}

                      {/* จิตพิสัย (Synchronized directly with Bonus Page) */}
                      <td className="p-3 text-center font-bold bg-amber-500/5 text-amber-600 dark:text-amber-400 border-r border-border">
                        {summary.bonus > 0 ? `+${summary.bonus}` : summary.bonus}
                      </td>

                      {/* คะแนนรวม (Raw Score + Bonus Score) */}
                      <td className="p-3 text-center font-bold bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-r border-border">
                        {summary.total}
                      </td>

                      {/* เกรด (Live Calculated Grade) */}
                      <td className="p-3 text-center font-bold">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs border font-bold ${getGradePill(summary.grade)}`}>
                          {summary.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Statistics Footer Rows */}
              {activeComponents.length > 0 && filteredStudents.length > 0 && (
                <>
                  <tr className="bg-muted/40 font-bold border-t-2 border-border text-foreground">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/95 border-r border-border text-xs">
                      คะแนนเฉลี่ย (Mean)
                    </td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border text-emerald-600 dark:text-emerald-400 font-bold">
                        {columnStats[comp.id]?.mean ?? 0}
                      </td>
                    ))}
                    <td colSpan={4} className="bg-muted/30" />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Speed Grading Modal Dialog (โหมดตรวจงานด่วน) */}
      {isSpeedGradingOpen && currentSpeedStudent && currentSpeedComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-xl rounded-3xl p-6 md:p-8 border border-emerald-500/30 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative">
            
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-600 text-white">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    โหมดตรวจงานด่วน
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">เลือกชิ้นงาน:</span>
                    <select
                      value={speedCompId}
                      onChange={(e) => setSpeedCompId(e.target.value)}
                      className="bg-muted text-xs font-bold text-emerald-600 dark:text-emerald-400 rounded-xl px-2.5 py-1 border border-border outline-none cursor-pointer"
                    >
                      {activeComponents.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (เต็ม {c.maxScore})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsSpeedGradingOpen(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">
                  นักเรียนคนที่ {speedStudentIdx + 1} จาก {activeStudents.length} คน
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {Math.round(((speedStudentIdx + 1) / activeStudents.length) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${((speedStudentIdx + 1) / activeStudents.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Student Card */}
            <div className="p-6 rounded-3xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="h-16 w-16 rounded-3xl bg-emerald-600/15 border-2 border-emerald-500/30 flex flex-col items-center justify-center font-black text-emerald-700 dark:text-emerald-300 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">เลขที่</span>
                  <span className="text-2xl leading-none">{currentSpeedStudent.rollNo}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold block">
                    {currentSpeedStudent.prefix}
                  </span>
                  <h4 className="text-xl font-black text-foreground">
                    {currentSpeedStudent.firstName} {currentSpeedStudent.lastName}
                  </h4>
                </div>
              </div>

              {/* Direct score input */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">
                  คะแนน (เต็ม {currentSpeedComp?.maxScore || 10})
                </span>
                <input
                  ref={speedInputRef}
                  type="number"
                  value={currentSpeedScore ?? 0}
                  onChange={(e) => currentSpeedComp && handleScoreChange(currentSpeedStudent.id, currentSpeedComp, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (speedStudentIdx < activeStudents.length - 1) {
                        setSpeedStudentIdx(prev => prev + 1);
                      }
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  min={0}
                  max={currentSpeedComp?.maxScore || 10}
                  step={0.5}
                  className="w-24 h-12 rounded-2xl border-2 border-emerald-500/40 bg-background text-center text-2xl font-black text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Tap Score Presets */}
            {currentSpeedComp && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground">
                  แตะคะแนนด่วน (บันทึกและเลื่อนไปคนถัดไปทันที):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {getQuickScorePills(currentSpeedComp.maxScore).map((pill) => (
                    <button
                      key={pill}
                      onClick={() => handleApplySpeedScore(pill)}
                      className={`py-2.5 px-2 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-sm border ${
                        currentSpeedScore === pill
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                          : "bg-card border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      {pill === currentSpeedComp.maxScore ? `เต็ม (${pill})` : `${pill} คะแนน`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                onClick={() => setSpeedStudentIdx(prev => Math.max(0, prev - 1))}
                disabled={speedStudentIdx === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                คนก่อนหน้า
              </button>

              <button
                onClick={() => setSpeedStudentIdx(prev => Math.min(activeStudents.length - 1, prev + 1))}
                disabled={speedStudentIdx === activeStudents.length - 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40 active:scale-95 transition-all shadow-sm"
              >
                คนถัดไป
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Component Dialog Modal (เพิ่มงานสะดวกพร้อม Presets) */}
      {isCompOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl space-y-4">
            <h3 className="text-lg font-black flex items-center gap-2 text-foreground">
              <Sliders className="h-5 w-5 text-emerald-600" />
              เพิ่มชิ้นงานเก็บคะแนนใหม่
            </h3>

            {/* Quick Presets chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">เลือกจากชื่อชิ้นงานสำเร็จรูป:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: `งาน ${activeComponents.length + 1}`, max: 10, weight: 10, type: "assignment" },
                  { name: "สอบกลางภาค", max: 20, weight: 20, type: "exam" },
                  { name: "สอบปลายภาค", max: 20, weight: 20, type: "exam" },
                  { name: "ทดสอบย่อย", max: 10, weight: 10, type: "quiz" },
                  { name: "โครงงาน", max: 20, weight: 20, type: "project" }
                ].map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setCompName(p.name);
                      setCompMaxScore(p.max);
                      setCompWeight(p.weight);
                      setCompType(p.type as any);
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-muted hover:bg-emerald-500/10 hover:text-emerald-600 border border-border transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddComponentSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อชิ้นงาน / ใบงาน</label>
                <input
                  type="text"
                  placeholder="เช่น งาน 1 หรือ สอบกลางภาค"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-4 text-sm outline-none focus:border-emerald-500 text-foreground font-semibold"
                />
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
                  onClick={() => setIsCompOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  เพิ่มชิ้นงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Component Dialog Modal */}
      {isEditCompOpen && editingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
            <h3 className="text-lg font-black mb-4 text-foreground flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-600" />
              แก้ไขชิ้นงาน &quot;{editingComp.name}&quot;
            </h3>

            <form onSubmit={handleEditComponentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อชิ้นงาน / ใบงาน</label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-4 text-sm outline-none focus:border-emerald-500 text-foreground font-semibold"
                />
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
          <div className="bg-card w-full max-w-lg rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
            <h3 className="text-lg font-black mb-2 flex items-center gap-2 text-foreground">
              <ClipboardPaste className="h-5 w-5 text-emerald-600" />
              วางคะแนนจาก Excel ในคอลัมน์นี้
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              คัดลอกเฉพาะคะแนน 1 คอลัมน์จาก Excel แล้วนำมาวางในกล่องด้านล่างนี้ ระบบจะเรียงใส่คะแนนให้นักเรียนตามเลขที่ 1, 2, 3... อัตโนมัติ
            </p>

            <textarea
              placeholder="วางคะแนนที่คัดลอกมา เช่น:&#10;10&#10;8.5&#10;9&#10;7.5"
              value={pastedScoresText}
              onChange={(e) => setPastedScoresText(e.target.value)}
              className="w-full h-44 rounded-2xl border border-border bg-background py-3 px-4 text-xs font-mono outline-none focus:border-emerald-500 text-foreground"
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
                บันทึกคะแนน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Score Dialog Modal */}
      {isBonusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
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
                  <label className="block text-xs font-bold text-muted-foreground mb-1">คะแนน</label>
                  <select
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(parseInt(e.target.value))}
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-xs font-bold outline-none focus:border-emerald-500 text-foreground cursor-pointer"
                  >
                    <option value={1}>+1 คะแนน</option>
                    <option value={2}>+2 คะแนน</option>
                    <option value={3}>+3 คะแนน</option>
                    <option value={5}>+5 คะแนน</option>
                    <option value={10}>+10 คะแนน</option>
                    <option value={-1}>-1 คะแนน (หักคะแนน)</option>
                    <option value={-2}>-2 คะแนน (หักคะแนน)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">เหตุผล</label>
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

      {/* Floating Save Toast Notification */}
      {saveSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs font-bold">บันทึกข้อมูลลง Supabase เรียบร้อยแล้ว!</span>
        </div>
      )}

    </div>
  );
}
