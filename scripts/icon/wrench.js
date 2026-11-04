// SVG de l'icône Clé de 12 : clé mixte (fourche + œil) en diagonale.
function wrench({ size, scale = 1, bg = true, color = '#FFFFFF', engrave = '#1F5FAF', text = true }) {
  const s = scale;
  const g = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B8BE8"/><stop offset="1" stop-color="#1A4F95"/>
    </linearGradient>
    <mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
      <rect width="1024" height="1024" fill="black"/>
      <g fill="white">
        <rect x="300" y="470" width="420" height="84" rx="42"/>
        <circle cx="250" cy="512" r="132"/>
        <circle cx="776" cy="512" r="118"/>
      </g>
      <g fill="black">
        <rect x="80" y="462" width="172" height="100" transform="rotate(-15 250 512)"/>
        <circle cx="252" cy="512" r="50"/>
        <polygon points="${hex(776, 512, 60)}"/>
      </g>
    </mask>
  </defs>
  ${bg ? '<rect width="1024" height="1024" fill="url(#bg)"/>' : ''}
  <g transform="translate(512 512) scale(${s}) rotate(-45) translate(-512 -512)">
    <rect width="1024" height="1024" fill="${color}" mask="url(#m)"/>
    ${text ? `<text x="512" y="531" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="54" fill="${engrave}">12</text>` : ''}
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${g}</svg>`;
}
function hex(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}
module.exports = { wrench };
