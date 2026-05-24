// Слой представления: переключение экранов и заполнение их данными.
// Никакой игровой логики и state — только DOM.

import { codeToEmoji } from "./data.js";

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
  banner.textContent = isCorrect ? "Правильный ответ" : "Неправильный ответ";

  document.getElementById("answer-xp").textContent = isCorrect ? "+10 XP" : "";
  document.getElementById("answer-picked").textContent = isCorrect ? "" : `Ваш ответ: ${pickedValue}`;
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

export function renderTopicList(items, active, onToggle) {
  const list = document.getElementById("topic-list");
  list.innerHTML = "";
  for (const { key, label } of items) {
    const row = document.createElement("div");
    row.className = "topic-row" + (active.has(key) ? " topic-row-on" : "");
    const dot = document.createElement("span");
    dot.className = "setup-dot";
    const txt = document.createElement("span");
    txt.className = "setup-label";
    txt.textContent = label;
    row.append(dot, txt);
    row.addEventListener("click", () => onToggle(key));
    list.appendChild(row);
  }
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

  document.getElementById("q-counter").textContent = `Вопрос ${questionNumber} из ${total}`;
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

export function renderResult(score, total) {
  document.getElementById("result-text").textContent =
    `Ты ответил правильно ${score} из ${total}`;
}
