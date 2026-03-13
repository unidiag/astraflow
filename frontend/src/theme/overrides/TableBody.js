// ==============================|| OVERRIDES - TABLE ROW ||============================== //

export default function TableBody(theme) {
  const hoverBg =
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.06)' // мягкий белый оверлей
      : 'rgba(0,0,0,0.04)';      // мягкий чёрный оверлей

  const hoverStyle = {
    transition: 'background-color 120ms ease',
    '&:hover': { backgroundColor: hoverBg }
  };

  return {
    MuiTableBody: {
      styleOverrides: {
        root: {
          // Зебра: в тёмной теме оставим фон как есть, в светлой дадим лёгкий серый
          '&.striped .MuiTableRow-root': {
            '&:nth-of-type(even)': {
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? theme.palette.background.paper
                  : theme.palette.grey[50]
            },
            ...hoverStyle
          },

          // Обычные строки
          '& .MuiTableRow-root': {
            ...hoverStyle
          },

          // Hover для выделенных строк, чтобы не «выстреливало» ярче обычного
          '& .MuiTableRow-root.Mui-selected:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(0,0,0,0.08)'
          }
        }
      }
    }
  };
}
