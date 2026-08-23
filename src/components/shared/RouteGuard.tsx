"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/features/auth/context";
import { useRouter, usePathname } from "next/navigation";

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const rawPathname = usePathname();
  const normalizedPathname = (rawPathname || "/").replace(/\/$/, "") || "/";

  const isPublicPage = normalizedPathname === "/login" || normalizedPathname === "/register";

  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicPage) {
        router.replace("/login");
      }
    }
  }, [user, loading, isPublicPage, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">กำลังโหลดข้อมูลระบบ...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and trying to access private page, render nothing while redirecting
  if (!user && !isPublicPage) {
    return null;
  }

  return <>{children}</>;
};
