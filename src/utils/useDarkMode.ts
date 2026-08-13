import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const stored = localStorage.getItem('flowforge_theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      
      // Fallback to system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('flowforge_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('flowforge_theme', 'light');
    }
  }, [isDarkMode]);

  return { isDarkMode, toggleDarkMode: () => setIsDarkMode(prev => !prev) };
}
