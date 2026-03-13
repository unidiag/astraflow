import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import ThemeCustomization from 'theme';
import { ThemeMode } from 'config';

export const ThemeModeContext = createContext({
  mode: ThemeMode.LIGHT,
  toggleMode: () => {}
});

const STORAGE_KEY = 'ui:mode';

export default function ThemeModeProvider({ children, defaultMode = ThemeMode.LIGHT }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === ThemeMode.DARK || saved === ThemeMode.LIGHT) return saved;
    } catch {}
    return defaultMode;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  const toggleMode = useCallback(
    () => setMode((m) => (m === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK)),
    []
  );

  const ctx = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ThemeCustomization mode={mode}>{children}</ThemeCustomization>
    </ThemeModeContext.Provider>
  );
}
