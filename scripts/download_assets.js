// Скачивание флагов и гербов стран в репозиторий (автономность от CDN).
// Запускать вручную: node scripts/download_assets.js
//
// Читает data/countries.json, качает flags.svg → img/flags/{cca2}.svg и
// coatOfArms.svg → img/coats/{cca2}.svg (где есть). Пауза 100мс между запросами.
// Ошибки логирует и продолжает. CommonJS, Node 18+ (глобальный fetch).

const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const COUNTRIES = path.join(ROOT, "data", "countries.json");
const FLAGS_DIR = path.join(ROOT, "img", "flags");
const COATS_DIR = path.join(ROOT, "img", "coats");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("empty");
  writeFileSync(outPath, buf);
}

async function main() {
  const countries = JSON.parse(readFileSync(COUNTRIES, "utf8"));
  mkdirSync(FLAGS_DIR, { recursive: true });
  mkdirSync(COATS_DIR, { recursive: true });

  let flags = 0, coats = 0, errors = 0;
  const total = countries.length;
  let i = 0;

  for (const c of countries) {
    i++;
    const code = (c.cca2 || "").toLowerCase();
    if (!code) continue;

    // Флаг
    const flagUrl = c.flags && c.flags.svg;
    if (flagUrl) {
      try {
        await download(flagUrl, path.join(FLAGS_DIR, `${code}.svg`));
        flags++;
        console.log(`[${i}/${total}] Downloaded ${c.cca2} flag`);
      } catch (e) {
        errors++;
        console.log(`[${i}/${total}] ERROR flag ${c.cca2}: ${e.message}`);
      }
      await sleep(100);
    }

    // Герб (только где есть svg)
    const coaUrl = c.coatOfArms && c.coatOfArms.svg;
    if (coaUrl) {
      try {
        await download(coaUrl, path.join(COATS_DIR, `${code}.svg`));
        coats++;
        console.log(`[${i}/${total}] Downloaded ${c.cca2} coat`);
      } catch (e) {
        errors++;
        console.log(`[${i}/${total}] ERROR coat ${c.cca2}: ${e.message}`);
      }
      await sleep(100);
    }
  }

  console.log(`\nDone. Flags: ${flags}, Coats: ${coats}, Errors: ${errors}`);
  console.log(`  flags → ${FLAGS_DIR}`);
  console.log(`  coats → ${COATS_DIR}`);
}

main().catch((e) => {
  console.error("download_assets failed:", e.message);
  process.exit(1);
});
