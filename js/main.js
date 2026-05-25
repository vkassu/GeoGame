// Точка входа: игровая логика, state и единственное место работы с localStorage.

import {
  fetchCountries,
  hasCapital,
  languageName,
  hasLanguages,
  currencyName,
  hasCurrencies,
  nativeNameStr,
  hasNativeName,
  hasCoatOfArms,
  getName,
  getCapital,
  getPopulationFormatted,
  getAreaFormatted,
} from "./data.js";
import {
  getLang,
  setLang,
  applyI18n,
  t,
  TOPIC_LABELS,
  TOPIC_QUESTIONS,
  REGION_LABELS,
} from "./i18n.js";
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
  renderInfoScreen,
} from "./ui.js";
import { onUserChanged, signInWithGoogle, signOutUser,
         loadUserData, saveUserData } from "./firebase.js?v=20260537";

const OPTIONS_PER_QUESTION = 4;
const QUESTION_TIME_SEC = 30;
const XP_PER_CORRECT = 10;

// Темы вопросов.
//   prompt  — что показывать в вопросе: { type: "flag", country } или { type: "text", text }
//   answer  — функция, возвращающая правильный ответ (и текст вариантов)
//   valid   — фильтр стран, пригодных для темы
// label/question — геттеры: читают текущий язык из i18n.js в момент вызова.
const TOPICS = {
  country: {
    get label() { return TOPIC_LABELS.country[getLang()]; },
    get question() { return TOPIC_QUESTIONS.country[getLang()]; },
    prompt: (c) => ({ type: "flag", country: c }),
    answer: (c) => getName(c),
    valid: () => true,
  },
  capital: {
    get label() { return TOPIC_LABELS.capital[getLang()]; },
    get question() { return TOPIC_QUESTIONS.capital[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: (c) => getCapital(c),
    valid: hasCapital,
  },
  countryByCapital: {
    get label() { return TOPIC_LABELS.countryByCapital[getLang()]; },
    get question() { return TOPIC_QUESTIONS.countryByCapital[getLang()]; },
    prompt: (c) => ({ type: "text", text: getCapital(c) }),
    answer: (c) => getName(c),
    valid: hasCapital,
  },
  population: {
    get label() { return TOPIC_LABELS.population[getLang()]; },
    get question() { return TOPIC_QUESTIONS.population[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: (c) => getPopulationFormatted(c),
    valid: (c) => c.population > 0,
  },
  area: {
    get label() { return TOPIC_LABELS.area[getLang()]; },
    get question() { return TOPIC_QUESTIONS.area[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: (c) => getAreaFormatted(c),
    valid: (c) => c.area > 0,
  },
  language: {
    get label() { return TOPIC_LABELS.language[getLang()]; },
    get question() { return TOPIC_QUESTIONS.language[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: languageName,
    valid: hasLanguages,
  },
  currency: {
    get label() { return TOPIC_LABELS.currency[getLang()]; },
    get question() { return TOPIC_QUESTIONS.currency[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: currencyName,
    valid: hasCurrencies,
  },
  nativeName: {
    get label() { return TOPIC_LABELS.nativeName[getLang()]; },
    get question() { return TOPIC_QUESTIONS.nativeName[getLang()]; },
    prompt: (c) => ({ type: "text", text: nativeNameStr(c) }),
    answer: (c) => getName(c),
    valid: hasNativeName,
  },
  coatOfArms: {
    get label() { return TOPIC_LABELS.coatOfArms[getLang()]; },
    get question() { return TOPIC_QUESTIONS.coatOfArms[getLang()]; },
    prompt: (c) => ({ type: "coa", country: c }),
    answer: (c) => getName(c),
    valid: hasCoatOfArms,
  },
};

// Регионы: ключ → { label (геттер, lang-aware), apiValue }. apiValue сверяется с country.region.
const REGIONS = {
  europe:   { get label() { return REGION_LABELS.europe[getLang()]; },   apiValue: "Europe"   },
  asia:     { get label() { return REGION_LABELS.asia[getLang()]; },     apiValue: "Asia"     },
  africa:   { get label() { return REGION_LABELS.africa[getLang()]; },   apiValue: "Africa"   },
  americas: { get label() { return REGION_LABELS.americas[getLang()]; }, apiValue: "Americas" },
  oceania:  { get label() { return REGION_LABELS.oceania[getLang()]; },  apiValue: "Oceania"  },
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
  lang: "geogame:lang",
};

const state = {
  screen: "start",
  user: null,              // { uid, name, photo } или null (гость)
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
  const savedLang = localStorage.getItem(STORAGE.lang);
  if (savedLang === "ru" || savedLang === "en") {
    setLang(savedLang);
  }

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
  for (const btn of document.querySelectorAll(".count-btn")) {
    btn.textContent = t("count.q", { n: btn.dataset.count });
  }
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
    alert(t("alert.no-questions"));
    return;
  }

  let count = state.setup.questionCount;
  if (count > pairs.length) {
    if (!confirm(t("alert.limited", { n: pairs.length }))) return;
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

// ---------- экран «Информация» о стране ----------

function getRegionLabel(country) {
  const entry = Object.values(REGIONS).find((r) => r.apiValue === country.region);
  return entry ? entry.label : (country.region || "");
}

// Открыть карточку страны текущего вопроса (кнопка «Информация» на экране ответа).
function showInfo() {
  const q = state.questions[state.currentQuestion];
  if (!q) return;
  const country = q.country;

  // Вычисленные (lang-aware) значения как временные поля — UI-слой их только читает.
  country._displayName = getName(country);
  country._capital     = getCapital(country);
  country._population  = getPopulationFormatted(country);
  country._area        = getAreaFormatted(country);
  country._language    = hasLanguages(country) ? languageName(country) : null;
  country._currency    = hasCurrencies(country) ? currencyName(country) : null;
  country._nativeName  = hasNativeName(country) ? nativeNameStr(country) : null;

  renderInfoScreen(country, getRegionLabel(country));
  showScreen("info");
}

// Возврат к результату ответа — партия не прерывается.
function goBackFromInfo() {
  showScreen("game");
  showAnswerResult();
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

  if (state.user) {
    saveUserData(state.user.uid, {
      xpTotal:      state.xpTotal,
      bestXpPerGame: state.bestXpPerGame,
      gamesPlayed:  state.gamesPlayed,
    }).catch(console.error);
  }
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
    if (!confirm(t("alert.go-home"))) return;
  }
  goToStart();
}

function switchLang() {
  const next = getLang() === "ru" ? "en" : "ru";
  setLang(next);
  localStorage.setItem(STORAGE.lang, next);
  updateLangButton();
  applyI18n();
  renderStatus();
  refreshSetupUI();
  if (state.user) {
    saveUserData(state.user.uid, { lang: next }).catch(console.error);
  }
}

// ---------- авторизация (Firebase) ----------

// Применить данные из Firestore к state и localStorage.
function applyUserData(data) {
  state.xpTotal       = data.xpTotal       ?? state.xpTotal;
  state.bestXpPerGame = data.bestXpPerGame  ?? state.bestXpPerGame;
  state.gamesPlayed   = data.gamesPlayed    ?? state.gamesPlayed;
  // Обновить localStorage чтобы совпадал с облаком
  localStorage.setItem(STORAGE.xpTotal,      String(state.xpTotal));
  localStorage.setItem(STORAGE.bestXpPerGame, String(state.bestXpPerGame));
  localStorage.setItem(STORAGE.gamesPlayed,   String(state.gamesPlayed));
  // Обновить UI
  renderXpTotal(state.xpTotal);
  renderBestXp(state.bestXpPerGame);
  renderGamesPlayed(state.gamesPlayed);
}

// Обновить блок авторизации на стартовом экране.
function renderAuthUI(user) {
  const btn   = document.getElementById("auth-btn");
  const info  = document.getElementById("auth-info");
  const avatar = document.getElementById("auth-avatar");
  const name   = document.getElementById("auth-name");
  if (!btn || !info) return;
  if (user) {
    btn.style.display  = "none";
    info.style.display = "flex";
    if (avatar) avatar.src = user.photo || "";
    if (name)   name.textContent = user.name || "";
  } else {
    btn.style.display  = "flex";
    info.style.display = "none";
  }
}

function updateLangButton() {
  const btn = document.getElementById("lang-btn");
  if (btn) btn.textContent = getLang() === "ru" ? "EN" : "RU";
}

// Статусная строка по состоянию (на текущем языке). Ошибка выставляется отдельно в init.
function renderStatus() {
  const el = document.getElementById("status");
  if (!el || el.classList.contains("error")) return;
  el.textContent = state.dataLoaded
    ? t("status.loaded", { n: state.allCountries.length })
    : t("status.loading");
}

async function init() {
  const statusEl = document.getElementById("status");

  loadFromStorage();
  applyI18n();
  updateLangButton();
  renderStatus();
  renderXpTotal(state.xpTotal);
  renderBestXp(state.bestXpPerGame);
  refreshSetupUI();

  document.getElementById("lang-btn").addEventListener("click", switchLang);

  // Авторизация (Firebase). Подписка fires асинхронно — к этому моменту
  // loadFromStorage() уже выполнен, поэтому локальные данные пригодны для миграции.
  document.getElementById("auth-btn")
    ?.addEventListener("click", () => signInWithGoogle().catch(console.error));
  document.getElementById("auth-signout")
    ?.addEventListener("click", () => signOutUser());
  onUserChanged(async (firebaseUser) => {
    if (firebaseUser) {
      state.user = {
        uid:   firebaseUser.uid,
        name:  firebaseUser.displayName,
        photo: firebaseUser.photoURL,
      };
      try {
        const data = await loadUserData(state.user.uid, {
          xpTotal:      state.xpTotal,
          bestXpPerGame: state.bestXpPerGame,
          gamesPlayed:  state.gamesPlayed,
          lang:         getLang(),
        });
        applyUserData(data);
      } catch (e) {
        console.warn("Firestore load failed, using local data:", e);
      }
    } else {
      state.user = null;
    }
    renderAuthUI(state.user);
  });

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
    showInfo();
  });
  document.getElementById("info-back-btn")
    ?.addEventListener("click", goBackFromInfo);
  document.getElementById("end-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm(t("alert.end-early"))) endGame();
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
    renderStatus();
    refreshSetupUI(); // обновить «доступно вопросов» и активировать «Начало»
  } catch (err) {
    statusEl.className = "error";
    statusEl.textContent = t("status.error", { msg: err.message });
    console.error(err);
  }
}

init();
