package main

import (
	"strconv"
	"strings"
)

func apiAddEdge(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	sourceNodeID := strings.TrimSpace(d["source"])
	targetNodeID := strings.TrimSpace(d["target"])
	sourceHandle := strings.TrimSpace(d["sourceHandle"])
	targetHandle := strings.TrimSpace(d["targetHandle"])

	if sourceNodeID == "" || targetNodeID == "" || sourceHandle == "" || targetHandle == "" {
		out["status"] = "invalid edge params"
		return out
	}

	sourcePortID64, err := strconv.ParseUint(sourceHandle, 10, 64)
	if err != nil {
		out["status"] = "invalid sourceHandle"
		return out
	}

	targetPortID64, err := strconv.ParseUint(targetHandle, 10, 64)
	if err != nil {
		out["status"] = "invalid targetHandle"
		return out
	}

	var sourcePort ClusterPort
	if err := db.First(&sourcePort, uint(sourcePortID64)).Error; err != nil {
		out["status"] = "source port not found"
		return out
	}

	var targetPort ClusterPort
	if err := db.First(&targetPort, uint(targetPortID64)).Error; err != nil {
		out["status"] = "target port not found"
		return out
	}

	if sourcePort.NodeID != sourceNodeID {
		out["status"] = "source port does not belong to source node"
		return out
	}

	if targetPort.NodeID != targetNodeID {
		out["status"] = "target port does not belong to target node"
		return out
	}

	if sourcePort.Direction != "output" {
		out["status"] = "source port must be output"
		return out
	}

	if targetPort.Direction != "input" {
		out["status"] = "target port must be input"
		return out
	}

	if sourceNodeID == targetNodeID {
		out["status"] = "self-link is forbidden"
		return out
	}

	var exists int64
	if err := db.Model(&ClusterEdge{}).
		Where("source_port_id = ? AND target_port_id = ?", sourcePort.ID, targetPort.ID).
		Count(&exists).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	if exists > 0 {
		out["status"] = "edge already exists"
		return out
	}

	e := ClusterEdge{
		SourceNodeID: sourceNodeID,
		TargetNodeID: targetNodeID,
		SourcePortID: sourcePort.ID,
		TargetPortID: targetPort.ID,
		Type:         "default",
		Animated:     false,
	}

	if err := db.Create(&e).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	out["edge_id"] = e.ID
	out["edge"] = map[string]any{
		"id":           e.ID,
		"source":       sourceNodeID,
		"target":       targetNodeID,
		"sourceHandle": sourcePort.ID,
		"targetHandle": targetPort.ID,
		"type":         e.Type,
		"animated":     e.Animated,
	}
	return out
}

func apiDeleteEdge(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	edgeID := d["edge_id"]
	if edgeID == "" {
		out["status"] = "edge_id empty"
		return out
	}

	if err := db.Delete(&ClusterEdge{}, edgeID).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	return out
}
