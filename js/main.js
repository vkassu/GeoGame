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
  getDensityFormatted,
  hasDensity,
  religionName,
  hasReligion,
  hasSilhouette,
  hasMapFind,
} from "./data.js?v=20260578";
import {
  getLang,
  setLang,
  applyI18n,
  t,
  TOPIC_LABELS,
  TOPIC_QUESTIONS,
  REGION_LABELS,
} from "./i18n.js?v=20260578";
import {
  showScreen,
  getPlayAgainButton,
  getHomeButton,
  getHintButton,
  updateHintUI,
  applyHintToOptions,
  renderAnswerResult,
  showAnswerResult,
  hideAnswerResult,
  updateTimer,
  renderQuestion,
  preloadNextQuestion,
  CHEST_HTML,
  markAnswer,
  renderResultSummary,
  renderGamesPlayed,
  renderXpTotal,
  renderRegionGrid,
  renderTopicList,
  renderBestXp,
  renderAvailableCount,
  setNavButtonEnabled,
  renderInfoScreen,
  renderEncRegions,
  renderEncCountries,
  renderCountryCard,
  animateXPBar,
  showLevelUpBanner,
  hideLevelUpBanner,
  renderMenuProfile,
  renderTrainingScreen,
  renderBonusGrid,
  revealBonusGrid,
  renderTasks,
  setDailyCountdownText,
  setQuestsTimerText,
  setTasksBadge,
  renderAchievements,
  setAchievementsBadge,
  showAchievementPopup,
  hideAchievementPopup,
  showXpRewardPopup,
  hideXpRewardPopup,
} from "./ui.js?v=20260580";
import { onUserChanged, signInWithGoogle, signOutUser,
         loadUserData, saveUserData } from "./firebase.js?v=20260539";
import { getLevelFromXP, getXPProgress, getUnlockedDifficulties, getUnlockLevel,
         initLevelUnlocks, getUnlocksForLevel }
  from "./levels.js?v=20260574";
import { ACHIEVEMENT_DEFS, initAchievements, advanceAchievement,
         setAchievementProgress, getAchievementBonus, applyBonus }
  from "./achievements.js?v=20260577";
import { initBackgroundRotation } from "./bg.js?v=20260572";

const QUESTION_TIME_SEC = 30;

// XP за правильный ответ зависит от сложности темы (difficultyIndex 0..3).
// 0=4 варианта → 10 XP; 1=6 → 15; 2=8 → 25; 3=10 → 40. Чем больше вариантов,
// тем больше окно ошибки → больше награда. Бонус достижений применяется поверх
// (applyBonus) — это уже в handleAnswer.
const XP_BY_DIFFICULTY = [10, 15, 25, 40];
function getXPForAnswer(difficultyIndex) {
  return XP_BY_DIFFICULTY[difficultyIndex ?? 0] ?? 10;
}

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
//
// Порядок ключей = порядок UI на экране «Темы» = порядок разблокировок
// (initLevelUnlocks(Object.keys(TOPICS)) ниже строит LEVEL_UNLOCKS из этого
// порядка). Группировка: визуал-первой (карта/флаг/силуэт/герб) → ключевая
// инфа о стране (столица/население/самоназвание/язык/религия/валюта) →
// инверсии и статистика (по столице → страна, плотность, площадь).
const TOPICS = {
  mapFind: {
    get label() { return TOPIC_LABELS.mapFind[getLang()]; },
    get question() { return TOPIC_QUESTIONS.mapFind[getLang()]; },
    prompt: (c) => ({ type: "mapFind", country: c }),
    answer: (c) => getName(c),
    valid: (c) => hasMapFind(c),
  },
  country: {
    get label() { return TOPIC_LABELS.country[getLang()]; },
    get question() { return TOPIC_QUESTIONS.country[getLang()]; },
    prompt: (c) => ({ type: "flag", country: c }),
    answer: (c) => getName(c),
    valid: () => true,
  },
  silhouette: {
    get label() { return TOPIC_LABELS.silhouette[getLang()]; },
    get question() { return TOPIC_QUESTIONS.silhouette[getLang()]; },
    prompt: (c) => ({ type: "silhouette", country: c }),
    answer: (c) => getName(c),
    valid: (c) => hasSilhouette(c),
  },
  coatOfArms: {
    get label() { return TOPIC_LABELS.coatOfArms[getLang()]; },
    get question() { return TOPIC_QUESTIONS.coatOfArms[getLang()]; },
    prompt: (c) => ({ type: "coa", country: c }),
    answer: (c) => getName(c),
    valid: hasCoatOfArms,
  },
  capital: {
    get label() { return TOPIC_LABELS.capital[getLang()]; },
    get question() { return TOPIC_QUESTIONS.capital[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: (c) => getCapital(c),
    valid: hasCapital,
  },
  population: {
    get label() { return TOPIC_LABELS.population[getLang()]; },
    get question() { return TOPIC_QUESTIONS.population[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: (c) => getPopulationFormatted(c),
    valid: (c) => c.population > 0,
  },
  nativeName: {
    get label() { return TOPIC_LABELS.nativeName[getLang()]; },
    get question() { return TOPIC_QUESTIONS.nativeName[getLang()]; },
    prompt: (c) => ({ type: "text", text: nativeNameStr(c) }),
    answer: (c) => getName(c),
    valid: hasNativeName,
  },
  language: {
    get label() { return TOPIC_LABELS.language[getLang()]; },
    get question() { return TOPIC_QUESTIONS.language[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: languageName,
    valid: hasLanguages,
  },
  religion: {
    get label() { return TOPIC_LABELS.religion[getLang()]; },
    get question() { return TOPIC_QUESTIONS.religion[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: (c) => religionName(c),
    valid: (c) => hasReligion(c),
  },
  currency: {
    get label() { return TOPIC_LABELS.currency[getLang()]; },
    get question() { return TOPIC_QUESTIONS.currency[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: currencyName,
    valid: hasCurrencies,
  },
  countryByCapital: {
    get label() { return TOPIC_LABELS.countryByCapital[getLang()]; },
    get question() { return TOPIC_QUESTIONS.countryByCapital[getLang()]; },
    prompt: (c) => ({ type: "text", text: getCapital(c) }),
    answer: (c) => getName(c),
    valid: hasCapital,
  },
  density: {
    get label() { return TOPIC_LABELS.density[getLang()]; },
    get question() { return TOPIC_QUESTIONS.density[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: (c) => getDensityFormatted(c, getLang()),
    valid: (c) => hasDensity(c),
  },
  area: {
    get label() { return TOPIC_LABELS.area[getLang()]; },
    get question() { return TOPIC_QUESTIONS.area[getLang()]; },
    prompt: (c) => ({ type: "text", text: getName(c) }),
    answer: (c) => getAreaFormatted(c),
    valid: (c) => c.area > 0,
  },
};

// Все темы используют одну шкалу сложностей (TOPICS[key].difficulties[idx].choicesCount).
Object.values(TOPICS).forEach((topic) => { topic.difficulties = DIFFICULTIES; });

// Уровни разблокировки строятся из порядка тем в TOPICS (единый источник правды) —
// замки в UI идут строго по возрастанию сверху вниз. См. CLAUDE.md «Соглашения в коде».
initLevelUnlocks(Object.keys(TOPICS));

// Регионы: ключ → { label (геттер, lang-aware), apiValue }. apiValue сверяется с country.region.
const REGIONS = {
  europe:   { get label() { return REGION_LABELS.europe[getLang()]; },   apiValue: "Europe"   },
  asia:     { get label() { return REGION_LABELS.asia[getLang()]; },     apiValue: "Asia"     },
  africa:   { get label() { return REGION_LABELS.africa[getLang()]; },   apiValue: "Africa"   },
  americas: { get label() { return REGION_LABELS.americas[getLang()]; }, apiValue: "Americas" },
  oceania:  { get label() { return REGION_LABELS.oceania[getLang()]; },  apiValue: "Oceania"  },
};

// Цвета карточек регионов в Энциклопедии (вид 1).
const ENC_REGION_COLORS = {
  europe:   "#3a7bd5",
  asia:     "#c0392b",
  africa:   "#e8a020",
  americas: "#27ae60",
  oceania:  "#16a085",
};

const QUESTION_COUNTS = [10, 25, 50, 75, 100];

const DEFAULT_REGIONS = ["europe", "asia", "africa", "americas", "oceania"];
// Стартовое состояние тем: всё выключено (-1). Игрок сам включает тему,
// выбирая её сложность. -1 = выключено, 0..3 = индекс сложности.
const DEFAULT_TOPIC_DIFFICULTIES = Object.fromEntries(
  Object.keys(TOPICS).map((k) => [k, -1])
);
const DEFAULT_QUESTION_COUNT = 10;
const DEFAULT_INVENTORY = { chests: 0 };

// ---- Задания: дейлик / стрик / ежедневные квесты ----
// Дейлик и квесты сбрасываются по дате (а не по 24ч-таймстампу) — единый сброс в полночь.
const DAILY_PRIZE_XP = 75;
const DAILY_PRIZE_CHESTS = 5;

// Вехи стрика (разовые награды, выдаются в endGame при достижении).
const STREAK_MILESTONES = [
  { days: 3,  xp: 50,  chests: 3 },
  { days: 7,  xp: 150, chests: 10 },
  { days: 14, xp: 300, chests: 20 },
  { days: 30, xp: 500, chests: 50 },
];

// Пулы ежедневных квестов по тирам. Каждый квест: { id, hook, goal }.
// hook — тип трекера прогресса (см. updateQuestProgress). label — через i18n: quest.<id>.
const QUEST_POOL_EASY = [
  { id: "easy:play1game", hook: "games",                 goal: 1 },
  { id: "easy:correct5",  hook: "correct_any",           goal: 5 },
  { id: "easy:earn30xp",  hook: "xp",                     goal: 30 },
  { id: "easy:play10q",   hook: "questions_in_game",      goal: 10 },
  { id: "easy:streak3",   hook: "streak",                 goal: 3 },
  { id: "easy:flags3",    hook: "correct_topic:country",  goal: 3 },
];
const QUEST_POOL_MEDIUM = [
  { id: "medium:play2games", hook: "games",                 goal: 2 },
  { id: "medium:correct15",  hook: "correct_any",           goal: 15 },
  { id: "medium:earn100xp",  hook: "xp",                     goal: 100 },
  { id: "medium:streak8",    hook: "streak",                 goal: 8 },
  { id: "medium:capitals5",  hook: "correct_topic:capital",  goal: 5 },
  { id: "medium:play25q",    hook: "questions_in_game",      goal: 25 },
];
const QUEST_POOL_HARD = [
  { id: "hard:play3games", hook: "games",            goal: 3 },
  { id: "hard:correct30",  hook: "correct_any",      goal: 30 },
  { id: "hard:earn300xp",  hook: "xp",               goal: 300 },
  { id: "hard:streak15",   hook: "streak",           goal: 15 },
  { id: "hard:play50q",    hook: "questions_in_game",goal: 50 },
  { id: "hard:multitopic", hook: "topics_in_game",   goal: 4 },
];
// Награды по тиру (тир = id.split(":")[0]).
const QUEST_REWARDS = {
  easy:   { xp: 25,  chests: 1 },
  medium: { xp: 75,  chests: 3 },
  hard:   { xp: 200, chests: 8 },
};

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
  dailyPrize: "geogame:daily-prize",
  streak: "geogame:streak",
  dailyQuests: "geogame:daily-quests",
  achievements: "geogame:achievements",
  achievementsNew: "geogame:achievements-new",
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
  // Подсказка с перезарядкой: hintCharge — сколько правильных ПОДРЯД (0..5);
  // при 5 → hintAvailable=true и hintCharge сбрасывается; неверный/таймаут → hintCharge=0.
  hintCharge: 0,
  hintAvailable: false,
  currentButtons: [],
  currentCorrect: "",
  xpTotal: 0,
  xpEarnedThisGame: 0,
  bestXpPerGame: 0,
  inventory: { ...DEFAULT_INVENTORY }, // { chests }
  dataLoaded: false,
  // Были ли в этой партии ошибки (для текста экрана «Обучение»: «Нет ошибок» vs «Завершено»).
  sessionHadErrors: false,
  // Ошибки сессии для последующего экрана «Обучение»: { country, topicKey, difficultyIndex, pickedValue }.
  // Очищается в startGame, наполняется в handleAnswer/таймауте, потребляется в startTraining.
  wrongAnswers: [],
  // Режим «Обучение»: XP не начисляется, по окончании возвращаемся на #training-screen.
  isTraining: false,
  // Очередь вопросов для текущей мини-сессии обучения (массив элементов wrongAnswers).
  trainingQueue: [],
  // Текущий вопрос обучения (вытащен из очереди).
  trainingCurrent: null,
  // Приз, выбранный игроком в бонусе (для отображения и начисления). Сбрасывается в startGame.
  bonusPrize: null,
  // XP до начала текущей сессии (фиксируется в endGame) — стартовая точка XP-бара на result.
  xpBeforeSession: 0,
  // Задания (только localStorage; Firestore-синк позже). Награды начисляют XP/сундуки,
  // которые синкаются вместе с обычным прогрессом.
  dailyPrize: { lastClaimDate: "" },                             // { lastClaimDate: "YYYY-MM-DD" }
  streak: { count: 0, lastGameDate: "", milestonesClaimedAt: [] }, // date "YYYY-MM-DD"
  dailyQuests: { date: "", quests: [] },                          // { date, quests: [...] }
  // Достижения: { "category:id": { progress, level } }. Заполняется initAchievements.
  achievements: {},
  correctStreak: 0,        // правильных подряд в текущей сессии (для mastery:sniper)
  speedCount: 0,           // ответов быстрее 5 сек в сессии (для mastery:speed)
  questionStartTime: 0,    // время показа текущего вопроса (для mastery:speed)
  bonusXpCredited: 0,      // фактически начисленный XP за бонусную ячейку (с учётом бонуса достижений)
  achievementQueue: [],    // очередь попапов новых уровней достижений
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
      // Берём только chests; устаревшие hints/extraLives игнорируем.
      state.inventory = { chests: Number(inv.chests) || 0 };
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

  // Дейлик (дейт-бэйзд). Старый формат { lastClaim: ms } игнорируем — приз снова доступен.
  try {
    const dp = JSON.parse(localStorage.getItem(STORAGE.dailyPrize) || "null");
    if (dp && typeof dp === "object" && typeof dp.lastClaimDate === "string") {
      state.dailyPrize = { lastClaimDate: dp.lastClaimDate };
    }
  } catch (_) {}

  // Стрик
  try {
    const st = JSON.parse(localStorage.getItem(STORAGE.streak) || "null");
    if (st && typeof st === "object") {
      state.streak = {
        count: Number(st.count) || 0,
        lastGameDate: typeof st.lastGameDate === "string" ? st.lastGameDate : "",
        milestonesClaimedAt: Array.isArray(st.milestonesClaimedAt) ? st.milestonesClaimedAt : [],
      };
    }
  } catch (_) {}
  // Если серия оборвалась (последняя игра не сегодня и не вчера) — обнуляем для отображения.
  if (state.streak.lastGameDate
      && state.streak.lastGameDate !== todayStr()
      && state.streak.lastGameDate !== yesterdayStr()) {
    state.streak.count = 0;
    state.streak.milestonesClaimedAt = [];
    persistStreak();
  }

  // Ежедневные задания
  try {
    const dq = JSON.parse(localStorage.getItem(STORAGE.dailyQuests) || "null");
    if (dq && typeof dq === "object" && Array.isArray(dq.quests)) state.dailyQuests = dq;
  } catch (_) {}

  // Достижения (уровень пересчитывается из прогресса внутри initAchievements).
  try {
    state.achievements = initAchievements(JSON.parse(localStorage.getItem(STORAGE.achievements) || "null"));
  } catch (_) {
    state.achievements = initAchievements(null);
  }
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
    selectTopicDifficulty,
    (topicKey, idx) => getUnlockLevel(topicKey, idx)
  );
  for (const btn of document.querySelectorAll(".count-btn")) {
    btn.textContent = t("count.q", { n: btn.dataset.count });
  }
  const available = state.dataLoaded ? questionPairs().length : null;
  renderAvailableCount(available === null ? "—" : available);
  // «Начало» активна только если есть хотя бы один реальный вопрос.
  setNavButtonEnabled("regions-next", state.dataLoaded && available > 0);
  // Подсказка под кнопкой: почему нельзя начать.
  const hintEl = document.getElementById("start-hint");
  if (hintEl) {
    const noRegions = state.setup.regions.length === 0;
    const noTopics = Object.values(state.setup.topicDifficulties).every((v) => v < 0);
    if (state.dataLoaded && questionPairs().length === 0) {
      let key;
      if (noRegions && noTopics) key = "start.hint.both";
      else if (noTopics) key = "start.hint.notopics";
      else key = "start.hint.noregions";
      hintEl.textContent = t(key);
      hintEl.style.display = "";
    } else {
      hintEl.style.display = "none";
    }
  }
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
  state.hintCharge = 0;
  state.hintAvailable = false;
  state.currentButtons = [];
  state.currentCorrect = "";
  state.wrongAnswers = [];
  state.sessionHadErrors = false;
  state.isTraining = false;
  state.trainingQueue = [];
  state.trainingCurrent = null;
  state.bonusPrize = null;
  state.bonusXpCredited = 0;
  state.xpBeforeSession = 0;
  // Сессионные трекеры достижений (снайпер/молния).
  state.correctStreak = 0;
  state.speedCount = 0;
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
      state.hintCharge = 0; // серия правильных прервана
      state.correctStreak = 0; // снайпер/молния сбрасываются при таймауте
      state.speedCount = 0;
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
  state.questionStartTime = Date.now(); // для достижения mastery:speed
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

  // Предзагрузка ассета следующего вопроса — пока игрок думает, картинка
  // уже летит в HTTP-кеш браузера. На последнем вопросе nextQ = undefined.
  preloadNextQuestion(state.questions[index + 1]);

  const hintBtn = getHintButton();
  if (hintBtn) hintBtn.style.display = ""; // обычная партия — подсказка видна
  updateHintUI(state.hintCharge, state.hintAvailable);
}

function handleHintClick() {
  if (!state.hintAvailable) return;
  applyHintToOptions(state.currentButtons, state.currentCorrect);
  // Подсказка использована — следующий цикл с нуля.
  state.hintAvailable = false;
  state.hintCharge = 0;
  updateHintUI(state.hintCharge, state.hintAvailable);
}

function handleAnswer(picked, allButtons, correct) {
  clearTimer();
  const isCorrect = picked.value === correct;
  // Сколько XP фактически начислено за этот ответ (для отображения на экране
  // результата ответа). В обучении/при неверном — 0.
  let earned = 0;
  if (isCorrect) {
    state.score++;
    // Перезарядка подсказки: 5 правильных подряд → подсказка доступна.
    state.hintCharge++;
    if (state.hintCharge >= 5) {
      state.hintAvailable = true;
      state.hintCharge = 0;
    }

    // --- Достижения: трекинг при правильном ответе (handleAnswer — только обычная партия) ---
    const q = state.questions[state.currentQuestion];
    const regionMap = {
      Europe: "region:europe", Asia: "region:asia", Africa: "region:africa",
      Americas: "region:americas", Oceania: "region:oceania",
    };
    const newLevels = [];
    const rKey = regionMap[q.country.region];
    if (rKey) newLevels.push(...advanceAchievement(state.achievements, rKey, 1));
    newLevels.push(...advanceAchievement(state.achievements, "topic:" + q.topicKey, 1));
    // Снайпер: 15 правильных подряд в сессии.
    state.correctStreak++;
    if (state.correctStreak >= 15) newLevels.push(...advanceAchievement(state.achievements, "mastery:sniper", 1));
    // Молния: 10 ответов быстрее 5 сек в сессии.
    const elapsed = (Date.now() - state.questionStartTime) / 1000;
    if (elapsed < 5) {
      state.speedCount++;
      if (state.speedCount >= 10) newLevels.push(...advanceAchievement(state.achievements, "mastery:speed", 1));
    }
    persistAchievements();
    if (newLevels.length) handleNewAchievementLevels(newLevels);

    // XP начисляется только в обычной партии. В обучении — нет. Применяем бонус достижений.
    // q уже взят выше (state.questions[state.currentQuestion]) — переиспользуем
    // вместо повторного обращения по индексу.
    if (!state.isTraining) {
      earned = applyBonus(getXPForAnswer(q.difficultyIndex),
                          getAchievementBonus(state.achievements));
      state.xpTotal += earned;
      state.xpEarnedThisGame += earned;
      localStorage.setItem(STORAGE.xpTotal, String(state.xpTotal));
      // Хуки квестов при правильном ответе.
      updateQuestProgress("correct_any", 1);
      updateQuestProgress("correct_topic:" + q.topicKey, 1);
      updateQuestProgress("streak", state.correctStreak);
      updateQuestProgress("xp", earned);
    }
  } else {
    state.hintCharge = 0; // серия прервана
    state.correctStreak = 0; // снайпер/молния сбрасываются при ошибке
    state.speedCount = 0;
    if (!state.isTraining) {
      // Запоминаем ошибку для будущего экрана «Обучение» (только в обычной партии).
      const q = state.questions[state.currentQuestion];
      state.wrongAnswers.push({
        country: q.country,
        topicKey: q.topicKey,
        difficultyIndex: q.difficultyIndex,
        pickedValue: picked.value,
      });
    }
  }
  updateHintUI(state.hintCharge, state.hintAvailable);

  for (const { button } of allButtons) {
    button.disabled = true;
  }
  markAnswer(picked.button, isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    const correctEntry = allButtons.find((e) => e.value === correct);
    if (correctEntry) markAnswer(correctEntry.button, "correct");
  }

  renderAnswerResult(isCorrect, picked.value, correct, earned);
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

// Вычисляет lang-aware значения и кладёт их во временные поля country._* —
// UI-слой только читает (не дёргает бизнес-логику). Общий помощник для карточки
// страны (экран «Информация» в игре и «Энциклопедия» → детальный вид).
function decorateCountry(country) {
  country._displayName = getName(country);
  country._capital     = getCapital(country);
  country._population  = getPopulationFormatted(country);
  country._area        = getAreaFormatted(country);
  country._density     = hasDensity(country) ? getDensityFormatted(country, getLang()) : null;
  country._language    = hasLanguages(country) ? languageName(country) : null;
  country._currency    = hasCurrencies(country) ? currencyName(country) : null;
  country._religion    = hasReligion(country) ? religionName(country) : null;
  country._nativeName  = hasNativeName(country) ? nativeNameStr(country) : null;
}

// Открыть карточку страны текущего вопроса (кнопка «Информация» на экране ответа).
function showInfo() {
  // В обучении актуальна trainingCurrent.country, а не state.questions[...].
  const country = state.isTraining
    ? state.trainingCurrent?.country
    : state.questions[state.currentQuestion]?.country;
  if (!country) return;

  decorateCountry(country);
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
  // Зафиксировать, были ли ошибки (для текста экрана «Обучение»; wrongAnswers потом убывает в тренировке).
  state.sessionHadErrors = state.wrongAnswers.length > 0;

  state.gamesPlayed += 1;
  localStorage.setItem(STORAGE.gamesPlayed, String(state.gamesPlayed));

  // Рекорд — максимальный XP за одну партию (один общий, не по теме/настройкам).
  if (state.xpEarnedThisGame > state.bestXpPerGame) {
    state.bestXpPerGame = state.xpEarnedThisGame;
    localStorage.setItem(STORAGE.bestXpPerGame, String(state.bestXpPerGame));
  }

  // XP уже начислялся по ходу партии (handleAnswer), поэтому state.xpTotal уже включает
  // заработанное за игру. Запоминаем «было до сессии» — стартовая точка XP-бара на result
  // (анимация запускается в конце потока, после бонуса).
  state.xpBeforeSession = state.xpTotal - state.xpEarnedThisGame;

  const activeTopicsCount = Object.values(state.setup.topicDifficulties).filter((v) => v >= 0).length;

  // --- Задания: трекинг по итогам партии (хуки games / questions_in_game / topics_in_game) ---
  updateQuestProgress("games", 1);
  updateQuestProgress("questions_in_game", state.questions.length);
  updateQuestProgress("topics_in_game", activeTopicsCount);
  // Стрик: обновить счётчик и выдать награды за вехи (меняет xpTotal/инвентарь).
  updateStreak();

  // --- Достижения: объём и мастерство по итогам партии ---
  const achNewLevels = [];
  achNewLevels.push(...advanceAchievement(state.achievements, "volume:games", 1));
  achNewLevels.push(...setAchievementProgress(state.achievements, "volume:xp", state.xpTotal));
  if (state.wrongAnswers.length === 0 && state.questions.length >= 10)
    achNewLevels.push(...advanceAchievement(state.achievements, "mastery:perfect", 1));
  if (activeTopicsCount === Object.keys(TOPICS).length)
    achNewLevels.push(...advanceAchievement(state.achievements, "mastery:alltopics", 1));
  if (state.setup.regions.length === Object.keys(REGIONS).length)
    achNewLevels.push(...advanceAchievement(state.achievements, "mastery:allregions", 1));
  persistAchievements();
  if (achNewLevels.length) handleNewAchievementLevels(achNewLevels);

  // Сохранение игрового XP/рекорда в облако (бонусный XP сохранится позже в finishBonus).
  // xpTotal/inventory уже включают награды за вехи стрика.
  if (state.user) {
    saveUserData(state.user.uid, {
      xpTotal:      state.xpTotal,
      bestXpPerGame: state.bestXpPerGame,
      gamesPlayed:  state.gamesPlayed,
      inventory:    state.inventory,
      streak:       state.streak,       // #47: серия (обновляется в endGame)
      dailyQuests:  state.dailyQuests,  // #47: прогресс заданий за партию
    }).catch(console.error);
  }

  // Новый порядок: конец игры → Обучение → Бонус → Результат → меню.
  goToTraining();
}

// Финальный экран сессии (после Обучения/Бонуса): партия / бонус / итого + анимация XP-бара.
function goToResult() {
  state.screen = "result";
  const sessionXP = state.xpEarnedThisGame;
  // Для XP-приза показываем фактически начисленное (с бонусом достижений); для сундука — текст приза.
  let bonusXP = 0;
  let bonusText = null;
  if (state.bonusPrize) {
    if (state.bonusPrize.type === "xp") {
      bonusXP = state.bonusXpCredited || state.bonusPrize.amount;
      bonusText = t("bonus.prize.xp", { n: bonusXP });
    } else {
      bonusText = formatPrize(state.bonusPrize);
    }
  }

  renderResultSummary({
    correct: state.score,
    total: state.questions.length,
    sessionXP,
    bonusText,
    totalXP: sessionXP + bonusXP,
    achBonus: getAchievementBonus(state.achievements),
  });
  renderGamesPlayed(state.gamesPlayed);
  renderXpTotal(state.xpTotal);
  renderBestXp(state.bestXpPerGame);
  showScreen(state.screen);

  // XP-бар от «до сессии» до текущего total (включает игровой + бонусный XP).
  hideLevelUpBanner();
  animateXPBar(
    state.xpBeforeSession,
    state.xpTotal,
    getXPProgress,
    (newLevel) => {
      const unlocks = getUnlocksForLevel(newLevel);
      const labels = unlocks.map(({ topicKey, difficultyIndex }) => {
        const topicLabel = TOPICS[topicKey]?.label ?? topicKey;
        return topicLabel + " (" + (difficultyIndex + 1) + ")";
      });
      showLevelUpBanner(newLevel, labels);
    }
  );
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
  document.getElementById("game-screen")?.classList.remove("training-mode");
  renderTrainingScreen(state.wrongAnswers.length, state.sessionHadErrors);
  showScreen(state.screen);
}

// Старт мини-сессии обучения (повтор ошибочных вопросов).
function startTraining() {
  if (state.wrongAnswers.length === 0) return;
  state.isTraining = true;
  // Очередь — копии записей. Правильно отвеченные выбывают, неправильные остаются.
  state.trainingQueue = state.wrongAnswers.slice();
  // state.score НЕ сбрасываем: это счёт партии, нужен для result-экрана в конце потока
  // (обучение свой счёт не ведёт). В обучении нет таймера/подсказки — скрываем .meta классом.
  document.getElementById("game-screen")?.classList.add("training-mode");
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
  // Подсказка и таймер в обучении не нужны — вся .meta скрыта классом
  // .training-mode на #game-screen (см. startTraining), отдельно прятать не надо.
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
  document.getElementById("game-screen")?.classList.remove("training-mode");
  // Достижение «Прилежный» — завершить обучение 10 раз (skipTraining сюда не заходит).
  const achNewLevels = advanceAchievement(state.achievements, "mastery:training", 1);
  persistAchievements();
  if (achNewLevels.length) handleNewAchievementLevels(achNewLevels);
  refreshMenuScreen();
  goToTraining(); // обратно на training-screen — теперь с активным «Бонус»
}

// Игрок пропустил обучение → сразу на result (без бонуса; bonusPrize остаётся null).
function skipTraining() {
  state.isTraining = false;
  document.getElementById("game-screen")?.classList.remove("training-mode");
  goToResult();
}

// ---------- Бонус ----------

const BONUS_GRID_SIZE = 25;
// Распределение призов: 15 XP / 10 сундуков.
const BONUS_PRIZE_POOL = [
  ...Array(15).fill("xp"),
  ...Array(10).fill("chest"),
];

// Генерируем приз заданного типа. XP — 25..200% от sessionXP (минимум 25 XP); сундук — 3..5 шт.
function generatePrize(type, sessionXp) {
  if (type === "chest") {
    return { type: "chest", amount: 3 + Math.floor(Math.random() * 3) }; // 3..5
  }
  // По умолчанию — XP.
  const base = Math.max(sessionXp, 50); // если сессия пустая — даём хоть что-то
  const pct = 0.25 + Math.random() * 1.75; // 0.25..2.0
  const amount = Math.max(25, Math.round((base * pct) / 5) * 5); // округляем до 5
  return { type: "xp", amount };
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
    cells.push({
      country,
      cca2: country?.cca2 || "",   // флаг рендерится локально по cca2 (renderBonusGrid)
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
    case "chest": return t("bonus.prize.chest", { n: prize.amount });
    default:      return "?";
  }
}

// Игрок нажал «Конец» на бонусе → начисляем приз, возвращаемся в меню.
function finishBonus() {
  const prize = state.bonusPrize;
  state.bonusXpCredited = 0;
  if (prize) {
    if (prize.type === "xp") {
      // Бонус достижений применяется и к выигрышу с бонусного экрана.
      const credited = applyBonus(prize.amount, getAchievementBonus(state.achievements));
      state.bonusXpCredited = credited;
      state.xpTotal += credited;
      localStorage.setItem(STORAGE.xpTotal, String(state.xpTotal));
    } else if (prize.type === "chest") {
      state.inventory.chests += prize.amount;
    }
    localStorage.setItem(STORAGE.inventory, JSON.stringify(state.inventory));

    if (state.user) {
      saveUserData(state.user.uid, {
        xpTotal:    state.xpTotal,
        inventory:  state.inventory,
      }).catch(console.error);
    }
  }
  // bonusPrize НЕ обнуляем — result-экран показывает строку бонуса. Сброс — в startGame.
  goToResult();
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
    bonusPercent: getAchievementBonus(state.achievements),
  });
  setTasksBadge(hasTasksNotification());
  setAchievementsBadge(localStorage.getItem(STORAGE.achievementsNew) === "true");
}

function goToMenu() {
  state.screen = "menu";
  refreshMenuScreen();
  showScreen(state.screen);
}

// ---------- Задания (дейлик / стрик / ежедневные квесты) ----------

// Дата как "YYYY-MM-DD" (локальная).
function fmtDate(d) {
  return d.getFullYear() + "-"
    + String(d.getMonth() + 1).padStart(2, "0") + "-"
    + String(d.getDate()).padStart(2, "0");
}
function todayStr() { return fmtDate(new Date()); }
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return fmtDate(d);
}
// Номер дня в году (1..366) — для детерминированного выбора заданий дня.
function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}
// Сегодняшняя дата "YYYY-MM-DD" — единый ключ сброса дейлика и квестов.
function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}
// Миллисекунд до полуночи — для таймера «обновление через …».
function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function persistDailyPrize() { localStorage.setItem(STORAGE.dailyPrize, JSON.stringify(state.dailyPrize)); }
function persistStreak()     { localStorage.setItem(STORAGE.streak, JSON.stringify(state.streak)); }
function persistDailyQuests(){ localStorage.setItem(STORAGE.dailyQuests, JSON.stringify(state.dailyQuests)); }
function persistInventory()  { localStorage.setItem(STORAGE.inventory, JSON.stringify(state.inventory)); }
function persistXp()         { localStorage.setItem(STORAGE.xpTotal, String(state.xpTotal)); }
function persistAchievements() {
  localStorage.setItem(STORAGE.achievements, JSON.stringify(state.achievements));
  // #47: cинхрон в облако. Зовут на каждое продвижение достижений (в т.ч. из
  // handleAnswer на каждый правильный ответ) — Firestore SDK сам коалесцирует
  // ближайшие записи; per-game писать ~25 раз — норм (<<квот free tier).
  if (state.user) {
    saveUserData(state.user.uid, {
      achievements: state.achievements,
      inventory:    state.inventory,
    }).catch(console.error);
  }
}

// Начислить награды за новые уровни достижений (сундуки), сохранить, зажечь бейдж
// и поставить попапы в очередь (показываются по одному, по кнопке «Далее»).
let achievementPopupActive = false;
function handleNewAchievementLevels(newLevels) {
  for (const { key, newLevel, reward } of newLevels) {
    const def = ACHIEVEMENT_DEFS[key];
    const name = def.name[getLang()];
    const maxLevel = def.maxLevel || 1;
    const stars = "★".repeat(newLevel) + "☆".repeat(Math.max(0, maxLevel - newLevel));
    const rewardStr = reward?.chests
      ? `+${reward.chests} ${CHEST_HTML}`
      : (def.xpBonusPerLevel ? t("achievements.xp-bonus", { n: newLevel * def.xpBonusPerLevel }) : "");
    state.achievementQueue.push({
      icon: def.icon || "🏆",
      name,
      levelStr: t("achievements.level", { n: newLevel }) + "  " + stars,
      rewardStr,
    });
    if (reward?.chests) state.inventory.chests += reward.chests;
  }
  persistAchievements();
  persistInventory();
  localStorage.setItem(STORAGE.achievementsNew, "true");
  setAchievementsBadge(true);
  if (!achievementPopupActive) drainAchievementQueue();
  refreshMenuScreen();
}

// Показать следующий попап из очереди (или завершить, если пусто).
function drainAchievementQueue() {
  if (!state.achievementQueue.length) { achievementPopupActive = false; return; }
  achievementPopupActive = true;
  showAchievementPopup(state.achievementQueue.shift());
}

// --- Дейлик (сброс по дате) ---
function isDailyPrizeAvailable() {
  return state.dailyPrize.lastClaimDate !== getTodayString();
}
function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function claimDailyPrize() {
  if (!isDailyPrizeAvailable()) return;
  const xpBefore = state.xpTotal;
  const bonus = getAchievementBonus(state.achievements);
  const earned = applyBonus(DAILY_PRIZE_XP, bonus);
  state.xpTotal += earned;
  state.inventory.chests += DAILY_PRIZE_CHESTS;
  state.dailyPrize.lastClaimDate = getTodayString();
  persistXp();
  persistInventory();
  persistDailyPrize();
  if (state.user) {
    saveUserData(state.user.uid, {
      xpTotal:    state.xpTotal,
      inventory:  state.inventory,
      dailyPrize: state.dailyPrize, // #47: запомнить факт получения в облаке
    }).catch(console.error);
  }
  startTasksTimer();      // перезапустить тикер для нового отсчёта
  renderTasksScreen();
  refreshMenuScreen();
  showXpRewardPopup({ earnedXp: earned, bonusPercent: bonus, xpBefore, xpAfter: state.xpTotal, getXPProgress });
}

// --- Стрик ---
// Вызывается в endGame: обновляет счётчик серии и выдаёт разовые награды за вехи.
function updateStreak() {
  const today = todayStr();
  const s = state.streak;
  if (s.lastGameDate === today) {
    // уже играл сегодня — счётчик не меняем
  } else if (s.lastGameDate === yesterdayStr()) {
    s.count += 1;
    s.lastGameDate = today;
  } else {
    // серия прервана или первая игра — начинаем заново, прежние вехи сбрасываем
    s.count = 1;
    s.lastGameDate = today;
    s.milestonesClaimedAt = [];
  }
  // Награды за вехи (разово). Начисляем напрямую в xpTotal/инвентарь.
  for (const m of STREAK_MILESTONES) {
    if (s.count >= m.days && !s.milestonesClaimedAt.includes(m.days)) {
      state.xpTotal += m.xp;
      state.inventory.chests += m.chests;
      s.milestonesClaimedAt.push(m.days);
    }
  }
  persistStreak();
  persistXp();
  persistInventory();
}

// --- Ежедневные задания (три тира: 3 лёгких + 2 средних + 1 тяжёлый) ---

// Детерминированный набор квестов на день (ротация по dayOfYear).
function getTodayQuests() {
  const day = dayOfYear();
  return [
    QUEST_POOL_EASY[day % 6],
    QUEST_POOL_EASY[(day + 2) % 6],
    QUEST_POOL_EASY[(day + 4) % 6],
    QUEST_POOL_MEDIUM[day % 6],
    QUEST_POOL_MEDIUM[(day + 3) % 6],
    QUEST_POOL_HARD[day % 6],
  ];
}

// Гарантирует, что state.dailyQuests актуальны для сегодняшней даты (иначе перегенерирует).
function ensureDailyQuests() {
  const today = getTodayString();
  if (state.dailyQuests.date === today
      && Array.isArray(state.dailyQuests.quests)
      && state.dailyQuests.quests.length === 6) {
    return;
  }
  state.dailyQuests = {
    date: today,
    quests: getTodayQuests().map((q) => ({
      id: q.id, hook: q.hook, goal: q.goal, tier: q.id.split(":")[0],
      progress: 0, completed: false, claimed: false,
    })),
  };
  persistDailyQuests();
}

// Обновляет прогресс всех сегодняшних квестов с данным хуком.
// Семантика по типу хука:
//   games / correct_any / xp / correct_topic:X — накапливаются (progress += value);
//   streak / questions_in_game / topics_in_game — берётся максимум (progress = max(progress, value)).
function updateQuestProgress(hook, value) {
  ensureDailyQuests();
  const cumulative = !(hook === "streak" || hook === "questions_in_game" || hook === "topics_in_game");
  let changed = false;
  for (const q of state.dailyQuests.quests) {
    if (q.hook !== hook || q.claimed) continue;
    q.progress = cumulative
      ? Math.min(q.goal, q.progress + value)
      : Math.min(q.goal, Math.max(q.progress, value));
    if (q.progress >= q.goal) q.completed = true;
    changed = true;
  }
  if (changed) persistDailyQuests();
}

function claimQuest(id) {
  const q = state.dailyQuests.quests.find((x) => x.id === id);
  if (!q || !q.completed || q.claimed) return;
  q.claimed = true;
  const reward = QUEST_REWARDS[q.tier] || { xp: 0, chests: 0 };
  const xpBefore = state.xpTotal;
  const bonus = getAchievementBonus(state.achievements);
  const earned = applyBonus(reward.xp, bonus);
  state.xpTotal += earned;
  state.inventory.chests += reward.chests;
  persistXp();
  persistInventory();
  persistDailyQuests();
  if (state.user) {
    saveUserData(state.user.uid, {
      xpTotal:     state.xpTotal,
      inventory:   state.inventory,
      dailyQuests: state.dailyQuests, // #47: claimed=true должно дойти до облака
    }).catch(console.error);
  }
  renderTasksScreen();
  refreshMenuScreen();
  showXpRewardPopup({ earnedXp: earned, bonusPercent: bonus, xpBefore, xpAfter: state.xpTotal, getXPProgress });
}

// Есть ли что забрать (для бейджа в меню): доступен дейлик ИЛИ есть готовое незабранное задание.
function hasTasksNotification() {
  if (isDailyPrizeAvailable()) return true;
  ensureDailyQuests();
  return state.dailyQuests.quests.some((q) => q.completed && !q.claimed);
}

// Вью-модель экрана заданий (UI-слой только рисует).
function buildTasksVM() {
  ensureDailyQuests();
  const count = state.streak.count;
  return {
    daily: {
      available: isDailyPrizeAvailable(),
      prizeXp: DAILY_PRIZE_XP,
      prizeChests: DAILY_PRIZE_CHESTS,
      countdown: formatCountdown(getMsUntilMidnight()),
    },
    streak: {
      count,
      hint: t("tasks.streak.hint"),
      milestones: STREAK_MILESTONES.map((m, i) => ({
        days: m.days,
        reward: { xp: m.xp, chests: m.chests },
        reached: count >= m.days,
        current: count < m.days && (i === 0 || count >= STREAK_MILESTONES[i - 1].days),
        daysLeft: Math.max(0, m.days - count),
      })),
    },
    questsTimer: t("tasks.timer", { t: formatCountdown(getMsUntilMidnight()) }),
    quests: state.dailyQuests.quests.map((q) => {
      const reward = QUEST_REWARDS[q.tier] || { xp: 0, chests: 0 };
      return {
        id: q.id,
        tier: q.tier,
        label: t("quest." + q.id),
        progress: q.progress,
        goal: q.goal,
        rewardXp: reward.xp,
        rewardChests: reward.chests,
        completed: q.completed,
        claimed: q.claimed,
      };
    }),
  };
}

let tasksRenderedDate = "";
function renderTasksScreen() {
  tasksRenderedDate = getTodayString();
  renderTasks(buildTasksVM(), claimDailyPrize, claimQuest);
}

let tasksTimerId = null;
function startTasksTimer() {
  clearTasksTimer();
  // Тикер раз в секунду: обновляет таймеры до полуночи; при смене даты — полная перерисовка
  // (новый дейлик + сгенерированные квесты).
  tasksTimerId = setInterval(() => {
    if (!document.getElementById("tasks-screen").classList.contains("active")) {
      clearTasksTimer();
      return;
    }
    if (getTodayString() !== tasksRenderedDate) {
      renderTasksScreen();   // наступила новая дата — пересобрать дейлик/квесты
      refreshMenuScreen();
      return;
    }
    const text = formatCountdown(getMsUntilMidnight());
    setQuestsTimerText(t("tasks.timer", { t: text }));
    if (!isDailyPrizeAvailable()) setDailyCountdownText(text);
  }, 1000);
}
function clearTasksTimer() {
  if (tasksTimerId) { clearInterval(tasksTimerId); tasksTimerId = null; }
}

function goToTasks() {
  state.screen = "tasks";
  renderTasksScreen();
  showScreen(state.screen);
  startTasksTimer();
}

// ---------- Достижения ----------

// Вью-модель экрана достижений (UI-слой только рисует).
function buildAchievementsVM() {
  const lang = getLang();
  const order = ["region", "topic", "volume", "mastery"];
  const categories = order.map((cat) => ({
    key: cat,
    title: t("achievements.cat." + cat),
    items: Object.keys(ACHIEVEMENT_DEFS)
      .filter((k) => ACHIEVEMENT_DEFS[k].category === cat)
      .map((k) => {
        const def = ACHIEVEMENT_DEFS[k];
        const a = state.achievements[k] || { progress: 0, level: 0 };
        const isMastery = cat === "mastery";
        const nextThreshold = a.level < def.maxLevel ? def.thresholds[a.level] : null;
        return {
          key: k,
          name: def.name[lang],
          level: a.level,
          maxLevel: def.maxLevel,
          progress: a.progress,
          nextThreshold,
          isMastery,
          done: a.level >= def.maxLevel,
          xpBonusPerLevel: def.xpBonusPerLevel,
          bonusPercent: def.xpBonusPerLevel * a.level,
        };
      }),
  }));
  return { totalBonus: getAchievementBonus(state.achievements), lang, categories };
}

function goToAchievements() {
  localStorage.removeItem(STORAGE.achievementsNew);
  setAchievementsBadge(false);
  state.screen = "achievements";
  renderAchievements(buildAchievementsVM());
  showScreen(state.screen);
}

// ---------- Энциклопедия (3 вида: регионы / страны / карточка) ----------

let encView = "regions";      // 'regions' | 'countries' | 'detail'
let encRegionKey = null;      // выбранный регион (для вида 2 и возврата из вида 3)
let encCountry = null;        // выбранная страна (для вида 3)

function goToEncyclopedia() {
  state.screen = "encyclopedia";
  encView = "regions";
  renderEncyclopedia();
  showScreen(state.screen);
}

function encShowRegions() {
  encView = "regions";
  renderEncyclopedia();
}
function encShowCountries(regionKey) {
  encView = "countries";
  encRegionKey = regionKey;
  renderEncyclopedia();
}
function encShowDetail(country) {
  encView = "detail";
  encCountry = country;
  renderEncyclopedia();
}

function renderEncyclopedia() {
  document.getElementById("enc-regions").style.display   = encView === "regions"   ? "" : "none";
  document.getElementById("enc-countries").style.display = encView === "countries" ? "" : "none";
  document.getElementById("enc-detail").style.display    = encView === "detail"    ? "" : "none";

  if (encView === "regions") {
    const items = Object.keys(REGIONS).map((k) => ({
      key: k,
      label: REGIONS[k].label,
      count: state.allCountries.filter((c) => c.region === REGIONS[k].apiValue).length,
      color: ENC_REGION_COLORS[k],
    }));
    renderEncRegions(items, encShowCountries);
  } else if (encView === "countries") {
    const apiVal = REGIONS[encRegionKey].apiValue;
    const locale = getLang() === "ru" ? "ru" : "en";
    const items = state.allCountries
      .filter((c) => c.region === apiVal)
      .map((c) => ({ country: c, name: getName(c) }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    renderEncCountries(REGIONS[encRegionKey].label, items, encShowDetail);
  } else if (encView === "detail" && encCountry) {
    decorateCountry(encCountry);
    renderCountryCard(encCountry, getRegionLabel(encCountry),
      document.getElementById("enc-detail-card"));
  }
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
  if (state.screen === "encyclopedia") renderEncyclopedia();
  if (state.screen === "tasks") renderTasksScreen();
  if (state.screen === "achievements") renderAchievements(buildAchievementsVM());
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
    state.inventory = { chests: Number(data.inventory.chests) || 0 };
  }
  // #47: достижения / дейлик / стрик / задания — тянем из облака и нормализуем.
  // Используем raw localStorage.setItem (не persistAchievements/persistStreak/…),
  // иначе persistAchievements тут же запишет это обратно в Firestore — лишняя запись.
  if (data.achievements && typeof data.achievements === "object") {
    state.achievements = initAchievements(data.achievements);
    localStorage.setItem(STORAGE.achievements, JSON.stringify(state.achievements));
  }
  if (data.dailyPrize && typeof data.dailyPrize === "object"
      && typeof data.dailyPrize.lastClaimDate === "string") {
    state.dailyPrize = { lastClaimDate: data.dailyPrize.lastClaimDate };
    localStorage.setItem(STORAGE.dailyPrize, JSON.stringify(state.dailyPrize));
  }
  if (data.streak && typeof data.streak === "object") {
    state.streak = {
      count: Number(data.streak.count) || 0,
      lastGameDate: typeof data.streak.lastGameDate === "string" ? data.streak.lastGameDate : "",
      milestonesClaimedAt: Array.isArray(data.streak.milestonesClaimedAt) ? data.streak.milestonesClaimedAt : [],
    };
    localStorage.setItem(STORAGE.streak, JSON.stringify(state.streak));
  }
  if (data.dailyQuests && typeof data.dailyQuests === "object") {
    state.dailyQuests = {
      date: typeof data.dailyQuests.date === "string" ? data.dailyQuests.date : "",
      quests: Array.isArray(data.dailyQuests.quests) ? data.dailyQuests.quests : [],
    };
    localStorage.setItem(STORAGE.dailyQuests, JSON.stringify(state.dailyQuests));
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
  refreshMenuScreen(); // #47: подтянуть профиль/бонус/бейджи под облачные данные
}

// Полный сброс прогресса («как в первый раз»):
// XP / рекорд / партии / инвентарь / выбор тем / достижения / дейлик / стрик / задания.
// Чистит localStorage и, если пользователь залогинен, обнуляет его документ в Firestore.
function resetProgress() {
  if (!confirm(t("reset.confirm"))) return;

  state.xpTotal = 0;
  state.bestXpPerGame = 0;
  state.gamesPlayed = 0;
  state.xpEarnedThisGame = 0;
  state.inventory = { ...DEFAULT_INVENTORY };
  state.setup.topicDifficulties = { ...DEFAULT_TOPIC_DIFFICULTIES };
  // Достижения — обнулить.
  state.achievements = initAchievements(null);
  state.correctStreak = 0;
  state.speedCount = 0;

  localStorage.setItem(STORAGE.xpTotal, "0");
  localStorage.setItem(STORAGE.bestXpPerGame, "0");
  localStorage.setItem(STORAGE.gamesPlayed, "0");
  localStorage.setItem(STORAGE.inventory, JSON.stringify(state.inventory));
  localStorage.removeItem(STORAGE.achievements);
  localStorage.removeItem(STORAGE.achievementsNew);

  // Дейлик — сделать снова доступным.
  state.dailyPrize = { lastClaimDate: "" };
  localStorage.removeItem(STORAGE.dailyPrize);
  // Стрик — обнулить полностью.
  state.streak = { count: 0, lastGameDate: "", milestonesClaimedAt: [] };
  localStorage.removeItem(STORAGE.streak);
  // Задания — сбросить, чтобы сгенерировались заново при открытии экрана.
  state.dailyQuests = { date: "", quests: [] };
  localStorage.removeItem(STORAGE.dailyQuests);

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

  initBackgroundRotation();
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
  document.getElementById("menu-encyclopedia-btn").addEventListener("click", goToEncyclopedia);
  document.getElementById("menu-quests-btn").addEventListener("click", goToTasks);
  document.getElementById("tasks-back")?.addEventListener("click", () => { clearTasksTimer(); goToMenu(); });
  document.getElementById("menu-achievements-btn")?.addEventListener("click", goToAchievements);
  document.getElementById("achievements-back-btn")?.addEventListener("click", goToMenu);

  // Попап достижения: «Далее» → скрыть и показать следующий из очереди.
  document.getElementById("ach-next-btn")?.addEventListener("click", () => {
    hideAchievementPopup();
    drainAchievementQueue();
  });
  // Попап XP-награды: «OK» → скрыть.
  document.getElementById("xpr-ok-btn")?.addEventListener("click", hideXpRewardPopup);
  document.getElementById("menu-memory-btn")?.addEventListener("click", () => console.log("Memory game: coming soon"));
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
  // Result — последний экран потока; кнопка ведёт в меню.
  getPlayAgainButton().addEventListener("click", goToMenu);
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

  // Энциклопедия — навигация между видами
  document.getElementById("enc-regions-back")?.addEventListener("click", goToMenu);
  document.getElementById("enc-countries-back")?.addEventListener("click", encShowRegions);
  document.getElementById("enc-detail-back")?.addEventListener("click", () => encShowCountries(encRegionKey));
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
