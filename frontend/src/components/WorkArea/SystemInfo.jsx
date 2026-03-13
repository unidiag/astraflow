import React from "react";
import { Box, Typography } from "@mui/material";

export default function SystemInfo({ info }) {
  const formatLoad = (v) => {
    if (!v && v !== 0) return "-";
    return (v / 100).toFixed(2);
  };

  const formatMem = (kb) => {
    if (!kb && kb !== 0) return "-";
    return (kb / 1024).toFixed(0) + " MB";
  };

  const formatUptime = (min) => {
    if (!min && min !== 0) return "-";

    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;

    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (!info) return null;

  return (
    <Box
      sx={{
        fontFamily: "Consolas, monospace",
        fontSize: 7,
        lineHeight: 1,
        userSelect: "none",
        position: "absolute",
        top: -25,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        width: "100%"
      }}
    >
      <Typography
        sx={{
          fontFamily: "inherit",
          fontSize: "inherit",
          textAlign: "left"
        }}
      >
        CPU {info.app_cpu_usage}% / {info.sys_cpu_usage}%
      </Typography>

      <Typography
        sx={{
          fontFamily: "inherit",
          fontSize: "inherit",
          textAlign: "right"
        }}
      >
        LA {formatLoad(info.la1)} {formatLoad(info.la5)} {formatLoad(info.la15)}
      </Typography>

      <Typography
        sx={{
          fontFamily: "inherit",
          fontSize: "inherit",
          textAlign: "left"
        }}
      >
        MEM {formatMem(info.app_mem_kb)} ({info.sys_mem_usage}%)
      </Typography>

      <Typography
        sx={{
          fontFamily: "inherit",
          fontSize: "inherit",
          textAlign: "right",
          opacity: 0.7
        }}
      >
        up {formatUptime(info.app_uptime)}
      </Typography>
    </Box>
  );
}