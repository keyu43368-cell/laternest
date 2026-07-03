const todoList = document.querySelector("#todoList");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const statusText = document.querySelector("#status");
const selectAll = document.querySelector("#selectAll");
const completedTotal = document.querySelector("#completedTotal");
const allPending = document.querySelector("#allPending");
const openOptions = document.querySelector("#openOptions");
const bulkbar = document.querySelector("#bulkbar");
const toggleBulkbar = document.querySelector("#toggleBulkbar");
const bulkDoneButton = document.querySelector("[data-bulk='done']");
const bulkRestoreButton = document.querySelector("[data-bulk='restore']");
const categoryButtons = document.querySelectorAll(".category-button");
const categoryFilterSection = document.querySelector(".category-filter");
const sidebarFilters = document.querySelectorAll(".sidebar-filter");
const sidebarCategories = document.querySelectorAll(".sidebar-category");
const pageTitle = document.querySelector("#pageTitle");
const pendingCount = document.querySelector("#pendingCount");
const favoriteCount = document.querySelector("#favoriteCount");
const totalCount = document.querySelector("#totalCount");
const doneCount = document.querySelector("#doneCount");
const deletedCount = document.querySelector("#deletedCount");
const workCount = document.querySelector("#workCount");
const studyCount = document.querySelector("#studyCount");
const funCount = document.querySelector("#funCount");

let todos = [];
let activeFilter = "pending";
let activeView = "timeline";
let selectedIds = new Set();
let statsReady = false;
let weekOffset = 0;

function updateCategoryControls() {
  categoryButtons.forEach((button) => {
    button.classList.toggle("active", categoryFilter.value === button.dataset.category);
  });
  sidebarCategories.forEach((button) => {
    button.classList.toggle("is-active", categoryFilter.value === button.dataset.category);
  });
  categoryFilterSection?.classList.toggle("has-category", categoryFilter.value !== "all");
}

function isThisWeek(isoString) {
  if (!isoString) return false;
  const date = new Date(isoString);
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function updateBulkbarState() {
  const hasSelection = selectedIds.size > 0;
  const isDeletedView = activeFilter === "deleted";
  bulkbar.classList.toggle("is-visible", hasSelection);
  bulkbar.classList.toggle("collapsed", !hasSelection);
  toggleBulkbar.textContent = hasSelection ? `已选 ${selectedIds.size} 项` : "批量操作";
  bulkDoneButton.hidden = isDeletedView;
  bulkRestoreButton.hidden = !isDeletedView;
}

function applyActiveControls() {
  document.querySelectorAll(".tab[data-filter]").forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === activeFilter);
  });
  document.querySelectorAll(".view-button").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === activeView);
  });
  sidebarFilters.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.filter === activeFilter && categoryFilter.value === "all");
  });
  const titleMap = {
    pending: "收件箱",
    favorite: "精品",
    all: "全部内容",
    done: "已完成",
    deleted: "回收站",
    today: "今日",
    week: "周视图"
  };
  pageTitle.textContent = categoryFilter.value === "all"
    ? titleMap[activeFilter] || "全部内容"
    : LaterList.getCategoryLabel(categoryFilter.value);
}

function normalizeDefaultFilter(filter) {
  return ["pending", "done", "today", "week", "all", "deleted", "favorite"].includes(filter) ? filter : "pending";
}

function normalizeDefaultView(view) {
  return ["timeline", "week"].includes(view) ? view : "timeline";
}

function filteredTodos() {
  const keyword = searchInput.value.trim().toLowerCase();
  return todos.filter((todo) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "today" && LaterList.isToday(todo.created_at)) ||
      (activeFilter === "week" && isThisWeek(todo.created_at)) ||
      (activeFilter === "pending" && todo.status === "pending") ||
      (activeFilter === "done" && todo.status === "done") ||
      (activeFilter === "deleted" && todo.status === "deleted") ||
      (activeFilter === "favorite" && todo.favorite && todo.status !== "deleted");
    const matchesCategory = categoryFilter.value === "all" || todo.category === categoryFilter.value;
    const text = `${todo.title} ${todo.note} ${todo.domain} ${LaterList.getCategoryLabel(todo.category)}`.toLowerCase();
    return matchesFilter && matchesCategory && (!keyword || text.includes(keyword));
  });
}

function refreshStats() {
  const pending = todos.filter((todo) => todo.status === "pending").length;
  const done = todos.filter((todo) => todo.status === "done").length;
  const favorite = todos.filter((todo) => todo.favorite && todo.status !== "deleted").length;
  const activeTodos = todos.filter((todo) => todo.status !== "deleted");
  updateFlipNumber(completedTotal, done);
  updateFlipNumber(allPending, pending);
  pendingCount.textContent = String(pending);
  favoriteCount.textContent = String(favorite);
  totalCount.textContent = String(activeTodos.length);
  workCount.textContent = String(activeTodos.filter((todo) => todo.category === "work").length);
  studyCount.textContent = String(activeTodos.filter((todo) => todo.category === "study").length);
  funCount.textContent = String(activeTodos.filter((todo) => todo.category === "fun").length);
  doneCount.textContent = String(done);
  deletedCount.textContent = String(todos.filter((todo) => todo.status === "deleted").length);
  statsReady = true;
}

function updateFlipNumber(element, nextValue) {
  const currentValue = Number(element.dataset.value || 0);
  const currentEl = element.querySelector(".flip-number-current");
  const nextEl = element.querySelector(".flip-number-next");
  const nextText = String(nextValue);

  if (!statsReady || currentValue === nextValue || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.dataset.value = nextText;
    currentEl.textContent = nextText;
    nextEl.textContent = nextText;
    element.classList.remove("is-flipping");
    return;
  }

  currentEl.textContent = String(currentValue);
  nextEl.textContent = nextText;
  element.classList.remove("is-flipping");
  void element.offsetWidth;
  element.classList.add("is-flipping");

  window.setTimeout(() => {
    element.dataset.value = nextText;
    currentEl.textContent = nextText;
    nextEl.textContent = nextText;
    element.classList.remove("is-flipping");
  }, 440);
}

function render() {
  refreshStats();
  updateBulkbarState();
  const visible = filteredTodos();
  todoList.innerHTML = "";
  todoList.className = `todo-list ${activeView === "week" ? "week-view" : "timeline-view"}`;
  selectAll.checked = visible.length > 0 && visible.every((todo) => selectedIds.has(todo.id));

  if (visible.length === 0 && activeView !== "week") {
    renderEmptyState();
    return;
  }

  if (activeView === "week") {
    renderWeekTimeline(visible);
    return;
  }

  renderTimeline(visible);
}

function renderEmptyState() {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = "当前筛选下暂无链接。";
  todoList.append(empty);
}

function formatDateGroup(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (LaterList.isToday(isoString)) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

function compareCreatedAtAsc(a, b) {
  return new Date(a.created_at) - new Date(b.created_at);
}

function getWeekStart(date = new Date(), offset = 0) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7);
  return start;
}

function formatMonthDay(date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekNumber(date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  return `${days} 天前`;
}

function isFavoriteView() {
  return activeFilter === "favorite";
}

function createWeekLinkCard(todo) {
  const isDone = todo.status === "done";
  const showDoneState = isDone && !isFavoriteView();
  const isSelected = selectedIds.has(todo.id);
  const card = document.createElement("article");
  card.className = `tag-card week-link-card${showDoneState ? ` ${todo.status} is-done` : ""}${isSelected ? " is-selected" : ""}`;
  card.dataset.id = todo.id;
  card.dataset.done = String(isDone);
  card.innerHTML = `
    <label class="tag-check-control">
      <input class="select-todo" type="checkbox" aria-label="选择">
      <span class="tag-check" aria-hidden="true">✓</span>
    </label>
    <div class="tag-content">
      <a class="tag-title week-link-title" target="_blank" rel="noreferrer"></a>
    </div>
    <p class="week-link-note" hidden></p>
    ${showDoneState ? '<button class="restore-action" data-action="restore" type="button">恢复</button>' : ""}
  `;
  card.querySelector(".select-todo").checked = isSelected;
  const link = card.querySelector(".week-link-title");
  link.href = todo.url;
  link.textContent = todo.title;
  const note = card.querySelector(".week-link-note");
  note.textContent = todo.note;
  note.hidden = !todo.note;
  return card;
}

function renderWeekTimeline(visible) {
  const weekdayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const weekStart = getWeekStart(new Date(), weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLimit = new Date(weekEnd);
  weekLimit.setDate(weekEnd.getDate() + 1);
  const today = new Date();
  const groups = weekdayLabels.map(() => []);

  const weekItems = visible.filter((todo) => {
    const date = new Date(todo.created_at);
    return date >= weekStart && date < weekLimit;
  });

  weekItems.forEach((todo) => {
    const date = new Date(todo.created_at);
    const index = (date.getDay() + 6) % 7;
    groups[index].push(todo);
  });

  const shell = document.createElement("section");
  shell.className = "week-planner";
  shell.innerHTML = `
    <header class="week-planner-header">
      <button class="week-nav" data-week-nav="-1" type="button" aria-label="上一周">‹</button>
      <strong>第 ${getWeekNumber(weekStart)} 周 | ${formatMonthDay(weekStart)} - ${formatMonthDay(weekEnd)}</strong>
      <button class="week-nav" data-week-nav="1" type="button" aria-label="下一周">›</button>
      <button class="week-current" data-week-current type="button">回到本周</button>
    </header>
  `;

  const weekGrid = document.createElement("section");
  weekGrid.className = "week-timeline";

  groups.forEach((items, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    const isToday = dayDate.toDateString() === today.toDateString();
    const column = document.createElement("section");
    column.className = `week-column${isToday ? " is-today" : ""}`;
    const heading = document.createElement("h2");
    heading.innerHTML = `<span>${weekdayLabels[index]}</span><small>${formatMonthDay(dayDate)}</small>`;
    const stack = document.createElement("div");
    stack.className = "timeline-stack";

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "column-empty";
      empty.textContent = "暂无链接";
      stack.append(empty);
    } else {
      items.sort(compareCreatedAtAsc).forEach((todo) => stack.append(createWeekLinkCard(todo)));
    }

    column.append(heading, stack);
    weekGrid.append(column);
  });

  shell.append(weekGrid);
  todoList.append(shell);
}

function renderTimeline(visible) {
  todoList.classList.add("date-timeline-view");
  const groups = new Map();
  visible.forEach((todo) => {
    const key = formatDateGroup(todo.created_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(todo);
  });

  groups.forEach((items, label) => {
    const section = document.createElement("section");
    section.className = `timeline-section${label === "今天" ? " is-today" : ""}`;
    const dateRail = document.createElement("div");
    dateRail.className = "timeline-date";
    const dot = document.createElement("span");
    dot.className = "timeline-date-dot";
    dot.setAttribute("aria-hidden", "true");
    const heading = document.createElement("h2");
    heading.className = "timeline-date-text";
    heading.textContent = label;
    dateRail.append(dot, heading);
    const stack = document.createElement("div");
    stack.className = "timeline-stack";
    items.sort(compareCreatedAtAsc).forEach((todo) => stack.append(createTodoCard(todo)));
    section.append(dateRail, stack);
    todoList.append(section);
  });
}

function renderList(visible) {
  visible.sort(compareCreatedAtAsc).forEach((todo) => todoList.append(createTodoCard(todo)));
}

function renderBoard(visible) {
  if (categoryFilter.value !== "all") {
    todoList.className = "todo-list timeline-view category-expanded-view";
    visible.sort(compareCreatedAtAsc).forEach((todo) => todoList.append(createTodoCard(todo)));
    return;
  }

  LaterList.CATEGORIES.forEach((category) => {
    const column = document.createElement("section");
    column.className = `category-column category-${category.value}`;
    const items = visible.filter((todo) => todo.category === category.value);
    column.innerHTML = `
      <div class="column-header">
        <h2>${category.label}</h2>
      </div>
      <div class="column-stack"></div>
    `;
    const stack = column.querySelector(".column-stack");
    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "column-empty";
      empty.textContent = "暂无链接";
      stack.append(empty);
    } else {
      items.forEach((todo) => stack.append(createTodoCard(todo)));
    }
    todoList.append(column);
  });
}

function createTodoCard(todo) {
  const isDone = todo.status === "done";
  const showDoneState = isDone && !isFavoriteView();
  const isSelected = selectedIds.has(todo.id);
  const statusLabel = {
    pending: "未看",
    done: "已看",
    deleted: "已删"
  }[todo.status] || "未看";
  const card = document.createElement("article");
  card.className = `ln-list-row tag-card todo-card${showDoneState ? ` ${todo.status} is-done` : ""}${isSelected ? " is-selected" : ""}`;
  card.dataset.id = todo.id;
  card.dataset.done = String(isDone);
  card.innerHTML = `
      <label class="ln-checkbox tag-check-control">
        <input class="select-todo" type="checkbox" aria-label="选择">
        <span class="tag-check" aria-hidden="true">✓</span>
      </label>
      <div class="ln-title-cell tag-content todo-main">
        <div class="ln-title-text">
          <a class="ln-title tag-title todo-title" target="_blank" rel="noreferrer"></a>
          <span class="ln-subtitle"></span>
        </div>
      </div>
      <span class="ln-pill category-hash category-${todo.category}"></span>
      <span class="ln-source"><span class="ln-domain">${todo.domain || "unknown"}</span></span>
      <span class="ln-time">${formatRelativeTime(todo.created_at)}</span>
      <span class="row-actions">
        ${showDoneState ? '<button class="restore-action" data-action="restore" type="button">恢复</button>' : ""}
        <button class="ln-star-button star-btn${todo.favorite ? " is-active" : ""}" data-action="favorite" type="button" aria-label="加入精品" aria-pressed="${todo.favorite ? "true" : "false"}">${todo.favorite ? "★" : "☆"}</button>
      </span>
    `;

  card.querySelector(".select-todo").checked = isSelected;
  const title = card.querySelector(".todo-title");
  title.href = todo.url;
  title.textContent = todo.title;
  const subtitle = card.querySelector(".ln-subtitle");
  subtitle.textContent = todo.note;
  subtitle.hidden = !todo.note;
  card.querySelector(".category-hash").textContent = LaterList.getCategoryLabel(todo.category);
  return card;
}

async function saveAndRender(nextTodos) {
  todos = nextTodos;
  await LaterList.setTodos(todos);
  render();
}

async function toggleTodo(todoId) {
  const nextTodos = todos.map((todo) => {
    if (todo.id !== todoId) return todo;
    const isDone = todo.status === "pending";
    return {
      ...todo,
      status: isDone ? "done" : "pending",
      completed_at: isDone ? new Date().toISOString() : null,
      deleted_at: null
    };
  });
  const todo = nextTodos.find((item) => item.id === todoId);
  if (todo.status === "done") await LaterList.clearReminderAlarm(todoId);
  if (todo.status === "pending") await LaterList.createReminderAlarm(todo);
  await saveAndRender(nextTodos);
}

async function deleteTodos(ids, permanently = false) {
  for (const id of ids) await LaterList.clearReminderAlarm(id);
  const idSet = new Set(ids);
  selectedIds = new Set([...selectedIds].filter((id) => !idSet.has(id)));
  if (permanently) {
    await saveAndRender(todos.filter((todo) => !idSet.has(todo.id)));
    return;
  }
  await saveAndRender(todos.map((todo) => idSet.has(todo.id)
    ? {
      ...todo,
      status: "deleted",
      completed_at: null,
      deleted_at: new Date().toISOString(),
      remind_at: null,
      postponed_to: null
    }
    : todo));
}

async function restoreTodos(ids) {
  const idSet = new Set(ids);
  await saveAndRender(todos.map((todo) => idSet.has(todo.id)
    ? { ...todo, status: "pending", completed_at: null, deleted_at: null }
    : todo));
}

async function postponeTodos(ids, target) {
  const targetDate = target === "week" ? LaterList.nextSaturdayMorning() : LaterList.nextTomorrowMorning();
  const remindAt = targetDate.toISOString();
  const idSet = new Set(ids);
  const nextTodos = todos.map((todo) => idSet.has(todo.id)
    ? { ...todo, status: "pending", completed_at: null, deleted_at: null, remind_at: remindAt, postponed_to: remindAt }
    : todo);
  for (const id of ids) {
    const todo = nextTodos.find((item) => item.id === id);
    await LaterList.clearReminderAlarm(id);
    await LaterList.createReminderAlarm(todo);
  }
  await saveAndRender(nextTodos);
}

async function bulkComplete(ids) {
  const idSet = new Set(ids);
  for (const id of ids) await LaterList.clearReminderAlarm(id);
  await saveAndRender(todos.map((todo) => idSet.has(todo.id)
    ? { ...todo, status: "done", completed_at: new Date().toISOString(), deleted_at: null }
    : todo));
}

todoList.addEventListener("change", (event) => {
  if (!event.target.classList.contains("select-todo")) return;
  const card = event.target.closest("[data-id]");
  if (card?.classList.contains("preview-card")) return;
  const id = card.dataset.id;
  if (event.target.checked) selectedIds.add(id);
  else selectedIds.delete(id);
  render();
});

todoList.addEventListener("click", async (event) => {
  const favoriteButton = event.target.closest("button[data-action='favorite']");
  if (favoriteButton) {
    const card = favoriteButton.closest("[data-id]");
    if (card?.classList.contains("preview-card")) return;
    await toggleFavorite(card.dataset.id);
    return;
  }

  const button = event.target.closest("button[data-action='restore']");
  if (!button) return;
  const card = button.closest("[data-id]");
  if (card?.classList.contains("preview-card")) return;
  selectedIds.delete(card.dataset.id);
  await toggleTodo(card.dataset.id);
});

async function toggleFavorite(todoId) {
  await saveAndRender(todos.map((todo) => todo.id === todoId ? { ...todo, favorite: !todo.favorite } : todo));
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (!tab.dataset.filter) return;
    activeFilter = tab.dataset.filter;
    categoryFilter.value = "all";
    applyActiveControls();
    updateCategoryControls();
    render();
  });
});

searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", () => {
  updateCategoryControls();
  render();
});

document.querySelectorAll(".view-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    if (activeView === "week") weekOffset = 0;
    applyActiveControls();
    updateCategoryControls();
    render();
  });
});

todoList.addEventListener("click", (event) => {
  const currentWeekButton = event.target.closest("[data-week-current]");
  if (currentWeekButton) {
    weekOffset = 0;
    render();
    return;
  }

  const weekButton = event.target.closest("[data-week-nav]");
  if (!weekButton) return;
  weekOffset += Number(weekButton.dataset.weekNav);
  render();
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryFilter.value = button.dataset.category;
    activeFilter = "all";
    activeView = "timeline";
    applyActiveControls();
    updateCategoryControls();
    render();
  });
});

sidebarFilters.forEach((button) => {
  button.addEventListener("click", () => {
    categoryFilter.value = "all";
    activeFilter = button.dataset.filter;
    applyActiveControls();
    updateCategoryControls();
    render();
  });
});

sidebarCategories.forEach((button) => {
  button.addEventListener("click", () => {
    categoryFilter.value = button.dataset.category;
    activeFilter = "all";
    activeView = "timeline";
    applyActiveControls();
    updateCategoryControls();
    render();
  });
});

toggleBulkbar.addEventListener("click", () => {
  if (selectedIds.size === 0) {
    setStatus("先选择几条链接，矩阵才会打开。", true);
  }
});

document.querySelector("[data-bulk-cancel]")?.addEventListener("click", () => {
  selectedIds.clear();
  selectAll.checked = false;
  render();
  setStatus("已取消选择。");
});

selectAll.addEventListener("change", () => {
  const visible = filteredTodos();
  if (selectAll.checked) visible.forEach((todo) => selectedIds.add(todo.id));
  else visible.forEach((todo) => selectedIds.delete(todo.id));
  render();
});

document.querySelectorAll("[data-bulk]").forEach((button) => {
  button.addEventListener("click", async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      setStatus("请先选择要批量操作的链接。", true);
      return;
    }
    const action = button.dataset.bulk;
    const isDeletedView = activeFilter === "deleted";
    if (action === "delete") {
      const message = isDeletedView
        ? `确认永久删除选中的 ${ids.length} 条链接吗？`
        : `确认删除选中的 ${ids.length} 条链接吗？`;
      if (!window.confirm(message)) return;
    }
    if (action === "done") await bulkComplete(ids);
    if (action === "restore") await restoreTodos(ids);
    if (action === "tomorrow") await postponeTodos(ids, "tomorrow");
    if (action === "week") await postponeTodos(ids, "week");
    if (action === "delete") await deleteTodos(ids, isDeletedView);
    selectedIds.clear();
    render();
    setStatus("批量操作已完成。");
  });
});

openOptions.addEventListener("click", () => LaterList.openOptions());

(async function init() {
  const settings = await LaterList.getSettings();
  activeView = normalizeDefaultView(settings.dashboard_default_view);
  activeFilter = normalizeDefaultFilter(settings.dashboard_default_filter);
  applyActiveControls();
  updateCategoryControls();
  todos = await LaterList.getTodos();
  render();
})();
