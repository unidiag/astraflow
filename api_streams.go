package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

func apiSaveStream(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	nodeID := strings.TrimSpace(d["node_id"])
	name := strings.TrimSpace(d["name"])
	enable := d["enable"] == "1"
	streamID := d["stream_id"]

	var inputs []string
	var outputs []string

	_ = json.Unmarshal([]byte(d["inputs"]), &inputs)
	_ = json.Unmarshal([]byte(d["outputs"]), &outputs)

	if nodeID == "" {
		out["status"] = "node_id empty"
		return out
	}

	var node ClusterNode
	if err := db.Where("node_id = ?", nodeID).First(&node).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	var stream ClusterStream
	var sid string

	// --------------------------------
	// UPDATE
	// --------------------------------
	if streamID != "" {
		if err := db.First(&stream, streamID).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		sid = stream.AstraID

		if err := db.Model(&stream).Updates(map[string]any{
			"name":   name,
			"enable": enable,
		}).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		// delete old output ports
		if err := db.Where("stream_id = ? AND direction = ?", stream.ID, "output").Delete(&ClusterPort{}).Error; err != nil {
			out["status"] = err.Error()
			return out
		}
	} else {
		// --------------------------------
		// CREATE
		// --------------------------------
		stream = ClusterStream{
			NodeID: nodeID,
			Name:   name,
			Enable: enable,
			Type:   "spts",
		}

		if err := db.Create(&stream).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		sid = fmt.Sprintf("stream_%d", stream.ID)

		if err := db.Model(&stream).Update("astra_id", sid).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		stream.AstraID = sid
	}

	// --------------------------------
	// send to astra
	// --------------------------------
	s := map[string]any{
		"id":           sid,
		"name":         name,
		"service_name": translit(name),
		"type":         "spts",
		"enable":       enable,
		"input":        inputs,
		"output":       outputs,
	}

	if prov := strings.TrimSpace(getSetting("provider", "")); prov != "" {
		s["service_provider"] = prov
	}

	_, err := astraCommandJSON(node.Address, node.Auth, map[string]any{
		"id":     sid,
		"cmd":    "set-stream",
		"stream": s,
	})
	if err != nil {
		out["status"] = err.Error()
		return out
	}

	// --------------------------------
	// save ports
	// --------------------------------
	var firstInputID uint

	if streamID == "" {
		// CREATE: create input ports
		for i, v := range inputs {
			port := ClusterPort{
				NodeID:    nodeID,
				StreamID:  stream.ID,
				Direction: "input",
				Address:   v,
				Position:  i,
				Enabled:   true,
			}
			if err := db.Create(&port).Error; err != nil {
				out["status"] = err.Error()
				return out
			}
			if i == 0 {
				firstInputID = port.ID
			}
		}
	} else {
		// UPDATE: update existing input ports
		var oldInputs []ClusterPort
		if err := db.
			Where("stream_id = ? AND direction = ?", stream.ID, "input").
			Order("position ASC, id ASC").
			Find(&oldInputs).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		for i, v := range inputs {
			if i < len(oldInputs) {
				if err := db.Model(&oldInputs[i]).Updates(map[string]any{
					"address":  v,
					"position": i,
					"enabled":  true,
					"node_id":  nodeID,
				}).Error; err != nil {
					out["status"] = err.Error()
					return out
				}
				if i == 0 {
					firstInputID = oldInputs[i].ID
				}
			} else {
				port := ClusterPort{
					NodeID:    nodeID,
					StreamID:  stream.ID,
					Direction: "input",
					Address:   v,
					Position:  i,
					Enabled:   true,
				}
				if err := db.Create(&port).Error; err != nil {
					out["status"] = err.Error()
					return out
				}
				if i == 0 {
					firstInputID = port.ID
				}
			}
		}

		if len(oldInputs) > len(inputs) {
			var idsToDelete []uint
			for _, p := range oldInputs[len(inputs):] {
				idsToDelete = append(idsToDelete, p.ID)
			}

			if len(idsToDelete) > 0 {
				if err := db.Where("id IN ?", idsToDelete).Delete(&ClusterPort{}).Error; err != nil {
					out["status"] = err.Error()
					return out
				}
			}
		}
	}

	for i, v := range outputs {
		if err := db.Create(&ClusterPort{
			NodeID:    nodeID,
			StreamID:  stream.ID,
			Direction: "output",
			Address:   v,
			Position:  i,
			Enabled:   true,
		}).Error; err != nil {
			out["status"] = err.Error()
			return out
		}
	}

	if err := node.UpdateConfig(); err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	out["stream_id"] = stream.ID
	out["input_id"] = firstInputID
	return out
}

func apiGetStream(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	streamID := d["stream_id"]
	if streamID == "" {
		out["status"] = "stream_id empty"
		return out
	}

	var stream ClusterStream
	if err := db.First(&stream, streamID).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	var node ClusterNode
	if err := db.Where("node_id = ?", stream.NodeID).First(&node).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	inputs, outputs, err := getStreamIOFromAstraConfig(node.ConfigJSON, stream.AstraID)
	if err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	out["node_id"] = stream.NodeID
	out["name"] = stream.Name
	out["enable"] = stream.Enable
	out["inputs"] = inputs
	out["outputs"] = outputs
	return out
}

func apiDeleteStream(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	streamID := d["stream_id"]
	if streamID == "" {
		out["status"] = "stream_id empty"
		return out
	}

	var stream ClusterStream
	if err := db.First(&stream, streamID).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	var node ClusterNode
	if err := db.Where("node_id = ?", stream.NodeID).First(&node).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	_, err := astraCommandJSON(node.Address, node.Auth, map[string]any{
		"cmd": "set-stream",
		"id":  stream.AstraID,
		"stream": map[string]any{
			"remove": true,
		},
	})
	if err != nil {
		out["status"] = err.Error()
		return out
	}

	var ports []ClusterPort
	if err := db.Where("stream_id = ?", stream.ID).Find(&ports).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	var ids []uint
	for _, p := range ports {
		ids = append(ids, p.ID)
	}

	if len(ids) > 0 {
		if err := db.Where("source_port_id IN ?", ids).Delete(&ClusterEdge{}).Error; err != nil {
			out["status"] = err.Error()
			return out
		}
		if err := db.Where("target_port_id IN ?", ids).Delete(&ClusterEdge{}).Error; err != nil {
			out["status"] = err.Error()
			return out
		}
		if err := db.Where("id IN ?", ids).Delete(&ClusterPort{}).Error; err != nil {
			out["status"] = err.Error()
			return out
		}
	}

	if err := db.Delete(&stream).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	return out
}
