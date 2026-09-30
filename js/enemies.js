'use strict';
// ============================================================
//  Летуны: рисунок (SVG), ходы и ИИ
// ============================================================

let svgSeq = 0;
function flyerSVG(o) {
  const id = 'fl' + (svgSeq++);
  const eyes = (o.eyes || [[88, 70], [112, 70]]).map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="${o.eyeR || 5}" fill="${o.eye}" filter="url(#${id}g)"/>` +
    `<circle cx="${x}" cy="${y}" r="${(o.eyeR || 5) * 0.4}" fill="#fff"/>`).join('');
  const horns = o.horns ? `<path d="M84 52 L74 22 L92 46 Z M116 52 L126 22 L108 46 Z" fill="${o.body}"/>` : '';
  const tendrils = o.tendrils ? `<g class="tendrils" stroke="${o.body}" stroke-width="5" fill="none" stroke-linecap="round">
      <path d="M90 125 Q80 150 92 172"/><path d="M100 128 Q104 158 96 185"/><path d="M110 125 Q122 150 108 172"/></g>` : '';
  const wing = `<path d="M100 78 C 70 18, 25 12, 4 40 C 22 44, 26 58, 12 78 C 32 74, 40 88, 30 108 C 52 96, 66 104, 72 122 C 82 110, 92 98, 100 96 Z" fill="url(#${id}w)" stroke="${o.edge || '#000'}" stroke-width="1.5"/>`;
  return `<svg viewBox="0 0 200 190" class="flyer-svg ${o.cls || ''}" style="width:${o.w}px">
  <defs>
    <radialGradient id="${id}b" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="${o.body2}"/><stop offset="1" stop-color="${o.body}"/></radialGradient>
    <linearGradient id="${id}w" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.body}"/><stop offset="1" stop-color="${o.wing}"/></linearGradient>
    <filter id="${id}g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <ellipse cx="100" cy="182" rx="40" ry="6" fill="#000" opacity=".35" class="shadow"/>
  <g class="bob">
    <g class="wing wl">${wing}</g>
    <g transform="translate(200,0) scale(-1,1)"><g class="wing wl">${wing}</g></g>
    ${tendrils}${horns}
    <path d="M100 40 C 126 40, 134 70, 130 100 C 126 130, 112 150, 100 160 C 88 150, 74 130, 70 100 C 66 70, 74 40, 100 40 Z" fill="url(#${id}b)"/>
    <path d="M86 92 Q100 104 114 92" stroke="${o.eye}" stroke-width="2" fill="none" opacity=".7"/>
    ${eyes}
  </g></svg>`;
}

const ENEMIES = {
  scav: {
    name: 'Летун-падальщик', hp: [11, 15],
    art: { w: 130, body: '#1b1426', body2: '#3a2b52', wing: '#0c0812', eye: '#e8d44d' },
    moves: {
      bite: { name: 'Укус', dmg: 6 },
      drain: { name: 'Пожирание осознания', dmg: 3, drain: 1 },
    },
    ai: e => wpick(e, [['bite', 55], ['drain', 45]]),
  },
  leech: {
    name: 'Летун-кровосос', hp: [24, 28],
    art: { w: 165, body: '#2a0f18', body2: '#5e1f33', wing: '#12050a', eye: '#ff4d6d', horns: true },
    moves: {
      suck: { name: 'Присасывание', dmg: 7, heal: 4 },
      slime: { name: 'Липкая тьма', dmg: 5, debuff: { weak: 1 } },
    },
    ai: e => wpick(e, [['suck', 55], ['slime', 45]]),
  },
  shade: {
    name: 'Тенистый летун', hp: [38, 42],
    art: { w: 190, body: '#0e1320', body2: '#28365a', wing: '#05070d', eye: '#7df9ff', eyeR: 6 },
    moves: {
      dive: { name: 'Пикирование', dmg: 11 },
      gather: { name: 'Сгущение тьмы', block: 8, buff: { strength: 2 } },
      claws: { name: 'Когти', dmg: 5, times: 2 },
    },
    ai: e => cycle(e, ['claws', 'gather', 'dive'], e.seed % 3),
  },
  flock: {
    name: 'Летун стаи', hp: [18, 22],
    art: { w: 135, body: '#1c1c24', body2: '#44445a', wing: '#09090c', eye: '#a8ff60' },
    moves: {
      peck: { name: 'Клюв', dmg: 7 },
      shriek: { name: 'Визг', dmg: 3, debuff: { vulnerable: 1 } },
      drain: { name: 'Пожирание осознания', dmg: 4, drain: 1 },
    },
    ai: e => wpick(e, [['peck', 45], ['shriek', 25], ['drain', 30]]),
  },
  // ---------- элиты ----------
  gnat: {
    name: 'Страж сновидения', hp: [80, 84], elite: true,
    art: { w: 240, body: '#10200f', body2: '#3a5a22', wing: '#07100a', eye: '#ffb000', eyeR: 7,
           eyes: [[80, 66], [120, 66], [100, 80], [90, 58], [110, 58]], tendrils: true },
    moves: {
      swarm: { name: 'Рой', dmg: 6, times: 3 },
      sting: { name: 'Жало', dmg: 16 },
      cocoon: { name: 'Кокон сновидения', block: 14, buff: { strength: 2 }, addCards: { id: 'mind', n: 2, to: 'discard' } },
    },
    ai: e => cycle(e, ['swarm', 'cocoon', 'sting']),
  },
  ancient: {
    name: 'Древний летун', hp: [94, 98], elite: true,
    art: { w: 250, body: '#1a0d26', body2: '#4b2270', wing: '#08030d', eye: '#ff3df0', eyeR: 7, horns: true },
    moves: {
      shroud: { name: 'Тяжёлая пелена', debuff: { weak: 2, vulnerable: 2 } },
      wing: { name: 'Удар крылом', dmg: 18 },
      devour: { name: 'Великое пожирание', dmg: 10, drain: 99 },
      brood: { name: 'Высиживание', block: 12, buff: { strength: 2 } },
    },
    ai: e => e.turn === 0 ? 'shroud' : cycle(e, ['wing', 'devour', 'brood'], 0, 1),
  },
  // ---------- босс ----------
  boss: {
    name: 'Хозяин летунов', hp: [210, 210], boss: true,
    art: { w: 330, body: '#07050d', body2: '#2c1846', wing: '#020104', eye: '#ff2a2a', eyeR: 8, horns: true, tendrils: true,
           eyes: [[84, 64], [116, 64], [100, 80], [72, 84], [128, 84], [100, 52]], cls: 'boss-svg' },
    moves: {
      descend: { name: 'Нисхождение', block: 15, summon: ['scav', 'scav'] },
      devour: { name: 'Пожирание осознания', dmg: 15, drain: 99 },
      impose: { name: 'Навязывание разума', debuff: { weak: 2 }, addCards: { id: 'mind', n: 3, to: 'draw' } },
      swarm: { name: 'Чёрный рой', dmg: 5, times: 4 },
      cocoon: { name: 'Тёмный кокон', block: 20, buff: { strength: 3 } },
      call: { name: 'Зов стаи', block: 10, summon: ['scav', 'scav'] },
    },
    ai: (e, cb) => {
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
  elite: [['gnat'], ['ancient'], ['flock', 'flock', 'flock']],
  boss: [['boss']],
};

// ============================================================
//  События «?»
//  act(api) возвращает массив опций {label, sub, can, go(done)}
// ============================================================
const EVENTS = [
  {
    id: 'catalina', title: 'Ла Каталина', art: '🐦‍⬛',
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
      { label: 'Уснуть на «месте врага»', sub: 'Потерять 5 максимального здоровья. Получить 75 песо.',
        go: done => { api.run.maxHp -= 5; api.run.hp = Math.min(api.run.hp, api.run.maxHp); api.run.gold += 75; done('Ты проснулся разбитым. Дон Хуан смеётся и суёт тебе в карман монеты.'); } },
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
];
