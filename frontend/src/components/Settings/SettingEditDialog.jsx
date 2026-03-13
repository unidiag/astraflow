import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { sendDataToServer } from "utils/functions";
import { useTranslation } from "react-i18next";

export default function SettingEditDialog({ open, row, onClose, onSaved }) {
  const {t,} = useTranslation()
  const [form, setForm] = useState({
    old_key: "",
    key: "",
    value: "",
  });

  useEffect(() => {
    if (row) {
      setForm({
        old_key: row.key || "",
        key: row.key || "",
        value: row.value || "",
      });
    } else {
      setForm({
        old_key: "",
        key: "",
        value: "",
      });
    }
  }, [row, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    sendDataToServer({
      op: "saveSetting",
      old_key: form.old_key,
      key: form.key,
      value: form.value,
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
      <DialogTitle>{row ? "Edit setting" : "Add setting"}</DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Key"
            value={form.key}
            onChange={(e) => handleChange("key", e.target.value)}
            fullWidth
          />

          <TextField
            label="Value"
            value={form.value}
            onChange={(e) => handleChange("value", e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
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