// src/components/AuthGuard.jsx
import React from "react";
import { useAuth } from "utils/useAuth";

import AuthBox from "./AuthBox";
import { Box } from "@mui/material";

export default function AuthGuard({ children }) {
  const { user, ready, setUser } = useAuth(); // берём setUser

  if (!ready) return null; // или лоадер
  if (!user) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center", // по горизонтали
          alignItems: "center", // по вертикали
          height: "90vh", // во всю высоту экрана
        }}
      >
        <AuthBox onSuccess={setUser} />
      </Box>
    )
  }

  return children;
}