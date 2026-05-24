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

## 2026-05-24 #5 | XP-накопление + отображение

**Цель:** превратить «+10 XP» на экране результата ответа из надписи-обещания в работающий накопитель: +10 XP за правильный, общий счётчик `geogame:xpTotal` в localStorage, отображение на главном экране («Опыт: N») и на экране результата партии («Получено за партию: +N XP. Всего: M XP»). Один общий XP на все режимы. Подсказка XP не снижает.

**Статус:** выполнен

**Проверено в браузере:** да (preview :5500, 1000×800)

**Автор промпта:** Cowork

**Промпт (полный текст, передан в терминал 2026-05-24):**

> Реализуй XP-накопление с сохранением и отображением.
>
> **Продуктовое описание.** Сейчас на экране результата ответа показывается «+10 XP», но это только надпись — нигде не сохраняется. Нужно: за каждый правильный ответ +10 XP, общий XP игрока копится между партиями (один счётчик, общий для всех режимов), отображается на главном экране и на экране результата партии. Подсказка на начисление не влияет — XP полный. MVP: фиксированные 10 XP, без уровней/формул/бонусов.
>
> **1. js/main.js:** константа `XP_PER_CORRECT = 10` рядом с `QUESTION_TIME_SEC`; в `STORAGE` ключ `xpTotal: "geogame:xpTotal"` (строка, не функция — общий XP); в `state` поля `xpTotal: 0`, `xpEarnedThisGame: 0`; в `loadFromStorage` — `state.xpTotal = Number(localStorage.getItem(STORAGE.xpTotal)) || 0`; в `startGame` после `state.score = 0` — `state.xpEarnedThisGame = 0` (xpTotal не трогать); в `handleAnswer` блок начисления: при `isCorrect` — `state.score++`, `state.xpTotal += XP_PER_CORRECT`, `state.xpEarnedThisGame += XP_PER_CORRECT`, `localStorage.setItem(STORAGE.xpTotal, String(state.xpTotal))` (без условий с hintUsed); в `endGame` после `renderGamesPlayed` — `renderGameXp(state.xpEarnedThisGame, state.xpTotal)` и `renderXpTotal(state.xpTotal)`; в `init` после `renderBestScore` — `renderXpTotal(state.xpTotal)`; импорт `renderXpTotal`, `renderGameXp` из ui.js.
>
> **2. js/ui.js:** `renderXpTotal(n)` → `#xp-total`.textContent; `renderGameXp(earned, total)` → `#game-xp-earned` и `#game-xp-total`.
>
> **3. index.html:** на `#start-screen` после `<p class="record">` — `<p class="xp-total">Опыт: <span id="xp-total">0</span></p>`; на `#result-screen` перед `<p class="games-played">` — `<p class="game-xp">Получено за партию: <span id="game-xp-earned">0</span> XP. Всего: <span id="game-xp-total">0</span> XP</p>`.
>
> **4. css/style.css:** `.xp-total` (как `.record`: margin 0 0 16px, 14px, #2c7be5, 600); `.game-xp` (как `.games-played`: margin 0 0 12px, 14px, #2c7be5, 600).
>
> **5. CLAUDE.md:** в «Текущий статус» → «Сделано» добавить пункт про XP; из «Дальше» удалить пункт 1 (XP), сдвинуть нумерацию; упомянуть ключ в «Соглашения → Ключи localStorage».
>
> **Краевые случаи:** первая игра → 0 через `|| 0`; истёк таймер → handleAnswer не зовётся, XP не начисляется (корректно); правильно с подсказкой → XP полный; ошибка с подсказкой → XP нет; «На главную» в партии → xpTotal уже сохранён. **Не трогать:** рекорды, подсказку, таймер, экран результата ответа (не дублировать накопление в renderAnswerResult), state.score/gamesPlayed, никаких уровней/формул.

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

**Промпт (полный текст, передан в терминал 2026-05-24):**

> Реализуй кнопку «Подсказка» в игровом экране GeoGame.
>
> **Продуктовое описание.** Кнопка «Подсказка» появляется в строке управления над вопросом, между [Время] и [Вопрос X из Y]. Тап → 2 случайных неверных варианта из 4 пропадают, остаются правильный + 1 неверный. После использования кнопка остаётся видимой, но становится серой и неактивной до конца партии. На партию даётся одна подсказка. Сбрасывается при старте новой партии. Это MVP — без счётчика, без localStorage, без подсказок по сложности.
>
> **1. index.html** — в `.meta` (game-screen): удалить `<span id="q-score">` целиком; между `#q-timer` и `#q-counter` вставить `<button id="hint-btn" class="hint-btn" type="button">Подсказка</button>`. Порядок: [#q-timer] [#hint-btn] [#q-counter].
>
> **2. css/style.css** — `.hint-btn`: стиль как `.option-btn` (синий градиент `#4fc3f7→#0288d1`, рамка `#b0bec5`, белый жирный текст), но `padding: 6px 18px; font-size: 14px; border-radius: 12px; min-height: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)`. Hover (не disabled) — `filter: brightness(1.15)`, active — `transform: scale(0.97)`. `.hint-btn:disabled` — `filter: grayscale(1); opacity: 0.45; cursor: not-allowed`, снять hover. В `.meta` — `align-items: center`, сохранить `justify-content: space-between`.
>
> **3. js/ui.js** — экспортировать `getHintButton()`, `setHintButtonState(enabled)` (disabled = !enabled), `applyHintToOptions(buttons, correctValue)` (находит 3 неверные кнопки, случайно скрывает 2 через `style.visibility = "hidden"`, сетка 2×2 сохраняется). `renderQuestion` не менять.
>
> **4. js/main.js** — в state добавить `hintUsed: false`; в `startGame()` сброс `state.hintUsed = false`. Импортировать `getHintButton`, `setHintButtonState`, `applyHintToOptions`. В `showQuestion` сохранить массив `buttons` и `correct` (предложено в `state.currentButtons`/`state.currentCorrect`), в конце вызвать `setHintButtonState(!state.hintUsed)`. Функция `handleHintClick()`: если `hintUsed` → return; иначе `hintUsed = true`, `applyHintToOptions(state.currentButtons, state.currentCorrect)`, `setHintButtonState(false)`. В `init()` повесить листенер. В `handleAnswer` тоже `setHintButtonState(false)`.
>
> **Краевые случаи:** подсказка не работает на экране результата (`.meta` скрыта); двойной клик отбивается флагом `hintUsed`; сброс при новой партии. **Не трогать:** `.option-btn`, таймер, экран результата, data.js, localStorage. Счёт убрать из строки управления, но `state.score` оставить (показывается на экране результата партии).
>
> Перед работой — запись в PROMPTS_LOG.md (статус «передан»), после — «выполнен» + результат. После: какие файлы тронул, что неочевидно, на что смотреть при проверке.

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
