import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { sendDataToServer } from "./functions";
import { setRedux } from "./redux";

// ====== Keys ======
const ACCESS_KEY  = "access_token";
const REFRESH_KEY = "refresh_token";

// ====== Storage helpers ======
function getAccessToken() {
  try {
    return (sessionStorage && sessionStorage.getItem(ACCESS_KEY)) ||
           (localStorage && localStorage.getItem(ACCESS_KEY)) ||
           null;
  } catch { return null; }
}

// Сохраняем access туда же, где он уже лежит (session или local)
function setAccessToken(token) {
  try {
    const inSession = !!(sessionStorage && sessionStorage.getItem(ACCESS_KEY));
    if (inSession) {
      if (token) sessionStorage.setItem(ACCESS_KEY, token);
      else sessionStorage.removeItem(ACCESS_KEY);
    } else {
      if (token) localStorage.setItem(ACCESS_KEY, token);
      else localStorage.removeItem(ACCESS_KEY);
    }
  } catch {}
}

function getRefreshToken() {
  try {
    // Обычно логичнее хранить refresh в localStorage
    return (localStorage && localStorage.getItem(REFRESH_KEY)) || null;
  } catch { return null; }
}

function setRefreshToken(token) {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

// ====== JWT exp parsing ======
function base64UrlToStr(s) {
  try {
    const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return atob(b64);
  } catch { return ""; }
}

function getJwtExp(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadStr = base64UrlToStr(parts[1]);
    const payload = JSON.parse(payloadStr || "{}");
    return typeof payload.exp === "number" ? payload.exp : null; // seconds since epoch
  } catch { return null; }
}

// ====== In-flight dedupe for authMe ======
let inflight = null;
async function fetchMeOnce() {
  if (inflight) return inflight;
  inflight = sendDataToServer({ op: "authMe" })
    .then(r => (r?.status === "OK" && r.user ? r.user : null))
    .finally(() => { inflight = null; });
  return inflight;
}

// ====== Context ======
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user) {
      setRedux("user.login", user.login || "");
      setRedux("user.status", user.status ?? 0);
    } else {
      setRedux("user.login", "");
      setRedux("user.status", 0);
    }
  }, [user]);

  // Таймер авто-обновления access токена
  const refreshTimerRef = useRef(null);
  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // Вызов бэкенда для обновления токенов (ВАЖНО: передаём refresh_token)
  const refreshTokens = useMemo(() => async () => {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const res = await sendDataToServer({ op: "authRefresh", refresh_token: rt });
      if (res?.status === "OK") {
        if (res.access_token)  setAccessToken(res.access_token);
        if (res.refresh_token) setRefreshToken(res.refresh_token); // если бэкенд выдал новый refresh
        return true;
      }
    } catch {}
    return false;
  }, []);

  // Планируем авто-рефреш немного раньше истечения access
  const scheduleAutoRefresh = useMemo(() => () => {
    clearRefreshTimer();

    const access = getAccessToken();
    const expSec = getJwtExp(access);
    if (!access || !expSec) return; // нечего планировать

    const SKEW_MS = 30 * 1000; // обновимся за 30 секунд до истечения
    const delay = Math.max(expSec * 1000 - Date.now() - SKEW_MS, 0);

    refreshTimerRef.current = setTimeout(async () => {
      const ok = await refreshTokens();
      if (!ok) {
        // refresh не удался — чистим токены и состояние
        try { localStorage.removeItem(ACCESS_KEY); } catch {}
        try { sessionStorage.removeItem(ACCESS_KEY); } catch {}
        try { localStorage.removeItem(REFRESH_KEY); } catch {}
        setUser(null);
        setReady(true);
        clearRefreshTimer();
        return;
      }
      // после успешного refresh подтянем пользователя и перепланируем
      const u = await fetchMeOnce();
      setUser(u);
      setReady(true);
      scheduleAutoRefresh();
    }, delay);
  }, [refreshTokens]);

  // Публичный метод: перебиндить состояние на текущие токены
  const refresh = useMemo(() => async () => {
    const access = getAccessToken();
    if (!access) {
      setUser(null);
      setReady(true);
      clearRefreshTimer();
      return;
    }
    const u = await fetchMeOnce();
    setUser(u);
    setReady(true);
    scheduleAutoRefresh();
  }, [scheduleAutoRefresh]);

  // Инициализация при монтировании провайдера
  useEffect(() => {
    (async () => { await refresh(); })();
    return () => clearRefreshTimer();
  }, [refresh]);

  // Реакция на смену токенов в других вкладках
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;
      if (e.key.includes(ACCESS_KEY) || e.key.includes(REFRESH_KEY)) {
        setReady(false);
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  // Локальный logout
  const logoutLocal = () => {
    try { localStorage.removeItem(ACCESS_KEY); } catch {}
    try { sessionStorage.removeItem(ACCESS_KEY); } catch {}
    try { localStorage.removeItem(REFRESH_KEY); } catch {}
    setUser(null);
    setReady(true);
    clearRefreshTimer();
  };

  const value = useMemo(() => ({
    user, ready, setUser, refresh, logoutLocal, getAccessToken
  // eslint-disable-next-line
  }), [user, ready, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Хук с прежним API
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  const { user, ready, setUser, refresh, logoutLocal, getAccessToken } = ctx;
  return { user, ready, setUser, refresh, logoutLocal, getAccessToken };
}
