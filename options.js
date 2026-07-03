const settingsForm = document.querySelector("#settingsForm");
const webhookUrl = document.querySelector("#webhookUrl");
const dailySyncTime = document.querySelector("#dailySyncTime");
const thresholdCount = document.querySelector("#thresholdCount");
const defaultView = document.querySelector("#defaultView");
const defaultFilter = document.querySelector("#defaultFilter");
const syncCategory = document.querySelector("#syncCategory");
const dailySyncEnabled = document.querySelector("#dailySyncEnabled");
const thresholdAlertEnabled = document.querySelector("#thresholdAlertEnabled");
const testSend = document.querySelector("#testSend");
const manualSync = document.querySelector("#manualSync");
const backHome = document.querySelector("#backHome");
const statusText = document.querySelector("#status");
const showFeedback = document.querySelector("#showFeedback");
const feedbackEmail = document.querySelector("#feedbackEmail");
const clearDoneTodos = document.querySelector("#clearDoneTodos");

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function readFormSettings() {
  return {
    feishu_webhook_url: webhookUrl.value.trim(),
    daily_sync_enabled: dailySyncEnabled.checked,
    daily_sync_time: dailySyncTime.value || "12:00",
    threshold_alert_enabled: thresholdAlertEnabled.checked,
    threshold_count: Math.max(1, Number(thresholdCount.value || 15)),
    dashboard_default_view: defaultView.value,
    dashboard_default_filter: defaultFilter.value,
    feishu_sync_category: syncCategory.value
  };
}

async function loadSettings() {
  const settings = await LaterList.getSettings();
  webhookUrl.value = settings.feishu_webhook_url;
  dailySyncTime.value = settings.daily_sync_time;
  thresholdCount.value = settings.threshold_count;
  defaultView.value = settings.dashboard_default_view;
  defaultFilter.value = settings.dashboard_default_filter;
  syncCategory.value = ["all", "work", "study", "fun"].includes(settings.feishu_sync_category)
    ? settings.feishu_sync_category
    : "all";
  dailySyncEnabled.checked = settings.daily_sync_enabled;
  thresholdAlertEnabled.checked = settings.threshold_alert_enabled;
}

async function saveSettings() {
  const oldSettings = await LaterList.getSettings();
  const nextSettings = { ...oldSettings, ...readFormSettings() };
  await LaterList.setSettings(nextSettings);
  await LaterList.rescheduleDailySyncAlarm();
}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("正在保存...");
  try {
    await saveSettings();
    setStatus("设置已保存。");
  } catch (error) {
    setStatus(error.message, true);
  }
});

testSend.addEventListener("click", async () => {
  const url = webhookUrl.value.trim();
  if (!url) {
    setStatus("请先填写飞书 Webhook URL。", true);
    return;
  }

  setStatus("正在发送测试消息...");
  try {
    await LaterList.sendToFeishu(url, "【稍后细品】测试消息发送成功。");
    setStatus("测试消息已发送。");
  } catch (error) {
    setStatus(error.message, true);
  }
});

manualSync.addEventListener("click", async () => {
  setStatus("正在手动同步...");
  try {
    await saveSettings();
    const result = await LaterList.syncPendingToFeishu(syncCategory.value);
    const categoryText = result.category === "all" ? "全部" : LaterList.getCategoryLabel(result.category);
    setStatus(result.sent ? `手动同步完成，已发送 ${categoryText}未看 ${result.count} 条。` : `${categoryText}分类下没有需要同步的未看链接。`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

clearDoneTodos.addEventListener("click", async () => {
  try {
    const todos = await LaterList.getTodos();
    const doneTodos = todos.filter((todo) => todo.status === "done");
    if (doneTodos.length === 0) {
      setStatus("没有已看完内容需要清空。");
      return;
    }
    if (!window.confirm(`确认永久删除 ${doneTodos.length} 条已看完内容吗？`)) return;
    const doneIds = new Set(doneTodos.map((todo) => todo.id));
    await Promise.all(doneTodos.map((todo) => LaterList.clearReminderAlarm(todo.id)));
    await LaterList.setTodos(todos.filter((todo) => !doneIds.has(todo.id)));
    setStatus(`已清空 ${doneTodos.length} 条已看完内容。`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

backHome.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

showFeedback.addEventListener("click", () => {
  feedbackEmail.hidden = false;
  showFeedback.setAttribute("aria-expanded", "true");
});

loadSettings();
