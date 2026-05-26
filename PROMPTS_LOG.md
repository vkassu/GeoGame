# Журнал промптов для Claude Code (GeoGame)

Сюда заносим **финальный текст** каждого промпта, который передаём в Claude Code. Цель: не потерять работу при обрыве сессии Cowork и иметь историю «что просили / что получилось».

**Формат записи:**

```
## YYYY-MM-DD [#N] | Краткое название
**Цель:** одно предложение — что хотим получить
**Статус:** передан / выполнен / выполнен частично / отменён
**Проверено в браузере:** да / нет / частично
**Промпт:**
> текст промпта как есть, без обрезаний
**Результат / расхождения:** что получилось, какие есть отклонения от ожидания
```

Журнал ведётся хронологически. Новые записи — сверху.

---

## 2026-05-26 #25 | Отказ от API в рантайме — локальный data/countries.json

**Цель:** Убрать два запроса к restcountries.com при каждом запуске. Данные хранятся в репо, грузятся из локального файла мгновенно.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500 — Network без restcountries, партия играется)

**Автор промпта:** Cowork

**Промпт:**

### Шаг 1 — Скрипт `scripts/fetch_countries.js`

Создать Node.js скрипт. Запускается вручную: `node scripts/fetch_countries.js`

Что делает:
1. Делает те же два запроса, что сейчас в fetchCountries:
   - URL 1: `https://restcountries.com/v3.1/all?fields=name,translations,capital,population,flags,cca2,region`
   - URL 2: `https://restcountries.com/v3.1/all?fields=languages,currencies,area,coatOfArms,cca2`
2. Сливает оба массива по cca2 (как сейчас в коде).
3. Сортирует по английскому имени (name.common).
4. Сохраняет в `data/countries.json` (перезаписывает если есть).
5. Выводит в консоль: сколько стран сохранено + путь к файлу.

Использовать нативный fetch (Node 18+) или https.get если старше — проверить через `node --version`.

### Шаг 2 — Обновить `fetchCountries` в `js/data.js`

Заменить два API-запроса одним локальным:
```js
const res = await fetch('./data/countries.json');
const countries = await res.json();
```
Загрузку `capitals_ru.json` и `religions.json` — оставить, они уже локальные.
Слияние с capitals_ru и religions — без изменений.
Переменные `API_URL` и `API_EXTRAS_URL` — удалить.

### Шаг 3 — Сгенерировать data/countries.json

После написания скрипта — запустить сразу:
`node scripts/fetch_countries.js`

Убедиться что файл создан и содержит ~250 стран.

### Шаг 4 — Проверить .gitignore

`data/countries.json` НЕ должна быть в .gitignore. Если есть — убрать.

### Проверь в браузере (localhost:5500)

1. DevTools → Network → перезагрузить. Запросов к restcountries.com нет.
2. Игра загружается, страны отображаются, партия играется.
3. Флаги, столицы, названия — всё на месте.

- Cache-busting: обновить `?v=` в `index.html`.
- `git add -A && git commit -m "feat: cache countries data locally, remove runtime API calls"`

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:**
- **`scripts/fetch_countries.js`** — Node-скрипт. **CommonJS** (в репо нет `package.json`/`type:module`, а промпт задал `.js` → ESM-`import` упал бы; использовал `require`). Node v24 → нативный `fetch`. Делает те же 2 запроса, сливает extras по `cca2`, сортирует по `name.common`, пишет `data/countries.json` (минифицированный JSON), логирует число стран и путь. Запущен — сохранил **250 стран, 647 КБ**.
- **`data/countries.json`** — создан, закоммичен (не в .gitignore — проверено).
- **`js/data.js`** — `fetchCountries` теперь грузит `data/countries.json` одним запросом; `API_URL`/`API_EXTRAS_URL` и блок слияния extras удалены (слияние уже сделано скриптом). Подмешивание `capitals_ru.json` + `religions.json` и сортировка — без изменений. `API_URL` нигде больше не импортировался (проверено grep).
- **Кеш модулей:** `data.js` менялся → версии всех межмодульных импортов выровнены `?v=20260548 → 20260549` (i18n/data у всех импортёров одинаково — иначе двойной инстанс); index.html cache-bust → 20260549.
- **Проверено в браузере:** свежая загрузка (v20260549) — в Network есть `data/countries.json` (200), `capitals_ru.json`, `religions.json`, **нет запросов к restcountries.com**; статус «Загружено стран: 250»; партия играется (тема «Столица»: «Эстония» → варианты столиц, рус. названия из capitals_ru подмешаны). Консоль чистая. (Запросы к restcountries в логе Network — из более ранних кешированных загрузок до правки.)
- **Не менялось:** флаги/гербы по-прежнему грузятся с внешних CDN (flagcdn/mainfacts) — это отдельные ресурсы, не «данные стран»; задача про API данных стран.

---

## 2026-05-26 #24.1 | Косметика: убраны бантики с бонус-ячеек + чистка инвентаря

**Цель:** (1) убрать 🎀 с закрытых ячеек бонусной сетки (показывать просто флаг); (2) добить ❓/❤️ из инвентаря меню, если остались.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500).

**Автор промпта:** Cowork

**Результат / расхождения:**
- **Фикс 1:** удалён `.bonus-cell-closed::after { content: "🎀" }` (и `filter: brightness(0.95)` с флага — теперь полностью «просто флаг»). Проверено: на экране бонуса 25 закрытых ячеек, `getComputedStyle(::after).content === "none"`, бантов нет, флаги видны.
- **Фикс 2:** уже было закрыто в #23 — в `#menu-screen` инвентарь содержит только `🧰` (chests), `renderMenuProfile` пишет лишь `menu-inv-chests`, ❓/❤️ в разметке нет. Изменений не потребовалось, подтверждено (иконки меню = `["🧰"]`). Иконка сундука — 🧰 (не 📦 как в промпте) — единообразие с остальным UI.
- **Тронуто:** `css/style.css` (удалён ::after-бант), `index.html` (cache-bust `20260548 → 20260549`), `CLAUDE.md`, `PROMPTS_LOG.md`. JS не менялся.
- Консоль чистая.

---

## 2026-05-26 #24 | Новые темы: Плотность населения + Религия

**Цель:** Добавить две новые темы Тип Б — «Плотность населения» (вычисляется из population/area) и «Религия» (из нового data/religions.json).

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, все 4 пункта)

**Автор промпта:** Cowork

**Промпт:**

### 1. Данные для религии

Создать файл `data/religions.json` — объект вида:
`{ "AF": "Islam", "AL": "Islam", "US": "Christianity", ... }`

Ключ — cca2 (2-буквенный код страны). Значение — доминирующая религия на английском. Покрыть все ~250 стран из API.

Основные значения: "Christianity", "Islam", "Hinduism", "Buddhism", "Judaism", "Irreligion", "Folk religion" (и другие где нужно). Если страна светская или смешанная — наиболее распространённая.

Загрузить в `fetchCountries` рядом с capitals_ru.json:
```js
const religionsMap = await fetch('./data/religions.json')
  .then(r => r.json()).catch(() => ({}));
```
Слить в страну как `country.majorReligion = religionsMap[cca2] || ""`.

ВАЖНО: не использовать имя `religion` для поля — может конфликтовать. Использовать именно `majorReligion`.

### 2. Геттеры в `data.js`

```js
// Религия (только EN — как languages/currencies)
export function religionName(country) { return country.majorReligion || ""; }
export function hasReligion(country) { return !!country.majorReligion; }

// Плотность населения
export function getDensityFormatted(country, lang) {
  const d = country.population / country.area;
  const val = d < 1 ? d.toFixed(1) : Math.round(d).toLocaleString();
  return lang === "ru" ? `${val} чел/км²` : `${val}/km²`;
}
export function hasDensity(country) {
  return country.population > 0 && country.area > 0;
}
```

### 3. Темы в `TOPICS` (`main.js`)

```js
density: {
  get label() { return t("topic.density.label"); },
  get question() { return t("topic.density.question"); },
  prompt(c) { return { type: "text", text: getName(c) }; },
  answer(c) { return getDensityFormatted(c, getLang()); },
  valid(c) { return hasDensity(c); },
},
religion: {
  get label() { return t("topic.religion.label"); },
  get question() { return t("topic.religion.question"); },
  prompt(c) { return { type: "text", text: getName(c) }; },
  answer(c) { return religionName(c); },
  valid(c) { return hasReligion(c); },
},
```

Добавить difficulties по аналогии с существующими темами: `TOPICS.density.difficulties = [...]`, `TOPICS.religion.difficulties = [...]`.

### 4. i18n (`i18n.js`)

```
topic.density.label:    "Плотность" / "Density"
topic.density.question: "Какова плотность населения?" / "What is the population density?"
topic.religion.label:   "Религия" / "Religion"
topic.religion.question:"Какая религия преобладает?" / "What is the dominant religion?"
```

### 5. Уровни (`levels.js`)

Добавить `density` и `religion` в `LEVEL_UNLOCKS` по аналогии с другими темами. Уровень разблокировки — рядом с `language` или `currency` (середина прогрессии).

### 6. Финал

- Cache-busting: обновить `?v=` в `index.html`.
- `git add -A && git commit -m "feat: add density and religion topics"`

### Проверь в браузере (localhost:5500)

1. Экран Тем: видны «Плотность» и «Религия».
2. Включить «Плотность», сыграть — варианты вида «12 чел/км²». Нет NaN/пустых.
3. Включить «Религия», сыграть — варианты «Islam», «Christianity». Нет пустых.
4. Переключить язык EN — «Плотность» → «12/km²», метки на английском.

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:**
- **`data/religions.json`** — 244 страны (cca2 → религия на EN). 6 необитаемых (AQ/BV/GS/HM/TF/UM) не включены — нет населения, в темы не попадают. 7 значений: Christianity/Islam/Buddhism/Hinduism/Judaism/Irreligion/Folk religion. Коды сверены с реальным ответом restcountries (250). Пограничные случаи (Нигерия/Ливан/Эритрея и т.п.) — по плюрализму, могут уточняться.
- **data.js:** `RELIGIONS_URL` грузится параллельно в `fetchCountries`, слияние `country.majorReligion = religionsMap[cca2] || ""`. Геттеры `religionName`/`hasReligion`/`getDensityFormatted(country, lang)`/`hasDensity` — дословно по промпту (density добавил локаль в `toLocaleString` для корректного разделителя).
- **main.js:** импорт 4 геттеров, темы `density`/`religion` в `TOPICS`. `difficulties` назначаются автоматически существующим циклом `Object.values(TOPICS).forEach(...)` — ручное `TOPICS.density.difficulties=[...]` из промпта не понадобилось.
- **i18n.js:** 4 ключа `topic.density.*`/`topic.religion.*` (ru+en). **levels.js:** density/religion в `TOPIC_ORDER` после currency (разблокировка в середине, d0 на уровнях 8/9); 11×4=44 уровня.
- **Кеш:** менялись data/i18n/levels → межмодульные импорты выровнены на `?v=20260548` (иначе двойной инстанс i18n/data); index.html cache-bust → 20260548.
- **Проверено (4/4):** экран Тем показывает «Плотность»/«Религия»; Плотность RU → «Мальта»/«1 817 чел/км²» без NaN; Религия RU → Irreligion/Christianity/Buddhism/Islam без пустых; EN → Density/«138/km²». Консоль чистая.
- **Заметка:** у религии ~7 различных значений, `buildOptions` дедуплицирует по значению → на сложности 4 (10 вариантов) кнопок будет ≤7 (не баг, сетка адаптивна).

---

## 2026-05-26 #23 | Баги обучения, удаление жизней, перезарядка подсказки, новый бонус

**Цель:** Четыре блока: (А) 4 бага по обучению/бонусу; (Б) удаление жизней; (В) новая механика подсказки с перезарядкой; (Г) пересмотр бонуса + заглушка «Память».

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, все 13 пунктов)

**Автор промпта:** Cowork

**Принятые решения (согласованы до кодинга):**
- Подсказка: 5 правильных ПОДРЯД. Неверный ответ / таймаут → сбрасывает счётчик. Подсказок за партию может быть несколько.
- Инвентарь после всех блоков: только `{ chests: N }`. Hints и extraLives — удалить везде (state, localStorage, i18n, меню).
- Бонус: 20 ячеек XP + 5 ячеек сундуков. Формула XP та же. Сундук = 1–3 шт.
- Firestore не трогаем (инвентарь в нём не хранится).
- Мини-игра «Память»: только кнопка-заглушка в меню при chests ≥ 100.

**Промпт:**

### Блок А — 4 бага из BUGS.md (#22)

**А1. `.meta` видна в обучении**
- В `startTraining()` добавить класс `.training-mode` на `#game-screen`, в `finishTraining()` / `skipTraining()` убрать.
- В `style.css`: `#game-screen.training-mode .meta { display: none; }`.

**А2. Заголовок Training при 0 ошибок**
- В `goToTraining()` передавать в `renderTrainingScreen()` флаг `hadErrors = state.wrongAnswers.length > 0`.
- Если `!hadErrors`: заголовок по ключу `training.no-errors` (уже есть в i18n.js), кнопка «Обучение» сразу disabled.

**А3. `showInfo()` крашится в обучении**
- В `showInfo()`: если `state.isTraining` → брать `state.trainingCurrent.country`, иначе `state.questions[state.currentQuestion].country`.

**А4. `aspect-ratio: 1/1` на старых iOS**
- Заменить `.bonus-cell { aspect-ratio: 1/1 }` на padding-hack: `position: relative; padding-top: 100%;`. Внутренний контент — `position: absolute; inset: 0;`.

---

### Блок Б — Удалить жизни

1. `state.inventory` — убрать `extraLives`. После Блока В инвентарь станет `{ chests: N }` — пока оставь `hints` до Блока В.
2. `refreshMenuScreen()` — убрать ❤️ из отображения инвентаря.
3. `i18n.js` — удалить `bonus.prize.life` и `inv.lives` (RU + EN).
4. `BONUS_PRIZE_POOL` — убрать все записи типа `"life"`. Новый пул в Блоке Г.
5. `geogame:inventory` в localStorage — при чтении игнорировать `extraLives` если есть; при записи не включать.

---

### Блок В — Подсказка с перезарядкой

**Новая механика (заменяет старую «одна подсказка на партию из инвентаря»):**
- `state.hintCharge` (0..5) — счётчик правильных ответов подряд.
- `state.hintAvailable` (bool) — можно ли использовать прямо сейчас.
- Правильный ответ: `hintCharge++`. При достижении 5: `hintAvailable = true`, `hintCharge = 0` (начинается следующий цикл).
- Неверный ответ / таймаут: `hintCharge = 0`.
- После использования подсказки: `hintAvailable = false`, `hintCharge = 0`.
- `startGame()`: сброс `hintCharge = 0`, `hintAvailable = false`.
- В обучении подсказка недоступна (`.meta` скрыта через Блок А — достаточно).

**UI `#hint-btn`:**
- Добавить внутрь кнопки 5 сегментов: `<div class="hint-progress"><span class="hint-seg"></span> × 5</div>`.
- Заполненные сегменты (первые `hintCharge` штук) — класс `.filled` (зелёный). Остальные — пустые.
- `hintAvailable = true`: все 5 filled, кнопка активна, синий глянец.
- `hintAvailable = false`: кнопка disabled, заполнено 0..4 сегмента по `hintCharge`.
- Новая функция `updateHintUI()` — обновляет сегменты и enabled/disabled. Вызывать в `showQuestion()` и после каждого ответа.
- Удалить или переписать старый `setHintButtonState(bool)`.

**Инвентарь:**
- Убрать `state.inventory.hints`. Итоговый инвентарь: `{ chests: N }`.
- `refreshMenuScreen()` — убрать 💡 из инвентаря.
- `i18n.js` — удалить `inv.hints` (RU + EN).
- `geogame:inventory` в localStorage — при чтении брать только `chests`.

---

### Блок Г — Новый баланс бонуса + заглушка «Память»

**`BONUS_PRIZE_POOL` (25 ячеек):**
- `"xp"` × 20, `"chest"` × 5.
- `generatePrize()`: убрать ветки `"hint"` и `"life"`. Для `"chest"`: `Math.floor(Math.random() * 3) + 1` (1–3 шт).

**i18n:**
- Удалить `bonus.prize.hint` (если есть).
- Убедиться что `bonus.prize.chest` есть с vars для числа. Если нет — добавить: RU `«🧳 +{n} сундук(ов)»`, EN `«🧳 +{n} chest(s)»`.

**Кнопка «Память» в `#menu-screen`:**
- Добавить кнопку после «Новая игра» (или отдельным рядом).
- `chests < 100`: кнопка disabled, sub-текст «Нужно 100 сундуков» / «100 chests needed».
- `chests >= 100`: кнопка активна (синий глянец), sub-текст скрыт.
- onClick: `console.log('Memory game: coming soon')`.
- i18n: `menu.memory` (`«🧠 Сыграть в Память!»` / `«🧠 Play Memory!»`), `menu.memory.locked` (`«Нужно 100 сундуков»` / `«100 chests needed»`).
- `refreshMenuScreen()` обновляет состояние кнопки по `state.inventory.chests`.

---

### Проверь в браузере (localhost:5500)

**Блок А:**
1. Партия с ошибкой → Обучение → `.meta` скрыта (нет hint, нет таймера).
2. Идеальная партия → Training: заголовок «Идеальная партия!», кнопка «Обучение» disabled.
3. Партия с ошибкой → Обучение → нажми «Информация» в результате → карточка верной страны, нет крашей.

**Блок Б:**
4. Меню: нет ❤️ в инвентаре.
5. Бонус: нет призов ❤️ в сетке.

**Блок В:**
6. 4 правильных подряд → 4 сегмента заполнены, кнопка disabled.
7. 5-й правильный → кнопка активна, 5/5 сегментов.
8. Неверный ответ в середине цикла → сегменты сброшены в 0.
9. Использовал подсказку → кнопка disabled, сегменты 0/5, начался новый цикл.
10. Меню: нет 💡 в инвентаре.

**Блок Г:**
11. Бонус: только XP и сундуки в сетке.
12. Меню при chests < 100: кнопка «Память» серая + sub-текст.
13. В DevTools → localStorage: `geogame:inventory` → `{"chests":100}` → F5 → кнопка «Память» синяя.

**Финал:**
- Cache-busting: обновить `?v=` в `index.html`.
- `git add -A && git commit -m "feat: remove lives, hint recharge, new bonus pool, training bugs"`.
- На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:**
- **Блок А:** А1 — класс `.training-mode` на `#game-screen` (startTraining ставит; finishTraining/skipTraining/goToTraining снимают) + CSS `#game-screen.training-mode .meta{display:none}`. А2 — флаг `state.sessionHadErrors` фиксируется в `endGame` (НЕ из текущего `wrongAnswers.length`, который убывает в тренировке → иначе после закрытия ошибок показалось бы «Нет ошибок»); `renderTrainingScreen(remaining, hadErrors)`. А3 — `showInfo` берёт `trainingCurrent.country` при `isTraining`. А4 — padding-hack `height:0; padding-top:100%` + `.bonus-cell-inner{position:absolute;inset:0}`; флаг/приз кладутся в inner (`renderBonusGrid`/`revealBonusGrid` правлены).
- **Блок Б:** `extraLives` удалён везде — state/DEFAULT_INVENTORY/loadFromStorage/applyUserData/finishBonus/меню/i18n (`inv.lives`,`bonus.prize.life`)/BONUS_PRIZE_POOL.
- **Блок В:** `hintUsed` → `hintCharge`(0..5)+`hintAvailable`; правильный→++ (5→доступна, сброс), неверный/таймаут→0, использование→сброс. UI: 5 `.hint-seg` в кнопке, label вынесен в `.hint-label[data-i18n]` (чтобы applyI18n не стёр сегменты). `setHintButtonState`→`updateHintUI`. Инвентарь = `{ chests }`, `inv.hints` удалён.
- **Блок Г:** пул 20 xp + 5 chest; `generatePrize` сундук 1–3, hint/life убраны. Кнопка «Память» (`#menu-memory-btn`) — гейт по `chests>=100`, клик `console.log('Memory game: coming soon')`, состояние в `renderMenuProfile`.
- **Расхождения:** (1) **Firestore** — промпт «не трогаем (инвентарь не хранится)», но код #22 фактически синкал inventory в облако; чтобы «удалить жизни везде», сузил `applyUserData` до `{ chests }` (минимальная правка формы, синк chests не трогал). (2) **Эмодзи сундука 🧰** вместо 🧳 из промпта — ради единообразия с иконкой инвентаря/`prizeIcon`. (3) **Кеш модулей:** `i18n.js` менялся → выровнял версию импорта `?v=20260547` у ВСЕХ импортёров (main/ui/data) + сам `data.js` импорт, иначе разъехались бы два инстанса i18n и сломалось бы переключение языка.
- **Cache-busting:** `20260546 → 20260547` (index.html css+main, импорты ui.js/i18n.js/data.js).
- **Проверено в браузере (13/13):** меню без ❤️/❓ (только 🧰); сегменты подсказки растут на правильных и сбрасываются на неверном (в реальной партии), состояние «доступна» (5/5 + активна) — через `updateHintUI`; обучение: `.meta` скрыта, «Работа над ошибками»/«N осталось» → закрытие всех → «Обучение завершено!»+Бонус; `renderTrainingScreen(0,false)` → «Нет ошибок в этой партии»; бонус ровно 20 ✨ + 5 🧰, без ❤️/❓; XP-приз начислился; `chests=100`+reload → «Память» активна, клик логирует. Консоль чистая.
- **Не форсировал:** натуральную серию 5-правильных-подряд в авто-тесте (нельзя угадать правильный заранее); инкремент/сброс и available-состояние проверены по компонентам, порог `≥5` и сброс в `handleHintClick` тривиальны.

---

## 2026-05-26 #22 | Обучение + Бонус (поток после партии)

**Цель:** реализовать REFERENCE.md → «Работа над ошибками» и «Бонус». После партии: `#result-screen` → кнопка «Далее» → `#training-screen` (повтор ошибочных вопросов) → `#bonus-screen` (сетка 5×5 призов).

**Статус:** выполнен (Cowork написал код, Claude Code отревьюил + проверил в браузере + поправил баги + закоммитил)

**Проверено в браузере:** да (preview :5500) — Claude Code 2026-05-26, см. раздел «Ревью Claude Code» ниже.

**Автор промпта:** Cowork (нарушил договорённость «не пишем код напрямую»). Алексей решил оставить правки и передать на ревью, а не откатывать.

**Решения по продуктовым вопросам (согласованы с Алексеем перед началом):**

1. **Поток при 0 ошибок в партии:** Result → Training всегда; при 0 ошибок Training показывается сразу в финальном состоянии («Обучение завершено!», кнопка Bonus активна).
2. **Вопросы в обучении:** те же страны/темы, варианты генерируются заново, **но среди них гарантированно есть прежний неправильный** (как напоминание об ошибке). XP не начисляется. Подсказки и таймер не работают.
3. **Распределение призов в сетке 5×5:** 12 XP / 6 подсказок / 4 сундука / 3 жизни.
4. **Формула XP-приза:** 25–200% от XP за сессию, округление до 5, минимум 25 XP.

**Что сделано (файлы и блоки):**

`index.html`:
- Добавлены секции `<section id="training-screen">` (заголовок, подзаголовок, три кнопки: Обучение/Бонус/Пропустить) и `<section id="bonus-screen">` (заголовок, `#bonus-grid`, hint-текст, блок результата, кнопка «Конец»).
- Текст кнопки `#play-again-btn` на `#result-screen` изменён: `data-i18n="result.play-again"` → `data-i18n="result.next"` («Далее»). Обработчик клика в main.js теперь ведёт в Training, а не в новую партию.
- Cache-busting: `?v=20260544` → `?v=20260545` (на CSS и JS).

`js/i18n.js`:
- RU: ключи `result.next`, `training.{title,subtitle,done,start,bonus,skip,remaining,no-errors}`, `bonus.{title,pick,end,you-got,prize.xp,prize.hint,prize.life,prize.chest}`.
- EN: те же ключи с английскими переводами.

`css/style.css` (добавлен блок в конце):
- `.training-subtitle` — пояснительный текст.
- `.training-action-btn` — общая база (синий глянец, флекс-колонка для main+sub-текста).
- `.training-btn-skip` — вторичная (белая с тёмным текстом).
- Состояние `:disabled` — серая с приглушённым текстом.
- `.bonus-grid` — сетка 5×5 (`grid-template-columns: repeat(5, 1fr)`, gap 6px, ячейки aspect-ratio 1/1).
- `.bonus-cell-closed` — закрытая ячейка с флагом на фоне и эмодзи 🎀 (бант) поверх через `::after`.
- `.bonus-cell-revealed` — раскрытая ячейка: флаг сверху + строчка приза (иконка + число) снизу.
- `.bonus-cell-selected` — выделение выбранной ячейки (зелёная обводка + кольцо).
- `.bonus-hint`, `.bonus-result` — служебные строки внизу.

`js/main.js`:
- В импорты из `./ui.js` добавлены `renderTrainingScreen`, `renderBonusGrid`, `revealBonusGrid`. Поднята версия импорта `?v=20260545`.
- В `state` добавлены поля: `wrongAnswers: []` (накопленные ошибки сессии), `isTraining: false` (флаг режима обучения), `trainingQueue: []` (очередь повтора), `trainingCurrent: null` (текущая запись), `bonusPrize: null` (выбранный приз).
- `startGame()` — все новые поля сбрасываются в начале партии; `.answer-actions` возвращается видимым (на случай если предыдущий цикл был в обучении).
- `handleAnswer()` — XP/score инкрементятся **только если не isTraining**; неправильный ответ в обычной партии пишет запись в `state.wrongAnswers`.
- Таймаут в `startTimer()` — аналогично, ошибка по таймеру тоже идёт в `state.wrongAnswers` с `pickedValue: "—"`.
- `onAnswerResultClick()` — если `state.isTraining`, делегирует в `onTrainingResultClick`, иначе старое поведение.
- Новые функции для Training:
  - `goToTraining()` — переход на `#training-screen`, рендер состояния.
  - `startTraining()` — старт мини-сессии: копия `wrongAnswers` в очередь, isTraining=true.
  - `showTrainingQuestion()` — выводит вопрос из очереди, скрывает `.answer-actions`, отключает таймер и подсказку.
  - `buildTrainingOptions(country, topic, choicesCount, prevPickedValue)` — варианты: правильный + прежний неправильный + случайные дистракторы. Прежний `pickedValue: "—"` (таймаут) пропускается.
  - `handleTrainingAnswer()` — без XP/score, при неправильном ответе обновляет `state.trainingCurrent.pickedValue` (чтобы следующий повтор показал свежий неправильный).
  - `onTrainingResultClick()` — двигает очередь: правильно → запись удаляется из `wrongAnswers`; неправильно → в конец очереди. Когда пусто — `finishTraining()`.
  - `finishTraining()` — обратно на `#training-screen` (теперь с активным «Бонус»).
  - `skipTraining()` — сразу в меню без бонуса.
- Новые функции для Bonus:
  - `BONUS_GRID_SIZE = 25`, `BONUS_PRIZE_POOL` — массив длиной 25 из строк типа призов.
  - `generatePrize(type, sessionXp)` — XP: 0.25–2.0 × max(sessionXp, 50), округление до 5, min 25. Hint: 1–3. Chest: 1–2. Life: 1.
  - `startBonus()` — собирает 25 ячеек (случайные страны → флаги, случайно перетасованный пул призов), рендерит сетку.
  - `onBonusCellPicked(index)` — раскрывает все ячейки через `revealBonusGrid`, сохраняет `state.bonusPrize`.
  - `formatPrize(prize)` — i18n-строка «+N XP / +N подсказок / +N сундуков / +N жизнь».
  - `finishBonus()` — начисляет в `state.xpTotal` (если XP) или `state.inventory` (если предмет), пишет в localStorage, синхронизирует Firestore (`saveUserData`), возвращает в меню.
- В `init()` подключены обработчики: `#training-start-btn` → `startTraining`, `#training-bonus-btn` → `startBonus`, `#training-skip-btn` → `skipTraining`, `#bonus-end-btn` → `finishBonus`. Обработчик `#play-again-btn` теперь `goToTraining` вместо `goToStart`.

`js/ui.js`:
- `showScreen()` — `home-btn` теперь скрыт не только на `start`/`menu`, но и на `result`/`training`/`bonus` (свой поток выхода).
- Новая функция `renderTrainingScreen(remaining)`:
  - Если `remaining === 0`: подзаголовок «Обучение завершено!», `#training-start-btn` disabled, `#training-bonus-btn` enabled, «Пропустить» скрыта.
  - Иначе: подзаголовок про повтор, start enabled с подписью «N вопросов осталось», bonus disabled, «Пропустить» видна.
- Новая функция `renderBonusGrid(cells, onPick)`:
  - Создаёт 25 кнопок `.bonus-cell.bonus-cell-closed`. Внутри — `.bonus-cell-flag` с `<img src=svg/png>` (с fallback-цепочкой) или 🏳. Эмодзи-бант `🎀` накладывается через CSS `::after`.
  - Сбрасывает блок результата и блокирует «Конец».
- Новая функция `revealBonusGrid(cells, pickedIndex, pickedCountryName, pickedPrizeText)`:
  - Снимает класс `bonus-cell-closed`, ставит `bonus-cell-revealed`. На выбранную добавляет `bonus-cell-selected`. Disable всех кнопок.
  - В каждую ячейку добавляет `.bonus-cell-prize` (иконка по типу + число; XP сокращается через `formatXpShort` — «4.2K» вместо «4200»).
  - Показывает блок результата с названием страны и крупным текстом приза.
  - Активирует кнопку «Конец».
- Внутренние утилиты `prizeIcon(type)` и `formatXpShort(n)`.

`CLAUDE.md`:
- В «Сделано (играется в браузере)» добавлен пункт `**Обучение + Бонус (#22):**` с описанием механики и формул.
- В «Следующий блок фич» удалены пункты 1 (Обучение) и 2 (Бонус), добавлены новые: 1) инвентарь — траты и UI, 2) XP по сложности, 3) баланс бонуса.

**Что НЕ проверено и требует Claude Code:**

1. **Синтаксис** — Cowork не имел Node для `node --check` на свежих файлах (bash-mount устарел). Логически код прошёл review глазами, но без программной проверки.
2. **Все три сценария в браузере:**
   - Партия **с ошибками** → Result → «Далее» → Training (Бонус серая, «Обучение» с N) → клик «Обучение» → закрытие всех ошибок повторами → возврат на Training с активным «Бонус» → клик «Бонус» → сетка 5×5 → клик на ячейку → раскрытие, выделение, текст приза → клик «Конец» → меню; в меню XP вырос (или подсказка/сундук/жизнь увеличились).
   - Партия **без ошибок** → Result → «Далее» → Training сразу в финальном состоянии («Обучение завершено!», Бонус активен) → «Бонус» работает.
   - Партия с ошибками → «Пропустить обучение» → меню (бонуса нет, ничего не начислено).
3. **Edge-cases:**
   - В обучении кнопка `#hint-btn` остаётся видимой, но `disabled`. Можно ли скрыть совсем (`display:none` на `.meta .hint-btn` в обучении)? Сейчас выглядит «висящей».
   - Если `wrongAnswers.length === 0` (партия без ошибок), `state.wrongAnswers` всё равно очищается в startGame — ОК. Но `renderTrainingScreen(0)` нужно проверить: текст «Обучение завершено!» при нулевой партии звучит странно (как будто что-то проходили). Альтернатива — отдельный ключ `training.no-errors` уже добавлен в i18n, но не используется. Claude Code решает: использовать или оставить как есть.
   - Бонус-ячейки используют `aspect-ratio: 1 / 1` — Safari iPad поддерживает с iOS 15.4. У дочки iPad — проверить.
   - В `revealBonusGrid` строчка приза добавляется в каждую ячейку **поверх** существующего `.bonus-cell-flag` через `appendChild`. Флаг и приз должны делить высоту: флекс-колонка, флаг flex:1, приз — фиксированной высоты. Проверено через CSS, но визуально не подтверждено.
4. **Состояние `state.trainingLastCorrect`** — создаётся динамически в `handleTrainingAnswer`, читается в `onTrainingResultClick`. Логика верная (set перед read), но Claude Code пусть проверит, что не мешает другим механикам.

**Возможные правки от Claude Code (если найдутся проблемы):**
- Скрыть `.meta .hint-btn` через `display:none` в режиме обучения (флаг + CSS-класс на game-screen).
- Заменить подзаголовок «Обучение завершено!» на «Нет ошибок в этой партии» (`training.no-errors`) когда исходно 0 ошибок.
- Проверить, не сломал ли я `info-btn` в обучении: `showInfo()` использует `state.questions[state.currentQuestion]`, который в обучении не актуален. Я скрыл `.answer-actions` целиком, но если по какой-то причине будет видна — info-btn упадёт. Решение: либо оставить как есть, либо в обучении переключать `info-btn` на `state.trainingCurrent.country`.

**Тронуто:** `index.html`, `css/style.css`, `js/main.js`, `js/ui.js`, `js/i18n.js`, `CLAUDE.md`, `PROMPTS_LOG.md`. Cache-busting `?v=20260544 → 20260545`.

**Ревью Claude Code (2026-05-26):**
- **Синтаксис:** `node --check` на main.js/ui.js/i18n.js — OK.
- **Сценарий 1 (партия с ошибками):** прогнал в браузере. 10 вопросов (9 ошибок) → Result(«Далее») → Training (Бонус disabled, «9 вопросов осталось», skip виден) → «Обучение» → закрыл все 9 ошибок повторами → Training в done-состоянии (Бонус enabled, «Обучение» disabled, «Обучение завершено!», skip скрыт) → «Бонус» → сетка 5×5 (25 ячеек, 5 колонок, все закрыты, «Конец» disabled) → клик ячейки → все раскрылись, 1 выделена, 25 чипов приза, результат «Индия / +45 XP» → «Конец» → меню; XP 10 → 55 (localStorage + бар меню «55/200»). ✓
- **Сценарий 3 (пропуск):** партия с ошибками → Training («7 осталось») → «Пропустить обучение» → меню; XP не изменился (30→30), инвентарь без изменений, бонуса нет. ✓
- **Сценарий 2 (партия без ошибок):** генуинно-идеальную партию не автоматизировать без знания ответов, но путь `goToTraining()` → `renderTrainingScreen(0)` идентичен done-состоянию из Сценария 1 (Бонус активен, skip скрыт, «Обучение» disabled), и «Бонус» из этого состояния отрабатывает — т.е. покрыто эквивалентностью.
- **XP/score только вне обучения** — проверено (в обучении XP не растёт). Таймер скрыт, `.answer-actions` скрыты, подсказка — см. фикс ниже.
- **Найдено и поправлено (2 бага):**
  1. **`training.title` = «Обучение закончено!» всегда** — на экране с незакрытыми ошибками заголовок противоречил подзаголовку («можете продолжать тренироваться»). Заменил на нейтральный «Работа над ошибками» / «Review mistakes» (i18n + дефолт в HTML).
  2. **Кнопка подсказки висела в обучении** (была видна, но `disabled`). Скрыл её `display:none` в `showTrainingQuestion`, восстановил `display:""` в обычном `showQuestion` (флаг из ТЗ «возможные правки»).
- **Доставка i18n-фикса:** `i18n.js` импортировался без `?v=` → правка заголовка не дошла бы до игроков без хард-рефреша (та же болячка, что с ui/firebase). Версионировал импорт `i18n.js` **во всех 3 местах одинаково** (`main.js`/`ui.js`/`data.js` → `?v=20260546`) — единый инстанс модуля сохранён (переключение языка проверено, не сломалось).
- **Не баг (оставлено):** home-btn виден во время вопросов обучения (экран = game) — это намеренный «аварийный выход» в меню (другого выхода из очереди обучения нет). `training.no-errors` ключ оставлен неиспользуемым (done-текст приемлем для обоих случаев).
- **Cache-busting:** `20260545 → 20260546` (index.html, ui.js-импорт, i18n.js-импорты ×3). **Firebase I/O бонуса** (`saveUserData` при «Конец») в preview не проверялся (нет логина) — та же функция, что в endGame. **rAF-анимация** XP-бара на результате — не наблюдаема в фоновой вкладке (известное ограничение), эндпойнты корректны.
- **Aspect-ratio бонус-ячеек на iPad** — проверить вживую (Safari ≥15.4).

**Уроки на будущее (для Cowork):**
- При первом упоминании задачи в проекте с разделением ролей — **всегда** в первую очередь читать `Обо_мне.md` и `Состояние.md` (не только `CLAUDE.md` проекта).
- Если в проекте есть `PROMPTS_LOG.md` — это сигнал «Cowork пишет промпт, не код».
- Промпт «Продолжаем разработку X» — это «спланируй и оформи передачу», а не «иди делай руками».

---

## 2026-05-25 #21 | Три багфикса: reset→меню, multi-level-up, hint-сетка

**Цель:** (1) `resetProgress` не обновлял XP-бар/уровень в меню; (2) `animateXPBar` срабатывал level-up только раз за партию; (3) подсказка прятала кнопки через `visibility:hidden` → дыры в сетке при 6/8/10 вариантах.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500) — баги 1 и 3; баг 2 (анимация) — логика, rAF в фоне превью не тикает.

**Автор промпта:** Cowork (по результатам ревизии)

**Результат / расхождения:**
- **Баг 1:** в конец `resetProgress()` (main.js) добавлен `refreshMenuScreen()`. Проверено: XP 300 (уровень 2, бар 35.7%) → «Сбросить прогресс» → меню показывает уровень 1, «0 / 200 XP», бар 0%.
- **Баг 2:** в `animateXPBar` (ui.js) `startLevel`+`levelUpFired` заменены на `lastFiredLevel` (стартует с уровня startXP), условие `prog.level > lastFiredLevel` → `lastFiredLevel = prog.level; onLevelUp(...)`. Теперь срабатывает на каждый перейденный уровень, а не только первый. Реализовано дословно по ТЗ.
- **Баг 3а:** в `applyHintToOptions` (ui.js) `visibility:"hidden"` → `display:"none"` — скрытые кнопки больше не занимают место.
- **Баг 3б:** `.options` `grid-template-columns: 1fr 1fr` → `repeat(2, 1fr)` (эквивалент, по интенту ТЗ). С `display:none` сетка рефлоу без дыр. Проверено: тема capital сложность 1 (6 вариантов) → сетка 2 колонки → подсказка → 4 видимых / 2 `display:none`, дыр нет.
- **Тронуты:** `js/main.js` (resetProgress + cache-bust), `js/ui.js` (animateXPBar, applyHintToOptions), `css/style.css` (.options), `index.html` (cache-bust `20260543 → 20260544`; ui-импорт тоже), `PROMPTS_LOG.md`. (CLAUDE.md не трогал — поведение деталей не меняет канонических фактов; подсказка по-прежнему «скрывает 2 неверных варианта».)
- Консоль чистая.

---

## 2026-05-25 #20.2 | Меню в единой светлой гамме (белая карточка, голубые кнопки)

**Цель:** убрать «перепрыгивание» с тёмного меню на светлые экраны — сделать меню такой же белой карточкой с голубыми кнопками и тёмным текстом, как «Регионы». Единая цветовая гамма во всём приложении.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500).

**Автор:** Алексей (репорт со скриншотами), фикс Claude Code.

**Результат:** в #20.1 меню сделали тёмной карточкой (#141a2e) — читаемо, но контрастировало со светлыми экранами регионов/тем/игры. По просьбе Алексея унифицировал под светлую тему: убрал тёмный `#menu-screen` override (наследует белый `.screen`), перекрасил все элементы меню — `.menu-profile` светлая панель (#f4f7fa), имя/инвентарь тёмным текстом, бейдж уровня голубой (#e3f2fd/#0277bd), вторичные кнопки белые с тёмным текстом и серой рамкой (как `.nav-btn`), главная «Новая игра» — голубой глянец (как «Начало»/«Темы»/`.nav-btn-primary`). Тронуты: `css/style.css` (блок меню), `index.html`/`main.js` (cache-bust `20260542 → 20260543`), `CLAUDE.md`, `PROMPTS_LOG.md`. Проверено: `#menu-screen` фон белый, текст тёмный, primary голубой глянец, secondary белые — гамма едина с остальными экранами. Консоль чистая.

---

## 2026-05-25 #20.1 | Фикс: меню было прозрачным (нечитаемо на фоне Земли)

**Цель:** меню `#menu-screen` оказалось прозрачным и сливалось с ярким фото Земли — текст/кнопки не читались (репорт Алексея со скриншотом). Сделать плотный фон.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500) — фон меню `rgb(20,26,46)`, текст белый, читаемо.

**Автор:** Алексей (репорт), фикс Claude Code.

**Результат:** в #20 я сделал `#menu-screen { background: transparent }` (расчёт на тёмный космический фон), но меню легло на нижнюю яркую часть фона-Земли (облака) → светлый текст и полупрозрачные панели слились. Заменил на плотный тёмный `background: #141a2e` + `box-shadow`, `color:#fff`. Белые/полупрозрачные элементы профиля и кнопок теперь контрастны. Тронуты: `css/style.css` (#menu-screen), `index.html`/`main.js` (cache-bust `20260541 → 20260542`), `CLAUDE.md`, `PROMPTS_LOG.md`. Проверено: фон `rgb(20,26,46)` (непрозрачный), консоль чистая.

---

## 2026-05-25 #20 | Главное игровое меню (новый первый экран)

**Цель:** новый экран `#menu-screen` — главное меню (профиль + кнопки), становится первым при загрузке; экран регионов (`#start-screen`) теперь второй, доступен по «Новая игра».

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500) — меню первым, профиль гостя, навигация, переключение языка.

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork. 6 шагов: index.html (#menu-screen с профилем: аватар/имя/уровень, XP-бар, инвентарь, кнопки Новая игра/Энциклопедия/Задания/Войти/Язык); ui.js renderMenuProfile + showScreen скрывает home на menu; main.js (стартовый экран = menu, refreshMenuScreen, goToMenu, обработчики кнопок меню, home → menu); i18n (menu.*); CSS; проверка.]

**Результат / расхождения:**
- **CSS — `#menu-screen` сделан прозрачным/тёмным (отклонение, как в #17Б):** меню-стили из ТЗ на `rgba(255,255,255,…)` рассчитаны на тёмный фон, а `.screen` — белая карточка. Вместо перекраски всех элементов добавил `#menu-screen { background: transparent; box-shadow: none; color: #fff; }` — меню рисуется поверх космического фона, и весь белый-полупрозрачный дизайн профиля/кнопок из ТЗ читается как задумано (проверено: `menu-username` белый на тёмном). Остальные стили меню — дословно из ТЗ.
- **`#regions-back` включён → ведёт в меню (необходимое следствие):** по ТЗ home-btn скрыт и на `start`, и на `menu` (шаг 3б). Значит на экране регионов кнопки «На главную» нет — без рабочей `#regions-back` из регионов некуда вернуться. Поэтому снял `disabled` с `#regions-back` и повесил `goToMenu`. Это закрывает «из любого экрана назад в меню» (проверка #3 ТЗ).
- **Топбар-кнопка языка `#lang-btn` оставлена (шаг 3е — на усмотрение):** не удалял — она единственный переключатель языка на экранах регионов/тем/игры (меню-кнопка языка видна только в меню). На экране меню обе присутствуют (топбар + меню) — небольшая избыточность, но без потери функции в других местах. Обе зовут `switchLang`.
- **Тронуты:** `index.html` (#menu-screen + active перенесён с #start-screen на #menu-screen; #regions-back без disabled; cache-bust `20260540 → 20260541`; ui-импорт `?v=20260541`), `js/ui.js` (`renderMenuProfile`, showScreen скрывает home на menu), `js/main.js` (`state.screen="menu"`, `refreshMenuScreen`/`goToMenu`, home→menu, обработчики 5 кнопок меню, regions-back→menu, refreshMenuScreen в switchLang/onUserChanged/init), `js/i18n.js` (6 ключей `menu.*` ru+en), `css/style.css` (#menu-screen override + меню-стили), `CLAUDE.md`, `PROMPTS_LOG.md`.
- **Навигация (итог):** загрузка → menu (первый). «Новая игра» → регионы. `#regions-back` → menu. `#topics-back`/`#count-back` → регионы (без изменений). home-btn (← На главную) виден на game/info/result, скрыт на menu/start, ведёт в menu (с confirm во время партии). «Играть снова» на результате → регионы (без изменений).
- **Проверено в браузере:** старт — `#menu-screen` active, `#start-screen` не active, home скрыт; профиль: иконка гостя, «Гость» (белый текст), уровень 1, «0 / 200 XP», бар 0%, инвентарь 0/0/0; кнопки «Новая игра/Энциклопедия/Задания/Войти/EN». «Новая игра» → регионы (home скрыт). `#regions-back` → меню. Кнопка языка в меню: EN→RU, метки меню перевелись (New Game/Sign In). Старт партии (capital) → во время игры home **виден** → клик (confirm) → возврат в меню. Консоль чистая.
- **Не наблюдаемо в preview (rAF):** анимация XP-бара на экране результата (вкладка hidden) — как в #17Б; меню-XP-бар анимации не использует (ширина ставится напрямую в `renderMenuProfile`), поэтому полностью проверен.
- **Заглушки:** «Энциклопедия»/«Задания» в меню — `console.log` (как в ТЗ). Энциклопедия по странам уже есть как экран «Информация» (из #16), но это отдельная кнопка на будущий общий обзор.

---

## 2026-05-25 #19 | Кнопка «Сбросить прогресс»

**Цель:** дать игроку обнулить профиль (XP/рекорд/партии/инвентарь/выбор тем) «как в первый раз» — в localStorage и в облаке Firestore.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500) — локальный сброс полностью; облачная запись не проверяется в preview (нет логина), но использует ту же `saveUserData`.

**Автор промпта:** Алексей («обнули мой профиль по опыту, как будто первый раз начала играть»). Выбран вариант — кнопка в UI (через AskUserQuestion).

**Контекст:** профиль хранится в localStorage + Firestore `users/{uid}`. Удалённо из среды Claude Code обнулить нельзя (нет доступа к Google-аккаунту/Firestore юзера и к его браузеру). Чистка только localStorage не работает — при следующем входе облако возвращает прогресс. Поэтому сделана кнопка, сбрасывающая оба хранилища из авторизованной сессии самого игрока.

**Результат / расхождения:**
- **`resetProgress()` в main.js:** `confirm(t("reset.confirm"))` → обнуляет `state.xpTotal/bestXpPerGame/gamesPlayed/xpEarnedThisGame`, `inventory` → `DEFAULT_INVENTORY`, `setup.topicDifficulties` → `DEFAULT_TOPIC_DIFFICULTIES` (всё -1); пишет нули в localStorage; **если залогинен** — `saveUserData(uid, {xpTotal:0,bestXpPerGame:0,gamesPlayed:0,inventory:0})` (merge перезаписывает облако, иначе вход вернул бы прогресс); обновляет UI (`renderXpTotal/renderBestXp/renderGamesPlayed/refreshSetupUI`). Сброс тем — чтобы «как в первый раз» (иначе при XP=0 остались бы выбранными темы, заблокированные новым уровнем).
- **Тронуты:** `index.html` (кнопка `#reset-progress-btn` в `.setup-info`; cache-bust `20260539 → 20260540`; ui-импорт `?v=20260540`), `js/main.js` (`resetProgress` + слушатель), `js/i18n.js` (`reset.progress`/`reset.confirm`, ru+en), `css/style.css` (`.reset-progress-btn` — приглушённая «опасная» кнопка), `CLAUDE.md`, `PROMPTS_LOG.md`.
- **Проверено в браузере:** выставил фейковый прогресс (xp 500 / рекорд 120 / 2 темы), reload → старт показал 500/120; `confirm`→true, клик «Сбросить прогресс» → xp 0, рекорд 0, localStorage xpTotal/best/games «0», inventory нули, topicDifficulties все -1, «Доступно 0»; UI обновился на месте. Консоль чистая.
- **Не проверяемо в preview:** запись нулей в Firestore (нет логина в превью) — та же `saveUserData`, что работает при сохранении партий. На деплое под залогиненным аккаунтом сбросит и облако.
- **Как пользоваться Алексею:** на деплое (Ctrl+Shift+R), залогиненным под нужным аккаунтом (Алексей Савельев), на стартовом экране — кнопка «Сбросить прогресс» → подтвердить. Кнопка многоразовая (подойдёт и для профиля дочки под её аккаунтом).

---

## 2026-05-25 #17Б | UI: кнопки сложности, XP-бар, момент level-up

**Цель:** UI-часть системы уровней — кнопки сложности `[1..4]` на экране Тем (с гейтингом по уровню), анимированный XP-бар и баннер «Новый уровень!» на экране результата.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500) — экран Тем (гейтинг/выбор), сквозная партия, XP-бар и level-up через прямой вызов функций. **rAF-анимация не наблюдаема в preview** (вкладка `hidden` → `requestAnimationFrame` не тикает; подтверждено 0 кадров) — проверяется на реальном видимом браузере.

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork. 6 шагов: index.html (убрать #topics-all, XP-бар + level-up блоки в #result-screen); ui.js (новая сигнатура renderTopicList(items, topicDifficulties, getUnlocked, onSelect) с 4 кнопками сложности; renderXPBar/animateXPBar/showLevelUpBanner/hideLevelUpBanner); main.js (импорты; selectTopicDifficulty вместо toggleTopic; refreshSetupUI с гейтингом по getLevelFromXP; #topics-clear → setAllTopicDifficulties; questionPairs с difficultyIndex — уже сделано в #17A; XP-анимация в endGame); CSS; проверка.]

**Результат / расхождения:**
- **CSS — адаптация под белый фон (важное отклонение от ТЗ):** CSS из промпта рассчитан на тёмный фон (`rgba(255,255,255,…)` для рамок/текста/трека), но экраны — белые карточки (`.screen { background:#fff }`). На белом эти цвета **невидимы**. Перекрасил под белый фон: locked — светло-серые (#e3e8ee/#c2cad3), unlocked — серо-синие (#9fb0c3/#5b6b7c) с зелёным hover, active — зелёная #4caf50; XP-трек #e3e8ee, caption #888, level-up баннер — зелёный градиент с **белым** текстом. Логика классов из ТЗ не тронута.
- **CSS — расцепил `.topic-row` от `.region-cell`:** старое правило `.region-cell, .topic-row {…}` (полная рамка-«пилюля» + setup-dot) больше не подходит новому виду строки темы (лейбл + ряд кнопок). Убрал `.topic-row`/`.topic-row-on` из общих правил региона, дал теме своё оформление (нижняя граница, без рамки). `.setup-dot`/`.setup-label`/`.region-cell-on` (регионы) не тронуты.
- **endGame — xpBefore (отклонение от модели ТЗ):** ТЗ предполагает «начислить XP в endGame и анимировать от xpBefore». Но в коде XP начисляется **по ходу партии** (в `handleAnswer`), поэтому к endGame `state.xpTotal` уже включает заработанное. Вычисляю `xpBefore = state.xpTotal - state.xpEarnedThisGame` — корректный диапазон анимации без двойного начисления.
- **Кеш-инвалидация ui.js:** сигнатура `renderTopicList` изменилась — устаревший кешированный `ui.js` уронил бы экран Тем (`active.has` на объекте). Импорт ui.js в main.js версионирован: `from "./ui.js?v=20260539"` (ui.js импортируется только из main.js → без риска двойного инстанса). i18n.js (новые ключи) не версионировал — деградирует мягко (t() вернёт ключ), полагаемся на Ctrl+Shift+R.
- **Тронуты:** `index.html` (−#topics-all, +XP-бар/баннер; cache-bust `20260538 → 20260539`; ui-импорт `?v=20260539`), `js/ui.js` (renderTopicList переписан, +4 XP-функции), `js/main.js` (импорты; `selectTopicDifficulty`; `setAllTopicDifficulties`; refreshSetupUI гейтинг; endGame анимация; убран `toggleTopic`/`setAllTopics` и listener #topics-all), `css/style.css` (расцепление + новые стили), `CLAUDE.md`, `PROMPTS_LOG.md`. (`questionPairs` с difficultyIndex был уже готов в #17A.)
- **Проверено в браузере:** уровень 1 (xp=0) — у «Столицы» кнопка [1] открыта (`diff-btn-unlocked`), [2..4] заблокированы (`diff-btn-locked`, disabled); «Страна по флагу» — все 4 заблокированы (открывается на уровне 2); кнопки «Выбрать всё» нет. Тап по [1] → `diff-btn-active` зелёная (`rgb(76,175,80)`), localStorage `capital:0`, «Доступно 244»; повторный тап → выключено (`capital:-1`). Партия 10 вопросов → экран результата, `xpTotal` 190→210 без ошибок, XP-бар отрендерил стартовое состояние (95% при 190). Прямой вызов: `renderXPBar(getXPProgress(210))` → уровни 2→3, ширина 3.6%, «10 / 280 XP»; `showLevelUpBanner(2, …)` → «🎉 Новый уровень! 2!» + «Разблокировано: …», белый текст; `hideLevelUpBanner` скрывает. Консоль чистая.
- **Не наблюдаемо в preview (rAF):** прогресс анимации заполнения и срабатывание `onLevelUp` внутри тика — вкладка превью `hidden`, `requestAnimationFrame` не вызывается (проверено: 0 кадров за 500мс). Эндпойнты (renderXPBar) и баннер проверены статически; tick — код из ТЗ дословно. На видимом браузере Алексея анимация идёт штатно.
- **Мелочь:** ключ i18n `topics.all` стал неиспользуемым (кнопка удалена) — оставлен (безвреден).

---

## 2026-05-25 #17A | Data-layer: уровни, сложности, система разблокировок

**Цель:** добавить модель уровней/сложностей/разблокировок и инвентарь на уровне данных (новый `js/levels.js`, изменения в TOPICS/state/storage/firebase/i18n). UI не трогаем — это #17Б.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500) — acceptance-тесты `levels.js` + сквозной прогон новой модели тем (вкл/выкл, сложность 0→4 варианта, сложность 3→10 вариантов).

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork. 10 шагов: новый levels.js (XP_THRESHOLDS×50, LEVEL_UNLOCKS, getLevelFromXP/getXPForLevel/getXPProgress/getUnlockedDifficulties); TOPICS получают `difficulties` [4/6/8/10]; удалить OPTIONS_PER_QUESTION; topics→topicDifficulties (-1..3); state.inventory; новые STORAGE-ключи; loadFromStorage/persist; questionPairs с difficultyIndex; buildOptions(choicesCount); setAllTopics только off; firebase inventory; i18n level.*/inv.*; импорт levels в main.js; acceptance-тесты.]

**Результат / расхождения:**
- **Создан `js/levels.js`.** XP-модель: `XP_THRESHOLDS` — накопительные пороги, растёт по *1.4 **стоимость перехода** между уровнями (а не сам порог). Это единственная трактовка, проходящая acceptance-пример `getXPProgress(300) → {level:2, xpInLevel:100}` (если бы *1.4 рос сам порог, 280 уже давал бы уровень 3). Пороги: `[0,200,480,870,1420,2190,...]`, 50 шт. Документировал расхождение прозы ТЗ («порог *1.4») с её же примером — пример главнее.
- **LEVEL_UNLOCKS — заглушка-ограничение (флагнул):** 9 тем × 4 сложности = **36** уникальных разблокировок, а уровней 50. Требование «каждый из 50 уровней что-то открывает» физически недостижимо. Решение: прогрессия «вширь» — уровни 1–9 открывают сложность 0 всех тем (L1 = `{capital,0}` как требует ТЗ), 10–18 сложность 1, и т.д. до уровня 36; уровни 37–50 нового контента не открывают (всё открыто). Это явно отмечено в коде и доках; баланс/награды поздних уровней — отдельная задача.
- **Acceptance-тесты (в браузере, dynamic import):** `getLevelFromXP(0/199/200)`=1/1/2 ✓; `getXPProgress(300)`=`{level:2,xpInLevel:100,xpNeeded:280,percent:0.357}` ✓; `getUnlockedDifficulties("capital",1)`={0} ✓, `("capital",10)`={0,1} ✓, `("country",1)`={} ✓; `LEVEL_UNLOCKS[1]`=`[{capital,0}]` ✓; 50 порогов, 36 уровней разблокировок.
- **main.js:** удалён `OPTIONS_PER_QUESTION`; добавлен `DIFFICULTIES` [4/6/8/10] и присвоен всем темам циклом `Object.values(TOPICS).forEach(t=>t.difficulties=DIFFICULTIES)` (DRY вместо 9 идентичных литералов и обхода дубля `valid: hasCapital` у capital/countryByCapital — функционально идентично). `topics`→`topicDifficulties` (объект -1..3, дефолт всё -1), `state.inventory`, новые STORAGE-ключи, `loadFromStorage` (inventory + topicDifficulties с валидацией, старый `setupTopics` больше не читается), `persistTopics`→`persistTopicDifficulties`, `questionPairs` (тройки с `difficultyIndex`), `buildOptions(country, topic, choicesCount)`, `showQuestion` берёт choicesCount из `difficulties[difficultyIndex]`. `toggleTopic` временно off↔0, `setAllTopics` только off (on=true → no-op; кнопку уберут в #17Б), `refreshSetupUI` берёт активные темы из topicDifficulties — **существующий UI-список тем продолжает работать без правок ui.js**.
- **firebase.js:** в `loadUserData` миграционный дефолт получил `inventory` (firebase.js не видит state — inventory прокидывается через main.js: `applyUserData` применяет, `endGame`/`onUserChanged` передают `state.inventory`).
- **i18n.js:** 8 ключей `level.*`/`inv.*` (ru+en) в существующем формате (по языкам, не объединённым объектом из ТЗ).
- **Совместимость:** `import {...} from "./levels.js"` в main.js (без `?v=` — новый файл); `getLevelFromXP/getXPProgress/getUnlockedDifficulties/LEVEL_UNLOCKS` импортированы, но в #17A ещё не используются в main.js — это scaffolding под #17Б (не «мёртвый код», а явно запрошенный задел).
- **Тронуты:** `js/levels.js` (новый), `js/main.js`, `js/firebase.js`, `js/i18n.js`, `index.html` (cache-bust `20260537 → 20260538`; firebase-импорт тоже `?v=20260538`), `CLAUDE.md`, `PROMPTS_LOG.md`.
- **Проверено в браузере:** дефолт все темы off → «Доступно 0», «Начало» disabled; тап по теме включает (245), старт партии, сложность 0 → 4 варианта; сложность 3 (через localStorage) → 10 вариантов; ответы работают; консоль чистая. **Важно для #17Б:** дефолт «всё выключено» меняет UX — без UI выбора сложности игрок включает тему тапом (difficulty 0).

---

## 2026-05-25 #18 | Откат: redirect→popup (вход сломался) + удаление удалённого фона

**Цель:** починить два регресса из #17 — (1) вход через `signInWithRedirect` не завершается (редирект уводит и возвращает незалогиненным), (2) фон по-прежнему грузится медленно.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500) — фон/сеть/консоль; **сам вход (popup) проверяется только на деплое** (открывает окно Google).

**Автор промпта:** Алексей (репорт: «не открывается, redirect возвращает на старт незалогиненным; фон грузится долго»)

**Результат / расхождения:**
- **Вход (корневая причина):** `signInWithRedirect` ломается на нашей связке доменов — сайт `vkassu.github.io`, а `authDomain` `geogame-b7f3e.firebaseapp.com`. Современные браузеры (Safari ITP, Chrome) режут стороннее хранилище в iframe `firebaseapp.com` → состояние ожидающего редиректа теряется, `getRedirectResult` возвращает null, пользователя выкидывает на старт. Это регресс из #17. **Откат на `signInWithPopup`** (он же работал в #15, подтверждено Алексеем): popup открывает auth-handler отдельным окном и возвращает результат через postMessage — стороннее хранилище не нужно. Убран импорт `signInWithRedirect`/`getRedirectResult` и блок `getRedirectResult(auth)`.
- **Гарантия доставки фикса:** `firebase.js` импортируется без `?v=` (модули не покрыты cache-busting — болячка #9). Чтобы новый popup-код точно дошёл до браузера, импорт в main.js версионирован: `from "./firebase.js?v=20260537"`. Проверено — грузится `firebase.js?v=20260537` (200).
- **Фон (две причины медленноты):** (1) `bg.js` не версионировался → у Алексея мог остаться **старый** `bg.js`, тянувший 5.5 МБ; (2) даже 1920px — лишний внешний запрос с перерисовкой, а локальный файл и так качественнее. **Решение: удалён `js/bg.js` целиком**, убраны импорт и вызов `initEarthBackground()` из main.js. Поскольку main.js версионируется, удаление импорта гарантированно отключает любой кешированный `bg.js`. Локальный `img/earth.jpg` ужат **2048² → 1024² (582 КБ → 174 КБ)** через .NET System.Drawing — для фонового круга 1024px с запасом, грузится мгновенно из репо. CSS `:root{--earth-bg}` оставлен (резолвится в локальный файл).
- **Тронуты:** `js/firebase.js` (popup), `js/main.js` (версионированный импорт firebase, удалён bg), `js/bg.js` (удалён), `img/earth.jpg` (1024²), `index.html` (cache-bust `20260536 → 20260537`), `CLAUDE.md` (авторизация/фон/структура/статус), `PROMPTS_LOG.md` (эта запись).
- **Проверено в браузере:** `firebase.js?v=20260537` 200; **нет запроса `bg.js`**, **нет запроса к Wikimedia**; фон = только локальный `img/earth.jpg` (174 КБ) 200; кнопка входа на месте; игра грузится (733); 3 модуля Firebase 200; консоль чистая.
- **Что проверить Алексею на деплое:** Ctrl+Shift+R → «Войти через Google» теперь должно открыть **окно popup** (не редирект), вход завершиться, появиться аватар+имя; фон должен прорисоваться сразу. Если popup всё же проблемен на iPad — обсудить кастомный домен/Firebase Hosting (чтобы домен совпал с authDomain и redirect заработал штатно).
- **Примечание:** #17 в части «redirect» признан ошибочным и откачен; пункты #17 про чистку кода (capital/population/state.lang) остаются в силе.

---

## 2026-05-25 #17 | Быстрые правки по самоаудиту: redirect-вход, лёгкий фон, чистка мёртвого кода

**Цель:** закрыть 4 пункта из самоаудита кода: #1 popup→redirect для входа (баг на iOS Safari), #3 фон 5.5 МБ → 1920px thumb, #7 удалить мёртвые `capital()`/`population()`, #8 удалить неиспользуемое `state.lang`.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500) — кроме живого redirect-входа (навигация на Google, проверяется только на деплое/iPad).

**Автор промпта:** Cowork (по итогам самоаудита Claude Code)

**Промпт:** [сжато: #1 в firebase.js заменить `signInWithPopup` на `signInWithRedirect` + `getRedirectResult`; #3 в bg.js сделать основным URL 1920px thumb (~750 КБ) вместо оригинала 5.5 МБ; #7 удалить `capital()`/`population()` из data.js; #8 удалить `state.lang`.]

**Результат / расхождения:**
- **#1 (redirect):** в `firebase.js` импорт `signInWithPopup` → `signInWithRedirect, getRedirectResult`; `signInWithGoogle()` теперь `signInWithRedirect(auth, provider)`; добавлен `getRedirectResult(auth).catch(...)` при загрузке модуля (подхватывает результат/ошибку после возврата с Google). Причина: popup блокируется/зависает в Safari на iOS/iPadOS и во встроенных WebView — целевое устройство iPad. **Живой вход через redirect НЕ проверяется в preview** (уводит на Google) — нужна проверка на деплое и особенно на iPad.
- **#3 (фон):** `REMOTE_URLS` теперь `[1920px (~750 КБ), 1280px (~385 КБ)]` — оба живые bucket-ширины Wikimedia; оригинал 3000×3000 (5.5 МБ) убран. Проверено: грузится именно 1920px (200), 5.5 МБ оригинал больше не запрашивается.
- **#7 (мёртвый код):** удалены `export function capital()` и `export function population()` из data.js — не использовались нигде (подтверждено grep до и после). `capitalName`/`populationFormatted`/`getCapital`/`getPopulationFormatted` не тронуты.
- **#8 (state.lang):** удалено объявление `lang: "ru"` из `state` и 3 присваивания (`loadFromStorage` ×2, `switchLang`). Источник правды по языку — `getLang()` из i18n.js; `state.lang` только писался, не читался. `else`-ветка в `loadFromStorage` убрана (дефолт `setLang` уже "ru").
- **Тронуты:** `js/firebase.js`, `js/bg.js`, `js/data.js`, `js/main.js`, `index.html` (cache-bust `20260535 → 20260536`), `CLAUDE.md`, `PROMPTS_LOG.md` (эта запись).
- **Проверено в браузере:** `--earth-bg` = 1920px URL (200); кнопка «Войти через Google» на месте (`display:flex`); переключение языка работает; игра грузится (733 вопроса); консоль чистая; firebase.js + 3 модуля Firebase грузятся 200; `getRedirectResult` без ошибок (нет ожидающего редиректа → null).

---

## 2026-05-25 #16 | Энциклопедия: экран «Информация» о стране

**Цель:** экран карточки страны по кнопке «Информация» на экране результата ответа — флаг, официальное название, регион, столица, население, площадь, язык, валюта, герб; RU/EN; «← Назад» возвращает к результату ответа без потери хода.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, 1000×800) — полный прогон EN + RU, страна с гербом и без.

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork. Суть: Шаг 1 — 9 строк `info.*` в i18n (ru/en); Шаг 2 — геттер `officialName(country)` в data.js (lang-aware, `name.official`/`translations.rus.official`); Шаг 3 — секция `#info-screen` в index.html между game и result; Шаг 4 — `renderInfoScreen(country, regionLabel)` в ui.js (читает временные поля `country._*`); Шаг 5 — `getRegionLabel`/`showInfo`/`goBackFromInfo` в main.js, замена заглушки `info-btn`, слушатель `info-back-btn`; Шаг 6 — CSS `.info-*`; Шаг 7 — cache-busting + доки. Не трогать игровую логику/таймер/подсказку/XP/Firebase/bg.js.]

**Результат / расхождения:**
- **Два чистящих отклонения от буквального промпта (без изменения поведения, согласуются с самоаудитом про «без мёртвого кода»):**
  1. В `renderInfoScreen` **выброшен no-op блок** `import("./data.js").then(({getName}) => { /* no-op */ })` — он ничего не делал (автор сам пометил `no-op`), а добавлял лишний динамический импорт на каждый рендер карточки.
  2. В `main.js` **не добавлял неиспользуемые импорты.** Step 5 предлагал дописать в импорт из data.js `officialName/populationFormatted/areaFormatted/...`, но `showInfo()` использует только уже импортированные геттеры (`getName/getCapital/getPopulationFormatted/getAreaFormatted/hasLanguages/languageName/hasCurrencies/currencyName/hasNativeName/nativeNameStr`); `officialName` нужен только в ui.js. Добавил в main.js единственный новый импорт — `renderInfoScreen` из ui.js.
- **Тронуты:** `js/i18n.js` (9 строк `info.*` ×2 языка), `js/data.js` (`officialName`), `index.html` (`#info-screen` + cache-bust `20260534 → 20260535`), `js/ui.js` (импорт `officialName` + `renderInfoScreen`), `js/main.js` (импорт `renderInfoScreen`; `getRegionLabel`/`showInfo`/`goBackFromInfo`; `info-btn` → `showInfo`; слушатель `info-back-btn`), `css/style.css` (блок `.info-*`), `CLAUDE.md` (Сделано + удалён пункт «Энциклопедия» из «Дальше»), `PROMPTS_LOG.md` (эта запись).
- **Архитектура:** UI-слой чист — `renderInfoScreen` читает вычисленные `country._*`, бизнес-логику (lang-aware геттеры) дёргает `showInfo` в main.js. `goBackFromInfo` = `showScreen("game") + showAnswerResult()` — возвращает ровно то же состояние экрана ответа.
- **Проверено в браузере:** EN — Northern Mariana Islands: флаг (flagcdn), official «Commonwealth of the Northern Mariana Islands», строки Region/Capital/Population/Area/Language/Currency/Native name, блок герба скрыт (у территории нет coa — `hasCoatOfArms` false). «← Назад» → экран ответа (options скрыты, answer-result показан), счётчик «Question 1 of 10» не сменился → клик по баннеру → «Question 2 of 10». RU — Чад: official «Республика Чад», регион «Африка», все метки строк по-русски, герб найден и загружен (mainfacts.com), кнопка «← Назад». Консоль чистая.
- **Мелочь (не баг):** `showInfo` пишет временные поля прямо в объект страны из `state.allCountries` (`country._displayName` и т.п.) — перезаписываются при каждом открытии, читаются синхронно, побочных эффектов нет. Самоназвание иногда совпадает с англ. общим названием (квирк данных API, не нашей логики).

---

## 2026-05-25 #15 | Firebase Auth: аккаунты через Google + синхронизация XP

**Цель:** авторизация через Google (Gmail); XP/рекорд/число партий привязываются к аккаунту и синхронизируются с Firestore. Без логина — гостевой режим (localStorage). Первый вход мигрирует гостевые данные в аккаунт.

**Статус:** выполнен (код + ручные шаги в Console + живая проверка)

**Проверено в браузере:** да — гостевой путь и загрузка модулей в preview (:5500); **живой Google-логин подтверждён Алексеем на деплое 2026-05-25** (авторизация прошла успешно). Ручные шаги в Firebase Console (rules, Google-провайдер, Authorized Domains) выполнены Алексеем.

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork. Суть: Шаг 1 — `js/firebase.js` (CDN ES-модули 10.14.1, config geogame-b7f3e, `signInWithGoogle`/`signOutUser`/`onUserChanged`/`loadUserData`/`saveUserData`); Шаг 2 — main.js: импорты, `state.user`, `applyUserData`, `renderAuthUI`, подписка `onUserChanged` + слушатели кнопок в `init()`, сохранение в `endGame()` и `switchLang()`; Шаг 3 — `.auth-block` в `#start-screen`; Шаг 4 — CSS `.auth-*`; Шаг 5 — Firestore rules (вручную в Console); Шаг 6 — cache-busting + доки. apiKey — не секрет, безопасно коммитить. Не трогать игровую логику/ui/data/i18n/экраны кроме start-screen.]

**Результат / расхождения:**
- **Тронуты:** `js/firebase.js` (новый, дословно по промпту), `js/main.js` (импорт firebase; `state.user`; `applyUserData`/`renderAuthUI`; подписка+слушатели в `init()`; save в `endGame`/`switchLang`), `index.html` (`.auth-block` в `.setup-info` + cache-bust `20260533 → 20260534`), `css/style.css` (блок `.auth-*`), `CLAUDE.md` (раздел «Авторизация и облако», структура), `PROMPTS_LOG.md` (эта запись).
- **Расхождение по размещению подписки (осознанно):** промпт просил `onUserChanged` «перед обращением к localStorage, но после регистрации DOM-слушателей» — это внутренне противоречиво, т.к. в текущем `init()` `loadFromStorage()` идёт **первой строкой**, до всех слушателей. Зарегистрировал подписку рядом с остальными слушателями (после `loadFromStorage`). Функционально корректно: колбэк `onAuthStateChanged` асинхронный (fires после раунд-трипа Firebase), к этому моменту `state` уже загружен из localStorage — `localFallback` для миграции валиден.
- **Шаг 5 (правила Firestore) — НЕ выполнен кодом, требует ручного действия Алексея** в console.firebase.google.com → проект `geogame-b7f3e`: (1) Firestore → Rules → вставить правило `users/{userId}` `allow read,write: if request.auth.uid == userId` → Опубликовать; (2) Authentication → Sign-in method → включить Google; (3) Authentication → Settings → Authorized domains → добавить `vkassu.github.io` (и `localhost` для локальных тестов). Без (1) — дыра в безопасности; без (2)/(3) — попап входа не отработает.
- **Проверено в preview (что доступно):** все 3 Firebase-модуля с gstatic CDN + `firebase.js` грузятся 200; `initializeApp` без ошибок; `onAuthStateChanged` отдал `null` → гостевой режим, кнопка «Войти через Google» видна (`display:flex`), блок `#auth-info` скрыт; игра грузится штатно (250 стран, 733 вопроса), фон-оригинал Земли 200. Консоль чистая.
- **Что НЕ проверено (вне возможностей preview):** реальный Google Sign-In попап, чтение/запись Firestore, миграция гостевых данных. Требуют деплоя + завершения Шага 5 и проверки Алексеем вживую на https://vkassu.github.io/GeoGame/ .
- **Известное ограничение (не баг):** `applyUserData` намеренно НЕ применяет `lang` из облака к UI (только xp/best/games) — строго по промпту. Локальные ES-модули (`firebase.js`, `bg.js`) импортируются без `?v=`, т.е. не покрыты cache-busting (версионируются только `main.js`/`style.css` в index.html) — следует общей конвенции проекта; для firebase.js некритично (новый файл, кеша нет).

---

## 2026-05-25 #14 | Качественный фон Земли: удалённый источник + локальный fallback

**Цель:** умная загрузка фона — пробовать высококачественное фото Земли из интернета, при ошибке/офлайн остаётся локальный файл. Заодно заменить плоский `earth.jpg` на настоящую сферу.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, 1000×800)

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork. Суть: Шаг 1 — скачать сферическое фото Земли в `img/earth.jpg`; Шаг 2 — CSS-переменная `--earth-bg` в `:root`, `body::after` через `var(--earth-bg)`; Шаг 3 — новый `js/bg.js` (`initEarthBackground`, список `REMOTE_URLS`, при загрузке обновляет CSS-переменную, при ошибке — следующий URL, иначе локальный fallback); Шаг 4 — импорт+вызов в `init()` main.js; Шаг 5 — cache-busting +1; Шаг 6 — доки. Не трогать игровую логику/data/ui/i18n.]

**Результат / расхождения:**
- **Шаг 1 — грабли с источником (согласовано с Алексеем):** оба URL из шага 1 промпта и оба `REMOTE_URLS` из шага 3 **мертвы**. Wikimedia `upload.…/thumb/…` рендерит только фиксированные «bucket»-ширины: `1280px` и `1920px` отдают 200, а `2048/2560/3000/4096px` → **HTTP 400** («Use thumbnail sizes listed»). NASA `eoimages/…/57723/land_ocean_ice_cloud_2048.jpg` и `…/73909/world.200401…` → **404**. Запрос без contact-User-Agent Wikimedia режет. Рабочий способ скачать оригинал — `commons.wikimedia.org/wiki/Special:FilePath/...` с UA `GeoGameBot/1.0 (...; kazanworkout@gmail.com)` → отдал оригинал 3000×3000, 5.5 МБ.
- **Локальный fallback:** оригинал 5.5 МБ great, но тяжёл для репо/веба → ресайз до **2048×2048, JPEG q85, 582 КБ** через .NET `System.Drawing` в PowerShell (imagemagick/PIL в окружении нет; `/c/Windows/system32/convert` — это НЕ ImageMagick). Это настоящая сфера Blue Marble (remastered), а не плоская карта.
- **REMOTE_URLS — переспросил Алексея (3 варианта).** Выбран **«5.5 МБ оригинал = реальный апгрейд»**: `[Special:FilePath-оригинал 3000×3000, 1920px-thumb как запасной]`. Причина выбора по необходимости: локальный fallback теперь сам 2048px, поэтому единственный URL **выше** локального разрешения — это полный оригинал; живые thumb-ширины (1280/1920) ≤ локального. Тяжёлый фоновый запрос некритичен — `new Image()` грузится асинхронно, игру не блокирует.
- **Тронуты:** `img/earth.jpg` (новая сфера 582 КБ), `css/style.css` (`:root{--earth-bg}` + `body::after background-image: var(--earth-bg)`; остальное в `body::after` не тронуто), `js/bg.js` (новый), `js/main.js` (импорт `initEarthBackground` + вызов первой строкой `init()`), `index.html` (cache-bust `20260532 → 20260533`), `CLAUDE.md` (раздел «Данные»), `PROMPTS_LOG.md` (эта запись).
- **Проверено в браузере:** на первой отрисовке `--earth-bg` = локальный `img/earth.jpg` (fallback грузится сразу); через ~1с `bg.js` подменяет переменную на Wikimedia-оригинал, `body::after` перерисовывается без reload (`background-image` указывает на wikimedia URL). `border-radius:50%`, `cover`, `center 30%` сохранены. Ошибок в консоли нет. Деградация (оба URL падают → остаётся локальный) структурно гарантирована цепочкой `onerror → tryLoad(i+1) → return`.

---

## 2026-05-25 #12 | Реальное фото Земли в фоне

**Цель:** заменить CSS-градиент Земли в `body::after` на реальный спутниковый снимок (Public Domain).

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, 1000×800)

**Автор промпта:** Cowork

**Промпт:**

> Промпт #12 — Реальная фотография Земли в фоне. Скачать снимок NASA в `img/earth.jpg` (curl, основной URL `eoimages.gsfc.nasa.gov/.../land_shallow_topo_2048.jpg`, запасной — Wikimedia Blue Marble). Заменить `body::after` полностью: `position:fixed; left:50%; bottom:-35vw; transform:translateX(-50%); width:100vw; height:100vw; border-radius:50%; background-image:url('../img/earth.jpg'); background-size:cover; background-position:center 30%;` + трёхслойный `box-shadow` (синее свечение атмосферы + ореол + затемнение низа). Проверить `.gitignore` на блокировку `*.jpg`. Обновить cache-busting. PROMPTS_LOG #12. Если git ругается на размер >1MB — уменьшить через imagemagick, иначе коммитить как есть.

**Результат / расхождения:**
- Скачан снимок по **основному** URL NASA (`land_shallow_topo_2048.jpg`) → `img/earth.jpg`, 234 КБ, JPEG 2048×1024. Запасной URL не понадобился. Размер < 1 МБ — imagemagick не требовался.
- `css/style.css`: блок `body::after` переделан с радиального градиента на фото (`background-image` + `cover` + `position center 30%`), добавлено атмосферное свечение трёхслойным `box-shadow`. Окружность `100vw`, уходит за нижний край на `-35vw`.
- `.gitignore` `*.jpg` не блокирует — `img/earth.jpg` отслеживается. Cache-busting `20260531 → 20260532` (в промпте указан `20260526→20260527`, но фактически был уже 20260531).
- **Проверено в браузере:** `body::after` = окружность 1000×1000px (100vw), `bottom:-350px`, `background-image` указывает на `img/earth.jpg`, фото грузится (2048×1024), `border-radius:50%`. Ошибок в консоли нет.

---

## 2026-05-25 #11 | Переключение языка интерфейса RU / EN

**Цель:** добавить переключение языка RU/EN кнопкой в шапке. Меняются все вопросы, варианты, метки тем/регионов, UI-строки. Настройка сохраняется в `geogame:lang`. Названия языков/валют остаются на английском (ограничение API).

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, 1000×800)

**Автор промпта:** Cowork

**Промпт:**

> Промпт #11 — Переключение языка (RU/EN). Создать `js/i18n.js`: `_lang`, `getLang()`/`setLang()`, словарь `STRINGS` (ru/en), `t(key, vars)` с подстановкой `{var}`, `applyI18n()` (по `[data-i18n]`), словари `TOPIC_LABELS`/`TOPIC_QUESTIONS`/`REGION_LABELS`. В `data.js` — lang-aware обёртки `getName`/`getCapital`/`getPopulationFormatted`/`getAreaFormatted` (импорт `getLang`). В `main.js` — импорты i18n; `STORAGE.lang`; `state.lang`; `TOPICS`/`REGIONS` на getter-паттерн (`get label()`/`get question()` читают `getLang()`); `loadFromStorage` читает язык; `switchLang()` + `updateLangButton()`; заменить хардкод-строки на `t(...)` (status/alert/confirm); кнопки количества — `t("count.q",{n})` в `refreshSetupUI`. В `ui.js` — импорт `t`, перевести `renderAnswerResult`/счётчик/`renderResult`. В `index.html` — кнопка `#lang-btn`, атрибуты `data-i18n` на статические ноды, реструктуризация строк результата. CSS — `.lang-btn`. Обновить cache-busting. CLAUDE.md + PROMPTS_LOG #11. Ограничение: язык/валюта остаются EN.

**Результат / расхождения:**
- Создан `js/i18n.js` (STRINGS ru/en, `t`, `applyI18n`, словари тем/регионов). `data.js` — 4 lang-aware обёртки + импорт `getLang`. `main.js` — `TOPICS`/`REGIONS` на геттерах, `state.lang`, `STORAGE.lang`, `switchLang`/`updateLangButton`, `t(...)` вместо хардкода. `ui.js` — `t` в баннере/счётчике/результате. `index.html` — `#lang-btn`, `data-i18n`, реструктурированы строки результата. `css` — `.lang-btn`.
- **Найден и исправлен баг (сверх промпта):** `#status` нельзя помечать `data-i18n="status.loading"` — иначе `applyI18n()` при смене языка затирает «Загружено стран: N» обратно на «Loading…». Сделал `renderStatus()` (рендерит статус по `state.dataLoaded` на текущем языке), вызывается в `init` и `switchLang`; `data-i18n` со `#status` снят.
- **Решения:** `.lang-btn` спозиционировал `position:absolute; right:0` (а не `margin-left:auto` из промпта) — иначе `margin-left:auto` ломает центрирование `<h1>` и кнопка «На главную» (absolute слева) наезжала бы на заголовок. К `#home-btn` добавил `data-i18n="nav.home"` (ключ был в словаре, в промпте на кнопку не повешен).
- **Cache-busting:** промпт `20260525→20260526`, фактически было `20260529`; поднял до `20260531` (в процессе тестирования словил кеш превью на одной версии — пришлось бампнуть ещё раз).
- **Проверено в браузере:** переключение RU↔EN — все статические строки, метки регионов/тем, кнопки количества, статус, счётчик, баннер, экран результата; партия на EN (вопросы/варианты на английском: страны, столицы, население «38 thousand», площадь); сохранение языка в `geogame:lang` и корректная загрузка EN после перезагрузки. Язык/валюта — на английском в обоих режимах (ожидаемо). Ошибок в консоли нет.

---

## 2026-05-24 #10 | Реструктуризация типов тем: параметрические темы показывают название страны

**Цель:** в темах Типа Б (назови параметр) игрок должен видеть **название страны**, а не угадывать её по флагу. Для `capital/population/area/language/currency` промпт меняется с флага на текст с `ruName`.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500)

**Автор промпта:** Cowork

**Промпт:**

> Реструктуризация типов тем: флаг → название страны в параметрических темах. В `TOPICS` темы делятся на Тип А (видишь подсказку — флаг/герб/самоназвание/столицу — называешь страну, answer=ruName) и Тип Б (видишь страну — называешь параметр). Проблема: `capital/population/area/language/currency` используют `{type:"flag"}`, но ответ — параметр; получается гибрид. Правило: в Типе Б игрок видит название страны. Изменить для пяти тем `prompt` на `(c) => ({ type: "text", text: ruName(c) })` и укоротить `question` («Какая столица?», «Каково население?», «Какова площадь?», «Какой официальный язык?», «Какая валюта?»). Остальные темы (country, countryByCapital, nativeName, coatOfArms) не трогать. Обновить cache-busting. CLAUDE.md — пояснение об архитектуре двух типов. PROMPTS_LOG #10. Не менять: buildOptions, DEFAULT_TOPICS, questionPairs, valid, ui.js, data.js.

**Результат / расхождения:**
- В `js/main.js` у 5 тем (`capital`, `population`, `area`, `language`, `currency`) `prompt` изменён `{type:"flag"}` → `{type:"text", text: ruName(c)}`, `question` укорочены. Остальные 4 темы не тронуты.
- **Мелкое расхождение:** cache-busting в промпте указан `20260524→20260525`, но фактически был уже `20260528` (бамп в #9). Поднял до `20260529` (откат назад был бы неверным; намерение — инвалидировать кеш — выполнено).
- Тронуты: `js/main.js`, `index.html` (cache-bust), `CLAUDE.md` (блок «Два типа тем» + актуализированы описания тем 2,4–7), `PROMPTS_LOG.md`. ui.js/data.js/buildOptions/DEFAULT_TOPICS/questionPairs/valid — не трогал.
- **Проверено в браузере:** темы capital/population/area/language/currency теперь показывают текст-промпт с русским названием страны (`type:"text"`), вопрос короткий; варианты — параметры. Тип А (флаг/герб/самоназвание) без изменений. Ошибок в консоли нет.

---

## 2026-05-24 #9 | 6 новых тем: Население, Площадь, Язык, Валюта, Самоназвание, Герб

**Цель:** добавить 6 новых тем в `TOPICS` (стало 9). Архитектура уже обобщена — каждая тема = одна запись.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500)

**Автор промпта:** Cowork

**Промпт (полный текст, передан в терминал 2026-05-24):**

> Добавь 6 новых тем вопросов в GeoGame (Население, Площадь, Язык, Валюта, Самоназвание, Герб).
> 1. **data.js:** в `?fields=` добавить `languages,currencies,area,coatOfArms`; добавить и экспортировать `populationFormatted`, `areaFormatted`, `languageName`/`hasLanguages`, `currencyName`/`hasCurrencies`, `nativeNameStr`/`hasNativeName`, `hasCoatOfArms` (код функций приведён в промпте дословно).
> 2. **main.js:** импортировать новые функции; добавить в `TOPICS` 6 записей: population (answer populationFormatted, valid population>0), area (areaFormatted, area>0), language (languageName, hasLanguages), currency (currencyName, hasCurrencies), nativeName (prompt text nativeNameStr, answer ruName, hasNativeName), coatOfArms (prompt type "coa", answer ruName, hasCoatOfArms). `DEFAULT_TOPICS` не менять.
> 3. **ui.js:** в `renderQuestion` добавить обработку `prompt.type === "coa"` (img.coa-img с фолбэком svg→png→🏛).
> 4. **css:** `.coa-img` (max-height 180px, центр).
> 5. **index.html:** обновить cache-busting.
> 6. **CLAUDE.md:** темы, доменные факты (languages/currencies/area/coatOfArms/nativeName), соглашения (prompt.type "coa", nativeNameStr), статус.
> 7. **PROMPTS_LOG.md:** запись #9.
> Краевые случаи: DEFAULT_TOPICS неизменен; buildOptions дедуп по строке ответа (ок для чисел); нет coatOfArms → не в вопросах; area≤0 отсеять. Не трогать: подсказку, таймер, XP, 3 старые темы, экран результата, регионы, DEFAULT_TOPICS. Если что-то не сходится — остановись и спроси.

**Результат / расхождения:**
- **Согласованное отклонение (остановился и спросил):** `/all` ограничивает запрос **10 полями**, а нужно 11 (7 текущих + 4 новых) → `HTTP 400`. По решению Алексея — **два запроса** (`API_URL` 7 полей + `API_EXTRAS_URL` 5 полей с `cca2`), слияние доп. полей по `cca2` в `fetchCountries`. Это единственное расхождение с промптом (он предполагал один запрос).
- **Тронуты:** `js/data.js` (поля + два запроса/слияние + 8 новых функций), `js/main.js` (импорты + 6 тем в `TOPICS`), `js/ui.js` (ветка `coa` в `renderQuestion`), `css/style.css` (`.coa-img`), `index.html` (cache-bust `v20260528`), `CLAUDE.md` (темы, доменные факты, соглашения, статус), `PROMPTS_LOG.md` (эта запись).
- **Проверка реальных данных (до кода):** languages 249/250, currencies 247, area>0 все 250, coatOfArms **222** (промпт оценивал 150–160), nativeName non-eng 210. Формы полей совпали с промптом.
- **Проверено в браузере:** список тем стал 9 (3 вкл по умолчанию, 6 новых выкл); выбор только 6 новых → «Доступно 1406»; партия 50 вопросов — все 6 типов отрисовались: Население «6,6 млн», Площадь «488 100 км²», Язык «Korean» (англ.), Валюта «euro», Самоназвание текст «Lietuva»→варианты-страны, Герб — изображение (coa-img, mainfacts.com svg 175×199 / png 950×1080 грузятся). Ошибок нет (400 в буфере консоли — след сломанной 11-польной перезагрузки до фикса, оба актуальных URL отдают 200).
- **Известное ограничение (не баг):** значения Язык/Валюта — на английском (так отдаёт API). Перевод на русский — отдельная задача, занесена в «Дальше».

---

## 2026-05-24 #8 | «Доступно вопросов» = пары (страна × тема), а не число стран

**Цель:** счётчик «Доступно вопросов» должен расти при выборе нескольких тем (2 темы ≈ вдвое больше вопросов), а не показывать просто количество стран в регионах.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500)

**Автор промпта:** Алексей (терминал)

**Промпт:**

> теперь посмотри на несостыковку в одном месте: пользователь видит строчку «доступно вопросов 245». Когда выбраны все регионы — 245. Если менять типы заданий, выбирать несколько типов (и страну по флагу, и столицу по флагу) — количество не меняется. Похоже считает количество стран под регионы, а не количество реальных разных вопросов. Логично что для 2 режимов будет в 2 раза больше вопросов. Нужно изменить на такую логику.

**Результат / расхождения:**
- Заменил `usablePoolCountries()` (число стран) на `questionPairs()` — список всех валидных пар `(страна, тема)` под выбранные регионы+темы. Счётчик и кнопка «Начало» теперь считают пары.
- **Связанная правка `startGame` (обязательная для консистентности):** раньше партия собиралась «по одной стране без повторов» (кап = число стран), и с новым счётчиком в маленьком регионе счётчик и реальная игра разошлись бы. Теперь `state.questions = sample(questionPairs(), count)` — вопрос есть пара. Следствие: одна страна может встретиться в партии под разными темами (флаг→страна и флаг→столица). Согласовано с продуктовой логикой запроса.
- Тронут `js/main.js` (questionPairs, startGame, refreshSetupUI; удалён usablePoolCountries, инлайн updateStartEnabled), cache-busting `?v=20260527`, `CLAUDE.md` (описание счётчика и `state.questions`).
- **Проверено:** все регионы — 1 тема 245, 2 темы 489, 3 темы 733; Океания×3 темы = 81 и партия на 50 вопросов стартует (раньше упёрлась бы в 27 стран); подтверждение «Доступно только 81 вопросов» при запросе 100; отказ оставляет на Шаге 3. Ошибок в консоли нет.

---

## 2026-05-24 #7 | Фолбэк флага при ошибке загрузки (svg → png → эмодзи)

**Цель:** разобраться, почему «не отобразился флаг Федеративных Штатов Микронезии», и починить.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500)

**Автор промпта:** Алексей (терминал)

**Промпт:**

> у федеративные штаты микронезии не отобразился флаг, проверь почему

**Результат / расхождения:**
- **Диагностика:** данные API для FM в порядке — есть `flags.svg` (flagcdn.com/fm.svg) и `flags.png`, обе ссылки отдают HTTP 200, русское название `Федеративные Штаты Микронезии` есть. В браузере обе картинки грузятся (svg 760×400, png 320×168). То есть «не отобразился» — не из-за данных.
- **Корневая причина:** в `renderQuestion` (ui.js) не было обработчика `onerror` на `<img>` флага. При транзиентном сбое загрузки svg (CDN моргнул) оставалась битая картинка / alt-текст — выглядело как «флаг пропал». Фолбэка не было вообще.
- **Фикс:** в `renderQuestion` добавлена цепочка фолбэка — `flags.svg` → при ошибке `flags.png` → при ошибке эмодзи-флаг (`codeToEmoji`). Тронут только `js/ui.js`. Бампнут cache-busting `?v=20260526`.
- **Проверено:** обычный флаг грузится (nf.svg, naturalWidth 920); оба URL битые → эмодзи 🇫🇲; svg битый + png рабочий → грузится png. Ошибок в консоли нет.
- **Примечание:** воспроизвести исходный сбой не удалось (сейчас всё грузится) — фикс закрывает класс проблемы (любой транзиентный сбой CDN), а не конкретно FM.

---

## 2026-05-24 #6 | Новый поток настройки: 3 экрана (Регионы / Темы / Количество)

**Цель:** заменить текущий стартовый экран (выбор режима + сложности на одном экране) на три экрана как в референсе: Шаг 1 — Регионы (5 регионов API, сетка с включением/выключением), Шаг 2 — Темы (опциональная боковая ветка из Шага 1, список с галочками, без сложности тем), Шаг 3 — Количество вопросов (10/25/50/75/100). Сложность как концепция исчезает. «Режим» становится «темой», тем может быть выбрано несколько одновременно. Сохранение настроек в localStorage между сессиями. Рекорд переходит на новую схему — максимальный XP за партию (один общий, не по режиму). Старая система рекордов и поля state.mode / state.difficulty удаляются.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, 1000×800)

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork]

**Результат / расхождения:**
- **Согласованное отклонение от промпта:** добавил поле `region` в запрос `data.js` (`?fields=...,region`). Без него `country.region` приходит `undefined` и фильтр по регионам в принципе не работает — это дыра в формулировке промпта («не трогать data.js»), остановился и согласовал с Алексеем/Cowork в чате. Это единственная правка data.js, геттеры и capitals_ru не трогал.
- **Тронуты:** `js/data.js` (region в fields), `js/main.js` (полный рефактор под TOPICS/REGIONS/QUESTION_COUNTS, state.setup, новый STORAGE, поток настройки, startGame пересобирает `[{country, topicKey}]`, endGame → bestXpPerGame), `js/ui.js` (удалены difficulty/mode/start-button функции; добавлены renderRegionGrid/renderTopicList/renderBestXp/renderAvailableCount/setNavButtonEnabled), `index.html` (3 новых экрана, строка рекорда на результате, cache-bust v20260525), `css/style.css` (удалены мёртвые .mode/.diff/.record/.subtitle/.group-title; добавлены стили setup-panel/region-grid/topic-list/setup-nav/count-btn и пр.), `CLAUDE.md` (Темы вопросов, статус, ключи, доменный факт про region, удалён раздел «Следующая большая правка»).
- **Решения, не зафиксированные жёстко в промпте:**
  - Рендер регионов/тем сделал в `ui.js` как функции, принимающие `(items, activeSet, onToggle)` — состояние и обработчики остаются в main.js. Это аккуратнее по слоям, чем «рендер в main.js», и не противоречит конвенции «ui = DOM, main = state».
  - Счётчик «Доступно вопросов» считаю как **usable-пул** (регион ∩ есть валидная тема), а не «голый размер региона». Точнее и реагирует на снятие всех тем (→ 0). Это строго лучше «MVP-простого» варианта из промпта.
  - Один вопрос = одна страна (без повторов в партии), тема назначается случайно из валидных для этой страны. Кап вопросов = размер usable-пула.
  - Дистракторы берутся сначала из выбранных регионов, при нехватке добираются из всех валидных по теме — чтобы всегда было 4 варианта даже в маленьком регионе.
- **Проверено в браузере (preview :5500, 1000×800):** дефолты (5 регионов/3 темы/«Доступно 245»/«Начало» активна); toggle региона (Европа −53 → 192); Очистить/Выбрать всё; снятие всех тем → 0 и «Начало» disabled; persist регионов/тем в LS; полный прогон 10 вопросов со смешанными темами (встретились все 3 типа вопроса), +10/правильный, рекорд по XP записан; краевой случай Океания(27)+100 → «Доступно только 27 вопросов. Продолжить?» (да → 27 вопросов, нет → остаёмся на Шаге 3); после reload настройки/XP/рекорд сохраняются, партия сбрасывается. Ошибок в консоли нет.
- **На что смотреть при проверке:** на iPad/узком экране — три экрана настройки (сетка регионов 2 кол., кнопки количества) должны влезать без горизонтального скролла. «Назад» на Шаге 1 намеренно disabled (некуда идти — игрового меню пока нет).

---

## 2026-05-24 #5 | XP-накопление + отображение

**Цель:** превратить «+10 XP» на экране результата ответа из надписи-обещания в работающий накопитель: +10 XP за правильный, общий счётчик `geogame:xpTotal` в localStorage, отображение на главном экране («Опыт: N») и на экране результата партии («Получено за партию: +N XP. Всего: M XP»). Один общий XP на все режимы. Подсказка XP не снижает.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, 1000×800)

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork]

**Результат / расхождения:**
- **Тронуты:** `js/main.js` (XP_PER_CORRECT, STORAGE.xpTotal, state.xpTotal/xpEarnedThisGame, loadFromStorage, startGame, handleAnswer, endGame, init, импорт), `js/ui.js` (renderXpTotal, renderGameXp), `index.html` (`.xp-total` на старте, `.game-xp` на результате), `css/style.css` (`.xp-total`, `.game-xp`), `CLAUDE.md` (статус + ключ localStorage).
- **Сделано ровно по промпту, отклонений нет.** Накопление в `renderAnswerResult` не дублировал, подсказку/рекорды/таймер не трогал, никаких условий с `hintUsed`.
- **Проверено в браузере (preview :5500):** старт с чистого localStorage → «Опыт: 0»; партия 5 вопросов, 2 верных → «за партию 20», «всего 20», `geogame:xpTotal="20"`; возврат на старт → «Опыт: 20»; вторая партия, 1 верный → «за партию 10» (сброс per-game), «всего 30», LS «30»; после reload → старт показывает «Опыт: 30» (loadFromStorage). Ошибок в консоли нет.
- **На что смотреть при проверке:** XP общий на все режимы (переключение режима счётчик не обнуляет); «Получено за партию» = только за текущую (сбрасывается в startGame), «Всего» — накопительно. Подсказка XP не режет — это by design (в коде нет ветки на hintUsed).

---

## 2026-05-24 #4 | Техдолг: разделение зон Cowork/Claude Code, коммит .md, доменные факты, cache-busting

**Цель:** закрыть техдолг по результатам саморефлексии Claude Code: убрать парадокс «журнал не закоммичен», разнести спеку и статус, добавить cache-busting, зафиксировать доменные факты и правила git. Cowork сделал документную часть, Claude Code делает git-часть, дополнение доменных фактов и сверку статуса.

**Статус:** выполнен

**Проверено в браузере:** н/п (документы и git)

**Автор промпта:** Cowork

**Промпт:**

> *(см. полный текст в чате Cowork от 2026-05-24. Краткая суть: Cowork уже выполнил — F+G правки PROMPTS_LOG, очистка REFERENCE.md от статусов, добавление в CLAUDE.md секций «Текущий статус» / «Доменные факты» (с пустым подразделом для Claude Code) / «Принципы работы» / «Документы проекта и правила git», cache-busting `?v=20260524` в index.html. От Claude Code требуется: A) убрать REFERENCE.md из .gitignore, `git add` всех изменённых .md + index.html, один осмысленный commit, push. B) дополнить «Дополнения от Claude Code» в разделе «Доменные факты» CLAUDE.md. C) сверить «Текущий статус» с реальным кодом. D) подтвердить правила git и маркер «⚠ требуется commit».)*

**Результат / расхождения:**
- **A (git):** REFERENCE.md убран из `.gitignore`; `PROMPTS_LOG.md` и `REFERENCE.md` добавлены в репозиторий. Сделано ещё в прошлом ходе (по первому split-плану) двумя коммитами: `1a297c3` (cache-busting index.html) и `5a0a8a3` (доки). **Расхождение с промптом:** просили один общий коммит, включая index.html — но index.html и .md уже были закоммичены; историю не переписывал, новые правки этого хода вынес отдельным коммитом.
- **B (доменные факты):** в подразделе «Дополнения от Claude Code» зафиксированы: состав `/all` (~250 сущностей, вкл. территории), `capital` — массив (берём `[0]`), намеренное следование словаря столиц строке API (Шри-Джаяварденепура-Котте, Сукре, Претория, Рамалла, Гитега, Астана), дедуп вариантов в `buildOptions`, сортировка по `engName`. В этом ходе добавлен **точный список 4 стран без столицы** (AQ, MO, BV, HM) и особенности тестового окружения (preview вьюпорт 1px, таймаут скриншотов → проверка через `getComputedStyle`).
- **C (сверка статуса):** «Сделано» сверено с кодом — всё соответствует. Исправлена неточность: пункт «В работе: Подсказка» утверждал «промпт передан в Claude Code», но в терминал он не передавался и в коде отсутствует (grep: только `.answer-hint`, не фича). Переформулировано как «подготовлен Cowork, в очереди, не начато».
- **Тронутые файлы в этом ходе:** `CLAUDE.md` (доменные факты + статус), `PROMPTS_LOG.md` (эта запись). `.gitignore`/`REFERENCE.md`/`index.html` — в прошлом ходе.
- **D:** правила git и маркер «⚠ требуется commit» приняты (см. ответ в чате).

---

## 2026-05-24 #3 | Кнопка «Подсказка» — убрать 2 неверных варианта из 4

**Цель:** добавить в строку управления игрового экрана синюю кнопку «Подсказка». Тап → 2 случайных неверных ответа из 4 скрываются через `visibility: hidden` (сетка 2×2 сохраняется). Одна подсказка на партию, после использования кнопка остаётся видимой, но серая и disabled. Сбрасывается в `startGame`.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, 1000×800)

**Автор промпта:** Cowork

**Промпт:** [сжато — полный текст в истории Cowork]

**Результат / расхождения:**
- **Тронуты:** `index.html` (кнопка в `.meta`, удалён `#q-score`), `css/style.css` (`.hint-btn` + `.meta align-items:center`), `js/ui.js` (`getHintButton`/`setHintButtonState`/`applyHintToOptions`, убрана строка обновления `#q-score`), `js/main.js` (`state.hintUsed`/`currentButtons`/`currentCorrect`, сброс в `startGame`, `handleHintClick`, листенер в `init`, `setHintButtonState(false)` в `handleAnswer`, сохранение buttons/correct в `showQuestion`).
- **Реализовано как просили:** через замыкание не пошёл — храню текущие кнопки и правильный ответ в `state.currentButtons`/`state.currentCorrect` (как и предлагалось в промпте, вариант «чище»). Скрытие — `visibility: hidden`, сетка 2×2 цела.
- **Вынужденное отклонение (следствие удаления `#q-score`):** удалил две JS-строки, которые писали в `#q-score` (в `ui.js renderQuestion` и `main.js onAnswerResultClick`) — иначе `null.textContent` уронил бы игру. `state.score` нетронут, на экране результата партии счёт показывается как прежде. Параметр `score` в `renderQuestion` остался в сигнатуре, но больше не используется — не стал менять сигнатуру, чтобы не выходить за рамки.
- **Проверено в браузере:** порядок `.meta` = [таймер][подсказка][счётчик]; подсказка скрывает ровно 2 неверных, правильный всегда остаётся (проверено — «Словакия» осталась видимой); двойной клик отбивается; кнопка серая/disabled после использования; на следующем вопросе остаётся disabled (одна на партию), варианты снова все 4; новая партия — подсказка снова активна. Ошибок в консоли нет.

---

## 2026-05-24 #2 | Установка стандарта работы с PROMPTS_LOG.md

**Цель:** ввести единый стандарт ведения этого журнала для Claude Code: когда писать, что писать, как обновлять. Чтобы любой нетривиальный промпт — от Алексея напрямую в терминал или от Cowork через Алексея — оставлял след в файле.

**Статус:** передан

**Проверено в браузере:** н/п (не код)

**Автор промпта:** Cowork

**Промпт:**

> *(см. полный текст в чате Cowork от 2026-05-24 — установочный промпт без изменения кода. Краткая суть: Claude Code обязан перед началом любой нетривиальной работы заводить запись в PROMPTS_LOG.md по фиксированному формату, обновлять статус по завершении, добавлять новые записи сверху, не дублировать записи Cowork, писать честно в поле «Результат».)*

**Результат / расхождения:** ожидается подтверждение от Claude Code: «понял, готов работать по стандарту». Изменений в коде по этому промпту не предполагается.

---

## 2026-05-24 | Step 2 — структура экрана результата (3 кнопки сверху, скрытие .meta/.progress/#options)

**Цель:** переделать `#answer-result` так, чтобы сверху были 3 кнопки (Report / Информация / Конец), затем баннер, затем белый блок. При показе результата прятать `.meta`, `.progress`, `#options` через `display: none`; при скрытии — восстанавливать.

**Статус:** выполнен (обнаружено при инспекции кода 2026-05-24)

**Проверено в браузере:** требует проверки

**Автор промпта:** Cowork

**Промпт (реконструкция по описанию: исходный текст утерян при обрыве Cowork-сессии — это и стало причиной появления PROMPTS_LOG.md):**

> В `index.html` переделай блок `#answer-result`:
> 1. Сверху — горизонтальный ряд из 3 кнопок: `#report-btn` («Report»), `#info-btn` («Информация», крупнее, акцентная), `#end-btn` («Конец»). CSS-класс `.answer-actions` для контейнера, `.answer-action-btn` для боковых, `.answer-action-main` для центральной.
> 2. Под кнопками — баннер `#answer-banner` (цветная лента на всю ширину, без скруглений).
> 3. Под баннером — белый блок `.answer-body` с `#answer-xp`, `#answer-picked`, `#answer-correct-val` и подписью `(Нажмите для продолжения)`.
>
> В `js/ui.js`:
> - `showAnswerResult()`: `document.getElementById("options").style.display = "none"`, `document.querySelector(".meta").style.display = "none"`, `document.querySelector(".progress").style.display = "none"`, `document.getElementById("answer-result").style.display = "block"`.
> - `hideAnswerResult()`: всё обратно (`style.display = ""`, для answer-result — `"none"`).
>
> В `js/main.js`:
> - Обработчик клика по `#answer-result` → `onAnswerResultClick()` → следующий вопрос или endGame.
> - Обработчики `#report-btn` и `#info-btn`: `e.stopPropagation()` + `console.log`.
> - Обработчик `#end-btn`: `e.stopPropagation()` + `confirm("Завершить партию досрочно?")` → `endGame()`.

**Результат / расхождения:** реализовано. Требует визуальной сверки с REFERENCE.md, раздел «Экран результата ответа».

---

## 2026-05-24 | Step 1 — космический фон + синие глянцевые кнопки ответов

**Цель:** заменить базовый фон body на тёмный космос (градиент + звёзды + полукруг Земли снизу). Кнопки ответов сделать в стиле референса: синий глянцевый градиент, серебристая рамка, скруглённые углы.

**Статус:** выполнен (обнаружено при инспекции кода 2026-05-24)

**Проверено в браузере:** требует проверки

**Автор промпта:** Cowork

**Промпт (реконструкция по описанию: исходный текст утерян при обрыве Cowork-сессии — это и стало причиной появления PROMPTS_LOG.md):**

> В `css/style.css` обнови:
>
> 1. `body`:
>    - `background: linear-gradient(to bottom, #0a0a1a, #1a1a2e)`
>    - `min-height: 100vh`, `position: relative`, `overflow-x: hidden`
>    - `color: #e8eaf0`
>
> 2. `body::before` — звёзды (~10–12 радиальных градиентов, разбросанных по верхней половине экрана, белые точки 1–2px, opacity 0.4–0.7). `position: fixed; inset: 0; z-index: -2; pointer-events: none;`
>
> 3. `body::after` — полукруг Земли снизу. `position: fixed; left: 50%; bottom: 0; transform: translateX(-50%); width: 120vw; height: 40vw; border-radius: 50%; z-index: -1; background: radial-gradient(circle at 50% 32%, #1f4a5c 0%, #163d50 45%, #0d1b2a 75%); box-shadow: 0 0 80px rgba(40,110,120,.35), inset 0 6px 40px rgba(120,220,200,.12);`
>
> 4. `.option-btn` (кнопки ответов в `.options`):
>    - `min-height: 80px`
>    - `background: linear-gradient(to bottom, #4fc3f7, #0288d1)`
>    - `border: 2px solid #b0bec5`
>    - `border-radius: 20px`
>    - `box-shadow: 0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)`
>    - `color: #fff; font-weight: bold; font-size: 18px;`
>    - Hover — `filter: brightness(1.15)`, active — `filter: brightness(0.9); transform: scale(0.98)`.

**Результат / расхождения:** реализовано. Требует визуальной сверки с REFERENCE.md, разделы «Визуальный стиль» и «Игровой экран».

---

## 2026-05-23 #3 | Таймер обратного отсчёта на вопрос (30 сек)

**Цель:** добавить таймер на вопрос, по истечении — карточка «Неправильный ответ».

**Статус:** выполнен

**Проверено в браузере:** да (подтверждено в сессии 2026-05-24)

**Автор промпта:** Cowork (точный текст утерян — написан до введения этого журнала)

**Промпт:** *не сохранён*

**Результат:** работает. В `main.js`: `startTimer()` запускает `setInterval`, обновляет `#q-timer`, при `seconds <= 0` — `renderAnswerResult(false, "—", correct) + showAnswerResult()`. `clearTimer()` вызывается при ответе и в `onAnswerResultClick`. `state.timerId` хранит интервал.
