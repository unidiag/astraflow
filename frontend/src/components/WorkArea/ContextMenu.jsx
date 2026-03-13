import React from "react";
import {
    Menu,
    MenuItem,
    Divider,
    ListItemIcon,
    ListItemText
} from "@mui/material";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import { useToast } from "utils/useToast";
import { sendDataToServer } from "utils/functions";

export default function ContextMenu({
    menu,
    node_id,
    onClose,
    onAddInput,
    onRefreshConfig
}) {

    const toast = useToast();

    const handleRestart = () => {
        if (!node_id) return;
        sendDataToServer({
            op: "restartNode",
            node_id
        }).then((res) => {
            if (res.status === "OK") {
                toast.success("Astra restart success!");
            } else {
                toast.error(res.status);
            }
        });
    };




    ////////////////////
    // MENU ITEMS
    ////////////////////
    const items = [
        { label: "Make stream", icon: AddCircleOutlineIcon, onClick: onAddInput },
        { label: "Reload config", icon: RefreshIcon, onClick: onRefreshConfig },
        { divider: true },
        { label: "Restart Astra", icon: RestartAltIcon, onClick: handleRestart }
    ];








    const handleItemClick = (item) => {
        item.onClick?.();
        onClose();
    };

    return (
        <Menu
            open={menu !== null}
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={
                menu !== null
                    ? { top: menu.mouseY, left: menu.mouseX }
                    : undefined
            }
        >
            {items.map((item, index) => {
                if (item.divider) {
                    return <Divider key={`divider-${index}`} />;
                }

                const Icon = item.icon;

                return (
                    <MenuItem
                        key={item.label}
                        onClick={() => handleItemClick(item)}
                    >
                        <ListItemIcon>
                            <Icon fontSize="small" />
                        </ListItemIcon>

                        <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                );
            })}
        </Menu>
    );
}