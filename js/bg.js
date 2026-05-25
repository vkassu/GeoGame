// js/bg.js
// Пробуем загрузить высококачественное фото Земли из интернета.
// При успехе — обновляем CSS-переменную, псевдоэлемент body::after перерисовывается.
// При ошибке — остаётся локальный fallback из :root { --earth-bg }.

// Лёгкие живые thumb-ширины Wikimedia (только фиксированные bucket-ширины
// отдают 200: 1280/1920 ок, 2048/2560/4096 → HTTP 400). Оригинал 3000×3000 —
// 5.5 МБ на каждый заход, дорого для мобильного трафика и почти не отличим от
// локального 2048px → не используем; берём 1920px (~750 КБ), запасной 1280px (~385 КБ).
const REMOTE_URLS = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/The_Blue_Marble_%28remastered%29.jpg/1920px-The_Blue_Marble_%28remastered%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/The_Blue_Marble_%28remastered%29.jpg/1280px-The_Blue_Marble_%28remastered%29.jpg",
];

export function initEarthBackground() {
  tryLoad(0);
}

function tryLoad(index) {
  if (index >= REMOTE_URLS.length) return; // все варианты исчерпаны, остаётся локальный

  const url = REMOTE_URLS[index];
  const img = new Image();

  img.onload = () => {
    // Картинка загрузилась — обновляем CSS-переменную
    document.documentElement.style.setProperty("--earth-bg", `url('${url}')`);
  };

  img.onerror = () => {
    // Не получилось — пробуем следующий URL
    tryLoad(index + 1);
  };

  img.src = url;
}
