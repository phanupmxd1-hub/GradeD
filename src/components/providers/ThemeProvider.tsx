"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  font: string;
  toggleTheme: () => void;
  setFont: (newFont: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [font, setFontState] = useState<string>("Prompt");
  const [mounted, setMounted] = useState(false);

  const applyFont = (fontName: string) => {
    if (typeof window === "undefined") return;
    
    // Set custom CSS variable
    document.documentElement.style.setProperty(
      "--font-app",
      `'${fontName}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
    );

    // If dynamic custom Google Font is needed
    const fontId = `google-font-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
  };

  useEffect(() => {
    // 1. Theme
    const savedTheme = localStorage.getItem("gms_theme") as Theme | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const activeTheme = savedTheme || systemTheme;
    setTheme(activeTheme);
    document.documentElement.classList.toggle("dark", activeTheme === "dark");

    // 2. Font
    const savedFont = localStorage.getItem("gms_font") || "Prompt";
    setFontState(savedFont);
    applyFont(savedFont);

    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("gms_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const setFont = (newFont: string) => {
    if (!newFont) return;
    setFontState(newFont);
    localStorage.setItem("gms_font", newFont);
    applyFont(newFont);
  };

  if (!mounted) {
    return <div className="invisible">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, font, toggleTheme, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
