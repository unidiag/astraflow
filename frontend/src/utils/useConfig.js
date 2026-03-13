import { useContext, useMemo } from 'react';
import { defaultConfig } from 'config';
import { ThemeModeContext } from 'ThemeProvider';

// Reactive useConfig(): reads mode from ThemeModeContext (not just localStorage)
// so palette/shadows/overrides re-render immediately on toggle.
export default function useConfig() {
  const ctx = useContext(ThemeModeContext); // { mode, toggleMode }
  const mode = ctx?.mode ?? defaultConfig.mode;

  return useMemo(
    () => ({
      themeDirection: defaultConfig.themeDirection,
      presetColor: defaultConfig.presetColor,
      fontFamily: defaultConfig.fontFamily,
      mode
    }),
    [mode]
  );
}
