// Слой данных: загрузка стран из локального data/countries.json и геттеры полей страны.

import { getLang } from "./i18n.js?v=20260557";

// Данные стран — локальный файл (обновляется вручную через scripts/fetch_countries.js).
// Рантайм больше не ходит в restcountries.com: мгновенная загрузка, без внешних зависимостей.
const COUNTRIES_URL = "data/countries.json";

// Русские названия столиц (API отдаёт столицы только по-английски).
// Грузится из data/capitals_ru.json при старте, ключ — код страны cca2.
const CAPITALS_RU_URL = "data/capitals_ru.json";
const RELIGIONS_URL = "data/religions.json";
let capitalsRu = {};

// cca2 -> эмодзи-флаг (fallback, если flags.svg недоступен)
export function codeToEmoji(cca2) {
  if (!cca2 || cca2.length !== 2) return "🏳️";
  const base = 0x1F1E6;
  const A = "A".charCodeAt(0);
  return String.fromCodePoint(
    base + cca2.charCodeAt(0) - A,
    base + cca2.charCodeAt(1) - A
  );
}

export function ruName(country) {
  const rus = country.translations
    && country.translations.rus
    && country.translations.rus.common;
  if (rus) return rus;
  return (country.name && country.name.common) || "—";
}

export function engName(country) {
  return (country.name && country.name.common) || "";
}

// Официальное название страны на текущем языке.
export function officialName(country) {
  if (getLang() === "en") {
    return (country.name && country.name.official) || "";
  }
  return (country.translations
    && country.translations.rus
    && country.translations.rus.official) || "";
}

export function hasCapital(country) {
  return Array.isArray(country.capital) && country.capital.length > 0;
}

// Русское название столицы; если перевода нет — английское из API.
export function capitalName(country) {
  const ru = capitalsRu[country.cca2];
  if (ru) return ru;
  return Array.isArray(country.capital) && country.capital.length
    ? country.capital[0]
    : "";
}

// Население — форматированная строка (внутренний RU-only хелпер, наружу не экспортируется)
function populationFormatted(country) {
  const n = country.population;
  if (!n) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(".", ",") + " млрд";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " млн";
  if (n >= 1e3) return Math.round(n / 1e3) + " тыс";
  return String(n);
}

// Площадь — форматированная строка (внутренний RU-only хелпер, наружу не экспортируется)
function areaFormatted(country) {
  const n = country.area;
  if (!n || n <= 0) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(".", ",") + " млн км²";
  if (n >= 1e3) return n.toLocaleString("ru-RU") + " км²";
  return n + " км²";
}

// Официальные языки — строка через запятую (значения объекта country.languages)
export function languageName(country) {
  if (!country.languages) return "—";
  return Object.values(country.languages).join(", ");
}
export function hasLanguages(country) {
  return !!(country.languages && Object.keys(country.languages).length > 0);
}

// Валюта — название первой валюты (country.currencies — объект { code: { name, symbol } })
export function currencyName(country) {
  if (!country.currencies) return "—";
  const first = Object.values(country.currencies)[0];
  return first ? first.name : "—";
}
export function hasCurrencies(country) {
  return !!(country.currencies && Object.keys(country.currencies).length > 0);
}

// Самоназвание — первое не-английское nativeName (country.name.nativeName: { langCode: { common, official } })
export function nativeNameStr(country) {
  const nn = country.name && country.name.nativeName;
  if (!nn) return "—";
  const nonEng = Object.entries(nn).find(([k]) => k !== "eng");
  const entry = nonEng ? nonEng[1] : Object.values(nn)[0];
  return entry ? entry.common : "—";
}
export function hasNativeName(country) {
  const nn = country.name && country.name.nativeName;
  if (!nn) return false;
  return Object.keys(nn).some((k) => k !== "eng");
}

// Герб
export function hasCoatOfArms(country) {
  return !!(country.coatOfArms && (country.coatOfArms.svg || country.coatOfArms.png));
}

// Религия (только EN — как languages/currencies; источник — data/religions.json)
export function religionName(country) {
  return country.majorReligion || "";
}
export function hasReligion(country) {
  return !!country.majorReligion;
}

// Плотность населения (жит/км²). lang передаётся явно (как в TOPICS).
export function getDensityFormatted(country, lang) {
  const d = country.population / country.area;
  const val = d < 1 ? d.toFixed(1) : Math.round(d).toLocaleString(lang === "ru" ? "ru-RU" : "en-US");
  return lang === "ru" ? `${val} чел/км²` : `${val}/km²`;
}
export function hasDensity(country) {
  return country.population > 0 && country.area > 0;
}

// ---- Язык-зависимые обёртки (выбор RU/EN по getLang()) ----

// Имя страны
export function getName(country) {
  return getLang() === "en" ? engName(country) : ruName(country);
}

// Название столицы
export function getCapital(country) {
  if (getLang() === "en") {
    return Array.isArray(country.capital) && country.capital.length
      ? country.capital[0]
      : "—";
  }
  return capitalName(country);
}

// Форматирование населения
export function getPopulationFormatted(country) {
  const n = country.population;
  if (!n) return "—";
  if (getLang() === "en") {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + " billion";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + " million";
    if (n >= 1e3) return Math.round(n / 1e3) + " thousand";
    return String(n);
  }
  return populationFormatted(country);
}

// Форматирование площади
export function getAreaFormatted(country) {
  const n = country.area;
  if (!n || n <= 0) return "—";
  if (getLang() === "en") {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + " million km²";
    if (n >= 1e3) return n.toLocaleString("en-US") + " km²";
    return n + " km²";
  }
  return areaFormatted(country);
}

// Загружает страны из локального data/countries.json (уже слиты доп. поля и
// отсортированы скриптом), подмешивает русские столицы и религии (тоже локальные).
export async function fetchCountries() {
  const [res, capRes] = await Promise.all([
    fetch(COUNTRIES_URL),
    fetch(CAPITALS_RU_URL),
  ]);
  if (!res.ok) {
    throw new Error("HTTP " + res.status + " " + res.statusText);
  }
  const data = await res.json();

  // Доминирующая религия (cca2 → строка на английском). Не критична — при сбое пустой объект.
  const religionsMap = await fetch(RELIGIONS_URL).then((r) => r.json()).catch(() => ({}));
  for (const c of data) {
    c.majorReligion = religionsMap[c.cca2] || "";
  }

  if (capRes.ok) {
    try {
      capitalsRu = await capRes.json();
    } catch {
      capitalsRu = {};
    }
  }
  data.sort((a, b) => engName(a).localeCompare(engName(b), "en"));
  return data;
}
