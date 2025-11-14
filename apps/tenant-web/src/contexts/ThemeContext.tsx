'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  darkMode: boolean;
  theme: Theme;
  setDarkMode: (dark: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false); // Default to light mode
  const [mounted, setMounted] = useState(false);
  const theme: Theme = darkMode ? 'dark' : 'light';

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkModeState(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkModeState(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    // Apply theme changes to document
    if (!mounted) return;
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, mounted]);

  const setDarkMode = (dark: boolean) => {
    setDarkModeState(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setDarkMode(newTheme === 'dark');
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, theme, setDarkMode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

