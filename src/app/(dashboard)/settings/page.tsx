"use client";

import React, { useState, useMemo } from "react";
import { useGMSStore, GradeRange } from "@/lib/store";
import { useAuth } from "@/features/auth/context";
import { 
  Settings as SettingsIcon,
  Sliders, 
  Lock, 
  Unlock, 
  Save, 
  RefreshCw, 
  BookOpen, 
  Award,
  AlertCircle,
  FolderLock,
  Plus,
  Trash2,
  Edit2,
  User,
  Calendar,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Building2,
  X as CloseIcon,
  Type,
  Check,
  Smartphone,
  Share2
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function SettingsPage() {
  const {
    students,
    activeClassroomId,
    activeSubjectId,
    activeSemesterId,
    gradeRules,
    gradeResults,
    updateGradeRules,
    updateGradeOverride,
    toggleGradeLock,
    calculateGrades,
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    scoreComponents,
    enrollments,
    classrooms,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    academicYears,
    semesters,
    addAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    mainTitle,
    subTitle,
    teacherName,
    teacherAvatar,
    schoolLogo,
    updateSystemSettings,
    saveAccountData
  } = useGMSStore();

  const { user, updateProfile } = useAuth();
  const { font, setFont } = useTheme();

  const [ranges, setRanges] = useState<GradeRange[]>(gradeRules.ranges);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("saved");

  // System & Branding States
  const [mainTitleInput, setMainTitleInput] = useState(mainTitle || "GradeD Portal");
  const [subTitleInput, setSubTitleInput] = useState(subTitle || "ระบบบันทึกผลการเรียนและเช็คชื่อนักเรียน");
  const [customFontInput, setCustomFontInput] = useState(font || "Prompt");
  const [teacherNameInput, setTeacherNameInput] = useState(teacherName || "คุณครูผู้สอน");
  const [schoolLogoInput, setSchoolLogoInput] = useState<string | null>(schoolLogo || null);
  const [teacherAvatarInput, setTeacherAvatarInput] = useState<string | null>(teacherAvatar || null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  React.useEffect(() => {
    setMainTitleInput(mainTitle || "GradeD Portal");
    setSubTitleInput(subTitle || "ระบบบันทึกผลการเรียนและเช็คชื่อนักเรียน");
    setTeacherNameInput(teacherName || "คุณครูผู้สอน");
    setSchoolLogoInput(schoolLogo || null);
    setTeacherAvatarInput(teacherAvatar || null);
  }, [mainTitle, subTitle, teacherName, schoolLogo, teacherAvatar]);

  // Image to Base64 Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "schoolLogo" | "teacherAvatar") => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 3 * 1024 * 1024) {
      alert("กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (field === "schoolLogo") {
        setSchoolLogoInput(base64String);
      } else {
        setTeacherAvatarInput(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      updateSystemSettings({
        mainTitle: mainTitleInput.trim() || "GradeD Portal",
        subTitle: subTitleInput.trim() || "",
        teacherName: teacherNameInput.trim() || "คุณครูผู้สอน",
        schoolLogo: schoolLogoInput || null,
        teacherAvatar: teacherAvatarInput || null
      });
      await saveAccountData();
      alert("บันทึกการตั้งค่าระบบและตราสัญลักษณ์สำเร็จ");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Teacher Profile States
  const [teacherFirstName, setTeacherFirstName] = useState(user?.firstName || "");
  const [teacherLastName, setTeacherLastName] = useState(user?.lastName || "");
  const [teacherEmail, setTeacherEmail] = useState(user?.email || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  React.useEffect(() => {
    if (user) {
      setTeacherFirstName(user.firstName || "");
      setTeacherLastName(user.lastName || "");
      setTeacherEmail(user.email || "");
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherFirstName.trim() || !teacherLastName.trim()) return;
    setIsSavingProfile(true);
    try {
      await updateProfile(teacherFirstName.trim(), teacherLastName.trim(), teacherEmail.trim());
      alert("บันทึกข้อมูลครูผู้สอนสำเร็จ");
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Get active students
  const activeStudents = useMemo(() => {
    return students
      .filter(s => s.classroomId === activeClassroomId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassroomId]);

  // Map grade results by studentId
  const gradeResultList = useMemo(() => {
    return gradeResults
      .filter(g => g.subjectId === activeSubjectId && g.semesterId === activeSemesterId && g.classroomId === activeClassroomId)
      .sort((a, b) => {
        const stdA = activeStudents.find(s => s.id === a.studentId);
        const stdB = activeStudents.find(s => s.id === b.studentId);
        return (stdA?.rollNo ?? 0) - (stdB?.rollNo ?? 0);
      });
  }, [gradeResults, activeClassroomId, activeSubjectId, activeSemesterId, activeStudents]);

  // Handle saving the custom grade rules
  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");
    
    // Sort ranges to make sure it's descending
    const sorted = [...ranges].sort((a, b) => b.min - a.min);
    updateGradeRules(sorted);
    
    // Force recalculation of grades using the new rules
    calculateGrades();
    saveAccountData();

    setTimeout(() => {
      setSaveStatus("saved");
      alert("บันทึกเกณฑ์การตัดเกรดใหม่เรียบร้อยแล้ว เกรดของนักเรียนจะประมวลผลใหม่โดยอัตโนมัติ");
    }, 400);
  };

  const handleRangeChange = (idx: number, field: keyof GradeRange, val: string | number) => {
    const nextRanges = [...ranges];
    nextRanges[idx] = {
      ...nextRanges[idx],
      [field]: typeof val === "string" ? parseFloat(val) : val
    };
    setRanges(nextRanges);
  };

  const handleToggleLock = (studentId: string) => {
    toggleGradeLock(studentId);
    saveAccountData();
  };

  const handleOverrideGrade = (studentId: string, currentGrade: string) => {
    const override = prompt(`ป้อนเกรดใหม่ที่ต้องการเปลี่ยนสำหรับนักเรียนคนนี้ (เกรดปัจจุบัน: ${currentGrade}):`);
    if (override === null) return; // cancel
    
    // Simple verification
    const allowed = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0", "ร", "มส"];
    if (!allowed.includes(override)) {
      alert(`เกรดที่ระบุไม่ถูกต้อง ต้องเป็นค่าใดค่าหนึ่งดังนี้: ${allowed.join(", ")}`);
      return;
    }

    // Determine GPA points mapping
    const gpaMap: Record<string, number> = {
      "4": 4.0, "3.5": 3.5, "3": 3.0, "2.5": 2.5, "2": 2.0, "1.5": 1.5, "1": 1.0, "0": 0.0,
      "ร": 0.0, "มส": 0.0
    };

    updateGradeOverride(studentId, override, gpaMap[override] || 0);
    saveAccountData();
    alert("แก้ไขเกรดสำเร็จ");
  };

  // Academic Years Form State
  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [isEditYearOpen, setIsEditYearOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<any | null>(null);
  const [yearInput, setYearInput] = useState("");

  const handleOpenAddYear = () => {
    setYearInput("");
    setIsAddYearOpen(true);
  };

  const handleOpenEditYear = (yearObj: any) => {
    setEditingYear(yearObj);
    setYearInput(String(yearObj.year));
    setIsEditYearOpen(true);
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearInput.trim()) return;
    const yearNum = parseInt(yearInput.trim());
    if (isNaN(yearNum)) return;

    if (isAddYearOpen) {
      addAcademicYear(yearNum);
      setIsAddYearOpen(false);
      await saveAccountData();
      alert(`เพิ่มปีการศึกษา ${yearNum} และบันทึกลงใน Supabase เรียบร้อยแล้ว`);
    } else if (isEditYearOpen && editingYear) {
      updateAcademicYear(editingYear.id, yearNum);
      setIsEditYearOpen(false);
      setEditingYear(null);
      await saveAccountData();
      alert(`แก้ไขข้อมูลปีการศึกษา ${yearNum} และบันทึกลงใน Supabase เรียบร้อยแล้ว`);
    }
  };

  const handleDeleteYear = async (id: string, year: number) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบปีการศึกษา "${year}"? ข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบ`)) {
      deleteAcademicYear(id);
      await saveAccountData();
      alert("ลบปีการศึกษาเรียบร้อยแล้ว");
    }
  };

  // Classrooms Form State
  const [isAddClassroomOpen, setIsAddClassroomOpen] = useState(false);
  const [isEditClassroomOpen, setIsEditClassroomOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any | null>(null);
  const [classNameInput, setClassNameInput] = useState("");

  const handleOpenAddClassroom = () => {
    setClassNameInput("");
    setIsAddClassroomOpen(true);
  };

  const handleOpenEditClassroom = (classroom: any) => {
    setEditingClassroom(classroom);
    setClassNameInput(classroom.name);
    setIsEditClassroomOpen(true);
  };

  const handleSaveClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) return;

    if (isAddClassroomOpen) {
      addClassroom(classNameInput.trim());
      setIsAddClassroomOpen(false);
      saveAccountData();
      alert("เพิ่มห้องเรียนใหม่สำเร็จ");
    } else if (isEditClassroomOpen && editingClassroom) {
      updateClassroom({
        ...editingClassroom,
        name: classNameInput.trim()
      });
      setIsEditClassroomOpen(false);
      setEditingClassroom(null);
      saveAccountData();
      alert("แก้ไขข้อมูลห้องเรียนสำเร็จ");
    }
  };

  const handleDeleteClassroom = (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้องเรียน "${name}"? นักเรียนและข้อมูลในห้องนี้จะถูกลบออกจากระบบ`)) {
      deleteClassroom(id);
      saveAccountData();
      alert("ลบห้องเรียนเรียบร้อยแล้ว");
    }
  };

  // Subjects Form State
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  
  const [subClassroomId, setSubClassroomId] = useState("");
  const [subNewClassName, setSubNewClassName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subName, setSubName] = useState("");
  const [subCredit, setSubCredit] = useState(1.5);
  const [subHours, setSubHours] = useState(3);

  const handleOpenAddSubject = () => {
    setSubClassroomId(activeClassroomId || (classrooms[0] ? classrooms[0].id : "NEW"));
    setSubNewClassName("");
    setSubCode("");
    setSubName("");
    setSubCredit(1.5);
    setSubHours(3);
    setIsAddSubjectOpen(true);
  };

  const handleOpenEditSubject = (subject: any) => {
    setEditingSubject(subject);
    const matchedClassId = subject.classroomId || 
      scoreComponents.find(c => c.subjectId === subject.id)?.classroomId ||
      enrollments.find(e => e.subjectId === subject.id)?.classroomId || "";
    setSubClassroomId(matchedClassId);
    setSubNewClassName("");
    setSubCode(subject.code);
    setSubName(subject.name);
    setSubCredit(subject.creditPoints);
    setSubHours(subject.hoursPerWeek);
    setIsEditSubjectOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCode.trim() || !subName.trim()) return;

    let finalClassId = subClassroomId;
    if (finalClassId === "NEW" || (!finalClassId && classrooms.length === 0)) {
      if (!subNewClassName.trim()) {
        alert("กรุณาระบุชื่อห้องเรียน เช่น ม.1 หรือ ม.1/1");
        return;
      }
      finalClassId = addClassroom(subNewClassName.trim());
    }

    if (isAddSubjectOpen) {
      addSubject(subCode.trim(), subName.trim(), subCredit, subHours, finalClassId);
      setIsAddSubjectOpen(false);
      saveAccountData();
      alert("เพิ่มวิชาเรียนใหม่สำเร็จ");
    } else if (isEditSubjectOpen && editingSubject) {
      updateSubject({
        ...editingSubject,
        code: subCode.trim(),
        name: subName.trim(),
        creditPoints: subCredit,
        hoursPerWeek: subHours,
        classroomId: finalClassId || undefined
      });
      setIsEditSubjectOpen(false);
      saveAccountData();
      alert("แก้ไขข้อมูลวิชาเรียนสำเร็จ");
    }
  };

  const handleDeleteSubject = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบวิชาเรียนนี้? ข้อมูลการเข้าเรียนและคะแนนที่เกี่ยวข้องทั้งหมดจะถูกลบอย่างถาวร")) {
      deleteSubject(id);
      saveAccountData();
      alert("ลบรายวิชาสำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ตั้งค่าระบบและเกณฑ์การเรียน</h2>
          <p className="text-sm text-muted-foreground">
            ปรับแต่งสูตรการตัดเกรด เกณฑ์คะแนน ล็อกผลการเรียน และปรับแก้ยอดคะแนนรายคน
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Configuration Cards */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* System & Branding Settings Card */}
          <div className="glass rounded-3xl p-6 border border-border flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                ชื่อระบบและตราสัญลักษณ์
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                Base64 Image
              </span>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4">
              {/* Main Title */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อระบบหลัก (Main Title)</label>
                <input
                  type="text"
                  placeholder="เช่น GradeD Portal"
                  value={mainTitleInput}
                  onChange={(e) => setMainTitleInput(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">คำบรรยายระบบ (Subtitle)</label>
                <input
                  type="text"
                  placeholder="เช่น ระบบบันทึกผลการเรียนและเช็คชื่อ"
                  value={subTitleInput}
                  onChange={(e) => setSubTitleInput(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              {/* Teacher Display Name */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อครูผู้สอนที่แสดงบนระบบ</label>
                <input
                  type="text"
                  placeholder="เช่น คุณครูผู้สอน หรือ ครูสมชาย"
                  value={teacherNameInput}
                  onChange={(e) => setTeacherNameInput(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              {/* School Logo (Base64) */}
              <div className="pt-2 border-t border-border/80">
                <label className="block text-xs font-bold text-muted-foreground mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                    โลโก้โรงเรียน (Base64)
                  </span>
                  {schoolLogoInput && (
                    <button
                      type="button"
                      onClick={() => setSchoolLogoInput(null)}
                      className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5"
                    >
                      <CloseIcon className="h-3 w-3" /> ลบรูป
                    </button>
                  )}
                </label>
                
                <div className="flex items-center gap-3">
                  {schoolLogoInput ? (
                    <img
                      src={schoolLogoInput}
                      alt="School Logo Preview"
                      className="h-12 w-12 rounded-2xl object-contain bg-muted/40 p-1 border border-border shadow-sm"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-muted/40 border border-dashed border-border flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-5 w-5 opacity-40" />
                    </div>
                  )}

                  <label className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-border/90 bg-muted/30 hover:bg-muted/60 py-2 px-3 text-xs font-medium text-foreground cursor-pointer transition-colors">
                    <Upload className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{schoolLogoInput ? "เปลี่ยนรูปโลโก้" : "อัปโหลดรูปโลโก้"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "schoolLogo")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Teacher Avatar (Base64) */}
              <div className="pt-2 border-t border-border/80">
                <label className="block text-xs font-bold text-muted-foreground mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-emerald-600" />
                    โลโก้ / รูปโปรไฟล์ครูผู้สอน (Base64)
                  </span>
                  {teacherAvatarInput && (
                    <button
                      type="button"
                      onClick={() => setTeacherAvatarInput(null)}
                      className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5"
                    >
                      <CloseIcon className="h-3 w-3" /> ลบรูป
                    </button>
                  )}
                </label>
                
                <div className="flex items-center gap-3">
                  {teacherAvatarInput ? (
                    <img
                      src={teacherAvatarInput}
                      alt="Teacher Avatar Preview"
                      className="h-12 w-12 rounded-full object-cover border border-emerald-500/30 shadow-sm"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted/40 border border-dashed border-border flex items-center justify-center text-muted-foreground">
                      <User className="h-5 w-5 opacity-40" />
                    </div>
                  )}

                  <label className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-border/90 bg-muted/30 hover:bg-muted/60 py-2 px-3 text-xs font-medium text-foreground cursor-pointer transition-colors">
                    <Upload className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{teacherAvatarInput ? "เปลี่ยนรูปโปรไฟล์" : "อัปโหลดรูปโปรไฟล์"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "teacherAvatar")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingBranding}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/15 disabled:opacity-55"
              >
                <Save className="h-4 w-4" />
                {isSavingBranding ? "กำลังบันทึก..." : "บันทึกการตั้งค่าระบบและตราสัญลักษณ์"}
              </button>
            </form>
          </div>

          {/* Google Fonts Setting Card */}
          <div className="glass rounded-3xl p-6 border border-border flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Type className="h-5 w-5 text-emerald-600" />
                รูปแบบฟอนต์ระบบ (Google Fonts)
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                Google Fonts
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              เลือกฟอนต์ภาษาไทยและภาษาอังกฤษจาก Google Fonts สำหรับแสดงผลทั่วทั้งระบบ
            </p>

            {/* Current Font Live Preview */}
            <div className="mb-4 p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">ฟอนต์ที่ใช้งานปัจจุบัน</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{font}</span>
              </div>
              <div 
                className="text-sm font-medium text-foreground p-2.5 rounded-xl bg-background border border-border/60 transition-all"
                style={{ fontFamily: `'${font}', sans-serif` }}
              >
                ยินดีต้อนรับสู่ระบบตัดเกรด GradeD Portal 1234567890 (กขค ABC)
              </div>
            </div>

            {/* Preset Google Fonts */}
            <div className="space-y-1.5 mb-4 max-h-60 overflow-y-auto pr-1">
              {[
                { name: "Prompt", desc: "ทางการ ทันสมัย (แนะนำ)", sample: "Prompt ฟอนต์พร้อมทันสมัย" },
                { name: "Sarabun", desc: "สารบรรณ ทางการ อ่านง่าย", sample: "Sarabun หนังสือราชการ" },
                { name: "Kanit", desc: "คณิต โมเดิร์น หัวกลม", sample: "Kanit สวยงามทันสมัย" },
                { name: "Mitr", desc: "มิตร นุ่มนวล สบายตา", sample: "Mitr ตัวหนังสือสบายตา" },
                { name: "Noto Sans Thai", desc: "Google Noto คมชัดสากล", sample: "Noto Sans Thai คมชัด" },
                { name: "Chakra Petch", desc: "จักรเพชร โฉบเฉี่ยว เทคโน", sample: "Chakra Petch ทรงเหลี่ยม" },
                { name: "Bai Jamjuree", desc: "จามจุรี โดดเด่น มีเอกลักษณ์", sample: "Bai Jamjuree ตัวกลมมน" },
                { name: "IBM Plex Sans Thai", desc: "ไอบีเอ็ม เรียบหรู ชัดเจน", sample: "IBM Plex Sans ชัดเจน" },
                { name: "Anuphan", desc: "อนุพันธ์ มินิมอล ร่วมสมัย", sample: "Anuphan มินิมอลเรียบง่าย" },
                { name: "Krub", desc: "ครับ สะอาด เรียบร้อย", sample: "Krub ฟอนต์ครับอ่านง่าย" },
                { name: "Inter", desc: "อินเตอร์ สากล คลีน", sample: "Inter International Font" }
              ].map((f) => {
                const isSelected = font === f.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => {
                      setFont(f.name);
                      setCustomFontInput(f.name);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 font-semibold"
                        : "border-border bg-background hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold" style={{ fontFamily: `'${f.name}', sans-serif` }}>
                        {f.name} <span className="text-[10px] font-normal text-muted-foreground">({f.desc})</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground/80 mt-0.5" style={{ fontFamily: `'${f.name}', sans-serif` }}>
                        {f.sample}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Google Font Input */}
            <div className="pt-3 border-t border-border">
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                หรือพิมพ์ระบุชื่อ Google Font:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="เช่น Mali, Itim, Chonburi, Pattaya"
                  value={customFontInput}
                  onChange={(e) => setCustomFontInput(e.target.value)}
                  className="flex-1 rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customFontInput.trim()) {
                      setFont(customFontInput.trim());
                      alert(`เปลี่ยนฟอนต์ระบบเป็น "${customFontInput.trim()}" เรียบร้อยแล้ว`);
                    }
                  }}
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 transition-all active:scale-95 shadow-sm"
                >
                  ปรับใช้
                </button>
              </div>
            </div>
          </div>

          {/* iOS & Mobile Web App Guide Card */}
          <div className="glass rounded-3xl p-6 border border-border flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                ใช้งานบน iOS (iPhone & iPad)
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                PWA App
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              คุณสามารถติดตั้ง GradeD Portal เป็นแอปพลิเคชันเต็มหน้าจอบน iPhone และ iPad ได้โดยไม่ต้องโหลดผ่าน App Store:
            </p>

            <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border text-xs text-foreground">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
                <p>เปิดเว็บไซต์นี้ในเบราว์เซอร์ <strong>Safari</strong> บน iPhone หรือ iPad</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">2</span>
                <p>กดปุ่ม <strong>แชร์ (Share <Share2 className="inline h-3 w-3 mx-0.5 text-emerald-600" />)</strong> ที่แถบเมนูด้านล่างของ Safari</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">3</span>
                <p>เลื่อนลงมาแล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</strong></p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">4</span>
                <p>กด <strong>&quot;เพิ่ม&quot; (Add)</strong> เพื่อรับไอคอนแอปบนหน้าจอโฮม เปิดใช้งานแบบเต็มจอได้ทันที</p>
              </div>
            </div>
          </div>

          {/* Teacher Profile Card */}
          <div className="glass rounded-3xl p-6 border border-border flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <User className="h-5 w-5 text-emerald-600" />
                ข้อมูลครูผู้สอน
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                {user?.role === "teacher" ? "คุณครูผู้สอน" : "ผู้ดูแลระบบ"}
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold border-2 border-emerald-500/25 text-2xl shadow-sm">
                  {teacherFirstName ? teacherFirstName[0] : "?"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อจริง</label>
                <input
                  type="text"
                  value={teacherFirstName}
                  onChange={(e) => setTeacherFirstName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">นามสกุล</label>
                <input
                  type="text"
                  value={teacherLastName}
                  onChange={(e) => setTeacherLastName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">อีเมลผู้ใช้งาน</label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-55"
              >
                <Save className="h-4 w-4" />
                {isSavingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูลส่วนตัว"}
              </button>
            </form>
          </div>

          {/* Grade Range Formula Settings */}
          <div className="glass rounded-3xl p-6 border border-border h-fit flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Sliders className="h-5 w-5 text-emerald-600" />
              เกณฑ์คะแนนและสัดส่วนเกรด
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">มาตรฐาน</span>
          </div>

          <form onSubmit={handleSaveRules} className="space-y-4">
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {ranges.map((range, idx) => (
                <div key={range.grade} className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-2xl border border-border">
                  <span className="w-12 text-xs font-bold text-foreground">เกรด {range.grade}</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[10px] text-muted-foreground">เริ่มที่:</span>
                    <input
                      type="number"
                      value={range.min}
                      onChange={(e) => handleRangeChange(idx, "min", e.target.value)}
                      min={0}
                      max={100}
                      step={0.5}
                      required
                      className="w-16 rounded-xl border border-border bg-background py-1 text-center text-xs outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground">-</span>
                    <input
                      type="number"
                      value={range.max}
                      onChange={(e) => handleRangeChange(idx, "max", e.target.value)}
                      min={0}
                      max={100}
                      step={0.5}
                      required
                      className="w-16 rounded-xl border border-border bg-background py-1 text-center text-xs outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">({range.gpaPoints} GPA)</span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-[0.98] transition-all shadow-md"
            >
              <Save className="h-4 w-4" />
              บันทึกโครงสร้างเกรด
            </button>
          </form>
        </div>
        </div>

        {/* Right Column: Grade Lock and Overrides Panel */}
        <div className="lg:col-span-2 glass rounded-3xl border border-border overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FolderLock className="h-4 w-4 text-emerald-600" />
              ล็อกผลคะแนน / แก้ไขเกรดรายวิชารายตัว
            </span>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>การล็อกเกรดจะป้องกันไม่ให้คะแนนย่อยอัปเดตสถิติทับผลเรียน</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/15 text-muted-foreground font-bold border-b border-border sticky top-0 bg-card/95 z-10 select-none">
                <tr>
                  <th className="p-4 w-16 text-center">เลขที่</th>
                  <th className="p-4">นักเรียน</th>
                  <th className="p-4 w-28 text-center">คะแนนดิบรวม</th>
                  <th className="p-4 w-24 text-center">คะแนนพฤติกรรม</th>
                  <th className="p-4 w-24 text-center">เกรดระบบ</th>
                  <th className="p-4 w-28 text-center">สถานะล็อก</th>
                  <th className="p-4 w-32 text-center">สิทธิ์ผู้ตรวจ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gradeResultList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      <p className="font-semibold text-sm">ไม่พบข้อมูลประมวลผลผลการเรียน</p>
                      <p className="text-xs">กรุณากรอกคะแนนผู้เรียนในหน้า "บันทึกคะแนน" เพื่อเริ่มการประมวลผลเกรด</p>
                    </td>
                  </tr>
                ) : (
                  gradeResultList.map((res) => {
                    const std = activeStudents.find(s => s.id === res.studentId);
                    return (
                      <tr key={res.id} className="hover:bg-muted/10">
                        <td className="p-4 text-center font-semibold text-muted-foreground">{std?.rollNo || "-"}</td>
                        <td className="p-4 font-semibold text-foreground">
                          {std ? `${std.prefix}${std.firstName} ${std.lastName}` : "ไม่ระบุชื่อ"}
                        </td>
                        <td className="p-4 text-center text-foreground font-semibold">{res.rawScoreSum}</td>
                        <td className="p-4 text-center text-amber-500 font-bold">{res.bonusScoreSum > 0 ? `+${res.bonusScoreSum}` : res.bonusScoreSum}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-700">
                            {res.grade}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleLock(res.studentId)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                              res.isLocked 
                                ? "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20" 
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                            }`}
                          >
                            {res.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            {res.isLocked ? "ล็อกแล้ว" : "ไม่ได้ล็อก"}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOverrideGrade(res.studentId, res.grade)}
                            disabled={res.isLocked}
                            className="text-[10px] bg-card border border-border hover:bg-muted font-bold px-2 py-1 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                          >
                            เปลี่ยนเกรด
                          </button>
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

      {/* Row 2: Subject Management Section */}
      <div className="mt-8 glass rounded-3xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            จัดการโครงสร้างรายวิชาเรียน
          </span>
          <button
            onClick={handleOpenAddSubject}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มวิชาเรียน
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/15 text-muted-foreground font-bold border-b border-border select-none">
              <tr>
                <th className="p-4 w-32">รหัสวิชา</th>
                <th className="p-4">ชื่อรายวิชา</th>
                <th className="p-4 w-36 text-center">ห้องเรียนที่สอน</th>
                <th className="p-4 w-28 text-center">หน่วยกิต</th>
                <th className="p-4 w-32 text-center">ชั่วโมง / สัปดาห์</th>
                <th className="p-4 w-28 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">ไม่พบข้อมูลรายวิชาในระบบ</td>
                </tr>
              ) : (
                subjects.map((sub) => {
                  const matchedClassId = sub.classroomId || 
                    scoreComponents.find(c => c.subjectId === sub.id)?.classroomId ||
                    enrollments.find(e => e.subjectId === sub.id)?.classroomId;
                  const matchedClass = classrooms.find(c => c.id === matchedClassId);

                  return (
                    <tr key={sub.id} className="hover:bg-muted/10">
                      <td className="p-4 font-mono font-bold text-foreground">{sub.code}</td>
                      <td className="p-4 font-semibold text-foreground">{sub.name}</td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                          {matchedClass ? `ห้อง ${matchedClass.name}` : "ทุกห้อง"}
                        </span>
                      </td>
                      <td className="p-4 text-center text-foreground font-semibold">{sub.creditPoints} หน่วยกิต</td>
                      <td className="p-4 text-center text-foreground">{sub.hoursPerWeek} ชม.</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditSubject(sub)}
                            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors"
                            title="แก้ไขรายวิชา"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                            title="ลบรายวิชา"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Academic Year Management Section */}
      <div className="mt-8 glass rounded-3xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-emerald-600" />
            จัดการปีการศึกษา
          </span>
          <button
            onClick={handleOpenAddYear}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มปีการศึกษา
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/15 text-muted-foreground font-bold border-b border-border select-none">
              <tr>
                <th className="p-4">ปีการศึกษา</th>
                <th className="p-4 w-36 text-center">สถานะ</th>
                <th className="p-4 w-28 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {academicYears.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted-foreground">ไม่พบข้อมูลปีการศึกษาในระบบ</td>
                </tr>
              ) : (
                academicYears.map((ay) => (
                  <tr key={ay.id} className="hover:bg-muted/10">
                    <td className="p-4 font-bold text-foreground">{ay.year}</td>
                    <td className="p-4 text-center text-foreground font-semibold">
                      <span className={`px-2 py-0.5 rounded font-bold ${ay.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        {ay.status === 'active' ? 'ใช้งานอยู่' : 'ปิดแล้ว'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditYear(ay)}
                          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="แก้ไขปีการศึกษา"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteYear(ay.id, ay.year)}
                          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                          title="ลบปีการศึกษา"
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

      {/* Row 3: Classroom Management Section */}
      <div className="mt-8 glass rounded-3xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <User className="h-4 w-4 text-emerald-600" />
            จัดการรายชื่อห้องเรียน
          </span>
          <button
            onClick={handleOpenAddClassroom}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มห้องเรียน
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/15 text-muted-foreground font-bold border-b border-border select-none">
              <tr>
                <th className="p-4">ชื่อห้องเรียน</th>
                <th className="p-4 w-36 text-center">จำนวนนักเรียน</th>
                <th className="p-4 w-28 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classrooms.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted-foreground">ไม่พบข้อมูลห้องเรียนในระบบ</td>
                </tr>
              ) : (
                classrooms.map((cls) => {
                  const count = students.filter(s => s.classroomId === cls.id).length;
                  return (
                    <tr key={cls.id} className="hover:bg-muted/10">
                      <td className="p-4 font-bold text-foreground">ห้อง {cls.name}</td>
                      <td className="p-4 text-center text-foreground font-semibold">{count} คน</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditClassroom(cls)}
                            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors"
                            title="แก้ไขชื่อห้องเรียน"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClassroom(cls.id, cls.name)}
                            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                            title="ลบห้องเรียน"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add / Edit Subject Modal Dialog */}
      {(isAddSubjectOpen || isEditSubjectOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-foreground">
              {isAddSubjectOpen ? "เพิ่มวิชาเรียนใหม่" : "แก้ไขข้อมูลวิชาเรียน"}
            </h3>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  ห้องเรียน (วิชานี้สำหรับนักเรียนห้องไหน)
                </label>
                {classrooms.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={subClassroomId}
                      onChange={(e) => setSubClassroomId(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground cursor-pointer font-bold"
                    >
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id} className="dark:bg-card">
                          ห้อง {c.name}
                        </option>
                      ))}
                      <option value="NEW" className="text-emerald-600 font-bold dark:bg-card">
                        + พิมพ์ชื่อห้องเรียนใหม่เอง...
                      </option>
                    </select>
                    {subClassroomId === "NEW" && (
                      <input
                        type="text"
                        placeholder="ระบุชื่อห้องเรียน เช่น ม.1 หรือ ม.1/1"
                        value={subNewClassName}
                        onChange={(e) => setSubNewClassName(e.target.value)}
                        required
                        className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground font-semibold"
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="ระบุชื่อห้องเรียน เช่น ม.1 หรือ ม.1/1"
                      value={subNewClassName}
                      onChange={(e) => setSubNewClassName(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground font-semibold"
                      autoFocus
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      ระบบจะสร้างห้องเรียนนี้และผูกกับวิชานี้ให้อัตโนมัติทันที
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">รหัสวิชา</label>
                <input
                  type="text"
                  placeholder="เช่น ว21101"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อรายวิชา</label>
                <input
                  type="text"
                  placeholder="เช่น วิทยาศาสตร์ 1"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">หน่วยกิต</label>
                  <input
                    type="number"
                    value={subCredit}
                    onChange={(e) => setSubCredit(parseFloat(e.target.value))}
                    min={0.5}
                    max={5.0}
                    step={0.5}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">ชั่วโมง / สัปดาห์</label>
                  <input
                    type="number"
                    value={subHours}
                    onChange={(e) => setSubHours(parseInt(e.target.value))}
                    min={1}
                    max={20}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSubjectOpen(false);
                    setIsEditSubjectOpen(false);
                  }}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  บันทึกรายวิชา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Classroom Modal Dialog */}
      {(isAddClassroomOpen || isEditClassroomOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-foreground">
              {isAddClassroomOpen ? "เพิ่มห้องเรียนใหม่" : "แก้ไขชื่อห้องเรียน"}
            </h3>

            <form onSubmit={handleSaveClassroom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อห้องเรียน / ชั้นเรียน</label>
                <input
                  type="text"
                  placeholder="เช่น ม.1/1 หรือ ม.2/3"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddClassroomOpen(false);
                    setIsEditClassroomOpen(false);
                  }}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  บันทึกห้องเรียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Year Modal Dialog */}
      {(isAddYearOpen || isEditYearOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-foreground">
              {isAddYearOpen ? "เพิ่มปีการศึกษาใหม่" : "แก้ไขปีการศึกษา"}
            </h3>

            <form onSubmit={handleSaveYear} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ปีการศึกษา (พ.ศ.)</label>
                <input
                  type="number"
                  placeholder="เช่น 2570"
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-emerald-500 text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddYearOpen(false);
                    setIsEditYearOpen(false);
                  }}
                  className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  บันทึกปีการศึกษา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
