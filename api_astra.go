package main

import (
	"encoding/json"
	"strings"
	"time"

	"gorm.io/gorm/clause"
)

func apiRestartNode(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	nodeID := strings.TrimSpace(d["node_id"])
	if nodeID == "" {
		out["status"] = "node_id empty"
		return out
	}

	node := getNodeByNodeId(nodeID)
	if node == nil {
		out["status"] = "node not found"
		return out
	}

	if _, err := node.Control("restart"); err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	return out
}

func apiGetAstraConfig(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	var node ClusterNode
	if err := db.
		Where("node_id = ?", d["node_id"]).
		First(&node).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	out["config"] = node.ConfigJSON
	return out
}

func apiSendConfigToAstra(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	var node ClusterNode
	if err := db.
		Model(&ClusterNode{}).
		Clauses(clause.Returning{}).
		Where("node_id = ?", d["node_id"]).
		Updates(map[string]any{
			"config_json":       d["config"],
			"config_updated_at": time.Now(),
		}).
		Scan(&node).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	var cfg any
	if err := json.Unmarshal([]byte(d["config"]), &cfg); err != nil {
		out["status"] = "Invalid JSON: " + err.Error()
		return out
	}

	_, err := astraCommandJSON(node.Address, node.Auth, map[string]any{
		"cmd":    "upload",
		"config": cfg,
	})
	if err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	return out
}

func apiSystemInfo(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	nodeID := d["node_id"]
	if nodeID == "" {
		out["status"] = "node_id empty"
		return out
	}
	node := getNodeByNodeId(nodeID)
	out, err := node.Control("sessions")
	if err != nil {
		out["status"] = err.Error()
		return out
	}
	systemStatus, err := node.Get("system-status")
	if err != nil {
		out["status"] = err.Error()
		return out
	}
	out["data"] = systemStatus
	out["status"] = "OK"
	return out
}

func apiStreamInfo(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	portID := strings.TrimSpace(d["port_id"])
	if portID == "" {
		out["status"] = "port_id empty"
		return out
	}

	var port ClusterPort
	if err := db.First(&port, portID).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	var stream ClusterStream
	if err := db.First(&stream, port.StreamID).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	var node ClusterNode
	if err := db.Where("node_id = ?", stream.NodeID).First(&node).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	resp, err := node.Get("stream-status/" + stream.AstraID + "?t=0")
	if err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	out["data"] = resp
	return out
}
