const STORAGE_KEY = "sf6-combo-vault";

const characterNameMap = {
  "A.K.I.": "A.K.I.",
  Alex: "アレックス",
  Akuma: "豪鬼",
  Blanka: "ブランカ",
  Cammy: "キャミィ",
  "Chun-Li": "春麗",
  Custom: "カスタム",
  "Dee Jay": "ディージェイ",
  Dhalsim: "ダルシム",
  "E. Honda": "エドモンド本田",
  Ed: "エド",
  Elena: "エレナ",
  Guile: "ガイル",
  Ingrid: "イングリッド",
  Jamie: "ジェイミー",
  JP: "JP",
  Juri: "ジュリ",
  Ken: "ケン",
  Kimberly: "キンバリー",
  Lily: "リリー",
  Luke: "ルーク",
  Mai: "不知火舞",
  Manon: "マノン",
  Marisa: "マリーザ",
  "M. Bison": "ベガ",
  Rashid: "ラシード",
  Ryu: "リュウ",
  Terry: "テリー",
  Zangief: "ザンギエフ"
};

const characters = [
  "A.K.I.", "JP", "アレックス", "イングリッド", "エド", "エドモンド本田",
  "エレナ", "ガイル", "カスタム", "キャミィ", "キンバリー", "ケン",
  "豪鬼", "ザンギエフ", "ジェイミー", "ジュリ", "春麗", "ダルシム",
  "ディージェイ", "テリー", "不知火舞", "ブランカ", "ベガ", "マノン",
  "マリーザ", "ラシード", "リュウ", "リリー", "ルーク"
].sort((a, b) => a.localeCompare(b, "ja"));

const commandGroups = {
  motion: {
    label: "方向",
    commands: ["5", "2", "3", "6", "4", "8", "236", "214", "623", "421", "22", "66", "44", "j."]
  },
  attack: {
    label: "攻撃",
    commands: ["LP", "MP", "HP", "LK", "MK", "HK", "P", "K", "投げ", "OD"]
  },
  system: {
    label: "システム",
    commands: ["DR", "Dラッシュ", "DI", "PC", "CH", "SA1", "SA2", "SA3", "CA", "→", "+", "微歩き"]
  }
};

const directionCommands = new Set(commandGroups.motion.commands);
const attackCommands = new Set(commandGroups.attack.commands.filter((command) => command !== "OD"));

const state = {
  combos: [],
  recipe: [],
  activeCommandGroup: "motion",
  favoriteDraft: false,
  filters: {
    search: "",
    character: "all",
    favoriteOnly: false,
    tag: ""
  }
};

const $ = (selector) => document.querySelector(selector);

const els = {
  createPage: $("#createPage"),
  libraryPage: $("#libraryPage"),
  createPageLink: $("#createPageLink"),
  libraryPageLink: $("#libraryPageLink"),
  form: $("#comboForm"),
  editingId: $("#editingId"),
  characterInput: $("#characterInput"),
  titleInput: $("#titleInput"),
  tagsInput: $("#tagsInput"),
  notesInput: $("#notesInput"),
  favoriteInput: $("#favoriteInput"),
  recipePreview: $("#recipePreview"),
  commandTabs: $("#commandTabs"),
  commandButtons: $("#commandButtons"),
  undoStepButton: $("#undoStepButton"),
  clearRecipeButton: $("#clearRecipeButton"),
  cancelEditButton: $("#cancelEditButton"),
  newComboButton: $("#newComboButton"),
  importSharedButton: $("#importSharedButton"),
  searchInput: $("#searchInput"),
  characterFilter: $("#characterFilter"),
  favoriteFilter: $("#favoriteFilter"),
  tagFilter: $("#tagFilter"),
  comboList: $("#comboList"),
  comboCount: $("#comboCount"),
  toast: $("#toast"),
  template: $("#comboCardTemplate")
};

function init() {
  state.combos = loadCombos();
  hydrateSharedCombo(false);
  renderCharacterOptions();
  renderCommandTabs();
  renderCommandButtons();
  renderRecipe();
  renderFilters();
  renderList();
  bindEvents();
  showCurrentPage();
}

function bindEvents() {
  window.addEventListener("hashchange", showCurrentPage);
  window.addEventListener("popstate", showCurrentPage);
  els.createPageLink.addEventListener("click", (event) => {
    event.preventDefault();
    goToPage("create");
  });
  els.libraryPageLink.addEventListener("click", (event) => {
    event.preventDefault();
    goToPage("library");
  });
  els.form.addEventListener("submit", saveCombo);
  els.favoriteInput.addEventListener("click", () => {
    state.favoriteDraft = !state.favoriteDraft;
    renderFavoriteDraft();
  });
  els.undoStepButton.addEventListener("click", () => {
    state.recipe.pop();
    renderRecipe();
  });
  els.clearRecipeButton.addEventListener("click", () => {
    state.recipe = [];
    renderRecipe();
  });
  els.cancelEditButton.addEventListener("click", resetForm);
  els.newComboButton.addEventListener("click", resetForm);
  els.importSharedButton.addEventListener("click", () => hydrateSharedCombo(true));
  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderList();
  });
  els.characterFilter.addEventListener("change", (event) => {
    state.filters.character = event.target.value;
    renderList();
  });
  els.favoriteFilter.addEventListener("click", () => {
    state.filters.favoriteOnly = !state.filters.favoriteOnly;
    els.favoriteFilter.setAttribute("aria-pressed", String(state.filters.favoriteOnly));
    renderList();
  });
}

function showCurrentPage() {
  const page = location.hash === "#library" ? "library" : "create";
  renderPage(page);
}

function renderPage(page) {
  const isLibrary = page === "library";

  els.createPage.hidden = isLibrary;
  els.libraryPage.hidden = !isLibrary;
  els.createPageLink.classList.toggle("active", !isLibrary);
  els.libraryPageLink.classList.toggle("active", isLibrary);
  setCurrentPageLink(els.createPageLink, !isLibrary);
  setCurrentPageLink(els.libraryPageLink, isLibrary);
  document.title = isLibrary ? "保存済みコンボ | SF6 Combo Vault" : "コンボ作成 | SF6 Combo Vault";

  if (isLibrary) {
    renderFilters();
    renderList();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToPage(page) {
  const hash = page === "library" ? "#library" : "#create";
  renderPage(page);
  if (location.hash !== hash) {
    history.pushState(null, "", hash);
  }
}

function setCurrentPageLink(link, isCurrent) {
  if (isCurrent) {
    link.setAttribute("aria-current", "page");
  } else {
    link.removeAttribute("aria-current");
  }
}

function loadCombos() {
  try {
    const combos = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(combos) ? combos.map(normalizeCombo) : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.combos));
}

function renderCharacterOptions() {
  const options = characters.map((character) => `<option value="${escapeHtml(character)}">${escapeHtml(character)}</option>`).join("");
  els.characterInput.innerHTML = options;
  els.characterFilter.innerHTML = `<option value="all">全キャラ</option>${options}`;
}

function renderCommandTabs() {
  els.commandTabs.innerHTML = Object.entries(commandGroups)
    .map(([key, group]) => `
      <button class="tab-button" type="button" data-group="${key}" aria-selected="${key === state.activeCommandGroup}">
        ${group.label}
      </button>
    `)
    .join("");

  els.commandTabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCommandGroup = button.dataset.group;
      renderCommandTabs();
      renderCommandButtons();
    });
  });
}

function renderCommandButtons() {
  const group = commandGroups[state.activeCommandGroup];
  els.commandButtons.innerHTML = group.commands
    .map((command) => `<button class="command-button" type="button" data-command="${escapeHtml(command)}">${escapeHtml(command)}</button>`)
    .join("");

  els.commandButtons.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.recipe.push({ value: button.dataset.command, type: state.activeCommandGroup });
      renderRecipe();
    });
  });
}

function renderRecipe() {
  if (!state.recipe.length) {
    els.recipePreview.className = "recipe-preview empty";
    els.recipePreview.textContent = "コマンドを選択";
    return;
  }

  els.recipePreview.className = "recipe-preview";
  els.recipePreview.innerHTML = groupRecipeForDisplay(state.recipe).map(renderToken).join("");
}

function renderFavoriteDraft() {
  els.favoriteInput.classList.toggle("active", state.favoriteDraft);
  els.favoriteInput.querySelector("span").textContent = state.favoriteDraft ? "★" : "☆";
}

function renderFilters() {
  const tags = [...new Set(state.combos.flatMap((combo) => combo.tags || []))].sort((a, b) => a.localeCompare(b, "ja"));
  els.tagFilter.innerHTML = tags
    .map((tag) => `<button class="tag-chip" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
    .join("");

  els.tagFilter.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.tag = state.filters.tag === button.dataset.tag ? "" : button.dataset.tag;
      renderFilters();
      renderList();
    });
    button.classList.toggle("active", state.filters.tag === button.dataset.tag);
  });
}

function renderList() {
  const combos = filteredCombos();
  els.comboCount.textContent = String(combos.length);

  if (!combos.length) {
    els.comboList.innerHTML = `<div class="empty-state">条件に合うコンボがありません</div>`;
    return;
  }

  els.comboList.innerHTML = "";
  combos.forEach((combo) => {
    const card = els.template.content.firstElementChild.cloneNode(true);
    card.querySelector(".character").textContent = combo.character;
    card.querySelector("h3").textContent = combo.title;
    card.querySelector(".favorite-card").textContent = combo.favorite ? "★" : "☆";
    card.querySelector(".favorite-card").classList.toggle("active", combo.favorite);
    card.querySelector(".card-recipe").innerHTML = groupRecipeForDisplay(combo.recipe).map(renderToken).join("");
    card.querySelector(".card-tags").innerHTML = combo.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");

    const notes = card.querySelector(".card-notes");
    notes.textContent = combo.notes;
    notes.hidden = !combo.notes;

    card.querySelector(".favorite-card").addEventListener("click", () => toggleFavorite(combo.id));
    card.querySelector(".edit-card").addEventListener("click", () => editCombo(combo.id));
    card.querySelector(".share-card").addEventListener("click", () => shareCombo(combo.id));
    card.querySelector(".delete-card").addEventListener("click", () => deleteCombo(combo.id));
    els.comboList.append(card);
  });
}

function filteredCombos() {
  return state.combos
    .filter((combo) => state.filters.character === "all" || combo.character === state.filters.character)
    .filter((combo) => !state.filters.favoriteOnly || combo.favorite)
    .filter((combo) => !state.filters.tag || combo.tags.includes(state.filters.tag))
    .filter((combo) => {
      if (!state.filters.search) return true;
      const haystack = [
        combo.character,
        combo.title,
        combo.notes,
        combo.tags.join(" "),
        combo.recipe.map((step) => step.value).join(" ")
      ].join(" ").toLowerCase();
      return haystack.includes(state.filters.search);
    })
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
}

function saveCombo(event) {
  event.preventDefault();

  if (!state.recipe.length) {
    showToast("コマンドを1つ以上選択してください");
    return;
  }

  const editingId = els.editingId.value;
  const now = Date.now();
  const combo = {
    id: editingId || crypto.randomUUID(),
    character: els.characterInput.value,
    title: els.titleInput.value.trim(),
    tags: parseTags(els.tagsInput.value),
    notes: els.notesInput.value.trim(),
    recipe: state.recipe.map((step) => ({ ...step })),
    favorite: state.favoriteDraft,
    createdAt: editingId ? state.combos.find((item) => item.id === editingId)?.createdAt || now : now,
    updatedAt: now
  };

  state.combos = editingId
    ? state.combos.map((item) => (item.id === editingId ? combo : item))
    : [combo, ...state.combos];

  persist();
  resetForm();
  renderFilters();
  renderList();
  showToast("コンボを保存しました");
  goToPage("library");
}

function editCombo(id) {
  const combo = state.combos.find((item) => item.id === id);
  if (!combo) return;

  els.editingId.value = combo.id;
  els.characterInput.value = combo.character;
  els.titleInput.value = combo.title;
  els.tagsInput.value = combo.tags.join(", ");
  els.notesInput.value = combo.notes;
  state.recipe = combo.recipe.map((step) => ({ ...step }));
  state.favoriteDraft = combo.favorite;
  renderRecipe();
  renderFavoriteDraft();
  goToPage("create");
}

function resetForm() {
  els.form.reset();
  els.editingId.value = "";
  state.recipe = [];
  state.favoriteDraft = false;
  renderRecipe();
  renderFavoriteDraft();
}

function toggleFavorite(id) {
  state.combos = state.combos.map((combo) => (
    combo.id === id ? { ...combo, favorite: !combo.favorite, updatedAt: Date.now() } : combo
  ));
  persist();
  renderList();
}

function deleteCombo(id) {
  const combo = state.combos.find((item) => item.id === id);
  if (!combo || !confirm(`「${combo.title}」を削除しますか？`)) return;
  state.combos = state.combos.filter((item) => item.id !== id);
  persist();
  renderFilters();
  renderList();
  showToast("削除しました");
}

async function shareCombo(id) {
  const combo = state.combos.find((item) => item.id === id);
  if (!combo) return;

  const payload = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(combo)))));
  const shareUrl = new URL(location.href);
  shareUrl.searchParams.set("combo", payload);
  shareUrl.hash = "create";

  try {
    await navigator.clipboard.writeText(shareUrl.toString());
    showToast("共有URLをコピーしました");
  } catch {
    prompt("共有URL", shareUrl.toString());
  }
}

function hydrateSharedCombo(notifyWhenMissing = true) {
  const params = new URLSearchParams(location.search);
  const shared = params.get("combo");
  if (!shared) {
    if (notifyWhenMissing) showToast("共有URLのデータがありません");
    return;
  }

  try {
    const combo = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(shared)))));
    if (!isComboLike(combo)) throw new Error("Invalid combo payload");

    const normalizedCombo = normalizeCombo(combo);
    normalizedCombo.id = crypto.randomUUID();
    normalizedCombo.createdAt = Date.now();
    normalizedCombo.updatedAt = Date.now();
    state.combos = [normalizedCombo, ...state.combos];
    persist();

    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete("combo");
    history.replaceState(null, "", cleanUrl.toString());
    renderFilters();
    renderList();
    showToast("共有コンボを取り込みました");
    goToPage("library");
  } catch {
    showToast("共有データを読み込めませんでした");
  }
}

function normalizeCombo(combo) {
  return {
    ...combo,
    character: normalizeCharacterName(combo.character),
    tags: Array.isArray(combo.tags) ? combo.tags : [],
    notes: typeof combo.notes === "string" ? combo.notes : "",
    recipe: Array.isArray(combo.recipe) ? combo.recipe : [],
    favorite: Boolean(combo.favorite),
    createdAt: Number(combo.createdAt) || Date.now(),
    updatedAt: Number(combo.updatedAt) || Date.now()
  };
}

function normalizeCharacterName(character) {
  return characterNameMap[character] || character;
}

function isComboLike(combo) {
  return combo
    && typeof combo.character === "string"
    && typeof combo.title === "string"
    && Array.isArray(combo.tags)
    && Array.isArray(combo.recipe)
    && combo.recipe.every((step) => typeof step.value === "string" && typeof step.type === "string");
}

function parseTags(value) {
  return [...new Set(value.split(/[,\s、]+/).map((tag) => tag.trim()).filter(Boolean))];
}

function groupRecipeForDisplay(recipe) {
  const grouped = [];

  for (let index = 0; index < recipe.length; index += 1) {
    const current = recipe[index];
    const next = recipe[index + 1];

    if (canMergeAsMove(current, next)) {
      grouped.push({
        value: `${current.value}${next.value}`,
        type: "move"
      });
      index += 1;
    } else {
      grouped.push(current);
    }
  }

  return grouped;
}

function canMergeAsMove(current, next) {
  return current
    && next
    && current.type === "motion"
    && next.type === "attack"
    && directionCommands.has(current.value)
    && attackCommands.has(next.value);
}

function renderToken(step) {
  const type = ["motion", "attack", "system", "move"].includes(step.type) ? step.type : "system";
  return `<span class="token ${type}">${escapeHtml(step.value)}</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

init();
