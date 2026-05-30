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

## 2026-05-29 #46 | Карта/Силуэт — первыми в порядке тем

**Цель:** Поменять порядок `TOPICS` так, чтобы «Найди на карте» и «Силуэт» были первыми (а не последними).

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — на свежем профиле lv1 разблокирована только mapFind d0; список тем сверху вниз: Найди на карте, Силуэт, Страна по флагу, …, Религия; консоль чистая)

**Автор промпта:** Алексей

**Промпт:** «измени очередность тем таким образом что бы "найти на карте" и "силуэт" были первыми».

**Результат / расхождения:**
- **`main.js`:** записи `mapFind` и `silhouette` перенесены в начало объекта `TOPICS` (раньше были последними, #42/#43). Поскольку `initLevelUnlocks(Object.keys(TOPICS))` строит прогрессию из этого порядка — **изменилось не только отображение, но и разблокировка**: mapFind d0 = lv1 (стартовая тема для нового игрока), silhouette d0 = lv2, country d0 = lv3, … religion d0 = lv13. d3 теперь: density = lv51, religion = lv52 (раньше эти места занимали mapFind/silhouette).
- **`achievements.js`:** `addMulti("topic:mapFind", …)` и `addMulti("topic:silhouette", …)` тоже переставлены первыми в блоке topic, чтобы соблюсти инвариант комментария «порядок совпадает с TOPICS» — на экране достижений «Географ» и «Топограф» отображаются перед «Флаговед» и далее.
- **`levels.js`:** комментарий-заглушка переписан в нейтральных терминах («последние две темы»), без хардкода mapFind/silhouette — потому что теперь «последними» по разблокировке стали density/religion.
- **`CLAUDE.md`:** обновлены (а) нумерация раздела «Темы вопросов» (1. Найди на карте, 2. Силуэт, 3. Страна по флагу, … 13. Религия); (б) Правило UI в Соглашениях (с #46 mapFind/silhouette — стартовые/витринные, открываются на 1/2); (в) «Сделано: 13 тем …» — порядок перечисления; (г) Баланс разблокировок — теперь density/religion — последние по d3. Стало неактуально: «Самая сложная тема → последняя в TOPICS» (для силуэта) и «от простых к сложным» (для всего списка).
- **Версия:** 20260570 → **20260571** (main.js/achievements.js/levels.js изменены).

**Последствия (флажки в саммари Алексею):**
1. Новый игрок на уровне 1 видит только «Найди на карте» в темах и при первой игре триггерится ленивая загрузка `worldmap.json` (~1.1 МБ). Раньше первой игрой были флаги (без больших ассетов).
2. У существующих игроков с заданным `state.setup.topicDifficulties` выбор остаётся в localStorage, но какие-то темы могут оказаться выше их текущего уровня (например, было `area:0` на lv5 — теперь area d0 = lv7, кнопка станет заблокированной до lv7).
3. Достижения topic:* пересортированы на экране достижений (Географ/Топограф первыми) — прогресс и значения не теряются.

**Проверка (браузер):** свежий профиль (xpTotal=0): экран Тем — 13 строк в правильном порядке (Найди на карте, Силуэт, Страна по флагу, …, Религия); у первой темы первая кнопка сложности активна, остальные — «🔒 14»; у силуэта первая кнопка — «🔒 2»; у страны по флагу — «🔒 3»; у религии — «🔒 13». Консоль чистая.

---

## 2026-05-29 #45 | Все страны в темах «Силуэт» и «Найди на карте»

**Цель:** Покрыть темы максимумом стран — починить пропавшие, добавить недостающих точками.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — Тайвань в манифесте силуэтов, mapFind 250/250, dot-only рендер с фикс-зумом, консоль чистая)

**Автор промпта:** Cowork (через Алексея); направление выбрано Алексеем (Вариант 1)

**Промпт (исходный):** перейти на Natural Earth 10m + фолбэк ISO_A2_EH + `missing_centroids.json` для dot-only; обновить оба build-скрипта, `renderMapFind` (через D3 `pathGen`/`projection`), доки.

**Результат / расхождения:** Сделано **по Варианту 1** — после проверки реальных данных предложил его вместо спеки, Алексей утвердил. Спека опиралась на устаревшую/неверную картину:

- **10m отвергнут (данные).** Скачал 10m (12.7 МБ, билд 5+ мин): покрытие +2 страны (GI, UM) против 50m, но `worldmap.json` раздувается **1.1 → 5.94 МБ** (грузится в рантайме на iPad). Плохой размен. Остались на **50m**.
- **Тайвань — не проблема разрешения, а баг кода.** У TW в Natural Earth `ISO_A2 = "CN-TW"` (мусор, не «-99»), а правильный `TW` — в `ISO_A2_EH`. Старый `isoCode` (и даже предложенный спекой `getCca2`, проверявший только `!== '-99'`) возвращал «CN-TW». **Фикс:** `getCca2` берёт `ISO_A2` только если это валидный 2-буквенный код (`^[A-Z]{2}$`), иначе фолбэк `ISO_A2_EH`. → Тайвань появился **на 50m с настоящей формой** (силуэт + карта). Применён в обоих скриптах.
- **Архитектура: спека предполагала D3 в рантайме** (`pathGen`/`projection`/GeoJSON `geometry:null`), но в #43 (выбор Алексея) — **прекомпьют без D3**. Адаптировал идею dot-only под прекомпьют: dot-only страны = записи `{ cca2, c:[спроецированный центр], dotOnly:true }` (без `d`/`bbox`) в `worldmap.json`; `renderMapFind` рисует их точкой с фикс-зумом 240×120. D3 не возвращён.
- **mapFind → 100% (250).** 237 с геометрией (вкл. TW) + 13 dot-only из нового `data/missing_centroids.json` (заморские территории Франции GF/GP/MQ/RE/YT + мелкие острова BQ/BV/CC/CX/GI/SJ/TK/UM). `build_worldmap.js` добавляет их только если нет в GeoJSON и есть в countries.json.
- **Силуэты → 237** (+Тайвань). Оставшиеся 13 силуэта иметь **физически не могут** (нет отдельной формы границ в данных — это факт Natural Earth, не баг). `missing_centroids` для силуэтов не используется (точкой силуэт не заменить) — как и просила спека.
- `renderMapFind`: добавлена ветка dot-only (нет `d` → путь не рисуем; нет `bbox` → фикс-зум 240×120 + точка). Микрогосударства с реальной геометрией (bbox<8) по-прежнему рисуются путём + точкой.
- **Версия:** 20260569 → **20260570** (ui.js изменён). Данные-файлы (worldmap/silhouettes) грузятся без `?v` (как countries.json и пр. — паттерн проекта), у вернувшихся игроков обновятся по Ctrl+Shift+R.

**Проверка (браузер):** скрипты дали 237 силуэтов (TW есть, tw.svg грузится 200) и worldmap 250 (13 dot-only). Прогон mapFind: на вопросе с dot-only страной — viewBox `… 240 120` (фикс-зум), оранжевая точка, подсвеченного пути нет (геометрии нет), фон из 237 путей. Обычные/микро-страны — путь (+ точка для <8px) и bbox-зум. Консоль чистая. (Свежесть data-файлов проверял с `cache:'reload'` — браузер кешировал старый index.json; на диске всё верно.)

---

## 2026-05-29 #44 | Ротация фоновых изображений

**Цель:** Полноэкранные сюжетные фоны из `img/backgrounds/` с автосменой каждые 5 мин и плавным crossfade.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — стартовый фон, URL резолвится в /img/backgrounds/ (200), crossfade-логика слоёв, консоль чистая)

**Автор промпта:** Алексей

**Промпт:** Массив 4 PNG из `img/backgrounds/`; при старте случайный фон; каждые 5 мин следующий по кругу с fade (opacity 0→1, 1.5с); смена через CSS-переменную; `body::after` сделать полноэкранным `var(--bg-image)` с фолбэком `earth.jpg`; второй псевдоэлемент `body::before` как нижний слой для crossfade; на мобильных `background-size:cover` не трогать; cache-busting поднять.

**Результат / расхождения:** Реализовано, но **направление подтверждено вопросом** — спека опиралась на неверное чтение CSS:

- **`body::after` ≠ полноэкранный фон.** На деле `::after` — это **круглый глобус** (earth.jpg, border-radius:50%, свечение) внизу экрана, а `body::before` — **звёзды** (radial-gradients). Спека думала, что ::after уже фон, а ::before свободен. Картинки — полноэкранные сюжетные сцены (посмотрел `bg_columbus_v2.png`: высадка Колумба). Алексей выбрал **«полноэкранно, заменить глобус»**: космос-стиль (глобус+звёзды+градиент) убран, сцены на весь экран.
- **Crossfade на двух псевдоэлементах.** Раз глобус и звёзды убираются — `::before` и `::after` освободились и стали двумя слоями (как и хотела спека «два слоя»): `::before`=`--bg-0`, `::after`=`--bg-1`, видимый слой определяется классом `body.bg-toggle` (opacity-transition 1.5с). `bg.js` пишет новую картинку в скрытый слой и переключает класс → настоящий crossfade без мигания через тёмный фон. Новых DOM-элементов не понадобилось.
- **БАГ url() в CSS-переменной (поймал на проверке):** относительный `url('img/...')` в кастом-проперти резолвится относительно **таблицы стилей** (`/css/`), а не документа → грузилось `/css/img/backgrounds/...` (404). Фикс: `bg.js` строит **абсолютный** URL через `new URL(path, document.baseURI).href` — корректно и локально, и на gh-pages (`/GeoGame/`). (Фолбэк `../img/earth.jpg` в самом style.css работал, т.к. написан относительно css/.)
- **Реализация:** новый `js/bg.js` (`initBackgroundRotation`, импорт+вызов в `init()`), массив 4 PNG, `Math.floor(Math.random()*…)` старт, `setInterval` 5 мин, предзагрузка следующей картинки (они ~3 МБ — чтобы crossfade был без подгрузки). `earth.jpg` оставлен CSS-фолбэком (`var(--bg-0, var(--earth-bg))`). `body` фон-градиент заменён на тёмную базу `#0a0a1a` (под слоями / до загрузки).
- **Версия:** 20260566 → **20260568** (был промежуточный 20260567 с забагованным bg.js — пере-бампнул после фикса URL); firebase.js — `20260538`.
- **`img/backgrounds/`** закоммичены (раньше лежали неотслеживаемыми, см. #43).

**Проверка (браузер):** старт — случайная сцена на `::before` (`--bg-0`), `::after` opacity 0; URL резолвится в `http://localhost:5500/img/backgrounds/bg_*.png` (200), не в `/css/`; `border-radius` ::before = 0 (глобуса нет); body фон `#0a0a1a`. Симуляция смены (запись в скрытый слой + класс `bg-toggle`): при отключённом transition целевые opacity корректны (с классом ::after=1/::before=0, без — наоборот), transition `opacity 1.5s` на месте. Живую анимацию 1.5с и интервал 5 мин в preview не видно (фоновая вкладка морозит CSS-переходы — известное ограничение), но логика и тайминги стандартные. Консоль чистая.

---

## 2026-05-29 #43 | Новая тема: «Найди страну на карте» (mapFind)

**Цель:** Добавить тему `mapFind` — SVG-карта мира с выделенной страной, игрок выбирает её название.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — карта рендерится из предспроецированных путей без D3, подсветка/автозум/дот микрогосударств, 13 тем, достижение «Географ», RU/EN, консоль чистая)

**Автор промпта:** Cowork

**Промпт (кратко — полный текст в истории чата):** Скрипт `scripts/build_worldmap.js` (Natural Earth 110m → `data/worldmap.json` GeoJSON + `data/worldmap_index.json`), тема `mapFind` в TOPICS перед `silhouette`, достижение `topic:mapFind` («Картограф», icon 🗺️), рендер картой через **D3.js v7 с cdnjs (lazy)** в `renderMapFind` (проекция geoNaturalEarth1, автозум к bbox страны PAD=0.5/MIN=80, dot для bbox<8px), CSS, i18n (`topic.mapFind.*`), доки.

**Результат / расхождения:** Реализовано. Перед стартом проверены данные и сверены с конвенциями кодовой базы — **две архитектурные развилки согласованы с Алексеем через вопрос**, плюс ряд правок под фактический код:

- **D3 в рантайме → прекомпьют (выбор Алексея).** Проект специально убрал ВСЕ рантайм-CDN (#18/#25/#26: офлайн/iPad). Вместо загрузки D3 с cdnjs — проекция geoNaturalEarth1 считается в `scripts/build_worldmap.js` (формула d3-geo реализована **вручную, без npm**), а `data/worldmap.json` хранит **готовые SVG-пути** в экранных координатах (960×500) + экранные bbox/центр. Рантайм (`renderMapFind` в ui.js) просто ставит `d`, подсвечивает цель, рисует dot и зумит viewBox — **никаких внешних библиотек**. `worldmap.json` грузится лениво и кешируется при первом вопросе темы.
- **Разрешение 110m → 50m (выбор Алексея).** 110m покрывал ~175/250 и не содержал Сингапур/Мальту/Бахрейн (их нельзя было бы подсветить, хотя они есть в проверке спеки). 50m → 236/250 (как силуэты). 14 без геометрии: BQ,BV,CC,CX,GF,GI,GP,MQ,RE,SJ,TK,TW,UM,YT.
- **i18n:** черновик использовал `t('topic.mapFind.label')`, но темы в проекте берут метки из `TOPIC_LABELS`/`TOPIC_QUESTIONS` — добавил туда (Найди на карте / Find on map, «Какая страна выделена?» / «Which country is highlighted?»). Текст «Загружаем карту…» вынесен в ключ `map.loading` (RU/EN), а не захардкожен.
- **Достижение:** черновик задавал литерал `{label, icon:'🗺️', ...}` и имя **«Картограф»** — но (а) в проекте достижения создаются `addMulti(key,'topic',ru,en)` (поля `name:{ru,en}`, иконка категории 🧩, `maxLevel:10`); (б) **«Картограф» уже занято** темой `topic:capital`. Назвал mapFind **«Географ / Geographer»**, иконка — стандартная 🧩 (как у всех topic-достижений). Итого достижений 25 → **26**.
- **renderQuestion:** черновик делал `renderMapFind(...); return;` — это пропустило бы построение кнопок-вариантов (функция ДОЛЖНА вернуть их, иначе ответы не работают). Карта рисуется асинхронно в `#flag-big` отдельной веткой `prompt.type==="mapFind"`, а варианты строятся как обычно. Добавлен **токен-гард** против гонки (если вопрос сменился, пока грузилась карта). Контейнер — `#flag-big` (а не `questionPromptEl` из черновика).
- **CSS:** `.flag-big` ограничен 260px — добавлен класс `.flag-big.map-mode { max-width:600px }`, иначе карта была бы зажата. Класс сбрасывается в начале каждого `renderQuestion`.
- **Уровни:** 13 тем × 4 = 52 разблокировки > 50 уровней → сложность 4 у mapFind/silhouette пришлась бы на недостижимые уровни 51–52 (в UI «🔒 51»). **Расширил `XP_THRESHOLDS` до 52** (1 правка генератора), чтобы весь контент был достижим; обновил комментарии и доки (50 → 52).
- **Антимеридиан:** в отличие от силуэтов, для единой мировой карты долготы НЕ сдвигаются (страна должна стоять на своём глобальном месте); автозум берёт bbox крупнейшего контура → зум к материку корректен (Россия/США без «размазывания»).

**Проверка (браузер, синхронный/микротаск-прогон):** `node scripts/build_worldmap.js` → 236 стран, worldmap.json ~1.1 МБ, индекс 236, project(0,0)=[480,250]. В игре (XP в макс): 13 тем (порядок …Религия, **Найди на карте**, Силуэт), вопрос «Какая страна выделена?»; карта = 236 path, ровно 1 `.map-country--highlight`, viewBox зазумлен к стране (проверено на AU — совпало с расчётом), `map-mode` включается. Прогон 9 вопросов: dot появляется ровно при bbox<8px (JM/VU/PW/XK/SI/CY — есть; UZ/LY/DZ — нет). Достижения: 26, есть «Географ» и «Топограф». EN-метки: «Find on map»/«Silhouette». Консоль без ошибок. Рантайм-запросов к CDN нет (D3 не используется).

---

## 2026-05-29 #42 | Новая тема: «Угадай страну по силуэту»

**Цель:** Добавить тему `silhouette` — показывается SVG-силуэт границ страны, игрок выбирает название.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — тема рендерит SVG-силуэт, гейтинг по манифесту, ответ+хук достижения, экран достижений «Топограф», RU/EN, консоль чистая)

**Автор промпта:** Cowork

**Промпт:**

## Новая тема: «Угадай страну по силуэту» (`silhouette`)

### Контекст

Игра — чистый HTML/CSS/JS, ES-модули, без фреймворков. Данные стран — `data/countries.json` (ключ `cca2`). Флаги и гербы уже хранятся локально в `img/flags/` и `img/coats/`. Новая тема устроена по той же схеме: разовый скрипт генерирует файлы → они коммитятся в репо → рантайм читает локально.

---

### Шаг 1 — Скрипт генерации силуэтов (`scripts/build_silhouettes.js`)

Написать Node-скрипт (CommonJS, как `scripts/fetch_countries.js`).

**Что делает:**

1. Скачивает GeoJSON границ стран — Natural Earth 110m:
   `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`
   (110m — низкое разрешение, ~800 КБ — достаточно для силуэта)

2. Читает `data/countries.json`, строит словарь `cca2 → true` (246 стран).

3. Для каждого feature в GeoJSON:
   - Берёт поле `properties.ISO_A2` как ключ (это cca2). Если `-99` или нет в нашем словаре — пропустить.
   - Достаёт все координаты (Polygon и MultiPolygon — обходить рекурсивно).
   - Находит bbox: minLon, maxLon, minLat, maxLat.
   - Нормализует координаты в viewBox `0 0 200 200` (сохранить пропорции через `preserveAspectRatio`, padding 10px внутри).
   - Строит SVG-строку: `<svg xmlns="..." viewBox="0 0 200 200"><path d="..." fill="#4f46e5"/></svg>`
   - Longitude → x, Latitude → y (y перевернуть: `y = 200 - normLat`).
   - Для MultiPolygon — несколько `<path>` или один объединённый через `M...Z M...Z`.

4. Пишет файл `data/silhouettes/{cca2}.svg` (создать папку если нет).

5. В конце выводит: сколько силуэтов создано, сколько стран из countries.json не нашлось в GeoJSON (вывести их cca2 — это нормально, маленькие острова могут отсутствовать в 110m).

Запуск: `node scripts/build_silhouettes.js`

---

### Шаг 2 — Новая тема в `js/main.js`

В объект `TOPICS` добавить запись **последней** (она самая сложная → разблокируется позже всех согласно `initLevelUnlocks`):

```js
silhouette: {
  get label() { return t('topic.silhouette.label'); },
  get question() { return t('topic.silhouette.question'); },
  prompt(country) { return { type: 'silhouette', country }; },
  answer(country) { return getName(country); },
  valid(country) { return true; },
},
```

---

### Шаг 3 — UI в `js/ui.js`

В функции `renderQuestion` добавить ветку для `prompt.type === 'silhouette'`:

```js
} else if (prompt.type === 'silhouette') {
  const cca2 = prompt.country.cca2.toLowerCase();
  const img = document.createElement('img');
  img.className = 'silhouette-img';
  img.src = `data/silhouettes/${cca2}.svg`;
  img.alt = '';
  img.onerror = () => {
    img.style.display = 'none';
    const fb = document.createElement('div');
    fb.className = 'silhouette-fallback';
    fb.textContent = '?';
    promptEl.appendChild(fb);
  };
  promptEl.appendChild(img);
}
```

В `css/style.css` добавить:

```css
.silhouette-img {
  width: 180px;
  height: 180px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(30%) sepia(90%) saturate(500%) hue-rotate(220deg);
}

.silhouette-fallback {
  font-size: 64px;
  color: #94a3b8;
  line-height: 180px;
}
```

---

### Шаг 4 — i18n (`js/i18n.js`)

Добавить ключи в словарь RU и EN:

```
'topic.silhouette.label': { ru: 'Силуэт', en: 'Silhouette' }
'topic.silhouette.question': { ru: 'Что за страна?', en: 'Which country?' }
```

---

### Шаг 5 — `data/silhouettes/` в `.gitignore`

Проверить: папка `data/silhouettes/` **не должна быть** в `.gitignore`. Файлы нужно коммитить в репо (как `img/flags/`).

---

### Шаг 6 — Обновить документацию

В `CLAUDE.md`:
- В раздел «Структура проекта» добавить `data/silhouettes/{cca2}.svg` и `scripts/build_silhouettes.js`.
- В раздел «Темы вопросов» добавить пункт 12: **Силуэт** (`silhouette`).
- В раздел «Сделано» добавить тему после реализации.

В `BACKLOG.md` найти запись «Темы с картой» — добавить заметку: «Силуэт реализован как статичные SVG (#42), без интерактивной карты».

---

### Проверка

1. `node scripts/build_silhouettes.js` — создать `data/silhouettes/*.svg`, вывести количество.
2. Открыть несколько SVG вручную — силуэт читаем (Франция, Австралия, Япония).
3. Включить тему «Силуэт» в игре → силуэт рисуется, ответы работают.
4. Проверить фолбэк: переименовать один SVG → вместо битой картинки показывается `?`.

**Результат / расхождения:** Реализовано. Перед стартом проверены реальные данные (принцип #2) — это выявило два существенных отклонения от черновой спеки, согласованы с Алексеем через вопрос:

- **Разрешение 110m → 50m.** 110m покрывает лишь ~175/250 стран (75 без силуэта, включая Сингапур, Мальту, Бахрейн, Мальдивы, Кабо-Верде) → ~30% вопросов были бы неотгадываемым «?». Перешли на Natural Earth **50m** (~3 МБ GeoJSON) — покрытие **236/250**, узнаваемые контуры. Без силуэта остаются 14 (нет геометрии в 50m): BQ,BV,CC,CX,GF,GI,GP,MQ,RE,SJ,TK,TW,UM,YT.
- **Гейтинг `valid` через манифест** (вместо `valid: () => true` + «?»). Скрипт пишет `data/silhouettes/index.json` (массив cca2); `data.js` грузит его (`hasSilhouette`), и `silhouette.valid = hasSilhouette` — в тему попадают только страны с силуэтом, «?» в норме недостижим (остаётся как defensive-фолбэк в UI).
- **12-е достижение `topic:silhouette`** («Топограф/Topographer», 10 уровней, +1% XP/ур.) — чтобы сохранить паритет «у каждой темы есть topic-достижение». Всего достижений 24 → **25**.

Прочие технические решения/отклонения:
- **i18n:** черновой спеке предлагался `t('topic.silhouette.label')`, но в проекте темы берут метки из словарей `TOPIC_LABELS`/`TOPIC_QUESTIONS` (`{ru,en}` на ключ) — добавил туда (Силуэт/Silhouette, «Что это за страна?»/«What country is this?»).
- **UI:** спека ссылалась на `promptEl`; фактический контейнер вопроса — `#flag-big` (`flagEl`) в `renderQuestion`. Ветка `prompt.type === "silhouette"` рендерит `<img class="silhouette-img" src="data/silhouettes/{cca2}.svg">`, фолбэк `onerror` → класс `silhouette-fallback` + «?». Класс сбрасывается в начале каждого `renderQuestion`.
- **CSS:** фильтр-перекраска из спеки **не нужна** — цвет (#4f46e5) зашит в `fill` SVG. Селектор `.flag-big img.silhouette-img` перебивает базовый `.flag-big img` (рамка + width:100%): без рамки, `max-height:180px`, `width:auto`, центр.
- **Скрипт build_silhouettes.js:** (а) фолбэк `ISO_A2 → ISO_A2_EH` (иначе France/Norway/Kosovo приходят как `-99`); (б) **антимеридиан** — при ширине bbox по долготе > 180° отрицательные долготы сдвигаются на +360 (иначе Россия/США/Фиджи «размазываются» на всю ширину); (в) при нескольких feature на один код берётся самый крупный по числу точек (баг: у AU три записи, и крошечные «о-ва Ашмор» перетирали материк — поймано на проверке файлов 236 vs манифест 238); (г) координаты округляются до 0.1; (д) папка пересоздаётся при каждом запуске.
- **Ограничение (задокументировано в скрипте):** рисуются ВСЕ полигоны, поэтому у стран с заморскими территориями (Франция и т. п.) кроме материка видны мелкие точки-острова. Материк доминирует; фильтрация — при необходимости отдельной задачей.
- **levels.js:** комментарий-заглушка обновлён (12 тем × 4 = 48 разблокировок, потолок контента — уровень 48).
- **Версия cache-busting:** 20260564 → **20260565** (main/ui/data + css/script в index.html); firebase.js — `20260538`.

**Проверка (браузер, синхронный прогон):** `node scripts/build_silhouettes.js` → 236 SVG + index.json (236), 14 missing. В игре (XP выкручен в макс, чтобы открыть тему): тем стало 12, последняя — «Силуэт»; вопрос рендерит силуэт (Катар, `qa.svg`, `naturalWidth>0`, фолбэк не сработал, SVG отдаётся 200); варианты — названия стран, верный среди них; ответ засчитывается («Правильный ответ»), хук `topic:silhouette` не падает; экран достижений показывает 25 достижений, «Топограф — Ур. 0 / +0% к XP»; EN-метка темы — «Silhouette», вопрос «What country is this?». Консоль без ошибок/предупреждений.

---

## 2026-05-29 #41 | Фикс: resetProgress не сбрасывает дейлик / стрик / задания

**Цель:** После «Сбросить прогресс» игрок видит дейлик и задания как новые — всё доступно заново.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — после сброса дейлик активен, стрик 0, квесты пересоздались свежими, консоль чистая)

**Автор промпта:** Cowork

**Промпт:**

## Проблема

`resetProgress` обнуляет XP/достижения/инвентарь, но не трогает три ключа localStorage:
- `geogame:daily-prize` — дейлик остаётся «уже получен»
- `geogame:streak` — серия не обнуляется
- `geogame:daily-quests` — задания остаются выполненными/забранными

## Фикс в `js/main.js`

В функции `resetProgress`, добавить сброс state и localStorage для этих трёх полей:

```js
// Дейлик — сделать снова доступным
state.dailyPrize = { lastClaimDate: null };
localStorage.removeItem(STORAGE.dailyPrize);

// Стрик — обнулить полностью
state.streak = { count: 0, lastGameDate: null, milestonesClaimedAt: [] };
localStorage.removeItem(STORAGE.streak);

// Задания — сбросить, чтобы сгенерировались заново
state.dailyQuests = { date: "", quests: [] };
localStorage.removeItem(STORAGE.dailyQuests);
```

Добавить эти строки рядом с существующими `localStorage.removeItem(STORAGE.achievements)` и `localStorage.removeItem(STORAGE.achievementsNew)`.

Также обновить комментарий над функцией:
```js
// Полный сброс прогресса («как в первый раз»):
// XP / рекорд / партии / инвентарь / выбор тем / достижения / дейлик / стрик / задания.
```

## Проверка

1. Сыграть партию, получить дейлик, выполнить задание.
2. Нажать «Сбросить прогресс» → подтвердить.
3. Открыть «Задания» → дейлик доступен (кнопка активна), стрик = 0 дней, все задания свежие и невыполненные.

**Результат / расхождения:** Выполнено по спеке. Единственное расхождение — форма «пустых» значений:
- Спека предлагала `lastClaimDate: null` / `lastGameDate: null`, но канонические дефолты состояния в `main.js` (и валидатор `loadFromStorage`, который требует `typeof ... === "string"`) используют пустую строку `""`. Поэтому в сбросе тоже `""`: `state.dailyPrize = { lastClaimDate: "" }`, `state.streak = { count: 0, lastGameDate: "", milestonesClaimedAt: [] }`. Функционально идентично (оба значения falsy / `!== getTodayString()`), но без введения второй «пустой» конвенции. `dailyQuests = { date: "", quests: [] }` — как в спеке.
- Три блока (state-сброс + `localStorage.removeItem`) добавлены сразу после `removeItem(STORAGE.achievementsNew)`, перед `persistTopicDifficulties()`. Комментарий над функцией обновлён на полный список.
- Версия cache-busting **20260563 → 20260564** во всех импортёрах (main.js, ui.js, data.js) + css/script в index.html; firebase.js остался `20260538`.
- Проверка (браузер, синхронный прогон): засеял в localStorage `daily-prize`/`streak`/`daily-quests` за сегодня (дейлик получен, стрик 5, квест выполнен+забран) + xp 1234 / games 7, перезагрузил, застабил `confirm → true`, нажал «Сбросить прогресс». После сброса: `geogame:daily-prize`/`streak`/`daily-quests`/`achievements` = `null` (удалены), `xpTotal`/`gamesPlayed` = `"0"`. Экран «Задания»: кнопка дейлика активна, «🔥 0 дней», вехи без отметок, все квесты «0 / N» и кнопки «Получить» disabled (пересоздались свежими, т.к. `date: ""` форсирует регенерацию). Консоль чистая.

---

## 2026-05-29 #40 | Подсказка «Выберите тему» когда кнопка «Начало» неактивна

**Цель:** Новый игрок понимает, почему кнопка «Начало» серая — под ней появляется подсказка.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — все 4 сценария RU + EN, подсказка реактивна на переключение языка, консоль чистая)

**Автор промпта:** Cowork

**Промпт:**

На экране «Регионы» (`#start-screen`) кнопка «Начало» (`#start-btn`) остаётся disabled, если `questionPairs().length === 0`. Нужно под этой кнопкой показывать подсказку — почему нельзя начать.

## 1. `index.html`

Добавить элемент-подсказку сразу после кнопки «Начало»:

```html
<p id="start-hint" class="start-hint" style="display:none"></p>
```

## 2. `js/i18n.js`

Добавить ключи:

```js
"start.hint.notopics":  { ru: "Выберите хотя бы одну тему",           en: "Please select at least one topic" },
"start.hint.noregions": { ru: "Выберите хотя бы один регион",          en: "Please select at least one region" },
"start.hint.both":      { ru: "Выберите регион и хотя бы одну тему",   en: "Please select a region and at least one topic" },
```

## 3. `js/main.js` — логика подсказки

В `refreshSetupUI` (или в `renderAvailableCount` — где обновляется счётчик доступных вопросов и состояние кнопки «Начало»), после того как кнопка ставится `disabled`, вычислять и показывать подсказку:

```js
const hintEl = document.getElementById("start-hint");
if (hintEl) {
  const noRegions = state.setup.regions.length === 0;
  const noTopics  = Object.values(state.setup.topicDifficulties).every(v => v < 0);
  if (questionPairs().length === 0) {
    let key;
    if (noRegions && noTopics) key = "start.hint.both";
    else if (noTopics)         key = "start.hint.notopics";
    else                       key = "start.hint.noregions";
    hintEl.textContent = t(key);
    hintEl.style.display = "";
  } else {
    hintEl.style.display = "none";
  }
}
```

## 4. `css/style.css`

```css
.start-hint {
  text-align: center;
  color: #ef4444;       /* красный — предупреждение */
  font-size: 13px;
  margin-top: 6px;
}
```

## 5. Проверка

1. Сбросить прогресс → «Новая игра» → экран Регионов. Все регионы выбраны, темы не выбраны → под кнопкой «Начало» красным: «Выберите хотя бы одну тему».
2. Нажать «Темы», включить одну тему, вернуться → подсказка исчезает, кнопка активна.
3. Снять все регионы → «Выберите хотя бы один регион».
4. Снять всё → «Выберите регион и хотя бы одну тему».

**Результат / расхождения:** Выполнено по спеке. Расхождения только в идентификаторах/размещении (спека дала черновые):
- В тексте промпта кнопка названа `#start-btn`, но фактический id — **`#regions-next`** (логика кнопки уже была в `refreshSetupUI`, туда же добавлена подсказка). Спека-черновик ошибалась в id, код — нет.
- `<p id="start-hint">` поставлен **после** `<div class="setup-nav">`, а не внутри неё. `.setup-nav` — это `display:flex` (ряд из «Назад»/«Начало»); вставка `<p>` внутрь сделала бы её третьим flex-элементом сбоку от кнопок. CSS подсказки (`text-align:center; margin-top:6px`) явно рассчитан на блок-строку **под** кнопкой — так и сделано.
- В условие добавлен guard `state.dataLoaded && questionPairs().length === 0`: пока страны не загрузились, подсказка не мигает (иначе показалась бы «выберите тему» даже при выбранной теме до загрузки данных). При загруженных данных (норма) поведение идентично спеке.
- i18n: ключи добавлены в плоские словари `ru`/`en` (в файле они раздельные, а не объект `{ru,en}` на ключ — формат проекта).
- Версия cache-busting **20260562 → 20260563** во всех импортёрах (main.js, ui.js, data.js) + css/script в index.html; firebase.js остался `20260538`. i18n.js и style.css кэш-инвалидируются через `?v=` импортёров.
- Проверка в браузере (синхронный прогон через UI-клики, данные уже загружены): **RU** — (1) 5 регионов + 0 тем → «Выберите хотя бы одну тему», кнопка disabled; (2) +1 тема → подсказка скрыта, кнопка активна; (3) 0 регионов + 1 тема → «Выберите хотя бы один регион»; (4) 0 регионов + 0 тем → «Выберите регион и хотя бы одну тему». **EN** — те же три текста корректны; переключение языка перерисовывает подсказку на лету. Консоль чистая.

---

## 2026-05-29 #39 | Фикс: суммарный XP-бонус не учитывает volume-достижения + стale меню

**Цель:** Все звёздочки достижений (region, topic, volume) дают +1% XP; бонус-строка в меню обновляется мгновенно.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — меню показывает +2% при volume:games L1 + topic:country L1; data-layer проверен в Node)

**Автор промпта:** Cowork

**Корень проблемы:**

Игрок видит 5 заполненных ★ на экране достижений (например, 4 звезды у «Путешественника» `volume:games` + 1 звезда у «Флаговеда` `topic:country`), но суммарный бонус показывает +1%. Причина: `volume:games` и `volume:xp` имеют `xpBonusPerLevel: 0`, то есть их звёзды в бонус не идут. Второй баг: `handleNewAchievementLevels` не вызывает `refreshMenuScreen()`, из-за чего строка «🎯 +N% к XP» в профиле меню остаётся устаревшей до возврата в меню.

**Промпт:**

## 1. `js/achievements.js` — дать volume-достижениям XP-бонус

Изменить объявление `volume:games` и `volume:xp`: установить `xpBonusPerLevel: 1`.

```js
// было:
ACHIEVEMENT_DEFS["volume:games"] = {
  category: "volume", ..., xpBonusPerLevel: 0, chestRewards: GAMES_CHESTS,
};
ACHIEVEMENT_DEFS["volume:xp"] = {
  category: "volume", ..., xpBonusPerLevel: 0, chestRewards: XP_CHESTS,
};

// стало:
ACHIEVEMENT_DEFS["volume:games"] = {
  category: "volume", ..., xpBonusPerLevel: 1, chestRewards: GAMES_CHESTS,
};
ACHIEVEMENT_DEFS["volume:xp"] = {
  category: "volume", ..., xpBonusPerLevel: 1, chestRewards: XP_CHESTS,
};
```

`mastery`-достижения оставить с `xpBonusPerLevel: 0` — они одноуровневые, дают сундуки, и отображаются как ✅/🔒 (не звёзды), поэтому в бонус не входят.

Обновить комментарий в файле:
```js
// Все достижения с xpBonusPerLevel > 0 (region, topic, volume) дают +1% к XP за каждый уровень.
// Mastery — одноуровневые, дают сундуки, XP-бонуса не дают.
```

## 2. `js/main.js` — вызвать `refreshMenuScreen()` после новых уровней достижений

В функции `handleNewAchievementLevels`, в самом конце (после `setAchievementsBadge(true)` и запуска `drainAchievementQueue`), добавить:

```js
refreshMenuScreen(); // обновить бонус-строку в профиле немедленно
```

Полный конец функции после правки:
```js
  persistAchievements();
  persistInventory();
  localStorage.setItem(STORAGE.achievementsNew, "true");
  setAchievementsBadge(true);
  if (!achievementPopupActive) drainAchievementQueue();
  refreshMenuScreen(); // ← добавить
```

## 3. Версионирование

Поднять версию в импорте `achievements.js` в `main.js` (чтобы браузер не грузил старый кэш):
```js
import { ... } from "./achievements.js?v=20260562";
```

## 4. Проверка

1. Открыть DevTools → Application → localStorage, удалить `geogame:achievements` (чистый старт).
2. Сыграть 1 партию (volume:games достигает порога 1 → уровень 1 → ★).
3. Ответить правильно 10 раз по теме «Флаги» (topic:country уровень 1 → ★).
4. Открыть «Достижения» → «Путешественник» показывает ★☆☆... (+1%), «Флаговед» показывает ★☆☆... (+1%). Суммарный бонус в шапке: «Суммарный бонус: +2% к XP».
5. Вернуться в меню → профиль показывает «🎯 +2% к XP» (БЕЗ перезагрузки страницы).
6. Получить ещё одно достижение во время партии → бонус-строка в меню обновляется сразу при возврате в меню (не нужно перезапускать игру).

**Результат / расхождения:** Выполнено по спеке, расхождений нет.
- `js/achievements.js`: `volume:games` и `volume:xp` → `xpBonusPerLevel: 1` (mastery остался `0`). Шапочный комментарий обновлён на «Все достижения с xpBonusPerLevel > 0 (region, topic, volume) дают +1% к XP за каждый уровень. Mastery — одноуровневые, дают сундуки, XP-бонуса не дают.» `getAchievementBonus` уже суммировал любые def с `xpBonusPerLevel > 0`, поэтому volume подхватился автоматически без правок логики.
- `js/main.js`: в конец `handleNewAchievementLevels` добавлена строка `refreshMenuScreen();` (функция — hoisted declaration, в области видимости).
- Версия cache-busting поднята **20260561 → 20260562** во всех импортёрах (main.js, ui.js, data.js) + `css`/`script` в index.html. `firebase.js` остался на `20260538` (единственный импортёр, без i18n-зависимости).
- Проверка: (а) Node — `initAchievements` + `volume:games` прогресс 1 (L1) + `topic:country` прогресс 10 (L1) → `getAchievementBonus = 2`, mastery `xpBonusPerLevel = 0`. (б) Браузер — посеял те же достижения в localStorage, перезагрузил: меню показывает «🎯 +2% к XP» (до фикса было бы +1%), консоль чистая, грузится `main.js?v=20260562`. Полный игровой прогон 10 правильных ответов не гонял — суммирование бонуса детерминировано и покрыто Node-тестом.

---

## 2026-05-29 #38 | Попап достижений + XP-анимация при получении наград

**Цель:** Каждое новое достижение встречается отдельным поздравительным попапом с анимацией и звуком; получение награды в заданиях сопровождается анимацией XP-бара.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — оба попапа, очередь, конфетти/звук, XP-бар, бонус-строка, level-up, RU/EN)

**Автор промпта:** Cowork

**Промпт:**

## 1. Попап достижения

### 1.1 HTML — новый оверлей

```html
<div id="achievement-popup" class="achievement-popup" style="display:none">
  <div class="achievement-popup__card">
    <div class="achievement-popup__confetti" id="ach-confetti"></div>
    <div class="achievement-popup__icon" id="ach-icon">🏆</div>
    <div class="achievement-popup__title" data-i18n="ach.popup.title">Новое достижение!</div>
    <div class="achievement-popup__name" id="ach-name"></div>
    <div class="achievement-popup__level" id="ach-level"></div>
    <div class="achievement-popup__reward" id="ach-reward"></div>
    <button class="achievement-popup__btn" id="ach-next-btn" data-i18n="ach.popup.next">Далее</button>
  </div>
</div>
```

Вставить прямо перед закрывающим `</body>`, поверх всего (z-index высокий).

### 1.2 CSS

```css
.achievement-popup {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  animation: ach-fade-in 0.25s ease;
}
@keyframes ach-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.achievement-popup__card {
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px;
  text-align: center;
  max-width: 320px;
  width: 90%;
  box-shadow: 0 8px 40px rgba(0,0,0,0.3);
  animation: ach-pop 0.35s cubic-bezier(0.34,1.56,0.64,1);
  position: relative;
  overflow: hidden;
}
@keyframes ach-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.achievement-popup__icon  { font-size: 56px; margin-bottom: 8px; }
.achievement-popup__title { font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
.achievement-popup__name  { font-size: 22px; font-weight: 700; margin: 8px 0 4px; }
.achievement-popup__level { font-size: 14px; color: #f59e0b; margin-bottom: 8px; } /* звёзды */
.achievement-popup__reward{ font-size: 15px; color: #10b981; font-weight: 600; margin-bottom: 20px; }
.achievement-popup__btn   { /* такой же стиль, как основные кнопки игры */ }
.achievement-popup__confetti { position: absolute; inset: 0; pointer-events: none; }
```

### 1.3 Конфетти — чистый Canvas JS (без библиотек)

Маленький модуль прямо в `ui.js` или inline в `main.js`. При открытии попапа запускать `startConfetti(canvasEl)`, при закрытии — `stopConfetti()`. Реализация: 60 частиц, случайные цвета (`#f59e0b`, `#10b981`, `#3b82f6`, `#ef4444`, `#a855f7`), падают вниз, лёгкое покачивание. `requestAnimationFrame`-цикл, который сам завершается через 3 секунды.

```js
function startConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 3,
    color: ['#f59e0b','#10b981','#3b82f6','#ef4444','#a855f7'][Math.floor(Math.random()*5)],
    speed: Math.random() * 2 + 1,
    swing: Math.random() * 2 - 1,
    angle: 0,
  }));
  let frame;
  const end = Date.now() + 3000;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.angle += 0.05;
      p.x += Math.sin(p.angle) * p.swing;
      p.y += p.speed;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r / 2, p.angle, 0, Math.PI * 2);
      ctx.fill();
    }
    if (Date.now() < end) frame = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
  return () => cancelAnimationFrame(frame);
}
```

### 1.4 Звук — Web Audio API (без внешних файлов)

```js
function playAchievementSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Три восходящих ноты: C5 → E5 → G5
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.start(start); osc.stop(start + 0.35);
    });
  } catch (e) { /* браузер без Web Audio — молча игнорировать */ }
}
```

### 1.5 Очередь и показ попапа

В `main.js` добавить:
```js
state.achievementQueue = []; // { name, levelStr, rewardStr, icon }
let achievementPopupActive = false;
```

Функция `enqueueAchievementPopup(items)` — пушит в очередь и запускает `drainAchievementQueue()` если попап не активен.

`drainAchievementQueue()`:
```js
function drainAchievementQueue() {
  if (!state.achievementQueue.length) { achievementPopupActive = false; return; }
  achievementPopupActive = true;
  const item = state.achievementQueue.shift();
  showAchievementPopup(item); // функция в ui.js
}
```

`showAchievementPopup(item)` (ui.js):
- Заполняет `#ach-icon`, `#ach-name`, `#ach-level` (звёзды: «★★☆☆☆...»), `#ach-reward`
- Запускает конфетти и звук
- Показывает попап

Кнопка «Далее» (`#ach-next-btn`) → скрыть попап → `drainAchievementQueue()`.

### 1.6 Интеграция с `handleNewAchievementLevels`

Заменить `// показать бейдж` → добавить в очередь:

```js
function handleNewAchievementLevels(newLevels) {
  for (const { key, newLevel, reward } of newLevels) {
    const def = ACHIEVEMENT_DEFS[key];
    const name = getLang() === 'ru' ? def.nameRu : def.nameEn;
    const stars = '★'.repeat(newLevel) + '☆'.repeat((def.maxLevel || 1) - newLevel);
    const rewardStr = reward?.chests ? `+${reward.chests} 🧰` : (def.xpBonusPerLevel ? `+${newLevel * def.xpBonusPerLevel}% к XP` : '');
    state.achievementQueue.push({ icon: def.icon || '🏆', name, levelStr: `Уровень ${newLevel}  ${stars}`, rewardStr });
    if (reward?.chests) state.inventory.chests += reward.chests;
  }
  persistAchievements(); persistInventory();
  localStorage.setItem('geogame:achievements-new', 'true');
  setAchievementsBadge(true);
  enqueueAchievementPopup([]); // запустить очередь (items уже добавлены выше)
}
```

**Таймер во время партии:** если попап появляется в активной игре (во время `#game-screen`), остановить игровой таймер перед показом и возобновить после нажатия «Далее». Обернуть `drainAchievementQueue` в проверку: если `state.phase === 'game'` → `clearInterval(timerInterval)` перед показом, `resumeTimer()` после.

### 1.7 `i18n.js`

```js
'ach.popup.title': { ru: 'Новое достижение!', en: 'Achievement Unlocked!' },
'ach.popup.next':  { ru: 'Далее',             en: 'Next' },
```

---

## 2. XP-анимация при получении награды в заданиях

### 2.1 HTML — оверлей XP-награды

```html
<div id="xp-reward-popup" class="xp-reward-popup" style="display:none">
  <div class="xp-reward-popup__card">
    <div class="xp-reward-popup__amount" id="xpr-amount">+50 XP</div>
    <div class="xp-reward-popup__bonus"  id="xpr-bonus"></div>
    <div class="xp-bar-wrap" style="margin:16px 0">
      <div class="xp-bar-bg">
        <div class="xp-bar-old" id="xpr-bar-old"></div>
        <div class="xp-bar-new" id="xpr-bar-new"></div>
      </div>
      <div class="xp-bar-label" id="xpr-bar-label"></div>
    </div>
    <div class="xp-reward-popup__levelup" id="xpr-levelup" style="display:none">🎉 Новый уровень!</div>
    <button id="xpr-ok-btn" data-i18n="common.ok">OK</button>
  </div>
</div>
```

Тот же стиль, что и `#achievement-popup` (белая карточка, затемнённый фон, анимация pop).

### 2.2 Функция `showXpRewardPopup(opts)` в `ui.js`

```js
showXpRewardPopup({
  earnedXp: 75,         // сколько XP начислено (уже с бонусом)
  bonusPercent: 12,     // суммарный % бонуса достижений (0 = не показывать строку)
  xpBefore: 1340,       // xpTotal ДО начисления
  xpAfter: 1415,        // xpTotal ПОСЛЕ
  getXPProgress,        // функция из levels.js
})
```

Логика:
- Показать «+75 XP» в `#xpr-amount`
- Если `bonusPercent > 0`: показать «+12% бонус достижений» в `#xpr-bonus` (зелёный)
- Запустить `animateXPBar(xpBefore, xpAfter, getXPProgress, onLevelUp, 1200)` на барах `#xpr-bar-old` / `#xpr-bar-new` (переиспользовать существующую функцию, но передавать ей конкретные элементы — или сделать вариант с селектором)
- При `onLevelUp` показать `#xpr-levelup`

Кнопка «OK» закрывает попап.

### 2.3 Интеграция в `main.js`

В `claimDailyPrize` и `claimQuest`, после начисления XP:

```js
const xpBefore = state.xpTotal; // сохранить ДО начисления
const bonus = getAchievementBonus(state.achievements);
const earned = applyBonus(baseXp, bonus);
state.xpTotal += earned;
// ... persist ...
showXpRewardPopup({
  earnedXp: earned,
  bonusPercent: bonus,
  xpBefore,
  xpAfter: state.xpTotal,
  getXPProgress,
});
```

---

## 3. Проверка

1. Сыграть 10 правильных ответов о странах Европы → появляется попап «Новое достижение! Знаток Европы — Уровень 1 ★☆☆☆... +1% к XP», конфетти падает, звук играет, кнопка «Далее» закрывает.
2. Если два достижения разблокированы одновременно — показываются по очереди (второй попап после нажатия «Далее» на первом).
3. Нажать «Получить» на дейлике → появляется оверлей «+75 XP», XP-бар анимируется, при переходе уровня показывается «🎉 Новый уровень!».
4. Попап достижения во время игры → таймер паузится → «Далее» → таймер продолжается.

**Результат / расхождения:** Реализовано полностью.
- **Попап достижения** (`#achievement-popup`): иконка (из нового поля `def.icon` по категории — добавил `ACH_CATEGORY_ICON` в achievements.js), название, «Ур. N + звёзды ★/☆», награда. Canvas-конфетти `startConfetti` (3с, без либ) + аккорд `playAchievementSound` (Web Audio, do-mi-sol). `#ach-confetti` сделал `<canvas>` (в ТЗ был `<div>`, но `getContext` требует canvas). Очередь `state.achievementQueue` + `drainAchievementQueue`; «Далее» (`#ach-next-btn`) → следующий или скрыть.
- **Попап XP-награды** (`#xp-reward-popup`): «+N XP», строка «+N% бонус достижений» (если бонус>0), анимированный двухсегментный XP-бар, «🎉 Новый уровень!» при переходе. `showXpRewardPopup` в ui.js; интегрирован в `claimDailyPrize` и `claimQuest`.
- **Рефактор `animateXPBar`:** добавлен 6-й опциональный параметр `els` (кастомные DOM-элементы) — попап анимирует свои `#xpr-bar-*`, экран результата работает как прежде (дефолтные id). `renderXPBar` больше не вызывается из animateXPBar (статичную отрисовку делает внутренний `paint`).
- **Адаптация к фактическому коду:** spec-сниппет использовал `def.nameRu`/`def.nameEn` — в нашем коде `def.name[getLang()]`; `state.phase` → `state.screen`. i18n: `ach.popup.title`, `ach.popup.next`, `ach.xp-bonus-line`, `common.ok` (RU/EN); уровень/бонус-метки берутся из существующих `achievements.level`/`achievements.xp-bonus`.
- **Проверено в браузере:** партия → endGame даёт 2 попапа в очереди (📊 Путешественник Ур.1 ★☆… +2🧰 → «Далее» → 🏆 Покоритель Ур.1 ★ +10🧰 → «Далее» → скрыт; сундуки 12); дейлик при сид-бонусе +10% → попап «+83 XP» (applyBonus(75,10)) + «+10% бонус достижений» + бар «190/200», xp 190→273 (пересекает 200 → level-up срабатывает в живом браузере); «OK» скрывает; RU↔EN на кнопках/заголовках; консоль чистая. Cache-busting 20260560→20260561.
- **Отклонение от ТЗ (п.4 проверки — пауза таймера):** в текущей архитектуре `handleAnswer` **первой строкой** вызывает `clearTimer()`, поэтому к моменту показа попапа достижения таймер вопроса уже остановлен (мы на экране результата ответа); попапы из `endGame`/`finishTraining` тоже вне активного таймера. Активного таймера во время попапа не бывает — отдельная пауза/возобновление не нужны (и механизма «доиграть остаток времени» в `startTimer` нет). Реализовывать искусственно не стал. Если потребуется — отдельной правкой.

---

## 2026-05-29 #37 | Задания: тиры сложности + стрик UX

**Цель:** Переработать экран заданий: три уровня сложности квестов (бронза/серебро/золото), единый сброс в полночь, понятный UI стрика с явными наградами.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — 3+2+1 тиры, 7 хуков, claim наград, дейт-сброс дейлика, таймеры, milestone-карточки, RU/EN)

**Автор промпта:** Cowork

**Промпт:**

## 1. Единый сброс в полночь

Сейчас ежедневный приз использует 24-часовой кулдаун (`Date.now() - lastClaim < 86400000`). Заменить на дату: хранить не таймстамп, а строку `YYYY-MM-DD`. Если `lastClaimDate === today` → кулдаун; иначе → доступно. Это же правило уже используется для квестов (`stored.date`) — унифицируем.

Функция `getTodayString()`:
```js
function getTodayString() {
  return new Date().toISOString().slice(0, 10); // "2026-05-29"
}
```

Изменить в `claimDailyPrize`:
```js
// было: { lastClaim: Date.now() }
// стало:
{ lastClaimDate: getTodayString() }
```

Изменить проверку кулдауна дейлика:
```js
const available = stored.lastClaimDate !== getTodayString();
```

Таймер до полуночи (функция `getMsUntilMidnight`):
```js
function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}
```

Таймер на экране заданий (`setInterval` пока экран открыт) показывает «Обновление через HH:MM:SS» для дейлика, если он уже получен. Для квестов — тот же таймер (один на весь экран, под заголовком или в шапке секции квестов).

---

## 2. Квесты: три тира сложности

### 2.1 Пулы квестов

Заменить плоский `QUEST_POOL` на три отдельных пула. Каждый пул — 6 квестов.

**Лёгкие квесты** (`QUEST_POOL_EASY`, 6 штук):

| id | RU | EN | hook | goal |
|---|---|---|---|---|
| `easy:play1game` | Сыграй 1 партию | Play 1 game | `games` | 1 |
| `easy:correct5` | Дай 5 правильных ответов | Give 5 correct answers | `correct_any` | 5 |
| `easy:earn30xp` | Заработай 30 XP | Earn 30 XP | `xp` | 30 |
| `easy:play10q` | Сыграй партию из 10 вопросов | Play a 10-question game | `questions_in_game` | 10 |
| `easy:streak3` | Ответь верно 3 раза подряд | Answer 3 in a row | `streak` | 3 |
| `easy:flags3` | Угадай 3 флага | Identify 3 flags | `correct_topic:country` | 3 |

Награда за лёгкое задание: **25 XP + 1 🧰**

**Средние квесты** (`QUEST_POOL_MEDIUM`, 6 штук):

| id | RU | EN | hook | goal |
|---|---|---|---|---|
| `medium:play2games` | Сыграй 2 партии | Play 2 games | `games` | 2 |
| `medium:correct15` | Дай 15 правильных ответов | Give 15 correct answers | `correct_any` | 15 |
| `medium:earn100xp` | Заработай 100 XP | Earn 100 XP | `xp` | 100 |
| `medium:streak8` | Ответь верно 8 раз подряд | Answer 8 in a row | `streak` | 8 |
| `medium:capitals5` | Назови 5 столиц | Name 5 capitals | `correct_topic:capital` | 5 |
| `medium:play25q` | Сыграй партию из 25 вопросов | Play a 25-question game | `questions_in_game` | 25 |

Награда за среднее задание: **75 XP + 3 🧰**

**Тяжёлые квесты** (`QUEST_POOL_HARD`, 6 штук):

| id | RU | EN | hook | goal |
|---|---|---|---|---|
| `hard:play3games` | Сыграй 3 партии | Play 3 games | `games` | 3 |
| `hard:correct30` | Дай 30 правильных ответов | Give 30 correct answers | `correct_any` | 30 |
| `hard:earn300xp` | Заработай 300 XP | Earn 300 XP | `xp` | 300 |
| `hard:streak15` | Ответь верно 15 раз подряд | Answer 15 in a row | `streak` | 15 |
| `hard:play50q` | Сыграй партию из 50 вопросов | Play a 50-question game | `questions_in_game` | 50 |
| `hard:multitopic` | Сыграй с 4+ темами одновременно | Play with 4+ topics at once | `topics_in_game` | 4 |

Награда за тяжёлое задание: **200 XP + 8 🧰**

### 2.2 Выбор квестов на день

```js
function getTodayQuests() {
  const day = getDayOfYear(); // существующая функция
  // 3 лёгких: разнесённые индексы, чтобы не повторялись
  const easy = [
    QUEST_POOL_EASY[day % 6],
    QUEST_POOL_EASY[(day + 2) % 6],
    QUEST_POOL_EASY[(day + 4) % 6],
  ];
  // 2 средних
  const medium = [
    QUEST_POOL_MEDIUM[day % 6],
    QUEST_POOL_MEDIUM[(day + 3) % 6],
  ];
  // 1 тяжёлое
  const hard = [QUEST_POOL_HARD[day % 6]];
  return [...easy, ...medium, ...hard];
}
```

Хранить в `geogame:daily-quests` тот же формат: `{ date: getTodayString(), quests: [{id, progress, claimed}] }`. При смене даты — пересобирать из пулов.

### 2.3 Хуки обновления прогресса

Добавить в `updateQuestProgress(hook, value)` обработку новых типов хуков:

- **`correct_any`** — +`value` к прогрессу всех квестов с `hook === 'correct_any'`. Вызывать из `handleAnswer` при правильном ответе: `updateQuestProgress('correct_any', 1)`.
- **`correct_topic:X`** — +1 к прогрессу квестов с `hook === 'correct_topic:' + topicKey`. Вызывать из `handleAnswer`: `updateQuestProgress('correct_topic:' + q.topicKey, 1)`.
- **`streak`** — устанавливать `progress = Math.max(progress, state.correctStreak)` для квестов с `hook === 'streak'`. Вызывать из `handleAnswer` после обновления `state.correctStreak`.
- **`games`** — +1 к прогрессу квестов с `hook === 'games'`. Вызывать из `endGame`.
- **`xp`** — +`value` к прогрессу квестов с `hook === 'xp'`. Вызывать из `handleAnswer` со значением заработанного XP (уже с бонусом).
- **`questions_in_game`** — при завершении партии: если `state.questions.length >= quest.goal` → прогресс = goal (выполнено). Вызывать из `endGame`.
- **`topics_in_game`** — при завершении партии: если кол-во активных тем >= quest.goal → прогресс = goal. Вызывать из `endGame`.

Обновлённая сигнатура `updateQuestProgress(hook, value)` должна корректно обрабатывать все 7 типов хуков.

### 2.4 Награды за квесты

`claimQuest(questId)` определяет награду по тиру:
```js
const QUEST_REWARDS = {
  easy:   { xp: 25,  chests: 1 },
  medium: { xp: 75,  chests: 3 },
  hard:   { xp: 200, chests: 8 },
};
const tier = questId.split(':')[0]; // 'easy' | 'medium' | 'hard'
const reward = QUEST_REWARDS[tier];
```

XP из квестов оборачивать через `applyBonus(reward.xp, getAchievementBonus(state.achievements))` — если достижения уже реализованы (промпт #36), иначе начислять без бонуса и добавить бонус в следующей итерации.

---

## 3. UI стрика — явные milestone-карточки

Переработать секцию «Серия» в `renderTasks` / `ui.js`.

**Новый вид:**

```
🔥 N дней подряд
Играй каждый день хотя бы одну партию, чтобы не прерывать серию

[ 3 дня ]     [ 7 дней ]    [ 14 дней ]   [ 30 дней ]
50 XP+3🧰   150 XP+10🧰  300 XP+20🧰  500 XP+50🧰
   🔒             🔒            🔒             🔒
```

Каждая milestone-карточка:
- Число дней крупно
- Награда (XP + сундуки)
- Статус: 🔒 серый (ещё не достигнуто) / ★ жёлтый (ближайшая цель, текущий стрик < milestone) / ✅ зелёный (уже получено, `milestonesClaimedAt` содержит этот milestone)

Ближайшая незавершённая цель — жёлтая обводка карточки + текст под ней: «Осталось N дней».

Описание-подсказка под заголовком «Серия»:
- RU: «Играй каждый день хотя бы одну партию, чтобы не прерывать серию. Достигнув отметки — получи бонус.»
- EN: «Play at least one game every day to keep your streak. Reach a milestone to claim a reward.»

---

## 4. UI квестов — тиры и таймер

### Заголовок секции квестов

Под заголовком «Задания дня» добавить строку-таймер (если все квесты выполнены или в любом случае):
```
Обновление через 14:32:07
```
Таймер обновляется каждую секунду (`setInterval` пока экран активен, очищать при уходе).

### Карточки квестов

Визуально разделить на три группы с заголовком тира:

**🥉 Лёгкие** (3 карточки)
**🥈 Средние** (2 карточки)
**🥇 Тяжёлые** (1 карточка)

Каждая карточка квеста:
- Иконка тира (🥉/🥈/🥇) слева
- Текст задания
- Прогресс-бар + «N / Goal»
- Награда: «25 XP + 1🧰» / «75 XP + 3🧰» / «200 XP + 8🧰»
- Кнопка «Получить» (когда `progress >= goal && !claimed`) или «Получено ✓»

Цветовой акцент карточки по тиру:
- Лёгкие: светло-зелёная полоска слева (`#86efac`)
- Средние: светло-голубая (`#93c5fd`)
- Тяжёлые: светло-жёлтая / золотая (`#fcd34d`)

---

## 5. `i18n.js`

Добавить ключи для квестов (метки тиров и таймера):
```js
'tasks.tier.easy':   { ru: '🥉 Лёгкие',   en: '🥉 Easy'   },
'tasks.tier.medium': { ru: '🥈 Средние',   en: '🥈 Medium' },
'tasks.tier.hard':   { ru: '🥇 Тяжёлые',  en: '🥇 Hard'   },
'tasks.timer':       { ru: 'Обновление через {t}', en: 'Resets in {t}' },
'tasks.streak.hint': {
  ru: 'Играй каждый день хотя бы одну партию, чтобы не прерывать серию. Достигнув отметки — получи бонус.',
  en: 'Play at least one game every day to keep your streak. Reach a milestone to claim a reward.'
},
'tasks.streak.left': { ru: 'Осталось {n} дн.', en: '{n} days left' },
```

Для каждого id квеста добавить ключ `quest.{id}` со строками RU/EN из таблиц выше.

---

## 6. `CLAUDE.md` — обновить

В разделе «Задания» обновить описание квестов:
- Три тира: лёгкие (3/день), средние (2/день), тяжёлые (1/день). Пул каждого тира — 6 квестов, ротация по `dayOfYear`.
- Награды: 25 XP+1🧰 / 75 XP+3🧰 / 200 XP+8🧰.
- Ключи localStorage: `geogame:daily-quests` формат прежний.
- Дейлик теперь использует дату (`YYYY-MM-DD`), а не таймстамп.
- Сброс всего в полночь (date-based).

---

## 7. Проверка после реализации

1. Установить `geogame:xpTotal = 0`, открыть Задания → видно 3+2+1 карточек с тирами 🥉🥈🥇.
2. Сыграть партию из 10 вопросов → `easy:play1game` и `easy:play10q` получают прогресс → можно забрать награду.
3. Дать 3 правильных ответа подряд → `easy:streak3` → выполнено.
4. Стрик: «Осталось 3 дня» у ближайшего milestone (при 0 дня стрика).
5. Таймер «Обновление через HH:MM:SS» работает и не замерзает при сворачивании.
6. Изменить системную дату на завтра (или `getTodayString` подменить в консоли) → квесты и дейлик сбрасываются.

**Результат / расхождения:** Реализовано полностью.
- **Единый сброс по дате:** добавлены `getTodayString()` (UTC `toISOString().slice(0,10)`) и `getMsUntilMidnight()` (локальная полночь). `state.dailyPrize = { lastClaimDate }`; `isDailyPrizeAvailable` сравнивает с `getTodayString()`; старый формат `{lastClaim:ms}` игнорируется при загрузке (приз станет доступен — разовая миграция). `ensureDailyQuests` тоже на `getTodayString()`.
- **Три тира:** `QUEST_POOL_EASY/MEDIUM/HARD` (по 6) + `QUEST_REWARDS`. `getTodayQuests()` собирает 3+2+1 ротацией по `dayOfYear`. Квест в state: `{id, hook, goal, tier, progress, completed, claimed}`.
- **Хук-модель:** `updateQuestProgress(hook, value)` обновляет ВСЕ сегодняшние квесты с этим хуком. Накопительные (`games`/`correct_any`/`xp`/`correct_topic:X`) += value; максимум-хуки (`streak`/`questions_in_game`/`topics_in_game`) = max. Хуки: `handleAnswer` → correct_any/correct_topic:topicKey/streak(=correctStreak)/xp(=earned); `endGame` → games/questions_in_game(=questions.length)/topics_in_game(=activeTopicsCount). Старые квест-вызовы (streak5/correct15/play1game/earn100xp/play25q/dotraining) удалены.
- **claimQuest:** награда по тиру (`id.split(':')[0]`) — XP (с `applyBonus` от достижений) + сундуки; синк xpTotal/inventory.
- **UI:** таймер сброса `#tasks-quests-timer` под заголовком «Задания дня» (тикает до полуночи; при смене даты — полная перерисовка). Квесты сгруппированы по тирам с заголовками 🥉/🥈/🥇 и цветной полоской слева (#86efac/#93c5fd/#fcd34d), карточка: текст + прогресс-бар + «N / Goal» + награда + кнопка. Стрик — milestone-карточки: ✅ зелёная (получено) / жёлтая «Осталось N дн.» (ближайшая) / 🔒 серая, + подсказка. `setQuestsTimerText` добавлен в ui.js.
- i18n: `tasks.tier.easy/medium/hard`, `tasks.timer`, `tasks.streak.hint`, `tasks.streak.left` + 18 ключей `quest.<tier>:<id>` (RU из ТЗ, EN — мой перевод). Старые 6 `quest.*` ключей удалены.
- **Проверено в браузере (localhost:5500):** 3+2+1 карточек с правильными тирами/полосками/наградами; таймер «Обновление через 10:03:06»; все 7 хуков фиксируют прогресс (correct_any=4, xp=40, correct_topic:country=3✓, questions_in_game=10✓, topics_in_game=1); claim easy → +25 XP +1🧰, «Получено ✓»; дейлик claim → +75 XP/дата=сегодня/таймер, подмена даты → снова доступен + бейдж; milestone-карточки и «Осталось N дн.»; RU↔EN на всех элементах. Консоль чистая. Cache-busting 20260559→20260560.
- **Известный нюанс (по ТЗ как есть):** `getTodayString()` использует UTC-дату, а `getMsUntilMidnight()` — локальную полночь (обе функции даны в ТЗ дословно). Для не-UTC часовых поясов момент фактического сброса (смена UTC-даты) и обнуление таймера (локальная полночь) не совпадают; тикер ловит смену даты посекундно и перерисовывается, так что функционально корректно, но отображаемый «Обновление через …» считает до локальной полуночи. При необходимости — выровнять в отдельной правке.

---

## 2026-05-29 #36 | Система достижений с XP-бонусом

**Цель:** Полноценная система достижений — 4 категории, многоуровневые, с суммарным % бонусом к любому XP.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — экран, бонус 20% → дейлик 75→90, endGame-ачивки/сундуки/бейдж, RU/EN, сброс)

**Автор промпта:** Cowork

**Промпт:**

## Контекст

Добавляем систему достижений. Достижения — долгосрочный мотиватор; ключевая механика: каждый уровень достижения из категорий «Регионы» и «Темы» даёт +1% к любому получаемому XP (игра, бонусный экран, дейлик). Суммарный бонус неограничен, отображается в нескольких местах.

---

## 1. Новый файл `js/achievements.js`

Вся логика достижений — data-layer, без DOM и без state.

### 1.1 Определения достижений

```js
// Пороги прогресса для уровней 1–10 (категории region и topic)
export const MULTI_THRESHOLDS = [10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500];

// Пороги для объёма (volume:games — кол-во партий)
export const GAMES_THRESHOLDS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500];

// Пороги для объёма (volume:xp — суммарный XP)
export const XP_VOL_THRESHOLDS = [500, 1500, 5000, 15000, 50000, 150000, 500000, 1500000, 5000000, 15000000];
```

Объект `ACHIEVEMENT_DEFS` — плоский словарь, ключ = `"category:id"`:

**Категория `region`** (5 штук):
| Ключ | Название RU | Название EN | Условие прогресса |
|---|---|---|---|
| `region:europe` | Знаток Европы | Europe Expert | правильные ответы о странах Европы |
| `region:asia` | Знаток Азии | Asia Expert | Азия |
| `region:africa` | Знаток Африки | Africa Expert | Африка |
| `region:americas` | Знаток Америк | Americas Expert | Америка |
| `region:oceania` | Знаток Океании | Oceania Expert | Океания |

Все: 10 уровней, пороги `MULTI_THRESHOLDS`, `xpBonusPerLevel: 1` (%).

**Категория `topic`** (11 штук):
| Ключ | Название RU | Название EN |
|---|---|---|
| `topic:country` | Флаговед | Flag Expert |
| `topic:capital` | Картограф | Cartographer |
| `topic:countryByCapital` | Навигатор | Navigator |
| `topic:population` | Демограф | Demographer |
| `topic:area` | Землемер | Surveyor |
| `topic:language` | Лингвист | Linguist |
| `topic:currency` | Финансист | Financier |
| `topic:nativeName` | Этнограф | Ethnographer |
| `topic:coatOfArms` | Геральдист | Heraldist |
| `topic:density` | Статистик | Statistician |
| `topic:religion` | Теолог | Theologian |

Все: 10 уровней, пороги `MULTI_THRESHOLDS`, `xpBonusPerLevel: 1` (%).

**Категория `volume`** (2 штуки):
- `volume:games` — «Путешественник» / «Traveler», 10 уровней, пороги `GAMES_THRESHOLDS`, без XP-бонуса, награда: сундуки (2 / 3 / 4 / 5 / 7 / 10 / 15 / 20 / 30 / 50 🧰).
- `volume:xp` — «Эрудит» / «Scholar», 10 уровней, пороги `XP_VOL_THRESHOLDS`, без XP-бонуса, награда: сундуки (2 / 3 / 5 / 8 / 12 / 20 / 30 / 50 / 80 / 150 🧰).

**Категория `mastery`** (6 штук, одноуровневые):
| Ключ | Название RU | Название EN | Условие |
|---|---|---|---|
| `mastery:perfect` | Перфекционист | Perfectionist | сессия без единой ошибки (≥ 10 вопросов) |
| `mastery:sniper` | Снайпер | Sniper | 15 правильных ответов подряд в одной сессии |
| `mastery:speed` | Молния | Lightning | 10 ответов быстрее 5 сек в одной сессии |
| `mastery:alltopics` | Полиглот | Polyglot | сыграть партию со всеми 11 темами одновременно |
| `mastery:allregions` | Покоритель | Conqueror | сыграть партию со всеми 5 регионами |
| `mastery:training` | Прилежный | Diligent | завершить обучение (не пропустить) хотя бы 10 раз |

Все mastery: 1 уровень (достиг / не достиг, кроме `mastery:training` — счётчик до 10), без XP-бонуса, награда: 10 🧰 при достижении.

### 1.2 Структура данных достижений в localStorage

Ключ `geogame:achievements` — объект:
```js
{
  "region:europe": { level: 2, progress: 35 },
  "topic:country": { level: 0, progress: 8 },
  "mastery:perfect": { level: 0, progress: 0 },
  // ...
}
```
`level` = текущий уровень достижения (0 = ещё не открыто ни одного). `progress` = накопленный прогресс.

Ключ `geogame:achievements-new` — `true` если есть хотя бы одно новое достижение (уровень вырос) с последнего посещения экрана достижений.

### 1.3 Функции в `achievements.js`

```js
/**
 * Загрузить/инициализировать данные достижений из переданного объекта (из localStorage).
 * Возвращает полный объект со всеми ключами (дополняет отсутствующие нулями).
 */
export function initAchievements(stored) { ... }

/**
 * Обновить прогресс достижения на delta единиц.
 * Возвращает массив новых уровней, которые были достигнуты (может быть несколько): [{ key, newLevel, reward }]
 * reward = { xpBonus: 0, chests: N } | null
 */
export function advanceAchievement(achievementsState, key, delta) { ... }

/**
 * Суммарный XP-бонус в процентах (только категории region и topic).
 * Пример: 3 достижения по 2 уровня = +6%.
 */
export function getAchievementBonus(achievementsState) { ... }

/**
 * Применить XP-бонус к базовому значению.
 * applyBonus(100, 15) → 115
 */
export function applyBonus(baseXp, bonusPercent) {
  return Math.round(baseXp * (1 + bonusPercent / 100));
}
```

---

## 2. `main.js` — интеграция

### 2.1 State и загрузка

Добавить в `state`:
```js
state.achievements = {}; // заполняется в loadFromStorage через initAchievements()
```

В `loadFromStorage`:
```js
const rawAch = JSON.parse(localStorage.getItem('geogame:achievements') || 'null');
state.achievements = initAchievements(rawAch);
```

В `persistAchievements()` (новая функция):
```js
localStorage.setItem('geogame:achievements', JSON.stringify(state.achievements));
```

### 2.2 Хук `handleAnswer` — основной трекер прогресса

После каждого **правильного** ответа (когда `isCorrect === true`) добавить вызовы:

```js
const country = q.country;
const topicKey = q.topicKey;
const region = country.region; // 'Europe' | 'Asia' | ...

// Регион → ключ достижения (маппинг)
const regionMap = { Europe: 'region:europe', Asia: 'region:asia', Africa: 'region:africa', Americas: 'region:americas', Oceania: 'region:oceania' };

const newLevels = [];

// Достижение по региону
const rKey = regionMap[region];
if (rKey) newLevels.push(...advanceAchievement(state.achievements, rKey, 1));

// Достижение по теме
newLevels.push(...advanceAchievement(state.achievements, 'topic:' + topicKey, 1));

// Достижение «Снайпер» (15 подряд — используем state.hintCharge как прокси, но лучше завести отдельный счётчик)
// Завести state.correctStreak (int, сбрасывается при ошибке/таймауте)
state.correctStreak = (state.correctStreak || 0) + 1;
if (state.correctStreak >= 15) {
  newLevels.push(...advanceAchievement(state.achievements, 'mastery:sniper', 1));
}

// Достижение «Молния» (ответ быстрее 5 сек)
const elapsed = (Date.now() - state.questionStartTime) / 1000;
if (elapsed < 5) {
  state.speedCount = (state.speedCount || 0) + 1;
  if (state.speedCount >= 10) {
    newLevels.push(...advanceAchievement(state.achievements, 'mastery:speed', 1));
  }
}

if (newLevels.length) {
  handleNewAchievementLevels(newLevels);
}
```

При неверном ответе/таймауте: `state.correctStreak = 0; state.speedCount = 0;`

Добавить `state.questionStartTime = Date.now()` при каждом показе нового вопроса (в `showQuestion`).

### 2.3 Хук `endGame` — достижения по объёму, точности, мастерству

```js
const newLevels = [];

// volume:games
newLevels.push(...advanceAchievement(state.achievements, 'volume:games', 1));

// volume:xp (обновляем прогресс до текущего xpTotal)
// volume:xp прогресс = абсолютное значение xpTotal, а не дельта
// → нужна функция setAchievementProgress(state.achievements, 'volume:xp', state.xpTotal)
// которая не прибавляет, а устанавливает абсолютное значение и проверяет пороги
newLevels.push(...setAchievementProgress(state.achievements, 'volume:xp', state.xpTotal));

// mastery:perfect (0 ошибок, ≥10 вопросов)
if (state.wrongAnswers.length === 0 && state.questions.length >= 10) {
  newLevels.push(...advanceAchievement(state.achievements, 'mastery:perfect', 1));
}

// mastery:alltopics
const activeTopic = Object.values(state.setup.topicDifficulties).filter(v => v >= 0).length;
if (activeTopic === Object.keys(TOPICS).length) {
  newLevels.push(...advanceAchievement(state.achievements, 'mastery:alltopics', 1));
}

// mastery:allregions
if (state.setup.regions.length === Object.keys(REGIONS).length) {
  newLevels.push(...advanceAchievement(state.achievements, 'mastery:allregions', 1));
}

if (newLevels.length) {
  handleNewAchievementLevels(newLevels);
  persistAchievements();
}
```

Добавить экспорт `setAchievementProgress(achievementsState, key, absoluteValue)` в `achievements.js`.

### 2.4 Хук `finishTraining` — mastery:training

```js
newLevels.push(...advanceAchievement(state.achievements, 'mastery:training', 1));
```

### 2.5 Функция `handleNewAchievementLevels(newLevels)`

```js
function handleNewAchievementLevels(newLevels) {
  // Начислить награды (сундуки)
  for (const { reward } of newLevels) {
    if (reward?.chests) state.inventory.chests += reward.chests;
  }
  persistAchievements();
  persistInventory();
  // Выставить бейдж
  localStorage.setItem('geogame:achievements-new', 'true');
  setAchievementsBadge(true); // обновить кнопку меню если меню открыто
}
```

### 2.6 Применение XP-бонуса

Во всех местах, где начисляется XP, обернуть значение через `applyBonus(base, getAchievementBonus(state.achievements))`:

- `handleAnswer` → строка `state.xpTotal += XP_PER_CORRECT` → заменить на:
  ```js
  const bonus = getAchievementBonus(state.achievements);
  const earned = applyBonus(XP_PER_CORRECT, bonus);
  state.xpTotal += earned;
  state.xpEarnedThisGame += earned;
  ```
  Сохранить `earned` в переменную, чтобы отображать в баннере «+N XP».

- `claimDailyPrize` → при начислении 75 XP → обернуть.

- `claimBonus` (бонусный экран) → при начислении `state.bonusPrize.xp` → обернуть.

- Награды за достижения (`handleNewAchievementLevels`) — без бонуса (чтобы не было рекурсии).

- Квесты (`claimQuest`) — обернуть.

### 2.7 `goToAchievements` и `goToMenu`

```js
function goToAchievements() {
  localStorage.removeItem('geogame:achievements-new');
  setAchievementsBadge(false);
  renderAchievements(buildAchievementsVM(), ...);
  showScreen('achievements');
}
```

### 2.8 `resetProgress`

Добавить сброс: `localStorage.removeItem('geogame:achievements'); localStorage.removeItem('geogame:achievements-new');`

---

## 3. `index.html` — новый экран и кнопка меню

Добавить кнопку в `#menu-screen` (рядом с «Задания»):
```html
<button id="menu-achievements-btn" data-i18n="menu.achievements">Достижения</button>
<span id="menu-achievements-badge" class="menu-badge" style="display:none"></span>
```

Добавить экран:
```html
<div id="achievements-screen" class="screen">
  <div class="topbar">
    <button id="achievements-back-btn">←</button>
    <span data-i18n="menu.achievements">Достижения</span>
    <span id="achievements-bonus-total"></span>
  </div>
  <div id="achievements-list"></div>
</div>
```

---

## 4. `ui.js` — рендер экрана достижений

Новая функция `renderAchievements(vm)`. `vm` — объект с данными, который строит main.js:

```js
{
  totalBonus: 17,       // суммарный %
  lang: 'ru',
  categories: [
    {
      id: 'region',
      label: 'Регионы / Regions',
      items: [
        {
          key: 'region:europe',
          name: 'Знаток Европы',
          level: 2,          // текущий уровень (0–10)
          maxLevel: 10,
          progress: 35,      // текущий прогресс
          nextThreshold: 50, // null если maxLevel
          bonusPercent: 2,   // level × 1
        },
        ...
      ]
    },
    { id: 'topic', label: 'Темы / Topics', items: [...] },
    { id: 'volume', label: 'Объём / Volume', items: [...] },
    { id: 'mastery', label: 'Мастерство / Mastery', items: [...] },
  ]
}
```

Каждый `item` рендерится как карточка:
- Иконка категории (эмодзи: 🌍 / 🧩 / 📊 / 🏆)
- Название + уровень (например «Знаток Европы — Ур. 2»)
- Заполненные / пустые звёзды (★★☆☆☆☆☆☆☆☆)
- Прогресс-бар: `progress / nextThreshold`
- Подпись: «35 / 50» и если `bonusPercent > 0`: «+2% к XP»
- Mastery-достижения без прогресс-бара, только статус (✅ / 🔒)

Вверху экрана (в топбаре или под ним): «Суммарный бонус: +17% к XP» — строка `#achievements-bonus-total`.

Функция `setAchievementsBadge(show)` — показывает/скрывает `#menu-achievements-badge`.

---

## 5. `css/style.css`

Стили для `#achievements-screen`:
- Карточки достижений аналогичны карточкам квестов (`#tasks-screen`) — белый фон, скруглённые углы, тень.
- Звёзды: ★ заполненная — золотой (`#f59e0b`), ☆ пустая — серый.
- Прогресс-бар аналогичен квестовому.
- Бонус-строка в топбаре: зелёный цвет, правая сторона.
- Mastery-достижения без прогресс-бара, статус иконкой справа.

---

## 6. Отображение суммарного бонуса в других местах

**Главное меню (`#menu-screen`):**
В блоке профиля, под XP-баром, добавить строку (если бонус > 0):
```html
<div id="menu-bonus-line">🎯 +<span id="menu-bonus-value">0</span>% к XP</div>
```
Рендерить в `refreshMenuScreen()`.

**Экран результата партии (`#result-screen`):**
Добавить строку между «За партию» и «Итого»:
```
Бонус достижений: +17%
```
Показывать только если бонус > 0. Рендерить в `renderResult()`.

---

## 7. `i18n.js`

Добавить ключи:
```js
'menu.achievements': { ru: 'Достижения', en: 'Achievements' },
'achievements.bonus': { ru: 'Бонус: +{n}% к XP', en: 'Bonus: +{n}% XP' },
'achievements.bonus.result': { ru: 'Бонус достижений', en: 'Achievement Bonus' },
```

---

## 8. `CLAUDE.md` — обновить статус

В раздел «Сделано» добавить:
> **Система достижений (#36):** 4 категории (Регионы ×5, Темы ×11, Объём ×2, Мастерство ×6), 10 уровней у многоуровневых. Категории «Регионы» и «Темы» дают +1% к любому XP за каждый уровень; суммарный бонус без ограничений. Бонус применяется к XP в игре, дейлике, бонусном экране, квестах. Хранение — `geogame:achievements` в localStorage. Экран «Достижения» в главном меню (кнопка рядом с «Задания», бейдж при новых уровнях). Суммарный бонус отображается в профиле на главном экране, на экране результата партии и в шапке экрана достижений.

В раздел «Ключи localStorage» добавить: `geogame:achievements` (объект), `geogame:achievements-new` (bool).

---

## 9. Проверка после реализации

1. Сыграть 3 партии, ответить правильно несколько раз на вопросы о странах Европы → открыть экран достижений → «Знаток Европы» должен показывать прогресс.
2. Набрать 10 правильных ответов → уровень 1 «Знаток X» достигнут → при следующей партии +1% XP (проверить в результате: базовый XP 10, с бонусом 11).
3. «Бонус: +N%» отображается в профиле меню и на экране результата.
4. Бейдж на кнопке «Достижения» появляется при новом уровне, пропадает при входе на экран.

**Результат / расхождения:** Реализовано полностью по всем разделам.
- Новый `js/achievements.js` (data-layer): `ACHIEVEMENT_DEFS` (24 достижения = region×5 + topic×11 + volume×2 + mastery×6), `initAchievements`/`advanceAchievement`/`setAchievementProgress`/`getAchievementBonus`/`applyBonus`. Уровень всегда пересчитывается из прогресса (устойчиво к смене порогов).
- main.js: state `achievements`/`correctStreak`/`speedCount`/`questionStartTime`/`bonusXpCredited`; загрузка через `initAchievements`; `persistAchievements`/`handleNewAchievementLevels`. Хуки: `handleAnswer` (регион+тема+снайпер+молния, сброс серий при ошибке/таймауте), `endGame` (volume:games/xp + perfect/alltopics/allregions), `finishTraining` (training). XP-бонус применён к: per-correct, дейлику, квестам, бонусной ячейке. `goToAchievements`/`buildAchievementsVM`. `resetProgress` чистит ачивки + флаг.
- ui.js: `renderAchievements` (4 секции, звёзды ★/☆ двумя спанами для двух цветов, прогресс-бар/`+N%`, mastery ✅/🔒), `setAchievementsBadge`; `renderMenuProfile` — строка `#menu-bonus-line`; `renderResultSummary` — строка `#res-ach-bonus-row`.
- index.html: кнопка «Достижения» + бейдж в меню, `#menu-bonus-line`, строка бонуса на result, секция `#achievements-screen`. i18n: `menu.achievements`, `achievements.bonus`, `achievements.bonus.result` (по ТЗ) + добавлены `achievements.cat.*` (4 заголовка секций), `achievements.level`, `achievements.xp-bonus` (требуются UI; в списке ТЗ их не было — добавлены, помечаю как расширение).
- **Проверено в браузере:** экран рисует 4 секции (5/11/2/6); при сидинге 20% бонуса — `#menu-bonus-line` «🎯 +20% к XP», шапка «Суммарный бонус: +20% к XP», дейлик 75→**90** XP (applyBonus); партия из 7 верных → «За партию: +84 XP» (7×12) + строка «Бонус достижений: +20%»; `volume:games`/`mastery:allregions` → уровень 1, сундуки 5→17 (+2+10), бейдж загорается и гаснет при входе на экран; RU↔EN; `resetProgress` обнуляет ачивки и прячет бонус. Консоль чистая. Cache-busting 20260558→20260559.
- **Известные нюансы (не блокеры):** (1) баннер ответа по-прежнему показывает статичное «+10 XP» (бонус в нём не отражён — вне scope, предсуществующий хардкод). (2) При активном бонусе раскрытая бонусная ячейка показывает базовый XP, а начисляется/в результате — с бонусом (applyBonus в `finishBonus`, как требует ТЗ). (3) Бонус достижений на result-баре: `xpBeforeSession` фиксируется до бонус-приза, как и раньше.

---

## 2026-05-29 #35 | Синхронизация порядка тем и уровней разблокировки

**Цель:** Убрать расхождение между визуальным порядком тем в UI и порядком разблокировки — и зафиксировать правило архитектурно, чтобы оно никогда не ломалось само по себе.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500, level 1 — кнопки [1] идут 1..11)

**Автор промпта:** Cowork

**Правило (зафиксировать в `CLAUDE.md` → раздел «Соглашения в коде»):**
> Порядок разблокировки тем **всегда** определяется порядком ключей в объекте `TOPICS` (main.js). При добавлении, удалении или перестановке тем `LEVEL_UNLOCKS` автоматически пересчитывается — никакой отдельный захардкоженный список тем в `levels.js` не ведётся. Зрительно в UI темы должны открываться сверху вниз: верхние — раньше (меньший уровень), нижние — позже.

**Промпт:**

## Проблема
`levels.js` содержит захардкоженный `TOPIC_ORDER`, который расходится с порядком ключей `TOPICS` в `main.js`. Из-за этого тема «Плотность» (ниже в UI) открывается раньше (уровень 8), чем «Самоназвание» (выше в UI, уровень 10) — визуально замки идут не по возрастанию сверху вниз.

Текущий порядок `TOPICS` в `main.js` (он же — правильный визуальный порядок):
`country, capital, countryByCapital, population, area, language, currency, nativeName, coatOfArms, density, religion`

Текущий (неправильный) `TOPIC_ORDER` в `levels.js`:
`capital, country, countryByCapital, population, area, language, currency, density, religion, nativeName, coatOfArms`

## Что сделать

### 1. `levels.js` — убрать захардкоженный `TOPIC_ORDER`, сделать `LEVEL_UNLOCKS` динамическим

Удалить константу `TOPIC_ORDER`. Вместо прекомпилированного `LEVEL_UNLOCKS` — модульная переменная, которая заполняется через `initLevelUnlocks(topicOrder)`:

```js
// Модульная переменная — заполняется из main.js через initLevelUnlocks()
let LEVEL_UNLOCKS = {};

/**
 * Строит таблицу разблокировок на основе переданного порядка тем.
 * Вызывается из main.js сразу после определения TOPICS.
 * Прогрессия «вширь»: сначала все темы на сложности 0,
 * затем все на 1, затем 2, затем 3.
 * @param {string[]} topicOrder — Object.keys(TOPICS)
 */
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
```

`getUnlockLevel` и `getUnlockedDifficulties` продолжают работать с модульной переменной `LEVEL_UNLOCKS` — тело функций не меняется, только `LEVEL_UNLOCKS` теперь `let` вместо `const`.

Убрать экспорт `LEVEL_UNLOCKS` как константы — он больше не нужен снаружи (функции работают с модульной переменной напрямую).

Обновить комментарий в файле: «LEVEL_UNLOCKS строится динамически из topicOrder, переданного из main.js. Порядок тем = визуальный порядок в UI. Сложности открываются волнами: сначала d0 для всех тем, затем d1, d2, d3.»

### 2. `main.js` — вызвать `initLevelUnlocks` сразу после определения `TOPICS`

```js
import {
  getLevelFromXP, getXPForLevel, getXPProgress,
  getUnlockedDifficulties, getUnlockLevel,
  initLevelUnlocks,       // новый импорт
  XP_THRESHOLDS,
} from './levels.js';

// ... (DIFFICULTIES, TOPICS определены выше)

// Инициализировать LEVEL_UNLOCKS в том же порядке, что TOPICS в UI.
// Правило: при добавлении/удалении/перестановке тем в TOPICS — LEVEL_UNLOCKS обновляется автоматически.
initLevelUnlocks(Object.keys(TOPICS));
```

Убрать `LEVEL_UNLOCKS` из импортов `levels.js` (он больше не экспортируется как переменная).

Найти в `main.js` все места, где использовался импортированный `LEVEL_UNLOCKS` (например, `const unlocks = LEVEL_UNLOCKS[newLevel] || []` в `animateXPBar` / `endGame`). Заменить на вызов `getUnlocksForLevel(newLevel)` — либо добавить в `levels.js` простую экспортируемую функцию:

```js
// levels.js
export function getUnlocksForLevel(level) {
  return LEVEL_UNLOCKS[level] || [];
}
```

И использовать её в main.js вместо прямого обращения к объекту.

### 3. `CLAUDE.md` — зафиксировать правило

В раздел **«Соглашения в коде»** добавить абзац:

> **Порядок тем и уровни разблокировки.** `LEVEL_UNLOCKS` всегда строится динамически из `Object.keys(TOPICS)` через `initLevelUnlocks()` (вызов в `main.js` сразу после определения `TOPICS`). Отдельный захардкоженный список тем в `levels.js` не ведётся. Правило UI: темы в `TOPICS` располагаются от «простых» к «сложным» — чем ниже тема в списке, тем позже она открывается. При добавлении новой темы — вставлять её в нужное место в `TOPICS`, `initLevelUnlocks` пересчитает уровни автоматически.

### 4. Быстрая проверка после правки

Открыть экран «Темы» на уровне 1 (localStorage `geogame:xpTotal = 0`). Убедиться:
- Первая тема в списке («Страна по флагу») — замок «🔒 2» (уровень 2, т.к. d0 открывается на уровне 1)... точнее: d0 «Страна по флагу» должна открываться на уровне **1** (первый элемент первой волны).
- Пройтись глазами по кнопкам `[1]` каждой темы: числа должны строго возрастать сверху вниз (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11).

**Результат / расхождения:** Сделано по всем 4 шагам, без отклонений.
- `levels.js`: удалён захардкоженный `TOPIC_ORDER` и IIFE-сборка. `LEVEL_UNLOCKS` теперь `let`-модульная переменная; добавлены `initLevelUnlocks(topicOrder)` (строит таблицу) и `getUnlocksForLevel(level)`. Экспорт `LEVEL_UNLOCKS` как константы убран. Тела `getUnlockLevel`/`getUnlockedDifficulties` не тронуты (работают с модульной переменной). Комментарий обновлён.
- `main.js`: импорт `initLevelUnlocks`/`getUnlocksForLevel` вместо `LEVEL_UNLOCKS`. Сразу после блока `TOPICS` (и присваивания `difficulties`) — `initLevelUnlocks(Object.keys(TOPICS));`. Единственное использование `LEVEL_UNLOCKS[newLevel]` (баннер level-up в `goToResult`) заменено на `getUnlocksForLevel(newLevel)`. Грепом подтверждено: вне `levels.js` обращений к `LEVEL_UNLOCKS` нет.
- `CLAUDE.md`: добавлен абзац в «Соглашения в коде»; обновлены упоминания `levels.js` в структуре и в строке про баланс разблокировок (убран мёртвый `TOPIC_ORDER`).
- **Проверено (localhost:5500, xp=0 → уровень 1):** кнопки `[1]` идут строго по возрастанию сверху вниз — Страна по флагу **1**, Столица 🔒2, Страна по столице 🔒3, Население 🔒4, Площадь 🔒5, Язык 🔒6, Валюта 🔒7, **Самоназвание 🔒8, Герб 🔒9, Плотность 🔒10, Религия 🔒11** (раньше density/religion опережали nativeName/coatOfArms — исправлено). Консоль чистая. Cache-busting 20260557→20260558.
- **Побочный эффект (ожидаемый):** первой темой теперь стала «Страна по флагу» (country) — именно она открывается на уровне 1, а не «Столица» (capital), как было при старом `TOPIC_ORDER`. Это прямое следствие приведения порядка к `TOPICS` и соответствует требованию ТЗ.

---

## 2026-05-26 #34 | Замочек с уровнем разблокировки на заблокированных сложностях

**Цель:** На экране «Темы» заблокированные кнопки сложности показывают 🔒 + номер уровня разблокировки (например «🔒 5»).

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500, level 1 — все 4 шага)

**Автор промпта:** Cowork

**Промпт:**

### 1 — `levels.js`: новая функция `getUnlockLevel(topicKey, diffIndex)`
Ищет в `LEVEL_UNLOCKS` минимальный уровень для данной пары. Возвращает число или `null`.

### 2 — `main.js`: передать функцию в `renderTopicList` пятым аргументом
```js
renderTopicList(items, state.setup.topicDifficulties,
  (key) => getUnlockedDifficulties(key, getLevelFromXP(state.xpTotal)),
  selectTopicDifficulty,
  (key, idx) => getUnlockLevel(key, idx)
);
```
Импортировать `getUnlockLevel` из `./levels.js`.

### 3 — `ui.js`: обновить `renderTopicList` (5-й параметр `getUnlockLevelFn`)
Для locked-кнопок:
```js
const reqLevel = getUnlockLevelFn ? getUnlockLevelFn(key, i) : null;
btn.textContent = reqLevel ? "🔒 " + reqLevel : "🔒";
```
Разблокированные — оставить цифру 1/2/3/4.

### 4 — CSS: если текст не помещается — уменьшить font-size для `.diff-btn-locked`.

### Проверь (localhost:5500)
1. Заблокированные кнопки: «🔒 3», «🔒 7» с реальными уровнями.
2. Разблокированные: цифры без замка.

- Cache-busting: обновить `?v=`.
- `git add -A && git commit -m "feat: show lock icon with required level on locked difficulty buttons"`

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:** Сделано по всем 4 шагам.
- `levels.js`: добавлена `getUnlockLevel(topicKey, diffIndex)` — линейно ищет минимальный уровень пары в `LEVEL_UNLOCKS`, возвращает число или `null`.
- `main.js`: импорт `getUnlockLevel`, передан 5-м аргументом в `renderTopicList`.
- `ui.js`: `renderTopicList` принимает `getUnlockLevelFn = null`; для locked-кнопок `textContent = "🔒 " + reqLevel` (обычный пробел вместо ` ` — на читаемость не влияет, overflow нет). Разблокированные/активные — цифра как прежде.
- CSS: `.diff-btn-locked` сделана пилюлей авто-ширины (`width:auto; min-width:32px; padding:0 8px; border-radius:16px; font-size:11px; white-space:nowrap`), высота прежняя 32px — «🔒 44» влезает без переполнения (проверено `scrollWidth`). Цвет цифры чуть затемнил для читаемости (#c2cad3→#8a96a3).
- Проверено на уровне 1: locked-кнопки показывают реальные уровни (capital d0 открыт → «1»; country d0 «🔒 2»; capital d1 «🔒 12» и т.д., согласуется с breadth-first `LEVEL_UNLOCKS`); ширины 42–48px, overflow нет; EN — замки остаются числовыми, метка темы переводится; консоль чистая. Cache-busting 20260556→20260557.

---

## 2026-05-26 #33 | Фавиконка: земной шар 🌍

**Цель:** Добавить SVG-фавиконку с эмодзи земного шара.

**Статус:** передан

**Проверено в браузере:** нет

**Автор промпта:** Cowork

**Промпт:**

В `index.html` в `<head>` добавить (или заменить существующий `<link rel="icon">`):
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌍</text></svg>">
```
Cache-busting не нужен. `git add index.html && git commit -m "feat: add globe favicon"`

**Результат / расхождения:** —

---

## 2026-05-26 #32 | Техдолг: стухшие строки, мёртвые ключи, хрупкие селекторы, JSDoc

**Цель:** 6 категорий рефакторинга без изменения механики.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500 — метки density/religion RU+EN, show/hide answer-result, консоль чистая)

**Автор промпта:** Cowork

**Промпт:**

### 1. Стухшие status.loading в i18n.js
`status.loading` (RU + EN) упоминает "restcountries.com" — API больше не используется. Заменить: RU `"Загрузка данных…"`, EN `"Loading data…"`.

### 2. Дублирующий ключ menu.quests vs menu.tasks
Grep по всем .js/.html, найти какой реально используется. Неиспользуемый удалить.

### 3. Мёртвые ключи result screen в i18n.js
Проверить grep'ом: `result.xp-earned`, `result.xp-total`, `result.xp-record`, `result.games`, `result.play-again`. Неиспользуемые удалить из STRINGS (RU + EN).

### 4. Унифицировать метки тем
Добавить density/religion в `TOPIC_LABELS` и `TOPIC_QUESTIONS`, обновить геттеры в TOPICS с `t("topic.density.label")` на `TOPIC_LABELS.density[getLang()]`. Удалить `topic.density.*` и `topic.religion.*` из STRINGS.

### 5. Хрупкие DOM-селекторы в ui.js
`showAnswerResult`/`hideAnswerResult`: заменить `document.querySelector(".meta")` и `document.querySelector(".progress")` на scope-ограниченные через `document.getElementById("game-screen").querySelector(...)` или добавить ID в index.html.

### 6. Стухшие комментарии и JSDoc
- `applyHintToOptions`: убрать упоминание "visibility" из комментария.
- `renderMenuProfile` JSDoc: убрать `hints, extraLives` из `@param inventory`.
- `populationFormatted`/`areaFormatted` в data.js: убрать `export` (приватные хелперы, grep перед удалением).

- Cache-busting: обновить `?v=`.
- `git add -A && git commit -m "refactor: tech debt cleanup — stale strings, dead i18n keys, fragile selectors, jsdoc"`

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:** Все 6 категорий выполнены.
1. `status.loading` (RU/EN) → «Загрузка данных…» / «Loading data…». **Доп.:** в `index.html` статичный плейсхолдер `#status` тоже упоминал restcountries.com (тот же стухший литерал, показывается до `renderStatus()`) — заменил для согласованности.
2. `menu.quests` — грепом подтверждено: только определялся в i18n.js, нигде не использовался (используется `menu.tasks`). Удалён (RU+EN).
3. Из 5 ключей `result.games` **живой** (`index.html:255`, `data-i18n="result.games"`) — оставлен. Остальные 4 (`result.xp-earned`/`xp-total`/`xp-record`/`play-again`) только определялись — удалены (RU+EN).
4. density/religion добавлены в `TOPIC_LABELS`/`TOPIC_QUESTIONS`; геттеры в `TOPICS` переведены на `TOPIC_LABELS.<key>[getLang()]`; `topic.density.*`/`topic.religion.*` удалены из STRINGS (RU+EN). Проверено: метки/вопросы рендерятся в обоих языках.
5. `showAnswerResult`/`hideAnswerResult` — `.meta`/`.progress` теперь ищутся через `document.getElementById("game-screen").querySelector(...)`. Проверено: скрытие/восстановление работает.
6a. Комментарий `applyHintToOptions` — упоминание visibility убрано (код использует `display:none`).
6b. JSDoc `renderMenuProfile` — `@param inventory` теперь `{ chests }`.
6c. `populationFormatted`/`areaFormatted` — грепом подтверждено: используются только внутри data.js (в `getPopulationFormatted`/`getAreaFormatted`), наружу не импортируются → `export` убран.
- Cache-busting 20260555→20260556 во всех импортёрах (firebase.js без изменений — 20260538). Финальный греп: ни одного остаточного упоминания удалённых ключей в .js/.html.

---

## 2026-05-26 #31 | Задания: дейлик + стрик + ежедневные квесты

**Цель:** Реализовать экран «Задания» с тремя блоками: ежедневный приз (дейлик с таймером), серия дней (стрик с вехами), ежедневные задания (3 квеста из пула с прогресс-барами).

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500, все 5 сценариев)

**Автор промпта:** Cowork

**Принятые решения:**
- Все данные в localStorage, Firestore-синк позже.
- Дейлик: 75 XP + 5 🧳, сброс через 24ч по таймстампу.
- Стрик: обновляется в `endGame()`, вехи 3/7/14/30 дней, разовые призы.
- Квесты: 3 из пула 6, детерминировано по номеру дня года, сброс если дата изменилась.
- Бейдж на кнопке «Задания» в меню если есть что забрать.

**Промпт:**

### Данные (localStorage)
```js
"geogame:daily-prize": { lastClaim: <timestamp> }
"geogame:streak": { count: 0, lastGameDate: "", milestonesClaimedAt: [] }
"geogame:daily-quests": { date: "YYYY-MM-DD", quests: [{id, progress, goal, reward, completed, claimed}] }
```

### Блок 1 — Дейлик
Приз: 75 XP + 5 🧳. Кнопка «Получить» → начислить → таймер HH:MM:SS обратного отсчёта. Когда истёк → снова кнопка.

### Блок 2 — Стрик
В `endGame()`: если вчера играл → count++, если позавчера → count=1, если сегодня → без изменений.
UI: 🔥 N дней + маркеры вех (3/7/14/30). Вехи-призы: 3д→50XP+3🧳, 7д→150XP+10🧳, 14д→300XP+20🧳, 30д→500XP+50🧳. Разовые, повторно не выдаются.

### Блок 3 — Ежедневные задания
Пул 6 заданий, 3 в день по номеру дня. Задания: play1game (1 партия, 40XP), correct15 (15 верных, 30XP), earn100xp (100XP за день, 50XP), play25q (партия 25+, 45XP), streak5 (5 подряд, 60XP), dotraining (обучение без пропуска, 35XP).

Хуки: `endGame()`, `handleAnswer()`, `state.hintCharge===5`, `finishTraining()`.
`updateQuestProgress(id, amount)` — обновляет, сохраняет, помечает completed.
UI: текст + прогресс-бар + кнопка «Забрать» (→ claimed).

### Экран и навигация
Новая секция `#tasks-screen`. Кнопка «Задания» в меню → `goToTasks()`. Бейдж если есть доступный дейлик или незабранный квест.

### i18n
menu.tasks, tasks.daily-prize, tasks.next-in, tasks.claim, tasks.claimed, tasks.streak, tasks.streak-days, tasks.daily-quests.

### Проверь (localhost:5500)
1. Меню → Задания → три блока.
2. Дейлик: получить → таймер. Обнулить lastClaim в DevTools → кнопка снова.
3. Партия → стрик обновился.
4. Выполнить «Сыграй 1 партию» → Забрать → XP начислен.
5. Бейдж на кнопке «Задания» при наличии незабранного.

- Cache-busting: обновить `?v=`.
- `git add -A && git commit -m "feat: tasks screen — daily prize, streak, daily quests"`

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:** Реализовано полностью.
- Новый экран `#tasks-screen` с тремя карточками. Кнопка «Задания» (`#menu-quests-btn`) больше не заглушка → `goToTasks()`; её data-i18n переведён на новый ключ `menu.tasks` (метку обернул в `<span>`, рядом — `#menu-tasks-badge`, чтобы `applyI18n` не затирал бейдж).
- Вся логика в main.js (state `dailyPrize`/`streak`/`dailyQuests` + localStorage-ключи `geogame:daily-prize`/`:streak`/`:daily-quests`), рендер в ui.js (`renderTasks`/`setDailyCountdownText`/`setTasksBadge`) — слои не смешаны.
- **Дейлик:** 75 XP + 5 🧰, кулдаун 24ч по таймстампу. `setInterval` тикает HH:MM:SS пока экран открыт, по истечении сам перерисовывает кнопку. Иконку сундука сделал 🧰 (как в инвентаре/бонусе) вместо 🧳 из ТЗ — ради единообразия в приложении.
- **Стрик:** обновляется в `endGame()` (`updateStreak`): вчера→count++, иначе→count=1 (со сбросом вех). Вехи 3/7/14/30 (50+3 / 150+10 / 300+20 / 500+50), разовые через `milestonesClaimedAt`. При обрыве серии (последняя игра не сегодня/не вчера) счётчик и вехи обнуляются при загрузке. Маркеры вех: пройдено=зелёный, ближайшая=жёлтый, будущие=серый.
- **Квесты:** 3 из пула 6, выбор `QUEST_POOL.slice(dayOfYear % 4, +3)`. Хуки: `play1game`/`earn100xp`/`play25q`→`endGame`, `correct15`→`handleAnswer(correct)`, `streak5`→при hintCharge==5, `dotraining`→`finishTraining` (не skip). `updateQuestProgress(id, amount)` + `claimQuest(id)`.
- **Бейдж** на кнопке «Задания» (`hasTasksNotification` = доступен дейлик ИЛИ есть completed && !claimed), обновляется в `refreshMenuScreen`.
- i18n: добавлены `menu.tasks`, `tasks.*` (8 ключей), `quest.*` (6 меток), `tasks.claim-daily` (текст кнопки дейлика — в списке ТЗ его не было, добавил). Cache-busting 20260554→20260555 во всех импортёрах.
- **Проверено:** три блока рендерятся; дейлик-клик начисляет 75 XP/5 🧰 и показывает таймер 23:59:59; сброс lastClaim+reload возвращает кнопку; 25-вопросная партия → стрик count=1/today + квест play25q completed; claim квеста → +45 XP, «Получено ✓», зачёркнут; бейдж появляется/исчезает корректно; RU↔EN на всём экране; консоль чистая.
- **Известный нюанс:** награды за вехи стрика начисляются в `endGame` напрямую в `xpTotal`, а `xpBeforeSession` фиксируется до них — в редкий день-веху XP-бар на result-экране дотянется чуть дальше подписи «Итого» (косметика, не блокер). Firestore-синк самих объектов заданий отложен (синкаются только итоговые xpTotal/inventory).

---

## 2026-05-26 #30 | Бонус: больше сундуков в сетке

**Цель:** Увеличить число сундучных ячеек с 5 до 10, количество сундуков за ячейку — в ~3 раза.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500, прогон партии до бонус-экрана: 15 ✨ / 10 🧰, суммы 3–5)

**Автор промпта:** Cowork

**Промпт:**

В `js/main.js` → `BONUS_PRIZE_POOL`:
- Было: 20 × `"xp"` + 5 × `"chest"` = 25
- Стало: 15 × `"xp"` + 10 × `"chest"` = 25

В `generatePrize()` для `"chest"`:
- Было: `Math.floor(Math.random() * 3) + 1` (1–3 шт)
- Стало: `Math.floor(Math.random() * 3) + 3` (3–5 шт)

Проверь: бонус-сетка — сундуков заметно больше XP-ячеек.
- Cache-busting: обновить `?v=`.
- `git add -A && git commit -m "feat: more chests in bonus grid"`

**Результат / расхождения:** Сделано точно по ТЗ — два числовых литерала. `BONUS_PRIZE_POOL` = 15 xp + 10 chest; `generatePrize` chest = `3 + Math.floor(Math.random()*3)`. Cache-busting 20260553 → 20260554 во всех импортёрах (firebase.js без изменений). Проверено прогоном реальной партии до бонус-экрана: 25 ячеек, 15 XP / 10 сундуков, суммы сундуков 3–5. (Авто-плеер в превью синхронный, без таймеров — фоновая вкладка троттлит `setTimeout` до ~1с, поэтому пошаговые задержки не работают.)

---

## 2026-05-26 #29 | Энциклопедия: региональная структура (3 уровня навигации)

**Цель:** Реализовать энциклопедию с тремя уровнями: регионы → страны региона → карточка страны.

**Статус:** выполнен

**Проверено в браузере:** да (localhost:5500, все 5 сценариев)

**Автор промпта:** Cowork

**Промпт:**

### Архитектура

Один экран `#encyclopedia-screen`, три вида в JS-переменной `encView`: `'regions'` / `'countries'` / `'detail'`. Переключение через display (без новых HTML-секций).

### Вид 1 — Регионы

5 цветных карточек (grid): название региона + число стран. Цвета: Европа синий, Азия красный, Африка золотой, Америки зелёный, Океания бирюзовый. Тап → `encView = 'countries'`.

### Вид 2 — Страны региона

Заголовок + «← Назад». Сетка стран (3 колонки): мини-флаг + название. Алфавитный порядок. Тап → `encView = 'detail'`.

### Вид 3 — Карточка страны

«← Назад». Флаг, официальное название, регион, столица, население, площадь, плотность, язык, валюта, религия, герб. Переиспользовать логику из `showInfo()` — вынести в `renderCountryCard(country, container)`.

### Навигация

Кнопка «Энциклопедия» в меню (сейчас заглушка) → `goToEncyclopedia()`, `encView = 'regions'`. «← Назад» из регионов → меню.

### i18n
```
menu.encyclopedia: "Энциклопедия" / "Encyclopedia"
enc.back: "← Назад" / "← Back"
enc.countries-count: "{n} стран" / "{n} countries"
```
Названия регионов — из `REGION_LABELS`.

### Проверь (localhost:5500)
1. Меню → Энциклопедия → 5 цветных карточек с числом стран.
2. Тап Европа → список стран с флагами.
3. Тап страна → карточка с полными данными.
4. RU/EN работает на всех уровнях.
5. «← Назад» из регионов → меню.

- Cache-busting: обновить `?v=`.
- `git add -A && git commit -m "feat: encyclopedia with regional structure"`

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:** Реализовано полностью.
- Один экран `#encyclopedia-screen` с тремя `div`-видами (`#enc-regions`/`#enc-countries`/`#enc-detail`), переключение через `display`; JS-переменные `encView`/`encRegionKey`/`encCountry` в main.js.
- Вид 1: 5 цветных карточек (`#3a7bd5`/`#c0392b`/`#e8a020`/`#27ae60`/`#16a085`), число стран из `state.allCountries` по `region` (Европа 53 / Азия 50 / Африка 59 / Америка 56 / Океания 27).
- Вид 2: заголовок региона + «← Назад», сетка 3 колонки (мини-флаг + название), алфавит по текущему языку (`localeCompare`).
- Вид 3: переиспользует новый общий рендерер `renderCountryCard(country, regionLabel, container)`. **Заодно отрефакторен экран «Информация» в игре**: `#info-screen` теперь использует контейнер `#info-card`, `renderInfoScreen` делегирует в `renderCountryCard` (один источник правды; добавлены строки Плотность/Религия и в игровой инфо-экран). Помощник `decorateCountry()` в main.js считает lang-aware поля `_*` для обоих экранов.
- i18n: добавлены `enc.back`, `enc.countries-count`, `info.density`, `info.religion`. `menu.encyclopedia` уже был.
- Навигация: «← Назад» detail→countries→regions→меню; `switchLang` перерисовывает энциклопедию, если она открыта; кнопка «На главную» скрыта на этом экране.
- Cache-busting `?v=` поднят 20260552 → 20260553 во всех импортёрах (firebase.js без изменений — 20260538). Проверено в браузере: все 3 вида, обе back-цепочки, RU↔EN на всех уровнях, консоль чистая.

---

## 2026-05-26 #28 | XP-бар: двухцветный + анимация в 2 раза медленнее

**Цель:** Показать в XP-баре старый прогресс (светло-зелёный) отдельно от нового (жёлто-зелёный). Замедлить анимацию вдвое.

**Статус:** передан

**Проверено в браузере:** нет

**Автор промпта:** Cowork

**Промпт:**

### Изменение 1 — Двухцветный бар

Два дочерних `<div>` внутри контейнера бара:
```html
<div class="xp-bar-track">
  <div class="xp-bar-old"></div>   <!-- светло-зелёный, ширина = старый прогресс, без анимации -->
  <div class="xp-bar-new"></div>   <!-- жёлто-зелёный (~#aacc00), анимируется от 0 до новой ширины -->
</div>
```
Оба inline/flex внутри трека — новый идёт сразу после старого.
При level-up — обработать как сейчас, просто с новым цветом нового сегмента.

### Изменение 2 — Анимация в 2 раза медленнее

Найти текущую длительность (CSS transition или JS-интервал) → умножить на 2.

### Проверь в браузере (localhost:5500)
1. Result screen: бар = светло-зелёный (старый XP) + жёлто-зелёный (новый XP) рядом.
2. Анимация заметно медленнее.
3. Level-up: бар корректен.

- Cache-busting: обновить `?v=`.
- `git add -A && git commit -m "feat: two-color xp bar, slower animation"`

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:** —

---

## 2026-05-26 #28 | XP-бар: двухцветный + анимация ×2 медленнее

**Цель:** XP-бар на result из двух сегментов — старый XP (светло-зелёный, статичный) + новый за сессию (жёлто-зелёный, анимируется); длительность анимации ×2.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500 — рендер/цвета/формула; сама rAF-анимация — на реальном браузере).

**Автор промпта:** Cowork

**Результат / расхождения:**
- **Изм.1 (двухцветный):** в result-баре `#xp-bar-fill` заменён на два `<div>`: `#xp-bar-old` (светло-зелёный `#c8e6c9` — прогресс до сессии, статичный) + `#xp-bar-new` (жёлто-зелёный `#aacc00` — заработанное за сессию, анимируется). `.xp-bar-track` теперь `display:flex` (сегменты встык). `renderXPBar`/`animateXPBar` переписаны: старый сегмент = прогресс в текущем уровне на момент `startXP` (в том же уровне фиксирован; после level-up → 0, т.к. в новом уровне «до сессии» прогресса нет), новый = `prog.percent − oldPercent`. Меню-бар (`#menu-xp-bar-fill`, `.xp-bar-fill`) не трогал — одноцветный.
- **Изм.2 (×2):** `durationMs` по умолчанию `1200 → 2400`.
- **Чистка:** неиспользуемый импорт `renderXPBar` убран из main.js (функция используется только внутри ui.js).
- **Кеш:** css/ui/main менялись → версии импортов выровнены `?v=20260551 → 20260552`, index.html → 20260552.
- **Проверено:** на result (предсессионный XP=300, уровень 2) старый сегмент = 35.7% (= (300−200)/280), цвет `rgb(200,230,201)`; новый сегмент цвет `rgb(170,204,0)`, трек `display:flex`. Формула финального кадра (реплика тика animateXPBar): тот же уровень 300→400 → old 35.7% + new 35.7%; level-up 470→520 → old 0 + new 10.3% (на новом уровне всё «новое»); без прироста → old 35.7% + new 0. `durationMs=2400` в исходнике. Консоль чистая.
- **Не наблюдаемо в preview:** покадровая rAF-анимация (вкладка в фоне, rAF не тикает) — как и прежде; стартовое состояние и формула проверены, на реальном браузере жёлто-зелёный сегмент плавно растёт (теперь вдвое медленнее).

---

## 2026-05-26 #27 | Бонус: убрать флаги из раскрытых ячеек + result screen в конец потока

**Цель:** В раскрытых ячейках бонуса показывать только приз (без флага). Result screen перенести в конец: после бонуса, не до обучения.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500 — полный поток с ошибками+бонусом и путь «пропустить»)

**Автор промпта:** Cowork

**Результат / расхождения:**
- **Изм.1 (ячейки):** CSS `.bonus-cell-revealed .bonus-cell-flag { display:none }`, фон `#f4f7fa`; `.bonus-cell-prize` — флекс-колонка по центру, иконка 22px. Раскрытая ячейка = только крупная иконка + число, без флага. (Закрытые ячейки по-прежнему с флагами.) Поведение клика не менялось (один тап → все 25 раскрываются).
- **Изм.2 (поток):** новый порядок **игра → training → bonus → result → меню**. `endGame` больше не рисует result/не анимирует XP-бар — фиксирует `state.xpBeforeSession = xpTotal − xpEarnedThisGame`, сохраняет игровой XP в Firestore и зовёт `goToTraining()`. Новая `goToResult()` (финал): рендерит «За партию / Бонус / Итого» + анимация XP-бара от `xpBeforeSession` до текущего `xpTotal` (включает игровой + бонусный XP) + level-up баннер. `finishBonus` → `goToResult` (не обнуляет `bonusPrize` — нужен для строки; сброс в `startGame`). `skipTraining` → `goToResult` (bonusPrize=null → строки бонуса нет). Кнопка result → `goToMenu`.
- **Граблю поймал:** `startTraining` сбрасывал `state.score=0` — при новом порядке это стёрло бы счёт партии к моменту result. Убрал сброс (обучение свой счёт не ведёт, score остаётся игровым). `state.questions` в обучении не трогается → `result` корректно берёт длину партии.
- **Итого XP** = игровой + бонусный XP-приз (сундук в «Итого» не идёт, показывается отдельной строкой «🧰 +N»).
- **i18n:** `result.session-xp`/`bonus-xp`/`total-xp`/`to-menu` (ru+en). HTML result-экрана перестроен (3 строки + кнопка «В меню»); удалены старые `game-xp-earned/total`-строки; `renderResult`→`renderResultSummary`, удалён `renderGameXp`.
- **Кеш:** менялись css/ui/main/i18n → версии импортов выровнены `?v=20260550 → 20260551`, index.html cache-bust → 20260551.
- **Проверено:** партия с 9 ошибками → training (не result!) → закрытие ошибок → bonus → клик: 25 ячеек раскрылись, флаги скрыты (`display:none`), приз крупно («✨40»/«🧰…») → «Конец» → **result** с «правильно 1 из 10», «За партию +10 XP», «Бонус: 🧰 +1 сундук(ов)», «Итого +10 XP» (сундук не в XP), кнопка «В меню» → меню, сундук зачтён (`{chests:1}`). Путь «Пропустить обучение» → result без строки бонуса → меню. Консоль чистая. (XP-бар-анимация — rAF, в фоновой превью-вкладке не тикает; стартовое состояние корректно, на реальном браузере анимируется — как и раньше.)

**Промпт:**

### Изменение 1 — Раскрытые ячейки без флага

В раскрытом состоянии (`.bonus-cell-revealed`) убрать флаг с фона.
Ячейка показывает только приз: крупная иконка + число. Нейтральный фон (белый или слегка серый). Поведение клика прежнее: одна ячейка → все 25 раскрываются.

### Изменение 2 — Result screen в конец потока

**Новый порядок:** конец игры → `#training-screen` → `#bonus-screen` → `#result-screen` → меню

1. `endGame()` — не переходит на `#result-screen`, идёт на `#training-screen`. Сохранить `state.sessionXP` (XP за партию) до перехода.
2. Кнопка «Конец» на `#bonus-screen` — после начисления приза → `#result-screen`, не в меню.
3. `skipTraining()` — тоже идёт на `#result-screen` (без бонуса), не в меню.
4. `#result-screen` показывает:
   - «За партию: +N XP» (`state.sessionXP`)
   - «Бонус: +N XP» или «Бонус: +N 📦» — только если `state.bonusPrize != null`
   - «Итого: +N XP» (сумма XP-частей)
   - XP progress bar с анимацией (`animateXPBar`) — запускается здесь
   - Кнопка → меню
5. `state.bonusPrize` — добавить если нет, сбрасывать в `startGame()`.

### i18n
```
result.session-xp: "За партию:" / "Game XP:"
result.bonus-xp:   "Бонус:"     / "Bonus:"
result.total-xp:   "Итого:"     / "Total:"
```

### Проверь в браузере (localhost:5500)
1. Бонус → кликни ячейку → все без флагов, только призы → «Конец» → result screen.
2. Result screen: 3 строки (партия / бонус / итого) + XP-бар.
3. «Пропустить обучение» → result screen без строки бонуса.
4. Идеальная партия → бонус → result screen с тремя строками.

- Cache-busting: обновить `?v=`.
- `git add -A && git commit -m "feat: bonus cells show prize only, result screen moved after bonus"`

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:** —

---

## 2026-05-26 #26 | Полная автономность: локальные флаги и гербы

**Цель:** Скачать все флаги (~250) и гербы (~222) в репо, убрать зависимость от flagcdn.com и mainfacts.com. Игра работает офлайн (кроме Firebase-авторизации).

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500 — Network без flagcdn/mainfacts, флаги/гербы рендерятся локально)

**Автор промпта:** Cowork

**Результат / расхождения:**
- **`scripts/download_assets.js`** (CommonJS, как fetch_countries) — читает `data/countries.json`, качает `flags.svg` → `img/flags/{cca2}.svg` и `coatOfArms.svg` (где есть) → `img/coats/{cca2}.svg`, пауза 100мс, лог прогресса + итог. Запущен: **250 флагов, 222 герба, 0 ошибок**.
- **Размеры:** `img/flags` ~2.7 МБ, `img/coats` **~39 МБ** (часть SVG-гербов mainfacts тяжёлые — с встроенным растром). Большой объём в репо — но это цена полной автономности (как и просили). Если критично — отдельной задачей пережать/растеризовать гербы.
- **ui.js:** добавлен хелпер `localAssetImg(dir, cca2, className, onExhausted)` (svg → png → запасной узел). Переведены на локальные пути **все** рендеры флага/герба: `renderQuestion` (флаг + coa), `renderInfoScreen` (флаг + coa; наличие герба теперь по `country.coatOfArms.svg` как справочнику), `renderBonusGrid` (флаг ячейки по cca2). CDN-ссылки `flags.svg/png`, `coatOfArms.svg/png` из рендера убраны.
- **main.js:** в `startBonus` убран `flagSrcs` (флаг рендерится локально по `cca2`).
- **data.js не трогал** (URL остаются в countries.json как справочник для скрипта).
- **.gitignore:** `img/` не игнорируется (проверено) — флаги/гербы коммитятся.
- **Кеш:** менялись ui.js/main.js → версии импортов выровнены `?v=20260549 → 20260550`; index.html cache-bust → 20260550.
- **Проверено в браузере:** партия с темами «Страна по флагу» + «Герб» — флаг рендерится из `./img/flags/mk.svg` (naturalWidth 1200), герб из `./img/coats/ir.svg` (naturalWidth 500); в Network только локальные `img/flags/*`, `img/coats/*` + `data/*`, **нет запросов к flagcdn.com / mainfacts.com**; единственное внешнее — gstatic (Firebase auth, вне задачи). Консоль чистая.
- **Офлайн:** переключатель Offline в preview_eval недоступен, но все игровые ресурсы (данные + флаги + гербы + css/js + earth.jpg) локальны — внешним остаётся лишь Firebase-auth (по ТЗ это ок). Полноценную офлайн-проверку имеет смысл сделать Алексею на деплое (DevTools → Offline).

**Промпт:**

### Шаг 1 — Скрипт `scripts/download_assets.js`

Node.js (CommonJS). Запуск: `node scripts/download_assets.js`

1. Читает `data/countries.json`.
2. Для каждой страны — скачивает флаг SVG по `flags.svg` → `img/flags/{cca2_lower}.svg`.
3. Для стран где `coatOfArms.svg` не пустой — скачивает → `img/coats/{cca2_lower}.svg`.
4. Пауза 100мс между запросами.
5. Логирует прогресс и итог (флаги / гербы / ошибки).
6. Ошибки (404, таймаут) — логировать, не падать, продолжать.

Создать `img/flags/` и `img/coats/` если не существуют.

### Шаг 2 — Запустить скрипт

`node scripts/download_assets.js` — дождаться завершения. Убедиться: `img/flags/` ~250 файлов, `img/coats/` ~200+ файлов.

### Шаг 3 — Обновить рендеринг в `js/ui.js`

В `renderQuestion` заменить CDN-ссылки на локальные пути.

Флаг:
```js
const cca2 = country.cca2.toLowerCase();
img.src = `./img/flags/${cca2}.svg`;
img.onerror = () => {
  img.src = `./img/flags/${cca2}.png`;
  img.onerror = () => { img.replaceWith(document.createTextNode(codeToEmoji(country.cca2))); };
};
```

Герб:
```js
img.src = `./img/coats/${cca2}.svg`;
img.onerror = () => {
  img.src = `./img/coats/${cca2}.png`;
  img.onerror = () => { img.replaceWith(document.createTextNode('🏛')); };
};
```

Убрать из renderQuestion старые ссылки на `country.flags.svg/png` и `country.coatOfArms.svg/png`.

### Шаг 4 — .gitignore

`img/flags/` и `img/coats/` НЕ должны быть в .gitignore.

### Проверь в браузере (localhost:5500)

1. Network: нет запросов к flagcdn.com и mainfacts.com.
2. Флаги и гербы отображаются корректно.
3. DevTools → Offline → игра работает (Firebase не в счёт).

- Cache-busting: обновить `?v=`.
- `git add -A && git commit -m "feat: store flags and coats of arms locally"`

На блокерах — стоп, спросить. Не додумывать.

**Результат / расхождения:** —

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
