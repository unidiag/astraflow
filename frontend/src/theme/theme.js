// Builds Mantis-like color objects (lighter/light/main/dark/contrastText)
// from @ant-design/colors preset palettes + presetColor key.

import { presetPalettes, presetDarkPalettes } from '@ant-design/colors';
import { ThemeMode } from 'config';

// pick helper
const pick = (arr, idx, fallback) => (arr && arr[idx] != null ? arr[idx] : fallback);

const buildColor = (paletteArr, mainIdx = 5, darkIdx = 6, lightIdx = 4, lighterIdx = 1) => {
  const main = pick(paletteArr, mainIdx, '#1890ff');
  const dark = pick(paletteArr, darkIdx, main);
  const light = pick(paletteArr, lightIdx, main);
  const lighter = pick(paletteArr, lighterIdx, light);
  return { lighter, light, main, dark, contrastText: '#fff' };
};

// turn colors.grey (array) into object with 0..900 and Axx aliases (as Mantis expects)
const buildGrey = (greyArr = []) => {
  // Source array order in Mantis: primary(11) + ascent(4) + constant(2) = 17 items
  // Map the first 10 to 0..900, and define A50 from the neutral slot.
  const g = (i, fb) => pick(greyArr, i, fb);

  const grey = {
    0:   g(0,  '#ffffff'),
    100: g(1,  '#fafafa'),
    200: g(2,  '#f5f5f5'),
    300: g(3,  '#f0f0f0'),
    400: g(4,  '#d9d9d9'),
    500: g(5,  '#bfbfbf'),
    600: g(6,  '#8c8c8c'),
    700: g(7,  '#595959'),
    800: g(8,  '#262626'),
    900: g(9,  '#141414'),

    // aliases used by Mantis for backgrounds
    // берем мягкий нейтральный (из "constant"): это самый «бумажный» фон
    A50:  g(15, '#fafafb'),
    A100: g(12, '#bfbfbf'),
    A200: g(13, '#434343'),
    A400: g(14, '#1f1f1f'),
    A700: g(16, '#e6ebf1')
  };

  return grey;
};

export default function ThemeOption(colorsIn, presetColor = 'default', mode = ThemeMode.DARK) {
  const colors = mode === ThemeMode.DARK ? presetDarkPalettes : presetPalettes;

  // merge provided colors (from palette.js) to ensure .grey is present for buildGrey
  const merged = { ...colors, ...colorsIn };

  const base = presetColor && merged[presetColor] ? presetColor : 'blue';
  const primary   = buildColor(merged[base]);
  const g = buildGrey(merged.grey);
  const secondary = {
    lighter: g[300],
    light:   g[400],
    main:    g[600],
    dark:    g[800],
    // readable on both modes; tweak if нужно контрастнее
    contrastText: '#666'
  };
  const error     = buildColor(merged.red);
  const warning   = buildColor(merged.orange);
  const info      = buildColor(merged.cyan);
  const success   = buildColor(merged.green);

  // 👇 ключ: добавляем grey в ту же структуру, что ждёт palette.js
  const grey = buildGrey(merged.grey);

  return {
    primary,
    secondary,
    error,
    warning,
    info,
    success,
    orange: buildColor(merged.orange),
    cyan: buildColor(merged.cyan),
    grey
  };
}
