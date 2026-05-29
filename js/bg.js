// Ротация полноэкранных фоновых сцен с плавным crossfade (#44).
//
// Два слоя — псевдоэлементы body::before (переменная --bg-0) и body::after
// (--bg-1). Видимый слой определяется классом body.bg-toggle (см. style.css):
//   нет класса  → виден ::before (--bg-0)
//   есть класс  → виден ::after  (--bg-1)
// Смена фона: пишем новую картинку в СКРЫТЫЙ слой и переключаем класс — слои
// перетекают друг в друга через opacity-transition (1.5s). Так получается
// настоящий crossfade без мигания «через тёмный фон».
//
// Без внешних зависимостей и без сети: картинки локальные, лежат в репозитории.

const BACKGROUNDS = [
  "img/backgrounds/bg_columbus_v2.png",
  "img/backgrounds/bg_silkroad.png",
  "img/backgrounds/bg_antarctica.png",
  "img/backgrounds/bg_amazon.png",
];

const ROTATE_MS = 5 * 60 * 1000; // 5 минут

let index = 0;
let toggled = false; // false: виден ::before(--bg-0); true: виден ::after(--bg-1)

// ⚠️ url() в CSS-переменной резолвится относительно ТАБЛИЦЫ СТИЛЕЙ (css/), а не
// документа. Поэтому строим абсолютный URL от document.baseURI — корректно и
// локально, и на GitHub Pages (поддиректория /GeoGame/).
function bgValue(url) {
  return `url("${new URL(url, document.baseURI).href}")`;
}

// Предзагрузка (картинки крупные ~3 МБ) — чтобы к моменту crossfade она была в кеше.
// img.src резолвится относительно документа — относительный путь тут корректен.
function preload(url) {
  const img = new Image();
  img.src = url;
}

// Показать фон с crossfade: новая картинка идёт в скрытый слой, затем переключаем класс.
function crossfadeTo(url) {
  const body = document.body;
  if (toggled) {
    // сейчас виден ::after → пишем в скрытый ::before и показываем его
    body.style.setProperty("--bg-0", bgValue(url));
    body.classList.remove("bg-toggle");
  } else {
    // сейчас виден ::before → пишем в скрытый ::after и показываем его
    body.style.setProperty("--bg-1", bgValue(url));
    body.classList.add("bg-toggle");
  }
  toggled = !toggled;
}

export function initBackgroundRotation() {
  if (!BACKGROUNDS.length) return;

  // Случайный стартовый фон — сразу на видимом слое (::before / --bg-0), без перехода.
  index = Math.floor(Math.random() * BACKGROUNDS.length);
  document.body.style.setProperty("--bg-0", bgValue(BACKGROUNDS[index]));
  preload(BACKGROUNDS[(index + 1) % BACKGROUNDS.length]); // следующий — заранее

  setInterval(() => {
    index = (index + 1) % BACKGROUNDS.length;
    crossfadeTo(BACKGROUNDS[index]);
    preload(BACKGROUNDS[(index + 1) % BACKGROUNDS.length]); // готовим следующий
  }, ROTATE_MS);
}
