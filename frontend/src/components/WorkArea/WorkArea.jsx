import React, { useEffect, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Fab } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTheme } from "@emotion/react";

import AstraNode from "./AstraNode";
import NodeEditDialog from "./NodeEditDialog";
import { sendDataToServer } from "utils/functions";
import InputEditDialog from "./InputEditDialog";
import { useToast } from "utils/useToast";
import ContextMenu from "./ContextMenu";
import StreamInfo from "./StreamInfo";
import { getRedux } from "utils/redux";



const nodeTypes = {
    astra: AstraNode
};

export default function WorkArea() {

    const theme = useTheme();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [inputDialogOpen, setInputDialogOpen] = useState(false);
    const [editingStream, setEditingStream] = useState(null);
    const toast = useToast()
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [menu, setMenu] = useState(null);
    const [menuNode, setMenuNode] = useState(null);
    const [pendingEdge, setPendingEdge] = useState(null);
    const [streamInfo, setStreamInfo] = useState(null);
    const [streamInfoPos, setStreamInfoPos] = useState(null);
    
    const isReadOnly = String(getRedux("user.status")) !== "1";




    const onConnectStart = (event, params) => {
        if (isReadOnly) return;
        setPendingEdge({
            source: params.nodeId,
            sourceHandle: params.handleId
        });
    };

    const onConnectEnd = (event) => {
        if (isReadOnly) return;
        if (!pendingEdge) return;
        const nodeEl = event.target.closest(".react-flow__node");
        if (!nodeEl) {
            setPendingEdge(null);
            return;
        }
        const targetNodeId = nodeEl.getAttribute("data-id");
        if (!targetNodeId || targetNodeId === pendingEdge.source) {
            setPendingEdge(null);
            return;
        }
        // ищем source node
        const srcNode = nodes.find(n => n.id === pendingEdge.source);
        if (!srcNode) {
            setPendingEdge(null);
            return;
        }
        const out = srcNode.data.outputs.find(
            o => String(o.id) === String(pendingEdge.sourceHandle)
        );
        if (!out) {
            setPendingEdge(null);
            return;
        }
        // открываем создание input
        setEditingStream({
            node_id: targetNodeId,
            name: out.name,
            enable: true,
            inputs: [out.address],
            outputs: [""],
            autoEdge: {
                source: pendingEdge.source,
                sourceHandle: pendingEdge.sourceHandle
            }
        });
        setInputDialogOpen(true);
        setPendingEdge(null);
    };



    // -----------------------------
    // Load nodes + edges
    // -----------------------------
    const loadNodes = () => {
        sendDataToServer({ op: "getFlowData" }).then(res => {
            if (res.status === "OK") {
                setNodes(
                    (res.nodes || []).map(n => ({
                        ...n,
                        data: {
                            ...n.data,
                            onEditStream: handleEditStream
                        }
                    }))
                );
                setEdges(res.edges || []);
            } else {
                toast.error(res.status);
            }
        });
    };



    const handleEdgeDelete = (event, edge) => {
        if (isReadOnly) return;
        event.stopPropagation();
        event.preventDefault();

        if (!window.confirm("Do you really want to delete this connection?")) {
            return;
        }

        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        // remove from DB
        sendDataToServer({
            op: "deleteEdge",
            edge_id: edge.id
        }).then(res => {
            if (res.status !== "OK") {
                toast.error(res.status);
                loadNodes();
            }
        });
    };




    const handleEdgeClick = (event, edge) => {
        const portId = String(edge.targetHandle);
        setStreamInfo({
            port_id: portId
        });
        setStreamInfoPos({
            x: event.clientX,
            y: event.clientY
        });
    };





    const handleEditStream = (stream_id) => {
        if (isReadOnly) return;
        document.activeElement?.blur();
        sendDataToServer({
            op: "getStream",
            stream_id: String(stream_id)
        }).then(res => {
            if (res.status === "OK") {
                setEditingStream({
                    stream_id,
                    node_id: res.node_id,
                    name: res.name,
                    enable: res.enable,
                    inputs: res.inputs,
                    outputs: res.outputs
                });
                setInputDialogOpen(true);
            } else {
                toast.error(res.status);
            }
        });
    };




    useEffect(() => {
        loadNodes();
        // eslint-disable-next-line
    }, []);




    // -----------------------------
    // Context menu
    // -----------------------------
    const handleNodeContextMenu = (event, node) => {
        if (isReadOnly) return;
        event.preventDefault();
        setMenuNode(node);
        setMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
        });
    };




    const handleCloseMenu = () => {
        setMenu(null);
        setMenuNode(null);
    };




    // -----------------------------
    // Reload config
    // -----------------------------
    const handleRefreshConfig = () => {
        if (isReadOnly) return;
        if (!menuNode) return;
        sendDataToServer({
            op: "updateNodeConfig",
            node_id: menuNode.id
        }).then(res => {
            if (res.status === "OK") {
                toast.success("Update config success!");
                loadNodes();
            } else {
                toast.error(res.status);
            }
        });
        handleCloseMenu();
    };





    // -----------------------------
    // Add input
    // -----------------------------
    const handleAddInput = () => {
        if (isReadOnly) return;
        if (!menuNode) return;
        setEditingStream({
            node_id: menuNode.id,
            name: "",
            enable: true,
            inputs: [""],
            outputs: [""]
        });
        setInputDialogOpen(true);
        handleCloseMenu();
    };




    // -----------------------------
    // Connect nodes
    // -----------------------------
    const onConnect = (params) => {
        if (isReadOnly) return;
        setEdges((eds) => addEdge(params, eds));
        sendDataToServer({
            op: "addEdge",
            source: params.source,
            target: params.target,
            sourceHandle: params.sourceHandle,
            targetHandle: params.targetHandle
        }).then(res => {
            if (res.status !== "OK") {
                toast.error(res.status);
            }
            loadNodes();
        });
    };





    // -----------------------------
    // Add node
    // -----------------------------
    const handleAddClick = () => {
        if (isReadOnly) return;
        document.activeElement?.blur();
        setEditingRow(null);
        setOpenDialog(true);
    };




    // -----------------------------
    // Edit node
    // -----------------------------
    const handleNodeDoubleClick = (e, node) => {
        if (isReadOnly) return;
        if (node?.data?.row) {
            document.activeElement?.blur();
            setEditingRow(node.data.row);
            setOpenDialog(true);
        }
    };





    // -----------------------------
    // Save node position
    // -----------------------------
    const handleNodeDragStop = (e, node) => {
        if (isReadOnly) return;
        sendDataToServer({
            op: "updateClusterNodePosition",
            node_id: node.id,
            pos_x: String(node.position.x),
            pos_y: String(node.position.y)
        }).then(res => {

            if (res.status !== "OK") {
                toast.error(res.status);
            }

        });

    };



    

    return (
        <div style={{ width: "100%", height: "calc(100vh - 100px)", position: "relative" }}>

            {!isReadOnly && (
                <Fab
                    color="primary"
                    size="medium"
                    sx={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        zIndex: 20
                    }}
                    onClick={handleAddClick}
                >
                    <AddIcon />
                </Fab>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={isReadOnly ? undefined : onConnect}
                onConnectStart={isReadOnly ? undefined : onConnectStart}
                onConnectEnd={isReadOnly ? undefined : onConnectEnd}
                onNodeDoubleClick={isReadOnly ? undefined : handleNodeDoubleClick}
                onNodeDragStop={isReadOnly ? undefined : handleNodeDragStop}
                onNodeContextMenu={isReadOnly ? undefined : handleNodeContextMenu}
                nodeTypes={nodeTypes}
                fitView
                colorMode={theme.palette.mode}
                onEdgeClick={handleEdgeClick}
                onEdgeContextMenu={isReadOnly ? undefined : handleEdgeDelete}
                nodesDraggable={!isReadOnly}
                nodesConnectable={!isReadOnly}
                elementsSelectable={true}
                panOnDrag={true}
                zoomOnScroll={true}
                proOptions={{ hideAttribution: true }}
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>

            <NodeEditDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                row={editingRow}
                onSaved={loadNodes}
            />

            <InputEditDialog
                open={inputDialogOpen}
                row={editingStream}
                onClose={() => setInputDialogOpen(false)}
                onSaved={loadNodes}
                setEdges={setEdges}
            />

           <ContextMenu
                menu={menu}
                node_id={menuNode?.id}
                onClose={handleCloseMenu}
                onAddInput={handleAddInput}
                onRefreshConfig={handleRefreshConfig}
            />

            {streamInfo && (
                <StreamInfo
                    port_id={streamInfo.port_id}
                    position={streamInfoPos}
                    onClose={() => setStreamInfo(null)}
                />
            )}

        </div>
    );
}