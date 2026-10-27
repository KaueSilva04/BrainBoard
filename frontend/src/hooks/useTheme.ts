import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'brainboard-theme';

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    storedTheme() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      if (!storedTheme()) setTheme(media.matches ? 'dark' : 'light');
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setTheme(storedTheme() ?? (media.matches ? 'dark' : 'light'));
      }
    };
    media.addEventListener('change', followSystem);
    window.addEventListener('storage', syncStorage);
    return () => {
      media.removeEventListener('change', followSystem);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
    setTheme(nextTheme);
  };

  return { theme, toggleTheme };
}
