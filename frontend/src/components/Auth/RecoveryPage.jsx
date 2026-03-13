import React, { useState } from "react";
import { Box, Button, TextField, Typography, Paper, Alert } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { sendDataToServer } from "utils/functions";
import TitleBlock from "components/TitleBlock";
import { useTranslation } from "react-i18next";

export default function RecoveryPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false); // состояние ожидания

  const {t} = useTranslation()

  const handleSubmit = () => {
    setLoading(true); // включаем "Меняем.."
    sendDataToServer({ op: "authNewPassword", token, password }).then(r => {
      if (r.status === "OK") {
        setStatus("Пароль успешно изменён");
        setTimeout(() => navigate("/profile"), 2000);
      } else {
        setStatus(r.status);
      }
      setLoading(false); // выключаем "Меняем.."
    });
  };

  return (
    <>
      <TitleBlock>{t("recovery.title")}</TitleBlock>
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <Paper sx={{ p: 4, width: 400 }}>
          <Typography variant="h6" gutterBottom>{t("recovery.recover2")}</Typography>
          {status && <Alert severity="info">{status}</Alert>}
          <TextField
            label={t("recovery.newpass")}
            type="text"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading} // блокируем кнопку во время ожидания
          >
            {loading ? t("recovery.changing") : t("recovery.change")}
          </Button>
        </Paper>
      </Box>
    </>
  );
}
