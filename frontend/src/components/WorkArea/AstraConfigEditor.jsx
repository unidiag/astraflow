import React, { useState } from "react";
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  useTheme,
  FormControlLabel,
  Checkbox
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import Editor from "@monaco-editor/react";
import { sendDataToServer } from "utils/functions";
import ReactJson from "@microlink/react-json-view";
import { useToast } from "utils/useToast";







export default function AstraConfigEditor({ node_id }) {

  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState("");
  const theme = useTheme();
  const editorTheme = theme.palette.mode === "dark" ? "vs-dark" : "light";
  const [viewerMode, setViewerMode] = useState(true);
  const [originalConfig, setOriginalConfig] = useState("");
  const toast = useToast()






  const loadConfig = () => {
    sendDataToServer({
      op: "getAstraConfig",
      node_id: node_id
    }).then(res => {
      if (res.status === "OK") {
        try {
            const obj = JSON.parse(res.config || "{}");
            const formatted = JSON.stringify(obj, null, 2);
            setConfig(formatted);
            setOriginalConfig(formatted);
        } catch {
            setConfig(res.config || "");
            setOriginalConfig(res.config || "");
        }
      }
    });
  };


  const configChanged = config !== originalConfig;




  const handleOpen = () => {
    setOpen(true);
    loadConfig();
  };


  const handleClose = () => {
    setOpen(false);
  };


  const getJSON = () => {
    try {
        return JSON.parse(config || "{}");
    } catch {
        return {};
    }
  };








  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
      >
        <SettingsIcon fontSize="inherit" />
      </IconButton>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xl"
        fullWidth
      >

        <DialogTitle
        sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
        }}
        >

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SettingsIcon fontSize="small" />
            Astra configuration
        </Box>

        <FormControlLabel
            control={
            <Checkbox
                size="small"
                checked={viewerMode}
                onChange={(e) => setViewerMode(e.target.checked)}
            />
            }
            label="JSON Viewer"
        />

        </DialogTitle>

        <DialogContent dividers>

            <Box sx={{ height: 600, overflow: "auto", }}>

            {viewerMode ? (

                <ReactJson
                    src={getJSON()}
                    name={false}
                    theme={theme.palette.mode === "dark" ? "monokai" : "rjv-default"}
                    collapsed={1}
                    displayDataTypes={false}
                    enableClipboard={true}
                    style={{
                        backgroundColor: "#1e1e1e",
                        minHeight:"100%",
                        padding: "5px 25px"
                    }}
                />

            ) : (

                <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme={editorTheme}
                    defaultValue={config}
                    onChange={(v) => setConfig(v || "")}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: "on",
                        formatOnPaste: true,
                        formatOnType: true,
                        automaticLayout: true,
                        formatOnSave: true
                    }}
                />

            )}

            </Box>

        </DialogContent>




        <DialogActions>
            {!viewerMode && (
                <Button
                variant="contained"
                disabled={!configChanged}
                onClick={() => {

                    try {
                        JSON.parse(config);
                    } catch {
                        alert("Invalid JSON");
                        return;
                    }

                    sendDataToServer({
                          op: "sendConfigToAstra",
                          node_id: node_id,
                          config: config
                        }).then(res => {
                          if (res.status === "OK") {
                            setOriginalConfig(config);
                            toast.success("Saved successfully. Please, restart Astra.")
                          }else{
                            toast.error("Error: "+res.status)
                          }
                    });

                }}
                >
                    Send to astra
                </Button>
            )}

            <Button onClick={handleClose}>
                Close
            </Button>
        </DialogActions>

      </Dialog>
    </>
  );
}