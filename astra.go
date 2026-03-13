package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

func getNodeById(id uint) *ClusterNode {
	var node ClusterNode
	db.Where("id = ?", id).Find(&node)
	return &node
}
func getNodeByNodeId(nodeID string) *ClusterNode {
	var node ClusterNode
	db.Where("node_id = ?", nodeID).Find(&node)
	return &node
}

func (n *ClusterNode) Get(path string) (map[string]any, error) {
	// normalize address
	addr := n.Address
	if !strings.HasPrefix(addr, "http://") && !strings.HasPrefix(addr, "https://") {
		addr = "http://" + addr
	}

	// build URL
	url := strings.TrimRight(addr, "/") + "/api/" + strings.TrimLeft(path, "/")
	client := &http.Client{
		Timeout: 3 * time.Second,
	}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	if n.Auth != "" {
		parts := strings.SplitN(n.Auth, ":", 2)
		if len(parts) == 2 {
			req.SetBasicAuth(parts[0], parts[1])
		}
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http status %d", resp.StatusCode)
	}
	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out, nil
}

func (n *ClusterNode) Control(cmd string) (map[string]any, error) {
	if n.Address == "" {
		return nil, fmt.Errorf("node address is empty")
	}
	ans, err := astraCommandJSON(n.Address, n.Auth, map[string]any{"cmd": cmd})
	if err != nil {
		db.Model(n).Update("status", "offline")
		return nil, err
	}
	db.Model(n).Updates(map[string]any{
		"status":       "online",
		"last_seen_at": time.Now(),
	})
	return ans, nil
}

func (n *ClusterNode) UpdateConfig() error {
	cfg, err := n.Control("load")
	if err != nil {
		return err
	}
	b, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	slog("Update config node `" + n.Name + "`")
	n.ConfigJSON = string(b)
	n.ConfigUpdatedAt = time.Now()
	if err := db.Save(n).Error; err != nil {
		return err
	}
	// Sync output ports with config
	if err := SyncNodeOutputPorts(*n); err != nil {
		return err
	}
	return nil
}

func (n *ClusterNode) Test() (map[string]any, error) {
	out, err := n.Control("version")
	if err != nil {
		return nil, err
	}
	version, _ := out["version"].(string)
	commit, _ := out["commit"].(string)
	db.Model(n).Updates(map[string]any{
		"version": version,
		"commit":  commit,
	})
	return out, nil
}

func astraCommandJSON(address, auth string, cmd map[string]any) (map[string]any, error) {
	if !strings.HasPrefix(address, "http://") && !strings.HasPrefix(address, "https://") {
		address = "http://" + address
	}
	url := strings.TrimRight(address, "/") + "/control/"
	bodyBytes, err := json.Marshal(cmd)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if auth != "" {
		p := strings.Split(auth, ":")
		if len(p) == 2 {
			req.SetBasicAuth(p[0], p[1])
		}
	}
	client := &http.Client{
		Timeout: 3 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var result map[string]any
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, fmt.Errorf("invalid JSON response: %s", strings.TrimSpace(string(b)))
	}
	return result, nil
}

/// helpers

func getStreamIOFromAstraConfig(configJSON, astraID string) ([]string, []string, error) {
	if strings.TrimSpace(configJSON) == "" {
		return nil, nil, fmt.Errorf("empty node config")
	}

	var root any
	if err := json.Unmarshal([]byte(configJSON), &root); err != nil {
		return nil, nil, err
	}

	stream, ok := findAstraStreamByID(root, astraID)
	if !ok {
		return nil, nil, fmt.Errorf("stream %s not found in astra config", astraID)
	}

	inputs := toStringSlice(stream["input"])
	outputs := toStringSlice(stream["output"])

	return inputs, outputs, nil
}

func findAstraStreamByID(v any, astraID string) (map[string]any, bool) {
	switch x := v.(type) {
	case map[string]any:
		if id, ok := x["id"].(string); ok && id == astraID {
			return x, true
		}

		for _, vv := range x {
			if m, ok := findAstraStreamByID(vv, astraID); ok {
				return m, true
			}
		}

	case []any:
		for _, item := range x {
			if m, ok := findAstraStreamByID(item, astraID); ok {
				return m, true
			}
		}
	}

	return nil, false
}

func toStringSlice(v any) []string {
	var out []string

	switch x := v.(type) {
	case []any:
		for _, item := range x {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				out = append(out, s)
			}
		}

	case []string:
		for _, s := range x {
			if strings.TrimSpace(s) != "" {
				out = append(out, s)
			}
		}

	case string:
		if strings.TrimSpace(x) != "" {
			out = append(out, x)
		}
	}

	return out
}
