package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func api(data map[string]any, r *http.Request, w http.ResponseWriter) map[string]any {

	out := map[string]any{}
	out["status"] = "OK"

	ip := getClientIP(r)
	ua := getClientAgent(r)
	user, _ := getAuthUser(r)

	d := map[string]string{}

	for k, v := range data {
		if k != "op" {
			vv := toStr(v)
			switch vv {
			case "true":
				vv = "1"
			case "false":
				vv = "0"
			}
			d[k] = vv
		}
	}

	// доступ гостей только к апи авторизации
	if user == nil && !strings.HasPrefix(toStr(data["op"]), "auth") {
		out["status"] = "Not authorize!"
		return out
	}

	switch data["op"] {

	case "getFlowData":

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

	case "addClusterNode":

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

		enabled := false
		if d["enabled"] == "true" || d["enabled"] == "1" || strings.ToLower(d["enabled"]) == "on" {
			enabled = true
		}

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

	case "updateClusterNode":

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

		// Update auth only if non-empty
		if auth != "" {
			row.Auth = auth
		}

		if err := db.Save(&row).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		row.UpdateConfig()
		row.Test() // сохраняет версию астры для ноды

		out["status"] = "OK"
		out["row"] = row
		return out

	case "deleteClusterNode":

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

	case "updateClusterNodePosition":

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

	case "testClusterNode":
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

		res, err := astraCommandJSON(address, auth, map[string]any{"cmd": "version"})
		if err != nil {
			out["status"] = err.Error()
			return out
		}

		out["version"] = res["commit"]

	case "updateNodeConfig":
		nodeID := d["node_id"]
		var node ClusterNode
		if err := db.Where("node_id = ?", nodeID).First(&node).Error; err != nil {
			out["status"] = err.Error()
			return out
		}
		if err = node.UpdateConfig(); err != nil {
			out["status"] = err.Error()
		}

	case "saveStream":

		nodeID := strings.TrimSpace(d["node_id"])
		name := strings.TrimSpace(d["name"])
		enable := d["enable"] == "1"

		streamID := d["stream_id"]

		var inputs []string
		var outputs []string

		json.Unmarshal([]byte(d["inputs"]), &inputs)
		json.Unmarshal([]byte(d["outputs"]), &outputs)

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

		//--------------------------------
		// UPDATE
		//--------------------------------

		if streamID != "" {

			if err := db.First(&stream, streamID).Error; err != nil {
				out["status"] = err.Error()
				return out
			}

			sid = stream.AstraID

			db.Model(&stream).Updates(map[string]any{
				"name":   name,
				"enable": enable,
			})

			// удалить старые порты
			//db.Where("stream_id = ?", stream.ID).Delete(&ClusterPort{})
			db.Where("stream_id = ? AND direction = ?", stream.ID, "output").Delete(&ClusterPort{})

		} else {

			//--------------------------------
			// CREATE
			//--------------------------------

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

			db.Model(&stream).Update("astra_id", sid)

		}

		//--------------------------------
		// send to astra
		//--------------------------------

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

		//--------------------------------
		// save ports
		//--------------------------------

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
			// UPDATE: update existing input ports, do not create duplicates
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
					// if user added a new input manually
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

			// delete extra old inputs if user removed some of them
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

			db.Create(&ClusterPort{
				NodeID:    nodeID,
				StreamID:  stream.ID,
				Direction: "output",
				Address:   v,
				Position:  i,
				Enabled:   true,
			})

		}

		node.UpdateConfig()

		out["status"] = "OK"
		out["stream_id"] = stream.ID
		out["input_id"] = firstInputID
		return out

	case "getStream":

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

	case "deleteStream":

		streamID := d["stream_id"]

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

		// --- get ports of this stream
		var ports []ClusterPort
		db.Where("stream_id = ?", stream.ID).Find(&ports)

		// collect port IDs
		var ids []uint
		for _, p := range ports {
			ids = append(ids, p.ID)
		}

		if len(ids) > 0 {

			// delete edges connected to these ports
			db.Where("source_port_id IN ?", ids).Delete(&ClusterEdge{})
			db.Where("target_port_id IN ?", ids).Delete(&ClusterEdge{})

			// delete ports
			db.Where("id IN ?", ids).Delete(&ClusterPort{})
		}

		// delete stream
		db.Delete(&stream)

		out["status"] = "OK"
		return out

	case "addEdge":

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

	case "deleteEdge":
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

	case "restartNode":
		nodeID := d["node_id"]
		if nodeID == "" {
			out["status"] = "node_id empty"
			return out
		}
		node := getNodeByNodeId(nodeID)
		if _, err = node.Control("restart"); err != nil {
			out["status"] = err.Error()
			return out
		}

	case "getAstraConfig":
		var node ClusterNode
		if err := db.
			Where("node_id = ?", d["node_id"]).
			First(&node).Error; err != nil {
			out["status"] = err.Error()
			return out
		}
		out["config"] = node.ConfigJSON

	case "sendConfigToAstra":
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

	case "systemInfo":
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

	case "streamInfo":

		portID := strings.TrimSpace(d["port_id"])
		if portID == "" {
			out["status"] = "port_id empty"
			return out
		}

		//--------------------------------
		// find port
		//--------------------------------

		var port ClusterPort
		if err := db.First(&port, portID).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		//--------------------------------
		// find stream
		//--------------------------------

		var stream ClusterStream
		if err := db.First(&stream, port.StreamID).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		//--------------------------------
		// find node
		//--------------------------------

		var node ClusterNode
		if err := db.Where("node_id = ?", stream.NodeID).First(&node).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		//--------------------------------
		// request to Astra
		//--------------------------------

		resp, err := node.Get("stream-status/" + stream.AstraID + "?t=0")
		if err != nil {
			out["status"] = err.Error()
			return out
		}

		out["status"] = "OK"
		out["data"] = resp

		// ██╗   ██╗███████╗███████╗██████╗ ███████╗
		// ██║   ██║██╔════╝██╔════╝██╔══██╗██╔════╝
		// ██║   ██║███████╗█████╗  ██████╔╝███████╗
		// ██║   ██║╚════██║██╔══╝  ██╔══██╗╚════██║
		// ╚██████╔╝███████║███████╗██║  ██║███████║
		//  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝

	case "getUsers":
		var rows []User

		if err := db.
			Order("id ASC").
			Find(&rows).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		out["rows"] = rows

	case "saveUser":
		id, _ := strconv.Atoi(d["id"])
		login := strings.TrimSpace(d["login"])
		password := d["password"]
		status, _ := strconv.Atoi(d["status"])

		if login == "" {
			out["status"] = "empty login"
			return out
		}

		if id == 0 {
			if password == "" {
				out["status"] = "empty password"
				return out
			}

			hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
			if err != nil {
				out["status"] = err.Error()
				return out
			}

			row := User{
				Login:    login,
				Password: string(hash),
				Status:   uint(status),
				Token:    "",
			}

			if err := db.Create(&row).Error; err != nil {
				out["status"] = err.Error()
				return out
			}

			out["row"] = row
			return out
		}

		var row User
		if err := db.First(&row, id).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		row.Login = login
		row.Status = uint(status)

		if password != "" {
			row.Password, _ = hashPassword(password)
		}

		if err := db.Save(&row).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		out["row"] = row

	case "deleteUser":
		id, _ := strconv.Atoi(d["id"])

		if id == 0 {
			out["status"] = "wrong id"
			return out
		}

		if user.ID == uint(id) {
			out["status"] = "you cannot delete yourself"
			return out
		}

		if err := db.Delete(&User{}, id).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

	// ███████╗███████╗████████╗████████╗██╗███╗   ██╗ ██████╗ ███████╗
	// ██╔════╝██╔════╝╚══██╔══╝╚══██╔══╝██║████╗  ██║██╔════╝ ██╔════╝
	// ███████╗█████╗     ██║      ██║   ██║██╔██╗ ██║██║  ███╗███████╗
	// ╚════██║██╔══╝     ██║      ██║   ██║██║╚██╗██║██║   ██║╚════██║
	// ███████║███████╗   ██║      ██║   ██║██║ ╚████║╚██████╔╝███████║
	// ╚══════╝╚══════╝   ╚═╝      ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝

	case "getSettings":
		var rows []Setting

		if err := db.
			Order("key ASC").
			Find(&rows).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		out["rows"] = rows

	case "saveSetting":
		oldKey := strings.TrimSpace(d["old_key"])
		key := strings.TrimSpace(d["key"])
		value := d["value"]

		if key == "" {
			out["status"] = "empty key"
			return out
		}

		if oldKey == "" || oldKey == key {
			row := Setting{
				Key:   key,
				Value: value,
			}

			if err := db.Save(&row).Error; err != nil {
				out["status"] = err.Error()
				return out
			}

			out["row"] = row
			return out
		}

		var row Setting
		if err := db.First(&row, "key = ?", oldKey).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		if err := db.Delete(&Setting{}, "key = ?", oldKey).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		row = Setting{
			Key:   key,
			Value: value,
		}

		if err := db.Create(&row).Error; err != nil {
			out["status"] = err.Error()
			return out
		}

		out["row"] = row

	case "restartProgram":
		go func() {
			time.Sleep(1000 * time.Millisecond)
			os.Exit(0)
		}()

	//  █████╗ ██╗   ██╗████████╗██╗  ██╗
	// ██╔══██╗██║   ██║╚══██╔══╝██║  ██║
	// ███████║██║   ██║   ██║   ███████║
	// ██╔══██║██║   ██║   ██║   ██╔══██║
	// ██║  ██║╚██████╔╝   ██║   ██║  ██║
	// ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝

	// -------- LOGIN --------
	case "authLogin":

		login := d["login"]
		password := d["password"]

		if login == "" || password == "" {
			out["status"] = "Login and password are required!"
			return out
		}

		var u User
		if err := db.Where("login = ?", login).First(&u).Error; err != nil {
			out["status"] = "Login does not exists!"
			return out
		}
		if u.Status == 0 {
			out["status"] = "Login not confirmed!"
			return out
		}
		if err := checkPassword(u.Password, password); err != nil {
			out["status"] = "Password is invalid"
			return out
		}

		access, _, err := issueAccess(&u)
		if err != nil {
			out["status"] = "failed to issue access token"
			return out
		}

		_ = db.Model(&User{}).Where("id = ?", u.ID).Update("last_active", time.Now()).Error

		out["access_token"] = access
		out["user"] = map[string]any{
			//"email":  u.Email,
			"status": u.Status,
		}

		if d["remember"] == "1" {
			refresh, jti, err := issueRefresh(&u, ua, refreshTTL)
			if err == nil {
				_ = db.Create(&UserRefreshToken{
					UserID:    u.ID,
					JTI:       jti,
					ExpiresAt: time.Now().Add(refreshTTL),
					UserAgent: ua,
					IP:        ip,
				}).Error
				out["refresh_token"] = refresh
			}
		}

	// -------- REFRESH --------
	case "authRefresh":
		db.Where("expires_at < ?", time.Now()).Delete(&UserRefreshToken{})
		rt := d["refresh_token"]
		if rt == "" {
			out["status"] = "refresh token is empty"
			return out
		}
		claims, err := parseToken(rt)
		if err != nil {
			out["status"] = "invalid refresh token"
			return out
		}
		// check DB for stored JTI and expiry
		var row UserRefreshToken
		if err := db.Where("jti = ? AND user_id = ?", claims.ID, claims.UserID).First(&row).Error; err != nil {
			out["status"] = "refresh revoked"
			return out
		}
		if time.Now().After(row.ExpiresAt) {
			_ = db.Delete(&row).Error
			out["status"] = "refresh expired"
			return out
		}
		var u User
		if err := db.First(&u, claims.UserID).Error; err != nil {
			out["status"] = "user not found"
			return out
		}
		access, _, err := issueAccess(&u)
		if err != nil {
			out["status"] = "failed to issue access token"
			return out
		}
		out["access_token"] = access

	// -------- LOGOUT (revoke single refresh) --------
	case "authLogout":
		rt := d["refresh_token"]
		if rt == "" {
			out["status"] = "OK" // nothing to do
			return out
		}
		if claims, err := parseToken(rt); err == nil {
			_ = db.Where("jti = ? AND user_id = ?", claims.ID, claims.UserID).
				Delete(&UserRefreshToken{}).Error
		}

	case "authMe":
		// Requires Authorization: Bearer <access_token>
		if user, err := getAuthUser(r); err != nil {
			w.WriteHeader(http.StatusUnauthorized) // важно для авто-рефреша на фронте
			out["status"] = "unauthorized"
		} else {
			out["status"] = "OK"
			out["user"] = map[string]any{
				//"id":    user.ID,
				"login": user.Login,
				//"email":  user.Email,
				"status": user.Status,
			}
		}

	// RECOVERY PASSWORD //
	case "authNewPassword":

		token := d["token"]
		newPass := d["password"]

		var u User

		if err := db.Where("token = ? AND status > 0 AND updated_at > ?", token, time.Now().Add(time.Duration(-5)*time.Minute)).First(&u).Error; err != nil {
			out["status"] = "Неверный или истекший токен!"
			return out
		}

		hashed, _ := hashPassword(newPass)
		db.Model(&User{}).Where("id = ?", u.ID).Update("password", hashed).Update("token", "")

	// регистрация пользователя
	case "authRegister":

		var u User
		if err := db.Select("id,email").Where("email = ?", d["email"]).First(&u).Error; err == nil {
			out["status"] = "Такой аккаунт уже существует!"
			return out
		}

		if len(d["password"]) < 6 {
			out["status"] = "Недопустимый пароль (менее 6 символов)!"
			return out
		}

		token := md5hash(fmt.Sprintf("%d", time.Now().UnixNano()))
		makeUser(d["email"], d["password"])
		db.Model(&User{}).Where("email = ?", d["email"]).Update("token", token)

		// подтверждение активации после регистрации
	case "authConfirm":
		if err = db.Model(&User{}).
			Where("token = ? AND status = 0 AND updated_at > ?", d["token"], time.Now().Add(time.Duration(-5)*time.Minute)).
			Update("status", 1).
			Update("token", "").
			Error; err != nil {
			out["status"] = "Неверный или истекший токен!"
			return out
		}

	default:
		out["response"] = "default value API"
		out["status"] = "NOK"

	}

	return out

}
