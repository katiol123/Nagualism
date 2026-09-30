'use strict';
// ============================================================
//  Герои
// ============================================================
const HEROES = {
  castaneda: {
    id: 'castaneda', name: 'Карлос Кастанеда', title: 'Ученик', playable: true,
    hp: 72, gold: 99,
    body: 'assets/heroes/castaneda_body.png', portrait: 'assets/heroes/castaneda_portrait.jpg',
    desc: 'Антрополог, ставший учеником дона Хуана. Копит Осознание, а затем одним рывком сдвигает точку сборки. Летуны охотятся за его осознанием — не давайте им насытиться.',
    deck: ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'notes'],
    relic: 'notebook',
    pool: ['stalk', 'notdoing', 'folly', 'gait', 'silence', 'hunt',
           'erase', 'mescalito', 'seeing', 'recap', 'ally', 'impecc',
           'shift', 'death', 'leap'],
  },
  donjuan: {
    id: 'donjuan', name: 'Дон Хуан Матус', title: 'Нагваль', playable: false,
    hp: 80, gold: 99,
    body: 'assets/heroes/donjuan_body.png', portrait: 'assets/heroes/donjuan_portrait.jpg',
    desc: 'Индеец яки, человек знания. Видит энергию напрямую и управляет союзниками. Герой в разработке.',
  },
  genaro: {
    id: 'genaro', name: 'Дон Хенаро', title: 'Трикстер', playable: false,
    hp: 66, gold: 99,
    body: 'assets/heroes/genaro_body.png', portrait: 'assets/heroes/genaro_portrait.jpg',
    desc: 'Нагваль-шутник, мастер двойника и невозможных прыжков. Герой в разработке.',
  },
};

// ============================================================
//  Ключевые слова (подсказки)
// ============================================================
const KEYWORDS = {
  'Защита': 'Блокирует урон. Сбрасывается в начале вашего следующего хода.',
  'Осознание': 'Ресурс Кастанеды. Одни карты его копят, другие тратят. Летуны питаются осознанием: съеденное делает их сильнее.',
  'Личная сила': 'Каждое очко увеличивает урон от атак на 1.',
  'Уязвимость': 'Получает на 50% больше урона от атак.',
  'Слабость': 'Наносит на 25% меньше урона атаками.',
  'Сгорает': 'После розыгрыша карта удаляется до конца боя.',
  'Эфирная': 'Если карта осталась в руке в конце хода — она сгорает.',
  'Неиграемая': 'Эту карту нельзя разыграть.',
  'Способность': 'Действует до конца боя.',
};

const STATUS_INFO = {
  strength:   { icon: '💪', name: 'Личная сила', tip: 'Урон от атак +{n}.' },
  vulnerable: { icon: '💔', name: 'Уязвимость', tip: 'Получает +50% урона от атак. Ходов: {n}.', debuff: true },
  weak:       { icon: '🥀', name: 'Слабость', tip: 'Атаки наносят на 25% меньше урона. Ходов: {n}.', debuff: true },
  aware:      { icon: '👁️', name: 'Осознание', tip: 'Накоплено осознания: {n}. Летуны могут его съесть.' },
  impecc:     { icon: '🪶', name: 'Безупречность', tip: 'В конце хода получаете {n} Защиты.' },
  ally:       { icon: '💨', name: 'Союзник', tip: 'В конце хода наносит {n} урона случайному врагу.' },
  death:      { icon: '💀', name: 'Смерть-советчица', tip: 'В начале хода получаете {n} Личной силы.' },
};

// ============================================================
//  Карты
//  desc(u, f): u — улучшена ли, f.d(n) — урон с модификаторами, f.b(n) — защита
//  play(g, u, target)
// ============================================================
const CARDS = {
  // ---------- базовые ----------
  strike: {
    name: 'Удар', type: 'attack', rarity: 'basic', cost: 1, target: 'enemy', art: '👊',
    desc: (u, f) => `Нанести ${f.d(u ? 9 : 6)} урона.`,
    play: (g, u, t) => g.hit(t, u ? 9 : 6),
  },
  defend: {
    name: 'Оборона', type: 'skill', rarity: 'basic', cost: 1, art: '🛡️',
    desc: (u, f) => `Получить ${f.b(u ? 8 : 5)} Защиты.`,
    play: (g, u) => g.block(u ? 8 : 5),
  },
  notes: {
    name: 'Полевые заметки', type: 'skill', rarity: 'basic', cost: 1, art: '📓',
    desc: u => `Взять ${u ? 3 : 2} карты. Получить 1 Осознание.`,
    play: (g, u) => { g.draw(u ? 3 : 2); g.aware(1); },
  },

  // ---------- обычные ----------
  stalk: {
    name: 'Сталкинг', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', art: '🐾',
    desc: (u, f) => `Нанести ${f.d(u ? 9 : 7)} урона. Наложить ${u ? 2 : 1} Уязвимость.`,
    play: (g, u, t) => { g.hit(t, u ? 9 : 7); g.debuff(t, 'vulnerable', u ? 2 : 1); },
  },
  notdoing: {
    name: 'Не-делание', type: 'skill', rarity: 'common', cost: 0, art: '🌀', exhaust: true,
    desc: u => `Взять ${u ? 3 : 2} карты. Получить 1 Осознание. Сгорает.`,
    play: (g, u) => { g.draw(u ? 3 : 2); g.aware(1); },
  },
  folly: {
    name: 'Контролируемая глупость', type: 'attack', rarity: 'common', cost: 1, target: 'all', art: '🤪',
    desc: (u, f) => `Нанести ${f.d(u ? 8 : 5)} урона ВСЕМ врагам.`,
    play: (g, u) => g.hitAll(u ? 8 : 5),
  },
  gait: {
    name: 'Походка силы', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', art: '🚶',
    desc: (u, f) => `Нанести ${f.d(u ? 7 : 5)} урона. Получить ${f.b(u ? 7 : 5)} Защиты.`,
    play: (g, u, t) => { g.hit(t, u ? 7 : 5); g.block(u ? 7 : 5); },
  },
  silence: {
    name: 'Остановка внутреннего диалога', type: 'skill', rarity: 'common', cost: 1, art: '🤫',
    desc: (u, f) => `Получить ${f.b(u ? 8 : 6)} Защиты и ${u ? 3 : 2} Осознания.`,
    play: (g, u) => { g.block(u ? 8 : 6); g.aware(u ? 3 : 2); },
  },
  hunt: {
    name: 'Охота на летуна', type: 'attack', rarity: 'common', cost: 2, target: 'enemy', art: '🏹',
    desc: (u, f) => `Нанести ${f.d(u ? 18 : 14)} урона. Если цель погибла — получить 1 энергию и 1 Осознание.`,
    play: (g, u, t) => { if (g.hit(t, u ? 18 : 14)) { g.energy(1); g.aware(1); } },
  },

  // ---------- необычные ----------
  erase: {
    name: 'Стирание личной истории', type: 'skill', rarity: 'uncommon', cost: 1, art: '🧽',
    desc: (u, f) => `Получить ${f.b(u ? 15 : 11)} Защиты. Снять с себя Слабость и Уязвимость.`,
    play: (g, u) => { g.block(u ? 15 : 11); g.cleanse(); },
  },
  mescalito: {
    name: 'Мескалито', type: 'skill', rarity: 'uncommon', cost: 0, art: '🌵',
    desc: u => `Потерять 3 здоровья. Получить 2 энергии${u ? ' и взять 1 карту' : ''}.`,
    play: (g, u) => { g.loseHp(3); g.energy(2); if (u) g.draw(1); },
  },
  seeing: {
    name: 'Видение', type: 'skill', rarity: 'uncommon', cost: 1, target: 'all', art: '🔮',
    desc: u => `Наложить ${u ? 3 : 2} Слабости и ${u ? 2 : 1} Уязвимость на ВСЕХ врагов.`,
    play: (g, u) => { g.debuffAll('weak', u ? 3 : 2); g.debuffAll('vulnerable', u ? 2 : 1); },
  },
  recap: {
    name: 'Перепросмотр', type: 'skill', rarity: 'uncommon', cost: 1, art: '🌬️',
    desc: (u, f) => `Получить ${f.b(4)} Защиты + ${u ? 3 : 2} за каждое Осознание${f.aw()}. Осознание не тратится.`,
    play: (g, u) => g.block(4 + (u ? 3 : 2) * g.getAware()),
  },
  ally: {
    name: 'Союзник', type: 'power', rarity: 'uncommon', cost: 2, art: '💨',
    desc: u => `Способность. В конце каждого хода наносит ${u ? 7 : 5} урона случайному врагу.`,
    play: (g, u) => g.power('ally', u ? 7 : 5),
  },
  impecc: {
    name: 'Безупречность', type: 'power', rarity: 'uncommon', cost: 1, art: '🪶',
    desc: u => `Способность. В конце каждого хода получайте ${u ? 4 : 3} Защиты.`,
    play: (g, u) => g.power('impecc', u ? 4 : 3),
  },

  // ---------- редкие ----------
  shift: {
    name: 'Сдвиг точки сборки', type: 'attack', rarity: 'rare', cost: 1, target: 'enemy', art: '✴️',
    desc: (u, f) => `Нанести ${u ? 7 : 5} урона за каждое Осознание${f.tot(u ? 7 : 5)}. Потратить всё Осознание.`,
    // бьёт одним ударом: база × осознание (+ Личная сила, Слабость, Уязвимость)
    play: (g, u, t) => { g.hit(t, (u ? 7 : 5) * g.getAware()); g.spendAware(); },
  },
  death: {
    name: 'Смерть — советчица', type: 'power', rarity: 'rare', cost: 3, art: '💀',
    desc: u => `Способность. В начале каждого хода получайте ${u ? 3 : 2} Личной силы.`,
    play: (g, u) => g.power('death', u ? 3 : 2),
  },
  leap: {
    name: 'Прыжок в бездну', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy', art: '🏔️', exhaust: true,
    desc: (u, f) => `Нанести ${f.d(u ? 44 : 32)} урона. Сгорает.`,
    play: (g, u, t) => g.hit(t, u ? 44 : 32),
  },

  // ---------- статусы ----------
  mind: {
    name: 'Разум летуна', type: 'status', rarity: 'special', cost: null, art: '🌑',
    unplayable: true, ethereal: true,
    desc: () => 'Неиграемая. Эфирная. Чужой ум, навязанный летунами.',
  },
};

const TYPE_NAMES = { attack: 'Атака', skill: 'Навык', power: 'Способность', status: 'Статус' };
const RARITY_NAMES = { basic: 'Базовая', common: 'Обычная', uncommon: 'Необычная', rare: 'Редкая', special: 'Особая' };

// ============================================================
//  Реликвии
// ============================================================
const RELICS = {
  notebook: {
    name: 'Полевой блокнот', icon: '📔', rarity: 'starter',
    desc: 'В начале каждого боя получите 2 Осознания.',
    combatStart: g => g.aware(2),
  },
  necklace: {
    name: 'Бирюзовое ожерелье', icon: '📿',
    desc: 'При получении: +10 к максимальному здоровью.',
    onPickup: r => { r.maxHp += 10; r.hp += 10; },
  },
  crystals: {
    name: 'Кристаллы силы', icon: '💎',
    desc: 'В начале каждого боя получите 1 Личную силу.',
    combatStart: g => g.buffSelf('strength', 1),
  },
  feather: {
    name: 'Перо ворона', icon: '🪶',
    desc: 'В начале каждого боя получите 10 Защиты.',
    combatStart: g => g.block(10),
  },
  peyote: {
    name: 'Бутон пейота', icon: '🌸',
    desc: 'В первый ход каждого боя получите 1 дополнительную энергию.',
    turnStart: (g, turn) => { if (turn === 1) g.energy(1); },
  },
  pipe: {
    name: 'Трубка «Дымка»', icon: '🚬',
    desc: 'После каждого боя восстановите 6 здоровья.',
    combatEnd: r => { r.hp = Math.min(r.maxHp, r.hp + 6); },
  },
  lizards: {
    name: 'Ящерицы-колдуньи', icon: '🦎',
    desc: 'В начале каждого боя наложите 1 Уязвимость на всех врагов.',
    combatStart: g => g.debuffAll('vulnerable', 1),
  },
  gourd: {
    name: 'Тыквенная фляга', icon: '🎃',
    desc: 'В начале каждого боя возьмите 2 дополнительные карты.',
    turnStart: (g, turn) => { if (turn === 1) g.draw(2); },
  },
};
const RELIC_POOL = ['necklace', 'crystals', 'feather', 'peyote', 'pipe', 'lizards', 'gourd'];
