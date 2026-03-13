package main

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"strings"
)

type SetupConfig struct {
	Port         string
	ClusterNodes string
	SecretKey    string
	InstallSvc   bool
}

func runSetupWizard() (*SetupConfig, bool) {
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("AstraFlow first run setup")

	cfg := &SetupConfig{}

	// PORT
	for {
		portStr := ask(reader, "Port", "9000")

		port := strToInt(portStr)
		if port <= 0 || port > 65535 {
			fmt.Println("Invalid port number")
			continue
		}

		if !checkPort(port) {
			fmt.Printf("Port %d is already in use. Please choose another port..\n", port)
			continue
		}

		cfg.Port = portStr
		break
	}

	// install systemd unit
	ans := strings.ToLower(ask(reader, "Install `astraflow.service` to systemd? (y/N)", "n"))
	cfg.InstallSvc = ans == "y" || ans == "yes"

	fmt.Println("SETUP COMPLETED!")

	return cfg, true
}

func ask(reader *bufio.Reader, question string, def string) string {
	fmt.Printf("%s [%s]: ", question, def)
	text, _ := reader.ReadString('\n')
	text = strings.TrimSpace(text)
	if text == "" {
		return def
	}
	return text
}

// /////////// HELPERS
//
// возвращает имя процесса занявшего порт
func checkPort(port int) bool {
	addr := fmt.Sprintf(":%d", port)
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return false // порт занят
	}
	l.Close()
	return true // порт свободен
}

// возвращает первый попавшийся конфиг из /etc/astra
func detectAstraConfig() string {
	dir := "/etc/astra"
	defFile := filepath.Join(dir, "astra.json")
	files, err := os.ReadDir(dir)
	if err != nil {
		return defFile
	}
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := strings.ToLower(f.Name())
		if strings.HasSuffix(name, ".json") || strings.HasSuffix(name, ".conf") {
			return dir + "/" + f.Name()
		}
	}
	return defFile
}

// Cluster Node в массив
// parseClusterNodes parses user input and returns normalized ip:port list
func parseClusterNodes(nodes string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	for _, raw := range strings.Split(nodes, ",") {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		// remove trailing slash
		raw = strings.TrimRight(raw, "/")
		// remove scheme
		raw = strings.TrimPrefix(raw, "http://")
		raw = strings.TrimPrefix(raw, "https://")
		var host string
		var port string
		// host:port
		h, p, err := net.SplitHostPort(raw)
		if err == nil {
			host = h
			port = p
		} else {
			host = raw
			port = "80"
		}
		if host == "" {
			continue
		}
		addr := net.JoinHostPort(host, port)
		if _, ok := seen[addr]; ok {
			continue
		}
		seen[addr] = struct{}{}
		out = append(out, addr)
	}
	return out
}

// systemd
func installSystemdService(binPath string, args []string) (string, error) {

	u, err := user.Current()
	if err != nil {
		return "", err
	}

	serviceName := "astraflow.service"

	// формируем ExecStart
	execCmd := binPath
	if len(args) > 0 {
		execCmd += " " + strings.Join(args, " ")
	}

	unit := fmt.Sprintf(`[Unit]
Description=AstraFlow
After=network.target

[Service]
ExecStart=%s
Restart=always
RestartSec=3
WorkingDirectory=%s

[Install]
WantedBy=default.target
`, execCmd, filepath.Dir(binPath))

	var servicePath string
	var cmdPrefix []string

	if u.Uid == "0" {
		servicePath = "/etc/systemd/system/" + serviceName
		cmdPrefix = []string{"systemctl"}
	} else {
		dir := filepath.Join(u.HomeDir, ".config/systemd/user")
		os.MkdirAll(dir, 0755)
		servicePath = filepath.Join(dir, serviceName)
		cmdPrefix = []string{"systemctl", "--user"}
	}

	if err := os.WriteFile(servicePath, []byte(unit), 0644); err != nil {
		return "", err
	}

	exec.Command(cmdPrefix[0], append(cmdPrefix[1:], "daemon-reload")...).Run()
	exec.Command(cmdPrefix[0], append(cmdPrefix[1:], "enable", serviceName)...).Run()
	exec.Command(cmdPrefix[0], append(cmdPrefix[1:], "start", serviceName)...).Run()

	return servicePath, nil
}

func createDefaultUser(login, pass string, status uint) {
	var count int64
	db.Model(&User{}).Where("login = ?", login).Count(&count)
	if count > 0 {
		return
	}
	hashpassword, _ := hashPassword(pass)
	u := User{
		Login:    login,
		Password: hashpassword,
		Status:   status,
	}
	if err := db.Create(&u).Error; err != nil {
		log.Println("Create user error:", err)
		return
	}
}
