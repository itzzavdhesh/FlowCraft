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
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const stored = localStorage.getItem('flowforge_theme');
        if (!stored) {
          setIsDarkMode(e.matches);
        }
      } catch {
        // ignore
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const [hasToggled, setHasToggled] = useState(false);

  useEffect(() => {
    if (hasToggled) {
      try {
        localStorage.setItem('flowforge_theme', isDarkMode ? 'dark' : 'light');
      } catch {
        // ignore
      }
    }
  }, [isDarkMode, hasToggled]);

  const toggleDarkMode = () => {
    setHasToggled(true);
    setIsDarkMode((prev) => !prev);
  };

  return { isDarkMode, toggleDarkMode };
}
