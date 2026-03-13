export default function Paper(theme) {
  const paperShadow = theme.customShadows?.paper || theme.shadows[3];

  // Переопределяем тень для всех elevation > 0
  const elevationOverrides = {};
  for (let i = 1; i <= 24; i += 1) {
    elevationOverrides[`elevation${i}`] = {
      boxShadow: paperShadow
    };
  }

  return {
    MuiPaper: {
      styleOverrides: {
        // elevation0 оставляем как есть (плоский)
        ...elevationOverrides
      }
    }
  };
}