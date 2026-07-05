const STORAGE_KEY = "fridge-pwa-items-v1";

const categories = ["蔬菜", "水果", "肉蛋", "乳品"];

const quickPicks = [
  { name: "鸡蛋", unit: "个", category: "肉蛋", color: "#f1d48a" },
  { name: "牛奶", unit: "瓶", category: "乳品", color: "#dfeefa" },
  { name: "番茄", unit: "个", category: "蔬菜", color: "#e75c4d" },
  { name: "黄瓜", unit: "根", category: "蔬菜", color: "#63a85c" },
  { name: "青菜", unit: "把", category: "蔬菜", color: "#3f984d" },
  { name: "牛肉", unit: "份", category: "肉蛋", color: "#b74b43" },
  { name: "鸡胸肉", unit: "份", category: "肉蛋", color: "#efb99b" },
  { name: "豆腐", unit: "盒", category: "乳品", color: "#f3ecd5" },
  { name: "苹果", unit: "个", category: "水果", color: "#d94a3f" }
];

const state = {
  items: [],
  selectedCategory: "蔬菜"
};

const els = {
  form: document.querySelector("#itemForm"),
  name: document.querySelector("#nameInput"),
  quantity: document.querySelector("#quantityInput"),
  unit: document.querySelector("#unitInput"),
  categoryGrid: document.querySelector("#categoryGrid"),
  itemList: document.querySelector("#itemList"),
  emptyState: document.querySelector("#emptyState"),
  totalCount: document.querySelector("#totalCount"),
  clearButton: document.querySelector("#clearButton"),
  backupButton: document.querySelector("#backupButton"),
  backupDialog: document.querySelector("#backupDialog"),
  backupText: document.querySelector("#backupText"),
  copyBackupButton: document.querySelector("#copyBackupButton"),
  foodPicker: document.querySelector("#foodPicker"),
  closePickerButton: document.querySelector("#closePickerButton"),
  customFoodInput: document.querySelector("#customFoodInput"),
  useCustomFoodButton: document.querySelector("#useCustomFoodButton"),
  pickerGrid: document.querySelector("#pickerGrid")
};

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.items = raw ? JSON.parse(raw).map(normalizeItem) : seedItems();
  } catch {
    state.items = seedItems();
  }
  saveItems();
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function seedItems() {
  const now = Date.now();
  return [
    makeItem("鸡蛋", 6, "个", "肉蛋", "#f1d48a", now - 9 * 86400000),
    makeItem("牛奶", 1, "瓶", "乳品", "#dfeefa", now - 3 * 86400000),
    makeItem("番茄", 4, "个", "蔬菜", "#e75c4d", now - 5 * 86400000)
  ];
}

function makeItem(name, quantity, unit, category, color, addedAt = Date.now()) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name,
    quantity,
    unit,
    category,
    color: color || categoryColor(category),
    addedAt
  };
}

function normalizeItem(item) {
  const category = item.category || "蔬菜";
  const addedAt = Number(item.addedAt || item.createdAt || Date.now());
  return {
    ...item,
    id: item.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    quantity: Number(item.quantity) || 0,
    unit: item.unit || "份",
    category,
    color: item.color || categoryColor(category),
    addedAt
  };
}

function categoryColor(category) {
  return {
    "蔬菜": "#63a85c",
    "水果": "#e98055",
    "肉蛋": "#d16d66",
    "乳品": "#80aede"
  }[category] || "#7aa875";
}

function getStoredDays(item) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const added = new Date(Number(item.addedAt) || Date.now());
  added.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - added) / 86400000));
}

function renderCategories() {
  els.categoryGrid.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-button${category === state.selectedCategory ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.selectedCategory = category;
      renderCategories();
    });
    els.categoryGrid.append(button);
  });
}

function renderPicker() {
  els.pickerGrid.innerHTML = "";
  quickPicks.forEach((food) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.innerHTML = `<span class="food-dot" style="background:${food.color}"></span><span>${food.name}</span>`;
    button.addEventListener("click", () => {
      chooseFood(food);
    });
    els.pickerGrid.append(button);
  });
}

function renderItems() {
  els.itemList.innerHTML = "";
  state.items
    .slice()
    .sort((a, b) => Number(a.addedAt) - Number(b.addedAt))
    .forEach((item) => {
      const days = getStoredDays(item);
      const card = document.createElement("article");
      card.className = "item-card";
      card.innerHTML = `
        <span class="food-dot" style="background:${item.color}"></span>
        <div class="item-main">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-meta">
            <span>${escapeHtml(String(item.quantity))}${escapeHtml(item.unit)}</span>
            <span>${escapeHtml(item.category)}</span>
            <span class="status-pill">${escapeHtml(`已放入 ${days} 天`)}</span>
          </div>
        </div>
        <button class="delete-button" type="button" aria-label="删除${escapeHtml(item.name)}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
          </svg>
        </button>
      `;
      card.querySelector(".delete-button").addEventListener("click", () => deleteItem(item.id));
      els.itemList.append(card);
    });

  els.emptyState.classList.toggle("visible", state.items.length === 0);
  updateSummary();
}

function updateSummary() {
  els.totalCount.textContent = state.items.length;
}

function deleteItem(id) {
  state.items = state.items.filter((item) => item.id !== id);
  saveItems();
  renderItems();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openPicker() {
  els.foodPicker.hidden = false;
  document.body.classList.add("picker-open");
  els.customFoodInput.value = "";
  els.customFoodInput.focus();
}

function closePicker() {
  els.foodPicker.hidden = true;
  document.body.classList.remove("picker-open");
}

function chooseFood(food) {
  els.name.value = food.name;
  els.unit.value = food.unit;
  state.selectedCategory = food.category;
  renderCategories();
  closePicker();
  els.quantity.focus();
}

function useCustomFood() {
  const name = els.customFoodInput.value.trim();
  if (!name) return;

  const matched = quickPicks.find((food) => food.name === name);
  chooseFood({
    name,
    unit: matched?.unit || els.unit.value,
    category: matched?.category || state.selectedCategory,
    color: matched?.color || categoryColor(state.selectedCategory)
  });
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.name.value.trim();
  const quantity = Number(els.quantity.value);

  if (!name || Number.isNaN(quantity)) return;

  const matched = quickPicks.find((food) => food.name === name);
  state.items.push(
    makeItem(
      name,
      quantity,
      els.unit.value,
      state.selectedCategory,
      matched?.color || categoryColor(state.selectedCategory)
    )
  );

  saveItems();
  renderItems();
  els.form.reset();
  els.quantity.value = "1";
  state.selectedCategory = "蔬菜";
  renderCategories();
  els.name.blur();
});

els.clearButton.addEventListener("click", () => {
  if (!state.items.length) return;
  if (confirm("清空当前冰箱库存？")) {
    state.items = [];
    saveItems();
    renderItems();
  }
});

els.backupButton.addEventListener("click", () => {
  els.backupText.value = JSON.stringify(state.items, null, 2);
  els.backupDialog.showModal();
});

els.copyBackupButton.addEventListener("click", async () => {
  els.backupText.select();
  try {
    await navigator.clipboard.writeText(els.backupText.value);
    els.copyBackupButton.textContent = "已复制";
    setTimeout(() => window.location.reload(), 650);
  } catch {
    document.execCommand("copy");
  }
});

els.name.addEventListener("click", openPicker);
els.name.addEventListener("focus", openPicker);
els.closePickerButton.addEventListener("click", closePicker);
els.useCustomFoodButton.addEventListener("click", useCustomFood);
els.customFoodInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    useCustomFood();
  }
});
els.foodPicker.addEventListener("click", (event) => {
  if (event.target === els.foodPicker) closePicker();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.foodPicker.hidden) closePicker();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

loadItems();
renderCategories();
renderPicker();
renderItems();
