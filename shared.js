const LaterList = (() => {
  const STORAGE_KEYS = {
    TODOS: "laterlist_todos",
    SETTINGS: "laterlist_settings"
  };

  const ALARMS = {
    DAILY_FEISHU_SYNC: "laterlist:daily-feishu-sync"
  };

  const NOTIFICATIONS = {
    THRESHOLD: "laterlist:notify:threshold"
  };

  const DEFAULT_SETTINGS = {
    feishu_webhook_url: "",
    daily_sync_enabled: true,
    daily_sync_time: "12:00",
    threshold_alert_enabled: true,
    threshold_count: 15,
    last_threshold_alert_date: null,
    dashboard_default_view: "list",
    dashboard_default_filter: "pending",
    feishu_sync_category: "all"
  };

  const CATEGORIES = [
    { value: "work", label: "工作" },
    { value: "study", label: "学习" },
    { value: "fun", label: "娱乐" }
  ];

  function reminderAlarmName(todoId) {
    return `laterlist:reminder:${todoId}`;
  }

  function todoNotificationId(todoId) {
    return `laterlist:notify:todo:${todoId}`;
  }

  function chromeGet(key, fallback) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] ?? fallback);
      });
    });
  }

  function chromeSet(values) {
    return new Promise((resolve) => {
      chrome.storage.local.set(values, resolve);
    });
  }

  function alarmCreate(name, config) {
    return new Promise((resolve) => chrome.alarms.create(name, config, resolve));
  }

  function alarmClear(name) {
    return new Promise((resolve) => chrome.alarms.clear(name, resolve));
  }

  function notify(id, options) {
    return new Promise((resolve) => chrome.notifications.create(id, options, resolve));
  }

  function createId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeCategory(category) {
    return CATEGORIES.some((item) => item.value === category) ? category : "study";
  }

  function getCategoryLabel(category) {
    return CATEGORIES.find((item) => item.value === normalizeCategory(category))?.label || "学习";
  }

  function normalizeStatus(status) {
    return ["pending", "done", "deleted"].includes(status) ? status : "pending";
  }

  function normalizeTodo(todo) {
    return {
      id: todo.id || createId(),
      title: todo.title || "未命名网页",
      url: todo.url || "",
      domain: todo.domain || getDomain(todo.url || ""),
      note: todo.note || "",
      category: normalizeCategory(todo.category),
      status: normalizeStatus(todo.status),
      favorite: Boolean(todo.favorite),
      remind_at: todo.remind_at || null,
      created_at: todo.created_at || new Date().toISOString(),
      completed_at: todo.completed_at || null,
      deleted_at: todo.deleted_at || null,
      postponed_to: todo.postponed_to || null,
      synced: {
        feishu_at: todo.synced?.feishu_at || null
      }
    };
  }

  async function getTodos() {
    const todos = await chromeGet(STORAGE_KEYS.TODOS, []);
    return (Array.isArray(todos) ? todos : [])
      .map(normalizeTodo)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function setTodos(todos) {
    await chromeSet({ [STORAGE_KEYS.TODOS]: todos.map(normalizeTodo) });
  }

  async function getSettings() {
    const settings = await chromeGet(STORAGE_KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  }

  async function setSettings(settings) {
    const next = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    await chromeSet({ [STORAGE_KEYS.SETTINGS]: next });
    return next;
  }

  async function ensureSettings() {
    return setSettings(await getSettings());
  }

  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error("没有找到当前标签页。");
    if (!/^https?:\/\//i.test(tab.url)) {
      throw new Error("当前页面不是普通网页，Chrome 不允许保存 chrome:// 或扩展页。");
    }
    return tab;
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function createTodoFromCurrentTab(tab, note, remindAt, category = "study") {
    return normalizeTodo({
      id: createId(),
      title: tab.title || getDomain(tab.url) || "未命名网页",
      url: tab.url,
      domain: getDomain(tab.url),
      note: note.trim(),
      category,
      status: "pending",
      remind_at: remindAt,
      created_at: new Date().toISOString(),
      completed_at: null,
      postponed_to: null,
      synced: { feishu_at: null }
    });
  }

  function startOfLocalDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function isToday(isoString) {
    if (!isoString) return false;
    const date = new Date(isoString);
    const today = startOfLocalDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date >= today && date < tomorrow;
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateTime(isoString) {
    if (!isoString) return "未设置";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(isoString));
  }

  function toDateTimeInputValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function getNextDailyTime(timeValue) {
    const [hour = "12", minute = "00"] = String(timeValue || "12:00").split(":");
    const next = new Date();
    next.setHours(Number(hour), Number(minute), 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    return next.getTime();
  }

  function nextTonight() {
    const date = new Date();
    date.setHours(21, 0, 0, 0);
    if (date <= new Date()) date.setDate(date.getDate() + 1);
    return date;
  }

  function nextTomorrowMorning() {
    const date = startOfLocalDay();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    return date;
  }

  function nextSaturdayMorning() {
    const date = startOfLocalDay();
    const day = date.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;
    date.setDate(date.getDate() + daysUntilSaturday);
    date.setHours(10, 0, 0, 0);
    if (date <= new Date()) date.setDate(date.getDate() + 7);
    return date;
  }

  function presetReminderToIso(preset) {
    if (preset === "today") return nextTonight().toISOString();
    if (preset === "tomorrow") return nextTomorrowMorning().toISOString();
    if (preset === "week") return nextSaturdayMorning().toISOString();
    return nextTonight().toISOString();
  }

  async function createReminderAlarm(todo) {
    if (!todo.remind_at || todo.status !== "pending") return;
    const when = new Date(todo.remind_at).getTime();
    if (Number.isFinite(when) && when > Date.now()) {
      await alarmCreate(reminderAlarmName(todo.id), { when });
    }
  }

  async function clearReminderAlarm(todoId) {
    await alarmClear(reminderAlarmName(todoId));
  }

  async function rescheduleDailySyncAlarm() {
    const settings = await getSettings();
    await alarmClear(ALARMS.DAILY_FEISHU_SYNC);
    if (!settings.daily_sync_enabled) return;
    await alarmCreate(ALARMS.DAILY_FEISHU_SYNC, {
      when: getNextDailyTime(settings.daily_sync_time),
      periodInMinutes: 24 * 60
    });
  }

  function getTodayPendingTodos(todos) {
    return todos.filter((todo) => todo.status === "pending" && isToday(todo.created_at));
  }

  function getUnsyncedTodayPendingTodos(todos) {
    return getTodayPendingTodos(todos).filter((todo) => !todo.synced?.feishu_at);
  }

  function buildFeishuMessage(todos, category = "all") {
    const categoryText = category === "all" ? "全部" : getCategoryLabel(category);
    const lines = [
      `【稍后细品｜${categoryText}未看清单】`,
      `未看链接：${todos.length} 条`
    ];

    todos.forEach((todo, index) => {
      lines.push(
        `${index + 1}. ${todo.title}`,
        `分类：${getCategoryLabel(todo.category)}`,
        `来源：${todo.domain}`,
        `备注：${todo.note || "无"}`,
        `链接：${todo.url}`
      );
    });

    lines.push(
      "整理建议：",
      "如果今天未看内容过多，建议保留 3 条今天必看，其余调整到明天或本周。"
    );

    return lines.join("\n");
  }

  async function sendToFeishu(webhookUrl, text) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text }
      })
    });
    const bodyText = await response.text();
    let body = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = null;
    }
    const feishuCode = body?.code ?? body?.StatusCode ?? body?.status_code;
    if (!response.ok || (feishuCode !== undefined && Number(feishuCode) !== 0)) {
      throw new Error(body?.msg || body?.message || `飞书 Webhook 请求失败：${response.status}`);
    }
    return body || { ok: true };
  }

  async function syncTodayToFeishu() {
    const settings = await getSettings();
    if (!settings.feishu_webhook_url) {
      throw new Error("请先在设置页配置飞书 Webhook URL。");
    }
    const todos = await getTodos();
    const targetTodos = getUnsyncedTodayPendingTodos(todos);
    if (targetTodos.length === 0) return { sent: false, count: 0 };

    await sendToFeishu(settings.feishu_webhook_url, buildFeishuMessage(targetTodos));
    const syncedAt = new Date().toISOString();
    const targetIds = new Set(targetTodos.map((todo) => todo.id));
    await setTodos(todos.map((todo) => targetIds.has(todo.id)
      ? normalizeTodo({ ...todo, synced: { feishu_at: syncedAt } })
      : todo));
    return { sent: true, count: targetTodos.length };
  }

  async function syncPendingToFeishu(category = "all") {
    const settings = await getSettings();
    if (!settings.feishu_webhook_url) {
      throw new Error("请先在设置页配置飞书 Webhook URL。");
    }
    const normalizedCategory = category === "all" ? "all" : normalizeCategory(category);
    const todos = await getTodos();
    const targetTodos = todos.filter((todo) => {
      const matchesCategory = normalizedCategory === "all" || todo.category === normalizedCategory;
      return todo.status === "pending" && matchesCategory && !todo.synced?.feishu_at;
    });
    if (targetTodos.length === 0) return { sent: false, count: 0, category: normalizedCategory };

    await sendToFeishu(settings.feishu_webhook_url, buildFeishuMessage(targetTodos, normalizedCategory));
    const syncedAt = new Date().toISOString();
    const targetIds = new Set(targetTodos.map((todo) => todo.id));
    await setTodos(todos.map((todo) => targetIds.has(todo.id)
      ? normalizeTodo({ ...todo, synced: { feishu_at: syncedAt } })
      : todo));
    return { sent: true, count: targetTodos.length, category: normalizedCategory };
  }

  async function checkThresholdAlertAfterSave() {
    const settings = await getSettings();
    if (!settings.threshold_alert_enabled) return;

    const todayKey = localDateKey();
    if (settings.last_threshold_alert_date === todayKey) return;

    const todayPendingCount = getTodayPendingTodos(await getTodos()).length;
    if (todayPendingCount < Number(settings.threshold_count || 15)) return;

    await notify(NOTIFICATIONS.THRESHOLD, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "稍后细品",
      message: `你今天已经收集了 ${todayPendingCount} 条未看内容，是否需要整理？`
    });
    await setSettings({ ...settings, last_threshold_alert_date: todayKey });
  }

  async function openDashboard() {
    await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  }

  async function openOptions() {
    await chrome.runtime.openOptionsPage();
  }

  return {
    STORAGE_KEYS,
    ALARMS,
    NOTIFICATIONS,
    DEFAULT_SETTINGS,
    CATEGORIES,
    reminderAlarmName,
    todoNotificationId,
    getCategoryLabel,
    getTodos,
    setTodos,
    getSettings,
    setSettings,
    ensureSettings,
    getCurrentTab,
    getDomain,
    createTodoFromCurrentTab,
    isToday,
    formatDateTime,
    toDateTimeInputValue,
    getNextDailyTime,
    presetReminderToIso,
    nextTomorrowMorning,
    nextSaturdayMorning,
    createReminderAlarm,
    clearReminderAlarm,
    rescheduleDailySyncAlarm,
    getTodayPendingTodos,
    getUnsyncedTodayPendingTodos,
    buildFeishuMessage,
    sendToFeishu,
    syncTodayToFeishu,
    syncPendingToFeishu,
    checkThresholdAlertAfterSave,
    openDashboard,
    openOptions
  };
})();
