import React, { useEffect, useState } from "react";
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
  Chip,
  Tooltip,
  useTheme,
} from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import { sendDataToServer, formatSmartDateTime } from "utils/functions";
import UserEditDialog from "components/Settings/UserEditDialog";
import TitleBlock from "components/TitleBlock";
import GroupIcon from '@mui/icons-material/Group';
import { useTranslation } from "react-i18next";


export default function UsersBlock({readonly}){

      const [rows, setRows] = useState([]);
      const [openDialog, setOpenDialog] = useState(false);
      const [editing, setEditing] = useState(null);
      const {t,} = useTranslation()
    
      const theme = useTheme();
    
      const loadUsers = () => {
        sendDataToServer({ op: "getUsers" }).then((res) => {
          if (res.status === "OK") {
            setRows(res.rows || []);
          }
        });
      };
    
      useEffect(() => {
        loadUsers();
      }, []);
    
      const handleAdd = () => {
        setEditing(null);
        setOpenDialog(true);
      };
    
      const handleEdit = (row) => {
        setEditing(row);
        setOpenDialog(true);
      };
    
      const handleDelete = (row) => {
        if (!window.confirm(`Delete user "${row.login}"?`)) return;
    
        sendDataToServer({
          op: "deleteUser",
          id: row.id,
        }).then((res) => {
          if (res.status === "OK") {
            loadUsers();
          } else {
            alert(res.status);
          }
        });
      };
    
      const getStatusColor = (status) => {
        switch (Number(status)) {
          case 1:
            return "error";
          case 2:
            return "success";
          default:
            return "default";
        }
      };

    return (
      <Box sx={{ p: 0 }}>
        <TitleBlock
          t1={
            <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAdd}
                disabled={readonly}
            >
                {t("login.adduser")}
            </Button>
          }>
          <GroupIcon />{t("users")}
        </TitleBlock>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead
              sx={{
                "& .MuiTableCell-head": {
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : theme.palette.grey[200],
                  color: theme.palette.text.primary,
                  fontWeight: 700,
                },
              }}
            >
              <TableRow>
                <TableCell width={80}>ID</TableCell>
                <TableCell>Login</TableCell>
                <TableCell width={120}>Status</TableCell>
                <TableCell width={180}>Last active</TableCell>
                <TableCell width={150}>Last IP</TableCell>
                <TableCell>Last UA</TableCell>
                <TableCell width={180}>Created</TableCell>
                <TableCell width={140} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {row.login}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      color={getStatusColor(row.status)}
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>
                    {row.last_active ? formatSmartDateTime(row.last_active) : ""}
                  </TableCell>

                  <TableCell>{row.last_ip}</TableCell>

                  <TableCell>
                    <Tooltip title={row.last_ua || ""}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.last_ua}
                      </Typography>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    {row.created_at ? formatSmartDateTime(row.created_at) : ""}
                  </TableCell>

                  <TableCell align="right">
                    <IconButton onClick={() => handleEdit(row)} disabled={readonly}>
                      <Edit />
                    </IconButton>

                    <IconButton color="error" onClick={() => handleDelete(row)} disabled={readonly}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography
                      variant="body2"
                      sx={{ py: 3, textAlign: "center", color: "text.secondary" }}
                    >
                      No users
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <UserEditDialog
          open={openDialog}
          row={editing}
          onClose={() => setOpenDialog(false)}
          onSaved={() => {
            setOpenDialog(false);
            loadUsers();
          }}
        />
      </Box>
    )
}