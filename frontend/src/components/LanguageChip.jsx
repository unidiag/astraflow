// src/components/LanguageChip.jsx
import React from 'react';
import { Chip, Avatar, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LANGS, STORAGE_KEY } from 'i18n';


const flagOf = (code) => (LANGS.find((l) => l.code === code)?.flag) || '🏳️';

export default function LanguageChip({ langs = LANGS, size = 'small', variant = 'outlined' }) {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const currentCode = i18n.resolvedLanguage || i18n.language || langs[0]?.code || 'en';
  const current = React.useMemo(
    () => langs.find((l) => l.code === currentCode) || langs[0],
    [langs, currentCode]
  );

  const setLang = (code) => {
    if (!code || code === currentCode) return;
    i18n.changeLanguage(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  };

  // two-language fast toggle
  const handleChipClick = (e) => {
    if (langs.length === 2) {
      const next = langs[0].code === currentCode ? langs[1].code : langs[0].code;
      setLang(next);
      return;
    }
    setAnchorEl(e.currentTarget);
  };

  const closeMenu = () => setAnchorEl(null);

  return (
    <>
      <Chip
        size={size}
        variant={variant}
        onClick={handleChipClick}
        avatar={<Avatar sx={{ width: 20, height: 20, fontSize: 14 }}>{flagOf(current.code)}</Avatar>}
        label={current.label}
        sx={(theme) => ({
          fontWeight: 700,
          textTransform: 'none',
          '& .MuiChip-avatar': { ml: 0.25 },
          '&:hover': { bgcolor: theme.palette.action.hover }
        })}
      />

      <Menu
        open={Boolean(anchorEl) && langs.length > 2}
        anchorEl={anchorEl}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {langs.map((l) => (
          <MenuItem
            key={l.code}
            onClick={() => { setLang(l.code); closeMenu(); }}
            selected={l.code === currentCode}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{flagOf(l.code)}</span>
            </ListItemIcon>
            <ListItemText>{l.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
