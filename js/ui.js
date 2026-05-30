// Слой представления: переключение экранов и заполнение их данными.
// Никакой игровой логики и state — только DOM.

import { codeToEmoji, officialName } from "./data.js?v=20260578";
import { t } from "./i18n.js?v=20260578";

// HTML-фрагменты для встроенных иконок (сундук в бонус-сетке/строках наград,
// XP-медалька в счётчике). Раньше использовались эмодзи 🧰 / ✨ через
// .textContent — теперь приёмники переключены на .innerHTML и подставляют эти
// строки. Cache-bust ?v= на ассеты — чтобы при подмене webp-файла браузер
// не показывал старую картинку.
export const CHEST_HTML = '<img src="img/chest.webp?v=20260578" class="chest-inline-icon" alt="сундук">';
const CHEST_BONUS_HTML = '<img src="img/chest.webp?v=20260578" class="bonus-chest-icon" alt="сундук">';
const XP_ICON_HTML = '<img src="img/xp_icon.webp?v=20260578" class="xp-icon" alt="XP">';

export function showScreen(name) {
  const screens = document.querySelectorAll(".screen");
  for (const s of screens) {
    s.classList.toggle("active", s.id === `${name}-screen`);
  }
  // Кнопка «На главную» видна на всех экранах, кроме меню, первого шага настройки,
  // и финальных экранов (Result/Training/Bonus) — там свой поток выхода.
  const home = getHomeButton();
  if (home) home.hidden = (
    name === "start" || name === "menu" || name === "encyclopedia" ||
    name === "tasks" || name === "achievements" ||
    name === "result" || name === "training" || name === "bonus"
  );
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

// Подсказка с перезарядкой: 5 сегментов, заполненных по hintCharge (или все 5 если доступна).
// Кнопка активна только когда hintAvailable.
export function updateHintUI(hintCharge, hintAvailable) {
  const btn = getHintButton();
  if (!btn) return;
  btn.style.display = "";
  const segs = btn.querySelectorAll(".hint-seg");
  const filled = hintAvailable ? segs.length : hintCharge;
  segs.forEach((s, i) => s.classList.toggle("filled", i < filled));
  btn.disabled = !hintAvailable;
}

// Прячет 2 случайных неверных варианта (display:none).
export function applyHintToOptions(buttons, correctValue) {
  const wrong = buttons.filter((b) => b.value !== correctValue);
  // перемешиваем неверные и прячем первые два
  for (let i = wrong.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
  }
  wrong.slice(0, 2).forEach((b) => {
    b.button.style.display = "none";
  });
}

export function renderAnswerResult(isCorrect, pickedValue, correctValue, earnedXp = 0) {
  const banner = document.getElementById("answer-banner");
  banner.className = "answer-banner " + (isCorrect ? "correct" : "wrong");
  banner.textContent = isCorrect ? t("answer.correct") : t("answer.wrong");

  // earnedXp — фактически начисленное за этот ответ (с учётом сложности и бонуса
  // достижений). В обучении XP не начисляется → передаётся 0 → строка пустая.
  // .innerHTML потому что вставляем <img class="xp-icon">.
  const xpEl = document.getElementById("answer-xp");
  xpEl.innerHTML = (isCorrect && earnedXp > 0) ? `${XP_ICON_HTML}+${earnedXp} XP` : "";
  document.getElementById("answer-picked").textContent = isCorrect ? "" : t("answer.your", { v: pickedValue });
  document.getElementById("answer-correct-val").textContent = correctValue;
}
export function showAnswerResult() {
  const game = document.getElementById("game-screen");
  document.getElementById("options").style.display = "none";
  game.querySelector(".meta").style.display = "none";
  game.querySelector(".progress").style.display = "none";
  document.getElementById("answer-result").style.display = "block";
}
export function hideAnswerResult() {
  const game = document.getElementById("game-screen");
  document.getElementById("answer-result").style.display = "none";
  document.getElementById("options").style.display = "";
  game.querySelector(".meta").style.display = "";
  game.querySelector(".progress").style.display = "";
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

/**
 * @param {Array<{key, label}>} items
 * @param {Object} topicDifficulties  — { [topicKey]: difficultyIndex | -1 }
 * @param {Function} getUnlocked      — (topicKey) => Set<number>  (0..3)
 * @param {Function} onSelect         — (topicKey, difficultyIndex) => void
 * @param {Function|null} getUnlockLevelFn — (topicKey, diffIndex) => number|null (уровень разблокировки)
 */
export function renderTopicList(items, topicDifficulties, getUnlocked, onSelect, getUnlockLevelFn = null) {
  const list = document.getElementById("topic-list");
  list.innerHTML = "";

  for (const { key, label } of items) {
    const row = document.createElement("div");
    row.className = "topic-row";

    // Название темы
    const lbl = document.createElement("span");
    lbl.className = "topic-label";
    lbl.textContent = label;
    row.appendChild(lbl);

    // 4 кнопки сложности
    const btns = document.createElement("div");
    btns.className = "diff-btns";

    const unlocked = getUnlocked(key);       // Set<number>
    const selected = topicDifficulties[key]; // -1 или 0..3

    for (let i = 0; i < 4; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(i + 1);

      if (!unlocked.has(i)) {
        btn.className = "diff-btn diff-btn-locked";
        btn.disabled = true;
        const reqLevel = getUnlockLevelFn ? getUnlockLevelFn(key, i) : null;
        btn.textContent = reqLevel ? "🔒 " + reqLevel : "🔒";
      } else if (selected === i) {
        btn.className = "diff-btn diff-btn-active";
      } else {
        btn.className = "diff-btn diff-btn-unlocked";
      }

      btn.addEventListener("click", () => onSelect(key, i));
      btns.appendChild(btn);
    }

    row.appendChild(btns);
    list.appendChild(row);
  }
}

// ---- XP-бар и level-up (экран результата) ----

/**
 * Рендерит XP-бар в статичном виде (без анимации).
 * xpProgress: { level, xpInLevel, xpNeeded, percent }
 */
// Статичный рендер (стартовое состояние): весь прогресс показываем как «старый»
// (светло-зелёный), новый сегмент = 0.
export function renderXPBar(xpProgress) {
  const { level, xpInLevel, xpNeeded, percent } = xpProgress;
  document.getElementById("xp-level-from").textContent = String(level);
  document.getElementById("xp-level-to").textContent = String(level + 1);
  document.getElementById("xp-bar-old").style.width = (percent * 100).toFixed(1) + "%";
  document.getElementById("xp-bar-new").style.width = "0%";
  document.getElementById("xp-bar-caption").textContent =
    xpInLevel + " / " + xpNeeded + " XP";
}

/**
 * Анимирует заполнение XP-бара от startXP до endXP двумя сегментами:
 *  - старый (светло-зелёный) = прогресс до сессии (статичен, в текущем уровне);
 *  - новый (жёлто-зелёный) = заработанное за сессию, анимируется.
 * При level-up старый сегмент обнуляется (на новом уровне «до сессии» прогресса нет).
 * getXPProgress принимается параметром, чтобы не создавать зависимость ui.js → levels.js.
 * @param {number} durationMs — длительность анимации (по умолчанию 2400)
 * @param {Object} [els] — кастомные DOM-элементы { oldEl, newEl, caption, levelFrom, levelTo }
 *                         (по умолчанию — элементы экрана результата по id). Любой может быть null.
 */
export function animateXPBar(startXP, endXP, getXPProgress, onLevelUp, durationMs = 2400, els) {
  const oldEl     = els ? els.oldEl     : document.getElementById("xp-bar-old");
  const newEl     = els ? els.newEl     : document.getElementById("xp-bar-new");
  const caption   = els ? els.caption   : document.getElementById("xp-bar-caption");
  const levelFrom = els ? els.levelFrom : document.getElementById("xp-level-from");
  const levelTo   = els ? els.levelTo   : document.getElementById("xp-level-to");

  const startLevel = getXPProgress(startXP).level;
  const startPercent = getXPProgress(startXP).percent; // «старый» прогресс в стартовом уровне
  let lastFiredLevel = startLevel;
  const start = performance.now();

  function paint(prog) {
    // Старый сегмент: если ещё в стартовом уровне — это докризисный прогресс; после
    // перехода уровня старого прогресса в новом уровне нет (всё «новое»).
    const oldPercent = prog.level === startLevel ? startPercent : 0;
    const newPercent = Math.max(0, prog.percent - oldPercent);
    if (levelFrom) levelFrom.textContent = String(prog.level);
    if (levelTo) levelTo.textContent = String(prog.level + 1);
    if (oldEl) oldEl.style.width = (oldPercent * 100).toFixed(1) + "%";
    if (newEl) newEl.style.width = (newPercent * 100).toFixed(1) + "%";
    if (caption) caption.textContent = prog.xpInLevel + " / " + prog.xpNeeded + " XP";
  }

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / durationMs, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out
    const currentXP = Math.round(startXP + (endXP - startXP) * eased);
    const prog = getXPProgress(currentXP);
    paint(prog);
    if (prog.level > lastFiredLevel) {
      lastFiredLevel = prog.level;
      onLevelUp(prog.level);
    }
    if (t < 1) requestAnimationFrame(tick);
  }

  paint(getXPProgress(startXP));
  requestAnimationFrame(tick);
}

/**
 * Показывает баннер «Новый уровень!».
 * @param {number} newLevel
 * @param {Array<string>} unlockLabels — названия разблокированного
 */
export function showLevelUpBanner(newLevel, unlockLabels) {
  const banner = document.getElementById("level-up-banner");
  document.getElementById("level-up-title").textContent =
    "🎉 " + t("level.up") + " " + newLevel + "!";
  document.getElementById("level-up-detail").textContent =
    unlockLabels.length ? t("level.unlocked") + ": " + unlockLabels.join(", ") : "";
  banner.style.display = "block";
}

export function hideLevelUpBanner() {
  const banner = document.getElementById("level-up-banner");
  if (banner) banner.style.display = "none";
}

// ---- Главное меню (профиль) ----

/**
 * @param {Object} p
 * @param {string|null} p.avatarUrl
 * @param {string} p.username        — "Гость" если нет логина
 * @param {number} p.level
 * @param {Object} p.xpProgress      — { xpInLevel, xpNeeded, percent }
 * @param {Object} p.inventory       — { chests }
 * @param {boolean} p.isLoggedIn
 * @param {string} p.lang            — "ru" или "en"
 * @param {number} p.bonusPercent    — суммарный XP-бонус достижений (%), 0 = скрыть строку
 */
export function renderMenuProfile({ avatarUrl, username, level,
                                    xpProgress, inventory, isLoggedIn, lang,
                                    bonusPercent = 0 }) {
  // Аватар / иконка гостя
  const avatar = document.getElementById("menu-avatar");
  const guestIcon = document.getElementById("menu-guest-icon");
  if (avatarUrl) {
    avatar.src = avatarUrl;
    avatar.style.display = "block";
    guestIcon.style.display = "none";
  } else {
    avatar.style.display = "none";
    guestIcon.style.display = "block";
  }

  // Имя и уровень
  document.getElementById("menu-username").textContent = username;
  document.getElementById("menu-level-badge").textContent = String(level);

  // XP-бар
  const { xpInLevel, xpNeeded, percent } = xpProgress;
  document.getElementById("menu-xp-bar-fill").style.width =
    (percent * 100).toFixed(1) + "%";
  document.getElementById("menu-xp-caption").textContent =
    xpInLevel + " / " + xpNeeded + " XP";

  // Строка XP-бонуса достижений (скрыта при 0%)
  const bonusLine = document.getElementById("menu-bonus-line");
  if (bonusLine) {
    if (bonusPercent > 0) {
      bonusLine.textContent = "🎯 " + t("achievements.xp-bonus", { n: bonusPercent });
      bonusLine.style.display = "";
    } else {
      bonusLine.style.display = "none";
    }
  }

  // Инвентарь (только сундуки)
  document.getElementById("menu-inv-chests").textContent = String(inventory.chests);

  // Кнопка «Память» — доступна при 100+ сундуках, иначе серая с подсказкой «нужно 100».
  const memBtn = document.getElementById("menu-memory-btn");
  const memSub = document.getElementById("menu-memory-sub");
  if (memBtn) {
    const unlocked = inventory.chests >= 100;
    memBtn.disabled = !unlocked;
    if (memSub) memSub.style.display = unlocked ? "none" : "";
  }

  // Кнопка авторизации
  document.getElementById("menu-auth-btn").textContent =
    isLoggedIn ? t("menu.sign-out") : t("menu.sign-in");

  // Кнопка языка
  document.getElementById("menu-lang-btn").textContent = lang === "ru" ? "EN" : "RU";
}

// Локальная картинка флага/герба с фолбэком svg → png → запасной узел.
// dir: "flags" | "coats". onExhausted(img) — когда ни svg, ни png не загрузились.
// Файлы лежат в репо (scripts/download_assets.js), внешних CDN-запросов нет.
function localAssetImg(dir, cca2, className, onExhausted) {
  const code = (cca2 || "").toLowerCase();
  const img = document.createElement("img");
  if (className) img.className = className;
  img.alt = cca2 || "";
  img.decoding = "async"; // не блокируем main thread на декодировании
  let stage = 0;
  img.onerror = () => {
    stage++;
    if (stage === 1) {
      img.src = `./img/${dir}/${code}.png`; // svg не нашёлся — пробуем png
    } else {
      img.onerror = null;
      onExhausted(img);
    }
  };
  img.src = `./img/${dir}/${code}.svg`;
  return img;
}

// Предзагрузка ассета следующего вопроса в HTTP-кеш браузера. К моменту,
// когда пользователь ответит на текущий вопрос и перейдёт дальше, картинка
// уже лежит в кеше — нет «вспышки» пустоты. Тема mapFind не предзагружается:
// worldmap.json (~1.1 МБ) кешируется после первого вопроса темы навсегда (см.
// loadWorldmapData выше); силуэты/флаги/гербы — отдельные файлы под каждый код.
export function preloadNextQuestion(nextQuestion) {
  if (!nextQuestion) return;
  const { country, topicKey } = nextQuestion;
  const cca2 = (country?.cca2 || "").toLowerCase();
  if (!cca2) return;

  // Темы, показывающие флаг: country (флаг → угадать страну), countryByCapital
  // (текст столицы; флаг не показывается — НО на экране результата ответа
  // показывается флаг? нет, результат тоже только текст). Поэтому реально
  // предзагружаем только то, что попадёт в prompt текущей темы.
  let path = null;
  if (topicKey === "country") path = `./img/flags/${cca2}.svg`;
  else if (topicKey === "coatOfArms") path = `./img/coats/${cca2}.svg`;
  else if (topicKey === "silhouette") path = `data/silhouettes/${cca2}.svg`;
  // mapFind — карта целиком кешируется после первого вопроса; ничего грузить не надо
  // countryByCapital / nativeName / capital / population / area / language / currency /
  //   density / religion — текстовые промпты, ассетов нет

  if (path) {
    const img = new Image();
    img.decoding = "async";
    img.src = path;
  }
}

// Данные карты (готовые SVG-пути в экранных координатах) — грузятся лениво один раз
// при первом вопросе темы «Найди на карте». Проекция уже посчитана build_worldmap.js,
// поэтому D3/внешние библиотеки в рантайме не нужны.
let worldmapData = null;
let mapRenderToken = 0;
async function loadWorldmapData() {
  if (worldmapData) return worldmapData;
  worldmapData = await fetch("data/worldmap.json").then((r) => r.json());
  return worldmapData;
}

// Рисует карту мира в flagEl с подсвеченной страной (оранжевой заливкой пути).
// Автозум к bbox страны (MIN 80, отступ 50%). Токен защищает от гонки: если вопрос
// сменился, пока грузилась карта, — выходим. Кружок-подсказка сверху больше не
// рисуется для стран с геометрией (правка 2026-05-30: после автозума к MIN=80
// заливка видна и для микрогосударств, кружок только мешал восприятию). Для
// dot-only стран (13 без геометрии в Natural Earth) точка ОСТАЁТСЯ — без неё
// карта для них пуста и вопрос неиграбелен.
async function renderMapFind(country, flagEl) {
  const NS = "http://www.w3.org/2000/svg";
  const token = ++mapRenderToken;
  flagEl.innerHTML = `<div class="map-loading">${t("map.loading")}</div>`;
  let data;
  try {
    data = await loadWorldmapData();
  } catch {
    if (token === mapRenderToken) { flagEl.classList.add("silhouette-fallback"); flagEl.textContent = "?"; }
    return;
  }
  if (token !== mapRenderToken) return; // вопрос успел смениться

  const target = (country.cca2 || "").toUpperCase();
  const svg = document.createElementNS(NS, "svg");
  svg.classList.add("map-find-svg");
  let tc = null;
  for (const c of data.countries) {
    const isTarget = c.cca2 === target;
    if (isTarget) tc = c;
    if (!c.d) continue; // dot-only страна (нет геометрии в Natural Earth) — путь не рисуем
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", c.d);
    p.setAttribute("class", "map-country" + (isTarget ? " map-country--highlight" : ""));
    svg.appendChild(p);
  }

  if (tc) {
    const [cx, cy] = tc.c;
    const isDotOnly = !!tc.dotOnly; // нет d/bbox — только центроид
    if (tc.bbox) {
      const [x0, y0, x1, y1] = tc.bbox;
      const bw = x1 - x0, bh = y1 - y0;
      // Автозум к реальной геометрии
      const PAD = 0.5, MIN = 80;
      let zx0 = x0, zy0 = y0;
      let zw = Math.max(bw, MIN), zh = Math.max(bh, MIN);
      if (zw === MIN) zx0 = cx - MIN / 2;
      if (zh === MIN) zy0 = cy - MIN / 2;
      const px = zw * PAD, py = zh * PAD;
      svg.setAttribute("viewBox", `${zx0 - px} ${zy0 - py} ${zw + px * 2} ${zh + py * 2}`);
    } else {
      // dot-only: фиксированный зум вокруг центроида
      const SIZE = 120;
      svg.setAttribute("viewBox", `${cx - SIZE} ${cy - SIZE / 2} ${SIZE * 2} ${SIZE}`);
    }
    // Точка-подсказка — ТОЛЬКО для dot-only стран (без геометрии: GF/GP/MQ/RE/YT
    // и т. п.). Для стран с реальным контуром заливка видна и без неё.
    if (isDotOnly) {
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", cx);
      dot.setAttribute("cy", cy);
      dot.setAttribute("r", 6);
      dot.setAttribute("class", "map-country-dot--highlight");
      svg.appendChild(dot);
    }
  } else {
    svg.setAttribute("viewBox", `0 0 ${data.w} ${data.h}`);
  }

  flagEl.innerHTML = "";
  flagEl.classList.add("map-mode");
  const wrap = document.createElement("div");
  wrap.className = "map-find-container";
  wrap.appendChild(svg);
  flagEl.appendChild(wrap);
}

export function renderQuestion({ prompt, options, questionNumber, total, questionText }) {
  if (questionText) {
    document.querySelector(".question-text").textContent = questionText;
  }

  const flagEl = document.getElementById("flag-big");
  flagEl.innerHTML = "";
  flagEl.classList.remove("silhouette-fallback", "map-mode");
  if (prompt.type === "text") {
    flagEl.classList.add("text-prompt");
    flagEl.textContent = prompt.text;
  } else if (prompt.type === "coa") {
    flagEl.classList.remove("text-prompt");
    const country = prompt.country;
    flagEl.appendChild(localAssetImg("coats", country.cca2, "coa-img", () => { flagEl.textContent = "🏛"; }));
  } else if (prompt.type === "silhouette") {
    flagEl.classList.remove("text-prompt");
    const cca2 = (prompt.country.cca2 || "").toLowerCase();
    const img = document.createElement("img");
    img.className = "silhouette-img";
    img.alt = ""; // страна скрыта намеренно
    img.onerror = () => {
      img.onerror = null;
      flagEl.classList.add("silhouette-fallback");
      flagEl.textContent = "?"; // фолбэк (в норме недостижим — тема гейтится манифестом)
    };
    img.src = `data/silhouettes/${cca2}.svg`;
    flagEl.appendChild(img);
  } else if (prompt.type === "mapFind") {
    flagEl.classList.remove("text-prompt");
    renderMapFind(prompt.country, flagEl); // async: грузит карту и рисует в flagEl
  } else {
    flagEl.classList.remove("text-prompt");
    const country = prompt.country;
    flagEl.appendChild(localAssetImg("flags", country.cca2, "", () => { flagEl.textContent = codeToEmoji(country.cca2); }));
  }

  document.getElementById("q-counter").textContent = t("game.counter", { i: questionNumber, n: total });
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

// Рендерит карточку страны в произвольный контейнер. Единый рендерер для экрана
// «Информация» (в игре) и «Энциклопедия» → карточка страны (вид 3).
// Значения берутся из временных полей country._*, которые main.js вычисляет
// (lang-aware) перед вызовом — UI-слой не дёргает бизнес-логику.
export function renderCountryCard(country, regionLabel, container) {
  container.innerHTML = "";

  // --- Флаг (локальный) ---
  const flagEl = document.createElement("div");
  flagEl.className = "info-flag";
  flagEl.appendChild(localAssetImg("flags", country.cca2, "", () => { flagEl.textContent = codeToEmoji(country.cca2); }));
  container.appendChild(flagEl);

  // --- Имена ---
  const nameBlock = document.createElement("div");
  nameBlock.className = "info-name-block";
  const nameEl = document.createElement("h2");
  nameEl.className = "info-name";
  nameEl.textContent = country._displayName || country.cca2;
  nameBlock.appendChild(nameEl);
  const off = officialName(country);
  if (off) {
    const offEl = document.createElement("p");
    offEl.className = "info-official";
    offEl.textContent = off;
    nameBlock.appendChild(offEl);
  }
  container.appendChild(nameBlock);

  // --- Строки данных ---
  const rows = document.createElement("div");
  rows.className = "info-rows";
  function addRow(labelKey, value) {
    if (!value || value === "—") return;
    const div = document.createElement("div");
    div.className = "info-row";
    const lbl = document.createElement("span");
    lbl.className = "info-row-label";
    lbl.textContent = t(labelKey);
    const val = document.createElement("span");
    val.className = "info-row-value";
    val.textContent = value;
    div.append(lbl, val);
    rows.appendChild(div);
  }

  addRow("info.region",     regionLabel);
  addRow("info.capital",    country._capital);
  addRow("info.population", country._population);
  addRow("info.area",       country._area);
  addRow("info.density",    country._density);
  addRow("info.language",   country._language);
  addRow("info.currency",   country._currency);
  addRow("info.religion",   country._religion);
  addRow("info.native",     country._nativeName);
  container.appendChild(rows);

  // --- Герб (локальный; наличие проверяем по URL-справочнику из countries.json) ---
  const hasCoa = !!(country.coatOfArms && country.coatOfArms.svg);
  if (hasCoa) {
    const coaBlock = document.createElement("div");
    coaBlock.className = "info-coa-block";
    const coaLabel = document.createElement("p");
    coaLabel.className = "info-row-label";
    coaLabel.textContent = t("info.coa");
    const coaImg = document.createElement("div");
    coaImg.className = "info-coa-img";
    coaImg.appendChild(localAssetImg("coats", country.cca2, "coa-img", () => { coaImg.textContent = "🏛"; }));
    coaBlock.append(coaLabel, coaImg);
    container.appendChild(coaBlock);
  }
}

// Экран «Информация» (в игре): карточка страны в контейнер #info-card.
export function renderInfoScreen(country, regionLabel) {
  renderCountryCard(country, regionLabel, document.getElementById("info-card"));
}

// ---- Энциклопедия ----

// Вид 1: цветные карточки регионов с числом стран.
// items: [{ key, label, count, color }], onPick(key)
export function renderEncRegions(items, onPick) {
  const grid = document.getElementById("enc-region-grid");
  grid.innerHTML = "";
  for (const { key, label, count, color } of items) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "enc-region-card";
    card.style.background = color;
    const name = document.createElement("span");
    name.className = "enc-region-name";
    name.textContent = label;
    const cnt = document.createElement("span");
    cnt.className = "enc-region-count";
    cnt.textContent = t("enc.countries-count", { n: count });
    card.append(name, cnt);
    card.addEventListener("click", () => onPick(key));
    grid.appendChild(card);
  }
}

// Вид 2: сетка стран региона. items: [{ country, name }], onPick(country)
export function renderEncCountries(title, items, onPick) {
  document.getElementById("enc-countries-title").textContent = title;
  const grid = document.getElementById("enc-country-grid");
  grid.innerHTML = "";
  for (const { country, name } of items) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "enc-country-cell";
    const flag = document.createElement("span");
    flag.className = "enc-country-flag";
    flag.appendChild(localAssetImg("flags", country.cca2, "", () => { flag.textContent = codeToEmoji(country.cca2); }));
    const nameEl = document.createElement("span");
    nameEl.className = "enc-country-name";
    nameEl.textContent = name;
    cell.append(flag, nameEl);
    cell.addEventListener("click", () => onPick(country));
    grid.appendChild(cell);
  }
}

// Итог сессии: «За партию / Бонус / Бонус достижений / Итого».
// bonusText — строка приза или null. achBonus — суммарный % достижений (0 = скрыть строку).
export function renderResultSummary({ correct, total, sessionXP, bonusText, totalXP, achBonus = 0 }) {
  document.getElementById("result-text").textContent = t("result.score", { score: correct, total });
  document.getElementById("res-session-xp").textContent = "+" + sessionXP + " XP";
  const bonusRow = document.getElementById("res-bonus-row");
  if (bonusText) {
    bonusRow.style.display = "";
    // .innerHTML — bonusText из formatPrize() может содержать <img> (i18n.bonus.prize.chest).
    document.getElementById("res-bonus-val").innerHTML = bonusText;
  } else {
    bonusRow.style.display = "none";
  }
  const achRow = document.getElementById("res-ach-bonus-row");
  if (achRow) {
    if (achBonus > 0) {
      achRow.style.display = "";
      document.getElementById("res-ach-bonus-val").textContent = "+" + achBonus + "%";
    } else {
      achRow.style.display = "none";
    }
  }
  document.getElementById("res-total-xp").textContent = "+" + totalXP + " XP";
}

// ---- Экран «Обучение» (Работа над ошибками) ----

/**
 * Рендерит состояние экрана training.
 * @param {number} remaining — сколько ошибок ещё не закрыто (0..N)
 * @param {boolean} hadErrors — были ли ошибки в этой партии вообще
 */
export function renderTrainingScreen(remaining, hadErrors) {
  const titleEl    = document.getElementById("training-title");
  const subtitleEl = document.getElementById("training-subtitle");
  const startBtn   = document.getElementById("training-start-btn");
  const bonusBtn   = document.getElementById("training-bonus-btn");
  const skipBtn    = document.getElementById("training-skip-btn");
  const remEl      = document.getElementById("training-remaining");

  // Партия без единой ошибки — отдельный заголовок, Обучение сразу недоступно, Бонус активен.
  if (!hadErrors) {
    titleEl.textContent = t("training.no-errors");
    subtitleEl.textContent = "";
    startBtn.disabled = true;
    remEl.textContent = "";
    bonusBtn.disabled = false;
    skipBtn.style.display = "none";
    return;
  }

  titleEl.textContent = t("training.title");

  if (remaining === 0) {
    // Все ошибки исправлены в обучении: «Обучение завершено!», Бонус активен.
    subtitleEl.textContent = t("training.done");
    startBtn.disabled = true;
    remEl.textContent = "";
    bonusBtn.disabled = false;
    skipBtn.style.display = "none";
  } else {
    // Есть незакрытые ошибки: можно тренироваться или пропустить.
    subtitleEl.textContent = t("training.subtitle");
    startBtn.disabled = false;
    remEl.textContent = t("training.remaining", { n: remaining });
    bonusBtn.disabled = true;
    skipBtn.style.display = "";
  }
}

// ---- Экран «Бонус» ----

/**
 * Рендерит сетку 5×5 закрытых ячеек (фаза 1, до клика).
 * @param {Array<{flagSrcs: string[], cca2: string, prize: object}>} cells — 25 элементов
 * @param {Function} onPick — (index) => void
 */
export function renderBonusGrid(cells, onPick) {
  const grid = document.getElementById("bonus-grid");
  grid.innerHTML = "";
  document.getElementById("bonus-hint").style.display = "";
  document.getElementById("bonus-result").style.display = "none";
  document.getElementById("bonus-end-btn").disabled = true;

  cells.forEach((cell, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bonus-cell bonus-cell-closed";
    btn.dataset.index = String(index);

    const inner = document.createElement("span");
    inner.className = "bonus-cell-inner";

    const flag = document.createElement("span");
    flag.className = "bonus-cell-flag";
    if (cell.cca2) {
      flag.appendChild(localAssetImg("flags", cell.cca2, "", () => { flag.textContent = "🏳"; }));
    } else {
      flag.textContent = "🏳";
    }
    inner.appendChild(flag);
    btn.appendChild(inner);

    btn.addEventListener("click", () => onPick(index));
    grid.appendChild(btn);
  });
}

/**
 * Раскрывает все ячейки (фаза 2, после клика игрока). Выделяет выбранную.
 * @param {Array<{flagSrcs, cca2, prize}>} cells
 * @param {number} pickedIndex
 * @param {string} pickedCountryName — название страны, чей флаг был под выбранным бантом
 * @param {string} pickedPrizeText   — крупный текст приза («+4200 XP»)
 */
export function revealBonusGrid(cells, pickedIndex, pickedCountryName, pickedPrizeText) {
  const grid = document.getElementById("bonus-grid");
  const buttons = grid.querySelectorAll(".bonus-cell");

  buttons.forEach((btn, index) => {
    btn.classList.remove("bonus-cell-closed");
    btn.classList.add("bonus-cell-revealed");
    if (index === pickedIndex) btn.classList.add("bonus-cell-selected");
    btn.disabled = true;

    // Под бантом был флаг — он уже отрисован, добавляем строчку приза.
    const prize = cells[index].prize;
    const prizeEl = document.createElement("span");
    prizeEl.className = "bonus-cell-prize";
    const iconEl = document.createElement("span");
    iconEl.className = "bonus-cell-prize-icon";
    iconEl.innerHTML = prizeIcon(prize.type); // HTML — для chest вернётся <img>, для xp — эмодзи
    const valEl = document.createElement("span");
    valEl.textContent = prize.type === "xp"
      ? formatXpShort(prize.amount)
      : String(prize.amount);
    prizeEl.append(iconEl, valEl);
    (btn.querySelector(".bonus-cell-inner") || btn).appendChild(prizeEl);
  });

  document.getElementById("bonus-hint").style.display = "none";
  const resultBlock = document.getElementById("bonus-result");
  resultBlock.style.display = "";
  document.getElementById("bonus-result-country").textContent = pickedCountryName;
  // .innerHTML — pickedPrizeText может содержать <img> (см. i18n.bonus.prize.chest).
  document.getElementById("bonus-result-prize").innerHTML = pickedPrizeText;
  document.getElementById("bonus-end-btn").disabled = false;
}

// Возвращает HTML-строку для иконки приза (вставляется через .innerHTML).
// xp пока остаётся ✨ (специального ассета нет — общая XP-медалька визуально
// меньше и хуже читается на крупной плашке бонуса).
function prizeIcon(type) {
  switch (type) {
    case "xp":    return "✨";
    case "chest": return CHEST_BONUS_HTML;
    default:      return "?";
  }
}

// Короткий формат XP для тесных ячеек («4200» → «4.2K»).
function formatXpShort(n) {
  if (n >= 10000) return Math.round(n / 1000) + "K";
  if (n >= 1000)  return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

// ---- Экран «Задания» ----

/**
 * Рендерит весь экран заданий из вью-модели (логика/state — в main.js).
 * @param {Object} vm
 * @param {Object} vm.daily       — { available, prizeXp, prizeChests, countdown }
 * @param {Object} vm.streak      — { count, hint, milestones: [{ days, reward, reached, current, daysLeft }] }
 * @param {string} vm.questsTimer — текст таймера сброса квестов («Обновление через HH:MM:SS»)
 * @param {Array}  vm.quests      — [{ id, tier, label, progress, goal, rewardXp, rewardChests, completed, claimed }]
 * @param {Function} onClaimDaily — () => void
 * @param {Function} onClaimQuest — (id) => void
 */
export function renderTasks(vm, onClaimDaily, onClaimQuest) {
  renderTasksDaily(document.getElementById("tasks-daily-body"), vm.daily, onClaimDaily);
  renderTasksStreak(document.getElementById("tasks-streak-body"), vm.streak);
  setQuestsTimerText(vm.questsTimer);
  renderTasksQuests(document.getElementById("tasks-quests-body"), vm.quests, onClaimQuest);
}

function renderTasksDaily(body, daily, onClaim) {
  body.innerHTML = "";
  const prize = document.createElement("div");
  prize.className = "tasks-prize-line";
  prize.innerHTML = `+${daily.prizeXp} XP   +${daily.prizeChests} ${CHEST_HTML}`;
  body.appendChild(prize);

  if (daily.available) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tasks-claim-btn";
    btn.textContent = t("tasks.claim-daily");
    btn.addEventListener("click", onClaim);
    body.appendChild(btn);
  } else {
    const timer = document.createElement("div");
    timer.className = "tasks-timer";
    const label = document.createElement("span");
    label.textContent = t("tasks.next-in") + " ";
    const cd = document.createElement("span");
    cd.id = "tasks-daily-countdown";
    cd.textContent = daily.countdown;
    timer.append(label, cd);
    body.appendChild(timer);
  }
}

function renderTasksStreak(body, streak) {
  body.innerHTML = "";
  const line = document.createElement("div");
  line.className = "tasks-streak-line";
  line.textContent = "🔥 " + t("tasks.streak-days", { n: streak.count });
  body.appendChild(line);

  if (streak.hint) {
    const hint = document.createElement("p");
    hint.className = "tasks-streak-hint";
    hint.textContent = streak.hint;
    body.appendChild(hint);
  }

  const marks = document.createElement("div");
  marks.className = "tasks-milestones";
  for (const m of streak.milestones) {
    const mk = document.createElement("div");
    mk.className = "tasks-milestone"
      + (m.reached ? " reached" : (m.current ? " current" : " locked"));

    const days = document.createElement("div");
    days.className = "tasks-milestone-days";
    days.textContent = t("tasks.streak-days", { n: m.days });
    mk.appendChild(days);

    const reward = document.createElement("div");
    reward.className = "tasks-milestone-reward";
    reward.innerHTML = `${m.reward.xp} XP +${m.reward.chests}${CHEST_HTML}`;
    mk.appendChild(reward);

    const status = document.createElement("div");
    status.className = "tasks-milestone-status";
    if (m.reached) status.textContent = "✅";
    else if (m.current) status.textContent = t("tasks.streak.left", { n: m.daysLeft });
    else status.textContent = "🔒";
    mk.appendChild(status);

    marks.appendChild(mk);
  }
  body.appendChild(marks);
}

const QUEST_TIERS = ["easy", "medium", "hard"];

function renderTasksQuests(body, quests, onClaim) {
  body.innerHTML = "";
  for (const tier of QUEST_TIERS) {
    const group = quests.filter((q) => q.tier === tier);
    if (!group.length) continue;
    const title = document.createElement("div");
    title.className = "tasks-tier-title";
    title.textContent = t("tasks.tier." + tier);
    body.appendChild(title);
    for (const q of group) body.appendChild(buildQuestCard(q, onClaim));
  }
}

function buildQuestCard(q, onClaim) {
  const card = document.createElement("div");
  card.className = "tasks-quest tier-" + q.tier + (q.claimed ? " claimed" : "");

  const label = document.createElement("div");
  label.className = "tasks-quest-label";
  label.textContent = q.label;
  card.appendChild(label);

  const row = document.createElement("div");
  row.className = "tasks-quest-row";

  const bar = document.createElement("div");
  bar.className = "tasks-quest-bar";
  const fill = document.createElement("div");
  fill.className = "tasks-quest-bar-fill";
  const pct = q.goal > 0 ? Math.min(100, (q.progress / q.goal) * 100) : 0;
  fill.style.width = pct.toFixed(0) + "%";
  bar.appendChild(fill);

  const prog = document.createElement("span");
  prog.className = "tasks-quest-prog";
  prog.textContent = Math.min(q.progress, q.goal) + " / " + q.goal;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tasks-quest-btn";
  if (q.claimed) {
    btn.textContent = t("tasks.claimed");
    btn.disabled = true;
  } else {
    btn.textContent = t("tasks.claim");
    btn.disabled = !q.completed;
    if (q.completed) btn.addEventListener("click", () => onClaim(q.id));
  }

  row.append(bar, prog, btn);
  card.appendChild(row);

  const reward = document.createElement("div");
  reward.className = "tasks-quest-reward";
  reward.innerHTML = `+${q.rewardXp} XP  +${q.rewardChests} ${CHEST_HTML}`;
  card.appendChild(reward);

  return card;
}

// Обновить только текст обратного таймера дейлика (вызывается из setInterval).
export function setDailyCountdownText(str) {
  const el = document.getElementById("tasks-daily-countdown");
  if (el) el.textContent = str;
}

// Обновить текст таймера сброса квестов «Обновление через …».
export function setQuestsTimerText(str) {
  const el = document.getElementById("tasks-quests-timer");
  if (el) el.textContent = str;
}

// Показать/скрыть бейдж-уведомление на кнопке «Задания» в меню.
export function setTasksBadge(show) {
  const badge = document.getElementById("menu-tasks-badge");
  if (badge) badge.hidden = !show;
}

// ---- Экран «Достижения» ----

const ACH_CAT_EMOJI = { region: "🌍", topic: "🧩", volume: "📊", mastery: "🏆" };

/**
 * Рендерит экран достижений из вью-модели (логика — в main.js).
 * @param {Object} vm
 * @param {number} vm.totalBonus  — суммарный XP-бонус %
 * @param {Array}  vm.categories  — [{ key, title, items: [...] }]
 */
export function renderAchievements(vm) {
  const totalEl = document.getElementById("achievements-bonus-total");
  if (totalEl) {
    if (vm.totalBonus > 0) {
      totalEl.textContent = t("achievements.bonus", { n: vm.totalBonus });
      totalEl.style.display = "";
    } else {
      totalEl.style.display = "none";
    }
  }

  const list = document.getElementById("achievements-list");
  list.innerHTML = "";
  for (const cat of vm.categories) {
    const section = document.createElement("div");
    section.className = "ach-section";
    const h = document.createElement("h3");
    h.className = "ach-section-title";
    h.textContent = (ACH_CAT_EMOJI[cat.key] || "") + " " + cat.title;
    section.appendChild(h);
    for (const item of cat.items) section.appendChild(buildAchItem(item));
    list.appendChild(section);
  }
}

function buildAchItem(item) {
  const row = document.createElement("div");
  row.className = "ach-item" + (item.done ? " ach-done" : "");

  // Заголовок: название (+ уровень для многоуровневых) + звёзды
  const head = document.createElement("div");
  head.className = "ach-item-head";
  const name = document.createElement("span");
  name.className = "ach-name";
  name.textContent = item.isMastery
    ? item.name
    : item.name + " — " + t("achievements.level", { n: item.level });
  head.appendChild(name);

  const stars = document.createElement("span");
  stars.className = "ach-stars";
  if (item.level > 0) {
    const on = document.createElement("span");
    on.className = "ach-star-on";
    on.textContent = "★".repeat(item.level);
    stars.appendChild(on);
  }
  if (item.maxLevel - item.level > 0) {
    const off = document.createElement("span");
    off.className = "ach-star-off";
    off.textContent = "☆".repeat(item.maxLevel - item.level);
    stars.appendChild(off);
  }
  head.appendChild(stars);
  row.appendChild(head);

  if (item.isMastery) {
    const status = document.createElement("div");
    status.className = "ach-status";
    status.textContent = item.done ? "✅" : "🔒";
    row.appendChild(status);
  } else {
    const bar = document.createElement("div");
    bar.className = "ach-bar";
    const fill = document.createElement("div");
    fill.className = "ach-bar-fill";
    const maxed = item.level >= item.maxLevel;
    const pct = maxed ? 100
      : (item.nextThreshold ? Math.min(100, (item.progress / item.nextThreshold) * 100) : 100);
    fill.style.width = pct.toFixed(0) + "%";
    bar.appendChild(fill);
    row.appendChild(bar);

    const prog = document.createElement("div");
    prog.className = "ach-prog";
    prog.textContent = maxed ? "MAX" : (item.progress + " / " + item.nextThreshold);
    row.appendChild(prog);
  }

  if (item.xpBonusPerLevel > 0) {
    const b = document.createElement("div");
    b.className = "ach-bonus-label";
    b.textContent = t("achievements.xp-bonus", { n: item.bonusPercent });
    row.appendChild(b);
  }
  return row;
}

// Показать/скрыть бейдж-уведомление на кнопке «Достижения» в меню.
export function setAchievementsBadge(show) {
  const badge = document.getElementById("menu-achievements-badge");
  if (badge) badge.hidden = !show;
}

// ---- Попап достижения (конфетти + звук) ----

// Конфетти на Canvas без библиотек. Возвращает функцию остановки.
function startConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 3,
    color: ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#a855f7"][Math.floor(Math.random() * 5)],
    speed: Math.random() * 2 + 1, swing: Math.random() * 2 - 1, angle: 0,
  }));
  let frame; const end = Date.now() + 3000;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.angle += 0.05; p.x += Math.sin(p.angle) * p.swing; p.y += p.speed;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      ctx.fillStyle = p.color; ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r / 2, p.angle, 0, Math.PI * 2); ctx.fill();
    }
    if (Date.now() < end) frame = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
  return () => cancelAnimationFrame(frame);
}

// Короткий мажорный аккорд (Web Audio API, без файлов).
function playAchievementSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t); osc.stop(t + 0.35);
    });
  } catch (e) {}
}

let stopConfetti = null;

/**
 * Показывает попап нового достижения.
 * @param {Object} data — { icon, name, levelStr, rewardStr }
 */
export function showAchievementPopup({ icon, name, levelStr, rewardStr }) {
  document.getElementById("ach-icon").textContent = icon;
  document.getElementById("ach-name").textContent = name;
  document.getElementById("ach-level").textContent = levelStr;
  const rewardEl = document.getElementById("ach-reward");
  // .innerHTML — rewardStr из main.js handleNewAchievementLevels может содержать <img>.
  rewardEl.innerHTML = rewardStr || "";
  rewardEl.style.display = rewardStr ? "" : "none";

  const popup = document.getElementById("achievement-popup");
  popup.style.display = "flex";

  if (stopConfetti) stopConfetti();
  const canvas = document.getElementById("ach-confetti");
  stopConfetti = startConfetti(canvas);
  playAchievementSound();
}

export function hideAchievementPopup() {
  if (stopConfetti) { stopConfetti(); stopConfetti = null; }
  document.getElementById("achievement-popup").style.display = "none";
}

// ---- Попап XP-награды (дейлик/квесты) ----

/**
 * Показывает попап XP-награды с анимацией бара.
 * @param {Object} opts — { earnedXp, bonusPercent, xpBefore, xpAfter, getXPProgress }
 */
export function showXpRewardPopup({ earnedXp, bonusPercent, xpBefore, xpAfter, getXPProgress }) {
  document.getElementById("xpr-amount").textContent = "+" + earnedXp + " XP";
  const bonusEl = document.getElementById("xpr-bonus");
  if (bonusPercent > 0) {
    bonusEl.textContent = t("ach.xp-bonus-line", { n: bonusPercent });
    bonusEl.style.display = "";
  } else {
    bonusEl.style.display = "none";
  }
  const levelupEl = document.getElementById("xpr-levelup");
  levelupEl.style.display = "none";
  levelupEl.textContent = "🎉 " + t("level.up");

  document.getElementById("xp-reward-popup").style.display = "flex";

  animateXPBar(xpBefore, xpAfter, getXPProgress, () => {
    levelupEl.style.display = "";
  }, 1200, {
    oldEl: document.getElementById("xpr-bar-old"),
    newEl: document.getElementById("xpr-bar-new"),
    caption: document.getElementById("xpr-bar-label"),
    levelFrom: null, levelTo: null,
  });
}

export function hideXpRewardPopup() {
  document.getElementById("xp-reward-popup").style.display = "none";
}
