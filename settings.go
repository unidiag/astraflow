package main

func loadSettings() {
	settings = make(map[string]string)
	var rows []Setting
	db.Find(&rows)
	for _, s := range rows {
		settings[s.Key] = s.Value
	}
}

func setSetting(key, value string) {
	if settings == nil {
		settings = make(map[string]string)
	}
	settings[key] = value

	db.Save(&Setting{
		Key:   key,
		Value: value,
	})
}

func getSetting(key string, def ...string) string {
	val, ok := settings[key]
	if !ok || val == "" {
		if len(def) > 0 {
			return def[0]
		}
		return ""
	}
	return val
}
