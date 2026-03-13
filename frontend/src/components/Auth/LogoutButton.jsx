import { Button } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { clientLogoutBroadcast } from "utils/functions";
import { useAuth } from "utils/useAuth";




export default function LogoutButton(){

    const {t, } = useTranslation()

    const navigate = useNavigate()
    const { setUser } = useAuth();
    const onClick = () => {
      clientLogoutBroadcast();
      setUser(null);          // мгновенно скрываем защищённый контент
      navigate("/")
    };
    return <Button onClick={onClick}>{t("login.exit")}</Button>;
}