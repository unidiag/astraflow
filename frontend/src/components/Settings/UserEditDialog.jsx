import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Box,
} from "@mui/material";
import { sendDataToServer } from "utils/functions";
import { useTranslation } from "react-i18next";

export default function UserEditDialog({ open, row, onClose, onSaved }) {

  const {t,} = useTranslation()

  const [form, setForm] = useState({
    id: 0,
    login: "",
    password: "",
    status: 0,
  });

  useEffect(() => {
    if (row) {
      setForm({
        id: row.id || 0,
        login: row.login || "",
        password: "",
        status: row.status || 0,
      });
    } else {
      setForm({
        id: 0,
        login: "",
        password: "",
        status: 0,
      });
    }
  }, [row, open]);

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    sendDataToServer({
      op: "saveUser",
      id: String(form.id || 0),
      login: form.login,
      password: form.password,
      status: String(form.status),
    }).then((res) => {
      if (res.status === "OK") {
        onSaved();
      } else {
        alert(res.status);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{form.id ? "Edit user" : "Add user"}</DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Login"
            value={form.login}
            onChange={(e) => handleChange("login", e.target.value)}
            fullWidth
          />

          <TextField
            label={form.id ? "New password (optional)" : "Password"}
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            type="password"
            fullWidth
          />

          <TextField
            select
            label="Status"
            value={form.status}
            onChange={(e) => handleChange("status", Number(e.target.value))}
            fullWidth
          >
            <MenuItem value={0}>0 - Disable</MenuItem>
            <MenuItem value={1}>1 - Administrator</MenuItem>
            <MenuItem value={2}>2 - Observer</MenuItem>
          </TextField>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
        <Button variant="contained" onClick={handleSave}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}