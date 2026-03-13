import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import MainPage from "pages/MainPage.jsx";
import ExitPage from "components/Auth/ExitPage";
import { Container } from "@mui/material";
import SettingsPage from "pages/SettingsPage";





function MainWithTitle(props) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.title = process.env.REACT_APP_NAME + " " + process.env.REACT_APP_VERSION;
  }, [t, i18n.language]);
  return <MainPage {...props} />;
}




export const staticRoutes = [
  { path: "/", element: <MainWithTitle /> },
  { path: "/profile", element: <Container maxWidth="xl"><SettingsPage /></Container>},
  { path: "/exit", element: <Container maxWidth="xl"><ExitPage /></Container> },
];



