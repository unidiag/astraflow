// src/App.jsx
import React, { Suspense } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import useAppRoutes from "./routes/useAppRoutes";
import { RoutesFallback } from "./routes/routeHelpers";
import { urlsMenu, urlsUser } from "config";
import { Box } from "@mui/material";
import MenuAppBar from "components/MenuAppBar";
import { AuthProvider } from "utils/useAuth";
import { useTranslation } from "react-i18next";


function AppRoutes() {
  const routing = useAppRoutes(urlsMenu);
  return routing;
}

function App() {

  const { t } = useTranslation();

  return (
    <Router>
      <AuthProvider>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
          }}
        >
          {/* Menu */}
          <MenuAppBar pages={urlsMenu} settings={urlsUser} />

          {/* Body */}
          <Suspense fallback={<RoutesFallback />}>
            <Box sx={{ flex: 1 }}>
                <AppRoutes />
            </Box>
          </Suspense>

          {/* Footer (also translated) */}
          <Box
            component="footer"
            sx={{
              py: 1,
              textAlign: "center",
              bgcolor: "background.paper",
              borderTop: "1px solid",
              borderColor: "divider",
              color:"#666",
              fontSize:"0.75rem"
            }}
          >
              © {new Date().getFullYear()} {t("footer.rights", { 
                site: process.env.REACT_APP_NAME,
                version: process.env.REACT_APP_VERSION
              })}
          </Box>

        </Box>
      </AuthProvider>
    </Router>
  );
}

export default App;


