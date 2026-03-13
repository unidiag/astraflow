import React, { useState } from "react";
import { Paper, Typography, TextField, Button, Alert, Stack, Link } from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import { sendDataToServer } from "utils/functions";
import { useTranslation } from "react-i18next";

/**
 * Password recovery form (request step).
 * Props:
 *  - onSwitch(mode)
 */
export default function RecoveryForm({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const {t} = useTranslation()

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    if (!email) return setErr(t("recovery.indicate_email"));

    setLoading(true);
    sendDataToServer({ op: "authRecovery", email })
      .then((r) => {
        if (r?.status === "OK") {
          setOk(t("recovery.read_mail"));
        } else {
          setErr(r?.status || t("recovery.cancel"));
        }
      })
      .catch((e) => setErr(e?.message || t("network.error")))
      .finally(() => setLoading(false));
  };

  return (
    <Paper elevation={3} sx={{ p: 3, width: 420, maxWidth: "100%", borderRadius: 3 }}>
      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        <Typography variant="h6" align="center"
          sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <LockResetIcon /> {t("recovery.recover")}
        </Typography>

        {err ? <Alert severity="error">{err}</Alert> : null}
        {ok ? <Alert severity="success">{ok}</Alert> : null}

        <TextField label="Email" type="email" size="small" value={email} onChange={e=>setEmail(e.target.value)} fullWidth />

        <Button type="submit" variant="contained" disabled={loading} fullWidth>
          {loading ? t("recovery.sending") : t("recovery.send")}
        </Button>

        {/* cross-links */}
        <Stack direction="row" justifyContent="space-between" sx={{ pt: 1 }}>
          <Link component="button" type="button" onClick={() => onSwitch?.("login")}>
            {t("recovery.return_login")}
          </Link>
          <Link component="button" type="button" onClick={() => onSwitch?.("register")}>
            {t("login.login")}
          </Link>
        </Stack>
      </Stack>
    </Paper>
  );
}
