// Точка входа: игровая логика, state и единственное место работы с localStorage.

import { fetchCountries, hasCapital, capitalName, ruName } from "./data.js";
import {
  showScreen,
  getStartButton,
  getPlayAgainButton,
  getDifficultyInputs,
  setSelectedDifficulty,
  getModeInputs,
  setSelectedMode,
  setModeText,
  getHomeButton,
  renderAnswerResult,
  showAnswerResult,
  hideAnswerResult,
  updateTimer,
  setStartButtonReady,
  renderQuestion,
  markAnswer,
  renderResult,
  renderBestScore,
  renderGamesPlayed,
} from "./ui.js";

const QUESTIONS_BY_DIFFICULTY = { easy: 5, medium: 10, hard: 15 };
const OPTIONS_PER_QUESTION = 4;
const QUESTION_TIME_SEC = 30;

// Режимы игры.
//   prompt   — что показывать в вопросе: { type: "flag", country } или { type: "text", text }
//   answer   — функция, возвращающая правильный ответ (и текст вариантов)
//   valid    — фильтр стран, пригодных для режима
const MODES = {
  country: {
    startTitle: "Угадай страну по флагу",
    subtitle: "По флагу определи, что это за страна.",
    question: "Что это за страна?",
    prompt: (c) => ({ type: "flag", country: c }),
    answer: ruName,
    valid: () => true,
  },
  capital: {
    startTitle: "Угадай столицу страны",
    subtitle: "По флагу определи страну и выбери её столицу.",
    question: "Какая столица этой страны?",
    prompt: (c) => ({ type: "flag", country: c }),
    answer: capitalName,
    valid: hasCapital,
  },
  countryByCapital: {
    startTitle: "Угадай страну по столице",
    subtitle: "По названию столицы определи страну.",
    question: "Столицей какой страны является этот город?",
    prompt: (c) => ({ type: "text", text: capitalName(c) }),
    answer: ruName,
    valid: hasCapital,
  },
};
const DEFAULT_MODE = "country";

const STORAGE = {
  difficulty: "geogame:difficulty",
  gamesPlayed: "geogame:gamesPlayed",
  mode: "geogame:mode",
  // Рекорд хранится отдельно для каждого режима: geogame:bestScore:<mode>
  bestScoreFor: (mode) => `geogame:bestScore:${mode}`,
};

const state = {
  screen: "start",
  difficulty: "medium",
  mode: DEFAULT_MODE,
  bestScore: 0,
  gamesPlayed: 0,
  allCountries: [],
  countries: [],
  questions: [],
  currentQuestion: 0,
  score: 0,
  isGameOver: false,
  timerId: null,
};

function loadBestScore(mode) {
  return Number(localStorage.getItem(STORAGE.bestScoreFor(mode))) || 0;
}

function loadFromStorage() {
  state.gamesPlayed = Number(localStorage.getItem(STORAGE.gamesPlayed)) || 0;
  const savedDiff = localStorage.getItem(STORAGE.difficulty);
  state.difficulty = QUESTIONS_BY_DIFFICULTY[savedDiff] ? savedDiff : "medium";
  const savedMode = localStorage.getItem(STORAGE.mode);
  state.mode = MODES[savedMode] ? savedMode : DEFAULT_MODE;
  state.bestScore = loadBestScore(state.mode);
}

function selectDifficulty(value) {
  if (!QUESTIONS_BY_DIFFICULTY[value]) return;
  state.difficulty = value;
  localStorage.setItem(STORAGE.difficulty, value);
}

function selectMode(value) {
  if (!MODES[value]) return;
  state.mode = value;
  localStorage.setItem(STORAGE.mode, value);
  state.bestScore = loadBestScore(value);
  renderBestScore(state.bestScore);
  const mode = MODES[value];
  setModeText(mode.startTitle, mode.subtitle);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

function buildOptions(correctCountry, answer) {
  const correct = answer(correctCountry);
  const pool = state.countries.filter(
    (c) => c !== correctCountry && answer(c) !== correct
  );
  const wrong = sample(pool, OPTIONS_PER_QUESTION - 1).map(answer);
  return shuffle([correct, ...wrong]);
}

function startGame() {
  const total = QUESTIONS_BY_DIFFICULTY[state.difficulty];
  state.countries = state.allCountries.filter(MODES[state.mode].valid);
  state.questions = sample(state.countries, total);
  state.currentQuestion = 0;
  state.score = 0;
  state.isGameOver = false;
  state.screen = "game";
  showScreen(state.screen);
  showQuestion(0);
}

function startTimer() {
  clearTimer();
  let seconds = QUESTION_TIME_SEC;
  updateTimer(seconds);
  state.timerId = setInterval(() => {
    seconds--;
    updateTimer(seconds);
    if (seconds <= 0) {
      clearTimer();
      // Время вышло — неверный ответ, правильный — пустая строка (ни одна кнопка не совпадёт)
      const mode = MODES[state.mode];
      const country = state.questions[state.currentQuestion];
      const correct = mode.answer(country);
      renderAnswerResult(false, "—", correct);
      showAnswerResult();
    }
  }, 1000);
}

function clearTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function showQuestion(index) {
  hideAnswerResult();
  startTimer();
  const mode = MODES[state.mode];
  const country = state.questions[index];
  const correct = mode.answer(country);
  const options = buildOptions(country, mode.answer);

  const buttons = renderQuestion({
    prompt: mode.prompt(country),
    options,
    questionNumber: index + 1,
    total: state.questions.length,
    score: state.score,
    questionText: mode.question,
  });

  for (const entry of buttons) {
    entry.button.addEventListener("click", () => {
      handleAnswer(entry, buttons, correct);
    });
  }
}

function handleAnswer(picked, allButtons, correct) {
  clearTimer();
  const isCorrect = picked.value === correct;
  if (isCorrect) state.score++;

  for (const { button } of allButtons) {
    button.disabled = true;
  }
  markAnswer(picked.button, isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    const correctEntry = allButtons.find((e) => e.value === correct);
    if (correctEntry) markAnswer(correctEntry.button, "correct");
  }

  renderAnswerResult(isCorrect, picked.value, correct);
  showAnswerResult();
}

function onAnswerResultClick() {
  clearTimer();
  hideAnswerResult();
  state.currentQuestion++;
  if (state.currentQuestion >= state.questions.length) {
    endGame();
  } else {
    document.getElementById("q-score").textContent = `Счёт: ${state.score}`;
    showQuestion(state.currentQuestion);
  }
}

function endGame() {
  clearTimer();
  state.isGameOver = true;

  state.gamesPlayed += 1;
  localStorage.setItem(STORAGE.gamesPlayed, String(state.gamesPlayed));

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem(STORAGE.bestScoreFor(state.mode), String(state.bestScore));
    renderBestScore(state.bestScore);
  }

  state.screen = "result";
  renderResult(state.score, state.questions.length);
  renderGamesPlayed(state.gamesPlayed);
  showScreen(state.screen);
}

function goToStart() {
  state.screen = "start";
  showScreen(state.screen);
}

// Возврат на главную. Если партия идёт — спрашиваем подтверждение.
function goHome() {
  if (state.screen === "game" && !state.isGameOver) {
    if (!confirm("Прервать текущую партию и вернуться на главную?")) return;
  }
  goToStart();
}

async function init() {
  const statusEl = document.getElementById("status");

  loadFromStorage();
  renderBestScore(state.bestScore);
  setSelectedDifficulty(state.difficulty);
  setSelectedMode(state.mode);
  setModeText(MODES[state.mode].startTitle, MODES[state.mode].subtitle);

  getStartButton().addEventListener("click", startGame);
  getPlayAgainButton().addEventListener("click", goToStart);
  getHomeButton().addEventListener("click", goHome);
  document.getElementById("answer-result").addEventListener("click", onAnswerResultClick);
  document.getElementById("report-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("Report: не реализовано");
  });
  document.getElementById("info-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("Информация: не реализовано");
  });
  document.getElementById("end-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Завершить партию досрочно?")) endGame();
  });
  for (const input of getDifficultyInputs()) {
    input.addEventListener("change", () => selectDifficulty(input.value));
  }
  for (const input of getModeInputs()) {
    input.addEventListener("change", () => selectMode(input.value));
  }

  try {
    const all = await fetchCountries();
    state.allCountries = all;
    statusEl.textContent = `Загружено стран: ${all.length}`;
    setStartButtonReady(true);
  } catch (err) {
    statusEl.className = "error";
    statusEl.textContent = "Ошибка загрузки: " + err.message;
    console.error(err);
  }
}

init();
