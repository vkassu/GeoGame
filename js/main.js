// Точка входа: игровая логика, state и единственное место работы с localStorage.

import {
  fetchCountries,
  hasCapital,
  capitalName,
  ruName,
  populationFormatted,
  areaFormatted,
  languageName,
  hasLanguages,
  currencyName,
  hasCurrencies,
  nativeNameStr,
  hasNativeName,
  hasCoatOfArms,
} from "./data.js";
import {
  showScreen,
  getPlayAgainButton,
  getHomeButton,
  getHintButton,
  setHintButtonState,
  applyHintToOptions,
  renderAnswerResult,
  showAnswerResult,
  hideAnswerResult,
  updateTimer,
  renderQuestion,
  markAnswer,
  renderResult,
  renderGamesPlayed,
  renderXpTotal,
  renderGameXp,
  renderRegionGrid,
  renderTopicList,
  renderBestXp,
  renderAvailableCount,
  setNavButtonEnabled,
} from "./ui.js";

const OPTIONS_PER_QUESTION = 4;
const QUESTION_TIME_SEC = 30;
const XP_PER_CORRECT = 10;

// Темы вопросов.
//   prompt  — что показывать в вопросе: { type: "flag", country } или { type: "text", text }
//   answer  — функция, возвращающая правильный ответ (и текст вариантов)
//   valid   — фильтр стран, пригодных для темы
const TOPICS = {
  country: {
    label: "Страна по флагу",
    question: "Что это за страна?",
    prompt: (c) => ({ type: "flag", country: c }),
    answer: ruName,
    valid: () => true,
  },
  capital: {
    label: "Столица",
    question: "Какая столица этой страны?",
    prompt: (c) => ({ type: "flag", country: c }),
    answer: capitalName,
    valid: hasCapital,
  },
  countryByCapital: {
    label: "Страна по столице",
    question: "Столицей какой страны является этот город?",
    prompt: (c) => ({ type: "text", text: capitalName(c) }),
    answer: ruName,
    valid: hasCapital,
  },
  population: {
    label: "Население",
    question: "Каково население этой страны?",
    prompt: (c) => ({ type: "flag", country: c }),
    answer: populationFormatted,
    valid: (c) => c.population > 0,
  },
  area: {
    label: "Площадь",
    question: "Какова площадь этой страны?",
    prompt: (c) => ({ type: "flag", country: c }),
    answer: areaFormatted,
    valid: (c) => c.area > 0,
  },
  language: {
    label: "Язык",
    question: "Какой официальный язык этой страны?",
    prompt: (c) => ({ type: "flag", country: c }),
    answer: languageName,
    valid: hasLanguages,
  },
  currency: {
    label: "Валюта",
    question: "Какая валюта этой страны?",
    prompt: (c) => ({ type: "flag", country: c }),
    answer: currencyName,
    valid: hasCurrencies,
  },
  nativeName: {
    label: "Самоназвание",
    question: "Название какой страны это на родном языке?",
    prompt: (c) => ({ type: "text", text: nativeNameStr(c) }),
    answer: ruName,
    valid: hasNativeName,
  },
  coatOfArms: {
    label: "Герб",
    question: "Что это за страна?",
    prompt: (c) => ({ type: "coa", country: c }),
    answer: ruName,
    valid: hasCoatOfArms,
  },
};

// Регионы: ключ → { label, apiValue }. apiValue сверяется с country.region.
const REGIONS = {
  europe:   { label: "Европа",  apiValue: "Europe"   },
  asia:     { label: "Азия",    apiValue: "Asia"     },
  africa:   { label: "Африка",  apiValue: "Africa"   },
  americas: { label: "Америка", apiValue: "Americas" },
  oceania:  { label: "Океания", apiValue: "Oceania"  },
};

const QUESTION_COUNTS = [10, 25, 50, 75, 100];

const DEFAULT_REGIONS = ["europe", "asia", "africa", "americas", "oceania"];
const DEFAULT_TOPICS = ["country", "capital", "countryByCapital"];
const DEFAULT_QUESTION_COUNT = 10;

const STORAGE = {
  gamesPlayed: "geogame:gamesPlayed",
  xpTotal: "geogame:xpTotal",
  setupRegions: "geogame:setup:regions",
  setupTopics: "geogame:setup:topics",
  setupQuestionCount: "geogame:setup:questionCount",
  bestXpPerGame: "geogame:bestXpPerGame",
};

const state = {
  screen: "start",
  gamesPlayed: 0,
  allCountries: [],
  regionPool: [],          // страны под текущие регионы (заполняется в startGame, для дистракторов)
  questions: [],           // [{ country, topicKey }]
  currentQuestion: 0,
  score: 0,
  isGameOver: false,
  timerId: null,
  hintUsed: false,
  currentButtons: [],
  currentCorrect: "",
  xpTotal: 0,
  xpEarnedThisGame: 0,
  bestXpPerGame: 0,
  dataLoaded: false,
  setup: {
    regions: [...DEFAULT_REGIONS],
    topics: [...DEFAULT_TOPICS],
    questionCount: DEFAULT_QUESTION_COUNT,
  },
};

function loadFromStorage() {
  state.gamesPlayed = Number(localStorage.getItem(STORAGE.gamesPlayed)) || 0;
  state.xpTotal = Number(localStorage.getItem(STORAGE.xpTotal)) || 0;
  state.bestXpPerGame = Number(localStorage.getItem(STORAGE.bestXpPerGame)) || 0;

  try {
    const r = JSON.parse(localStorage.getItem(STORAGE.setupRegions) || "null");
    if (Array.isArray(r)) {
      const valid = r.filter((k) => REGIONS[k]);
      if (valid.length) state.setup.regions = valid;
    }
  } catch (_) {}
  try {
    const t = JSON.parse(localStorage.getItem(STORAGE.setupTopics) || "null");
    if (Array.isArray(t)) {
      const valid = t.filter((k) => TOPICS[k]);
      if (valid.length) state.setup.topics = valid;
    }
  } catch (_) {}
  const qc = Number(localStorage.getItem(STORAGE.setupQuestionCount));
  if (QUESTION_COUNTS.includes(qc)) state.setup.questionCount = qc;
}

// ---------- утилиты ----------

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

// Страны под выбранные регионы.
function regionPoolCountries() {
  const allowed = new Set(state.setup.regions.map((k) => REGIONS[k].apiValue));
  return state.allCountries.filter((c) => allowed.has(c.region));
}

// Все валидные пары (страна, тема) под выбранные регионы и темы — это и есть «реальные вопросы».
// Одна страна даёт столько вопросов, сколько выбранных тем для неё валидны.
function questionPairs() {
  const topics = state.setup.topics;
  const pairs = [];
  for (const country of regionPoolCountries()) {
    for (const tk of topics) {
      if (TOPICS[tk] && TOPICS[tk].valid(country)) {
        pairs.push({ country, topicKey: tk });
      }
    }
  }
  return pairs;
}

// ---------- экран настройки (Шаги 1–3) ----------

function persistRegions() {
  localStorage.setItem(STORAGE.setupRegions, JSON.stringify(state.setup.regions));
}
function persistTopics() {
  localStorage.setItem(STORAGE.setupTopics, JSON.stringify(state.setup.topics));
}

function toggleRegion(key) {
  if (!REGIONS[key]) return;
  const i = state.setup.regions.indexOf(key);
  if (i >= 0) state.setup.regions.splice(i, 1);
  else state.setup.regions.push(key);
  persistRegions();
  refreshSetupUI();
}

function toggleTopic(key) {
  if (!TOPICS[key]) return;
  const i = state.setup.topics.indexOf(key);
  if (i >= 0) state.setup.topics.splice(i, 1);
  else state.setup.topics.push(key);
  persistTopics();
  refreshSetupUI();
}

function setAllRegions(on) {
  state.setup.regions = on ? Object.keys(REGIONS) : [];
  persistRegions();
  refreshSetupUI();
}
function setAllTopics(on) {
  state.setup.topics = on ? Object.keys(TOPICS) : [];
  persistTopics();
  refreshSetupUI();
}

// Перерисовывает оба экрана настройки (регионы + темы), счётчик доступных и кнопку «Начало».
function refreshSetupUI() {
  const regionItems = Object.keys(REGIONS).map((k) => ({ key: k, label: REGIONS[k].label }));
  const topicItems = Object.keys(TOPICS).map((k) => ({ key: k, label: TOPICS[k].label }));
  renderRegionGrid(regionItems, new Set(state.setup.regions), toggleRegion);
  renderTopicList(topicItems, new Set(state.setup.topics), toggleTopic);
  const available = state.dataLoaded ? questionPairs().length : null;
  renderAvailableCount(available === null ? "—" : available);
  // «Начало» активна только если есть хотя бы один реальный вопрос.
  setNavButtonEnabled("regions-next", state.dataLoaded && available > 0);
}

function selectQuestionCountAndStart(n) {
  if (!QUESTION_COUNTS.includes(n)) return;
  state.setup.questionCount = n;
  localStorage.setItem(STORAGE.setupQuestionCount, String(n));
  startGame();
}

// ---------- игра ----------

function buildOptions(correctCountry, topic) {
  const answer = topic.answer;
  const correct = answer(correctCountry);
  const seen = new Set([correct]);
  const wrong = [];
  // дистракторы: сначала из выбранных регионов, при нехватке — из всех валидных по теме
  const sources = [
    state.regionPool.filter(topic.valid),
    state.allCountries.filter(topic.valid),
  ];
  for (const src of sources) {
    for (const c of shuffle(src)) {
      if (wrong.length >= OPTIONS_PER_QUESTION - 1) break;
      const v = answer(c);
      if (!seen.has(v)) {
        seen.add(v);
        wrong.push(v);
      }
    }
    if (wrong.length >= OPTIONS_PER_QUESTION - 1) break;
  }
  return shuffle([correct, ...wrong]);
}

function startGame() {
  state.regionPool = regionPoolCountries();
  const pairs = questionPairs();

  if (pairs.length === 0) {
    alert("Нет вопросов под выбранные настройки. Измените регионы или темы.");
    return;
  }

  let count = state.setup.questionCount;
  if (count > pairs.length) {
    if (!confirm(`Доступно только ${pairs.length} вопросов. Продолжить?`)) return;
    count = pairs.length;
  }

  // Вопрос = уникальная пара (страна, тема). Одна страна может попасть под разными темами.
  state.questions = sample(pairs, count);

  state.currentQuestion = 0;
  state.score = 0;
  state.xpEarnedThisGame = 0;
  state.isGameOver = false;
  state.hintUsed = false;
  state.currentButtons = [];
  state.currentCorrect = "";
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
      // Время вышло — неверный ответ (ни одна кнопка не совпадёт с правильным).
      const q = state.questions[state.currentQuestion];
      const correct = TOPICS[q.topicKey].answer(q.country);
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
  const q = state.questions[index];
  const topic = TOPICS[q.topicKey];
  const country = q.country;
  const correct = topic.answer(country);
  const options = buildOptions(country, topic);

  const buttons = renderQuestion({
    prompt: topic.prompt(country),
    options,
    questionNumber: index + 1,
    total: state.questions.length,
    questionText: topic.question,
  });

  state.currentButtons = buttons;
  state.currentCorrect = correct;

  for (const entry of buttons) {
    entry.button.addEventListener("click", () => {
      handleAnswer(entry, buttons, correct);
    });
  }

  setHintButtonState(!state.hintUsed);
}

function handleHintClick() {
  if (state.hintUsed) return;
  state.hintUsed = true;
  applyHintToOptions(state.currentButtons, state.currentCorrect);
  setHintButtonState(false);
}

function handleAnswer(picked, allButtons, correct) {
  clearTimer();
  setHintButtonState(false);
  const isCorrect = picked.value === correct;
  if (isCorrect) {
    state.score++;
    state.xpTotal += XP_PER_CORRECT;
    state.xpEarnedThisGame += XP_PER_CORRECT;
    localStorage.setItem(STORAGE.xpTotal, String(state.xpTotal));
  }

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
    showQuestion(state.currentQuestion);
  }
}

function endGame() {
  clearTimer();
  state.isGameOver = true;

  state.gamesPlayed += 1;
  localStorage.setItem(STORAGE.gamesPlayed, String(state.gamesPlayed));

  // Рекорд — максимальный XP за одну партию (один общий, не по теме/настройкам).
  if (state.xpEarnedThisGame > state.bestXpPerGame) {
    state.bestXpPerGame = state.xpEarnedThisGame;
    localStorage.setItem(STORAGE.bestXpPerGame, String(state.bestXpPerGame));
  }

  state.screen = "result";
  renderResult(state.score, state.questions.length);
  renderGamesPlayed(state.gamesPlayed);
  renderGameXp(state.xpEarnedThisGame, state.xpTotal);
  renderXpTotal(state.xpTotal);
  renderBestXp(state.bestXpPerGame);
  showScreen(state.screen);
}

function goToStart() {
  state.screen = "start";
  refreshSetupUI();
  renderXpTotal(state.xpTotal);
  renderBestXp(state.bestXpPerGame);
  showScreen(state.screen);
}

// Возврат на главную (Шаг 1). Если партия идёт — спрашиваем подтверждение.
function goHome() {
  if (state.screen === "game" && !state.isGameOver) {
    if (!confirm("Прервать текущую партию и вернуться на главную?")) return;
  }
  goToStart();
}

async function init() {
  const statusEl = document.getElementById("status");

  loadFromStorage();
  renderXpTotal(state.xpTotal);
  renderBestXp(state.bestXpPerGame);
  refreshSetupUI();

  getPlayAgainButton().addEventListener("click", goToStart);
  getHomeButton().addEventListener("click", goHome);
  getHintButton().addEventListener("click", handleHintClick);
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

  // Шаг 1 — регионы
  document.getElementById("regions-clear").addEventListener("click", () => setAllRegions(false));
  document.getElementById("regions-all").addEventListener("click", () => setAllRegions(true));
  document.getElementById("open-topics-btn").addEventListener("click", () => showScreen("topics"));
  document.getElementById("regions-next").addEventListener("click", () => showScreen("count"));
  // #regions-back — заглушка (disabled), идти из Шага 1 пока некуда.

  // Шаг 2 — темы
  document.getElementById("topics-clear").addEventListener("click", () => setAllTopics(false));
  document.getElementById("topics-all").addEventListener("click", () => setAllTopics(true));
  document.getElementById("topics-back").addEventListener("click", () => goToStart());

  // Шаг 3 — количество
  for (const btn of document.querySelectorAll(".count-btn")) {
    btn.addEventListener("click", () => selectQuestionCountAndStart(Number(btn.dataset.count)));
  }
  document.getElementById("count-back").addEventListener("click", () => goToStart());

  try {
    const all = await fetchCountries();
    state.allCountries = all;
    state.dataLoaded = true;
    statusEl.textContent = `Загружено стран: ${all.length}`;
    refreshSetupUI(); // обновить «доступно вопросов» и активировать «Начало»
  } catch (err) {
    statusEl.className = "error";
    statusEl.textContent = "Ошибка загрузки: " + err.message;
    console.error(err);
  }
}

init();
