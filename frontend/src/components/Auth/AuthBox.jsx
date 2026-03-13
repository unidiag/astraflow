import React from "react";
import LoginForm from "./LoginForm";


export default function AuthBox({ onSuccess }) {
  return <LoginForm onSwitch={"login"} onSuccess={onSuccess} />;
}