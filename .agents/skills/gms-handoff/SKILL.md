---
name: gms-handoff
description: >-
  Handoff skill for the GradeD Portal (GMS) project. Activate this skill when
  working on the GradeD grading management web app, including modifying features,
  fixing bugs, deploying, or understanding the project architecture.
---

# GradeD Portal (GMS) — Project Handoff

## Overview
**GradeD Portal** คือระบบจัดการเกรดและคะแนนนักเรียนสำหรับครูผู้สอน เป็น Next.js Web Application ที่ใช้ Firebase Authentication + Hosting และเก็บข้อมูลแบบ Hybrid (LocalStorage + Firestore)

## Project Location
- **Working Directory**: `C:\Users\pump5\.gemini\antigravity\scratch\gms-app`
- **Live URL**: https://graded-26cb0.web.app/
- **Firebase Project**: `graded-26cb0`

## Tech Stack
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.12 | App Framework (App Router, Static Export) |
| React | 19.2.4 | UI Library |
| TypeScript | 5.x | Type Safety |
| Zustand | 5.x | State Management (single global store) |
| Firebase | 12.x | Auth (Email/Password) + Firestore + Hosting |
| Tailwind CSS | 4.x | Styling |
| Lucide React | 1.x | Icons |
| Recharts | 3.x | Charts/Reports |
| xlsx | 0.18.5 | Excel export |

## Architecture

### Data Persistence (Critical Knowledge)
The app uses a **Hybrid Persistence** model — this is the most important architectural decision:

1. **LocalStorage (Primary / Source of Truth)**: When the user clicks Save (or Ctrl+S), data is written to `localStorage` first under key `gms_user_data_{email}`. This is instant and always succeeds.
2. **Firebase Firestore (Secondary / Cloud Backup)**: After localStorage save succeeds, the app attempts a silent background sync to Firestore collection `userData` with the user's email as the document ID. Cloud sync has an 8-second timeout and failures are silently logged.
3. **On Page Load**: If localStorage has data, it's loaded immediately and Firestore is NOT consulted (to prevent stale cloud data from overwriting newer local saves). Firestore is only used when there's no local cache (new device scenario).

> [!CAUTION]
> Never let Firestore cloud data overwrite localStorage data. LocalStorage is always the source of truth. The previous bug was that Firestore returned stale default data and overwrote the user's actual saved data on page refresh.

### Key Files

#### State Management
- **`src/lib/store.ts`** — The single Zustand store containing ALL app state and actions. This is the core of the application (~1600 lines). Key sections:
  - TypeScript interfaces (School, AcademicYear, Semester, Classroom, Subject, Student, etc.)
  - `createDefaultInitialState()` — generates mock/default data
  - `loadAccountData(email)` — loads from localStorage first, then optionally Firestore
  - `saveAccountData()` — saves to localStorage immediately, then cloud in background
  - CRUD actions for: Students, Classrooms, Subjects, Academic Years, Attendance, Scores, Bonus Scores, Grade Rules

#### Firebase
- **`src/lib/firebase/client.ts`** — Firebase client initialization (app, auth, db, storage)
- **`.env.local`** — Firebase credentials (project: `graded-26cb0`)

#### Auth
- **`src/features/auth/context.tsx`** — Auth context provider using Firebase Auth
- **`src/app/(auth)/login/page.tsx`** — Login page (clears old `gms_session` from localStorage on load)
- **`src/app/(auth)/register/page.tsx`** — Registration page

#### Dashboard Layout
- **`src/app/(dashboard)/layout.tsx`** — Main layout with navbar, sidebar, dropdown selectors (Academic Year, Semester, Classroom, Subject), Save button with Ctrl+S shortcut, theme toggle

#### Pages
| Route | File | Description |
|---|---|---|
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | Overview dashboard |
| `/scores` | `src/app/(dashboard)/scores/page.tsx` | Score entry (SGS Excel-Style) |
| `/students` | `src/app/(dashboard)/students/page.tsx` | Student management |
| `/attendance` | `src/app/(dashboard)/attendance/page.tsx` | Attendance tracking |
| `/bonus` | `src/app/(dashboard)/bonus/page.tsx` | Bonus/behavior scores (add/edit/delete) |
| `/reports` | `src/app/(dashboard)/reports/page.tsx` | Grade reports & export |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | Settings (Academic Years, Classrooms, Subjects, Grade Rules, Profile) |

### Save Button Behavior
- Located in the top-right navbar in `layout.tsx`
- Shows status: "บันทึกข้อมูล" → "กำลังบันทึก..." → "บันทึกสำเร็จ" → back to idle
- Keyboard shortcut: `Ctrl+S` (or `Cmd+S` on Mac)
- Saves to localStorage first (instant success), then tries Firestore in background
- Subtitle text shows last save time or error details

## Build & Deploy Commands
```bash
# Development
npm run dev

# Production Build (Static Export)
npm run build

# Deploy to Firebase Hosting
npx firebase-tools deploy --only hosting
```

## Key Constraints & Gotchas

1. **No auto-save**: User explicitly requested manual-only save via button or Ctrl+S
2. **Firestore may be unreachable**: Cloud sync is best-effort. The app must work fully offline with localStorage only.
3. **Login page clears session**: `gms_session` in localStorage is cleared on login page load to prevent stale auth redirects.
4. **Static export**: `next.config.ts` has `output: "export"` — no server-side features, all client-side rendering.
5. **Thai language UI**: All user-facing text is in Thai (ไทย).
6. **PowerShell on Windows**: Use `npm.cmd` and `npx.cmd` instead of `npm`/`npx` when running commands.
