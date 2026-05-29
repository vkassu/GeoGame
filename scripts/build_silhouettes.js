// Генерация SVG-силуэтов границ стран для темы «Силуэт» (#42).
// Запускать вручную, когда нужно перегенерировать силуэты:
//   node scripts/build_silhouettes.js
//
// Что делает:
//   1. Скачивает Natural Earth 50m admin-0 GeoJSON (50m — хорошее покрытие:
//      236/250 наших стран; 110m давал лишь ~175 и терял Сингапур/Мальту/др.).
//   2. Читает data/countries.json → множество нужных cca2.
//   3. Для каждого feature берёт ISO_A2 (фолбэк ISO_A2_EH — иначе France/Norway/
//      Kosovo приходят как -99). Пропускает -99 и страны не из нашего набора.
//   4. Собирает все кольца (Polygon + MultiPolygon), считает bbox, нормализует в
//      viewBox 0 0 200 200 с padding 10, сохраняя пропорции; широту инвертирует
//      (y = верх вниз). Координаты округляются до 0.1 для компактности.
//   5. Пишет data/silhouettes/{cca2}.svg (нижний регистр) + манифест index.json
//      (массив cca2 в ВЕРХНЕМ регистре — рантайм гейтит тему по нему: hasSilhouette).
//
// Антимеридиан: страны, пересекающие 180° (Россия, США с Аляской, Фиджи), при
// наивной проекции «размазываются» на всю ширину. Эвристика: если ширина bbox по
// долготе > 180°, отрицательные долготы сдвигаются на +360 — силуэт становится цельным.
//
// Ограничение: рисуются ВСЕ полигоны (как в ТЗ), поэтому у стран с заморскими
// территориями (Франция, Нидерланды) кроме материка видны мелкие точки-острова.
// Материковый контур остаётся доминирующим. Фильтрация — отдельная задача при необходимости.
//
// CommonJS (в репозитории нет package.json / type:module). Node 18+ — глобальный fetch.

const { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const COUNTRIES = path.join(__dirname, "..", "data", "countries.json");
const OUT_DIR = path.join(__dirname, "..", "data", "silhouettes");

const VIEW = 200;
const PAD = 10;
const INNER = VIEW - PAD * 2; // 180

// cca2 страны из свойств feature (с фолбэком на ISO_A2_EH).
function isoCode(pr) {
  let c = pr.ISO_A2;
  if (!c || c === "-99") c = pr.ISO_A2_EH;
  return c && c !== "-99" ? c : null;
}

// Все кольца (массивы точек [lon,lat]) из geometry — для Polygon и MultiPolygon.
function ringsOf(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return geom.coordinates; // [ring, hole, ...]
  if (geom.type === "MultiPolygon") return geom.coordinates.flat(); // [[ring,...],...] -> [ring,...]
  return [];
}

async function main() {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
  const gj = await res.json();

  const countries = JSON.parse(readFileSync(COUNTRIES, "utf8"));
  const want = new Set(countries.map((c) => c.cca2));

  // Чистим папку, чтобы не оставлять силуэты исчезнувших стран.
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Группируем features по коду: у части стран несколько записей (напр. AU =
  // Australia + «Indian Ocean Ter.» + «Ashmore and Cartier Is.»). Берём запись
  // с самой крупной геометрией (по числу точек), иначе силуэт = крошечный остров.
  const byCode = new Map();
  for (const f of gj.features) {
    const code = isoCode(f.properties);
    if (!code || !want.has(code)) continue;
    const rings = ringsOf(f.geometry);
    if (!rings.length) continue;
    const pts = rings.reduce((s, r) => s + r.length, 0);
    const prev = byCode.get(code);
    if (!prev || pts > prev.pts) byCode.set(code, { rings, pts });
  }

  const built = [];
  for (const [code, { rings }] of byCode) {
    // Сырой bbox по долготе — чтобы решить, нужен ли сдвиг через антимеридиан.
    let rawMinLon = Infinity, rawMaxLon = -Infinity;
    for (const ring of rings) for (const p of ring) {
      if (p[0] < rawMinLon) rawMinLon = p[0];
      if (p[0] > rawMaxLon) rawMaxLon = p[0];
    }
    const wrap = rawMaxLon - rawMinLon > 180;
    const lonOf = (lon) => (wrap && lon < 0 ? lon + 360 : lon);

    // Итоговый bbox (с учётом сдвига).
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const ring of rings) for (const p of ring) {
      const lon = lonOf(p[0]), lat = p[1];
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const w = maxLon - minLon, h = maxLat - minLat;
    if (!(w > 0) || !(h > 0)) continue;

    const scale = Math.min(INNER / w, INNER / h);
    const offX = PAD + (INNER - w * scale) / 2;
    const offY = PAD + (INNER - h * scale) / 2;
    const tx = (lon) => +(offX + (lonOf(lon) - minLon) * scale).toFixed(1);
    const ty = (lat) => +(offY + (maxLat - lat) * scale).toFixed(1); // инверсия Y

    let d = "";
    for (const ring of rings) {
      if (ring.length < 3) continue;
      d += "M" + tx(ring[0][0]) + " " + ty(ring[0][1]);
      for (let i = 1; i < ring.length; i++) d += "L" + tx(ring[i][0]) + " " + ty(ring[i][1]);
      d += "Z";
    }
    if (!d) continue;

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" ` +
      `preserveAspectRatio="xMidYMid meet">` +
      `<path d="${d}" fill="#4f46e5" fill-rule="evenodd"/></svg>`;
    writeFileSync(path.join(OUT_DIR, code.toLowerCase() + ".svg"), svg);
    built.push(code);
  }

  built.sort();
  writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(built));

  const missing = [...want].filter((c) => !built.includes(c)).sort();
  console.log(`Built ${built.length} silhouettes → ${OUT_DIR}`);
  console.log(`Manifest: index.json (${built.length} codes)`);
  console.log(`Missing ${missing.length} (нет геометрии в 50m): ${missing.join(",") || "—"}`);
}

main().catch((e) => {
  console.error("build_silhouettes failed:", e.message);
  process.exit(1);
});
