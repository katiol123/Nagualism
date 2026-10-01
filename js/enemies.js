'use strict';
// ============================================================
//  Летуны: рисунок (SVG), ходы и ИИ
// ============================================================

let svgSeq = 0;
// Силуэт летуна собирается из частей: тело (body), крылья (wings), рот (mouth) и детали (extras).
// У каждого вида своя комбинация — так летуны не похожи друг на друга.
const WING_PATHS = {
  bat: 'M100 78 C 70 18, 25 12, 4 40 C 22 44, 26 58, 12 78 C 32 74, 40 88, 30 108 C 52 96, 66 104, 72 122 C 82 110, 92 98, 100 96 Z',
  feather: 'M100 80 C 82 58, 50 38, 8 46 L 24 58 L 6 66 L 26 74 L 10 86 L 30 90 L 18 104 L 42 100 L 36 116 L 60 106 L 68 120 C 80 104, 92 94, 100 92 Z',
  tatter: 'M100 78 C 76 28, 40 18, 6 34 L 20 46 L 4 58 L 24 64 L 12 84 L 34 80 L 28 100 L 50 92 L 54 114 L 68 98 L 78 118 C 86 104, 94 96, 100 94 Z',
  blade: 'M100 84 L 14 30 L 40 70 L 2 76 L 44 92 L 22 112 L 100 98 Z',
};
function flyerSVG(o) {
  const id = 'fl' + (svgSeq++);
  const eyeR = o.eyeR || 5;
  const eyes = (o.eyes || [[88, 70], [112, 70]]).map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="${eyeR}" fill="${o.eye}" filter="url(#${id}g)"/>` +
    `<circle cx="${x}" cy="${y}" r="${eyeR * 0.4}" fill="#fff"/>`).join('');
  const ex = new Set(o.extras || []);
  if (o.horns) ex.add('horns');
  if (o.tendrils) ex.add('tendrils');
  // --- крылья ---
  let wing;
  if (o.wings === 'insect') {
    wing = `<ellipse cx="58" cy="60" rx="48" ry="15" transform="rotate(-24 58 60)" fill="${o.wing}" fill-opacity=".45" stroke="${o.body2}" stroke-width="1.5"/>
      <ellipse cx="62" cy="94" rx="38" ry="11" transform="rotate(16 62 94)" fill="${o.wing}" fill-opacity=".4" stroke="${o.body2}" stroke-width="1.5"/>
      <path d="M100 78 L 20 48 M100 84 L 30 100" stroke="${o.body2}" stroke-width="1" opacity=".6"/>`;
  } else if (o.wings === 'none') wing = '';
  else wing = `<path d="${WING_PATHS[o.wings || 'bat']}" fill="url(#${id}w)" stroke="${o.edge || '#000'}" stroke-width="1.5"/>
      ${o.wings === 'feather' ? `<path d="M100 84 L 30 60 M100 88 L 34 84 M100 92 L 44 104" stroke="${o.body2}" stroke-width="1.2" opacity=".5"/>` : ''}`;
  // --- тело ---
  const BODY = {
    drop: 'M100 40 C 126 40, 134 70, 130 100 C 126 130, 112 150, 100 160 C 88 150, 74 130, 70 100 C 66 70, 74 40, 100 40 Z',
    round: 'M100 52 C 132 52, 142 78, 142 102 C 142 130, 124 148, 100 148 C 76 148, 58 130, 58 102 C 58 78, 68 52, 100 52 Z',
    long: 'M100 38 C 118 38, 122 62, 118 92 C 114 120, 108 146, 100 186 C 92 146, 86 120, 82 92 C 78 62, 82 38, 100 38 Z',
    spiky: 'M100 34 L 110 56 L 134 52 L 124 74 L 144 90 L 122 100 L 134 124 L 110 120 L 100 150 L 90 120 L 66 124 L 78 100 L 56 90 L 76 74 L 66 52 L 90 56 Z',
    hood: 'M100 36 C 130 36, 140 70, 136 104 C 132 140, 120 168, 100 180 C 80 168, 68 140, 64 104 C 60 70, 70 36, 100 36 Z',
  };
  const bodyPath = BODY[o.body3 || 'drop'];
  const parts = [];
  if (ex.has('tail')) parts.push(`<path class="tail" d="M100 140 Q 70 170 92 186 Q 110 196 128 180" stroke="${o.body}" stroke-width="6" fill="none" stroke-linecap="round"/>`);
  if (ex.has('tendrils')) parts.push(`<g class="tendrils" stroke="${o.body}" stroke-width="5" fill="none" stroke-linecap="round">
      <path d="M90 125 Q80 150 92 172"/><path d="M100 128 Q104 158 96 185"/><path d="M110 125 Q122 150 108 172"/></g>`);
  if (ex.has('horns')) parts.push(`<path d="M84 52 L74 22 L92 46 Z M116 52 L126 22 L108 46 Z" fill="${o.body}"/>`);
  if (ex.has('antennae')) parts.push(`<path d="M92 48 Q 80 20 66 18 M108 48 Q 120 20 134 18" stroke="${o.body2}" stroke-width="2.5" fill="none"/><circle cx="66" cy="18" r="4" fill="${o.eye}"/><circle cx="134" cy="18" r="4" fill="${o.eye}"/>`);
  if (ex.has('crown')) parts.push(`<path d="M78 46 L 82 18 L 92 36 L 100 10 L 108 36 L 118 18 L 122 46 Z" fill="${o.accent || '#c9a050'}" stroke="#000" stroke-width="1"/>`);
  if (ex.has('hoodtop')) parts.push(`<path d="M68 70 C 68 30, 132 30, 132 70 C 120 52, 80 52, 68 70 Z" fill="${o.wing}"/>`);
  parts.push(`<path d="${bodyPath}" fill="url(#${id}b)" stroke="${o.edge || '#000'}" stroke-width="${o.body3 === 'spiky' ? 1.5 : 0}"/>`);
  if (ex.has('belly')) parts.push(`<ellipse cx="100" cy="112" rx="18" ry="22" fill="${o.accent || '#ff7ab8'}" opacity=".35" class="belly"/>`);
  if (ex.has('spikes')) parts.push(`<path d="M70 96 L 52 88 L 68 106 Z M130 96 L 148 88 L 132 106 Z M86 140 L 78 160 L 94 146 Z M114 140 L 122 160 L 106 146 Z" fill="${o.accent || '#3f6a2a'}"/>`);
  if (ex.has('stripes')) parts.push(`<path d="M74 100 Q100 92 126 100 M76 116 Q100 108 124 116 M82 132 Q100 124 118 132" stroke="${o.accent || '#ffe14d'}" stroke-width="3" fill="none" opacity=".7"/>`);
  // --- рот ---
  const mouth = {
    smile: `<path d="M86 92 Q100 104 114 92" stroke="${o.eye}" stroke-width="2" fill="none" opacity=".7"/>`,
    beak: `<path d="M92 84 L100 108 L108 84 Z" fill="${o.accent || '#c9a050'}" stroke="#000" stroke-width="1"/>`,
    fangs: `<path d="M84 94 Q100 104 116 94" stroke="#000" stroke-width="3" fill="none"/><path d="M90 96 L93 108 L96 98 Z M104 98 L107 108 L110 96 Z" fill="#f5f0e0"/>`,
    mandibles: `<path d="M88 100 Q 80 116 92 122 M112 100 Q 120 116 108 122" stroke="${o.accent || '#c08a30'}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    maw: `<ellipse cx="100" cy="102" rx="14" ry="8" fill="#000"/><path d="M88 98 L92 106 L96 98 L100 106 L104 98 L108 106 L112 98" stroke="#f5f0e0" stroke-width="1.5" fill="none"/>`,
    none: '',
  }[o.mouth || 'smile'];
  return `<svg viewBox="0 0 200 200" class="flyer-svg ${o.cls || ''} ${o.wings === 'insect' ? 'insect' : ''}" style="width:${o.w}px">
  <defs>
    <radialGradient id="${id}b" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="${o.body2}"/><stop offset="1" stop-color="${o.body}"/></radialGradient>
    <linearGradient id="${id}w" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.body}"/><stop offset="1" stop-color="${o.wing}"/></linearGradient>
    <filter id="${id}g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <ellipse cx="100" cy="194" rx="40" ry="6" fill="#000" opacity=".35" class="shadow"/>
  <g class="bob">
    <g class="wing wl">${wing}</g>
    <g transform="translate(200,0) scale(-1,1)"><g class="wing wl">${wing}</g></g>
    ${parts.join('')}
    ${mouth}
    ${eyes}
  </g></svg>`;
}

// Уникальные противники из событий — не летуны, у них свои силуэты
function humanSVG(o) {
  const id = 'hu' + (svgSeq++);
  return `<svg viewBox="0 0 200 220" class="flyer-svg human-svg" style="width:${o.w}px">
  <defs><linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.dress2}"/><stop offset="1" stop-color="${o.dress}"/></linearGradient>
    <filter id="${id}g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <ellipse cx="100" cy="214" rx="46" ry="6" fill="#000" opacity=".35"/>
  <g class="sway-body">
    <path class="hair" d="M78 44 C 66 70, 62 110, 70 140 L 86 120 L 84 60 Z M122 44 C 134 70, 138 110, 130 140 L 114 120 L 116 60 Z" fill="${o.hair}"/>
    <path d="M100 62 C 72 64, 66 110, 60 150 C 54 190, 50 206, 52 210 L 148 210 C 150 206, 146 190, 140 150 C 134 110, 128 64, 100 62 Z" fill="url(#${id}d)"/>
    <path d="M70 92 Q 48 120 58 150 M130 92 Q 152 118 146 146" stroke="${o.dress2}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M60 210 Q 80 196 100 208 Q 120 196 140 210" stroke="${o.dress}" stroke-width="6" fill="none"/>
    <circle cx="100" cy="46" r="20" fill="${o.skin}"/>
    <path d="M78 42 C 80 18, 120 18, 122 42 C 112 30, 88 30, 78 42 Z" fill="${o.hair}"/>
    <circle cx="93" cy="48" r="2.4" fill="${o.eye}" filter="url(#${id}g)"/><circle cx="107" cy="48" r="2.4" fill="${o.eye}" filter="url(#${id}g)"/>
    <path d="M94 57 Q100 60 106 57" stroke="#3a1a10" stroke-width="1.5" fill="none"/>
    ${o.shawl ? `<path d="M74 70 Q100 90 126 70 L 132 96 Q100 108 68 96 Z" fill="${o.shawl}"/>` : ''}
  </g></svg>`;
}
function crystalSVG(o) {
  const id = 'cr' + (svgSeq++);
  return `<svg viewBox="0 0 200 210" class="flyer-svg crystal-svg" style="width:${o.w}px">
  <defs><linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8fbff"/><stop offset=".4" stop-color="${o.c1}"/><stop offset="1" stop-color="${o.c2}"/></linearGradient>
    <filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <ellipse cx="100" cy="204" rx="50" ry="6" fill="#000" opacity=".35"/>
  <g class="bob">
    <g class="orbit">${[0, 1, 2, 3, 4, 5].map(i => `<polygon points="0,-9 6,0 0,9 -6,0" fill="${o.c1}" opacity=".8" transform="rotate(${i * 60} 100 100) translate(100 28)"/>`).join('')}</g>
    <g filter="url(#${id}g)">
      <polygon points="100,20 132,70 120,150 100,186 80,150 68,70" fill="url(#${id}c)" stroke="#fff" stroke-width="1.5" stroke-opacity=".6"/>
      <polygon points="100,20 120,150 100,186" fill="#000" opacity=".18"/>
      <polygon points="68,70 44,96 58,140 80,150" fill="url(#${id}c)" opacity=".85"/>
      <polygon points="132,70 156,96 142,140 120,150" fill="url(#${id}c)" opacity=".85"/>
    </g>
    <circle class="core" cx="100" cy="96" r="12" fill="#fff" filter="url(#${id}g)"/>
  </g></svg>`;
}
function beastSVG(o) {
  const id = 'be' + (svgSeq++);
  return `<svg viewBox="0 0 240 200" class="flyer-svg beast-svg" style="width:${o.w}px">
  <defs><radialGradient id="${id}f" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="${o.fur2}"/><stop offset="1" stop-color="${o.fur}"/></radialGradient>
    <filter id="${id}g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <ellipse cx="120" cy="192" rx="80" ry="7" fill="#000" opacity=".35"/>
  <g class="prowl">
    <path class="tail" d="M196 96 Q 230 70 222 40" stroke="${o.fur}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M60 90 C 70 70, 180 66, 200 92 C 214 116, 196 134, 180 136 L 70 136 C 50 132, 46 106, 60 90 Z" fill="url(#${id}f)"/>
    <path d="M74 132 L 70 186 L 84 186 L 88 136 Z M100 134 L 102 186 L 116 186 L 112 134 Z M164 132 L 166 186 L 180 186 L 178 132 Z M186 128 L 194 184 L 206 184 L 196 124 Z" fill="${o.fur}"/>
    <path d="M70 92 C 54 70, 30 70, 18 86 L 8 98 L 26 104 L 20 112 L 44 112 C 58 112, 72 106, 76 98 Z" fill="url(#${id}f)"/>
    <path d="M40 74 L 46 50 L 56 72 Z M58 70 L 68 48 L 72 74 Z" fill="${o.fur}"/>
    <path d="M10 98 L 30 106 L 14 108 Z" fill="#f5f0e0"/>
    <circle cx="40" cy="86" r="4.5" fill="${o.eye}" filter="url(#${id}g)"/><circle cx="54" cy="84" r="4.5" fill="${o.eye}" filter="url(#${id}g)"/>
    <path d="M90 70 L 96 54 L 102 70 M120 66 L 126 48 L 132 66 M150 68 L 156 52 L 162 70" stroke="${o.fur}" stroke-width="5" fill="none"/>
  </g></svg>`;
}
function enemyArt(a) {
  if (a.cloud) return cloudSVG(a);
  if (a.kind === 'human') return humanSVG(a);
  if (a.kind === 'crystal') return crystalSVG(a);
  if (a.kind === 'beast') return beastSVG(a);
  return flyerSVG(a);
}

function cloudSVG(o) {
  const id = 'cl' + (svgSeq++);
  const puffs = [[60, 110, 46], [100, 92, 54], [145, 106, 48], [82, 128, 40], [124, 130, 44], [170, 126, 34], [36, 128, 30]];
  return `<svg viewBox="0 0 210 190" class="flyer-svg cloud-svg" style="width:${o.w}px">
  <defs>
    <radialGradient id="${id}c" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#3a3350"/><stop offset=".6" stop-color="#15111f"/><stop offset="1" stop-color="#05040a"/></radialGradient>
    <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="${id}g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <ellipse cx="105" cy="182" rx="70" ry="7" fill="#000" opacity=".35" class="shadow"/>
  <g class="bob">
    <g class="cloud-tendrils" stroke="#120e1c" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9">
      <path d="M60 140 Q50 160 62 178"/><path d="M95 148 Q100 166 90 184"/><path d="M135 146 Q148 162 138 180"/><path d="M165 136 Q178 150 172 166"/></g>
    <g filter="url(#${id}b)">${puffs.map(([x, y, r], i) => `<circle class="puff p${i}" cx="${x}" cy="${y}" r="${r}" fill="url(#${id}c)"/>`).join('')}</g>
    <circle cx="86" cy="104" r="6" fill="#b46bff" filter="url(#${id}g)"/><circle cx="124" cy="104" r="6" fill="#b46bff" filter="url(#${id}g)"/>
    <circle cx="86" cy="104" r="2.4" fill="#fff"/><circle cx="124" cy="104" r="2.4" fill="#fff"/>
    <path d="M88 126 Q105 118 122 126" stroke="#b46bff" stroke-width="2" fill="none" opacity=".7"/>
  </g></svg>`;
}

const ENEMIES = {
  scav: {
    name: 'Летун-падальщик', hp: [11, 15],
    art: { w: 130, body: '#1b1426', body2: '#3a2b52', wing: '#0c0812', eye: '#e8d44d', wings: 'feather', mouth: 'beak', accent: '#b88a3a' },
    moves: {
      bite: { name: 'Укус', dmg: 6 },
      drain: { name: 'Пожирание осознания', dmg: 3, drain: 1 },
    },
    react: 'drain',
    ai: e => wpick(e, [['bite', 55], ['drain', 45]]),
  },
  leech: {
    name: 'Летун-кровосос', hp: [24, 28],
    art: { w: 165, body: '#2a0f18', body2: '#5e1f33', wing: '#12050a', eye: '#ff4d6d', horns: true, body3: 'round', wings: 'tatter', mouth: 'fangs' },
    moves: {
      suck: { name: 'Присасывание', dmg: 7, heal: 4 },
      slime: { name: 'Липкая тьма', dmg: 5, debuff: { weak: 1 } },
    },
    ai: e => wpick(e, [['suck', 55], ['slime', 45]]),
  },
  shade: {
    name: 'Тенистый летун', hp: [38, 42],
    art: { w: 190, body: '#0e1320', body2: '#28365a', wing: '#05070d', eye: '#7df9ff', eyeR: 6, body3: 'long', wings: 'bat', mouth: 'none', extras: ['tail'] },
    moves: {
      dive: { name: 'Пикирование', dmg: 11 },
      gather: { name: 'Сгущение тьмы', block: 8, buff: { strength: 2 } },
      claws: { name: 'Когти', dmg: 5, times: 2 },
    },
    ai: e => {
      const last = e.hist[e.hist.length - 1];
      if (!last || last === 'gather') return Math.random() < 0.5 ? 'claws' : 'dive';
      if (Math.random() < 0.6) return 'gather';
      return last === 'claws' ? 'dive' : 'claws';
    },
  },
  flock: {
    name: 'Летун стаи', hp: [18, 22],
    art: { w: 135, body: '#1c1c24', body2: '#44445a', wing: '#9adf70', eye: '#a8ff60', wings: 'insect', mouth: 'beak', accent: '#7a8a50', extras: ['antennae'] },
    moves: {
      peck: { name: 'Клюв', dmg: 7 },
      shriek: { name: 'Визг', dmg: 3, debuff: { vulnerable: 1 } },
      drain: { name: 'Пожирание осознания', dmg: 4, drain: 1 },
    },
    react: 'drain',
    ai: e => wpick(e, [['peck', 45], ['shriek', 25], ['drain', 30]]),
  },
  // ---------- редкие ----------
  whisper: {
    name: 'Шепчущий летун', hp: [30, 34], rare: true,
    art: { w: 160, body: '#12101e', body2: '#3b2f63', wing: '#06040c', eye: '#c9a8ff', eyeR: 4, tendrils: true, body3: 'hood', wings: 'tatter', mouth: 'none', extras: ['hoodtop'] },
    moves: {
      claw: { name: 'Когти', dmg: 7 },
      whisper: { name: 'Шёпот забвения', dmg: 8, curse: 'forget' },
      veil: { name: 'Пелена', block: 8, debuff: { weak: 1 } },
    },
    ai: e => wpick(e, [['claw', 45], ['whisper', 35], ['veil', 20]].filter(([k]) => !(k === 'whisper' && e.hist[e.hist.length - 1] === 'whisper'))),
  },
  tremor: {
    name: 'Летун дрожи', hp: [32, 36], rare: true,
    art: { w: 160, body: '#201508', body2: '#5a4218', wing: '#ffe14d', eye: '#ffe14d', eyes: [[86, 70], [114, 70], [100, 84]], body3: 'spiky', wings: 'insect', mouth: 'mandibles', extras: ['stripes'], accent: '#ffcf3a', cls: 'buzz' },
    moves: {
      shake: { name: 'Тряска', dmg: 4, times: 2 },
      tremor: { name: 'Дрожь в руках', dmg: 9, curse: 'tremor' },
      screech: { name: 'Скрежет', dmg: 3, debuff: { vulnerable: 1 } },
    },
    ai: e => wpick(e, [['shake', 45], ['tremor', 30], ['screech', 25]].filter(([k]) => !(k === 'tremor' && e.hist[e.hist.length - 1] === 'tremor'))),
  },
  thorn: {
    name: 'Колючий летун', hp: [36, 40], rare: true, thorns: 3,
    art: { w: 175, body: '#0f1f12', body2: '#2f5a2a', wing: '#050c06', eye: '#ff9a3c', horns: true, body3: 'spiky', wings: 'blade', mouth: 'fangs', extras: ['spikes'], accent: '#4f8a3a' },
    moves: {
      spike: { name: 'Колючий удар', dmg: 9 },
      harden: { name: 'Ощетиниться', block: 10 },
    },
    ai: e => wpick(e, [['spike', 60], ['harden', 40]]),
  },
  mother: {
    name: 'Мать стаи', hp: [44, 48], rare: true,
    art: { w: 205, body: '#1a1418', body2: '#4d3a44', wing: '#0a0709', eye: '#ff7ab8', eyeR: 7, eyes: [[86, 66], [114, 66], [92, 82], [108, 82]], body3: 'round', wings: 'feather', mouth: 'beak', extras: ['belly', 'crown'], accent: '#ff7ab8' },
    moves: {
      brood: { name: 'Выводок', block: 6, summon: ['scav'] },
      peck: { name: 'Клевок', dmg: 9 },
      feed: { name: 'Кормление', dmg: 5, drain: 2 },
    },
    ai: (e, cb) => {
      const kids = cb.enemies.filter(x => !x.dead && x !== e).length;
      if (e.turn === 0 || (kids === 0 && e.turn % 3 === 0)) return 'brood';
      return wpick(e, [['peck', 60], ['feed', 40]]);
    },
  },
  phantom: {
    name: 'Летун-призрак', hp: [26, 30], rare: true,
    art: { w: 150, body: '#1d2630', body2: '#6a8090', wing: '#0b1015', eye: '#e8fbff', cls: 'ghostly', body3: 'long', wings: 'tatter', mouth: 'maw', extras: ['tail'] },
    moves: {
      fade: { name: 'Бесплотность', dmg: 5, buff: { intangible: 1 } },
      strike: { name: 'Призрачный удар', dmg: 10 },
    },
    ai: e => e.hist[e.hist.length - 1] === 'fade' ? 'strike' : (Math.random() < 0.6 ? 'fade' : 'strike'),
  },

  // ---------- уникальные: только в событиях ----------
  lidia: {
    name: 'Лидия', hp: [36, 40], unique: true,
    art: { kind: 'human', w: 130, dress: '#2a1838', dress2: '#5a3a78', hair: '#120a08', skin: '#c08a60', eye: '#ffe08a', shawl: '#7a2a4a' },
    moves: {
      needle: { name: 'Взгляд-игла', dmg: 6, debuff: { vulnerable: 1 } },
      whirl: { name: 'Вихрь юбок', dmg: 4, times: 2 },
    },
    ai: e => e.hist[e.hist.length - 1] === 'needle' ? 'whirl' : wpick(e, [['needle', 50], ['whirl', 50]]),
  },
  rosa: {
    name: 'Роза', hp: [38, 42], unique: true,
    art: { kind: 'human', w: 130, dress: '#3a1410', dress2: '#8a3a24', hair: '#1a0c06', skin: '#b07850', eye: '#ffb070' },
    moves: {
      kick: { name: 'Удар с разворота', dmg: 10 },
      dance: { name: 'Защитный танец', block: 9, buff: { strength: 1 } },
    },
    ai: e => e.hist[e.hist.length - 1] === 'dance' ? 'kick' : wpick(e, [['kick', 60], ['dance', 40]]),
  },
  inorganic: {
    name: 'Неорганическое существо', hp: [72, 76], unique: true,
    art: { kind: 'crystal', w: 190, c1: '#7fd8ff', c2: '#2a4a9a' },
    moves: {
      pull: { name: 'Притяжение', dmg: 6, drain: 99 },
      shine: { name: 'Сияние', dmg: 5, times: 3 },
      crystal: { name: 'Кристаллизация', block: 15, buff: { strength: 1 } },
    },
    ai: e => { const l = e.hist[e.hist.length - 1]; return !l ? 'pull' : l === 'pull' ? 'shine' : l === 'shine' ? 'crystal' : 'pull'; },
  },
  diablero: {
    name: 'Дьяблеро в облике пса', hp: [64, 68], unique: true,
    art: { kind: 'beast', w: 240, fur: '#141016', fur2: '#3a2c40', eye: '#ff3a2a' },
    moves: {
      bite: { name: 'Укус дьяблеро', dmg: 12 },
      howl: { name: 'Вой', buff: { strength: 2 }, debuff: { weak: 1 } },
      leap: { name: 'Прыжок', dmg: 6, times: 2 },
    },
    ai: e => { const l = e.hist[e.hist.length - 1]; if (!l) return 'howl'; return l === 'howl' ? 'bite' : wpick(e, [['bite', 40], ['leap', 40], ['howl', 20]]); },
  },

  // ---------- мини-босс ----------
  cloud: {
    name: 'Тёмное облако', hp: [112, 116], elite: true, miniboss: true,
    art: { cloud: true, w: 250 },
    moves: {
      drizzle: { name: 'Ледяная морось', dmg: 5, times: 3 },
      thicken: { name: 'Сгущение', block: 12, buff: { strength: 1 } },
      envelop: { name: 'Обволакивание', dmg: 12 },
      cling: { name: 'Вцепляется!', dmg: 6, cling: true },
      sap: { name: 'Высасывание сил', dmg: 9, heal: 9, sap: 1 },
      nightmare: { name: 'Кошмарные сны', dmg: 7, addCards: { id: 'nightmare', n: 2, to: 'draw' } },
      reform: { name: 'Собирается заново', block: 10 },
    },
    // вцепляется, если в начале его хода на герое нет Защиты (проверка — в doEnemyMove)
    ai: e => {
      if (e.clinging) return e.hist[e.hist.length - 1] === 'sap' ? 'nightmare' : 'sap';
      const last = e.hist[e.hist.length - 1];
      if (!last) return 'drizzle';
      return wpick(e, [['drizzle', 35], ['thicken', 30], ['envelop', 35]]);
    },
  },

  // мини-босс-призыватель: один — всегда зовёт тенистого летуна; со свитой — усиливает её или лечит
  summoner: {
    name: 'Заклинатель теней', hp: [70, 74], elite: true, miniboss: true, summoner: true, reward: 'rattle',
    art: { w: 225, body: '#140b22', body2: '#463066', wing: '#07040e', eye: '#9dff6a', eyeR: 6, body3: 'hood', wings: 'tatter', mouth: 'maw', extras: ['hoodtop', 'tendrils'], accent: '#5fd18a' },
    moves: {
      summon: { name: 'Призыв тени', block: 8, summon: ['shade'] },
      empower: { name: 'Покров тьмы', groupBuff: { empower: 3, ward: 1 } },
      mend: { name: 'Подпитка тенью', mendAlly: 12 },
    },
    ai: (e, cb) => {
      const allies = cb.enemies.filter(x => !x.dead && x !== e);
      if (!allies.length) return 'summon';
      return Math.random() < 0.5 && allies.some(a => a.hp < a.maxHp) ? 'mend' : 'empower';
    },
  },

  // ---------- элиты ----------
  gnat: {
    name: 'Страж сновидения', hp: [80, 84], elite: true,
    art: { w: 240, body: '#10200f', body2: '#3a5a22', wing: '#c0ff80', eye: '#ffb000', eyeR: 7,
           eyes: [[80, 66], [120, 66], [100, 80], [90, 58], [110, 58]], tendrils: true, body3: 'round', wings: 'insect', mouth: 'mandibles', extras: ['antennae'] },
    moves: {
      swarm: { name: 'Рой', dmg: 6, times: 3 },
      sting: { name: 'Жало', dmg: 16 },
      cocoon: { name: 'Кокон сновидения', block: 14, buff: { strength: 2 }, addCards: { id: 'mind', n: 2, to: 'discard' } },
    },
    ai: e => {
      const last = e.hist[e.hist.length - 1];
      if (!last) return 'swarm';
      if (last === 'cocoon') return Math.random() < 0.5 ? 'swarm' : 'sting';
      if (last === 'sting') return 'cocoon';
      return Math.random() < 0.55 ? 'cocoon' : 'sting';
    },
  },
  ancient: {
    name: 'Древний летун', hp: [94, 98], elite: true,
    art: { w: 250, body: '#1a0d26', body2: '#4b2270', wing: '#08030d', eye: '#ff3df0', eyeR: 7, horns: true, body3: 'spiky', wings: 'feather', mouth: 'maw', extras: ['crown'], accent: '#8a5ac9' },
    moves: {
      shroud: { name: 'Тяжёлая пелена', debuff: { weak: 2, vulnerable: 2 } },
      wing: { name: 'Удар крылом', dmg: 18 },
      devour: { name: 'Великое пожирание', dmg: 10, drain: 99 },
      brood: { name: 'Высиживание', block: 12, buff: { strength: 2 } },
    },
    react: 'devour',
    ai: e => {
      const last = e.hist[e.hist.length - 1];
      if (!last) return 'shroud';
      if (last === 'shroud' || last === 'brood') return Math.random() < 0.5 ? 'wing' : 'devour';
      if (last === 'wing') return Math.random() < 0.5 ? 'devour' : 'brood';
      return 'brood';
    },
  },
  // ---------- босс ----------
  boss: {
    name: 'Хозяин летунов', hp: [170, 170], boss: true, phase2At: 0.5,
    art: { w: 330, body: '#07050d', body2: '#2c1846', wing: '#020104', eye: '#ff2a2a', eyeR: 8, horns: true, tendrils: true,
           eyes: [[84, 64], [116, 64], [100, 80], [72, 84], [128, 84], [100, 52]], cls: 'boss-svg', mouth: 'maw', extras: ['crown', 'spikes'], accent: '#5a0a14' },
    moves: {
      // фаза 1: кормится стаей и осознанием
      descend: { name: 'Нисхождение', block: 12, summon: ['scav', 'scav'] },
      devour: { name: 'Пожирание осознания', dmg: 11, drain: 3, drainStr: 2 },
      impose: { name: 'Навязывание разума', debuff: { weak: 2 }, addCards: { id: 'mind', n: 2, to: 'draw' } },
      swarm: { name: 'Чёрный рой', dmg: 4, times: 3 },
      cocoon: { name: 'Тёмный кокон', block: 15, buff: { strength: 2 } },
      call: { name: 'Зов стаи', block: 10, summon: ['scav', 'scav'] },
      // фаза 2: истинный облик — без стаи, но с тяжёлыми ударами по расписанию
      rebirth: { name: 'Истинный облик', block: 20, cleanse: true, summon: ['flock'] },
      rend: { name: 'Разрыв тени', dmg: 6, times: 2 },
      feast: { name: 'Великое пиршество', dmg: 12, drain: 99, drainStr: 2 },
      gaze: { name: 'Взгляд бездны', block: 12, debuff: { weak: 1 } },
      eclipse: { name: 'Затмение', dmg: 22 },
    },
    react: e => e.phase2 ? 'feast' : 'devour',
    ai: (e, cb) => {
      if (e.phase2) {
        const list = ['rend', 'feast', 'gaze', 'eclipse'];
        return list[(e.p2turn++) % list.length];
      }
      if (e.turn === 0) return 'descend';
      const minions = cb.enemies.filter(x => !x.dead && x !== e).length;
      if (e.turn % 5 === 0 && minions === 0) return 'call';
      return cycle(e, ['devour', 'impose', 'swarm', 'cocoon'], 0, 1);
    },
  },
};

// Взвешенный случайный выбор хода; один ход не повторяется 3 раза подряд
function wpick(e, weights) {
  const h = e.hist;
  let opts = weights.filter(([k]) => !(h.length >= 2 && h[h.length - 1] === k && h[h.length - 2] === k));
  const total = opts.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of opts) { r -= w; if (r < 0) return k; }
  return opts[0][0];
}
// Циклический шаблон ходов; skip — сколько первых ходов пропустить при отсчёте
function cycle(e, list, offset = 0, skip = 0) {
  return list[(e.turn - skip + offset + list.length * 10) % list.length];
}

const ENCOUNTERS = {
  easy: [['scav', 'scav'], ['leech'], ['scav', 'flock']],
  hard: [['shade'], ['scav', 'leech'], ['scav', 'scav', 'scav'], ['shade', 'scav'], ['leech', 'leech'], ['flock', 'flock']],
  elite: [['gnat'], ['ancient'], ['flock', 'flock', 'flock'], ['cloud'], ['summoner', 'shade']],
  rare: [['whisper', 'scav'], ['tremor', 'scav'], ['thorn'], ['mother'], ['phantom', 'scav']],
  boss: [['boss']],
};

// ============================================================
//  События «?»
//  act(api) возвращает массив опций {label, sub, can, go(done)}
// ============================================================
const EVENTS = [
  {
    id: 'catalina', title: 'Ла Каталина', art: '🦅',
    text: 'Над тропой кружит огромная чёрная птица. Она садится на камень и оборачивается женщиной с тяжёлым, немигающим взглядом. Это колдунья Ла Каталина — она давно охотится за учеником дона Хуана.',
    options: api => [
      { label: 'Выдержать её взгляд', sub: 'Потерять 8 здоровья. Получить реликвию.',
        go: done => { api.damage(8); const r = api.randomRelic(); done(r ? `Ты не отвёл глаз. Колдунья отступила и обронила: ${RELICS[r].icon} ${RELICS[r].name}.` : 'Ты не отвёл глаз, и колдунья отступила.'); } },
      { label: 'Откупиться', sub: 'Отдать 40 песо. Улучшить случайную карту.', can: () => api.run.gold >= 40,
        go: done => { api.run.gold -= 40; const c = api.upgradeRandom(1); done(c.length ? `Каталина взяла песо и, смеясь, коснулась твоего лба. Улучшено: ${c.join(', ')}.` : 'Каталина взяла песо и исчезла.'); } },
      { label: 'Бежать', sub: 'Ничего не происходит.', go: done => done('Ты бежал, не оглядываясь, пока крики птицы не стихли.') },
    ],
  },
  {
    id: 'humito', title: 'Дымок', art: '💨',
    text: 'Дон Хуан достаёт трубку и маленький мешочек. «Дымок — мой союзник, — говорит он. — Он забирает лишнее. Но он требует уважения».',
    options: api => [
      { label: 'Выкурить трубку', sub: 'Удалить карту из колоды.', can: () => api.run.deck.length > 1,
        go: done => api.removeCard(name => done(name ? `Дымок унёс с собой «${name}».` : 'Ты передумал.')) },
      { label: 'Уважительно отказаться', sub: 'Восстановить 12 здоровья.',
        go: done => { api.heal(12); done('Дон Хуан кивает: «Уважение — тоже путь». Ты отдыхаешь у костра.'); } },
    ],
  },
  {
    id: 'mescalito', title: 'Мескалито у реки', art: '🌵',
    text: 'В свете луны у воды играет светящийся пёс. Ты понимаешь: это Мескалито, учитель, который может принять тебя — или отвергнуть.',
    options: api => [
      { label: 'Играть с Мескалито', sub: 'Потерять 10 здоровья. Выбрать одну из 3 редких карт.',
        go: done => { api.damage(10); api.chooseCard('rare', name => done(name ? `Мескалито принял тебя. Ты получил «${name}».` : 'Мескалито принял тебя, но ты ничего не взял.')); } },
      { label: 'Наблюдать издали', sub: 'Выбрать одну из 3 обычных карт.',
        go: done => api.chooseCard('common', name => done(name ? `Ты запомнил увиденное: «${name}».` : 'Ты просто смотрел.')) },
    ],
  },
  {
    id: 'waterfall', title: 'Водопад Хенаро', art: '🏞️',
    text: 'Дон Хенаро карабкается по отвесной скале водопада, цепляясь за струи воды светящимися волокнами. Он замирает на краю и хохочет.',
    options: api => [
      { label: 'Смотреть и учиться', sub: 'Улучшить 2 случайные карты.',
        go: done => { const c = api.upgradeRandom(2); done(c.length ? `Ты увидел равновесие воина. Улучшено: ${c.join(', ')}.` : 'Ты смотрел, но всё уже знаешь.'); } },
      { label: 'Смеяться вместе с ним', sub: 'Восстановить 20 здоровья.',
        go: done => { api.heal(20); done('Хенаро спрыгивает и хлопает тебя по спине. Смех лечит.'); } },
    ],
  },
  {
    id: 'spot', title: 'Поиск своего места', art: '🌙',
    text: '«Найди своё место на этой веранде, — сказал дон Хуан. — Место, где ты силён». Всю ночь ты ползаешь по полу, всматриваясь в цвета.',
    options: api => [
      { label: 'Искать до рассвета', sub: 'Потерять 6 здоровья. Выбрать одну из 3 необычных карт.',
        go: done => { api.damage(6); api.chooseCard('uncommon', name => done(name ? `На рассвете ты нашёл своё место: «${name}».` : 'На рассвете ты просто уснул.')); } },
      { label: 'Довериться цвету', sub: 'Зеленовато-жёлтое — твоё, тёмно-пурпурное — враг. 60%: навсегда +1 Осознание в начале боя. 40%: −7 здоровья и Слабость в следующем бою.',
        go: done => {
          if (api.chance(.6)) { api.run.bonusAware = (api.run.bonusAware || 0) + 1; done('Пол под тобой светится зеленовато-жёлтым. Ты сел на своё место — и сила разливается по телу. Теперь в начале каждого боя +1 Осознание.'); }
          else { api.damage(7); api.run.flags.weakNext = true; done('Пурпурная тень обманула тебя: ты сел на место врага. Тошнота и слабость не отпустят до утра (Слабость в следующем бою).'); }
        } },
      { label: 'Отметить место врага', sub: 'Потерять 5 максимального здоровья. Уникальная реликвия «Камень с веранды».',
        go: done => { api.maxHp(-5); api.relic('porch'); done('Ты нарочно сидишь на месте врага, пока не запомнишь, как к тебе подкрадывается слабость. Дон Хуан кладёт на это место камень: 🧱 «Камень с веранды» — самый сильный летун в каждом бою начинает со Слабостью.'); } },
      { label: 'Уснуть на полпути', sub: 'Восстановить 12 здоровья.',
        go: done => { api.heal(12); done('Ты сдаёшься и засыпаешь там, где упал. Дон Хуан качает головой, но не будит тебя.'); } },
    ],
  },
  {
    id: 'curandera', title: 'Курандера', art: '🌿', paid: true,
    text: 'У дороги сидит старая знахарка. Над её жаровней вьётся горький дым копала. «Лечу тело и чищу путь, — говорит она. — Но даром ничего не бывает».',
    options: api => [
      { label: 'Лечение травами', sub: 'Заплатить 45 песо. Восстановить 25 здоровья.', can: () => api.run.gold >= 45,
        go: done => { api.pay(45); api.heal(25); done('Отвар горький, но по телу разливается тепло.'); } },
      { label: 'Очищение пути', sub: 'Заплатить 80 песо. Удалить карту из колоды.', can: () => api.run.gold >= 80 && api.run.deck.length > 1,
        go: done => api.removeCard(n => { if (n) api.pay(80); done(n ? `Знахарка сжигает «${n}» в дыму копала.` : 'Ты передумал, и знахарка лишь усмехнулась.'); }) },
      { label: 'Снять порчу', sub: 'Заплатить 60 песо. Снять все проклятия.', can: () => api.run.gold >= 60 && api.run.curses.length > 0,
        go: done => { api.pay(60); api.uncurse(); done('Знахарка обкуривает тебя дымом и сбрызгивает святой водой. Тяжесть уходит.'); } },
      { label: 'Уйти', sub: 'Ничего не происходит.', go: done => done('Ты вежливо кланяешься и идёшь дальше.') },
    ],
  },
  {
    id: 'market', title: 'Ночной рынок в Оахаке', art: '🏮', paid: true,
    text: 'Между рядами с перцем и глиняной посудой торгуют странными вещами. Продавец в тёмных очках шепчет: «У меня есть то, чего нет у других. Но цена — настоящая».',
    options: api => [
      { label: 'Талисман из-под прилавка', sub: 'Заплатить 110 песо. Получить случайную реликвию.', can: () => api.run.gold >= 110,
        go: done => { api.pay(110); const r = api.randomRelic(); done(r ? `Продавец заворачивает в газету ${RELICS[r].icon} «${RELICS[r].name}».` : 'Продавец разводит руками и возвращает часть денег.'); } },
      { label: 'Свиток учения', sub: 'Заплатить 65 песо. Выбрать одну из 3 необычных карт.', can: () => api.run.gold >= 65,
        go: done => api.chooseCard('uncommon', n => { if (n) api.pay(65); done(n ? `Ты разбираешь записи: «${n}».` : 'Ничего не приглянулось.'); }) },
      { label: 'Флакон без этикетки', sub: 'Заплатить 40 песо. Получить случайное зелье.', can: () => api.run.gold >= 40 && api.hasPotionSlot(),
        go: done => { api.pay(40); const p = api.randomPotion(); done(`Во флаконе плещется ${POTIONS[p].name.toLowerCase()}.`); } },
      { label: 'Пройти мимо', sub: 'Сохранить деньги.', go: done => done('Ты уходишь, чувствуя на спине чей-то взгляд.') },
    ],
  },
  {
    id: 'cave', title: 'Пещера сновидящих', art: '🕯️',
    text: 'В скале — узкий вход. Внутри горят свечи и лежит старая циновка. Здесь, говорят, сновидящие учились не терять себя во сне. Но ночь в пещере вытягивает силы.',
    options: api => [
      { label: 'Остаться на ночь', sub: 'Потерять 8 здоровья. Научиться Созерцанию на местах силы.',
        go: done => { api.damage(8); api.unlockContemplation(); done('Во сне ты видишь свои руки и не теряешь их. Теперь у каждого костра ты можешь созерцать: отрешиться от лишнего или накопить осознание.'); } },
      { label: 'Заплатить проводнику', sub: 'Заплатить 35 песо. Улучшить 2 случайные карты.', can: () => api.run.gold >= 35,
        go: done => { api.pay(35); const c = api.upgradeRandom(2); done(c.length ? `Проводник показывает тайные знаки на стенах. Улучшено: ${c.join(', ')}.` : 'Проводник рассказывает то, что ты уже знаешь.'); } },
      { label: 'Уйти до темноты', sub: 'Ничего не происходит.', go: done => done('Ты уходишь, не оглядываясь на огоньки свечей.') },
    ],
  },
  {
    id: 'shadows', title: 'Тени у костра', art: '🔥',
    text: 'Пламя костра выхватывает из темноты чьи-то быстрые тени. Летуны шарят по краю света, но не решаются подойти ближе.',
    options: api => [
      { label: 'Шагнуть в темноту', sub: 'Сразиться с летунами. Награда — 50 песо сверху.',
        go: done => api.fight(['shade', 'scav'], 50) },
      { label: 'Подбросить веток', sub: 'Восстановить 8 здоровья.',
        go: done => { api.heal(8); done('Огонь разгорается, и тени отступают.'); } },
    ],
  },
  // ================= события по книгам =================
  {
    id: 'gorda', title: 'Ла Горда', art: '🧕', once: true,
    text: 'У колодца сидит женщина, похожая на округлую тень. Это Ла Горда — когда-то толстая и злая, теперь безупречная ученица нагваля. «Ты всё ещё индульгируешь, Карлитос», — смеётся она.',
    options: api => [
      { label: 'Учиться сталкингу', sub: 'Получить уникальную карту «Урок Ла Горды».',
        go: done => { api.addCard('gorda'); done('Ла Горда показывает, как подкрадываться к собственным привычкам. Ты получил «Урок Ла Горды».'); } },
      { label: 'Помочь ей в доме сновидений', sub: '+6 к максимальному здоровью.',
        go: done => { api.maxHp(6); done('Вы до рассвета чините крышу. Тело наливается тяжёлой, спокойной силой.'); } },
      { label: 'Поспорить с ней', sub: '50%: улучшить 2 карты. 50%: потерять 8 здоровья.',
        go: done => { if (api.chance(.5)) { const c = api.upgradeRandom(2); done(`Спор оказался уроком. Улучшено: ${c.join(', ') || 'ничего'}.`); } else { api.damage(8); done('Ла Горда толкает тебя в колодец. «Вот тебе и спор», — хохочет она.'); } } },
    ],
  },
  {
    id: 'pablito', title: 'Паблито и стул', art: '🪑', once: true,
    text: 'Паблито, ученик дона Хенаро, сколачивает стул и дрожит от страха: ему предстоит прыгнуть в бездну. «Пойдём со мной, — шепчет он. — Вдвоём не так страшно».',
    options: api => [
      { label: 'Прыгнуть вместе', sub: '65%: уникальная карта «Прыжок Паблито». 35%: потерять 12 здоровья.',
        go: done => { if (api.chance(.65)) { api.addCard('pablito'); done('Вы прыгаете — и мир собирается заново. Ты получил «Прыжок Паблито».'); } else { api.damage(12); done('Ты падаешь в колючий кустарник. Паблито уже сидит наверху на своём стуле.'); } } },
      { label: 'Выпить с ним пульке', sub: 'Восстановить 15 здоровья.',
        go: done => { api.heal(15); done('Пульке кислое, разговор долгий. Страх Паблито передаётся тебе — и уходит.'); } },
      { label: 'Купить его стул', sub: 'Заплатить 40 песо. Удалить карту из колоды.', can: () => api.run.gold >= 40 && api.run.deck.length > 1,
        go: done => api.removeCard(n => { if (n) api.gold(-40); done(n ? `Ты сжигаешь стул вместе с «${n}».` : 'Паблито обиженно уносит стул.'); }) },
    ],
  },
  {
    id: 'tenant', title: 'Арендатор', art: '🕯️', once: true,
    text: 'В церкви маленького городка тебя ждёт женщина в старинной одежде. Это Арендатор — бросивший вызов смерти. Он живёт веками, одалживая энергию у нагвалей. «Дай мне немного своей энергии, — говорит она, — и я одарю тебя».',
    options: api => [
      { label: 'Отдать энергию', sub: '−8 к максимальному здоровью. Уникальная реликвия «Дар Арендатора».',
        go: done => { api.maxHp(-8); api.relic('tenant'); done('Тебя пробирает холод. В ладони остаётся ключ: 🗝️ «Дар Арендатора» — 3 Осознания в начале каждого боя.'); } },
      { label: 'Попросить знание даром', sub: '40%: выбрать одну из 3 редких карт. 60%: проклятие забвения.',
        go: done => { if (api.chance(.4)) api.chooseCard('rare', n => done(n ? `Арендатор улыбается и шепчет: «${n}».` : 'Ты отказываешься от знания.')); else { api.curse('forget'); done('Арендатор смеётся. Что-то в памяти тускнеет: 🕸️ проклятие забвения.'); } } },
      { label: 'Уйти', sub: 'Ничего не происходит.', go: done => done('Ты выходишь из церкви. Колокол звонит тебе вслед.') },
    ],
  },
  {
    id: 'sisters', title: 'Сестрички', art: '👯', once: true,
    text: 'Лидия и Роза, «сестрички» из отряда нагваля, встречают тебя на тропе. Дон Хуан велел им проверить тебя — и они относятся к поручению серьёзно.',
    options: api => [
      { label: 'Принять вызов', sub: 'Бой с сестричками. Награда — уникальная реликвия «Платок сестричек».',
        go: () => api.fightFor(['lidia', 'rosa'], { type: 'relic', id: 'scarf' }) },
      { label: 'Сбежать', sub: 'Потерять 6 здоровья.', go: done => { api.damage(6); done('Ты бежишь, а камни летят вдогонку.'); } },
    ],
  },
  {
    id: 'scout', title: 'Голубой лазутчик', art: '🔷', once: true,
    text: 'Во сне ты видишь голубую искру — лазутчика из мира неорганических существ. Она поймана в кристаллической клетке. Если вырвать её, неорганические не простят.',
    options: api => [
      { label: 'Вырвать лазутчика', sub: '50%: уникальная карта «Голубой лазутчик». 50%: бой с неорганическим существом (награда — карта и уникальная реликвия).',
        go: done => { if (api.chance(.5)) { api.addCard('scout'); done('Искра ныряет к тебе в грудь. Ты получил «Голубой лазутчик».'); } else api.fightFor(['inorganic'], [{ type: 'cardFixed', id: 'scout' }, { type: 'relic', id: 'shard' }]); } },
      { label: 'Проснуться', sub: 'Получить 1 случайное зелье.', can: () => api.hasPotionSlot(),
        go: done => { const p = api.randomPotion(); done(`Ты просыпаешься, сжимая флакон: ${POTIONS[p].name.toLowerCase()}.`); } },
      { label: 'Наблюдать', sub: 'Ничего не происходит.', go: done => done('Клетка тает. Голубая искра провожает тебя взглядом.') },
    ],
  },
  {
    id: 'julian', title: 'Нагваль Хулиан', art: '🎭', once: true,
    text: 'В тени проходит актёр в старомодном костюме. Это призрачная память о нагвале Хулиане — учителе дона Хуана, великом артисте и трикстере. «Хочешь увидеть представление?» — кланяется он.',
    options: api => [
      { label: 'Смотреть представление', sub: 'Улучшить 3 случайные карты. 25%: Хулиан «одалживает» 30 песо.',
        go: done => { const c = api.upgradeRandom(3); let t = `Сцена сменяет сцену. Улучшено: ${c.join(', ') || 'ничего'}.`; if (api.chance(.25)) { api.gold(-30); t += ' Кошелёк, правда, стал легче на 30 песо.'; } done(t); } },
      { label: 'Попросить маску', sub: 'Потерять 10 здоровья. Уникальная реликвия «Маска нагваля Хулиана».',
        go: done => { api.damage(10); api.relic('mask'); done('Хулиан срывает маску со своего лица и надевает на тебя. Больно. 🎭 «Маска нагваля Хулиана».'); } },
      { label: 'Аплодировать и уйти', sub: 'Восстановить 8 здоровья.', go: done => { api.heal(8); done('Смех лечит. Хулиан раскланивается и исчезает.'); } },
    ],
  },
  {
    id: 'ixtlan', title: 'Путешествие в Икстлан', art: '🛤️', once: true,
    text: 'Попутчик рассказывает, что идёт домой, в Икстлан, — и никогда туда не дойдёт. Все встречные кажутся ему призраками. «А ты куда идёшь?» — спрашивает он.',
    options: api => [
      { label: 'Повернуть домой', sub: 'Полностью восстановить здоровье. Потерять 60 песо.', can: () => api.run.gold >= 60,
        go: done => { api.gold(-60); api.heal(999); done('Ты почти видишь дом. Почти. Тело отдыхает, а кошелёк — нет.'); } },
      { label: 'Идти с ним', sub: 'Уникальная карта «Дорога в Икстлан».',
        go: done => { api.addCard('ixtlan'); done('Вы идёте вместе, пока дорога не растворяется. Ты получил «Дорогу в Икстлан».'); } },
      { label: 'Идти дальше по пути знания', sub: '+3 к максимальному здоровью.', go: done => { api.maxHp(3); done('Ты прощаешься с попутчиком. Для тебя нет дороги назад — только путь знания.'); } },
    ],
  },
  {
    id: 'crow', title: 'Превращение в ворону', art: '🐦', once: true,
    text: 'Дон Хуан протягивает трубку с дымком. «Сегодня ты станешь вороной. Смотри глазами вороны — и ничего не бойся».',
    options: api => [
      { label: 'Выкурить и взлететь', sub: '70%: уникальная реликвия «Глаза вороны». 30%: потерять 14 здоровья.',
        go: done => { if (api.chance(.7)) { api.relic('crow'); done('Ты летишь над пустыней и видишь летунов сверху. 🌘 «Глаза вороны» остаются с тобой.'); } else { api.damage(14); done('Вороны приняли тебя за чужака. Ты приходишь в себя в пыли, весь в царапинах.'); } } },
      { label: 'Только наблюдать за воронами', sub: 'Выбрать одну из 3 необычных карт.',
        go: done => api.chooseCard('uncommon', n => done(n ? `Ты учишься у птиц: «${n}».` : 'Вороны улетели.')) },
      { label: 'Отказаться', sub: 'Ничего не происходит.', go: done => done('«Ты ещё не готов», — вздыхает дон Хуан.') },
    ],
  },
  {
    id: 'coyote', title: 'Говорящий койот', art: '🐺', once: true,
    text: 'На закате к тебе подходит койот — и заговаривает человеческим голосом. Дон Хуан говорил, что однажды мир «остановится» и с тобой заговорят звери.',
    options: api => [
      { label: 'Ответить койоту', sub: '60%: уникальная карта «Разговор с койотом». 40%: койот утаскивает 25 песо.',
        go: done => { if (api.chance(.6)) { api.addCard('coyote'); done('Вы говорите до темноты. Ты получил «Разговор с койотом».'); } else { api.gold(-25); done('Пока ты подбирал слова, койот стащил кошелёк и скрылся.'); } } },
      { label: 'Покормить его', sub: 'Заплатить 15 песо. Получить 1 зелье.', can: () => api.run.gold >= 15 && api.hasPotionSlot(),
        go: done => { api.gold(-15); const p = api.randomPotion(); done(`Койот приносит тебе в зубах флакон: ${POTIONS[p].name.toLowerCase()}.`); } },
      { label: 'Отвернуться', sub: 'Ничего не происходит.', go: done => done('Мир снова начинает двигаться. Койот уходит.') },
    ],
  },
  {
    id: 'diablero', title: 'Ночь дьяблеро', art: '🐕', once: true,
    text: 'Возле хижины бродит огромный чёрный пёс с горящими глазами. Дон Хуан шепчет: «Это не собака. Это дьяблеро, колдун. Он пришёл за тобой».',
    options: api => [
      { label: 'Сразиться', sub: 'Бой с дьяблеро. Награда — уникальная реликвия «Клык дьяблеро».',
        go: () => api.fightFor(['diablero'], { type: 'relic', id: 'fang' }) },
      { label: 'Спрятаться в круге силы', sub: '50%: ничего не случится. 50%: проклятие «Дрожащие руки».',
        go: done => { if (api.chance(.5)) done('Пёс кружит до рассвета, но не может переступить круг.'); else { api.curse('tremor'); done('Пёс воет так, что дрожат руки. 🖐️ Проклятие «Дрожащие руки».'); } } },
    ],
  },
  {
    id: 'lecture', title: 'Лекция в UCLA', art: '🎓', once: true,
    text: 'Тебя пригласили прочитать лекцию по антропологии. Аудитория забита: студенты хотят услышать про дона Хуана, а профессора — уличить тебя во вранье.',
    options: api => [
      { label: 'Академичная лекция', sub: '+75 песо гонорара. 30%: скептики выматывают — −5 к максимальному здоровью.',
        go: done => { api.gold(75); if (api.chance(.3)) { api.maxHp(-5); done('Гонорар получен, но вопросы скептиков высосали из тебя силы.'); } else done('Сухо, по делу, со сносками. Гонорар — твой.'); } },
      { label: 'Рассказать правду о летунах', sub: 'Уникальная карта «Лекция о летунах». 50%: ректор лишает гонорара (−30 песо).',
        go: done => { api.addCard('lecture'); if (api.chance(.5)) { api.gold(-30); done('Зал замер. Ректор в ярости и выставляет счёт за аренду зала. Зато ты получил «Лекцию о летунах».'); } else done('Студенты аплодируют стоя. Ты получил «Лекцию о летунах».'); } },
      { label: 'Сбежать через окно', sub: 'Восстановить 10 здоровья.', go: done => { api.heal(10); done('Дон Хенаро ждал тебя под окном. Вы смеётесь всю дорогу.'); } },
    ],
  },
];
