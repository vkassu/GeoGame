// Слой данных: запрос к restcountries.com и геттеры полей страны.

// v3.1 требует ?fields=..., иначе 400.
export const API_URL = "https://restcountries.com/v3.1/all?fields=name,translations,capital,population,flags,cca2";

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

export function capitalName(country) {
  return Array.isArray(country.capital) && country.capital.length
    ? country.capital[0]
    : "";
}

export function population(country) {
  const n = country.population;
  return typeof n === "number" ? n.toLocaleString("ru-RU") : "—";
}

// Загружает список стран и сортирует по английскому названию.
export async function fetchCountries() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error("HTTP " + res.status + " " + res.statusText);
  }
  const data = await res.json();
  data.sort((a, b) => engName(a).localeCompare(engName(b), "en"));
  return data;
}
