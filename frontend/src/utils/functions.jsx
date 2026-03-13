import axios from "axios";


const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";







export const sendDataToServer = async (data) => {
  try {
    // ⬇️ главное изменение
    const access =
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem(ACCESS_KEY)) ||
      (typeof localStorage !== "undefined" && localStorage.getItem(ACCESS_KEY));

    const headers = { "Content-Type": "application/json" };
    if (access) headers["Authorization"] = `Bearer ${access}`;

    let response = await axios.post(process.env.REACT_APP_API_URL, data, { headers });

    if (response.statusText === "OK" || response.status === 200) {
      if ("data" in response.data) {
        const tmp1 = response.data;
        const tmp2 = [];
        for (const k in tmp1.data) {
          if (Number(k) > 0) tmp2.push(tmp1.data[k]);
          else {
            if ("error" in tmp1) console.error(tmp1.error);
            if ("error" in tmp1.data) console.error(tmp1.data.error);
            return tmp1.data;
          }
        }
        return tmp2;
      }
      return response.data;
    }
  } catch (error) {
    // 401 -> пытаемся рефрешить ТОЛЬКО если есть refresh_token
    if (error.response && error.response.status === 401) {

      const refresh =
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem(REFRESH_KEY)) ||
        (typeof localStorage !== "undefined" && localStorage.getItem(REFRESH_KEY));

      if (refresh) {
        try {
          const rr = await axios.post(process.env.REACT_APP_API_URL, { op: "authRefresh", refresh_token: refresh });
          const r2 = rr.data
          if (r2.data && r2.data.status === "OK" && r2.data.access_token) {
            //console.log("okkk")
            // Куда сохранить новый access:
            const hasRefreshInLocal = typeof localStorage !== "undefined" && localStorage.getItem(REFRESH_KEY);
            if (hasRefreshInLocal) {
              localStorage.setItem(ACCESS_KEY, r2.data.access_token);
              //console.log("local: "+r2.data.access_token)
            } else if (typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(ACCESS_KEY, r2.data.access_token);
              //console.log("session: "+r2.data.access_token)
            }
            const retryHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${r2.data.access_token}` };
            const retry = await axios.post(process.env.REACT_APP_API_URL, data, { headers: retryHeaders });
            return retry.data.data;
          }
        } catch (e2) {
          console.error("Refresh token failed", e2);
        }
      }
    }
    console.error("Error request data:", error);
  }
};


export function formatSmartDateTime(dateInput, short) {
  if (!dateInput) return "—";

  const date = new Date(dateInput);
  const now = new Date();

  // Если разница больше 10 лет — выводим ?
  const diffYears = Math.abs(now.getFullYear() - date.getFullYear());
  if (diffYears > 10) return "?";

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const isYesterday = (d1, d2) => {
    const tmp = new Date(d2);
    tmp.setDate(d2.getDate() - 1);
    return isSameDay(d1, tmp);
  };

  const isTomorrow = (d1, d2) => {
    const tmp = new Date(d2);
    tmp.setDate(d2.getDate() + 1);
    return isSameDay(d1, tmp);
  };

  const isDayAfterTomorrow = (d1, d2) => {
    const tmp = new Date(d2);
    tmp.setDate(d2.getDate() + 2);
    return isSameDay(d1, tmp);
  };

  const timeStr = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    ...(short ? {} : { second: "2-digit" }),
  });

  if (isSameDay(date, now)) {
    return `Today ${timeStr}`;
  } else if (isYesterday(date, now)) {
    return `Yesterday ${timeStr}`;
  } else if (isTomorrow(date, now)) {
    return `Tomorrow ${timeStr}`;
  } else if (isDayAfterTomorrow(date, now)) {
    return `After tomorrow ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return `${dateStr} ${timeStr}`;
  }
}


export function clientLogoutBroadcast() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
    }
    // Сообщим хукам/вкладкам: useAuth может подписаться на 'storage'
    window.dispatchEvent(new Event("storage"));
  } catch {}
}




export function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function unixtime(){
    return Math.floor(Date.now() / 1000)
}