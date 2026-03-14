package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FlowNode struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Position map[string]any `json:"position"`
	Data     map[string]any `json:"data"`
}

type FlowEdge struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	Target       string `json:"target"`
	SourceHandle string `json:"sourceHandle"`
	TargetHandle string `json:"targetHandle"`
	Type         string `json:"type"`
	Label        string `json:"label"`
	Animated     bool   `json:"animated"`
}

func apiGetFlowData(ctx *ApiCtx) map[string]any {
	out := ctx.Out

	var rows []ClusterNode
	if err := db.
		Order("id ASC").
		Find(&rows).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	nodes := make([]FlowNode, 0, len(rows))
	for _, n := range rows {
		nodeType := strings.TrimSpace(n.Type)
		if nodeType == "" {
			nodeType = "astra"
		}

		label := strings.TrimSpace(n.Name)
		if label == "" {
			label = n.Address
		}

		inputs, outputs, err := GetNodePorts(n.NodeID)
		if err != nil {
			out["status"] = err.Error()
			return out
		}

		nodes = append(nodes, FlowNode{
			ID:   n.NodeID,
			Type: nodeType,
			Position: map[string]any{
				"x": n.PosX,
				"y": n.PosY,
			},
			Data: map[string]any{
				"label":       label,
				"description": n.Description,
				"address":     n.Address,
				"enabled":     n.Enabled,
				"status":      n.Status,
				"inputs":      inputs,
				"outputs":     outputs,
				"row":         n,
			},
		})
	}

	var edgeRows []ClusterEdge
	if err := db.Order("id ASC").Find(&edgeRows).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	edges := make([]FlowEdge, 0, len(edgeRows))
	for _, e := range edgeRows {
		edgeType := strings.TrimSpace(e.Type)
		if edgeType == "" {
			edgeType = "default"
		}

		edges = append(edges, FlowEdge{
			ID:           fmt.Sprintf("%d", e.ID),
			Source:       e.SourceNodeID,
			Target:       e.TargetNodeID,
			SourceHandle: fmt.Sprintf("%d", e.SourcePortID),
			TargetHandle: fmt.Sprintf("%d", e.TargetPortID),
			Type:         edgeType,
			Label:        e.Label,
			Animated:     e.Animated,
		})
	}

	out["status"] = "OK"
	out["nodes"] = nodes
	out["edges"] = edges
	return out
}

func apiAddClusterNode(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	name := strings.TrimSpace(d["name"])
	description := strings.TrimSpace(d["description"])
	address := strings.TrimSpace(d["address"])
	auth := strings.TrimSpace(d["auth"])

	if name == "" {
		out["status"] = "Name is required"
		return out
	}

	if address == "" {
		out["status"] = "Address is required"
		return out
	}

	var exists int64
	db.Model(&ClusterNode{}).
		Where("address = ?", address).
		Count(&exists)

	if exists > 0 {
		out["status"] = "Node with this address already exists"
		return out
	}

	enabled := d["enabled"] == "true" || d["enabled"] == "1" || strings.ToLower(d["enabled"]) == "on"

	row := ClusterNode{
		NodeID:      uuid.NewString(),
		Name:        name,
		Description: description,
		Address:     address,
		Auth:        auth,
		Enabled:     enabled,
		Type:        "astra",
		PosX:        100,
		PosY:        100,
	}

	if err := db.Create(&row).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	row.UpdateConfig()
	row.Test()

	out["status"] = "OK"
	out["row"] = row
	return out
}

func apiUpdateClusterNode(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	id := toUint(d["id"])
	if id == 0 {
		out["status"] = "Invalid node ID"
		return out
	}

	var row ClusterNode
	if err := db.Where("id = ?", id).First(&row).Error; err != nil {
		out["status"] = "Node not found"
		return out
	}

	name := strings.TrimSpace(d["name"])
	description := strings.TrimSpace(d["description"])
	address := strings.TrimSpace(d["address"])
	auth := strings.TrimSpace(d["auth"])

	if name == "" {
		out["status"] = "Name is required"
		return out
	}

	if address == "" {
		out["status"] = "Address is required"
		return out
	}

	var exists int64
	db.Model(&ClusterNode{}).
		Where("address = ? AND id <> ?", address, row.ID).
		Count(&exists)

	if exists > 0 {
		out["status"] = "Node with this address already exists"
		return out
	}

	row.Name = name
	row.Description = description
	row.Address = address
	row.Enabled = d["enabled"] == "true" || d["enabled"] == "1" || strings.ToLower(d["enabled"]) == "on"

	if auth != "" {
		row.Auth = auth
	}

	if err := db.Save(&row).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	row.UpdateConfig()
	row.Test()

	out["status"] = "OK"
	out["row"] = row
	return out
}

func apiDeleteClusterNode(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	id := toUint(d["id"])
	if id == 0 {
		out["status"] = "Invalid node ID"
		return out
	}

	var node ClusterNode
	if err := db.First(&node, id).Error; err != nil {
		out["status"] = "Node not found"
		return out
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		sub := tx.
			Model(&ClusterPort{}).
			Select("id").
			Where("node_id = ?", node.NodeID)

		if err := tx.
			Where("source_port_id IN (?) OR target_port_id IN (?)", sub, sub).
			Delete(&ClusterEdge{}).Error; err != nil {
			return err
		}

		if err := tx.
			Where("node_id = ?", node.NodeID).
			Delete(&ClusterPort{}).Error; err != nil {
			return err
		}

		return tx.Delete(&ClusterNode{}, id).Error
	})
	if err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	return out
}

func apiUpdateClusterNodePosition(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	nodeID := strings.TrimSpace(d["node_id"])
	if nodeID == "" {
		out["status"] = "Invalid node_id"
		return out
	}

	posX := toFloat64(d["pos_x"])
	posY := toFloat64(d["pos_y"])

	if err := db.Model(&ClusterNode{}).
		Where("node_id = ?", nodeID).
		Updates(map[string]any{
			"pos_x":      posX,
			"pos_y":      posY,
			"updated_at": time.Now(),
		}).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	return out
}

func apiTestClusterNode(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	address := strings.TrimSpace(d["address"])
	auth := strings.TrimSpace(d["auth"])

	if auth == "" {
		if node := getNodeById(toUint(d["id"])); node != nil {
			auth = node.Auth
		}
	}

	if address == "" {
		out["status"] = "Address is empty"
		return out
	}

	res, err := astraCommandJSON(address, auth, map[string]any{
		"cmd": "version",
	})
	if err != nil {
		out["status"] = err.Error()
		return out
	}

	out["version"] = res["commit"]
	return out
}

func apiUpdateNodeConfig(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	nodeID := d["node_id"]

	var node ClusterNode
	if err := db.Where("node_id = ?", nodeID).First(&node).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	if err := node.UpdateConfig(); err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	return out
}
