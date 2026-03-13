// ===== models_auth.go =====
package main

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var lastActivePing sync.Map             // uid -> unix seconds
const activityMinInterval = time.Minute // write at most once per minute

func markUserActive(uid uint, ip, ua string) {
	now := time.Now()
	if v, ok := lastActivePing.Load(uid); ok {
		if now.Sub(time.Unix(v.(int64), 0)) < activityMinInterval {
			return // too soon, skip write
		}
	}
	// non-blocking DB write
	go func(u uint, t time.Time, ip, ua string) {
		_ = db.Model(&User{}).
			Where("id = ?", u).
			Updates(map[string]any{
				"last_active": t,
				"last_ip":     ip,
				"last_ua":     ua,
			}).Error
		lastActivePing.Store(u, t.Unix())
	}(uid, now, ip, ua)
}

func hashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}
func checkPassword(hash, pw string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw))
}

type Claims struct {
	UserID uint `json:"uid"`
	Status uint `json:"status"`
	jwt.RegisteredClaims
}

func issueAccess(u *User) (string, string, error) {
	now := time.Now()
	jti := strconv.FormatInt(now.UnixNano(), 36)
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, &Claims{
		UserID: u.ID,
		Status: u.Status,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTTL)),
			ID:        jti,
			Subject:   strconv.Itoa(int(u.ID)),
		},
	})
	str, err := tok.SignedString(jwtSecret)
	return str, jti, err
}

// раньше: func issueRefresh(u *User, userAgent string) (string, string, error)
func issueRefresh(u *User, userAgent string, ttl time.Duration) (string, string, error) {
	now := time.Now()
	jti := strconv.FormatInt(now.UnixNano(), 36)

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, &Claims{
		UserID: u.ID,
		Status: u.Status,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)), // используем переданный ttl
			ID:        jti,
			Subject:   strconv.Itoa(int(u.ID)),
		},
	})
	str, err := tok.SignedString(jwtSecret)
	return str, jti, err
}

// Хелпер для извлечения пользователя из заголовка Authorization
func getAuthUser(r *http.Request) (*User, error) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return nil, errors.New("no bearer")
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	claims, err := parseToken(token)
	if err != nil {
		return nil, err
	}
	var u User
	if err := db.First(&u, claims.UserID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	// Mark activity (debounced)
	markUserActive(u.ID, getClientIP(r), getClientAgent(r))

	return &u, nil
}

func makeUser(login, password string) error {
	var count int64
	db.Model(&User{}).Where("login = ?", login).Count(&count)
	if count == 0 {
		h, _ := hashPassword(password)
		db.Create(&User{Login: login, Password: h, Status: 0})
		return nil
	}
	return errors.New("User login: " + login + " exists!")
}

func parseToken(s string) (*Claims, error) {
	tok, err := jwt.ParseWithClaims(s, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}))
	if err != nil {
		return nil, err
	}
	if c, ok := tok.Claims.(*Claims); ok && tok.Valid {
		return c, nil
	}
	return nil, errors.New("invalid token")
}
