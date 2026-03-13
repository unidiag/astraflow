import { Box, CircularProgress } from "@mui/material";
import TitleBlock from "components/TitleBlock";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sendDataToServer } from "utils/functions";

export default function ConfirmPage(){

    const {token} = useParams()
    const [state, setState] = useState("")
    const navigate = useNavigate()

    useEffect(() => {
        sendDataToServer({op:"authConfirm", token}).then(r => {
            if(r.status === "OK"){
                navigate("/profile")
            }else{
                setState(r.status)
            }
        })
    // eslint-disable-next-line
    }, [])


    return (
        <>
            <TitleBlock>Активация аккаунта</TitleBlock>
            <Box>
                {state ? state : <CircularProgress />}
            </Box>
        </>
    )
}