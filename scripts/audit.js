/**
 * Audit des dépendances de production : échoue sur toute faille haute ou
 * critique, sauf celles listées dans ALLOWED avec leur raison. Une entrée de la
 * liste qui ne sort plus dans l'audit est signalée, pour être retirée.
 *
 *   node scripts/audit.js
 */
const { execSync } = require('node:child_process');

// Failles sans version corrigée, présentes seulement dans l'outillage de build d'Expo
// (Metro, Expo CLI) : ce code ne tourne ni dans l'app ni sur le serveur.
const ALLOWED = {
  // zod 3.25 n'a pas de correctif ; seul @expo/cli l'utilise. Le serveur valide avec zod 4.6.7, corrigé.
  'GHSA-mrhx-c7xc-m3w5': 'zod 3, via @expo/cli (build)',
};

let out;
try {
  out = execSync('npm audit --omit=dev --json', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = e.stdout; // npm audit sort en erreur dès qu'il trouve une faille
}
const report = JSON.parse(out);
const found = new Map();
for (const v of Object.values(report.vulnerabilities ?? {})) {
  for (const via of v.via) {
    if (typeof via === 'string' || !['high', 'critical'].includes(via.severity)) continue;
    const id = via.url.split('/').pop();
    found.set(id, `${via.name} (${via.severity}) : ${via.title}`);
  }
}

const blocking = [...found].filter(([id]) => !ALLOWED[id]);
for (const id of Object.keys(ALLOWED)) if (!found.has(id)) console.log(`Plus nécessaire dans ALLOWED : ${id}`);
for (const [id, what] of found) console.log(`${ALLOWED[id] ? 'toléré ' : 'BLOQUANT'} ${id} ${what}`);
if (blocking.length) {
  console.error(`${blocking.length} faille(s) haute(s) ou critique(s) à corriger.`);
  process.exit(1);
}
console.log('Audit OK.');
