// js/bg.js
// Пробуем загрузить высококачественное фото Земли из интернета.
// При успехе — обновляем CSS-переменную, псевдоэлемент body::after перерисовывается.
// При ошибке — остаётся локальный fallback из :root { --earth-bg }.

const REMOTE_URLS = [
  // Blue Marble (remastered), оригинал 3000×3000 (~5.5 МБ) — настоящая сфера, апгрейд над локальным 2048px
  "https://upload.wikimedia.org/wikipedia/commons/c/cb/The_Blue_Marble_%28remastered%29.jpg",
  // Запасной: тот же снимок, лёгкий thumb 1920px (~750 КБ)
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/The_Blue_Marble_%28remastered%29.jpg/1920px-The_Blue_Marble_%28remastered%29.jpg",
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
