import * as React from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';


import AuthBox from './Auth/AuthBox';
import { useAuth } from 'utils/useAuth';
import { t } from 'i18next';
import { Divider } from '@mui/material';

export default function AccountMenu({
  settings,
  avatarAlt = 'User',
  tooltipTitle = 'Аккаунт',
  getPath = (key) => key.toLowerCase(),
}) {
  const { user, ready, setUser } = useAuth();

  const [anchorElUser, setAnchorElUser] = React.useState(null);
  const [openAuth, setOpenAuth] = React.useState(false);

  // local latch for quick UI reaction
  const [authed, setAuthed] = React.useState(!!user);
  React.useEffect(() => {
    setAuthed(!!user);
    if (user && openAuth) setOpenAuth(false);
  }, [user, openAuth]);

  const avatarBtnRef = React.useRef(null);

  const handleAvatarClick = (e) => {
    if (!ready) return;
    if (authed) setAnchorElUser(e.currentTarget);
    else setOpenAuth(true);
  };

  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleCloseAuth = () => setOpenAuth(false);

  const handleAuthSuccess = (nextUser) => {
    // 1) Update local state immediately
    setAuthed(true);
    setOpenAuth(false);

    // 2) Persist into auth store
    setUser(nextUser);

    // 3) Open menu right away
    if (avatarBtnRef.current) {
      setAnchorElUser(avatarBtnRef.current);
    }
  };

  if (!ready) return null;


  return (
    <Box sx={{ flexGrow: 0 }}>
      <Tooltip title={tooltipTitle}>
        <IconButton ref={avatarBtnRef} onClick={handleAvatarClick} sx={{ p: 0 }}>
          <Avatar
            alt={avatarAlt}
            src={user?.avatar ? process.env.REACT_APP_URL + "/src/avatars/" + user.avatar + "?t=" + Math.random() : undefined}
            sx={{
              opacity: authed ? 1 : 0.75,
              transition: 'opacity 0.2s ease-in-out',
              '&:hover': { opacity: 1 },
            }}
          />
        </IconButton>
      </Tooltip>

      {/* Menu for authenticated users */}
      <Menu
        sx={{ mt: '45px' }}
        id="account-menu"
        anchorEl={anchorElUser}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
        open={Boolean(anchorElUser)}
        onClose={handleCloseUserMenu}
        slotProps={{
          paper: {
            sx: (t) => ({
              borderRadius: 2,
              border: `1px solid ${t.palette.divider}`,
              boxShadow: t.customShadows?.z8 || '0 8px 24px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(6px)',
              backgroundColor:
                t.palette.mode === 'light'
                  ? t.palette.background.paper
                  : t.palette.background.default,
            }),
          },
        }}

      >


        {settings.map((v, idx) => {
          const isLast = idx === settings.length - 1;

          return [
            // разделитель перед последним пунктом
            isLast ? (
              <Divider
                key={`${v}-divider`}
                sx={{ my: 0.5, mx: 1 }}
              />
            ) : null,

            <MenuItem
              key={v}
              component={NavLink}
              to={getPath(v)}
              onClick={handleCloseUserMenu}
              dense
              sx={(theme) => ({
                minWidth: 200,
                borderRadius: 1.25,
                mx: 1,
                my: 0.5,
                fontWeight: 600,
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  color: theme.palette.text.primary,
                },
                '&.active': {
                  fontWeight: 800,
                  color: theme.palette.primary.main,
                  backgroundColor: theme.palette.action.selected,
                },
                ...(theme.palette.mode === 'dark'
                  ? { color: theme.palette.grey[400] }
                  : {}),
              })}
            >
              {t(v)}
            </MenuItem>,
          ];
        })}


      </Menu>

      {/* Auth flow for unauthenticated users */}
      <Dialog
        open={openAuth}
        onClose={handleCloseAuth}
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, backgroundColor: 'transparent', boxShadow: 'none' } }}
      >
        <AuthBox onSuccess={handleAuthSuccess} />
      </Dialog>
    </Box>
  );
}

AccountMenu.propTypes = {
  settings: PropTypes.object.isRequired,
  avatarSrc: PropTypes.string,
  avatarAlt: PropTypes.string,
  tooltipTitle: PropTypes.string,
  getPath: PropTypes.func,
};
