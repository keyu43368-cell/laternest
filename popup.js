const pageDomain = document.querySelector("#pageDomain");
const pageTitle = document.querySelector("#pageTitle");
const pageCard = document.querySelector("#pageCard");
const savedBadge = document.querySelector("#savedBadge");
const noteInput = document.querySelector("#noteInput");
const categoryInput = document.querySelector("#categoryInput");
const reminderPreset = document.querySelector("#reminderPreset");
const saveForm = document.querySelector("#saveForm");
const statusText = document.querySelector("#status");
const recentList = document.querySelector("#recentList");
const recentCount = document.querySelector("#recentCount");
const emptyState = document.querySelector("#emptyState");
const quickSaveButton = document.querySelector("#quickSave");
const openDashboardButton = document.querySelector("#openDashboard");
const openOptionsButton = document.querySelector("#openOptions");
const openOptionsFooterButton = document.querySelector("[data-open-options]");

let currentTab = null;
let isSaving = false;

function comparableUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function setSaveDisabled(disabled) {
  saveForm.querySelector("button[type='submit']").disabled = disabled;
  quickSaveButton.disabled = disabled;
}

function renderRecent(todos) {
  const recent = todos.filter((todo) => todo.status === "pending").slice(0, 5);
  recentCount.textContent = String(recent.length);
  recentList.innerHTML = "";
  emptyState.hidden = recent.length > 0;

  if (recent.length === 0) {
    recentList.innerHTML = '<p class="empty">还没有待细品链接。</p>';
    return;
  }

  recent.forEach((todo) => {
    const item = document.createElement("article");
    item.className = "recent-item";
    const link = document.createElement("a");
    link.href = todo.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = todo.title;
    const domain = document.createElement("small");
    domain.textContent = `${LaterList.getCategoryLabel(todo.category)} · ${todo.domain}`;
    item.append(link, domain);
    recentList.append(item);
  });
}

async function refreshRecent() {
  const todos = await LaterList.getTodos();
  renderRecent(todos);
  refreshSavedState(todos);
}

function refreshSavedState(todos) {
  if (!currentTab?.url) return;
  const currentUrl = comparableUrl(currentTab.url);
  const savedTodo = todos.find((todo) => comparableUrl(todo.url) === currentUrl);
  pageCard.classList.toggle("saved", Boolean(savedTodo));
  savedBadge.hidden = !savedTodo;
  if (savedTodo) {
    if (savedTodo.status === "done") savedBadge.textContent = "当前页面已保存 · 已看";
    else if (savedTodo.status === "deleted") savedBadge.textContent = "当前页面已保存 · 已删";
    else savedBadge.textContent = "当前页面已保存";
  }
}

async function initCurrentTab() {
  try {
    currentTab = await LaterList.getCurrentTab();
    pageDomain.textContent = LaterList.getDomain(currentTab.url);
    pageTitle.textContent = currentTab.title || currentTab.url;
    setSaveDisabled(false);
    refreshSavedState(await LaterList.getTodos());
  } catch (error) {
    pageDomain.textContent = "无法保存当前页面";
    pageTitle.textContent = error.message;
    setSaveDisabled(true);
    setStatus(error.message, true);
  }
}

async function saveCurrentPage() {
  if (isSaving) return;
  isSaving = true;
  setSaveDisabled(true);
  setStatus("正在保存...");

  try {
    if (!currentTab) currentTab = await LaterList.getCurrentTab();
    const remindAt = LaterList.presetReminderToIso(reminderPreset.value);
    const todo = LaterList.createTodoFromCurrentTab(currentTab, noteInput.value, remindAt, categoryInput.value);
    const todos = await LaterList.getTodos();
    await LaterList.setTodos([todo, ...todos]);
    await LaterList.createReminderAlarm(todo);
    await LaterList.checkThresholdAlertAfterSave();

    noteInput.value = "";
    categoryInput.value = "study";
    reminderPreset.value = "today";
    setStatus("已保存到稍后细品");
    await refreshRecent();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    isSaving = false;
    setSaveDisabled(!currentTab);
  }
}

saveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCurrentPage();
});

quickSaveButton.addEventListener("click", async (event) => {
  event.preventDefault();
  await saveCurrentPage();
});
openDashboardButton.addEventListener("click", () => LaterList.openDashboard());
openOptionsButton.addEventListener("click", () => LaterList.openOptions());
openOptionsFooterButton?.addEventListener("click", () => LaterList.openOptions());

initCurrentTab();
refreshRecent();
