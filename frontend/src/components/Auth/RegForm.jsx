import React, { useState } from "react";
import { Paper, Typography, TextField, Button, Alert, Stack, Link } from "@mui/material";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import { sendDataToServer } from "utils/functions";
import { useTranslation } from "react-i18next";

/**
 * Registration form.
 * Props:
 *  - onSwitch(mode)
 *  - onSuccess(user?) optional: you can choose to auto-login after register on backend
 */
export default function RegForm({ onSwitch, onSuccess }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const {t} = useTranslation()

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    if (!email || !pw) return setErr(t("login.req_email_pass"));
    if (pw !== pw2) return setErr(t("newacc.passreq")); 

    setLoading(true);
    sendDataToServer({ op: "authRegister", email, password: pw })
      .then((r) => {
        if (r?.status === "OK") {
          setOk(t("newacc.ok"));
          // optionally: if backend returns tokens, call onSuccess(...)
        } else {
          setErr(r?.status || t("newacc.err"));
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
          <PersonAddAltIcon /> {t("login.create")}
        </Typography>

        {err ? <Alert severity="error">{err}</Alert> : null}
        {ok ? <Alert severity="success">{ok}</Alert> : null}

        <TextField label="Email" type="email" size="small" value={email} onChange={e=>setEmail(e.target.value)} fullWidth />
        <TextField label={t("login.password")} type="password" size="small" value={pw} onChange={e=>setPw(e.target.value)} fullWidth />
        <TextField label={t("newacc.repeatpass")} type="password" size="small" value={pw2} onChange={e=>setPw2(e.target.value)} fullWidth />

        <Button type="submit" variant="contained" disabled={loading} fullWidth>
          {loading ? t("newacc.making") : t("newacc.make")}
        </Button>

        {/* cross-links */}
        <Stack direction="row" justifyContent="space-between" sx={{ pt: 1 }}>
          <Link component="button" type="button" onClick={() => onSwitch?.("login")}>
            {t("recovery.return_login")}
          </Link>
          <Link component="button" type="button" onClick={() => onSwitch?.("recovery")}>
            {t("login.losted")}
          </Link>
        </Stack>
      </Stack>
    </Paper>
  );
}
