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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

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
        const appUser: AppUser = {
          id: sbUser.id,
          email: sbUser.email || "",
          role: "teacher",
          schoolId: "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
          firstName: sbUser.user_metadata?.first_name || "ครู",
          lastName: sbUser.user_metadata?.last_name || "ผู้สอน"
        };
        setUser(appUser);
        if (typeof window !== "undefined") {
          localStorage.setItem("gms_session", JSON.stringify(appUser));
        }
      }
    } catch (err) {
      console.error("Error fetching user profile from Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check cached session from localStorage
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

    // 2. Supabase Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          // If no active supabase auth session, retain cached session if valid
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
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // 1. Dedicated System Admin Check
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

      // 2. Query Supabase profiles table directly to verify credentials
      let profileMatched = false;
      try {
        const { data: profiles } = await supabase
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
          profileMatched = true;
          return;
        }
      } catch (err: any) {
        if (err.message && err.message.includes("รหัสผ่านไม่ถูกต้อง")) {
          throw err;
        }
        console.warn("Supabase profiles query error:", err);
      }

      // 3. Try Supabase Auth signInWithPassword
      if (!profileMatched) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (authError) {
          throw new Error(authError.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบหรือลงทะเบียนใหม่" : authError.message);
        }

        if (authData?.user) {
          await fetchUserProfile(authData.user);
          return;
        }
      }

      throw new Error("ไม่พบบัญชีผู้ใช้นี้ในระบบ Supabase กรุณาตรวจสอบอีเมลหรือลงทะเบียนใหม่");
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

      // 2. Register via Supabase Auth
      let userId = `usr-${Date.now()}`;
      try {
        const { data: sbData, error: signUpErr } = await supabase.auth.signUp({
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
        if (signUpErr) {
          console.warn("Supabase auth signUp error:", signUpErr.message);
        }
        if (sbData?.user?.id) {
          userId = sbData.user.id;
        }
      } catch (e) {
        console.warn("Supabase auth signUp:", e);
      }

      // 3. Save directly to Supabase profiles table
      const userProfileRow = {
        id: userId,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        role,
        school_id: "f35acdc8-233d-b572-eedf-8f6d7da0ef49",
        avatar_url: password // Store password in Supabase profiles
      };

      const { error: profileUpsertErr } = await supabase
        .from("profiles")
        .upsert([userProfileRow]);

      if (profileUpsertErr) {
        console.warn("Profile save to Supabase error:", profileUpsertErr.message);
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
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard"
        }
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("gms_session");
      }
      setUser(null);
      await supabase.auth.signOut();
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

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName
      })
      .eq("id", user.id);

    if (error) throw error;

    setUser(updatedUser);
    if (typeof window !== "undefined") {
      localStorage.setItem("gms_session", JSON.stringify(updatedUser));
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
