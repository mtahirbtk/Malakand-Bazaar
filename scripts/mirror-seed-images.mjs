// Downloads the imagery the Stitch exports reference from googleusercontent
// into public/images/seed so the app never depends on those URLs staying up.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const EXPORT = "stitch_malakandbazaar_digital_marketplace_ui";
const OUT = "public/images/seed";
mkdirSync(OUT, { recursive: true });

// published filename -> alt text in the export that identifies the image
const WANTED = {
  "solar-inverter.jpg": "Solar Tubewell Inverter",
  "honda-cd70.jpg": "Honda CD 70 Bike",
  "hilux.jpg": "Toyota Hilux Double Cabin",
  "hero-1.jpg": "Malakand Pass",
  "hero-2.jpg": "Batkhela Commercial Bazaar",
  "hero-3.jpg": "High Alpine Swat",
};

const files = [
  `${EXPORT}/malakandbazaar_regional_digital_marketplace_with_category_shelves_top_sellers/code.html`,
  `${EXPORT}/malakandbazaar_grand_search_filter_catalog_page/code.html`,
];

const images = [];
for (const f of files) {
  if (!existsSync(f)) continue;
  const html = readFileSync(f, "utf8");
  for (const m of html.matchAll(/<img[^>]*>/g)) {
    const tag = m[0];
    const src = tag.match(/src="(https:\/\/lh3\.googleusercontent\.com[^"]+)"/);
    const alt = tag.match(/alt="([^"]*)"/);
    if (src) images.push({ url: src[1], alt: alt ? alt[1] : "" });
  }
  // Hero slides put their URL in a background-image style rather than an <img>.
  for (const m of html.matchAll(/url\('(https:\/\/lh3\.googleusercontent\.com[^']+)'\)/g)) {
    images.push({ url: m[1], alt: "hero" });
  }
}

console.log(`found ${images.length} remote images in the exports`);

/** 4:3 surface-low placeholder, used when a source URL no longer resolves. */
function placeholderSvg(label) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">` +
      `<rect width="800" height="600" fill="#edf5ef"/>` +
      `<text x="400" y="300" text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="sans-serif" font-size="28" fill="#52635a">${label}</text></svg>`
  );
}

let downloaded = 0;
let placeheld = 0;

for (const [filename, needle] of Object.entries(WANTED)) {
  const hit = images.find((i) => i.alt.toLowerCase().includes(needle.toLowerCase()));
  const target = `${OUT}/${filename}`;
  const svgTarget = target.replace(/\.jpg$/, ".svg");

  if (hit) {
    try {
      const res = await fetch(hit.url, { signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1000) {
          writeFileSync(target, buf);
          console.log(`  ok   ${filename}  (${(buf.length / 1024).toFixed(0)} KB)`);
          downloaded++;
          continue;
        }
      }
      console.log(`  miss ${filename}  HTTP ${res.status}`);
    } catch (e) {
      console.log(`  miss ${filename}  ${e.name}`);
    }
  } else {
    console.log(`  miss ${filename}  no matching alt text`);
  }

  writeFileSync(svgTarget, placeholderSvg(needle));
  placeheld++;
}

console.log(`\ndownloaded ${downloaded}, placeholders written ${placeheld}`);
if (placeheld) {
  console.log("Replace the .svg placeholders with real photographs before launch.");
}
