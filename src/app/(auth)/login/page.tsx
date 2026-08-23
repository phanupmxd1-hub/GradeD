"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Mail, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  return <LoginContent />;
}

function LoginContent() {
  const { login, loginWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Wait for auth to finish loading, then decide what to show
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // User is genuinely authenticated via Firebase → go to dashboard
        router.replace("/dashboard");
      } else {
        // No user → show login form
        setReady(true);
      }
    }
  }, [user, authLoading, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
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

  // Show loading spinner while checking auth state
  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">กำลังตรวจสอบสถานะ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-300/20 blur-[120px] dark:bg-emerald-950/20" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-400/10 blur-[150px] dark:bg-emerald-900/10" />

      {/* Main Glassmorphic Card */}
      <div className="glass w-full max-w-md rounded-3xl p-8 md:p-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 mb-4 shadow-inner">
            <Sparkles className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            GradeD Portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ระบบบริหารจัดการคะแนนและผลการเรียนสำหรับครูผู้สอน
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              อีเมลผู้ใช้งาน
            </label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="your-email@school.ac.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background/50 py-3.5 pr-4 pl-12 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              รหัสผ่าน
            </label>
            <div className="relative">
              <KeyRound className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background/50 py-3.5 pr-4 pl-12 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            try {
              await login("teacher@school.ac.th", "password");
              router.push("/dashboard");
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 py-3.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          เข้าใช้งานระบบทันที (โหมดผู้ใช้เดี่ยว)
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            ยังไม่มีบัญชีผู้ใช้งาน?{" "}
            <Link href="/register" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              สมัครสมาชิกเข้าใช้งานฟรีที่นี่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
