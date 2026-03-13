import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { capitalizeFirst } from "utils/functions";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import Error404Img from "../assets/Error404.png";

export function NotFound404() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = `404 | ${process.env.REACT_APP_NAME}`;
  }, [t, i18n.language]);

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <Box sx={{ pt: 10, textAlign: "center" }}>
      {/* картинка 404 */}
      <Box
        component="img"
        src={Error404Img}
        alt="404 - Page not found"
        sx={{
          maxWidth: 400,
          width: "100%",
          mb: 3,
          mx: "auto",
          display: "block"
        }}
      />

      <Typography variant="body1" sx={{ mb: 3 }}>
        {t("unknown_route")}: <code>{pathname}</code>
      </Typography>

      <Button component={Link} to="/" variant="contained">
        {t("go_home")}
      </Button>
    </Box>
  );
}

export function MissingPage({ routeKey }) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const pageTitle = t(`menu.${routeKey}`, {
      defaultValue: capitalizeFirst(routeKey),
    });
    document.title = `${pageTitle} | ${process.env.REACT_APP_NAME}`;
  }, [t, i18n.language, routeKey]);

  return (
    <div style={{ padding: 10, color: "red" }}>
      No page found for route: <strong>{routeKey}</strong>
    </div>
  );
}

export function withMenuTitle(Component, routeKey) {
  return function Wrapped(props) {
    const { t, i18n } = useTranslation();

    useEffect(() => {
      const pageTitle = t(`menu.${routeKey}`, {
        defaultValue: capitalizeFirst(routeKey),
      });
      document.title = `${pageTitle} | ${process.env.REACT_APP_NAME}`;
    }, [t, i18n.language]);

    return <Component {...props} />;
  };
}

export function RoutesFallback() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "90vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}
