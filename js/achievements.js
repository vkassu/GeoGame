// Система достижений — data-layer (без DOM и без игрового state).
// Все достижения с xpBonusPerLevel > 0 (region, topic, volume) дают +1% к XP за каждый уровень.
// Mastery — одноуровневые, дают сундуки, XP-бонуса не дают.

// Пороги прогресса для уровней 1–10 (категории region и topic).
export const MULTI_THRESHOLDS = [10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500];
// Пороги для volume:games (число сыгранных партий).
export const GAMES_THRESHOLDS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500];
// Пороги для volume:xp (суммарный XP).
export const XP_VOL_THRESHOLDS = [500, 1500, 5000, 15000, 50000, 150000, 500000, 1500000, 5000000, 15000000];

// Награды-сундуки по уровням для volume-достижений.
const GAMES_CHESTS = [2, 3, 4, 5, 7, 10, 15, 20, 30, 50];
const XP_CHESTS = [2, 3, 5, 8, 12, 20, 30, 50, 80, 150];

// Плоский словарь достижений, ключ = "category:id".
// Поля def: category, name {ru,en}, maxLevel, thresholds[], xpBonusPerLevel, chestRewards[]|null.
export const ACHIEVEMENT_DEFS = {};

// Эмодзи-иконка категории (для попапа достижения).
export const ACH_CATEGORY_ICON = { region: "🌍", topic: "🧩", volume: "📊", mastery: "🏆" };

function addMulti(key, category, ru, en) {
  ACHIEVEMENT_DEFS[key] = {
    category, name: { ru, en }, icon: ACH_CATEGORY_ICON[category], maxLevel: 10,
    thresholds: MULTI_THRESHOLDS, xpBonusPerLevel: 1, chestRewards: null,
  };
}
function addMastery(key, ru, en) {
  ACHIEVEMENT_DEFS[key] = {
    category: "mastery", name: { ru, en }, icon: ACH_CATEGORY_ICON.mastery, maxLevel: 1,
    thresholds: [1], xpBonusPerLevel: 0, chestRewards: [10],
  };
}

// --- Категория region (5) ---
addMulti("region:europe",   "region", "Знаток Европы",  "Europe Expert");
addMulti("region:asia",     "region", "Знаток Азии",    "Asia Expert");
addMulti("region:africa",   "region", "Знаток Африки",  "Africa Expert");
addMulti("region:americas", "region", "Знаток Америк",  "Americas Expert");
addMulti("region:oceania",  "region", "Знаток Океании", "Oceania Expert");

// --- Категория topic (13). Порядок строк ниже синхронизирован с порядком ключей
// в TOPICS (js/main.js) — экран «Достижения» показывает темы в том же порядке,
// что экран «Темы». При перестановке тем в TOPICS надо переставить и здесь
// (ключи и значения прогресса при этом не страдают: localStorage хранит по
// "topic:<key>", не по индексу). topic:capital в этом проходе переименован
// «Картограф» → «Столичник» (Cartographer → Capitalist) — тематика прямее. ---
addMulti("topic:mapFind",          "topic", "Географ",    "Geographer");
addMulti("topic:country",          "topic", "Флаговед",   "Flag Expert");
addMulti("topic:silhouette",       "topic", "Топограф",   "Topographer");
addMulti("topic:coatOfArms",       "topic", "Геральдист", "Heraldist");
addMulti("topic:capital",          "topic", "Столичник",  "Capitalist");
addMulti("topic:population",       "topic", "Демограф",   "Demographer");
addMulti("topic:nativeName",       "topic", "Этнограф",   "Ethnographer");
addMulti("topic:language",         "topic", "Лингвист",   "Linguist");
addMulti("topic:religion",         "topic", "Теолог",     "Theologian");
addMulti("topic:currency",         "topic", "Финансист",  "Financier");
addMulti("topic:countryByCapital", "topic", "Навигатор",  "Navigator");
addMulti("topic:density",          "topic", "Статистик",  "Statistician");
addMulti("topic:area",             "topic", "Землемер",   "Surveyor");

// --- Категория volume (2) ---
ACHIEVEMENT_DEFS["volume:games"] = {
  category: "volume", name: { ru: "Путешественник", en: "Traveler" }, icon: ACH_CATEGORY_ICON.volume,
  maxLevel: 10, thresholds: GAMES_THRESHOLDS, xpBonusPerLevel: 1, chestRewards: GAMES_CHESTS,
};
ACHIEVEMENT_DEFS["volume:xp"] = {
  category: "volume", name: { ru: "Эрудит", en: "Scholar" }, icon: ACH_CATEGORY_ICON.volume,
  maxLevel: 10, thresholds: XP_VOL_THRESHOLDS, xpBonusPerLevel: 1, chestRewards: XP_CHESTS,
};

// --- Категория mastery (6, одноуровневые) ---
addMastery("mastery:perfect",    "Перфекционист", "Perfectionist");
addMastery("mastery:sniper",     "Снайпер",       "Sniper");
addMastery("mastery:speed",      "Молния",        "Lightning");
addMastery("mastery:alltopics",  "Полиглот",      "Polyglot");
addMastery("mastery:allregions", "Покоритель",    "Conqueror");
addMastery("mastery:training",   "Прилежный",     "Diligent");

// Уровень по прогрессу (число выполненных порогов, не больше maxLevel).
function computeLevel(def, progress) {
  let lvl = 0;
  for (let i = 0; i < def.thresholds.length; i++) {
    if (progress >= def.thresholds[i]) lvl = i + 1;
    else break;
  }
  return Math.min(lvl, def.maxLevel);
}

// Награда за достижение уровня (сундуки) или null.
function rewardForLevel(def, level) {
  if (def.chestRewards && def.chestRewards[level - 1]) {
    return { chests: def.chestRewards[level - 1] };
  }
  return null;
}

// Загрузить/инициализировать — дополняет отсутствующие ключи нулями.
// Уровень всегда пересчитывается из прогресса (устойчиво к смене порогов).
export function initAchievements(stored) {
  const out = {};
  for (const key in ACHIEVEMENT_DEFS) {
    const s = stored && stored[key];
    const progress = s && Number.isFinite(s.progress) ? s.progress : 0;
    out[key] = { progress, level: computeLevel(ACHIEVEMENT_DEFS[key], progress) };
  }
  return out;
}

// Внутренний: применяет новый прогресс, возвращает массив новых уровней с наградами.
function applyProgress(def, a, key, newProgress) {
  const oldLevel = a.level;
  a.progress = newProgress;
  const newLevel = computeLevel(def, a.progress);
  const results = [];
  if (newLevel > oldLevel) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      results.push({ key, newLevel: lvl, reward: rewardForLevel(def, lvl) });
    }
    a.level = newLevel;
  }
  return results;
}

// Обновить прогресс на delta. Возвращает [{ key, newLevel, reward }] для новых уровней.
export function advanceAchievement(achievementsState, key, delta) {
  const def = ACHIEVEMENT_DEFS[key];
  const a = achievementsState[key];
  if (!def || !a) return [];
  return applyProgress(def, a, key, a.progress + delta);
}

// Установить абсолютное значение прогресса (для volume:xp / volume:games).
// Возвращает [{ key, newLevel, reward }] для новых уровней. Прогресс не уменьшается.
export function setAchievementProgress(achievementsState, key, absoluteValue) {
  const def = ACHIEVEMENT_DEFS[key];
  const a = achievementsState[key];
  if (!def || !a) return [];
  return applyProgress(def, a, key, Math.max(a.progress, absoluteValue));
}

// Суммарный XP-бонус % (только region и topic).
export function getAchievementBonus(achievementsState) {
  let bonus = 0;
  for (const key in ACHIEVEMENT_DEFS) {
    const def = ACHIEVEMENT_DEFS[key];
    if (def.xpBonusPerLevel && achievementsState[key]) {
      bonus += achievementsState[key].level * def.xpBonusPerLevel;
    }
  }
  return bonus;
}

// Применить бонус к базовому XP.
export function applyBonus(baseXp, bonusPercent) {
  return Math.round(baseXp * (1 + bonusPercent / 100));
}
