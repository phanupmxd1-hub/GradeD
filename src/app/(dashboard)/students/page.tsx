"use client";

import React, { useState, useMemo } from "react";
import { useGMSStore, Student } from "@/lib/store";
import { 
  Plus, 
  Trash2, 
  Search, 
  Upload, 
  Download, 
  ClipboardPaste, 
  Shuffle, 
  ArrowUpCircle, 
  Check, 
  AlertTriangle,
  UserPlus,
  Edit2,
  Users,
  ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";

export default function StudentsPage() {
  const {
    students,
    classrooms,
    activeClassroomId,
    activeSubjectId,
    setActiveClassroomId,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkAddStudents,
    bulkMoveStudents,
    promoteStudents
  } = useGMSStore();

  // Selected students for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Form states
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [rollNo, setRollNo] = useState(1);
  const [prefix, setPrefix] = useState<"เด็กชาย" | "เด็กหญิง" | "นาย" | "นางสาว">("เด็กชาย");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [status, setStatus] = useState<Student["status"]>("active");

  // Bulk Actions Form
  const [bulkActionType, setBulkActionType] = useState<"move" | "promote" | "delete">("move");
  const [targetClassroom, setTargetClassroom] = useState("");

  // Paste from Excel text state
  const [pastedData, setPastedData] = useState("");

  // Filter students for the current classroom
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
      s.lastName.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query)
    );
  }, [activeStudents, searchQuery]);

  const currentClass = classrooms.find(c => c.id === activeClassroomId);

  // Handlers
  const handleOpenAdd = () => {
    setRollNo(activeStudents.length + 1);
    setPrefix("เด็กชาย");
    setFirstName("");
    setLastName("");
    setGender("M");
    setStatus("active");
    setIsAddOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setTargetStudent(student);
    setRollNo(student.rollNo);
    setPrefix(student.prefix as any);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setGender(student.gender as any);
    setStatus(student.status as any);
    setIsEditOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    if (isAddOpen) {
      addStudent({
        prefix,
        firstName,
        lastName,
        gender,
        rollNo,
        status
      });
      setIsAddOpen(false);
    } else if (isEditOpen && targetStudent) {
      updateStudent({
        ...targetStudent,
        prefix,
        firstName,
        lastName,
        gender,
        rollNo,
        status
      });
      setIsEditOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อนักเรียนคนนี้? ข้อมูลคะแนนและการเช็คชื่อทั้งหมดจะหายไป")) {
      deleteStudent(id);
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  // Bulk process execution
  const handleExecuteBulkAction = () => {
    if (selectedIds.length === 0) return;

    if (bulkActionType === "move") {
      if (!targetClassroom) return;
      bulkMoveStudents(selectedIds, targetClassroom);
      alert(`ย้ายนักเรียนจำนวน ${selectedIds.length} คน เรียบร้อยแล้ว`);
    } else if (bulkActionType === "promote") {
      if (!targetClassroom) return;
      promoteStudents(selectedIds, targetClassroom);
      alert(`เลื่อนชั้นนักเรียนจำนวน ${selectedIds.length} คน เรียบร้อยแล้ว`);
    } else if (bulkActionType === "delete") {
      if (confirm(`คุณต้องการลบนักเรียนที่เลือกทั้งหมดจำนวน ${selectedIds.length} คน หรือไม่? ข้อมูลพฤติกรรม คะแนนและเช็คชื่อทั้งหมดจะถูกลบอย่างถาวร`)) {
        selectedIds.forEach(id => deleteStudent(id));
        alert("ลบข้อมูลเรียบร้อยแล้ว");
      }
    }

    setSelectedIds([]);
    setIsBulkOpen(false);
  };

  // Excel Paste Parse
  const handlePasteSubmit = () => {
    if (!pastedData.trim()) return;

    const rows = pastedData.split("\n").filter(r => r.trim() !== "");
    const parsedStudents: any[] = [];

    rows.forEach(row => {
      const cols = row.split("\t");
      if (cols.length >= 2) {
        // Formats:
        // [Prefix] [FirstName] [LastName] [Gender] OR
        // [FirstName] [LastName] [Gender]
        let pfx: any = "เด็กชาย";
        let fName = cols[0].trim();
        let lName = cols[1].trim();
        let gen: any = "M";

        // Simple prefix detector
        const prefixes = ["เด็กชาย", "เด็กหญิง", "นาย", "นางสาว"];
        for (const p of prefixes) {
          if (fName.startsWith(p)) {
            pfx = p;
            fName = fName.substring(p.length).trim();
            break;
          }
        }

        if (pfx === "เด็กหญิง" || pfx === "นางสาว") {
          gen = "F";
        }

        if (cols[2]) {
          const genderText = cols[2].trim().toUpperCase();
          if (genderText === "F" || genderText === "หญิง" || genderText === "เด็กหญิง") {
            gen = "F";
          } else {
            gen = "M";
          }
        }

        parsedStudents.push({
          prefix: pfx,
          firstName: fName,
          lastName: lName,
          gender: gen,
          status: "active"
        });
      }
    });

    if (parsedStudents.length > 0) {
      bulkAddStudents(parsedStudents);
      setPastedData("");
      setIsPasteOpen(false);
      alert(`นำรายชื่อนักเรียนจำนวน ${parsedStudents.length} คน เข้าสู่ห้องเรียนสำเร็จ`);
    } else {
      alert("ไม่พบรูปแบบข้อมูลที่ถูกต้อง กรุณาตรวจสอบข้อมูลคัดลอกใหม่");
    }
  };

  // File Upload Excel/CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const parsedStudents: any[] = [];
      // Skip header row
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (row && row.length >= 2) {
          let pfx = row[0] || "เด็กชาย";
          let fName = row[1];
          let lName = row[2] || "";
          let gen = row[3] || "M";

          if (gen === "หญิง" || gen === "F" || pfx.includes("หญิง") || pfx.includes("นางสาว")) {
            gen = "F";
          } else {
            gen = "M";
          }

          parsedStudents.push({
            prefix: pfx,
            firstName: fName,
            lastName: lName,
            gender: gen,
            status: "active"
          });
        }
      }

      if (parsedStudents.length > 0) {
        bulkAddStudents(parsedStudents);
        setIsImportOpen(false);
        alert(`นำข้อมูลนักเรียนจำนวน ${parsedStudents.length} คนเข้าสู่ระบบสำเร็จ`);
      } else {
        alert("โครงสร้างไฟล์ไม่ถูกต้อง กรุณาอิงตามเทมเพลตตัวอย่าง");
      }
    };

    reader.readAsBinaryString(file);
  };

  // Export CSV Template
  const downloadCsvTemplate = () => {
    const csvContent = "\uFEFFคำนำหน้า,ชื่อจริง,นามสกุล,เพศ (M/F)\nเด็กชาย,สมชาย,รักดี,M\nเด็กหญิง,สมศรี,ใจใส,F\nนาย,สมคิด,เก่งเรียน,M\nนางสาว,สมใจ,เรียนดี,F\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "gms_student_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Students to CSV
  const exportStudentsToCsv = () => {
    if (activeStudents.length === 0) {
      alert("ไม่พบรายชื่อนักเรียนในห้องเรียนนี้สำหรับส่งออก");
      return;
    }

    const headers = ["เลขที่", "คำนำหน้า", "ชื่อจริง", "นามสกุล", "เพศ", "สถานภาพ"];
    const rows = activeStudents.map(s => [
      s.rollNo,
      s.prefix,
      s.firstName,
      s.lastName,
      s.gender === "M" ? "ชาย" : "หญิง",
      s.status === "active" ? "ปกติ" : s.status === "dropped" ? "จำหน่ายออก" : "ย้ายสถานศึกษา"
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `รายชื่อนักเรียน_ห้อง_${currentClass?.name || "ม1"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Template Excel
  const downloadTemplate = () => {
    const data = [
      ["คำนำหน้า", "ชื่อจริง", "นามสกุล", "เพศ (M/F)"],
      ["เด็กชาย", "สมชาย", "รักดี", "M"],
      ["เด็กหญิง", "สมศรี", "ใจใส", "F"],
      ["นาย", "สมคิด", "เก่งเรียน", "M"],
      ["นางสาว", "สมใจ", "เรียนดี", "F"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "gms_student_template.xlsx");
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Summary Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">รายชื่อนักเรียนห้อง</h2>
            <div className="relative">
              <select
                value={activeClassroomId}
                onChange={(e) => setActiveClassroomId(e.target.value)}
                className="appearance-none bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-lg px-4 py-1.5 pr-9 rounded-2xl border border-emerald-500/30 cursor-pointer transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
              >
                {classrooms.map((c) => {
                  const count = students.filter(s => s.classroomId === c.id).length;
                  return (
                    <option key={c.id} value={c.id} className="text-foreground bg-card text-sm">
                      ห้อง {c.name} ({count} คน)
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            จัดการข้อมูลนักเรียน รายชื่อ ย้ายห้องเรียน เลื่อนชั้นเรียน และนำเข้า-ส่งออกไฟล์ CSV / Excel
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            เพิ่มนักเรียน
          </button>

          <button
            onClick={exportStudentsToCsv}
            className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all text-foreground"
            title="ดาวน์โหลดรายชื่อห้องนี้เป็นไฟล์ CSV"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ส่งออก CSV
          </button>
          
          <button
            onClick={() => setIsPasteOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all text-foreground"
          >
            <ClipboardPaste className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ก๊อปปี้วางจาก Excel
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all text-foreground"
          >
            <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            นำเข้า CSV / Excel
          </button>
        </div>
      </div>

      {/* Main Student Panel */}
      <div className="rounded-3xl border border-border bg-card/65 backdrop-blur-md overflow-hidden">
        
        {/* Table Filter Options Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-border">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหานักเรียนด้วยชื่อ หรือ เลขประจำตัว..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background py-2 pr-4 pl-9 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          {/* Selection Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mr-2">
                เลือกแล้ว {selectedIds.length} คน
              </span>
              <button
                onClick={() => {
                  setBulkActionType("move");
                  setIsBulkOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all"
              >
                <Shuffle className="h-3.5 w-3.5" />
                ย้ายห้อง
              </button>
              <button
                onClick={() => {
                  setBulkActionType("promote");
                  setIsBulkOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                เลื่อนระดับชั้น
              </button>
              <button
                onClick={() => {
                  setBulkActionType("delete");
                  handleExecuteBulkAction();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/20 active:scale-95 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                ลบกลุ่มนี้
              </button>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                </th>
                <th className="p-4 w-20 text-center">เลขที่</th>
                <th className="p-4 w-32">เลขประจำตัว</th>
                <th className="p-4">คำนำหน้า</th>
                <th className="p-4">ชื่อจริง</th>
                <th className="p-4">นามสกุล</th>
                <th className="p-4 w-20 text-center">เพศ</th>
                <th className="p-4 w-32">สถานะ</th>
                <th className="p-4 w-28 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-10 w-10 text-muted-foreground/40" />
                      <p className="font-semibold text-sm">ไม่พบรายชื่อนักเรียนในห้องเรียนนี้</p>
                      <p className="text-xs">กรุณากดปุ่มเพิ่มนักเรียน หรือ นำเข้าไฟล์จากแถบเครื่องมือด้านบน</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-muted/30 transition-colors ${selectedIds.includes(student.id) ? "bg-emerald-500/5 dark:bg-emerald-500/10" : ""}`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(student.id)}
                        onChange={(e) => handleSelectOne(student.id, e.target.checked)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                    </td>
                    <td className="p-4 text-center font-semibold text-foreground">{student.rollNo}</td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{student.id.substring(student.id.lastIndexOf("-") + 1)}</td>
                    <td className="p-4 text-foreground">{student.prefix}</td>
                    <td className="p-4 font-semibold text-foreground">{student.firstName}</td>
                    <td className="p-4 text-foreground">{student.lastName}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${student.gender === "M" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300"}`}>
                        {student.gender === "M" ? "ชาย" : "หญิง"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : 
                        student.status === "dropped" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400" : 
                        "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {student.status === "active" ? "ปกติ" : 
                         student.status === "dropped" ? "จำหน่ายออก" : "ย้ายสถานศึกษา"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          title="แก้ไขประวัตินักเรียน"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                          title="ลบรายชื่อนักเรียน"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Dialog */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">
              {isAddOpen ? "เพิ่มรายชื่อนักเรียนใหม่" : "แก้ไขข้อมูลนักเรียน"}
            </h3>
            
            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">เลขที่</label>
                  <input
                    type="number"
                    value={rollNo}
                    onChange={(e) => setRollNo(parseInt(e.target.value))}
                    min={1}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">คำนำหน้า</label>
                  <select
                    value={prefix}
                    onChange={(e: any) => {
                      setPrefix(e.target.value);
                      if (e.target.value === "เด็กชาย" || e.target.value === "นาย") {
                        setGender("M");
                      } else {
                        setGender("F");
                      }
                    }}
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  >
                    <option value="เด็กชาย">เด็กชาย</option>
                    <option value="เด็กหญิง">เด็กหญิง</option>
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อจริง</label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">นามสกุล</label>
                <input
                  type="text"
                  placeholder="เช่น ดีใจ"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">เพศ</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGender("M")}
                      className={`flex-1 py-2 px-3 text-sm rounded-2xl border font-semibold transition-all ${gender === "M" ? "border-blue-500 bg-blue-500/10 text-blue-600" : "border-border hover:bg-muted"}`}
                    >
                      ชาย
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("F")}
                      className={`flex-1 py-2 px-3 text-sm rounded-2xl border font-semibold transition-all ${gender === "F" ? "border-pink-500 bg-pink-500/10 text-pink-600" : "border-border hover:bg-muted"}`}
                    >
                      หญิง
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">สถานภาพนักเรียน</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  >
                    <option value="active">ปกติ</option>
                    <option value="dropped">จำหน่ายออก</option>
                    <option value="transferred">ย้ายสถานศึกษา</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setIsEditOpen(false);
                  }}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy / Paste from Excel Dialog */}
      {isPasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-lg rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <ClipboardPaste className="h-5 w-5 text-emerald-600" />
              ก๊อปปี้และวางรายชื่อจาก Excel
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              คัดลอกเซลล์ในตาราง Excel (คอลัมน์: คำนำหน้า, ชื่อจริง, นามสกุล) แล้วกดปุ่มวางข้อมูลลงในช่องด้านล่างนี้ได้เลย ระบบจะประมวลผลเพิ่มรายชื่อให้โดยอัตโนมัติ
            </p>

            <textarea
              placeholder="วางข้อมูลที่นี่... (เช่น: เด็กชาย	สมชาย	ดีใจ)"
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              className="w-full h-44 rounded-2xl border border-border bg-background py-3 px-4 text-xs font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-muted-foreground/45"
            />

            <div className="flex items-center justify-between mt-4">
              <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>รองรับการแยกคำนำหน้า หรือระบุเพศในแถวที่ 3 (M หรือ F)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPasteOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handlePasteSubmit}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all"
                >
                  วิเคราะห์ข้อมูลและบันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Dialog */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2">นำเข้าไฟล์รายชื่อนักเรียน</h3>
            <p className="text-xs text-muted-foreground mb-6">
              เลือกไฟล์ตารางข้อมูลนักเรียนที่จัดเก็บในรูปแบบ `.xlsx` หรือ `.csv`
            </p>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-muted/40 transition-colors cursor-pointer group relative">
              <Upload className="h-8 w-8 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-foreground">ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์</span>
              <span className="text-[10px] text-muted-foreground/60 mt-1">ไฟล์ XLS, XLSX หรือ CSV ขนาดไม่เกิน 5MB</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-500 font-semibold transition-colors"
                >
                  <Download className="h-4 w-4" />
                  เทมเพลต CSV
                </button>
                <span className="text-muted-foreground/30">•</span>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-500 font-semibold transition-colors"
                >
                  <Download className="h-4 w-4" />
                  เทมเพลต Excel
                </button>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted transition-all"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Config Dialog */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">
              {bulkActionType === "move" ? "ย้ายกลุ่มนักเรียนไปยังห้องอื่น" : "เลื่อนระดับชั้นนักเรียน"}
            </h3>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                นักเรียนที่เลือกทั้งหมดจำนวน <strong>{selectedIds.length} คน</strong> จะถูกดำเนินการตามเงื่อนไขด้านล่างนี้
              </p>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">เลือกห้องเรียนปลายทาง</label>
                <select
                  value={targetClassroom}
                  onChange={(e) => setTargetClassroom(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value="">-- กรุณาเลือกห้องเรียน --</option>
                  {classrooms
                    .filter(c => c.id !== activeClassroomId)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        ห้อง {c.name} (ปีการศึกษา {c.academicYearId.substring(c.academicYearId.lastIndexOf("_") + 1)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  onClick={() => setIsBulkOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleExecuteBulkAction}
                  disabled={!targetClassroom}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all disabled:opacity-50"
                >
                  ยืนยันการทำรายการ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
