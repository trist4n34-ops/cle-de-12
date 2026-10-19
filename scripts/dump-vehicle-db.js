// Exporte marques et modèles (voitures particulières et monospaces) des sources européennes de @meterapp/vehicle-db.
// Usage : npm pack @meterapp/vehicle-db, puis node scripts/dump-vehicle-db.js <chemin vers dist/index.js> > raw.json
const db = require(process.argv[2] ?? '@meterapp/vehicle-db');
const acc = new Map();
const SOURCES = { 'eea-co2-monitoring': 'e', 'rdw-nl-vehicle-register': 'r', 'uk-dft-vehicle-licensing': 'u' };
for (const [sourceId, tag] of Object.entries(SOURCES))
  for (const vehicleTypeId of [2, 7])
    for (let year = 1990; year <= new Date().getFullYear(); year++)
      for (const m of db.getModels({ year, vehicleTypeId, sourceId })) {
        if (!acc.has(m.makeName)) acc.set(m.makeName, new Map());
        const models = acc.get(m.makeName);
        const years = models.get(m.modelName) ?? {};
        (years[tag] ??= new Set()).add(year);
        models.set(m.modelName, years);
      }
process.stdout.write(
  JSON.stringify(
    [...acc].map(([make, models]) => [
      make,
      [...models].map(([n, years]) => [n, Object.fromEntries(Object.entries(years).map(([t, ys]) => [t, [...ys].sort()]))]),
    ]),
  ),
);
