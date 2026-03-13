import TitleBlock from "components/TitleBlock";
import React, { useEffect, useState } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { sendDataToServer } from "utils/functions";
import SettingEditDialog from "./SettingEditDialog";
import { useToast } from "utils/useToast";
import { useTranslation } from "react-i18next";

export default function SettingsBlock({readonly}) {
  const theme = useTheme();
  const {t,} = useTranslation()
  const toast = useToast()

  const [rows, setRows] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadSettings = () => {
    sendDataToServer({ op: "getSettings" }).then((res) => {
      if (res.status === "OK") {
        setRows(res.rows || []);
      } else {
        alert(res.status);
      }
    });
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleEdit = (row) => {
    setEditing(row);
    setOpenDialog(true);
  };

  const handleRestart = () => {
    if (!window.confirm("Do you really want to restart the program?")) return;

    sendDataToServer({ op: "restartProgram" }).then((res) => {
      if (res.status === "OK") {
        toast.success("AstraFlow was restarted!")
      }else{
        alert(res.status);
      }
    });
  };

  const headCellSx = {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.background.paper
        : theme.palette.grey[200],
    color: theme.palette.text.primary,
    fontWeight: 700,
  };

  return (
    <>
      <TitleBlock
        t1={          <Button
            variant="contained"
            color="warning"
            startIcon={<RestartAltIcon />}
            onClick={handleRestart}
            disabled={readonly}
          >
            {t("restart")}
          </Button>}
      >
        <SettingsIcon /> {t("settings.main")}
      </TitleBlock>

      <Box sx={{ mt: 2 }}>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headCellSx} width={260}>
                  Key
                </TableCell>
                <TableCell sx={headCellSx}>
                  Value
                </TableCell>
                <TableCell sx={headCellSx} width={120} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.key}
                  hover
                  onDoubleClick={() => handleEdit(row)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {row.key}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {row.value}
                    </Typography>
                  </TableCell>

                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton onClick={() => handleEdit(row)} disabled={readonly}>
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography
                      variant="body2"
                      sx={{ py: 3, textAlign: "center", color: "text.secondary" }}
                    >
                      No settings
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <SettingEditDialog
        open={openDialog}
        row={editing}
        onClose={() => setOpenDialog(false)}
        onSaved={() => {
          setOpenDialog(false);
          loadSettings();
        }}
      />
    </>
  );
}