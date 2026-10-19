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
  'GHSA-vfj7-8cjw-p6xm': 'braces, via micromatch dans metro-file-map (build)',
  'GHSA-86w9-cpqp-85rv': 'node-forge, via @expo/code-signing-certificates (Expo CLI)',
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
