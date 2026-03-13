import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';   // sun
import DarkModeIcon from '@mui/icons-material/DarkMode';     // moon
import { ThemeModeContext } from '../ThemeProvider';
import { ThemeMode } from '../config';
import { useTranslation } from 'react-i18next';


export default function ThemeToggleButton({ size = 'medium', edge, color = 'inherit' }) {
  const { mode, toggleMode } = React.useContext(ThemeModeContext);
  const isDark = mode === ThemeMode.DARK;
  const {t} = useTranslation()

  return (
    <Tooltip title={!isDark ? t("theme.dark") : t("theme.light")}>
      <IconButton onClick={toggleMode} size={size} edge={edge} color={color} aria-label="toggle theme">
        {!isDark ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
