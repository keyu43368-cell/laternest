importScripts("shared.js");

chrome.runtime.onInstalled.addListener(async () => {
  await LaterList.ensureSettings();
  await LaterList.rescheduleDailySyncAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await LaterList.ensureSettings();
  await LaterList.rescheduleDailySyncAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    if (alarm.name === LaterList.ALARMS.DAILY_FEISHU_SYNC) {
      const settings = await LaterList.getSettings();
      if (!settings.daily_sync_enabled || !settings.feishu_webhook_url) return;
      await LaterList.syncPendingToFeishu(settings.feishu_sync_category || "all");
      return;
    }

    if (alarm.name.startsWith("laterlist:reminder:")) {
      const todoId = alarm.name.replace("laterlist:reminder:", "");
      const todo = (await LaterList.getTodos()).find((item) => item.id === todoId);
      if (!todo || todo.status !== "pending") return;
      await chrome.notifications.create(LaterList.todoNotificationId(todo.id), {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "稍后细品待看提醒",
        message: todo.title,
        contextMessage: todo.domain
      });
    }
  } catch (error) {
    console.error("[LaterList] alarm failed:", error);
  }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId === LaterList.NOTIFICATIONS.THRESHOLD) {
    await LaterList.openDashboard();
    chrome.notifications.clear(notificationId);
    return;
  }

  if (notificationId.startsWith("laterlist:notify:todo:")) {
    const todoId = notificationId.replace("laterlist:notify:todo:", "");
    const todo = (await LaterList.getTodos()).find((item) => item.id === todoId);
    if (todo?.url) {
      await chrome.tabs.create({ url: todo.url });
    }
    chrome.notifications.clear(notificationId);
  }
});
