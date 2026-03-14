package main

import (
	"fmt"
	"net/http"
	"time"
)

func apiAuthLogin(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

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

	_ = db.Model(&User{}).
		Where("id = ?", u.ID).
		Update("last_active", time.Now()).
		Error

	out["access_token"] = access
	out["user"] = map[string]any{
		"status": u.Status,
	}

	if d["remember"] == "1" {
		refresh, jti, err := issueRefresh(&u, ctx.UA, refreshTTL)
		if err == nil {
			_ = db.Create(&UserRefreshToken{
				UserID:    u.ID,
				JTI:       jti,
				ExpiresAt: time.Now().Add(refreshTTL),
				UserAgent: ctx.UA,
				IP:        ctx.IP,
			}).Error

			out["refresh_token"] = refresh
		}
	}

	return out
}

func apiAuthRefresh(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

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
	return out
}

func apiAuthLogout(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	rt := d["refresh_token"]
	if rt == "" {
		out["status"] = "OK"
		return out
	}

	if claims, err := parseToken(rt); err == nil {
		_ = db.Where("jti = ? AND user_id = ?", claims.ID, claims.UserID).
			Delete(&UserRefreshToken{}).
			Error
	}

	out["status"] = "OK"
	return out
}

func apiAuthMe(ctx *ApiCtx) map[string]any {
	out := ctx.Out

	user, err := getAuthUser(ctx.R)
	if err != nil {
		ctx.W.WriteHeader(http.StatusUnauthorized)
		out["status"] = "unauthorized"
		return out
	}

	out["status"] = "OK"
	out["user"] = map[string]any{
		"login":  user.Login,
		"status": user.Status,
	}

	return out
}

func apiAuthNewPassword(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	token := d["token"]
	newPass := d["password"]

	var u User
	if err := db.Where(
		"token = ? AND status > 0 AND updated_at > ?",
		token,
		time.Now().Add(-5*time.Minute),
	).First(&u).Error; err != nil {
		out["status"] = "Неверный или истекший токен!"
		return out
	}

	hashed, _ := hashPassword(newPass)

	if err := db.Model(&User{}).
		Where("id = ?", u.ID).
		Updates(map[string]any{
			"password": hashed,
			"token":    "",
		}).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	return out
}

func apiAuthRegister(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	var u User
	if err := db.Select("id,login").Where("login = ?", d["login"]).First(&u).Error; err == nil {
		out["status"] = "Такой аккаунт уже существует!"
		return out
	}

	if len(d["password"]) < 6 {
		out["status"] = "Недопустимый пароль (менее 6 символов)!"
		return out
	}

	token := md5hash(fmt.Sprintf("%d", time.Now().UnixNano()))

	if err := makeUser(d["login"], d["password"]); err != nil {
		out["status"] = err.Error()
		return out
	}

	if err := db.Model(&User{}).
		Where("login = ?", d["login"]).
		Update("token", token).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	out["status"] = "OK"
	out["token"] = token
	return out
}

func apiAuthConfirm(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

	if err := db.Model(&User{}).
		Where(
			"token = ? AND status = 0 AND updated_at > ?",
			d["token"],
			time.Now().Add(-5*time.Minute),
		).
		Updates(map[string]any{
			"status": 1,
			"token":  "",
		}).Error; err != nil {
		out["status"] = "Неверный или истекший токен!"
		return out
	}

	out["status"] = "OK"
	return out
}
