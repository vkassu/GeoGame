// Точка входа: игровая логика, state и единственное место работы с localStorage.

import { fetchCountries, hasCapital, capitalName } from "./data.js";
import {
  showScreen,
  getStartButton,
  getPlayAgainButton,
  getDifficultyInputs,
  setSelectedDifficulty,
  setStartButtonReady,
  renderQuestion,
  markAnswer,
  renderResult,
  renderBestScore,
  renderGamesPlayed,
} from "./ui.js";

const QUESTIONS_BY_DIFFICULTY = { easy: 5, medium: 10, hard: 15 };
const OPTIONS_PER_QUESTION = 4;
const NEXT_DELAY_MS = 1000;

const STORAGE = {
  bestScore: "geogame:bestScore",
  difficulty: "geogame:difficulty",
  gamesPlayed: "geogame:gamesPlayed",
};

const state = {
  screen: "start",
  difficulty: "medium",
  bestScore: 0,
  gamesPlayed: 0,
  countries: [],
  questions: [],
  currentQuestion: 0,
  score: 0,
  isGameOver: false,
};

function loadFromStorage() {
  state.bestScore = Number(localStorage.getItem(STORAGE.bestScore)) || 0;
  state.gamesPlayed = Number(localStorage.getItem(STORAGE.gamesPlayed)) || 0;
  const savedDiff = localStorage.getItem(STORAGE.difficulty);
  state.difficulty = QUESTIONS_BY_DIFFICULTY[savedDiff] ? savedDiff : "medium";
}

function selectDifficulty(value) {
  if (!QUESTIONS_BY_DIFFICULTY[value]) return;
  state.difficulty = value;
  localStorage.setItem(STORAGE.difficulty, value);
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

function buildOptions(correctCountry) {
  const correct = capitalName(correctCountry);
  const pool = state.countries.filter(
    (c) => c !== correctCountry && capitalName(c) !== correct
  );
  const wrong = sample(pool, OPTIONS_PER_QUESTION - 1).map(capitalName);
  return shuffle([correct, ...wrong]);
}

function startGame() {
  const total = QUESTIONS_BY_DIFFICULTY[state.difficulty];
  state.questions = sample(state.countries, total);
  state.currentQuestion = 0;
  state.score = 0;
  state.isGameOver = false;
  state.screen = "game";
  showScreen(state.screen);
  showQuestion(0);
}

function showQuestion(index) {
  const country = state.questions[index];
  const correct = capitalName(country);
  const options = buildOptions(country);

  const buttons = renderQuestion({
    country,
    options,
    questionNumber: index + 1,
    total: state.questions.length,
    score: state.score,
  });

  for (const entry of buttons) {
    entry.button.addEventListener("click", () => {
      handleAnswer(entry, buttons, correct);
    });
  }
}

function handleAnswer(picked, allButtons, correct) {
  const isCorrect = picked.capital === correct;
  if (isCorrect) state.score++;

  for (const { button } of allButtons) {
    button.disabled = true;
  }
  markAnswer(picked.button, isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    const correctEntry = allButtons.find((e) => e.capital === correct);
    if (correctEntry) markAnswer(correctEntry.button, "correct");
  }

  setTimeout(() => {
    state.currentQuestion++;
    if (state.currentQuestion >= state.questions.length) {
      endGame();
    } else {
      document.getElementById("q-score").textContent = `Счёт: ${state.score}`;
      showQuestion(state.currentQuestion);
    }
  }, NEXT_DELAY_MS);
}

function endGame() {
  state.isGameOver = true;

  state.gamesPlayed += 1;
  localStorage.setItem(STORAGE.gamesPlayed, String(state.gamesPlayed));

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem(STORAGE.bestScore, String(state.bestScore));
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

async function init() {
  const statusEl = document.getElementById("status");

  loadFromStorage();
  renderBestScore(state.bestScore);
  setSelectedDifficulty(state.difficulty);

  getStartButton().addEventListener("click", startGame);
  getPlayAgainButton().addEventListener("click", goToStart);
  for (const input of getDifficultyInputs()) {
    input.addEventListener("change", () => selectDifficulty(input.value));
  }

  try {
    const all = await fetchCountries();
    state.countries = all.filter(hasCapital);
    statusEl.textContent = `Загружено стран: ${state.countries.length}`;
    setStartButtonReady(true);
  } catch (err) {
    statusEl.className = "error";
    statusEl.textContent = "Ошибка загрузки: " + err.message;
    console.error(err);
  }
}

init();
