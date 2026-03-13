// src/themes/overrides/Divider.js
import { alpha } from "@mui/material/styles";

export default function Divider(theme) {
  const color = alpha(
    theme.palette.divider, 0.3
  );

  return {
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: color,
          "&::before, &::after": {
            borderColor: color,
          },
        },
      },
    },
  };
}
