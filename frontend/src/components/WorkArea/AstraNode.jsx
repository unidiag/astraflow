import React, { useEffect, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Box,
  Typography,
  Tooltip,
  useTheme,
  Popover
} from "@mui/material";
import useCopyClipboard from "utils/useCopyClipboard";
import SystemInfo from "./SystemInfo";
import AstraConfigEditor from "./AstraConfigEditor";
import { sendDataToServer } from "utils/functions";

export default function AstraNode({ data }) {
  const theme = useTheme();

  const inputs = data.inputs || [];
  const outputs = data.outputs || [];
  const copyClipboard = useCopyClipboard();

  const [sysInfo, setSysInfo] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [popoverChannel, setPopoverChannel] = useState("");

  const ports = Math.max(inputs.length, outputs.length);

  const portSpacing = 20;
  const headerHeight = 36;
  const bottomPadding = 10;

  const height = headerHeight + ports * portSpacing + bottomPadding;

  const borderColor =
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.35)"
      : "rgba(0,0,0,0.25)";

  const formatTime = (t) => {
    if (!t) return "";
    const d = new Date(t);
    return d.toLocaleString();
  };

  const normalizeUrl = (addr) => {
    if (!addr) return "#";
    if (/^https?:\/\//i.test(addr)) return addr;
    return "http://" + addr;
  };

  const normalizeChannelName = (s) => (s || "").trim().toLowerCase();

  const formatSessionUptime = (sec) => {
    if (!sec && sec !== 0) return "-";

    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(" ");
  };

  const getOutputColor = (addr) => {
    if (!addr) return "#fff";

    const a = addr.toLowerCase();

    if (a.includes(".m3u8")) {
      return "#ed03da";
    }

    if (a.startsWith("srt://")) {
      return "#ff9800";
    }

    if (a.startsWith("udp://")) {
      return "#169f01";
    }

    return "#d60707";
  };

  const handleInfo = () => {
    if (!data.row?.node_id) return;

    sendDataToServer({
      op: "systemInfo",
      node_id: data.row.node_id
    }).then((res) => {
      if (res && res.status === "OK") {
        setSysInfo(res.data || null);
        setSessions(Array.isArray(res.sessions) ? res.sessions : []);
      }
    });
  };

  useEffect(() => {
    handleInfo();

    const timer = setInterval(() => {
      handleInfo();
    }, 60000);

    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [data.row?.node_id]);

  const sessionsByChannelName = useMemo(() => {
    const out = {};

    for (const s of sessions) {
      const key = normalizeChannelName(s.channel_name);
      if (!key) continue;

      if (!out[key]) {
        out[key] = [];
      }

      out[key].push(s);
    }

    return out;
  }, [sessions]);

  const renderInputs = () =>
    inputs.map((p, i) => (
      <Handle
        key={p.id}
        id={String(p.id)}
        type="target"
        position={Position.Left}
        style={{
          top: headerHeight + i * portSpacing,
          background: "#2196f3",
          width: 10,
          height: 10
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();

          if (data.onEditStream) {
            data.onEditStream(p.stream_id);
          }
        }}
      />
    ));

  const renderOutputs = () =>
    outputs.map((o, i) => {
      const key = normalizeChannelName(o.name);
      const channelSessions = sessionsByChannelName[key] || [];
      const sessionsCount = channelSessions.length;

      return (
        <React.Fragment key={o.id}>
          <Tooltip title={o.address} placement="left">
            <Typography
              variant="caption"
              onClick={() => copyClipboard(o.address)}
              sx={{
                position: "absolute",
                fontSize: "10px",
                right: 12,
                top: headerHeight + i * portSpacing,
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: "pointer"
              }}
            >
              {o.name}
            </Typography>
          </Tooltip>

          {sessionsCount > 0 && (
            <Typography
              variant="caption"
              onClick={(e) => {
                e.stopPropagation();
                setPopoverAnchor(e.currentTarget);
                setPopoverChannel(key);
              }}
              sx={{
                position: "absolute",
                right: -18,
                top: headerHeight + i * portSpacing - 3,
                fontSize: "8px",
                fontWeight: 700,
                lineHeight: 1,
                color: "success.main",
                cursor: "pointer",
                minWidth: 12,
                userSelect: "none",
                "&:hover": {
                  textDecoration: "underline"
                }
              }}
            >
              {sessionsCount}
            </Typography>
          )}

          <Handle
            id={String(o.id)}
            type="source"
            position={Position.Right}
            style={{
              top: headerHeight + i * portSpacing + 8,
              background: getOutputColor(o.address),
              width: 10,
              height: 10
            }}
          />
        </React.Fragment>
      );
    });

  const popoverSessions = sessionsByChannelName[popoverChannel] || [];

  return (
    <Box
      sx={{
        minWidth: 180,
        height: height,
        borderRadius: 2,
        border: `1px solid ${borderColor}`,
        backgroundColor: "background.paper",
        position: "relative",
        paddingTop: "6px"
      }}
    >
      {data.row?.config_updated_at && (
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            bottom: -16,
            left: "50%",
            transform: "translateX(-50%)",
            color: "text.secondary",
            fontSize: 9,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            opacity: 0.8
          }}
        >
          {formatTime(data.row.config_updated_at)}
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1
        }}
      >
        <Typography
          component="a"
          href={normalizeUrl(data.address)}
          target="_blank"
          title={data.description}
          rel="noopener noreferrer"
          variant="body2"
          sx={{
            pl: 2,
            fontWeight: 800,
            textDecoration: "none",
            color: "text.primary",
            "&:hover": {
              textDecoration: "underline",
              color: "primary.main"
            }
          }}
        >
          {data.label}
        </Typography>

        <AstraConfigEditor node_id={data.row?.node_id} />
      </Box>

      <SystemInfo info={sysInfo} />

      {renderInputs()}
      {renderOutputs()}

      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={() => {
          setPopoverAnchor(null);
          setPopoverChannel("");
        }}
        anchorOrigin={{
          vertical: "center",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "left"
        }}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            p: 1,
            maxWidth: 360
          }
        }}
      >
        <Box sx={{ minWidth: 220 }}>
          {popoverSessions.map((s, idx) => (
            <Typography
              key={`${s.client_id || "client"}-${idx}`}
              variant="caption"
              sx={{
                display: "block",
                mb: 0.5,
                fontSize: 11,
                lineHeight: 1.3,
                wordBreak: "break-word"
              }}
            >
              {s.addr} ({s.ua || "-"}) <b>{formatSessionUptime(s.uptime)}</b>
            </Typography>
          ))}

          {popoverSessions.length === 0 && (
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              No active sessions
            </Typography>
          )}
        </Box>
      </Popover>
    </Box>
  );
}