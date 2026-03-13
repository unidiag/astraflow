package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// -------------------- MODELS --------------------

type Setting struct {
	Key   string `gorm:"primaryKey" json:"key"`
	Value string `json:"value"`
}

type ClusterNode struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	NodeID          string    `gorm:"type:char(36);uniqueIndex" json:"node_id"`
	Name            string    `gorm:"size:100" json:"name"`
	Description     string    `gorm:"size:255" json:"description"`
	Address         string    `gorm:"size:100;uniqueIndex" json:"address"` // ip:port
	Auth            string    `gorm:"size:100" json:"-"`
	ConfigJSON      string    `gorm:"type:longtext" json:"-"`
	ConfigUpdatedAt time.Time `json:"config_updated_at"`

	Version string `gorm:"size:50" json:"version"`
	Commit  string `gorm:"size:50" json:"commit"`

	Enabled    bool      `gorm:"default:true" json:"enabled"`
	PosX       float64   `gorm:"default:0" json:"pos_x"`
	PosY       float64   `gorm:"default:0" json:"pos_y"`
	Type       string    `gorm:"size:50;default:'astra'" json:"type"`
	Group      string    `gorm:"size:50" json:"group"`
	Width      int       `json:"width"`
	Height     int       `json:"height"`
	Color      string    `gorm:"size:20" json:"color"`
	Status     string    `gorm:"size:20" json:"status"`
	Locked     bool      `gorm:"default:false" json:"locked"`
	LastSeenAt time.Time `gorm:"index" json:"last_seen_at"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type ClusterEdge struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	SourceNodeID string    `gorm:"size:36;index" json:"source_node_id"`
	TargetNodeID string    `gorm:"size:36;index" json:"target_node_id"`
	SourcePortID uint      `gorm:"index" json:"source_port_id"`
	TargetPortID uint      `gorm:"index" json:"target_port_id"`
	Type         string    `gorm:"size:50" json:"type"`
	Label        string    `gorm:"size:255" json:"label"`
	Animated     bool      `gorm:"default:false" json:"animated"`
	CreatedAt    time.Time `json:"created_at"`
}

type ClusterPort struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	NodeID    string    `gorm:"size:36;index" json:"node_id"`
	StreamID  uint      `gorm:"index" json:"stream_id"`
	Handle    string    `gorm:"size:50;index" json:"handle"`
	Name      string    `gorm:"size:100" json:"name"`
	Direction string    `gorm:"size:10;index" json:"direction"`
	Address   string    `gorm:"size:255" json:"address"`
	Type      string    `gorm:"size:50" json:"type"`
	Enabled   bool      `gorm:"default:true" json:"enabled"`
	Position  int       `gorm:"default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ClusterStream struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	NodeID    string    `gorm:"size:36;index" json:"node_id"`
	Name      string    `gorm:"size:100" json:"name"`
	Enable    bool      `gorm:"default:true" json:"enable"`
	Type      string    `gorm:"size:20;default:'spts'" json:"type"`
	AstraID   string    `gorm:"size:50;index" json:"astra_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type User struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Login      string    `gorm:"size:100;uniqueIndex;not null" json:"login"`
	Password   string    `gorm:"size:255;not null" json:"-"`
	Status     uint      `gorm:"default:0" json:"status"`
	Token      string    `gorm:"size:32" json:"token"`
	LastActive time.Time `json:"last_active"`
	LastIP     string    `gorm:"size:45" json:"last_ip"`
	LastUA     string    `gorm:"type:text" json:"last_ua"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type UserRefreshToken struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"index;not null"`
	JTI       string    `gorm:"uniqueIndex;size:64;not null"`
	ExpiresAt time.Time `gorm:"index;not null"`
	UserAgent string    `gorm:"size:255"`
	IP        string    `gorm:"size:45"` // IPv4/IPv6
	CreatedAt time.Time
}

// -------------------- DB INIT --------------------

// initDB opens (or creates) db.sqlite3 in project root via GORM
func initDB() bool {

	if len(os.Args) > 1 {
		dbFile = os.Args[1]
	}

	firstRun := false
	var setupCfg *SetupConfig

	if _, err := os.Stat(dbFile); os.IsNotExist(err) {
		firstRun = true

		var ok bool
		setupCfg, ok = runSetupWizard()
		if !ok {
			log.Fatal("Setup cancelled")
		}
	}

	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			IgnoreRecordNotFoundError: true,
			ParameterizedQueries:      true,
			Colorful:                  false,
			LogLevel: func() logger.LogLevel {
				if _debug_ {
					return logger.Warn
				}
				return logger.Error
			}(),
		},
	)

	var err error
	db, err = gorm.Open(sqlite.Open(dbFile), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		slog("DB open error: "+err.Error(), "error")
		log.Fatal(err)
	}

	slog("Database connected: "+dbFile, "info")

	if err = db.AutoMigrate(
		&Setting{},
		&ClusterNode{},
		&ClusterEdge{},
		&ClusterPort{},
		&ClusterStream{},
		&User{},
		&UserRefreshToken{},
	); err != nil {
		slog("DB migrate error: "+err.Error(), "error")
		log.Fatal(err)
	}

	// save setup settings
	if firstRun && setupCfg != nil {

		createDefaultUser("admin", "admin", 1)
		createDefaultUser("oper", "oper", 2)

		setSetting("port", setupCfg.Port)
		setSetting("provider", "AstraFlow")

		if setupCfg.InstallSvc {
			// вычисляем полный путь
			exe, _ := os.Executable()
			exe, _ = filepath.EvalSymlinks(exe)
			svc, err := installSystemdService(exe, os.Args[1:])
			if err != nil {
				fmt.Println("Systemd install error:", err)
			} else {
				fmt.Println()
				fmt.Println("Created and started: " + svc)
				fmt.Printf("Open WebUI: http://%s:%s (admin/admin)\n", getLocalIP(), setupCfg.Port)
				fmt.Println("Application will now continue running in background.")
				os.Exit(0)
			}
		}
	}

	loadSettings()

	return firstRun
}
