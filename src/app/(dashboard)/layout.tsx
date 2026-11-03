"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/context";
import { useTheme } from "@/components/providers/ThemeProvider";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { useGMSStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  GraduationCap, 
  Award, 
  FileSpreadsheet, 
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  BookOpen,
  ChevronDown,
  User as UserIcon,
  Sparkles,
  Cloud,
  CloudOff,
  Loader2,
  Check
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { name: "สรุปผลระบบ", path: "/dashboard", icon: LayoutDashboard },
  { name: "จัดการข้อมูลนักเรียน", path: "/students", icon: Users },
  { name: "เช็คชื่อเข้าเรียน", path: "/attendance", icon: CalendarCheck },
  { name: "บันทึกคะแนน", path: "/scores", icon: GraduationCap },
  { name: "คะแนนจิตพิสัย", path: "/bonus", icon: Award },
  { name: "ออกรายงาน", path: "/reports", icon: FileSpreadsheet },
  { name: "ตั้งค่าระบบ", path: "/settings", icon: SettingsIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <LayoutContent>{children}</LayoutContent>
    </RouteGuard>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  // Zustand Store selectors and state
  const {
    activeAcademicYearId,
    activeSemesterId,
    activeClassroomId,
    activeSubjectId,
    academicYears,
    semesters,
    classrooms,
    subjects,
    setActiveAcademicYearId,
    setActiveSemesterId,
    setActiveClassroomId,
    setActiveSubjectId,
    calculateGrades,
    addClassroom,
    addSubject,
    scoreComponents,
    enrollments,
    loadAccountData,
    syncStatus,
    syncError,
    lastSavedTime,
    saveAccountData,
    mainTitle,
    subTitle,
    teacherName,
    teacherAvatar,
    schoolLogo
  } = useGMSStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubClassroomId, setNewSubClassroomId] = useState("");
  const [newSubNewClassName, setNewSubNewClassName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCredit, setNewSubCredit] = useState(1.5);
  const [newSubHours, setNewSubHours] = useState(3);

  // Helper to find which classroom a subject belongs to
  const getSubjectClassroomId = (subjectId: string) => {
    const s = subjects.find(sub => sub.id === subjectId);
    return s?.classroomId || 
      scoreComponents.find(c => c.subjectId === subjectId)?.classroomId ||
      enrollments.find(e => e.subjectId === subjectId)?.classroomId;
  };

  // Auto-synchronize classroom and subject when selecting
  const handleSubjectChange = (subjectId: string) => {
    if (subjectId === "ADD_NEW") {
      setNewSubClassroomId(activeClassroomId || (classrooms[0] ? classrooms[0].id : "NEW"));
      setNewSubNewClassName("");
      setNewSubCode("");
      setNewSubName("");
      setNewSubCredit(1.5);
      setNewSubHours(3);
      setIsAddSubjectOpen(true);
    } else {
      setActiveSubjectId(subjectId);
      // Auto-switch classroom to match the selected subject
      const matchedClassId = getSubjectClassroomId(subjectId);
      if (matchedClassId && classrooms.some(c => c.id === matchedClassId)) {
        setActiveClassroomId(matchedClassId);
      }
    }
  };

  // Load account data from Firestore when user changes
  useEffect(() => {
    if (user?.email) {
      loadAccountData(user.email);
    }
  }, [user?.email, loadAccountData]);

  // Listen for global Ctrl+S / Cmd+S shortcut to trigger manual Cloud save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveAccountData();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [saveAccountData]);

  // Trigger recalculate grades once when selection changes to keep summaries updated
  useEffect(() => {
    if (activeClassroomId && activeSubjectId && activeSemesterId) {
      calculateGrades();
    }
  }, [activeClassroomId, activeSubjectId, activeSemesterId, calculateGrades]);

  // Current selections
  const currentYear = academicYears.find(y => y.id === activeAcademicYearId);
  const currentSemester = semesters.find(s => s.id === activeSemesterId);
  const currentClass = classrooms.find(c => c.id === activeClassroomId);
  const currentSubject = subjects.find(s => s.id === activeSubjectId);

  // Active path matcher
  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden w-72 border-r border-border bg-card/65 backdrop-blur-md lg:flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="flex h-20 items-center gap-3 px-5 border-b border-border">
          {schoolLogo ? (
            <img src={schoolLogo} alt="Logo" className="h-11 w-11 rounded-2xl object-contain bg-muted/40 p-1 border border-border shadow-sm shrink-0" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/25 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-foreground text-base truncate">{mainTitle || "GradeD Portal"}</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-full shrink-0">v2.0</span>
            </div>
            {subTitle && (
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5" title={subTitle}>{subTitle}</p>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-200 group ${
                  active 
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/15" 
                    : "text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${active ? "text-white" : "text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3 mb-4">
            {teacherAvatar ? (
              <img src={teacherAvatar} alt="Teacher" className="h-10 w-10 rounded-full object-cover border border-emerald-500/30 shadow-sm shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/10 shrink-0">
                {teacherName ? teacherName[0] : user?.firstName ? user.firstName[0] : <UserIcon className="h-5 w-5" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{teacherName || `${user?.firstName || "คุณครู"} ${user?.lastName || ""}`}</p>
              <p className="text-xs text-muted-foreground truncate uppercase tracking-wider font-semibold">
                {user?.role === "teacher" ? "คุณครูผู้สอน" : "ผู้ดูแลระบบ"}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10 active:scale-[0.98] transition-all"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile (Drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-background/80 backdrop-blur-sm">
          <div className="relative flex w-full max-w-xs flex-col bg-card p-6 shadow-2xl border-r border-border animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="Logo" className="h-9 w-9 rounded-xl object-contain bg-muted/40 p-0.5 border border-border" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <span className="font-bold tracking-tight text-foreground text-base truncate block">{mainTitle || "GradeD Portal"}</span>
                  {subTitle && <span className="text-[10px] text-muted-foreground block truncate">{subTitle}</span>}
                </div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-2xl transition-all duration-200 ${
                      active 
                        ? "bg-emerald-600 text-white" 
                        : "text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-border mt-auto">
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  logout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/5 border border-red-500/10 py-3 text-sm font-medium text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Top Navbar */}
        <header className="glass-nav sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl border border-border lg:hidden text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Context Global Dropdowns Selector (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 bg-muted/40 p-1 rounded-2xl border border-border/80">
              
              {/* Year Dropdown */}
              <div className="relative group">
                <select
                  value={activeAcademicYearId}
                  onChange={(e) => setActiveAcademicYearId(e.target.value)}
                  className="appearance-none bg-transparent py-1.5 pl-3 pr-8 text-xs font-semibold text-foreground outline-none cursor-pointer"
                >
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id} className="dark:bg-card">ปีการศึกษา {y.year}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              <div className="h-4 w-px bg-border" />

              {/* Semester Dropdown */}
              <div className="relative group">
                <select
                  value={activeSemesterId}
                  onChange={(e) => setActiveSemesterId(e.target.value)}
                  className="appearance-none bg-transparent py-1.5 pl-3 pr-8 text-xs font-semibold text-foreground outline-none cursor-pointer"
                >
                  {semesters.filter(s => s.academicYearId === activeAcademicYearId).map(s => (
                    <option key={s.id} value={s.id} className="dark:bg-card">ภาคเรียนที่ {s.semesterNo}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              <div className="h-4 w-px bg-border" />

              {/* Classroom Dropdown for Students page, or Subject Dropdown for other pages */}
              {pathname === "/students" ? (
                <div className="relative group">
                  <select
                    value={activeClassroomId}
                    onChange={(e) => setActiveClassroomId(e.target.value)}
                    className="appearance-none bg-transparent py-1.5 pl-3 pr-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer"
                  >
                    {classrooms.map(c => {
                      const count = c.studentCount || 0;
                      return (
                        <option key={c.id} value={c.id} className="dark:bg-card text-foreground font-semibold">
                          ห้อง {c.name} ({count} คน)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-emerald-600 pointer-events-none" />
                </div>
              ) : (
                <div className="relative group">
                  <select
                    value={activeSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="appearance-none bg-transparent py-1.5 pl-3 pr-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer"
                  >
                    {subjects.length > 0 ? (
                      subjects.map(s => {
                        const matchedClassId = getSubjectClassroomId(s.id);
                        const matchedClass = classrooms.find(c => c.id === matchedClassId);
                        return (
                          <option key={s.id} value={s.id} className="dark:bg-card text-foreground font-semibold">
                            {s.code} - {s.name}{matchedClass ? ` (ห้อง ${matchedClass.name})` : ""}
                          </option>
                        );
                      })
                    ) : (
                      <option value="" disabled className="dark:bg-card text-muted-foreground">
                        -- ยังไม่มีวิชาเรียน --
                      </option>
                    )}
                    <option value="ADD_NEW" className="text-emerald-600 font-bold dark:bg-card">
                      + เพิ่มวิชาเรียนใหม่...
                    </option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-emerald-600 pointer-events-none" />
                </div>
              )}

            </div>

            {/* Selection indicators on mobile */}
            <div className="lg:hidden flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full">
              {pathname === "/students" ? (
                <>
                  <Users className="h-3.5 w-3.5" />
                  <span>{currentClass ? `ห้อง ${currentClass.name}` : "ยังไม่ได้เลือกห้อง"}</span>
                </>
              ) : (
                <>
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{currentSubject ? `${currentSubject.code} ${currentSubject.name}${currentClass ? ` (ห้อง ${currentClass.name})` : ""}` : "ยังไม่ได้เลือกวิชา"}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Header Toolbar */}
          <div className="flex items-center gap-3">
            {/* Cloud Sync Button */}
            <div className="flex flex-col items-end mr-1">
              <button
                onClick={() => saveAccountData()}
                disabled={syncStatus === "saving"}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                  syncStatus === "saving"
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400"
                    : syncStatus === "saved"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                    : syncStatus === "error"
                    ? "bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400"
                    : "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-500 hover:border-emerald-600 shadow-md shadow-emerald-600/15"
                }`}
                title="บันทึกขึ้น Cloud ถาวร (คีย์ลัด Ctrl + S)"
              >
                {syncStatus === "saving" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {syncStatus === "saved" && (
                  <Check className="h-3.5 w-3.5" />
                )}
                {syncStatus === "error" && (
                  <CloudOff className="h-3.5 w-3.5 animate-bounce" />
                )}
                {syncStatus === "idle" && (
                  <Cloud className="h-3.5 w-3.5" />
                )}
                <span>
                  {syncStatus === "saving"
                    ? "กำลังบันทึก..."
                    : syncStatus === "saved"
                    ? "บันทึกสำเร็จ"
                    : syncStatus === "error"
                    ? "ล้มเหลว!"
                    : "บันทึกข้อมูล"}
                </span>
              </button>
              <span className={`text-[10px] mt-1 font-medium ${syncStatus === "error" ? "text-red-500" : "text-muted-foreground"}`}>
                {syncStatus === "error" && syncError
                  ? `ข้อผิดพลาด: ${syncError}`
                  : lastSavedTime
                  ? `เซฟล่าสุด: ${lastSavedTime}`
                  : "กดเซฟหรือใช้ Ctrl + S"}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all"
              title={theme === "light" ? "เปิดโหมดมืด" : "เปิดโหมดสว่าง"}
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Quick stats: Active class info */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-muted-foreground">จำนวนนักเรียน</span>
              <span className="text-sm font-bold text-foreground">{currentClass?.studentCount || 0} คน</span>
            </div>
          </div>
        </header>

        {/* Global Context Mobile Selector Panel (only on Mobile layout) */}
        <div className="lg:hidden flex flex-wrap gap-2 px-4 py-2 border-b border-border/80 bg-muted/10">
          <select
            value={activeAcademicYearId}
            onChange={(e) => setActiveAcademicYearId(e.target.value)}
            className="bg-card border border-border rounded-xl px-2 py-1 text-xs font-medium text-foreground cursor-pointer"
          >
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>ปี {y.year}</option>
            ))}
          </select>
          <select
            value={activeSemesterId}
            onChange={(e) => setActiveSemesterId(e.target.value)}
            className="bg-card border border-border rounded-xl px-2 py-1 text-xs font-medium text-foreground cursor-pointer"
          >
            {semesters.filter(s => s.academicYearId === activeAcademicYearId).map(s => (
              <option key={s.id} value={s.id}>เทอม {s.semesterNo}</option>
            ))}
          </select>
          {pathname === "/students" ? (
            <select
              value={activeClassroomId}
              onChange={(e) => setActiveClassroomId(e.target.value)}
              className="bg-card border border-border rounded-xl px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  ห้อง {c.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={activeSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="bg-card border border-border rounded-xl px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer"
            >
              {subjects.map(s => {
                const matchedClassId = getSubjectClassroomId(s.id);
                const matchedClass = classrooms.find(c => c.id === matchedClassId);
                return (
                  <option key={s.id} value={s.id}>
                    {s.name}{matchedClass ? ` (ห้อง ${matchedClass.name})` : ""}
                  </option>
                );
              })}
              <option value="ADD_NEW">+ เพิ่มวิชาเรียน...</option>
            </select>
          )}
        </div>

        {/* Dashboard Main Content Scroll Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8">
          {children}
        </main>

        {/* Mobile / iOS Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg shadow-black/5">
          {[
            { name: "สรุปผล", path: "/dashboard", icon: LayoutDashboard },
            { name: "นักเรียน", path: "/students", icon: Users },
            { name: "เช็คชื่อ", path: "/attendance", icon: CalendarCheck },
            { name: "คะแนน", path: "/scores", icon: GraduationCap },
            { name: "รายงาน", path: "/reports", icon: FileSpreadsheet },
            { name: "ตั้งค่า", path: "/settings", icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all ${
                  active
                    ? "text-emerald-600 dark:text-emerald-400 font-bold scale-105"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${active ? "bg-emerald-500/15" : ""}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Add Subject Dialog Modal with Integrated Classroom Definition */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-border shadow-2xl">
            <h3 className="text-lg font-bold mb-1 text-foreground">เพิ่มวิชาเรียนใหม่</h3>
            <p className="text-xs text-muted-foreground mb-4">
              กำหนดห้องเรียนและวิชาที่สอน เพื่อเชื่อมโยงตารางบันทึกคะแนนและข้อมูลให้อัตโนมัติ
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newSubCode.trim() || !newSubName.trim()) return;

                let chosenClassId = newSubClassroomId;
                if (chosenClassId === "NEW" || (!chosenClassId && classrooms.length === 0)) {
                  if (!newSubNewClassName.trim()) {
                    alert("กรุณาระบุชื่อห้องเรียน เช่น ม.1 หรือ ม.1/1");
                    return;
                  }
                  chosenClassId = addClassroom(newSubNewClassName.trim());
                } else if (!chosenClassId) {
                  chosenClassId = activeClassroomId || classrooms[0]?.id;
                }

                addSubject(
                  newSubCode.trim(),
                  newSubName.trim(),
                  newSubCredit,
                  newSubHours,
                  chosenClassId
                );
                setIsAddSubjectOpen(false);
                setNewSubCode("");
                setNewSubName("");
                setNewSubNewClassName("");
                await saveAccountData();
              }}
              className="space-y-4"
            >
              {/* Classroom Specification */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  ห้องเรียน (วิชานี้สำหรับนักเรียนห้องไหน)
                </label>
                {classrooms.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={newSubClassroomId}
                      onChange={(e) => setNewSubClassroomId(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-xs font-bold outline-none focus:border-emerald-500 text-foreground cursor-pointer"
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
                    {newSubClassroomId === "NEW" && (
                      <input
                        type="text"
                        placeholder="ระบุชื่อห้องเรียน เช่น ม.1 หรือ ม.1/1"
                        value={newSubNewClassName}
                        onChange={(e) => setNewSubNewClassName(e.target.value)}
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
                      value={newSubNewClassName}
                      onChange={(e) => setNewSubNewClassName(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-border bg-background py-2.5 px-3 text-xs outline-none focus:border-emerald-500 text-foreground font-semibold"
                      autoFocus
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      ระบบจะสร้างห้องเรียนนี้และผูกกับวิชานี้ให้อัตโนมัติทันที
                    </span>
                  </div>
                )}
              </div>

              {/* Subject Code */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">รหัสวิชา</label>
                <input
                  type="text"
                  placeholder="เช่น ว21101 หรือ ค21101"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground font-semibold"
                />
              </div>

              {/* Subject Name */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">ชื่อรายวิชา</label>
                <input
                  type="text"
                  placeholder="เช่น วิทยาศาสตร์ 1 หรือ ภาษาไทย"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none focus:border-emerald-500 text-foreground font-semibold"
                />
              </div>

              {/* Credit & Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">หน่วยกิต</label>
                  <input
                    type="number"
                    value={newSubCredit}
                    onChange={(e) => setNewSubCredit(parseFloat(e.target.value) || 1)}
                    min={0.5}
                    max={5.0}
                    step={0.5}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none text-foreground font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">ชั่วโมง / สัปดาห์</label>
                  <input
                    type="number"
                    value={newSubHours}
                    onChange={(e) => setNewSubHours(parseInt(e.target.value) || 1)}
                    min={1}
                    max={20}
                    required
                    className="w-full rounded-2xl border border-border bg-background py-2 px-3 text-xs outline-none text-foreground font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  สร้างวิชาเรียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
