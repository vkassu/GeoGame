// Слой представления: переключение экранов и заполнение их данными.
// Никакой игровой логики и state — только DOM.

import { codeToEmoji, officialName } from "./data.js?v=20260551";
import { t } from "./i18n.js?v=20260551";

export function showScreen(name) {
  const screens = document.querySelectorAll(".screen");
  for (const s of screens) {
    s.classList.toggle("active", s.id === `${name}-screen`);
  }
  // Кнопка «На главную» видна на всех экранах, кроме меню, первого шага настройки,
  // и финальных экранов (Result/Training/Bonus) — там свой поток выхода.
  const home = getHomeButton();
  if (home) home.hidden = (
    name === "start" || name === "menu" ||
    name === "result" || name === "training" || name === "bonus"
  );
}

export function getPlayAgainButton() {
  return document.getElementById("play-again-btn");
}

export function getHomeButton() {
  return document.getElementById("home-btn");
}

export function getHintButton() {
  return document.getElementById("hint-btn");
}

// Подсказка с перезарядкой: 5 сегментов, заполненных по hintCharge (или все 5 если доступна).
// Кнопка активна только когда hintAvailable.
export function updateHintUI(hintCharge, hintAvailable) {
  const btn = getHintButton();
  if (!btn) return;
  btn.style.display = "";
  const segs = btn.querySelectorAll(".hint-seg");
  const filled = hintAvailable ? segs.length : hintCharge;
  segs.forEach((s, i) => s.classList.toggle("filled", i < filled));
  btn.disabled = !hintAvailable;
}

// Прячет 2 случайных неверных варианта из 4 (через visibility, чтобы сетка 2×2 не схлопнулась).
export function applyHintToOptions(buttons, correctValue) {
  const wrong = buttons.filter((b) => b.value !== correctValue);
  // перемешиваем неверные и прячем первые два
  for (let i = wrong.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
  }
  wrong.slice(0, 2).forEach((b) => {
    b.button.style.display = "none";
  });
}

export function renderAnswerResult(isCorrect, pickedValue, correctValue) {
  const banner = document.getElementById("answer-banner");
  banner.className = "answer-banner " + (isCorrect ? "correct" : "wrong");
  banner.textContent = isCorrect ? t("answer.correct") : t("answer.wrong");

  document.getElementById("answer-xp").textContent = isCorrect ? "+10 XP" : "";
  document.getElementById("answer-picked").textContent = isCorrect ? "" : t("answer.your", { v: pickedValue });
  document.getElementById("answer-correct-val").textContent = correctValue;
}
export function showAnswerResult() {
  document.getElementById("options").style.display = "none";
  document.querySelector(".meta").style.display = "none";
  document.querySelector(".progress").style.display = "none";
  document.getElementById("answer-result").style.display = "block";
}
export function hideAnswerResult() {
  document.getElementById("answer-result").style.display = "none";
  document.getElementById("options").style.display = "";
  document.querySelector(".meta").style.display = "";
  document.querySelector(".progress").style.display = "";
}

export function updateTimer(seconds) {
  const el = document.getElementById("q-timer");
  if (!el) return;
  el.textContent = "⏱ " + seconds;
  el.className = "q-timer" + (seconds <= 5 ? " danger" : seconds <= 10 ? " warning" : "");
}

export function renderGamesPlayed(n) {
  document.getElementById("games-played").textContent = String(n);
}

export function renderXpTotal(n) {
  document.getElementById("xp-total").textContent = String(n);
}


// ---- Экран настройки (Регионы / Темы / Количество) ----

export function renderBestXp(n) {
  const a = document.getElementById("best-xp");
  if (a) a.textContent = String(n);
  const b = document.getElementById("result-best-xp");
  if (b) b.textContent = String(n);
}

export function renderAvailableCount(n) {
  const el = document.getElementById("available-count");
  if (el) el.textContent = String(n);
}

export function setNavButtonEnabled(id, enabled) {
  const el = document.getElementById(id);
  if (el) el.disabled = !enabled;
}

// items: [{ key, label }], active: Set ключей, onToggle(key)
export function renderRegionGrid(items, active, onToggle) {
  const grid = document.getElementById("region-grid");
  grid.innerHTML = "";
  for (const { key, label } of items) {
    const cell = document.createElement("div");
    cell.className = "region-cell" + (active.has(key) ? " region-cell-on" : "");
    const dot = document.createElement("span");
    dot.className = "setup-dot";
    const txt = document.createElement("span");
    txt.className = "setup-label";
    txt.textContent = label;
    cell.append(dot, txt);
    cell.addEventListener("click", () => onToggle(key));
    grid.appendChild(cell);
  }
}

/**
 * @param {Array<{key, label}>} items
 * @param {Object} topicDifficulties  — { [topicKey]: difficultyIndex | -1 }
 * @param {Function} getUnlocked      — (topicKey) => Set<number>  (0..3)
 * @param {Function} onSelect         — (topicKey, difficultyIndex) => void
 */
export function renderTopicList(items, topicDifficulties, getUnlocked, onSelect) {
  const list = document.getElementById("topic-list");
  list.innerHTML = "";

  for (const { key, label } of items) {
    const row = document.createElement("div");
    row.className = "topic-row";

    // Название темы
    const lbl = document.createElement("span");
    lbl.className = "topic-label";
    lbl.textContent = label;
    row.appendChild(lbl);

    // 4 кнопки сложности
    const btns = document.createElement("div");
    btns.className = "diff-btns";

    const unlocked = getUnlocked(key);       // Set<number>
    const selected = topicDifficulties[key]; // -1 или 0..3

    for (let i = 0; i < 4; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(i + 1);

      if (!unlocked.has(i)) {
        btn.className = "diff-btn diff-btn-locked";
        btn.disabled = true;
      } else if (selected === i) {
        btn.className = "diff-btn diff-btn-active";
      } else {
        btn.className = "diff-btn diff-btn-unlocked";
      }

      btn.addEventListener("click", () => onSelect(key, i));
      btns.appendChild(btn);
    }

    row.appendChild(btns);
    list.appendChild(row);
  }
}

// ---- XP-бар и level-up (экран результата) ----

/**
 * Рендерит XP-бар в статичном виде (без анимации).
 * xpProgress: { level, xpInLevel, xpNeeded, percent }
 */
export function renderXPBar(xpProgress) {
  const { level, xpInLevel, xpNeeded, percent } = xpProgress;
  document.getElementById("xp-level-from").textContent = String(level);
  document.getElementById("xp-level-to").textContent = String(level + 1);
  document.getElementById("xp-bar-fill").style.width = (percent * 100).toFixed(1) + "%";
  document.getElementById("xp-bar-caption").textContent =
    xpInLevel + " / " + xpNeeded + " XP";
}

/**
 * Анимирует заполнение XP-бара от startXP до endXP.
 * getXPProgress принимается параметром, чтобы не создавать зависимость ui.js → levels.js.
 * @param {number} startXP
 * @param {number} endXP
 * @param {Function} getXPProgress  — (xp) => { level, xpInLevel, xpNeeded, percent }
 * @param {Function} onLevelUp      — (newLevel) => void
 * @param {number} durationMs       — длительность анимации, default 1200
 */
export function animateXPBar(startXP, endXP, getXPProgress, onLevelUp, durationMs = 1200) {
  const fill = document.getElementById("xp-bar-fill");
  const caption = document.getElementById("xp-bar-caption");
  const levelFrom = document.getElementById("xp-level-from");
  const levelTo = document.getElementById("xp-level-to");

  let lastFiredLevel = getXPProgress(startXP).level;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / durationMs, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out
    const currentXP = Math.round(startXP + (endXP - startXP) * eased);
    const prog = getXPProgress(currentXP);

    levelFrom.textContent = String(prog.level);
    levelTo.textContent = String(prog.level + 1);
    fill.style.width = (prog.percent * 100).toFixed(1) + "%";
    caption.textContent = prog.xpInLevel + " / " + prog.xpNeeded + " XP";

    if (prog.level > lastFiredLevel) {
      lastFiredLevel = prog.level;
      onLevelUp(prog.level);
    }

    if (t < 1) requestAnimationFrame(tick);
  }

  renderXPBar(getXPProgress(startXP));
  requestAnimationFrame(tick);
}

/**
 * Показывает баннер «Новый уровень!».
 * @param {number} newLevel
 * @param {Array<string>} unlockLabels — названия разблокированного
 */
export function showLevelUpBanner(newLevel, unlockLabels) {
  const banner = document.getElementById("level-up-banner");
  document.getElementById("level-up-title").textContent =
    "🎉 " + t("level.up") + " " + newLevel + "!";
  document.getElementById("level-up-detail").textContent =
    unlockLabels.length ? t("level.unlocked") + ": " + unlockLabels.join(", ") : "";
  banner.style.display = "block";
}

export function hideLevelUpBanner() {
  const banner = document.getElementById("level-up-banner");
  if (banner) banner.style.display = "none";
}

// ---- Главное меню (профиль) ----

/**
 * @param {Object} p
 * @param {string|null} p.avatarUrl
 * @param {string} p.username        — "Гость" если нет логина
 * @param {number} p.level
 * @param {Object} p.xpProgress      — { xpInLevel, xpNeeded, percent }
 * @param {Object} p.inventory       — { hints, extraLives, chests }
 * @param {boolean} p.isLoggedIn
 * @param {string} p.lang            — "ru" или "en"
 */
export function renderMenuProfile({ avatarUrl, username, level,
                                    xpProgress, inventory, isLoggedIn, lang }) {
  // Аватар / иконка гостя
  const avatar = document.getElementById("menu-avatar");
  const guestIcon = document.getElementById("menu-guest-icon");
  if (avatarUrl) {
    avatar.src = avatarUrl;
    avatar.style.display = "block";
    guestIcon.style.display = "none";
  } else {
    avatar.style.display = "none";
    guestIcon.style.display = "block";
  }

  // Имя и уровень
  document.getElementById("menu-username").textContent = username;
  document.getElementById("menu-level-badge").textContent = String(level);

  // XP-бар
  const { xpInLevel, xpNeeded, percent } = xpProgress;
  document.getElementById("menu-xp-bar-fill").style.width =
    (percent * 100).toFixed(1) + "%";
  document.getElementById("menu-xp-caption").textContent =
    xpInLevel + " / " + xpNeeded + " XP";

  // Инвентарь (только сундуки)
  document.getElementById("menu-inv-chests").textContent = String(inventory.chests);

  // Кнопка «Память» — доступна при 100+ сундуках, иначе серая с подсказкой «нужно 100».
  const memBtn = document.getElementById("menu-memory-btn");
  const memSub = document.getElementById("menu-memory-sub");
  if (memBtn) {
    const unlocked = inventory.chests >= 100;
    memBtn.disabled = !unlocked;
    if (memSub) memSub.style.display = unlocked ? "none" : "";
  }

  // Кнопка авторизации
  document.getElementById("menu-auth-btn").textContent =
    isLoggedIn ? t("menu.sign-out") : t("menu.sign-in");

  // Кнопка языка
  document.getElementById("menu-lang-btn").textContent = lang === "ru" ? "EN" : "RU";
}

// Локальная картинка флага/герба с фолбэком svg → png → запасной узел.
// dir: "flags" | "coats". onExhausted(img) — когда ни svg, ни png не загрузились.
// Файлы лежат в репо (scripts/download_assets.js), внешних CDN-запросов нет.
function localAssetImg(dir, cca2, className, onExhausted) {
  const code = (cca2 || "").toLowerCase();
  const img = document.createElement("img");
  if (className) img.className = className;
  img.alt = cca2 || "";
  let stage = 0;
  img.onerror = () => {
    stage++;
    if (stage === 1) {
      img.src = `./img/${dir}/${code}.png`; // svg не нашёлся — пробуем png
    } else {
      img.onerror = null;
      onExhausted(img);
    }
  };
  img.src = `./img/${dir}/${code}.svg`;
  return img;
}

export function renderQuestion({ prompt, options, questionNumber, total, questionText }) {
  if (questionText) {
    document.querySelector(".question-text").textContent = questionText;
  }

  const flagEl = document.getElementById("flag-big");
  flagEl.innerHTML = "";
  if (prompt.type === "text") {
    flagEl.classList.add("text-prompt");
    flagEl.textContent = prompt.text;
  } else if (prompt.type === "coa") {
    flagEl.classList.remove("text-prompt");
    const country = prompt.country;
    flagEl.appendChild(localAssetImg("coats", country.cca2, "coa-img", () => { flagEl.textContent = "🏛"; }));
  } else {
    flagEl.classList.remove("text-prompt");
    const country = prompt.country;
    flagEl.appendChild(localAssetImg("flags", country.cca2, "", () => { flagEl.textContent = codeToEmoji(country.cca2); }));
  }

  document.getElementById("q-counter").textContent = t("game.counter", { i: questionNumber, n: total });
  document.getElementById("progress-bar").style.width = `${(questionNumber / total) * 100}%`;

  const optsEl = document.getElementById("options");
  optsEl.innerHTML = "";
  const buttons = [];
  for (const cap of options) {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = cap;
    optsEl.appendChild(btn);
    buttons.push({ button: btn, value: cap });
  }
  return buttons;
}

export function markAnswer(btn, kind) {
  btn.classList.add(kind === "correct" ? "correct" : "wrong");
}

// Экран «Информация» о стране. Значения берутся из временных полей country._*,
// которые main.js вычисляет (lang-aware) перед вызовом — UI-слой не дёргает бизнес-логику.
export function renderInfoScreen(country, regionLabel) {
  // --- Флаг (локальный) ---
  const flagEl = document.getElementById("info-flag");
  flagEl.innerHTML = "";
  flagEl.appendChild(localAssetImg("flags", country.cca2, "", () => { flagEl.textContent = codeToEmoji(country.cca2); }));

  // --- Имена ---
  document.getElementById("info-name").textContent =
    (country._displayName) || country.cca2;
  const off = officialName(country);
  const offEl = document.getElementById("info-official");
  offEl.textContent = off;
  offEl.style.display = off ? "" : "none";

  // --- Строки данных ---
  const rows = document.getElementById("info-rows");
  rows.innerHTML = "";

  function addRow(labelKey, value) {
    if (!value || value === "—") return;
    const div = document.createElement("div");
    div.className = "info-row";
    const lbl = document.createElement("span");
    lbl.className = "info-row-label";
    lbl.textContent = t(labelKey);
    const val = document.createElement("span");
    val.className = "info-row-value";
    val.textContent = value;
    div.append(lbl, val);
    rows.appendChild(div);
  }

  addRow("info.region",     regionLabel);
  addRow("info.capital",    country._capital   || "—");
  addRow("info.population", country._population || "—");
  addRow("info.area",       country._area      || "—");
  addRow("info.language",   country._language  || "—");
  addRow("info.currency",   country._currency  || "—");
  if (country._nativeName) addRow("info.native", country._nativeName);

  // --- Герб (локальный; наличие проверяем по URL-справочнику из countries.json) ---
  const coaBlock = document.getElementById("info-coa-block");
  const coaImg   = document.getElementById("info-coa-img");
  const hasCoa = !!(country.coatOfArms && country.coatOfArms.svg);
  if (hasCoa) {
    coaBlock.style.display = "";
    document.querySelector("[data-i18n='info.coa']").textContent = t("info.coa");
    coaImg.innerHTML = "";
    coaImg.appendChild(localAssetImg("coats", country.cca2, "coa-img", () => { coaImg.textContent = "🏛"; }));
  } else {
    coaBlock.style.display = "none";
  }
}

// Итог сессии: «За партию / Бонус / Итого». bonusText — строка приза или null (если бонуса не было).
export function renderResultSummary({ correct, total, sessionXP, bonusText, totalXP }) {
  document.getElementById("result-text").textContent = t("result.score", { score: correct, total });
  document.getElementById("res-session-xp").textContent = "+" + sessionXP + " XP";
  const bonusRow = document.getElementById("res-bonus-row");
  if (bonusText) {
    bonusRow.style.display = "";
    document.getElementById("res-bonus-val").textContent = bonusText;
  } else {
    bonusRow.style.display = "none";
  }
  document.getElementById("res-total-xp").textContent = "+" + totalXP + " XP";
}

// ---- Экран «Обучение» (Работа над ошибками) ----

/**
 * Рендерит состояние экрана training.
 * @param {number} remaining — сколько ошибок ещё не закрыто (0..N)
 * @param {boolean} hadErrors — были ли ошибки в этой партии вообще
 */
export function renderTrainingScreen(remaining, hadErrors) {
  const titleEl    = document.getElementById("training-title");
  const subtitleEl = document.getElementById("training-subtitle");
  const startBtn   = document.getElementById("training-start-btn");
  const bonusBtn   = document.getElementById("training-bonus-btn");
  const skipBtn    = document.getElementById("training-skip-btn");
  const remEl      = document.getElementById("training-remaining");

  // Партия без единой ошибки — отдельный заголовок, Обучение сразу недоступно, Бонус активен.
  if (!hadErrors) {
    titleEl.textContent = t("training.no-errors");
    subtitleEl.textContent = "";
    startBtn.disabled = true;
    remEl.textContent = "";
    bonusBtn.disabled = false;
    skipBtn.style.display = "none";
    return;
  }

  titleEl.textContent = t("training.title");

  if (remaining === 0) {
    // Все ошибки исправлены в обучении: «Обучение завершено!», Бонус активен.
    subtitleEl.textContent = t("training.done");
    startBtn.disabled = true;
    remEl.textContent = "";
    bonusBtn.disabled = false;
    skipBtn.style.display = "none";
  } else {
    // Есть незакрытые ошибки: можно тренироваться или пропустить.
    subtitleEl.textContent = t("training.subtitle");
    startBtn.disabled = false;
    remEl.textContent = t("training.remaining", { n: remaining });
    bonusBtn.disabled = true;
    skipBtn.style.display = "";
  }
}

// ---- Экран «Бонус» ----

/**
 * Рендерит сетку 5×5 закрытых ячеек (фаза 1, до клика).
 * @param {Array<{flagSrcs: string[], cca2: string, prize: object}>} cells — 25 элементов
 * @param {Function} onPick — (index) => void
 */
export function renderBonusGrid(cells, onPick) {
  const grid = document.getElementById("bonus-grid");
  grid.innerHTML = "";
  document.getElementById("bonus-hint").style.display = "";
  document.getElementById("bonus-result").style.display = "none";
  document.getElementById("bonus-end-btn").disabled = true;

  cells.forEach((cell, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bonus-cell bonus-cell-closed";
    btn.dataset.index = String(index);

    const inner = document.createElement("span");
    inner.className = "bonus-cell-inner";

    const flag = document.createElement("span");
    flag.className = "bonus-cell-flag";
    if (cell.cca2) {
      flag.appendChild(localAssetImg("flags", cell.cca2, "", () => { flag.textContent = "🏳"; }));
    } else {
      flag.textContent = "🏳";
    }
    inner.appendChild(flag);
    btn.appendChild(inner);

    btn.addEventListener("click", () => onPick(index));
    grid.appendChild(btn);
  });
}

/**
 * Раскрывает все ячейки (фаза 2, после клика игрока). Выделяет выбранную.
 * @param {Array<{flagSrcs, cca2, prize}>} cells
 * @param {number} pickedIndex
 * @param {string} pickedCountryName — название страны, чей флаг был под выбранным бантом
 * @param {string} pickedPrizeText   — крупный текст приза («+4200 XP»)
 */
export function revealBonusGrid(cells, pickedIndex, pickedCountryName, pickedPrizeText) {
  const grid = document.getElementById("bonus-grid");
  const buttons = grid.querySelectorAll(".bonus-cell");

  buttons.forEach((btn, index) => {
    btn.classList.remove("bonus-cell-closed");
    btn.classList.add("bonus-cell-revealed");
    if (index === pickedIndex) btn.classList.add("bonus-cell-selected");
    btn.disabled = true;

    // Под бантом был флаг — он уже отрисован, добавляем строчку приза.
    const prize = cells[index].prize;
    const prizeEl = document.createElement("span");
    prizeEl.className = "bonus-cell-prize";
    const iconEl = document.createElement("span");
    iconEl.className = "bonus-cell-prize-icon";
    iconEl.textContent = prizeIcon(prize.type);
    const valEl = document.createElement("span");
    valEl.textContent = prize.type === "xp"
      ? formatXpShort(prize.amount)
      : String(prize.amount);
    prizeEl.append(iconEl, valEl);
    (btn.querySelector(".bonus-cell-inner") || btn).appendChild(prizeEl);
  });

  document.getElementById("bonus-hint").style.display = "none";
  const resultBlock = document.getElementById("bonus-result");
  resultBlock.style.display = "";
  document.getElementById("bonus-result-country").textContent = pickedCountryName;
  document.getElementById("bonus-result-prize").textContent = pickedPrizeText;
  document.getElementById("bonus-end-btn").disabled = false;
}

function prizeIcon(type) {
  switch (type) {
    case "xp":    return "✨";
    case "chest": return "🧰";
    default:      return "?";
  }
}

// Короткий формат XP для тесных ячеек («4200» → «4.2K»).
function formatXpShort(n) {
  if (n >= 10000) return Math.round(n / 1000) + "K";
  if (n >= 1000)  return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
