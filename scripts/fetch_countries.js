// Обновление данных стран. Запускать вручную, когда нужно обновить:
//   node scripts/fetch_countries.js
//
// Делает те же два запроса к restcountries.com, что раньше делал рантайм
// (js/data.js), сливает по cca2, сортирует по английскому имени и сохраняет
// в data/countries.json. После этого игра грузит данные локально, без API.
//
// CommonJS (в репозитории нет package.json / type:module). Node 18+ — глобальный fetch.

const { writeFileSync, mkdirSync } = require("node:fs");
const path = require("node:path");

const API_URL =
  "https://restcountries.com/v3.1/all?fields=name,translations,capital,population,flags,cca2,region";
const API_EXTRAS_URL =
  "https://restcountries.com/v3.1/all?fields=languages,currencies,area,coatOfArms,cca2";

const OUT = path.join(__dirname, "..", "data", "countries.json");

async function main() {
  const [res, extraRes] = await Promise.all([fetch(API_URL), fetch(API_EXTRAS_URL)]);
  if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText + " (main)");
  if (!extraRes.ok) throw new Error("HTTP " + extraRes.status + " " + extraRes.statusText + " (extras)");

  const data = await res.json();
  const extras = await extraRes.json();

  // Слияние дополнительных полей по коду страны (как в js/data.js).
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

  // Сортировка по английскому имени (как в js/data.js).
  data.sort((a, b) =>
    ((a.name && a.name.common) || "").localeCompare((b.name && b.name.common) || "", "en")
  );

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(data));
  console.log(`Saved ${data.length} countries → ${OUT}`);
}

main().catch((e) => {
  console.error("fetch_countries failed:", e.message);
  process.exit(1);
});
