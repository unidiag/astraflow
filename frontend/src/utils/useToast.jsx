import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

const ToastContext = createContext(null);

/**
 * ToastProvider
 * Props:
 *  - autoHideDuration?: number (default 2500 ms)
 *  - anchorOrigin?: { vertical: 'top'|'bottom', horizontal: 'left'|'center'|'right' }
 */
export function ToastProvider({ children, autoHideDuration = 2500, anchorOrigin }) {
  const [state, setState] = useState({ open: false, message: "", severity: "info", key: 0 });

  const show = useCallback((message, severity = "info") => {
    setState({ open: true, message, severity, key: Date.now() });
  }, []);

  const api = useMemo(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      warning: (m) => show(m, "warning"),
      info: (m) => show(m, "info"),
    }),
    [show]
  );

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Snackbar
        key={state.key}
        open={state.open}
        autoHideDuration={autoHideDuration}
        onClose={handleClose}
        anchorOrigin={anchorOrigin || { vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleClose} severity={state.severity} variant="filled" sx={{ width: "100%" }}>
          {state.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // no-op fallback if provider is missing
  return (
    ctx || {
      show: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    }
  );
}
