const offlineCopy = {
  heading:{zh:"暂时无法连接",en:"You’re offline"},
  message:{zh:"已保存的练习记录仍在这台设备上。连接网络后重新打开即可，无需清除数据。",en:"Your saved practice stays on this device. Reconnect, then reopen SocialCoach. There is no need to clear your data."},
  retry:{zh:"重新打开",en:"Try again"},
  language:{zh:"English",en:"中文"},
};
let offlineLang = navigator.language.startsWith("zh") ? "zh" : "en";
try {
  const record = location.pathname === "/3d" ? JSON.parse(localStorage.getItem("socialcoach-dinner-v1") || "null") : JSON.parse(localStorage.getItem("socialcoach.v1") || "null")?.state?.profile;
  if (record?.lang === "zh" || record?.lang === "en") offlineLang = record.lang;
} catch { /* Recovery must also work when device storage is unavailable. */ }
const pick = (value, lang) => value[lang];
function renderOffline() {
  document.documentElement.lang = offlineLang === "zh" ? "zh-CN" : "en";
  for (const id of ["heading", "message", "retry", "language"]) document.getElementById(id).textContent = pick(offlineCopy[id], offlineLang);
}
document.getElementById("retry").addEventListener("click", () => location.reload());
document.getElementById("language").addEventListener("click", () => { offlineLang = offlineLang === "zh" ? "en" : "zh"; renderOffline(); });
renderOffline();
