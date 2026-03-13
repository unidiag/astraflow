package main

import (
	"crypto/md5"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/rand"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/fatih/color"
)

type StreamOutput struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	URL  string `json:"url"`
	Type string `json:"type"`
}

func ExtractStreamOutputs(configJSON string) []StreamOutput {
	result := []StreamOutput{}

	var root map[string]any
	if err := json.Unmarshal([]byte(configJSON), &root); err != nil {
		return result
	}

	streams, ok := root["make_stream"].([]any)
	if !ok {
		return result
	}

	for _, item := range streams {
		stream, ok := item.(map[string]any)
		if !ok {
			continue
		}

		enabled, ok := stream["enable"].(bool)
		if !ok || !enabled {
			continue
		}

		name, _ := stream["name"].(string)

		outputs, ok := stream["output"].([]any)
		if !ok {
			continue
		}

		for _, o := range outputs {
			out, ok := o.(string)
			if !ok {
				continue
			}

			if strings.HasPrefix(out, "http://") ||
				strings.HasPrefix(out, "https://") ||
				strings.HasPrefix(out, "srt://") {

				outType := "stream"
				switch {
				case strings.HasPrefix(out, "http://"), strings.HasPrefix(out, "https://"):
					outType = "http"
				case strings.HasPrefix(out, "srt://"):
					outType = "srt"
				}

				result = append(result, StreamOutput{
					ID:   md5hash(out),
					Name: name,
					URL:  out,
					Type: outType,
				})
			}
		}
	}

	return result
}

func SyncNodeOutputPorts(node ClusterNode) error {

	if node.ConfigJSON == "" {
		return nil
	}

	outputs := ExtractStreamOutputs(node.ConfigJSON)

	var oldPorts []ClusterPort
	if err := db.
		Where("node_id = ? AND direction = ?", node.NodeID, "output").
		Order("position ASC, id ASC").
		Find(&oldPorts).Error; err != nil {
		return err
	}

	oldByAddress := make(map[string]ClusterPort)
	for _, p := range oldPorts {
		oldByAddress[p.Address] = p
	}

	seen := make(map[string]bool)

	for i, o := range outputs {
		seen[o.URL] = true

		if old, ok := oldByAddress[o.URL]; ok {
			old.Name = strings.TrimSpace(o.Name)
			old.Type = o.Type
			old.Position = i
			old.Enabled = true
			old.Handle = fmt.Sprintf("out%d", i)

			if err := db.Save(&old).Error; err != nil {
				return err
			}
		} else {
			p := ClusterPort{
				NodeID:    node.NodeID,
				Handle:    fmt.Sprintf("out%d", i),
				Name:      strings.TrimSpace(o.Name),
				Direction: "output",
				Address:   o.URL,
				Type:      o.Type,
				Enabled:   true,
				Position:  i,
			}

			if err := db.Create(&p).Error; err != nil {
				return err
			}
		}
	}

	for _, p := range oldPorts {
		if seen[p.Address] {
			continue
		}

		if err := db.Where("source_port_id = ? OR target_port_id = ?", p.ID, p.ID).
			Delete(&ClusterEdge{}).Error; err != nil {
			return err
		}

		if err := db.Delete(&p).Error; err != nil {
			return err
		}
	}

	return nil
}

func AddInputPort(nodeID string) (ClusterPort, error) {
	var count int64
	if err := db.Model(&ClusterPort{}).
		Where("node_id = ? AND direction = ?", nodeID, "input").
		Count(&count).Error; err != nil {
		return ClusterPort{}, err
	}

	p := ClusterPort{
		NodeID:    nodeID,
		Handle:    fmt.Sprintf("in%d", count),
		Name:      fmt.Sprintf("Input %d", count+1),
		Direction: "input",
		Address:   "",
		Type:      "stream",
		Enabled:   true,
		Position:  int(count),
	}

	if err := db.Create(&p).Error; err != nil {
		return ClusterPort{}, err
	}

	return p, nil
}

func GetNodePorts(nodeID string) (inputs []ClusterPort, outputs []ClusterPort, err error) {
	var ports []ClusterPort
	if err = db.
		Where("node_id = ?", nodeID).
		Order("direction ASC, position ASC, id ASC").
		Find(&ports).Error; err != nil {
		return
	}

	for _, p := range ports {
		if p.Direction == "input" {
			inputs = append(inputs, p)
		} else if p.Direction == "output" {
			outputs = append(outputs, p)
		}
	}

	return
}

func translit(text string) string {

	var translitMap = map[rune]string{
		'а': "a", 'б': "b", 'в': "v", 'г': "g", 'д': "d",
		'е': "e", 'ё': "yo", 'ж': "zh", 'з': "z", 'и': "i",
		'й': "y", 'к': "k", 'л': "l", 'м': "m", 'н': "n",
		'о': "o", 'п': "p", 'р': "r", 'с': "s", 'т': "t",
		'у': "u", 'ф': "f", 'х': "h", 'ц': "ts", 'ч': "ch",
		'ш': "sh", 'щ': "sch", 'ъ': "", 'ы': "y", 'ь': "",
		'э': "e", 'ю': "yu", 'я': "ya",

		'А': "A", 'Б': "B", 'В': "V", 'Г': "G", 'Д': "D",
		'Е': "E", 'Ё': "Yo", 'Ж': "Zh", 'З': "Z", 'И': "I",
		'Й': "Y", 'К': "K", 'Л': "L", 'М': "M", 'Н': "N",
		'О': "O", 'П': "P", 'Р': "R", 'С': "S", 'Т': "T",
		'У': "U", 'Ф': "F", 'Х': "H", 'Ц': "Ts", 'Ч': "Ch",
		'Ш': "Sh", 'Щ': "Sch", 'Ъ': "", 'Ы': "Y", 'Ь': "",
		'Э': "E", 'Ю': "Yu", 'Я': "Ya",
	}

	var b strings.Builder

	for _, r := range text {
		if v, ok := translitMap[r]; ok {
			b.WriteString(v)
		} else {
			b.WriteRune(r)
		}
	}

	return b.String()
}

//go:embed build/*
var staticFiles embed.FS

type FileInfo struct {
	Path  string
	IsDir bool
}

// это для файлов ./build вебсервера
func readDirRecursively(dirPath string) ([]FileInfo, error) {
	var result []FileInfo
	files, err := staticFiles.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}
	for _, file := range files {
		fullPath := dirPath + "/" + file.Name()

		info := FileInfo{
			Path:  fullPath,
			IsDir: file.IsDir(),
		}
		result = append(result, info)
		if file.IsDir() {
			subdirContents, err := readDirRecursively(fullPath)
			if err != nil {
				return nil, err
			}
			result = append(result, subdirContents...)
		}
	}
	return result, nil
}

func md5hash(s string) string {
	h := md5.Sum([]byte(s))
	return hex.EncodeToString(h[:])
}

func getFileExtension(filePath string) string {
	parts := strings.Split(filePath, "/")
	fileName := parts[len(parts)-1]
	fileParts := strings.Split(fileName, ".")
	if len(fileParts) > 1 {
		extension := fileParts[len(fileParts)-1]
		return extension
	}
	return ""
}

func getLocalIP() string {
	ifaces, _ := net.Interfaces()
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := iface.Addrs()
		for _, addr := range addrs {

			ipnet, ok := addr.(*net.IPNet)
			if !ok || ipnet.IP.IsLoopback() {
				continue
			}

			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}

func slog(s ...string) {
	msg := ""
	level := "INFO"
	ts := formatDate(time.Now())
	if len(s) == 2 {
		level = strings.ToUpper(s[1])
		msg = s[0]
	} else if len(s) == 1 {
		msg = s[0]
	}
	if !_debug_ && level == "DEBUG" {
		return
	}
	line := fmt.Sprintf("%s [%s] %s", ts, level, msg)
	// ---- console color
	switch strings.ToLower(level) {
	case "err", "error":
		color.Red(line)
	case "warn":
		color.Yellow(line)
	case "debug":
		color.Cyan(line)
	default:
		fmt.Println(line)
	}
	// ---- system log
	if sysLogger != nil {
		switch strings.ToLower(level) {
		case "err", "error":
			sysLogger.Err(msg)
		case "warn":
			sysLogger.Warning(msg)
		case "debug":
			sysLogger.Debug(msg)
		default:
			sysLogger.Info(msg)
		}
	}
}

func toFloat64(s string) float64 {
	f, _ := strconv.ParseFloat(strings.TrimSpace(s), 64)
	return f
}

func toUint(s string) uint {
	n, _ := strconv.ParseUint(strings.TrimSpace(s), 10, 64)
	return uint(n)
}

func readJSON(path string) (map[string]any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return astracfg, err
	}

	if err := json.Unmarshal(data, &astracfg); err != nil {
		return astracfg, err
	}
	return astracfg, nil
}

func CorsAccess(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
	w.Header().Set("Vary", "Origin")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	reqHdrs := r.Header.Get("Access-Control-Request-Headers")
	if reqHdrs != "" {
		w.Header().Set("Access-Control-Allow-Headers", reqHdrs)
	} else {
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
	}
	// w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Max-Age", "600")
}

func toInt(v any) int64 {
	switch t := v.(type) {
	case float64:
		return int64(t)
	case string:
		i, _ := strconv.ParseInt(t, 10, 64)
		return i
	case json.Number:
		i, _ := t.Int64()
		return i
	case int:
		return int64(t)
	case int64:
		return t
	case uint:
		return int64(t)
	default:
		return 0
	}
}

func echo(s any) {
	tt := time.Now().Format("2006/01/02 15:04:05.000")
	switch reflect.TypeOf(s).String() {
	case "string":
		color.Blue("%s %s\n", tt, s)
	case "int", "uint", "uint32", "int32", "uint64", "int64":
		color.Green("%s %d\n", tt, s)
	case "[]uint8":
		color.Yellow("%s %02X\n", tt, s)
	}
}

func unixtime() int {
	return int(time.Now().Unix())
}

func toStr(value interface{}) string {
	switch v := value.(type) {
	case int:
		return strconv.Itoa(v)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(v)
	case string:
		return v
	case []byte:
		//return hex.EncodeToString(v)
		return string(v)
	default:
		// Обработка других типов или возврат ошибки
		return fmt.Sprintf("%v", value)
	}
}

func getClientAgent(r *http.Request) string {
	return r.Header.Get("User-Agent")
}

// getClientIP извлекает IPv4-адрес из заголовков X-Forwarded-For, X-Real-IP или r.RemoteAddr
func getClientIP(r *http.Request) string {
	// Проверяем X-Forwarded-For (может содержать несколько IP через запятую)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		for _, ip := range ips {
			cleanIP := strings.TrimSpace(ip)
			if isIPv4(cleanIP) {
				return cleanIP
			}
		}
	}
	xri := r.Header.Get("X-Real-IP")
	if xri != "" && isIPv4(xri) {
		return xri
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return ip
	}
	if isIPv4(parsedIP.String()) {
		return parsedIP.String()
	}
	if parsedIP.IsLoopback() {
		return "127.0.0.1"
	}

	return ip
}

// isIPv4 проверяет, является ли строка IPv4-адресом
func isIPv4(ip string) bool {
	parsedIP := net.ParseIP(ip)
	return parsedIP != nil && parsedIP.To4() != nil
}

func strToInt(s string) int {
	o, _ := strconv.Atoi(s)
	return o
}

// возвращаем по unixtime форматированное время
func formatDate(t time.Time) string {
	return t.Format("2006-01-02 15:04:05.999")
}

// установка cookie
func setCookie(name, value string, days int, w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:  name,
		Value: value,
		Path:  "/", // Доступна на всем сайте
		//HttpOnly: true, // Защита от XSS (не доступна JavaScript)
		//Secure: true, // Будет отправляться только через HTTPS
		//SameSite: http.SameSiteStrictMode,
		MaxAge: days * 86400,
	}
	http.SetCookie(w, cookie)
}

// определяет что запущено в дебаг-режиме
func isRunThroughGoRun() bool {
	exePath, err := os.Executable()
	if err != nil {
		panic(err)
	}
	exeDir := filepath.Dir(exePath)
	mainGoPath := filepath.Join(exeDir, "main")
	if _, err := os.Stat(mainGoPath); err == nil {
		return true
	}
	return false
}

func delay(milliseconds int) {
	time.Sleep(time.Duration(milliseconds) * time.Millisecond)
}

func fileExists(filename string) bool {
	_, err := os.Stat(filename)
	return !os.IsNotExist(err)
}

func checkInArray(a []string, b string) bool {
	for i := 0; i < len(a); i++ {
		if a[i] == b {
			return true
		}
	}
	return false
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz" +
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

func getRandomNumber(p int) int {
	rand.Seed(time.Now().UnixNano()) // Инициализация генератора случайных чисел текущим временем
	return rand.Intn(p + 1)          // Генерация случайного числа от 0 до 10 (включительно)
}
