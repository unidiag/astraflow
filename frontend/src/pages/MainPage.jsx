import React from "react";
import AuthGuard from "components/Auth/AuthGuard";
import WorkArea from "components/WorkArea/WorkArea";



export default function MainPage(){

    return (
        <AuthGuard>
            <WorkArea />
        </AuthGuard>
    )

}