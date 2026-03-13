import React, { useEffect, useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    Switch,
    TextField,
    Typography
} from "@mui/material";
import { sendDataToServer } from "utils/functions";

const getDefaultData = () => ({
    id: 0,
    name: "",
    description: "",
    address: "",
    auth: "",
    enabled: true
});

export default function NodeEditDialog({ open, onClose, row, onSaved }) {

    const [data, setData] = useState(getDefaultData());
    const [testResult, setTestResult] = useState("");
    const isEdit = !!row?.id;

    useEffect(() => {
        if (open) {
            if (row) {
                setData({
                    id: row.id || 0,
                    name: row.name || "",
                    description: row.description || "",
                    address: row.address || "",
                    auth: "",
                    enabled: row.enabled ?? true
                });
            } else {
                setData(getDefaultData());
            }
            setTestResult("");
        }
    }, [open, row]);

    const setField = (key, value) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {

        const payload = {
            op: isEdit ? "updateClusterNode" : "addClusterNode",
            id: data.id,
            name: data.name,
            description: data.description,
            address: data.address,
            auth: data.auth,
            enabled: data.enabled ? "true" : "false"
        };

        sendDataToServer(payload).then(res => {
            if (res.status === "OK") {
                onSaved();
                onClose();
            } else {
                alert(res.status);
            }
        });
    };

    const handleDelete = () => {

        if (!row?.id) return;

        if (!window.confirm(`Delete node "${row.name}"?`)) return;

        sendDataToServer({
            op: "deleteClusterNode",
            id: row.id
        }).then(res => {

            if (res.status === "OK") {
                onSaved();
                onClose();
            } else {
                alert(res.status);
            }

        });
    };

    const handleTest = () => {

        if (!data.address) {
            alert("Address is required");
            return;
        }

        setTestResult("Testing...");

        sendDataToServer({
            id: data.id,
            op: "testClusterNode",
            address: data.address,
            auth: data.auth
        }).then(res => {

            if (res.status === "OK") {
                setTestResult(`Astra version: ${res.version}`);
            } else {
                setTestResult(res.status);
            }

        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                {isEdit ? "Edit Node" : "Add Node"}
            </DialogTitle>

            <DialogContent>

                <Stack spacing={2} sx={{ mt: 1 }}>

                    <TextField
                        label="Name"
                        value={data.name}
                        onChange={(e) => setField("name", e.target.value)}
                        fullWidth
                    />

                    <TextField
                        label="Description"
                        value={data.description}
                        onChange={(e) => setField("description", e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                    />

                    <TextField
                        label="Address"
                        value={data.address}
                        onChange={(e) => setField("address", e.target.value)}
                        fullWidth
                        placeholder="192.168.1.10:8000"
                    />

                    <TextField
                        label="Auth"
                        value={data.auth}
                        onChange={(e) => setField("auth", e.target.value)}
                        fullWidth
                        placeholder="login:password"
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={data.enabled}
                                onChange={(e) => setField("enabled", e.target.checked)}
                            />
                        }
                        label="Enabled"
                    />

                </Stack>

            </DialogContent>

            <DialogActions sx={{ justifyContent: "space-between" }}>

                <Stack direction="row" spacing={2} alignItems="center">

                    <Button
                        variant="outlined"
                        onClick={handleTest}
                    >
                        Test
                    </Button>

                    {testResult && (
                        <Typography variant="body2">
                            {testResult}
                        </Typography>
                    )}

                </Stack>

                <Stack direction="row" spacing={1}>

                    {isEdit && (
                        <Button color="error" onClick={handleDelete}>
                            Delete
                        </Button>
                    )}

                    <Button onClick={onClose}>
                        Cancel
                    </Button>

                    <Button variant="contained" onClick={handleSave}>
                        Save
                    </Button>

                </Stack>

            </DialogActions>

        </Dialog>
    );
}