const STORAGE_KEY = "sf6-combo-vault";
const CHARACTER_NOTES_STORAGE_KEY = "sf6-character-notes";
const SELECTED_CHARACTER_STORAGE_KEY = "sf6-selected-character";

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
    meta: "MOVE",
    commands: ["5", "2", "3", "6", "4", "8", "236", "214", "623", "421", "22", "66", "44", "j."]
  },
  attack: {
    label: "攻撃",
    meta: "HIT",
    commands: ["LP", "MP", "HP", "LK", "MK", "HK", "P", "K", "投げ", "OD"]
  },
  system: {
    label: "システム",
    meta: "TOOL",
    commands: ["DR", "Dラッシュ", "DI", "PC", "CH", "SA1", "SA2", "SA3", "CA", "→", "+", "微歩き"]
  }
};

const directionCommands = new Set(commandGroups.motion.commands);
const attackCommands = new Set(commandGroups.attack.commands.filter((command) => command !== "OD"));
const odCommand = "OD";
const commandDisplayMap = {
  "1": "↙",
  "2": "↓",
  "3": "↘",
  "4": "←",
  "5": "N",
  "6": "→",
  "7": "↖",
  "8": "↑",
  "9": "↗",
  "22": "↓↓",
  "44": "←←",
  "66": "→→",
  "214": "↓↙←",
  "236": "↓↘→",
  "421": "←↓↙",
  "623": "→↓↘",
  "j.": "J"
};

const attackDisplayMap = {
  LP: "弱P",
  MP: "中P",
  HP: "強P",
  LK: "弱K",
  MK: "中K",
  HK: "強K"
};

const state = {
  combos: [],
  characterNotes: {},
  selectedCharacter: "",
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
  charactersPage: $("#characters"),
  createPage: $("#create"),
  libraryPage: $("#library"),
  notesPage: $("#notes"),
  workflowNav: $("#workflowNav"),
  changeCharacterButton: $("#changeCharacterButton"),
  createPageLink: $("#createPageLink"),
  libraryPageLink: $("#libraryPageLink"),
  notesPageLink: $("#notesPageLink"),
  characterGrid: $("#characterGrid"),
  exportVaultButton: $("#exportVaultButton"),
  importVaultButton: $("#importVaultButton"),
  exportJsonButton: $("#exportJsonButton"),
  importJsonButton: $("#importJsonButton"),
  importJsonInput: $("#importJsonInput"),
  form: $("#comboForm"),
  characterNoteForm: $("#characterNoteForm"),
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
  noteCharacterInput: $("#noteCharacterInput"),
  characterNoteInput: $("#characterNoteInput"),
  noteSummary: $("#noteSummary"),
  linkableComboList: $("#linkableComboList"),
  favoriteFilter: $("#favoriteFilter"),
  tagFilter: $("#tagFilter"),
  comboList: $("#comboList"),
  comboCount: $("#comboCount"),
  toast: $("#toast"),
  template: $("#comboCardTemplate")
};

const selectedCharacterLabels = Array.from(document.querySelectorAll(".current-character-label"));

async function init() {
  state.combos = loadCombos();
  state.characterNotes = loadCharacterNotes();
  state.selectedCharacter = loadSelectedCharacter();
  renderCharacterOptions();
  await hydrateSharedData(false);
  renderCharacterGrid();
  applySelectedCharacter(false);
  renderCommandTabs();
  renderCommandButtons();
  renderRecipe();
  renderFilters();
  renderList();
  renderCharacterNote();
  bindEvents();
  document.body.classList.add("app-ready");
  showCurrentPage();
}

function bindEvents() {
  window.addEventListener("hashchange", showCurrentPage);
  window.addEventListener("popstate", showCurrentPage);
  els.changeCharacterButton.addEventListener("click", () => goToPage("characters"));
  els.exportVaultButton.addEventListener("click", exportVaultData);
  els.importVaultButton.addEventListener("click", () => hydrateSharedData(true));
  els.exportJsonButton.addEventListener("click", exportVaultJson);
  els.importJsonButton.addEventListener("click", () => els.importJsonInput.click());
  els.importJsonInput.addEventListener("change", importVaultJson);
  els.createPageLink.addEventListener("click", (event) => {
    event.preventDefault();
    goToPage("create");
  });
  els.libraryPageLink.addEventListener("click", (event) => {
    event.preventDefault();
    goToPage("library");
  });
  els.notesPageLink.addEventListener("click", (event) => {
    event.preventDefault();
    goToPage("notes");
  });
  els.form.addEventListener("submit", saveCombo);
  els.characterNoteForm.addEventListener("submit", saveCharacterNote);
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
  els.importSharedButton.addEventListener("click", () => hydrateSharedData(true));
  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderList();
  });
  els.favoriteFilter.addEventListener("click", () => {
    state.filters.favoriteOnly = !state.filters.favoriteOnly;
    els.favoriteFilter.setAttribute("aria-pressed", String(state.filters.favoriteOnly));
    renderList();
  });
}

function showCurrentPage() {
  const page = getCurrentPage();
  renderPage(page);
}

function renderPage(page) {
  const isCharacters = page === "characters";
  const isLibrary = page === "library";
  const isNotes = page === "notes";
  document.body.dataset.page = page;

  els.charactersPage.hidden = !isCharacters;
  els.createPage.hidden = isCharacters || isLibrary || isNotes;
  els.libraryPage.hidden = !isLibrary;
  els.notesPage.hidden = !isNotes;
  els.workflowNav.hidden = isCharacters;
  els.changeCharacterButton.hidden = isCharacters;
  els.createPageLink.classList.toggle("active", !isCharacters && !isLibrary && !isNotes);
  els.libraryPageLink.classList.toggle("active", isLibrary);
  els.notesPageLink.classList.toggle("active", isNotes);
  setCurrentPageLink(els.createPageLink, !isCharacters && !isLibrary && !isNotes);
  setCurrentPageLink(els.libraryPageLink, isLibrary);
  setCurrentPageLink(els.notesPageLink, isNotes);
  document.title = isCharacters
    ? "キャラ選択 | SF6 Combo Vault"
    : isLibrary
    ? "保存済みコンボ | SF6 Combo Vault"
    : isNotes
      ? "キャラメモ | SF6 Combo Vault"
      : "コンボ作成 | SF6 Combo Vault";

  if (isCharacters) {
    renderCharacterGrid();
  }
  if (isLibrary) {
    applySelectedCharacter(false);
    renderFilters();
    renderList();
  }
  if (isNotes) {
    applySelectedCharacter(false);
    renderCharacterNote();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToPage(page) {
  const hash = page === "library" ? "#library" : page === "notes" ? "#notes" : page === "characters" ? "#characters" : "#create";
  if (location.hash !== hash) {
    history.pushState(null, "", hash);
  }
  renderPage(page);
}

function getCurrentPage() {
  if (location.hash === "#characters") return "characters";
  if (location.hash === "#library") return "library";
  if (location.hash === "#notes") return "notes";
  return state.selectedCharacter ? "create" : "characters";
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

function loadCharacterNotes() {
  try {
    const notes = JSON.parse(localStorage.getItem(CHARACTER_NOTES_STORAGE_KEY));
    return notes && typeof notes === "object" ? notes : {};
  } catch {
    return {};
  }
}

function persistCharacterNotes() {
  localStorage.setItem(CHARACTER_NOTES_STORAGE_KEY, JSON.stringify(state.characterNotes));
}

function loadSelectedCharacter() {
  const character = localStorage.getItem(SELECTED_CHARACTER_STORAGE_KEY);
  return characters.includes(character) ? character : "";
}

function persistSelectedCharacter() {
  if (state.selectedCharacter) {
    localStorage.setItem(SELECTED_CHARACTER_STORAGE_KEY, state.selectedCharacter);
  } else {
    localStorage.removeItem(SELECTED_CHARACTER_STORAGE_KEY);
  }
}

function renderCharacterOptions() {
  const options = characters.map((character) => `<option value="${escapeHtml(character)}">${escapeHtml(character)}</option>`).join("");
  els.characterInput.innerHTML = options;
  els.characterFilter.innerHTML = `<option value="all">全キャラ</option>${options}`;
  els.noteCharacterInput.innerHTML = options;
}

function renderCharacterGrid() {
  els.characterGrid.innerHTML = characters.map((character) => `
    <button class="character-choice ${character === state.selectedCharacter ? "active" : ""}" type="button" data-character="${escapeHtml(character)}">
      ${escapeHtml(character)}
    </button>
  `).join("");

  els.characterGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectCharacter(button.dataset.character, true));
  });
  renderSelectedCharacterLabels();
}

function selectCharacter(character, navigateToCreate = true) {
  state.selectedCharacter = character;
  persistSelectedCharacter();
  applySelectedCharacter();
  renderCharacterGrid();
  if (navigateToCreate) goToPage("create");
}

function applySelectedCharacter(renderAfterApply = true) {
  const character = state.selectedCharacter || characters[0];

  els.characterInput.value = character;
  els.characterFilter.value = state.selectedCharacter || "all";
  els.noteCharacterInput.value = character;
  state.filters.character = state.selectedCharacter || "all";
  renderSelectedCharacterLabels();

  if (renderAfterApply) {
    renderFilters();
    renderList();
    renderCharacterNote();
  }
}

function renderSelectedCharacterLabels() {
  const label = state.selectedCharacter || "未選択";
  selectedCharacterLabels.forEach((element) => {
    element.textContent = label;
  });
}

function renderCommandTabs() {
  els.commandTabs.innerHTML = Object.entries(commandGroups)
    .map(([key, group]) => `
      <button class="tab-button" type="button" data-group="${key}" aria-selected="${key === state.activeCommandGroup}">
        <span>${group.label}</span>
        <small>${group.meta}</small>
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
    .map((command) => `<button class="command-button command-${state.activeCommandGroup}" type="button" data-command="${escapeHtml(command)}">${renderCommandButtonInput(command, state.activeCommandGroup)}</button>`)
    .join("");

  els.commandButtons.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      addRecipeStep({ value: button.dataset.command, type: state.activeCommandGroup });
      renderRecipe();
    });
  });
}

function addRecipeStep(step) {
  const previous = state.recipe[state.recipe.length - 1];

  if (canMergeAsMove(previous, step)) {
    state.recipe[state.recipe.length - 1] = {
      value: mergeMoveValue(previous, step),
      type: "move"
    };
    return;
  }

  state.recipe.push(step);
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
    card.querySelector(".copy-link-card").addEventListener("click", () => copySavedComboLink(combo.id));
    card.querySelector(".delete-card").addEventListener("click", () => deleteCombo(combo.id));
    if (new URLSearchParams(location.search).get("saved") === combo.id) {
      card.classList.add("highlight-card");
      requestAnimationFrame(() => card.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
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

  if (!state.selectedCharacter) {
    goToPage("characters");
    showToast("キャラを選択してください");
    return;
  }

  if (!state.recipe.length) {
    showToast("コマンドを1つ以上選択してください");
    return;
  }

  const editingId = els.editingId.value;
  const now = Date.now();
  const combo = {
    id: editingId || crypto.randomUUID(),
    character: state.selectedCharacter,
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
  renderCharacterNote();
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
  applySelectedCharacter(false);
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
  unlinkDeletedCombo(id);
  persist();
  persistCharacterNotes();
  renderFilters();
  renderList();
  renderCharacterNote();
  showToast("削除しました");
}

async function shareCombo(id) {
  const combo = state.combos.find((item) => item.id === id);
  if (!combo) return;

  const payload = await encodePayload(combo);
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

async function copySavedComboLink(id) {
  const url = createSavedComboUrl(id);

  try {
    await navigator.clipboard.writeText(url);
    showToast("コンボへのリンクをコピーしました");
  } catch {
    prompt("コンボへのリンク", url);
  }
}

async function exportVaultData() {
  const payload = createVaultPayload();
  const url = new URL(location.href);
  url.searchParams.set("vault", await encodePayload(payload));
  url.searchParams.delete("combo");
  url.searchParams.delete("saved");
  url.hash = "characters";

  try {
    await navigator.clipboard.writeText(url.toString());
    showToast("保存データ共有URLをコピーしました");
  } catch {
    prompt("保存データ共有URL", url.toString());
  }
}

function createVaultPayload() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    combos: state.combos,
    characterNotes: state.characterNotes,
    selectedCharacter: state.selectedCharacter
  };
}

function exportVaultJson() {
  const blob = new Blob([JSON.stringify(createVaultPayload(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  link.href = url;
  link.download = `sf6-combo-vault-${date}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("JSONを書き出しました");
}

async function importVaultJson(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const vault = JSON.parse(await file.text());
    applyVaultPayload(vault);
    showToast("JSONを読み込みました");
    goToPage(state.selectedCharacter ? "library" : "characters");
  } catch {
    showToast("JSONを読み込めませんでした");
  }
}

function renderCharacterNote() {
  const character = state.selectedCharacter || characters[0];
  const note = getCharacterNote(character);
  const characterCombos = state.combos.filter((combo) => combo.character === character);
  const linkedCombos = characterCombos.filter((combo) => note.comboIds.includes(combo.id));

  els.characterNoteInput.value = note.text;
  els.noteSummary.textContent = `保存済み ${characterCombos.length}件 / リンク ${linkedCombos.length}件`;
  renderLinkableCombos(character, note.comboIds);
}

function getCharacterNote(character) {
  return {
    text: state.characterNotes[character]?.text || "",
    comboIds: Array.isArray(state.characterNotes[character]?.comboIds) ? state.characterNotes[character].comboIds : []
  };
}

function saveCharacterNote(event) {
  event.preventDefault();
  const character = state.selectedCharacter;
  if (!character) {
    goToPage("characters");
    showToast("キャラを選択してください");
    return;
  }
  const current = getCharacterNote(character);
  state.characterNotes[character] = {
    text: els.characterNoteInput.value.trim(),
    comboIds: current.comboIds
  };
  persistCharacterNotes();
  renderCharacterNote();
  showToast("キャラメモを保存しました");
}

function renderLinkableCombos(character, linkedComboIds) {
  const combos = state.combos.filter((combo) => combo.character === character);

  if (!combos.length) {
    els.linkableComboList.innerHTML = `<div class="empty-state">このキャラの保存済みコンボがありません</div>`;
    return;
  }

  els.linkableComboList.innerHTML = "";
  combos.forEach((combo) => {
    const comboUrl = createSavedComboUrl(combo.id);
    const label = document.createElement("label");
    label.className = "linkable-combo";
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(combo.id)}" ${linkedComboIds.includes(combo.id) ? "checked" : ""} />
      <span>
        <span class="linkable-title">
          <strong>${escapeHtml(combo.title)}</strong>
          <a href="${escapeHtml(comboUrl)}">開く</a>
        </span>
        <span class="card-recipe">${groupRecipeForDisplay(combo.recipe).map(renderToken).join("")}</span>
      </span>
    `;
    label.querySelector("input").addEventListener("change", () => toggleLinkedCombo(character, combo.id));
    label.querySelector("a").addEventListener("click", (event) => event.stopPropagation());
    els.linkableComboList.append(label);
  });
}

function createSavedComboUrl(id) {
  const url = new URL(location.href);
  url.searchParams.set("saved", id);
  url.hash = "library";
  return url.toString();
}

function toggleLinkedCombo(character, comboId) {
  const note = getCharacterNote(character);
  const comboIds = note.comboIds.includes(comboId)
    ? note.comboIds.filter((id) => id !== comboId)
    : [...note.comboIds, comboId];

  state.characterNotes[character] = {
    text: els.characterNoteInput.value.trim(),
    comboIds
  };
  persistCharacterNotes();
  renderCharacterNote();
}

function unlinkDeletedCombo(comboId) {
  Object.entries(state.characterNotes).forEach(([character, note]) => {
    if (!Array.isArray(note.comboIds)) return;
    state.characterNotes[character] = {
      ...note,
      comboIds: note.comboIds.filter((id) => id !== comboId)
    };
  });
}

async function hydrateSharedData(notifyWhenMissing = true) {
  const params = new URLSearchParams(location.search);
  const vault = params.get("vault");
  if (vault) {
    await hydrateSharedVault(vault);
    return;
  }

  const shared = params.get("combo");
  if (!shared) {
    if (notifyWhenMissing) showToast("共有URLのデータがありません");
    return;
  }

  try {
    const combo = await decodePayload(shared);
    if (!isComboLike(combo)) throw new Error("Invalid combo payload");

    const normalizedCombo = normalizeCombo(combo);
    normalizedCombo.id = crypto.randomUUID();
    normalizedCombo.createdAt = Date.now();
    normalizedCombo.updatedAt = Date.now();
    state.combos = [normalizedCombo, ...state.combos];
    if (characters.includes(normalizedCombo.character)) {
      state.selectedCharacter = normalizedCombo.character;
      persistSelectedCharacter();
    }
    persist();

    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete("combo");
    history.replaceState(null, "", cleanUrl.toString());
    applySelectedCharacter();
    renderFilters();
    renderList();
    showToast("共有コンボを取り込みました");
    goToPage("library");
  } catch {
    showToast("共有データを読み込めませんでした");
  }
}

async function hydrateSharedVault(shared) {
  try {
    const vault = await decodePayload(shared);
    applyVaultPayload(vault);

    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete("vault");
    history.replaceState(null, "", cleanUrl.toString());
    applySelectedCharacter();
    renderCharacterGrid();
    showToast("保存データを取り込みました");
    goToPage(state.selectedCharacter ? "library" : "characters");
  } catch {
    showToast("保存データを読み込めませんでした");
  }
}

function applyVaultPayload(vault) {
  if (!vault || !Array.isArray(vault.combos)) throw new Error("Invalid vault payload");

  state.combos = vault.combos.filter(isComboLike).map(normalizeCombo);
  state.characterNotes = vault.characterNotes && typeof vault.characterNotes === "object" ? vault.characterNotes : {};
  state.selectedCharacter = characters.includes(vault.selectedCharacter) ? vault.selectedCharacter : "";
  persist();
  persistCharacterNotes();
  persistSelectedCharacter();
  applySelectedCharacter();
  renderCharacterGrid();
}

async function encodePayload(payload) {
  const json = JSON.stringify(payload);
  if (!("CompressionStream" in window)) return `b64:${textToBase64Url(json)}`;

  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return `gz:${bytesToBase64Url(bytes)}`;
}

async function decodePayload(payload) {
  const value = decodeURIComponent(payload);
  if (value.startsWith("gz:")) {
    if (!("DecompressionStream" in window)) throw new Error("Compressed payload is not supported");
    const bytes = base64UrlToBytes(value.slice(3));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
  }
  if (value.startsWith("b64:")) {
    return JSON.parse(base64UrlToText(value.slice(4)));
  }

  return JSON.parse(decodeURIComponent(escape(atob(value))));
}

function textToBase64Url(text) {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

function base64UrlToText(value) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
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
      const merged = {
        value: mergeMoveValue(current, next),
        type: "move"
      };
      const afterNext = recipe[index + 2];

      if (canMergeAsMove(merged, afterNext)) {
        grouped.push({
          value: mergeMoveValue(merged, afterNext),
          type: "move"
        });
        index += 2;
        continue;
      }

      grouped.push(merged);
      index += 1;
    } else {
      grouped.push(current);
    }
  }

  return grouped;
}

function canMergeAsMove(current, next) {
  if (!current || !next) return false;

  return (isMotionStep(current) && isAttackStep(next))
    || (isOdStep(current) && isMotionStep(next))
    || (isOdMotionStep(current) && isAttackStep(next));
}

function mergeMoveValue(current, next) {
  return `${current.value}${next.value}`;
}

function isMotionStep(step) {
  return step.type === "motion" && directionCommands.has(step.value);
}

function isAttackStep(step) {
  return step.type === "attack" && attackCommands.has(step.value);
}

function isOdStep(step) {
  return step.type === "attack" && step.value === odCommand;
}

function isOdMotionStep(step) {
  const parsed = parseMoveValue(step.value);
  return step.type === "move"
    && step.value.startsWith(odCommand)
    && parsed.direction
    && !parsed.attack;
}

function renderToken(step) {
  const type = ["motion", "attack", "system", "move"].includes(step.type) ? step.type : "system";
  return `<span class="token ${type}">${renderCommandInput(step.value, type)}</span>`;
}

function renderCommandInput(value, type) {
  if (type === "motion") return renderMotionInput(value);
  if (type === "attack") return renderAttackInput(value);
  if (type === "move") return renderMoveInput(value);
  return `<span class="input-key input-text">${escapeHtml(value)}</span>`;
}

function renderCommandButtonInput(value, type) {
  if (type === "motion") {
    return `<span class="input-key input-dir input-picker">${escapeHtml(formatCommandValue(value))}</span>`;
  }
  if (type === "attack") return renderAttackInput(value);
  return `<span class="input-key input-text input-picker">${escapeHtml(value)}</span>`;
}

function renderMoveInput(value) {
  const parsed = parseMoveValue(value);
  if (!parsed.direction) return `<span class="input-key input-text">${escapeHtml(value)}</span>`;

  const parts = [];
  if (parsed.isOd) parts.push(renderAttackInput(odCommand));
  parts.push(renderMotionInput(parsed.direction));
  if (parsed.attack) parts.push(renderAttackInput(parsed.attack));

  return parts.join('<span class="input-plus">+</span>');
}

function parseMoveValue(value) {
  const isOd = value.startsWith(odCommand);
  const commandValue = isOd ? value.slice(odCommand.length) : value;
  const direction = [...directionCommands]
    .sort((a, b) => b.length - a.length)
    .find((command) => commandValue.startsWith(command));

  if (!direction) {
    return {
      isOd,
      direction: "",
      attack: ""
    };
  }

  return {
    isOd,
    direction,
    attack: commandValue.slice(direction.length)
  };
}

function renderMotionInput(value) {
  return [...formatCommandValue(value)]
    .map((direction) => `<span class="input-key input-dir">${escapeHtml(direction)}</span>`)
    .join("");
}

function renderAttackInput(value) {
  const attackType = getAttackInputType(value);
  const parts = getAttackInputParts(value);
  if (!parts) {
    return `<span class="input-key input-attack input-${attackType}">${escapeHtml(formatAttackValue(value))}</span>`;
  }
  return `<span class="input-key input-attack input-${attackType}"><span class="attack-strength">${escapeHtml(parts.strength)}</span><span class="attack-mark">${escapeHtml(parts.mark)}</span></span>`;
}

function formatCommandValue(value) {
  return commandDisplayMap[value] || value;
}

function formatAttackValue(value) {
  return attackDisplayMap[value] || value;
}

function getAttackInputType(value) {
  if (value.includes("P")) return "punch";
  if (value.includes("K")) return "kick";
  if (value === "投げ") return "throw";
  if (value === "OD") return "drive";
  return "system";
}

function getAttackInputParts(value) {
  const label = formatAttackValue(value);
  const match = label.match(/^(.+)([PK])$/);
  if (!match) return null;
  return {
    strength: match[1],
    mark: match[2]
  };
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
