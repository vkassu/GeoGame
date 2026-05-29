// Генерация данных карты мира для темы «Найди на карте» (#43).
// Запускать вручную: node scripts/build_worldmap.js
//
// РЕШЕНИЕ ПО АРХИТЕКТУРЕ (#43): проекция считается ЗДЕСЬ, на этапе сборки —
// рантайм НЕ тянет D3 и вообще никаких внешних библиотек (принцип проекта:
// «без внешних зависимостей в рантайме», офлайн/iPad). Скрипт проецирует все
// страны проекцией geoNaturalEarth1 (формула d3-geo, реализована вручную, без
// npm) в экранные координаты и пишет готовые SVG-пути. UI просто ставит `d`.
//
// Что делает:
//   1. Скачивает Natural Earth 50m admin-0 GeoJSON (покрытие 236/250 — как
//      силуэты; 110m терял Сингапур/Мальту/Бахрейн и пр.).
//   2. Читает data/countries.json → множество нужных cca2.
//   3. Группирует features по коду (ISO_A2, фолбэк ISO_A2_EH; -99 пропускает),
//      сливает все полигоны страны в один путь. Для автозума/центроида берёт
//      самый крупный по площади внешний контур (материк, а не дальний остров).
//   4. Проецирует каждую вершину в экранные координаты (viewBox 960×500,
//      scale 153, translate [480,250] — как в исходном ТЗ).
//   5. Пишет data/worldmap.json: { w, h, countries:[{cca2,d,bbox,c}] }, где
//      d — SVG-путь, bbox/c — экранные bbox и центр крупнейшего контура.
//   6. Пишет data/worldmap_index.json — массив cca2 в ВЕРХНЕМ регистре
//      (формат как data/silhouettes/index.json; по нему гейтится hasMapFind).
//
// Антимеридиан НЕ сдвигаем: в единой мировой проекции каждая страна должна стоять
// на своём глобальном месте (Чукотка естественно «заворачивается» на левый край).
// Автозум берёт bbox крупнейшего контура, поэтому зум к материку корректен.
//
// CommonJS, без package.json/npm. Node 18+ — глобальный fetch.

const { writeFileSync, readFileSync } = require("node:fs");
const path = require("node:path");

const GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const COUNTRIES = path.join(__dirname, "..", "data", "countries.json");
const MAP_OUT = path.join(__dirname, "..", "data", "worldmap.json");
const IDX_OUT = path.join(__dirname, "..", "data", "worldmap_index.json");
// Ручные центроиды [lon,lat] для стран без отдельной геометрии в Natural Earth
// (заморские территории Франции, крошечные острова). Добавляются как dot-only (#45).
const MISSING = path.join(__dirname, "..", "data", "missing_centroids.json");

const W = 960, H = 500, SCALE = 153, TX = W / 2, TY = H / 2;
const DEG = Math.PI / 180;

// d3.geoNaturalEarth1 raw-проекция (полиномиальная аппроксимация Šavrič et al.),
// затем scale + translate с инверсией Y. Эквивалент d3.geoNaturalEarth1()
// .scale(153).translate([480,250]).
function project(lon, lat) {
  const lambda = lon * DEG, phi = lat * DEG;
  const phi2 = phi * phi, phi4 = phi2 * phi2;
  const x = lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4)));
  const y = phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4)));
  return [TX + SCALE * x, TY - SCALE * y];
}

// cca2: ISO_A2 только если валидный 2-буквенный код, иначе фолбэк ISO_A2_EH.
// Ловит мусор вроде Тайваня ("CN-TW" в ISO_A2, "TW" в ISO_A2_EH) (#45).
function getCca2(pr) {
  const ok = (v) => typeof v === "string" && /^[A-Z]{2}$/.test(v);
  if (ok(pr.ISO_A2)) return pr.ISO_A2;
  if (ok(pr.ISO_A2_EH)) return pr.ISO_A2_EH;
  return null;
}

// Список полигонов (каждый — массив колец [ext, ...holes]) из geometry.
function polygonsOf(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  return [];
}

async function main() {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
  const gj = await res.json();

  const list = JSON.parse(readFileSync(COUNTRIES, "utf8"));
  const want = new Set(list.map((c) => c.cca2));

  // Группируем все полигоны по коду (несколько feature на код → сливаем).
  const byCode = new Map();
  for (const f of gj.features) {
    const code = getCca2(f.properties);
    if (!code || !want.has(code)) continue;
    const polys = polygonsOf(f.geometry);
    if (!polys.length) continue;
    const arr = byCode.get(code) || [];
    arr.push(...polys);
    byCode.set(code, arr);
  }

  const r1 = (n) => Math.round(n * 10) / 10;
  const countries = [];
  for (const [code, polys] of byCode) {
    let d = "";
    let best = null; // крупнейший внешний контур: {area,x0,y0,x1,y1}
    for (const poly of polys) {
      for (let ri = 0; ri < poly.length; ri++) {
        const ring = poly[ri];
        if (ring.length < 3) continue;
        const proj = ring.map(([lon, lat]) => project(lon, lat));
        d += "M" + r1(proj[0][0]) + " " + r1(proj[0][1]);
        for (let i = 1; i < proj.length; i++) d += "L" + r1(proj[i][0]) + " " + r1(proj[i][1]);
        d += "Z";
        if (ri === 0) {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          for (const [x, y] of proj) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
          const area = (x1 - x0) * (y1 - y0);
          if (!best || area > best.area) best = { area, x0, y0, x1, y1 };
        }
      }
    }
    if (!d || !best) continue;
    countries.push({
      cca2: code,
      d,
      bbox: [r1(best.x0), r1(best.y0), r1(best.x1), r1(best.y1)],
      c: [r1((best.x0 + best.x1) / 2), r1((best.y0 + best.y1) / 2)],
    });
  }

  // Страны без геометрии в Natural Earth → dot-only записи по ручным центроидам.
  // Только те, что есть в countries.json и не нашлись в GeoJSON. У них нет `d`/`bbox`,
  // только спроецированный центр `c` и флаг dotOnly — UI рисует их точкой (#45).
  const found = new Set(countries.map((c) => c.cca2));
  let dotCount = 0;
  let missingCentroids = {};
  try { missingCentroids = JSON.parse(readFileSync(MISSING, "utf8")); } catch { /* нет файла — пропускаем */ }
  for (const [codeRaw, lonlat] of Object.entries(missingCentroids)) {
    const code = String(codeRaw).toUpperCase();
    if (!want.has(code) || found.has(code)) continue;
    if (!Array.isArray(lonlat) || lonlat.length !== 2) continue;
    const [cx, cy] = project(lonlat[0], lonlat[1]);
    countries.push({ cca2: code, c: [r1(cx), r1(cy)], dotOnly: true });
    found.add(code);
    dotCount++;
    console.log(`  [missing_centroids] dot-only: ${code}`);
  }

  countries.sort((a, b) => a.cca2.localeCompare(b.cca2));
  writeFileSync(MAP_OUT, JSON.stringify({ w: W, h: H, countries }));
  writeFileSync(IDX_OUT, JSON.stringify(countries.map((c) => c.cca2)));

  const missing = [...want].filter((c) => !countries.some((k) => k.cca2 === c)).sort();
  const kb = Math.round(Buffer.byteLength(JSON.stringify({ w: W, h: H, countries })) / 1024);
  console.log(`Built worldmap: ${countries.length} countries → ${MAP_OUT} (~${kb} KB)`);
  console.log(`Manifest: worldmap_index.json (${countries.length} codes)`);
  console.log(`Missing ${missing.length} (нет геометрии в 50m): ${missing.join(",") || "—"}`);
}

main().catch((e) => {
  console.error("build_worldmap failed:", e.message);
  process.exit(1);
});
