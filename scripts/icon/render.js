// Régénère les icônes de l’app et les visuels du Play Store :
//   NODE_PATH=$(npm root -g) node scripts/icon/render.js <dossier de sortie>
// puis copiez les PNG dans assets/images/ (icônes) et store/ (fiche Play Store).
const { chromium } = require('playwright');
const { wrench } = require('./wrench');
const out = process.argv[2];
const jobs = [
  ['icon.png', 1024, { size: 1024, scale: 1.12 }],
  ['android-icon-foreground.png', 512, { size: 512, scale: 0.68, bg: false }],
  ['android-icon-monochrome.png', 432, { size: 432, scale: 0.68, bg: false, text: false }],
  ['splash-icon.png', 512, { size: 512, scale: 1.0, bg: false, text: false }],
  ['favicon.png', 48, { size: 48, scale: 1.05, text: false }],
  ['play-icon-512.png', 512, { size: 512, scale: 1.12 }],
];
(async () => {
  const b = await chromium.launch();
  for (const [name, px, opts] of jobs) {
    const p = await b.newPage({ viewport: { width: px, height: px } });
    await p.setContent(`<html><body style="margin:0;background:transparent">${wrench(opts)}</body></html>`);
    await p.screenshot({ path: `${out}/${name}`, omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
    await p.close();
  }
  // Image de présentation Play Store 1024 × 500.
  const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await p.setContent(`<html><body style="margin:0;width:1024px;height:500px;background:linear-gradient(135deg,#3B8BE8,#1A4F95);font-family:Inter,Arial,sans-serif;color:#fff;display:flex;align-items:center;gap:40px;padding:0 64px;box-sizing:border-box">
    <div style="width:300px;height:300px;flex:none">${wrench({ size: 300, scale: 1.1, bg: false, engrave: '#2468BD' })}</div>
    <div><div style="font-size:72px;font-weight:800;letter-spacing:-1px">Clé de 12</div>
    <div style="font-size:34px;line-height:1.25;margin-top:14px;max-width:560px">Diagnostic et réparation auto assistés par IA</div>
    <div style="font-size:24px;margin-top:22px;opacity:.85">Codes OBD2 · Guides pas à pas · Devis</div></div></body></html>`);
  await p.screenshot({ path: `${out}/play-feature-1024x500.png` });
  await b.close();
})();
