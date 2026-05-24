// Слой данных: запрос к restcountries.com и геттеры полей страны.

// v3.1 требует ?fields=..., иначе 400.
// /all ограничивает запрос максимум 10 полями, а нам нужно 11 → два запроса, слияние по cca2.
export const API_URL = "https://restcountries.com/v3.1/all?fields=name,translations,capital,population,flags,cca2,region";
const API_EXTRAS_URL = "https://restcountries.com/v3.1/all?fields=cca2,languages,currencies,area,coatOfArms";

// Русские названия столиц (API отдаёт столицы только по-английски).
// Грузится из data/capitals_ru.json при старте, ключ — код страны cca2.
const CAPITALS_RU_URL = "data/capitals_ru.json";
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

export function capital(country) {
  return Array.isArray(country.capital) && country.capital.length
    ? country.capital.join(", ")
    : "—";
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

export function population(country) {
  const n = country.population;
  return typeof n === "number" ? n.toLocaleString("ru-RU") : "—";
}

// Население — форматированная строка
export function populationFormatted(country) {
  const n = country.population;
  if (!n) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(".", ",") + " млрд";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " млн";
  if (n >= 1e3) return Math.round(n / 1e3) + " тыс";
  return String(n);
}

// Площадь — форматированная строка
export function areaFormatted(country) {
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

// Загружает страны двумя запросами (лимит /all — 10 полей), сливает доп. поля по cca2,
// подгружает русские столицы, сортирует по англ. названию.
export async function fetchCountries() {
  const [res, extraRes, capRes] = await Promise.all([
    fetch(API_URL),
    fetch(API_EXTRAS_URL),
    fetch(CAPITALS_RU_URL),
  ]);
  if (!res.ok) {
    throw new Error("HTTP " + res.status + " " + res.statusText);
  }
  const data = await res.json();

  // Слияние дополнительных полей (languages/currencies/area/coatOfArms) по коду страны.
  if (extraRes.ok) {
    try {
      const extras = await extraRes.json();
      const byCode = new Map(extras.map((e) => [e.cca2, e]));
      for (const c of data) {
        const e = byCode.get(c.cca2);
        if (e) {
          c.languages = e.languages;
          c.currencies = e.currencies;
          c.area = e.area;
          c.coatOfArms = e.coatOfArms;
        }
      }
    } catch (_) {}
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
