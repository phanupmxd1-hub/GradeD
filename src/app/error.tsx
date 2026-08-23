'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Captured Application Error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-xl w-full rounded-3xl border border-red-100 bg-red-50/50 p-8 dark:border-red-900/50 dark:bg-red-950/20 shadow-xl backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto mb-4">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400">เกิดข้อผิดพลาดในการโหลดแอปพลิเคชัน</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'ไม่สามารถประมวลผลหน้านี้ได้'}
        </p>
        
        {error.stack && (
          <div className="mt-4 text-left">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Error Details / Stack Trace:
            </span>
            <pre className="max-h-60 overflow-auto rounded-2xl bg-zinc-950 p-4 text-xs font-mono text-zinc-300 border border-zinc-800 leading-relaxed shadow-inner">
              {error.stack}
            </pre>
          </div>
        )}
        
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 active:scale-[0.98] transition-all"
          >
            ลองใหม่อีกครั้ง (Retry)
          </button>
          <button
            onClick={() => window.location.href = '/login/'}
            className="rounded-2xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted active:scale-[0.98] transition-all"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    </div>
  )
}
