import { Box, Divider, Typography } from "@mui/material";
import React from "react";

export default function TitleBlock({ children, t1, t2, t3 }) {

  return (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        pt={3}
        sx={{
          flexWrap: "wrap", // позволяет перенос строк
          gap: 1,
          // на xs -> в колонку, начиная с sm -> в строку
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
        }}
      >
        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
          <Typography variant="h4" component="div">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {children}
            </Box>
          </Typography>
        </Box>
        {t1}
        {t2}
        {t3}
      </Box>
      <Divider sx={{mb:2}}/>
    </>
  );
}
