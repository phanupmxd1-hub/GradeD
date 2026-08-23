"use client";

import React, { useState } from "react";
import { useAuth } from "@/features/auth/context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Mail, User, Sparkles, AlertCircle, ShieldCheck, UserCheck } from "lucide-react";
import { RouteGuard } from "@/components/shared/RouteGuard";

export default function RegisterPage() {
  return <RegisterContent />;
}

function RegisterContent() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "school_admin">("teacher");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("กรุณากรอกชื่อจริงและนามสกุลให้ครบถ้วน");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName, lastName, role);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดในการลงทะเบียนสมาชิก");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-300/20 blur-[120px] dark:bg-emerald-950/20" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-400/10 blur-[150px] dark:bg-emerald-900/10" />

      {/* Main Glassmorphic Card */}
      <div className="glass w-full max-w-lg rounded-3xl p-8 md:p-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 mb-3 shadow-inner">
            <Sparkles className="h-7 w-7 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            ลงทะเบียนสมาชิก GradeD
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            สร้างบัญชีผู้ใช้ใหม่สำหรับคุณครูเพื่อเข้าใช้งานระบบบริหารจัดการเกรด
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                ชื่อจริง
              </label>
              <div className="relative">
                <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="เช่น สายทิพย์"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background/50 py-3 pr-4 pl-10 text-xs outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                นามสกุล
              </label>
              <input
                type="text"
                required
                placeholder="เช่น แก้วหนา"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background/50 py-3 px-4 text-xs outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              อีเมลผู้ใช้งาน
            </label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="teacher@school.ac.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background/50 py-3 pr-4 pl-10 text-xs outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <KeyRound className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background/50 py-3 pr-4 pl-10 text-xs outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                ยืนยันรหัสผ่าน
              </label>
              <div className="relative">
                <KeyRound className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background/50 py-3 pr-4 pl-10 text-xs outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              บทบาทตำแหน่งในโรงเรียน
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-semibold transition-all ${
                  role === "teacher"
                    ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <UserCheck className="h-4 w-4" />
                คุณครูผู้สอน
              </button>
              <button
                type="button"
                onClick={() => setRole("school_admin")}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-semibold transition-all ${
                  role === "school_admin"
                    ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                ผู้ดูแลระบบ/ผู้อำนวยการ
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "ลงทะเบียนเข้าใช้งานฟรี"
            )}
          </button>
        </form>

        <div className="my-5 flex items-center justify-between gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">หรือ</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-background/50 px-4 py-3 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          สมัคร/เข้าสู่ระบบด้วย Google
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            มีบัญชีผู้ใช้งานอยู่แล้วใช่ไหม?{" "}
            <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              เข้าสู่ระบบที่นี่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
