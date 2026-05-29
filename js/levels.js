// Система уровней, сложностей и разблокировок (data-layer, без UI и без state).
//
// Модель XP: XP_THRESHOLDS — это СУММАРНЫЙ XP, нужный чтобы достичь уровня (index+1).
//   index 0 → уровень 1 → 0 XP (старт)
//   index 1 → уровень 2 → 200 XP
//   ...
// Растёт по *1.4 СТОИМОСТЬ перехода между уровнями (а не сам порог), а пороги —
// накопительная сумма этих стоимостей. Так держится пример из ТЗ:
//   getLevelFromXP(200) = 2, getXPProgress(300) = { level: 2, xpInLevel: 100, ... }.
// (Если бы *1.4 рос сам порог, то 280 уже давал бы уровень 3 — это противоречит примеру.)
// Стоимости округляются до 10. Балансировка — позже, это рабочая заглушка.
export const XP_THRESHOLDS = (() => {
  const arr = [0];
  let cost = 200; // стоимость перехода 1→2
  for (let i = 1; i < 52; i++) {
    arr.push(arr[i - 1] + cost);
    cost = Math.round((cost * 1.4) / 10) * 10;
  }
  return arr; // 52 значения (индексы 0..51 → уровни 1..52)
})();

// Таблица разблокировок: уровень → [{ topicKey, difficultyIndex }].
// difficultyIndex: 0=4 варианта, 1=6, 2=8, 3=10.
// Прогрессия «вширь»: сперва все темы на лёгкой сложности (0), затем поднимаем
// сложность для всех тем (1 → 2 → 3).
//
// ⚠️ Порядок тем НЕ хардкодится здесь: он берётся из Object.keys(TOPICS) в main.js
// через initLevelUnlocks() (вызов сразу после определения TOPICS). Так визуальный
// порядок тем в UI и порядок разблокировок по уровням всегда совпадают — замки идут
// строго по возрастанию сверху вниз. Единый источник правды — TOPICS в main.js.
//
// ⚠️ 13 тем × 4 сложности = 52 уникальные разблокировки = ровно 52 уровня
// (XP_THRESHOLDS расширен до 52 в #43, иначе сложность 4 у mapFind/silhouette
// пришлась бы на недостижимые уровни 51–52). Пустых уровней теперь нет — последняя
// разблокировка ровно на уровне 52. Баланс/награды поздних уровней — отдельная задача.
let LEVEL_UNLOCKS = {};

// Строит таблицу разблокировок из переданного порядка тем (Object.keys(TOPICS)).
export function initLevelUnlocks(topicOrder) {
  LEVEL_UNLOCKS = {};
  let level = 1;
  for (let d = 0; d <= 3; d++) {
    for (const topicKey of topicOrder) {
      LEVEL_UNLOCKS[level] = [{ topicKey, difficultyIndex: d }];
      level++;
    }
  }
}

// Разблокировки на конкретном уровне (или пустой массив).
export function getUnlocksForLevel(level) {
  return LEVEL_UNLOCKS[level] || [];
}

// Уровень пользователя из суммарного XP (≥ 1).
export function getLevelFromXP(xp) {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

// Весь XP, накопленный к моменту достижения уровня `level`.
export function getXPForLevel(level) {
  const i = Math.max(0, Math.min(level - 1, XP_THRESHOLDS.length - 1));
  return XP_THRESHOLDS[i];
}

// Прогресс внутри текущего уровня.
// { level, xpInLevel, xpNeeded, percent } — percent в диапазоне 0..1.
export function getXPProgress(xp) {
  const level = getLevelFromXP(xp);
  const currentThreshold = getXPForLevel(level);
  const isMax = level >= XP_THRESHOLDS.length; // последний уровень — следующего порога нет
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = isMax ? 0 : XP_THRESHOLDS[level] - currentThreshold;
  const percent = xpNeeded > 0 ? xpInLevel / xpNeeded : 1;
  return { level, xpInLevel, xpNeeded, percent };
}

// Минимальный уровень, на котором открывается пара (topicKey, diffIndex).
// Возвращает число (уровень) или null, если пара не встречается в LEVEL_UNLOCKS.
export function getUnlockLevel(topicKey, diffIndex) {
  for (let l = 1; l <= XP_THRESHOLDS.length; l++) {
    const arr = LEVEL_UNLOCKS[l];
    if (!arr) continue;
    for (const u of arr) {
      if (u.topicKey === topicKey && u.difficultyIndex === diffIndex) return l;
    }
  }
  return null;
}

// Какие difficultyIndex разблокированы для темы при достигнутом уровне.
// Аккумулирует все разблокировки темы на уровнях 1..level. Возвращает Set<number>.
export function getUnlockedDifficulties(topicKey, level) {
  const set = new Set();
  for (let l = 1; l <= level; l++) {
    const arr = LEVEL_UNLOCKS[l];
    if (!arr) continue;
    for (const u of arr) {
      if (u.topicKey === topicKey) set.add(u.difficultyIndex);
    }
  }
  return set;
}
