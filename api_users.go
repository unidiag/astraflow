package main

import (
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

func apiGetUsers(ctx *ApiCtx) map[string]any {
	out := ctx.Out

	var rows []User
	if err := db.
		Order("id ASC").
		Find(&rows).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	out["rows"] = rows
	return out
}

func apiSaveUser(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D

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
	return out
}

func apiDeleteUser(ctx *ApiCtx) map[string]any {
	out := ctx.Out
	d := ctx.D
	user := ctx.User

	id, _ := strconv.Atoi(d["id"])
	if id == 0 {
		out["status"] = "wrong id"
		return out
	}

	if user != nil && user.ID == uint(id) {
		out["status"] = "you cannot delete yourself"
		return out
	}

	if err := db.Delete(&User{}, id).Error; err != nil {
		out["status"] = err.Error()
		return out
	}

	return out
}
