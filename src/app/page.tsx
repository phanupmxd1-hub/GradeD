"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Direct access to dashboard for standalone single-user mode
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">กำลังเข้าสู่ระบบ GradeD Portal...</p>
      </div>
    </div>
  );
}
