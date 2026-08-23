"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useGMSStore, Student, ScoreComponent, Score } from "@/lib/store";
import { 
  Plus, 
  Trash2, 
  Settings, 
  ClipboardPaste, 
  Undo2, 
  Redo2, 
  Sliders, 
  Sparkles,
  HelpCircle,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  AlertCircle
} from "lucide-react";

export default function ScoresPage() {
  const {
    students,
    activeClassroomId,
    activeSubjectId,
    activeSemesterId,
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
    calculateGrades
  } = useGMSStore();

  // Modals state
  const [isCompOpen, setIsCompOpen] = useState(false);
  const [isEditCompOpen, setIsEditCompOpen] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  
  // Selection/State for actions
  const [editingComp, setEditingComp] = useState<ScoreComponent | null>(null);
  const [activeCompForPaste, setActiveCompForPaste] = useState<string | null>(null);
  const [pastedScoresText, setPastedScoresText] = useState("");
  
  // Bonus score form
  const [bonusStudentId, setBonusStudentId] = useState("");
  const [bonusPoints, setBonusPoints] = useState(1);
  const [bonusReason, setBonusReason] = useState("");

  // Score Component Form
  const [compName, setCompName] = useState("");
  const [compType, setCompType] = useState<ScoreComponent["type"]>("assignment");
  const [compMaxScore, setCompMaxScore] = useState(10);
  const [compWeight, setCompWeight] = useState(10);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Save feedback state
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Active students sorted
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

  // Active score components sorted by order
  const activeComponents = useMemo(() => {
    return scoreComponents
      .filter(c => c.classroomId === activeClassroomId && 
                   c.subjectId === activeSubjectId && 
                   c.semesterId === activeSemesterId)
      .sort((a, b) => a.order - b.order);
  }, [scoreComponents, activeClassroomId, activeSubjectId, activeSemesterId]);

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
    const map: Record<string, { total: number; grade: string; bonus: number }> = {};
    gradeResults
      .filter(g => g.subjectId === activeSubjectId && g.semesterId === activeSemesterId)
      .forEach(g => {
        map[g.studentId] = { total: g.totalScore, grade: g.grade, bonus: g.bonusScoreSum };
      });
    return map;
  }, [gradeResults, activeSubjectId, activeSemesterId]);

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
        const val = scoreMap[`${std.id}_${comp.id}`] ?? 0;
        sum += val;
        count++;
        if (val > maxVal) maxVal = val;
        if (val < minVal) minVal = val;
        
        // Pass rate based on scoring at least 50% of the maxScore
        if (val >= comp.maxScore * 0.5) {
          passCount++;
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

  // Cell keydown navigations
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentId: string,
    compId: string,
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
    let val = parseFloat(valString);
    if (isNaN(val)) val = 0;
    
    // Constraint check
    if (val > comp.maxScore) {
      alert(`คะแนนห้ามเกินคะแนนเต็ม (${comp.maxScore} คะแนน) สำหรับช่อง ${comp.name}`);
      return;
    }
    if (val < 0) return;

    const cellId = `${studentId}_${comp.id}`;
    setSavingCell(cellId);
    updateScore(studentId, comp.id, val);
    
    setTimeout(() => {
      setSavingCell(null);
    }, 450);
  };

  // Bulk Paste Scores from Excel
  const handleExecutePasteScores = () => {
    if (!activeCompForPaste || !pastedScoresText.trim()) return;

    const comp = activeComponents.find(c => c.id === activeCompForPaste);
    if (!comp) return;

    // Parse values from text (split by newlines, tabs, spaces)
    const lines = pastedScoresText.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    const updates: { studentId: string; scoreComponentId: string; scoreVal: number }[] = [];

    // Map sequentially to students in list
    filteredStudents.forEach((std, idx) => {
      if (lines[idx] !== undefined) {
        let val = parseFloat(lines[idx]);
        if (isNaN(val)) val = 0;
        if (val <= comp.maxScore) {
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
      alert(`อัปเดตคะแนนคอลัมน์ "${comp.name}" จำนวน ${updates.length} คน เรียบร้อยแล้ว`);
    } else {
      alert("ไม่พบข้อมูลคะแนนที่สอดคล้องตามเงื่อนไขคะแนนเต็ม");
    }
  };

  // Add Component Form submit
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
    alert("เพิ่มชิ้นงานคะแนนใหม่เรียบร้อยแล้ว");
  };

  // Edit Component Form submit
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
    alert("แก้ไขข้อมูลชิ้นงานคะแนนเรียบร้อยแล้ว");
  };

  const handleOpenEditComponent = (comp: ScoreComponent) => {
    setEditingComp(comp);
    setCompName(comp.name);
    setCompType(comp.type);
    setCompMaxScore(comp.maxScore);
    setCompWeight(comp.weightPercent);
    setIsEditCompOpen(true);
  };

  const handleDeleteComponent = (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบชิ้นงาน "${name}"? ข้อมูลคะแนนทั้งหมดของนักเรียนในช่องนี้จะถูกลบอย่างถาวร`)) {
      deleteScoreComponent(id);
      alert("ลบชิ้นงานเรียบร้อยแล้ว");
    }
  };

  // Bonus Points Submit
  const handleAddBonusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusStudentId || !bonusReason.trim()) return;

    addBonusScore(bonusStudentId, bonusPoints, bonusReason);
    setBonusReason("");
    setIsBonusOpen(false);
    alert("บันทึกคะแนนจิตพิสัยพิเศษเรียบร้อยแล้ว");
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">แบบบันทึกคะแนนผู้เรียน (SGS Excel-Style)</h2>
          <p className="text-sm text-muted-foreground">
            บันทึกคะแนนงาน สอบกลางภาค ปลายภาค พร้อมระบบคำนวณเกรดรวมและสถิติด้านล่างทันที
          </p>
        </div>

        {/* Toolbar Undo Redo & Components Setup */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / Redo Buttons */}
          <div className="flex bg-muted p-0.5 rounded-2xl border border-border mr-2">
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
            className="flex items-center gap-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all"
          >
            <Award className="h-4 w-4" />
            บันทึกจิตพิสัยพิเศษ (+/-)
          </button>

          <button
            onClick={() => setIsCompOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            เพิ่มชิ้นงานคะแนน
          </button>
        </div>
      </div>

      {/* Excel Sheet Table Grid Container */}
      <div className="rounded-3xl border border-border bg-card/65 backdrop-blur-md overflow-hidden">
        
        {/* Search row filter */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            ตารางบันทึกวิชา วิทยาศาสตร์ (อัตโนมัติ)
          </span>

          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="ค้นหานักเรียนด้วยชื่อ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background py-1.5 px-4 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
          </div>
        </div>

        {/* Data Grid table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-20 border-b border-border select-none">
              <tr>
                <th className="p-3 w-12 text-center bg-muted border-r border-border sticky left-0 z-20">เลขที่</th>
                <th className="p-3 w-40 bg-muted border-r border-border sticky left-12 z-20">ชื่อนักเรียน</th>
                
                {/* Dynamic Columns headers */}
                {activeComponents.length === 0 ? (
                  <th className="p-3 text-center text-muted-foreground">ไม่มีชิ้นงานกรอกคะแนน</th>
                ) : (
                  activeComponents.map((comp, compIdx) => (
                    <th 
                      key={comp.id} 
                      className="p-3 text-center border-r border-border min-w-[100px] hover:bg-muted/80 transition-colors group relative"
                    >
                      <div className="font-bold text-foreground text-xs truncate max-w-[90px] mx-auto text-center" title={comp.name}>
                        {comp.name}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        เต็ม {comp.maxScore} ({comp.weightPercent}%)
                      </div>

                      {/* Hover action toolbar */}
                      <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 dark:bg-card/90 backdrop-blur-sm p-0.5 rounded-lg border border-border shadow-sm">
                        <button
                          onClick={() => {
                            setActiveCompForPaste(comp.id);
                            setIsPasteOpen(true);
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="วางคะแนนคอลัมน์นี้"
                        >
                          <ClipboardPaste className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleOpenEditComponent(comp)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="แก้ไขชิ้นงาน"
                        >
                          <Settings className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteComponent(comp.id, comp.name)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-500 transition-colors"
                          title="ลบชิ้นงาน"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                  ))
                )}

                {/* Summaries headers */}
                <th className="p-3 w-16 text-center bg-amber-500/5 text-amber-600 border-r border-border font-bold">จิตพิสัย</th>
                <th className="p-3 w-20 text-center bg-emerald-500/5 text-emerald-600 border-r border-border font-bold">คะแนนรวม</th>
                <th className="p-3 w-16 text-center bg-emerald-600/10 text-emerald-700 font-bold">เกรด</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={activeComponents.length + 5} className="p-12 text-center text-muted-foreground">
                    <p className="font-semibold text-sm">ไม่พบรายชื่อนักเรียนในห้องเรียนนี้</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, stdIdx) => {
                  const result = gradeMap[std.id] || { total: 0, grade: "0", bonus: 0 };
                  
                  return (
                    <tr key={std.id} className="hover:bg-muted/10">
                      {/* Sticky Columns */}
                      <td className="p-3 text-center font-semibold bg-card border-r border-border sticky left-0 z-10">{std.rollNo}</td>
                      <td className="p-3 font-semibold text-foreground bg-card border-r border-border sticky left-12 z-10 truncate max-w-[160px]">
                        {std.prefix}{std.firstName} {std.lastName}
                      </td>

                      {/* Dynamic Cells Inputs */}
                      {activeComponents.map((comp, compIdx) => {
                        const scoreVal = scoreMap[`${std.id}_${comp.id}`] ?? "";
                        const cellId = `${std.id}_${comp.id}`;
                        const isSaving = savingCell === cellId;

                        return (
                          <td 
                            key={comp.id} 
                            className={`p-1 text-center border-r border-border relative transition-all ${isSaving ? "bg-emerald-500/10" : ""}`}
                          >
                            <input
                              type="number"
                              id={`score-${std.id}-${comp.id}`}
                              value={scoreVal}
                              onChange={(e) => handleScoreChange(std.id, comp, e.target.value)}
                              onKeyDown={(e) => handleInputKeyDown(e, std.id, comp.id, stdIdx, compIdx)}
                              min={0}
                              max={comp.maxScore}
                              step={0.5}
                              className="w-full text-center font-semibold bg-transparent border-none outline-none py-1.5 focus:bg-emerald-500/15 focus:ring-1 focus:ring-emerald-500 rounded-xl"
                            />
                            
                            {/* saving pulse overlay icon */}
                            {isSaving && (
                              <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            )}
                          </td>
                        );
                      })}

                      {/* Summaries scores columns */}
                      <td className="p-3 text-center font-semibold bg-amber-500/5 text-amber-600 border-r border-border">{result.bonus > 0 ? `+${result.bonus}` : result.bonus}</td>
                      <td className="p-3 text-center font-bold bg-emerald-500/5 text-emerald-600 border-r border-border">{result.total}</td>
                      <td className="p-3 text-center font-bold bg-emerald-600/10 text-emerald-700">
                        <span className={`px-2 py-0.5 rounded ${result.grade === "4" || result.grade === "3.5" ? "bg-emerald-500/15 text-emerald-700" : result.grade === "0" ? "bg-red-500/15 text-red-600" : "bg-blue-500/15 text-blue-600"}`}>
                          {result.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Statistics Footer Rows */}
              {activeComponents.length > 0 && (
                <>
                  {/* Mean (Average) Row */}
                  <tr className="bg-muted/40 font-bold border-t border-border">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/95 border-r border-border text-xs">คะแนนเฉลี่ย (Mean)</td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border text-emerald-600">{columnStats[comp.id]?.mean ?? 0}</td>
                    ))}
                    <td colSpan={3} className="bg-muted/30"></td>
                  </tr>
                  
                  {/* Max Value Row */}
                  <tr className="bg-muted/20 font-semibold">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/90 border-r border-border text-xs">คะแนนสูงสุด (Max)</td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border text-blue-600">{columnStats[comp.id]?.max ?? 0}</td>
                    ))}
                    <td colSpan={3} className="bg-muted/15"></td>
                  </tr>
                  
                  {/* Min Value Row */}
                  <tr className="bg-muted/20 font-semibold">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/90 border-r border-border text-xs">คะแนนต่ำสุด (Min)</td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border text-red-500">{columnStats[comp.id]?.min ?? 0}</td>
                    ))}
                    <td colSpan={3} className="bg-muted/15"></td>
                  </tr>
                  
                  {/* Pass Rate Row */}
                  <tr className="bg-emerald-500/5 font-bold">
                    <td colSpan={2} className="p-3 text-right sticky left-0 bg-muted/90 border-r border-border text-xs text-emerald-700">เปอร์เซ็นต์สอบผ่าน (Pass Rate)</td>
                    {activeComponents.map(comp => (
                      <td key={comp.id} className="p-3 text-center border-r border-border text-emerald-700">{columnStats[comp.id]?.passRate ?? 100}%</td>
                    ))}
                    <td colSpan={3} className="bg-emerald-500/5"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Component Creator Modal */}
      {isCompOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-1.5">
              <Sliders className="h-5 w-5 text-emerald-600" />
              เพิ่มชิ้นงานเก็บคะแนนใหม่
            </h3>

            <form onSubmit={handleAddComponentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อชิ้นงาน / ใบงาน</label>
                <input
                  type="text"
                  placeholder="เช่น ใบงานที่ 3: ระบบย่อยอาหาร"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">คะแนนเต็ม (Raw Max)</label>
                  <input
                    type="number"
                    value={compMaxScore}
                    onChange={(e) => setCompMaxScore(parseFloat(e.target.value))}
                    min={1}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none"
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
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ประเภทคะแนน</label>
                <select
                  value={compType}
                  onChange={(e: any) => setCompType(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="assignment">การบ้าน / ใบงาน (Assignment)</option>
                  <option value="quiz">ทดสอบย่อย (Quiz)</option>
                  <option value="exam">สอบกลาง/ปลายภาค (Exam)</option>
                  <option value="project">โครงงาน/ชิ้นงานใหญ่ (Project)</option>
                  <option value="other">คะแนนอื่นๆ (Other)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCompOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  บันทึกโครงสร้างคะแนน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Component Dialog Modal */}
      {isEditCompOpen && editingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-foreground flex items-center gap-1.5">
              <Sliders className="h-5 w-5 text-emerald-600" />
              แก้ไขชิ้นงานคะแนน
            </h3>

            <form onSubmit={handleEditComponentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อชิ้นงาน / ใบงาน</label>
                <input
                  type="text"
                  placeholder="เช่น ใบงานที่ 1 หรือ สอบย่อย"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-foreground"
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
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none text-foreground"
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
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ประเภทคะแนน</label>
                <select
                  value={compType}
                  onChange={(e: any) => setCompType(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500 text-foreground"
                >
                  <option value="assignment">การบ้าน / ใบงาน</option>
                  <option value="quiz">ทดสอบย่อย</option>
                  <option value="exam">สอบกลาง/ปลายภาค</option>
                  <option value="project">โครงงาน/ชิ้นงานใหญ่</option>
                  <option value="other">คะแนนอื่นๆ</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditCompOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  บันทึกความเปลี่ยนแปลง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isPasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-1.5">
              <ClipboardPaste className="h-5 w-5 text-emerald-600" />
              วางคะแนนจาก Excel ในคอลัมน์นี้
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              คัดลอกเฉพาะคะแนนตัวเลขใน 1 คอลัมน์จาก Excel แล้วนำมาวางในกล่องด้านล่างนี้ ระบบจะเรียงลำดับใส่คะแนนให้นักเรียนตามเลขที่ 1, 2, 3... อัตโนมัติ
            </p>

            <textarea
              placeholder="วางคะแนนเรียงลำดับลงมา... (เช่น:&#10;10&#10;8.5&#10;9&#10;7)"
              value={pastedScoresText}
              onChange={(e) => setPastedScoresText(e.target.value)}
              className="w-full h-44 rounded-2xl border border-border bg-background py-3 px-4 text-xs font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setIsPasteOpen(false)}
                className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleExecutePasteScores}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                บันทึกคะแนนด่วน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Score Manager Dialog */}
      {isBonusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-1.5">
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
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500"
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
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500"
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
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBonusOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  บันทึกคะแนนพฤติกรรม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
