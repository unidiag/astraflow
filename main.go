package main

import (
	"log"
	"log/syslog"
	"sync"
	"time"

	"gorm.io/gorm"
)

var mu sync.Mutex
var _debug_ = false
var port = 9000
var err error
var _version_ = "1.01"  // 2026-03-12 22:40:33

var settings map[string]string

// Global DB (GORM)
var db *gorm.DB
var dbFile = "astraflow.db"

var sysLogger *syslog.Writer
var astracfg map[string]any

var (
	jwtSecret  = []byte("CHANGE_ME_LONG_RANDOM_SECRET_12345")
	accessTTL  = 10 * time.Minute
	refreshTTL = 14 * 24 * time.Hour
)

//
//
//
//
//
//

func main() {

	_debug_ = isRunThroughGoRun()
	slog("Server run in DEBUG-mode", "debug")

	sysLogger, err = syslog.New(syslog.LOG_INFO|syslog.LOG_DAEMON, "astraflow")
	if err != nil {
		log.Println("syslog init error:", err)
	}

	initDB() // инициализация базы данных и wizard, если запуск впервые

	go webserver()

	for {
		delay(1000)
	}

}
