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

  useEffect(() => {
    if (useMock) {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("gms_session");
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch (e) {
            setUser(MOCK_TEACHER);
            localStorage.setItem("gms_session", JSON.stringify(MOCK_TEACHER));
          }
        } else {
          // Standalone auto-login: Anyone with the link gets instant access
          setUser(MOCK_TEACHER);
          localStorage.setItem("gms_session", JSON.stringify(MOCK_TEACHER));
        }
      } else {
        setUser(MOCK_TEACHER);
      }
      setLoading(false);
      return;
    }

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
            schoolId: data.school_id || "a0000000-0000-0000-0000-000000000001",
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
            schoolId: "a0000000-0000-0000-0000-000000000001",
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

    // Supabase Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("gms_session");
          }
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
      if (useMock) {
        const normalizedEmail = email.toLowerCase().trim();
        const dbUsers = getLocalUsersDb();
        const existing = dbUsers[normalizedEmail];

        if (existing) {
          if (existing.password && password && existing.password !== password) {
            throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
          }
          const { password: _, ...cleanUser } = existing;
          setUser(cleanUser);
          localStorage.setItem("gms_session", JSON.stringify(cleanUser));
        } else {
          const defaultUser: AppUser = {
            id: `usr-${Date.now()}`,
            email: normalizedEmail,
            role: normalizedEmail.includes("admin") ? "school_admin" : "teacher",
            schoolId: "a0000000-0000-0000-0000-000000000001",
            firstName: normalizedEmail.split("@")[0] || "ครู",
            lastName: "ผู้สอน"
          };
          setUser(defaultUser);
          localStorage.setItem("gms_session", JSON.stringify(defaultUser));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
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
      if (useMock) {
        const dbUsers = getLocalUsersDb();
        const normalizedEmail = email.toLowerCase().trim();
        if (dbUsers[normalizedEmail]) {
          throw new Error("อีเมลนี้ถูกใช้งานลงทะเบียนในระบบแล้ว");
        }
        const newUser: AppUser & { password?: string } = {
          id: `usr-${Date.now()}`,
          email: normalizedEmail,
          role,
          schoolId: "a0000000-0000-0000-0000-000000000001",
          firstName,
          lastName,
          password
        };
        dbUsers[normalizedEmail] = newUser;
        saveLocalUsersDb(dbUsers);

        const { password: _, ...cleanUser } = newUser;
        setUser(cleanUser);
        localStorage.setItem("gms_session", JSON.stringify(cleanUser));
      } else {
        // Secure SignUp: Send metadata, role is forced to teacher by Postgres Trigger
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              school_id: "a0000000-0000-0000-0000-000000000001"
            }
          }
        });
        if (error) throw error;
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
