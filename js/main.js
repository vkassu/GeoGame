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
} from "./i18n.js?v=20260546";
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
  renderXPBar,
  animateXPBar,
  showLevelUpBanner,
  hideLevelUpBanner,
  renderMenuProfile,
  renderTrainingScreen,
  renderBonusGrid,
  revealBonusGrid,
} from "./ui.js?v=20260546";
import { onUserChanged, signInWithGoogle, signOutUser,
         loadUserData, saveUserData } from "./firebase.js?v=20260538";
import { getLevelFromXP, getXPProgress, getUnlockedDifficulties, LEVEL_UNLOCKS }
  from "./levels.js";

const QUESTION_TIME_SEC = 30;
const XP_PER_CORRECT = 10;

// Шкала сложностей темы: index 0..3 → число вариантов ответа. Едина для всех тем.
const DIFFICULTIES = [
  { choicesCount: 4 },   // 0
  { choicesCount: 6 },   // 1
  { choicesCount: 8 },   // 2
  { choicesCount: 10 },  // 3
];

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

// Все темы используют одну шкалу сложностей (TOPICS[key].difficulties[idx].choicesCount).
Object.values(TOPICS).forEach((topic) => { topic.difficulties = DIFFICULTIES; });

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
// Стартовое состояние тем: всё выключено (-1). Игрок сам включает тему,
// выбирая её сложность. -1 = выключено, 0..3 = индекс сложности.
const DEFAULT_TOPIC_DIFFICULTIES = Object.fromEntries(
  Object.keys(TOPICS).map((k) => [k, -1])
);
const DEFAULT_QUESTION_COUNT = 10;
const DEFAULT_INVENTORY = { hints: 0, extraLives: 0, chests: 0 };

const STORAGE = {
  gamesPlayed: "geogame:gamesPlayed",
  xpTotal: "geogame:xpTotal",
  setupRegions: "geogame:setup:regions",
  setupTopics: "geogame:setup:topics", // устаревший (массив тем) — больше не читаем/пишем, оставлен для справки
  setupTopicDifficulties: "geogame:setup:topicDifficulties",
  setupQuestionCount: "geogame:setup:questionCount",
  bestXpPerGame: "geogame:bestXpPerGame",
  inventory: "geogame:inventory",
  lang: "geogame:lang",
};

const state = {
  screen: "menu",
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
  inventory: { ...DEFAULT_INVENTORY }, // { hints, extraLives, chests }
  dataLoaded: false,
  // Ошибки сессии для последующего экрана «Обучение»: { country, topicKey, difficultyIndex, pickedValue }.
  // Очищается в startGame, наполняется в handleAnswer/таймауте, потребляется в startTraining.
  wrongAnswers: [],
  // Режим «Обучение»: XP не начисляется, по окончании возвращаемся на #training-screen.
  isTraining: false,
  // Очередь вопросов для текущей мини-сессии обучения (массив элементов wrongAnswers).
  trainingQueue: [],
  // Текущий вопрос обучения (вытащен из очереди).
  trainingCurrent: null,
  // Приз, выбранный игроком в бонусе (для отображения и начисления).
  bonusPrize: null,
  setup: {
    regions: [...DEFAULT_REGIONS],
    topicDifficulties: { ...DEFAULT_TOPIC_DIFFICULTIES }, // { topicKey: -1..3 }, -1 = выключено
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

  // Инвентарь
  try {
    const inv = JSON.parse(localStorage.getItem(STORAGE.inventory) || "null");
    if (inv && typeof inv === "object") {
      state.inventory = {
        hints: Number(inv.hints) || 0,
        extraLives: Number(inv.extraLives) || 0,
        chests: Number(inv.chests) || 0,
      };
    }
  } catch (_) {}

  try {
    const r = JSON.parse(localStorage.getItem(STORAGE.setupRegions) || "null");
    if (Array.isArray(r)) {
      const valid = r.filter((k) => REGIONS[k]);
      if (valid.length) state.setup.regions = valid;
    }
  } catch (_) {}

  // Сложности тем: объект { topicKey: -1..3 }. Невалидные ключи/значения отбрасываем.
  try {
    const td = JSON.parse(localStorage.getItem(STORAGE.setupTopicDifficulties) || "null");
    if (td && typeof td === "object" && !Array.isArray(td)) {
      const clean = { ...DEFAULT_TOPIC_DIFFICULTIES };
      for (const [k, v] of Object.entries(td)) {
        if (TOPICS[k] && Number.isInteger(v) && v >= -1 && v <= 3) clean[k] = v;
      }
      state.setup.topicDifficulties = clean;
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

// Все валидные тройки (страна, тема, сложность) под выбранные регионы и включённые темы.
// Тема включена, если её difficultyIndex !== -1. Одна страна даёт столько вопросов,
// сколько включённых тем для неё валидны.
function questionPairs() {
  const td = state.setup.topicDifficulties;
  const enabled = Object.entries(td).filter(([, di]) => di !== -1);
  const pairs = [];
  for (const country of regionPoolCountries()) {
    for (const [tk, difficultyIndex] of enabled) {
      if (TOPICS[tk] && TOPICS[tk].valid(country)) {
        pairs.push({ country, topicKey: tk, difficultyIndex });
      }
    }
  }
  return pairs;
}

// ---------- экран настройки (Шаги 1–3) ----------

function persistRegions() {
  localStorage.setItem(STORAGE.setupRegions, JSON.stringify(state.setup.regions));
}
function persistTopicDifficulties() {
  localStorage.setItem(
    STORAGE.setupTopicDifficulties,
    JSON.stringify(state.setup.topicDifficulties)
  );
}

function toggleRegion(key) {
  if (!REGIONS[key]) return;
  const i = state.setup.regions.indexOf(key);
  if (i >= 0) state.setup.regions.splice(i, 1);
  else state.setup.regions.push(key);
  persistRegions();
  refreshSetupUI();
}

// Выбрать сложность темы. Клик по уже выбранной сложности — выключает тему (-1).
function selectTopicDifficulty(topicKey, difficultyIndex) {
  if (!TOPICS[topicKey]) return;
  const current = state.setup.topicDifficulties[topicKey];
  state.setup.topicDifficulties[topicKey] =
    current === difficultyIndex ? -1 : difficultyIndex;
  persistTopicDifficulties();
  refreshSetupUI();
}

function setAllRegions(on) {
  state.setup.regions = on ? Object.keys(REGIONS) : [];
  persistRegions();
  refreshSetupUI();
}
// Только off (Очистить всё): выключить все темы. on=true не реализуем —
// нельзя выбрать все темы без указания сложности.
function setAllTopicDifficulties(on) {
  if (on) return;
  for (const key of Object.keys(TOPICS)) {
    state.setup.topicDifficulties[key] = -1;
  }
  persistTopicDifficulties();
  refreshSetupUI();
}

// Перерисовывает оба экрана настройки (регионы + темы), счётчик доступных и кнопку «Начало».
function refreshSetupUI() {
  const regionItems = Object.keys(REGIONS).map((k) => ({ key: k, label: REGIONS[k].label }));
  const topicItems = Object.keys(TOPICS).map((k) => ({ key: k, label: TOPICS[k].label }));
  const userLevel = getLevelFromXP(state.xpTotal);
  renderRegionGrid(regionItems, new Set(state.setup.regions), toggleRegion);
  renderTopicList(
    topicItems,
    state.setup.topicDifficulties,
    (topicKey) => getUnlockedDifficulties(topicKey, userLevel),
    selectTopicDifficulty
  );
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

function buildOptions(correctCountry, topic, choicesCount) {
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
      if (wrong.length >= choicesCount - 1) break;
      const v = answer(c);
      if (!seen.has(v)) {
        seen.add(v);
        wrong.push(v);
      }
    }
    if (wrong.length >= choicesCount - 1) break;
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
  state.wrongAnswers = [];
  state.isTraining = false;
  state.trainingQueue = [];
  state.trainingCurrent = null;
  state.bonusPrize = null;
  state.screen = "game";
  // На случай если предыдущий цикл закончился в режиме обучения — вернуть видимость кнопок.
  const actionsEl = document.querySelector(".answer-actions");
  if (actionsEl) actionsEl.style.display = "";
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
      // Запоминаем ошибку для будущего экрана «Обучение» (только в обычной партии).
      if (!state.isTraining) {
        state.wrongAnswers.push({
          country: q.country,
          topicKey: q.topicKey,
          difficultyIndex: q.difficultyIndex,
          pickedValue: "—",
        });
      }
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
  const choicesCount = topic.difficulties[q.difficultyIndex].choicesCount;
  const options = buildOptions(country, topic, choicesCount);

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

  const hintBtn = getHintButton();
  if (hintBtn) hintBtn.style.display = ""; // обычная партия — подсказка видна
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
    // XP начисляется только в обычной партии. В обучении — нет.
    if (!state.isTraining) {
      state.xpTotal += XP_PER_CORRECT;
      state.xpEarnedThisGame += XP_PER_CORRECT;
      localStorage.setItem(STORAGE.xpTotal, String(state.xpTotal));
    }
  } else if (!state.isTraining) {
    // Запоминаем ошибку для будущего экрана «Обучение» (только в обычной партии).
    const q = state.questions[state.currentQuestion];
    state.wrongAnswers.push({
      country: q.country,
      topicKey: q.topicKey,
      difficultyIndex: q.difficultyIndex,
      pickedValue: picked.value,
    });
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
  // В режиме обучения — отдельный обработчик (двигаем очередь, без endGame).
  if (state.isTraining) {
    onTrainingResultClick();
    return;
  }
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

  // XP-бар: XP уже начислялся по ходу партии (в handleAnswer), поэтому state.xpTotal
  // уже включает заработанное — «было» восстанавливаем вычитанием xpEarnedThisGame.
  const xpBefore = state.xpTotal - state.xpEarnedThisGame;
  hideLevelUpBanner();
  animateXPBar(
    xpBefore,
    state.xpTotal,
    getXPProgress,
    (newLevel) => {
      const unlocks = LEVEL_UNLOCKS[newLevel] || [];
      const labels = unlocks.map(({ topicKey, difficultyIndex }) => {
        const topicLabel = TOPICS[topicKey]?.label ?? topicKey;
        return topicLabel + " (" + (difficultyIndex + 1) + ")";
      });
      showLevelUpBanner(newLevel, labels);
    }
  );

  if (state.user) {
    saveUserData(state.user.uid, {
      xpTotal:      state.xpTotal,
      bestXpPerGame: state.bestXpPerGame,
      gamesPlayed:  state.gamesPlayed,
      inventory:    state.inventory,
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

// ---------- Обучение и Бонус ----------

// С Result → Training: кнопка «Далее» на экране результата.
function goToTraining() {
  state.screen = "training";
  state.isTraining = false; // на training-screen не идёт активная партия
  renderTrainingScreen(state.wrongAnswers.length);
  showScreen(state.screen);
}

// Старт мини-сессии обучения (повтор ошибочных вопросов).
function startTraining() {
  if (state.wrongAnswers.length === 0) return;
  state.isTraining = true;
  // Очередь — копии записей. Правильно отвеченные выбывают, неправильные остаются.
  state.trainingQueue = state.wrongAnswers.slice();
  state.score = 0;
  state.hintUsed = true; // в обучении подсказка недоступна
  setHintButtonState(false);
  state.screen = "game";
  showScreen(state.screen);
  showTrainingQuestion();
}

function showTrainingQuestion() {
  if (state.trainingQueue.length === 0) {
    finishTraining();
    return;
  }
  hideAnswerResult();
  clearTimer(); // в обучении без таймера
  // В обучении Report/Информация/Конец не нужны — скрываем строку кнопок.
  const actionsEl = document.querySelector(".answer-actions");
  if (actionsEl) actionsEl.style.display = "none";
  const entry = state.trainingQueue[0];
  state.trainingCurrent = entry;
  const topic = TOPICS[entry.topicKey];
  const country = entry.country;
  const correct = topic.answer(country);
  const choicesCount = topic.difficulties[entry.difficultyIndex].choicesCount;
  const options = buildTrainingOptions(country, topic, choicesCount, entry.pickedValue);

  // Шапка: используем счётчик «осталось N» вместо «вопрос i из n».
  const buttons = renderQuestion({
    prompt: topic.prompt(country),
    options,
    questionNumber: state.wrongAnswers.length - state.trainingQueue.length + 1,
    total: state.wrongAnswers.length,
    questionText: topic.question,
  });

  state.currentButtons = buttons;
  state.currentCorrect = correct;

  for (const ent of buttons) {
    ent.button.addEventListener("click", () => {
      handleTrainingAnswer(ent, buttons, correct);
    });
  }

  // В обучении подсказка не нужна — скрываем кнопку целиком (не просто disable).
  const hintBtn = getHintButton();
  if (hintBtn) hintBtn.style.display = "none";
  setHintButtonState(false);
  // Таймер тоже скрываем — обучение не на время.
  const timerEl = document.getElementById("q-timer");
  if (timerEl) timerEl.textContent = "";
}

// Варианты для обучения: правильный + прежний неправильный (как напоминание) + случайные.
function buildTrainingOptions(country, topic, choicesCount, prevPickedValue) {
  const answer = topic.answer;
  const correct = answer(country);
  const seen = new Set([correct]);
  const wrong = [];

  // Сначала вставляем прежний неправильный — если он валиден и не совпадает с правильным.
  if (prevPickedValue && prevPickedValue !== "—" && prevPickedValue !== correct) {
    seen.add(prevPickedValue);
    wrong.push(prevPickedValue);
  }

  // Дополняем случайными дистракторами из всех валидных по теме стран.
  const sources = [
    state.regionPool.filter(topic.valid),
    state.allCountries.filter(topic.valid),
  ];
  for (const src of sources) {
    for (const c of shuffle(src)) {
      if (wrong.length >= choicesCount - 1) break;
      const v = answer(c);
      if (!seen.has(v)) {
        seen.add(v);
        wrong.push(v);
      }
    }
    if (wrong.length >= choicesCount - 1) break;
  }
  return shuffle([correct, ...wrong]);
}

function handleTrainingAnswer(picked, allButtons, correct) {
  const isCorrect = picked.value === correct;
  for (const { button } of allButtons) button.disabled = true;
  markAnswer(picked.button, isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    const correctEntry = allButtons.find((e) => e.value === correct);
    if (correctEntry) markAnswer(correctEntry.button, "correct");
    // Обновляем «pickedValue» текущей записи — в следующий повтор покажется
    // именно этот свежий неправильный, а не самый первый.
    if (state.trainingCurrent) state.trainingCurrent.pickedValue = picked.value;
  }
  renderAnswerResult(isCorrect, picked.value, correct);
  showAnswerResult();

  // Сохраним результат — onTrainingResultClick прочитает.
  state.trainingLastCorrect = isCorrect;
}

function onTrainingResultClick() {
  hideAnswerResult();
  const wasCorrect = state.trainingLastCorrect;
  const entry = state.trainingQueue.shift();
  if (!wasCorrect && entry) {
    state.trainingQueue.push(entry); // в конец очереди — попробует ещё раз
  } else if (wasCorrect && entry) {
    // Убираем закрытую ошибку из общего списка, чтобы счётчик «N осталось» был верным.
    const i = state.wrongAnswers.indexOf(entry);
    if (i >= 0) state.wrongAnswers.splice(i, 1);
  }
  if (state.trainingQueue.length === 0) {
    finishTraining();
  } else {
    showTrainingQuestion();
  }
}

function finishTraining() {
  state.isTraining = false;
  state.trainingQueue = [];
  state.trainingCurrent = null;
  goToTraining(); // обратно на training-screen — теперь с активным «Бонус»
}

// Игрок пропустил обучение → в меню, бонуса нет.
function skipTraining() {
  state.isTraining = false;
  goToMenu();
}

// ---------- Бонус ----------

const BONUS_GRID_SIZE = 25;
// Распределение призов: 12 XP / 6 подсказок / 4 сундука / 3 жизни.
const BONUS_PRIZE_POOL = [
  ...Array(12).fill("xp"),
  ...Array(6).fill("hint"),
  ...Array(4).fill("chest"),
  ...Array(3).fill("life"),
];

// Генерируем приз заданного типа. XP — 25..200% от sessionXP (минимум 25 XP).
function generatePrize(type, sessionXp) {
  if (type === "xp") {
    const base = Math.max(sessionXp, 50); // если сессия пустая — даём хоть что-то
    const pct = 0.25 + Math.random() * 1.75; // 0.25..2.0
    const amount = Math.max(25, Math.round((base * pct) / 5) * 5); // округляем до 5
    return { type: "xp", amount };
  }
  if (type === "hint")  return { type: "hint",  amount: 1 + Math.floor(Math.random() * 3) };  // 1..3
  if (type === "chest") return { type: "chest", amount: 1 + Math.floor(Math.random() * 2) };  // 1..2
  if (type === "life")  return { type: "life",  amount: 1 };
  return { type: "xp", amount: 25 };
}

function startBonus() {
  state.screen = "bonus";
  state.bonusPrize = null;

  // Сетка из 25 ячеек: случайный флаг + сгенерированный приз.
  const pool = shuffle(BONUS_PRIZE_POOL);
  const flagPool = shuffle(state.allCountries).slice(0, BONUS_GRID_SIZE);
  const cells = [];
  for (let i = 0; i < BONUS_GRID_SIZE; i++) {
    const country = flagPool[i] || state.allCountries[0];
    const flags = country?.flags || {};
    cells.push({
      country,
      cca2: country?.cca2 || "",
      flagSrcs: [flags.svg, flags.png].filter(Boolean),
      prize: generatePrize(pool[i], state.xpEarnedThisGame),
    });
  }
  state.bonusCells = cells;

  renderBonusGrid(cells, onBonusCellPicked);
  showScreen(state.screen);
}

function onBonusCellPicked(index) {
  const cell = state.bonusCells[index];
  state.bonusPrize = cell.prize;

  const countryName = getName(cell.country);
  const prizeText = formatPrize(cell.prize);
  revealBonusGrid(state.bonusCells, index, countryName, prizeText);
}

function formatPrize(prize) {
  switch (prize.type) {
    case "xp":    return t("bonus.prize.xp",    { n: prize.amount });
    case "hint":  return t("bonus.prize.hint",  { n: prize.amount });
    case "chest": return t("bonus.prize.chest", { n: prize.amount });
    case "life":  return t("bonus.prize.life",  { n: prize.amount });
    default:      return "?";
  }
}

// Игрок нажал «Конец» на бонусе → начисляем приз, возвращаемся в меню.
function finishBonus() {
  const prize = state.bonusPrize;
  if (prize) {
    if (prize.type === "xp") {
      state.xpTotal += prize.amount;
      localStorage.setItem(STORAGE.xpTotal, String(state.xpTotal));
    } else if (prize.type === "hint") {
      state.inventory.hints += prize.amount;
    } else if (prize.type === "chest") {
      state.inventory.chests += prize.amount;
    } else if (prize.type === "life") {
      state.inventory.extraLives += prize.amount;
    }
    localStorage.setItem(STORAGE.inventory, JSON.stringify(state.inventory));

    if (state.user) {
      saveUserData(state.user.uid, {
        xpTotal:    state.xpTotal,
        inventory:  state.inventory,
      }).catch(console.error);
    }
  }
  state.bonusPrize = null;
  goToMenu();
}

// Перерисовать профиль в главном меню (аватар, имя, уровень, XP-бар, инвентарь, кнопки).
function refreshMenuScreen() {
  renderMenuProfile({
    avatarUrl: state.user?.photo ?? null,
    username: state.user?.name ?? t("menu.guest"),
    level: getLevelFromXP(state.xpTotal),
    xpProgress: getXPProgress(state.xpTotal),
    inventory: state.inventory,
    isLoggedIn: !!state.user,
    lang: getLang(),
  });
}

function goToMenu() {
  state.screen = "menu";
  refreshMenuScreen();
  showScreen(state.screen);
}

// Кнопка «На главную» (← меню). Если партия идёт — спрашиваем подтверждение.
function goHome() {
  if (state.screen === "game" && !state.isGameOver) {
    if (!confirm(t("alert.go-home"))) return;
  }
  goToMenu();
}

function switchLang() {
  const next = getLang() === "ru" ? "en" : "ru";
  setLang(next);
  localStorage.setItem(STORAGE.lang, next);
  updateLangButton();
  applyI18n();
  renderStatus();
  refreshSetupUI();
  refreshMenuScreen();
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
  if (data.inventory && typeof data.inventory === "object") {
    state.inventory = {
      hints: Number(data.inventory.hints) || 0,
      extraLives: Number(data.inventory.extraLives) || 0,
      chests: Number(data.inventory.chests) || 0,
    };
  }
  // Обновить localStorage чтобы совпадал с облаком
  localStorage.setItem(STORAGE.xpTotal,      String(state.xpTotal));
  localStorage.setItem(STORAGE.bestXpPerGame, String(state.bestXpPerGame));
  localStorage.setItem(STORAGE.gamesPlayed,   String(state.gamesPlayed));
  localStorage.setItem(STORAGE.inventory,     JSON.stringify(state.inventory));
  // Обновить UI (инвентарь — пока без UI, появится в #17Б)
  renderXpTotal(state.xpTotal);
  renderBestXp(state.bestXpPerGame);
  renderGamesPlayed(state.gamesPlayed);
}

// Полный сброс прогресса («как в первый раз»): XP/рекорд/партии/инвентарь/выбор тем.
// Чистит localStorage и, если пользователь залогинен, обнуляет его документ в Firestore.
function resetProgress() {
  if (!confirm(t("reset.confirm"))) return;

  state.xpTotal = 0;
  state.bestXpPerGame = 0;
  state.gamesPlayed = 0;
  state.xpEarnedThisGame = 0;
  state.inventory = { ...DEFAULT_INVENTORY };
  state.setup.topicDifficulties = { ...DEFAULT_TOPIC_DIFFICULTIES };

  localStorage.setItem(STORAGE.xpTotal, "0");
  localStorage.setItem(STORAGE.bestXpPerGame, "0");
  localStorage.setItem(STORAGE.gamesPlayed, "0");
  localStorage.setItem(STORAGE.inventory, JSON.stringify(state.inventory));
  persistTopicDifficulties();

  // Облако: перезаписываем документ нулями, иначе при следующем входе оно вернёт прогресс.
  if (state.user) {
    saveUserData(state.user.uid, {
      xpTotal: 0,
      bestXpPerGame: 0,
      gamesPlayed: 0,
      inventory: state.inventory,
    }).catch(console.error);
  }

  renderXpTotal(state.xpTotal);
  renderBestXp(state.bestXpPerGame);
  renderGamesPlayed(state.gamesPlayed);
  refreshSetupUI();
  refreshMenuScreen();
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
  refreshMenuScreen();
  showScreen("menu");

  document.getElementById("lang-btn").addEventListener("click", switchLang);
  document.getElementById("reset-progress-btn")?.addEventListener("click", resetProgress);

  // Главное меню
  document.getElementById("menu-new-game-btn").addEventListener("click", goToStart);
  document.getElementById("menu-encyclopedia-btn").addEventListener("click", () => console.log("Энциклопедия: не реализовано"));
  document.getElementById("menu-quests-btn").addEventListener("click", () => console.log("Задания: не реализовано"));
  document.getElementById("menu-auth-btn").addEventListener("click", () => {
    if (state.user) signOutUser();
    else signInWithGoogle().catch(console.error);
  });
  document.getElementById("menu-lang-btn").addEventListener("click", switchLang);

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
          inventory:    state.inventory,
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
    refreshMenuScreen();
  });

  // На экране результата кнопка ведёт в «Обучение» (а не сразу в новую партию).
  getPlayAgainButton().addEventListener("click", goToTraining);
  getHomeButton().addEventListener("click", goHome);

  // Экран «Обучение»
  document.getElementById("training-start-btn")?.addEventListener("click", startTraining);
  document.getElementById("training-bonus-btn")?.addEventListener("click", startBonus);
  document.getElementById("training-skip-btn")?.addEventListener("click", skipTraining);

  // Экран «Бонус»
  document.getElementById("bonus-end-btn")?.addEventListener("click", finishBonus);
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
  document.getElementById("regions-back").addEventListener("click", goToMenu);

  // Шаг 2 — темы
  document.getElementById("topics-clear").addEventListener("click", () => setAllTopicDifficulties(false));
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
