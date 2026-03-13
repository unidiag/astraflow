import * as React from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Menu,
  Container,
  Button,
  MenuItem,
  alpha
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink } from 'react-router-dom';
import AccountMenu from './AccountMenu';
import ThemeToggleButton from './ThemeToggleButton';
import { t } from 'i18next';
import LanguageChip from './LanguageChip';

export default function MenuAppBar({ pages, settings }) {
  const [anchorElNav, setAnchorElNav] = React.useState(null);

  const handleOpenNavMenu = (event) => setAnchorElNav(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={(theme) => ({
        backdropFilter: 'blur(6px)',
        backgroundColor:
          theme.palette.mode === 'light'
            ? alpha(theme.palette.background.paper, 0.8)
            : alpha(theme.palette.background.default, 0.6),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`
      })}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: 64, px: { xs: 1, md: 2 } }}>
          {/* Left logo / brand */}
          <Box
            component={NavLink}
            to="/"
            aria-label="Home"
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              mr: 3,
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              textDecoration: 'none',
              '&:hover': (t) => ({
                backgroundColor: t.palette.action.hover
              })
            }}
          >
            <Box
              component="img"
              src="/logo.svg"
              alt="logo"
              sx={{ height: 26, width: 26 }}
            />

            <Box
              component="span"
              sx={{
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: 0.3,
                color: 'text.primary'
              }}
            >
              {process.env.REACT_APP_NAME}
            </Box>
          </Box>

          {/* Mobile hamburger */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="open navigation"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              keepMounted
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              sx={{ display: { xs: 'block', md: 'none' } }}
              PaperProps={(theme) => ({
                sx: (t) => ({
                  mt: 1,
                  borderRadius: 2,
                  border: `1px solid ${alpha(t.palette.divider, 0.8)}`,
                  boxShadow: t.customShadows?.z8 || '0 8px 24px rgba(0,0,0,0.12)'
                })
              })}
            >
              {pages.map(page => (
                <MenuItem key={page} onClick={handleCloseNavMenu}>
                  <Button
                    component={NavLink}
                    to={`/${page}`}
                    onClick={handleCloseNavMenu}
                    color="inherit"
                    fullWidth
                    sx={(theme) => ({
                      justifyContent: 'flex-start',
                      color: 'text.secondary',
                      fontWeight: 700,
                      textTransform: 'none',
                      '&.active': {
                        color: theme.palette.primary.main,
                        backgroundColor: theme.palette.action.selected
                      }
                    })}
                  >
                    {t("menu."+page)}
                  </Button>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Mobile brand */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: 12 // подстрой при необходимости (вертикальный центр)
            }}
          >
            <Box
              component={NavLink}
              to="/"
              aria-label="Home"
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                alignSelf: 'center',
                mr: 2,
                lineHeight: 0,
                borderRadius: 2,
                textDecoration: 'none',   // убрать underline
                color: 'text.primary',    // нормальный цвет текста
                py: 0.6,
                px: 1.2,
                '&:hover': (t) => ({
                  opacity: 0.95,
                  backgroundColor: t.palette.action.hover
                })
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component="img"
                  src="/logo.svg"
                  alt="logo"
                  sx={{ height: 24, width: 24 }}
                />
                <Box sx={{ fontWeight: 700, fontSize: 16 }}>
                  {process.env.REACT_APP_NAME}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Desktop nav */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
            {pages.map(page => (
              <Button
                key={page}
                component={NavLink}
                to={`/${page}`}
                color="inherit"
                sx={(theme) => ({
                  my: 1.25,
                  px: 1.5,
                  borderRadius: 1.25,
                  fontWeight: 700,
                  textTransform: 'none',
                  color: 'text.secondary', 
                  '&:hover': { backgroundColor: theme.palette.action.hover },
                  '&.active': {
                    color: theme.palette.primary.main,
                    backgroundColor: theme.palette.action.selected
                  }
                })}
              >
                {t("menu."+page)}
              </Button>
            ))}
          </Box>

          {/* Right tools: theme switch + account */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LanguageChip />
            <ThemeToggleButton />
            <AccountMenu
              settings={settings}
              avatarSrc="/avatar.jpg"
              avatarAlt="Remy Sharp"
              tooltipTitle={t("account")}
            />
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
