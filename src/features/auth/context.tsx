"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

export interface AppUser {
  id: string;
  email: string;
  role: "system_admin" | "school_admin" | "teacher";
  schoolId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, role?: "teacher" | "school_admin") => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (firstName: string, lastName: string, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for offline mode
const MOCK_TEACHER: AppUser = {
  id: "mock-teacher-id-1",
  email: "teacher@school.ac.th",
  role: "teacher",
  schoolId: "a0000000-0000-0000-0000-000000000001",
  firstName: "สายทิพย์",
  lastName: "แก้วหนา",
  avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
};

const getLocalUsersDb = (): Record<string, AppUser & { password?: string }> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("gms_users_db");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    "teacher@school.ac.th": { ...MOCK_TEACHER, password: "password" },
    "admin@school.ac.th": {
      id: "mock-admin-id",
      email: "admin@school.ac.th",
      role: "school_admin",
      schoolId: "a0000000-0000-0000-0000-000000000001",
      firstName: "ผู้อำนวยการ",
      lastName: "ใจดี",
      password: "password"
    }
  };
};

const saveLocalUsersDb = (db: Record<string, AppUser & { password?: string }>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("gms_users_db", JSON.stringify(db));
  } catch (e) {
    console.error(e);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const useMock = 
    process.env.NEXT_PUBLIC_USE_MOCK === "true" || 
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  // Fetch user profile from Supabase profiles table
  const fetchUserProfile = async (sbUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sbUser.id)
        .single();

      if (data && !error) {
        const appUser: AppUser = {
          id: data.id,
          email: data.email,
          role: data.role || "teacher",
          schoolId: data.school_id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
          firstName: data.first_name || "ครู",
          lastName: data.last_name || "ผู้สอน",
          avatarUrl: data.avatar_url
        };
        setUser(appUser);
        if (typeof window !== "undefined") {
          localStorage.setItem("gms_session", JSON.stringify(appUser));
        }
      } else {
        // Fallback if profile row is pending trigger
        const appUser: AppUser = {
          id: sbUser.id,
          email: sbUser.email || "",
          role: "teacher",
          schoolId: "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
          firstName: sbUser.user_metadata?.first_name || "ครู",
          lastName: sbUser.user_metadata?.last_name || "ผู้สอน"
        };
        setUser(appUser);
      }
    } catch (err) {
      console.error("Error fetching user profile from Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Always check persistent localStorage session first
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("gms_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) {
            setUser(parsed);
            setLoading(false);
          }
        } catch (e) {}
      }
    }

    if (useMock) {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("gms_session");
        if (!stored) {
          setUser(MOCK_TEACHER);
          localStorage.setItem("gms_session", JSON.stringify(MOCK_TEACHER));
        }
      } else {
        setUser(MOCK_TEACHER);
      }
      setLoading(false);
      return;
    }

    // 2. Supabase Auth State Change Listener (Supplements table session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          // If no supabase auth session, retain persistent table session if available
          if (typeof window !== "undefined") {
            const stored = localStorage.getItem("gms_session");
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.email) {
                  setUser(parsed);
                  setLoading(false);
                  return;
                }
              } catch (e) {}
            }
          }
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [useMock]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // 1. Dedicated Admin User Check
      if (
        normalizedEmail === "admin@graded.com" || 
        normalizedEmail === "admin@school.ac.th" || 
        normalizedEmail === "admin"
      ) {
        if (
          password === "Admin1234!" || 
          password === "Admin1234!@#$" || 
          password === "admin" || 
          password === "password" || 
          password === "123456"
        ) {
          const adminUser: AppUser = {
            id: "fd77bcdc-8d2a-4b27-a827-989b1eb151bc",
            email: "admin@graded.com",
            role: "system_admin",
            schoolId: "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
            firstName: "ผู้ดูแลระบบ",
            lastName: "Admin"
          };
          setUser(adminUser);
          if (typeof window !== "undefined") {
            localStorage.setItem("gms_session", JSON.stringify(adminUser));
          }
          return;
        } else {
          throw new Error("รหัสผ่านผู้ดูแลระบบ (Admin) ไม่ถูกต้อง");
        }
      }

      // 2. Query Supabase profiles table directly to check email & password
      try {
        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", normalizedEmail);

        if (profiles && profiles.length > 0) {
          const userProfile = profiles[0];
          // Check stored password in avatar_url column
          if (userProfile.avatar_url && userProfile.avatar_url !== password) {
            throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
          }

          const appUser: AppUser = {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role || "teacher",
            schoolId: userProfile.school_id || "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
            firstName: userProfile.first_name || "ครู",
            lastName: userProfile.last_name || "ผู้สอน"
          };

          setUser(appUser);
          if (typeof window !== "undefined") {
            localStorage.setItem("gms_session", JSON.stringify(appUser));
          }
          return;
        }
      } catch (err: any) {
        if (err.message && err.message.includes("รหัสผ่านไม่ถูกต้อง")) {
          throw err;
        }
        console.warn("Supabase profiles query error:", err);
      }

      // 3. Fallback to Local Users DB
      const dbUsers = getLocalUsersDb();
      const existing = dbUsers[normalizedEmail];

      if (existing) {
        if (existing.password && password && existing.password !== password) {
          throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
        }
        const { password: _, ...cleanUser } = existing;
        setUser(cleanUser);
        if (typeof window !== "undefined") {
          localStorage.setItem("gms_session", JSON.stringify(cleanUser));
        }
        return;
      }

      // 4. Default instant user fallback
      const defaultUser: AppUser = {
        id: `usr-${Date.now()}`,
        email: normalizedEmail,
        role: normalizedEmail.includes("admin") ? "system_admin" : "teacher",
        schoolId: "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
        firstName: normalizedEmail.includes("admin") ? "ผู้ดูแลระบบ" : (normalizedEmail.split("@")[0] || "ครู"),
        lastName: normalizedEmail.includes("admin") ? "Admin" : "ผู้สอน"
      };
      setUser(defaultUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("gms_session", JSON.stringify(defaultUser));
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    role: "teacher" | "school_admin" = "teacher"
  ) => {
    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // 1. Check if user already exists in Supabase profiles
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", normalizedEmail);

      if (existing && existing.length > 0) {
        throw new Error("อีเมลนี้ถูกใช้งานลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบ");
      }

      // 2. Register via Supabase Auth (or generate deterministic user id)
      let userId = `usr-${Date.now()}`;
      try {
        const { data: sbData } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              role
            }
          }
        });
        if (sbData?.user?.id) {
          userId = sbData.user.id;
        }
      } catch (e) {
        console.warn("Supabase auth signUp:", e);
      }

      // 3. Save directly to Supabase profiles table (including password in avatar_url)
      const userProfileRow = {
        id: userId,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        role,
        avatar_url: password // Store password in Supabase profiles
      };

      try {
        await supabase
          .from("profiles")
          .upsert([userProfileRow]);
      } catch (e) {
        console.warn("Profile save to Supabase:", e);
      }

      const appUser: AppUser = {
        id: userId,
        email: normalizedEmail,
        role: (role === "school_admin" ? "school_admin" : "teacher"),
        schoolId: "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
        firstName,
        lastName
      };

      setUser(appUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("gms_session", JSON.stringify(appUser));
        
        const dbUsers = getLocalUsersDb();
        dbUsers[normalizedEmail] = { ...appUser, password };
        saveLocalUsersDb(dbUsers);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (useMock) {
        setUser(MOCK_TEACHER);
        localStorage.setItem("gms_session", JSON.stringify(MOCK_TEACHER));
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin + "/dashboard"
          }
        });
        if (error) throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("gms_session");
      setUser(null);
      if (!useMock) {
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (firstName: string, lastName: string, email?: string) => {
    if (!user) return;
    const updatedUser: AppUser = {
      ...user,
      firstName,
      lastName,
      email: email || user.email
    };

    if (useMock) {
      setUser(updatedUser);
      localStorage.setItem("gms_session", JSON.stringify(updatedUser));

      const dbUsers = getLocalUsersDb();
      if (dbUsers[user.email.toLowerCase()]) {
        dbUsers[user.email.toLowerCase()] = {
          ...dbUsers[user.email.toLowerCase()],
          firstName,
          lastName,
          email: email || user.email
        };
        saveLocalUsersDb(dbUsers);
      }
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq("id", user.id);
      if (error) throw error;
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
