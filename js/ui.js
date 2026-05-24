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

export function getStartButton() {
  return document.getElementById("start-btn");
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

export function getDifficultyInputs() {
  return document.querySelectorAll('input[name="difficulty"]');
}

export function setSelectedDifficulty(value) {
  const input = document.querySelector(`input[name="difficulty"][value="${value}"]`);
  if (input) input.checked = true;
}

export function getModeInputs() {
  return document.querySelectorAll('input[name="mode"]');
}

export function setSelectedMode(value) {
  const input = document.querySelector(`input[name="mode"][value="${value}"]`);
  if (input) input.checked = true;
}

export function setModeText(title, subtitle) {
  document.getElementById("start-title").textContent = title;
  document.getElementById("start-subtitle").textContent = subtitle;
}

export function updateTimer(seconds) {
  const el = document.getElementById("q-timer");
  if (!el) return;
  el.textContent = "⏱ " + seconds;
  el.className = "q-timer" + (seconds <= 5 ? " danger" : seconds <= 10 ? " warning" : "");
}

export function renderBestScore(n) {
  document.getElementById("best-score").textContent = String(n);
}

export function renderGamesPlayed(n) {
  document.getElementById("games-played").textContent = String(n);
}

export function setStartButtonReady(ready) {
  const btn = getStartButton();
  btn.disabled = !ready;
  btn.textContent = ready ? "Начать" : "Загрузка…";
}

export function renderQuestion({ prompt, options, questionNumber, total, score, questionText }) {
  if (questionText) {
    document.querySelector(".question-text").textContent = questionText;
  }

  const flagEl = document.getElementById("flag-big");
  flagEl.innerHTML = "";
  if (prompt.type === "text") {
    flagEl.classList.add("text-prompt");
    flagEl.textContent = prompt.text;
  } else {
    flagEl.classList.remove("text-prompt");
    const country = prompt.country;
    const svg = country.flags && country.flags.svg;
    if (svg) {
      const img = document.createElement("img");
      img.src = svg;
      img.alt = country.cca2 || "";
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
