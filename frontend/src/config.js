// Minimal config compatible with your Mantis theme code

export const ThemeMode = {
  LIGHT: 'light',
  DARK: 'dark'
};

export const defaultConfig = {
  themeDirection: 'ltr',
  mode: ThemeMode.DARK,       // 'light' | 'dark'
  presetColor: 'default',      // can be 'default' or any from @ant-design/colors
  fontFamily: `'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`
};


export const urlsMenu = [/*"servers", "satellites"*/];
export const urlsUser = ["profile", "exit"]
