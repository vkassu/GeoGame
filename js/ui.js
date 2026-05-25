// Слой представления: переключение экранов и заполнение их данными.
// Никакой игровой логики и state — только DOM.

import { codeToEmoji, officialName } from "./data.js";
import { t } from "./i18n.js";

export function showScreen(name) {
  const screens = document.querySelectorAll(".screen");
  for (const s of screens) {
    s.classList.toggle("active", s.id === `${name}-screen`);
  }
  // Кнопка «На главную» видна на всех экранах, кроме стартового.
  const home = getHomeButton();
  if (home) home.hidden = name === "start";
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

export function setHintButtonState(enabled) {
  getHintButton().disabled = !enabled;
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
    b.button.style.visibility = "hidden";
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

export function renderGameXp(earned, total) {
  document.getElementById("game-xp-earned").textContent = String(earned);
  document.getElementById("game-xp-total").textContent = String(total);
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

  const startLevel = getXPProgress(startXP).level;
  let levelUpFired = false;
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

    if (!levelUpFired && prog.level > startLevel) {
      levelUpFired = true;
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
    const coa = country.coatOfArms || {};
    const sources = [coa.svg, coa.png].filter(Boolean);
    if (sources.length) {
      const img = document.createElement("img");
      img.className = "coa-img";
      img.alt = country.cca2 || "";
      let i = 0;
      img.onerror = () => {
        i++;
        if (i < sources.length) {
          img.src = sources[i];
        } else {
          img.onerror = null;
          flagEl.textContent = "🏛";
        }
      };
      img.src = sources[0];
      flagEl.appendChild(img);
    } else {
      flagEl.textContent = "🏛";
    }
  } else {
    flagEl.classList.remove("text-prompt");
    const country = prompt.country;
    const flags = country.flags || {};
    const sources = [flags.svg, flags.png].filter(Boolean);
    if (sources.length) {
      const img = document.createElement("img");
      img.alt = country.cca2 || "";
      let i = 0;
      // Фолбэк при ошибке загрузки: svg → png → эмодзи (чтобы не оставалась битая картинка).
      img.onerror = () => {
        i++;
        if (i < sources.length) {
          img.src = sources[i];
        } else {
          img.onerror = null;
          flagEl.textContent = codeToEmoji(country.cca2);
        }
      };
      img.src = sources[0];
      flagEl.appendChild(img);
    } else {
      flagEl.textContent = codeToEmoji(country.cca2);
    }
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
  // --- Флаг ---
  const flagEl = document.getElementById("info-flag");
  flagEl.innerHTML = "";
  const flags = country.flags || {};
  const sources = [flags.svg, flags.png].filter(Boolean);
  if (sources.length) {
    const img = document.createElement("img");
    img.alt = country.cca2 || "";
    let i = 0;
    img.onerror = () => {
      i++;
      if (i < sources.length) { img.src = sources[i]; }
      else { img.onerror = null; flagEl.textContent = codeToEmoji(country.cca2); }
    };
    img.src = sources[0];
    flagEl.appendChild(img);
  } else {
    flagEl.textContent = codeToEmoji(country.cca2);
  }

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

  // --- Герб ---
  const coaBlock = document.getElementById("info-coa-block");
  const coaImg   = document.getElementById("info-coa-img");
  const coa = country.coatOfArms || {};
  const coaSrcs = [coa.svg, coa.png].filter(Boolean);
  if (coaSrcs.length) {
    coaBlock.style.display = "";
    document.querySelector("[data-i18n='info.coa']").textContent = t("info.coa");
    coaImg.innerHTML = "";
    const img = document.createElement("img");
    img.className = "coa-img";
    img.alt = "";
    let i = 0;
    img.onerror = () => {
      i++;
      if (i < coaSrcs.length) { img.src = coaSrcs[i]; }
      else { img.onerror = null; coaImg.textContent = "🏛"; }
    };
    img.src = coaSrcs[0];
    coaImg.appendChild(img);
  } else {
    coaBlock.style.display = "none";
  }
}

export function renderResult(score, total) {
  document.getElementById("result-text").textContent =
    t("result.score", { score, total });
}
