import React, { useEffect, useState } from "react";
import { Paper, Typography, Stack } from "@mui/material";
import { sendDataToServer } from "utils/functions";
import CloseIcon from "@mui/icons-material/Close";
import { IconButton } from "@mui/material";



export default function StreamInfo({ port_id, position, onClose }) {

    const [data, setData] = useState(null);

    useEffect(() => {

        const load = () => {

            sendDataToServer({
                op: "streamInfo",
                port_id: String(port_id)
            }).then(res => {

                if (res.status === "OK") {
                    setData(res.data);
                }

            });

        };

        load();

        const timer = setInterval(load, 1000);

        return () => clearInterval(timer);

    }, [port_id]);



    if (!position) return null;

    return (
        <Paper
            elevation={6}
            onClick={(e) => e.stopPropagation()}
            sx={{
                position: "fixed",
                left: position.x + 10,
                top: position.y - 30,
                padding: 1,
                minWidth: 120,
                fontSize: 12,
                zIndex: 1000
            }}
        >

            <IconButton
                size="small"
                onClick={onClose}
                sx={{
                    position: "absolute",
                    top: 2,
                    right: 2
                }}
            >
                <CloseIcon fontSize="inherit" />
            </IconButton>


            {!data ? (
                <Typography variant="caption">
                    Loading...
                </Typography>
            ) : (

                <Stack>

                    <Typography variant="caption">
                        {data.bitrate} kbps
                    </Typography>
                    
                    <Typography variant="caption">
                        CC: {data.cc_error} / PES: {data.pes_error}
                    </Typography>

                </Stack>

            )}

        </Paper>
    );

}