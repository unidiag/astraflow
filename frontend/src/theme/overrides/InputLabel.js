// ==============================|| OVERRIDES - INPUT LABEL ||============================== //

export default function InputLabel(theme) {
  return {
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: theme.palette.grey[600]
        },
        outlined: {
          // обычное состояние (не shrink)
          transform: 'translate(14px, 13px) scale(1)',
          lineHeight: '1rem',

          '&.MuiInputLabel-sizeSmall': {
            // центр для size="small"
            transform: 'translate(14px, 9px) scale(1)',
            fontSize: '0.75rem',
            lineHeight: '1rem',
          },

          '&.MuiInputLabel-shrink': {
            // позиция "сжатого" лейбла над полем
            transform: 'translate(14px, -9px) scale(0.75)',
            background: theme.palette.background.paper,
            padding: '0 8px',
            marginLeft: -6,
            lineHeight: '1rem'
          }
        }
      }
    }
  };
}
