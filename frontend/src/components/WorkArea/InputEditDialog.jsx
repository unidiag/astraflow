import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Checkbox,
    FormControlLabel,
    Stack,
    IconButton
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import { sendDataToServer } from "utils/functions";
import { useToast } from "utils/useToast";

export default function InputEditDialog({ open, onClose, row, onSaved, setEdges }) {

    const [name, setName] = useState("");
    const [enable, setEnable] = useState(true);
    const [inputs, setInputs] = useState([]);
    const [outputs, setOutputs] = useState([]);
    const toast = useToast()

    useEffect(() => {
        if (!row) return;
        setName(row.name || "");
        setEnable(row.enable ?? true);
        setInputs(row.inputs?.length ? row.inputs : [""]);
        setOutputs(row.outputs?.length ? row.outputs : [""]);
    }, [row]);




    const hasEmptyInputs = inputs.some(v => v.trim() === "");
    const hasEmptyOutputs = outputs.some(v => v.trim() === "");
    const hasEmptyName = name.trim() === "";
    const isValid = !hasEmptyInputs && !hasEmptyOutputs && !hasEmptyName;




    const updateArray = (arr, setArr, index, value) => {
        const copy = [...arr];
        copy[index] = value;
        setArr(copy);
    };



    const addRow = (arr, setArr) => {
        setArr([...arr, ""]);
    };



    const removeRow = (arr, setArr, index) => {
        const copy = [...arr];
        copy.splice(index, 1);
        setArr(copy.length ? copy : [""]);
    };



    const handleSave = () => {

        if (!row) return;

        sendDataToServer({
            op: "saveStream",
            stream_id: row.stream_id || "",
            node_id: row.node_id,
            name,
            enable: enable ? "1" : "0",
            inputs: JSON.stringify(inputs.filter(v => v.trim() !== "")),
            outputs: JSON.stringify(outputs.filter(v => v.trim() !== ""))
        }).then(res => {
            if (res.status === "OK") {

                // create edge if needed
                if (row.autoEdge) {

                    sendDataToServer({
                        op: "addEdge",
                        source: row.autoEdge.source,
                        sourceHandle: row.autoEdge.sourceHandle,
                        target: row.node_id,
                        targetHandle: String(res.input_id)
                    }).then(edgeRes => {

                        if (edgeRes.status === "OK") {

                            setEdges((eds) => [
                                ...eds,
                                {
                                    ...edgeRes.edge,
                                    sourceHandle: String(edgeRes.edge.sourceHandle),
                                    targetHandle: String(edgeRes.edge.targetHandle)
                                }
                            ]);

                        } else {
                            toast.error(edgeRes.status);
                        }

                        onSaved?.();
                        onClose?.();
                    });

                    return;
                }

                onSaved?.();
                onClose?.();
            } else {
                toast.error(res.status);
            }
        });

    };



    const handleDelete = () => {

        if (!row?.stream_id) return;

        if (!window.confirm("Delete this stream?")) return;

        sendDataToServer({
            op: "deleteStream",
            stream_id: row.stream_id
        }).then(res => {
            if (res.status === "OK") {
                onSaved?.();
                onClose?.();
            } else {
                toast.error(res.status);
            }
        });

    };



    return (
        <Dialog
            open={open}
            maxWidth="sm"
            fullWidth
            onClose={onClose}
        >

            <DialogTitle>
                {row?.stream_id ? "Edit stream" : "Create stream"}
            </DialogTitle>

            <DialogContent>

                <Stack spacing={2} mt={1}>

                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        error={hasEmptyName}
                        helperText={hasEmptyName ? "Name required" : ""}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={enable}
                                onChange={(e) => setEnable(e.target.checked)}
                            />
                        }
                        label="Enable"
                    />

                    {/* INPUTS */}

                    {inputs.map((v, i) => (
                        <Stack key={i} direction="row" spacing={1}>

                            <TextField
                                label="Input"
                                value={v}
                                error={v.trim() === ""}
                                helperText={v.trim() === "" ? "Input required" : ""}
                                onChange={(e) =>
                                    updateArray(inputs, setInputs, i, e.target.value)
                                }
                                fullWidth
                            />

                            <IconButton
                                onClick={() => removeRow(inputs, setInputs, i)}
                            >
                                <DeleteIcon />
                            </IconButton>

                        </Stack>
                    ))}

                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => addRow(inputs, setInputs)}
                    >
                        Add input
                    </Button>

                    {/* OUTPUTS */}

                    {outputs.map((v, i) => (
                        <Stack key={i} direction="row" spacing={1}>

                            <TextField
                                label="Output"
                                value={v}
                                error={v.trim() === ""}
                                helperText={v.trim() === "" ? "Output required" : ""}
                                onChange={(e) =>
                                    updateArray(outputs, setOutputs, i, e.target.value)
                                }
                                fullWidth
                            />

                            <IconButton
                                onClick={() => removeRow(outputs, setOutputs, i)}
                            >
                                <DeleteIcon />
                            </IconButton>

                        </Stack>
                    ))}

                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => addRow(outputs, setOutputs)}
                    >
                        Add output
                    </Button>

                </Stack>

            </DialogContent>

            <DialogActions>

                {row?.stream_id && (
                    <Button
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                )}

                <Button onClick={onClose}>
                    Cancel
                </Button>

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!isValid}
                >
                    Save
                </Button>

            </DialogActions>

        </Dialog>
    );

}