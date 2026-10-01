'use strict';
// ============================================================
//  Герои
// ============================================================
const HEROES = {
  castaneda: {
    id: 'castaneda', name: 'Карлос Кастанеда', title: 'Ученик', playable: true,
    hp: 72, gold: 99,
    body: 'assets/heroes/castaneda_body.png', portrait: 'assets/heroes/castaneda_portrait.jpg',
    side: 'assets/heroes/castaneda_side.png',   // вид сбоку: в бою герой смотрит на летунов
    desc: 'Антрополог, ставший учеником дона Хуана. Копит Осознание, а затем одним рывком сдвигает точку сборки. Летуны охотятся за его осознанием — не давайте им насытиться.',
    deck: ['strike', 'strike', 'strike', 'strike', 'intent', 'defend', 'defend', 'defend', 'defend', 'notes', 'flash'],
    relic: 'notebook',
    pool: ['stalk', 'notdoing', 'folly', 'gait', 'silence', 'hunt',
           'erase', 'mescalito', 'seeing', 'recap', 'ally', 'impecc',
           'shift', 'death', 'leap',
           'twin', 'dream', 'clarity', 'fearless', 'might', 'discipline',
           'history', 'fibers', 'shiftint', 'recall', 'mimic', 'selfstalk', 'double', 'stopworld'],
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
  'Уязвимость': 'Получает на 50% больше урона от атак. Действует до конца следующего хода врага (за каждое очко — ещё на ход).',
  'Слабость': 'Наносит на 25% меньше урона атаками. Действует до конца следующего хода врага (за каждое очко — ещё на ход).',
  'Сгорает': 'После розыгрыша карта удаляется до конца боя.',
  'Эфирная': 'Если карта осталась в руке в конце хода — она сгорает.',
  'Неиграемая': 'Эту карту нельзя разыграть.',
  'Способность': 'Действует до конца боя.',
};

const STATUS_INFO = {
  strength:   { icon: '💪', name: 'Личная сила', tip: 'Урон от атак +{n}.' },
  vulnerable: { icon: '💔', name: 'Уязвимость', tip: 'Получает +50% урона от атак. {turns}', debuff: true },
  weak:       { icon: '🥀', name: 'Слабость', tip: 'Атаки наносят на 25% меньше урона. {turns}', debuff: true },
  aware:      { icon: '👁️', name: 'Осознание', tip: 'Накоплено осознания: {n}. Летуны могут его съесть.' },
  impecc:     { icon: '⚖️', name: 'Безупречность', tip: 'В конце хода получаете {n} Защиты.' },
  ally:       { icon: '💨', name: 'Союзник', tip: 'В конце хода наносит {n} урона случайному врагу.' },
  death:      { icon: '💀', name: 'Смерть-советчица', tip: 'В начале хода получаете {n} Личной силы.' },
  rage:       { icon: '🔥', name: 'Ярость', tip: 'Летун в ярости: каждый свой ход, помимо обычного действия, сжирает {n} Осознания. Это не делает его сильнее, но даже мастерство второго внимания не защищает.', debuff: true },
  echo:       { icon: '👥', name: 'Двойник', tip: 'Следующая сыгранная карта (кроме сгорающих) сработает дважды.' },
  scout:      { icon: '🔷', name: 'Голубой лазутчик', tip: 'В начале хода возьмите ещё {n} карт.' },
  discipline: { icon: '🧘', name: 'Дисциплина', tip: 'В начале хода Защита не сбрасывается, а уменьшается вдвое.' },
  sapped:     { icon: '🩸', name: 'Истощение', tip: 'Облако высосало силы: в начале следующего хода −{n} энергии.', debuff: true },
  intangible: { icon: '👻', name: 'Бесплотность', tip: 'До своего следующего хода получает вдвое меньше урона.' },
  thorns:     { icon: '🌵', name: 'Шипы', tip: 'Каждая ваша атака по нему наносит вам {n} урона.' },
  dream:      { icon: '💤', name: 'Сновидение', tip: 'В начале следующего хода возьмёте ещё {n} карт.' },
  fearless:   { icon: '🐺', name: 'Победа над страхом', tip: 'Когда враг накладывает на вас Слабость или Уязвимость: +{n} Защиты и +1 Осознание.' },
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
  intent: {
    name: 'Удар намерения', type: 'attack', rarity: 'basic', cost: 1, target: 'enemy', art: '🎯',
    desc: (u, f) => `Нанести ${f.d(u ? 7 : 5)} урона. Если есть Осознание — потратить 1 и нанести ещё ${f.d(u ? 7 : 5)}.`,
    play: (g, u, t) => {
      g.hit(t, u ? 7 : 5);
      if (g.getAware() > 0) { g.spendAware(1); g.hit(t, u ? 7 : 5); }
    },
  },
  flash: {
    name: 'Вспышка осознания', type: 'attack', rarity: 'basic', cost: 1, target: 'all', art: '💥',
    desc: (u, f) => `Потратить всё Осознание. Нанести ВСЕМ врагам ${u ? 4 : 3} урона за каждое${f.tot(u ? 4 : 3)}.`,
    play: (g, u) => { const n = g.getAware(); if (n > 0) { g.spendAware(); g.hitAll((u ? 4 : 3) * n); } },
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

  twin: {
    name: 'Двойной выпад', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', art: '🗡️',
    desc: (u, f) => `Нанести ${f.d(u ? 5 : 4)} урона 2 раза.`,
    play: (g, u, t) => { g.hit(t, u ? 5 : 4); if (t && !t.dead) g.hit(t, u ? 5 : 4); },
  },
  dream: {
    name: 'Сновидение', type: 'skill', rarity: 'common', cost: 1, art: '💤',
    desc: (u, f) => `Получить ${f.b(u ? 9 : 6)} Защиты. В начале следующего хода взять 1 дополнительную карту.`,
    play: (g, u) => { g.block(u ? 9 : 6); g.buffSelf('dream', 1); },
  },

  // ---------- необычные ----------
  clarity: {
    name: 'Ясность', type: 'skill', rarity: 'uncommon', cost: 0, art: '🔆',
    desc: u => `Потратить 2 Осознания: взять ${u ? 3 : 2} карты.`,
    requires: g => g.getAware() >= 2 ? null : 'Нужно 2 Осознания',
    play: (g, u) => { g.spendAware(2); g.draw(u ? 3 : 2); },
  },
  fearless: {
    name: 'Победа над страхом', type: 'power', rarity: 'uncommon', cost: 1, art: '🐺',
    desc: u => `Способность. Когда на вас накладывают Слабость или Уязвимость: +${u ? 5 : 3} Защиты, +1 Осознание.`,
    play: (g, u) => g.power('fearless', u ? 5 : 3),
  },
  erase: {
    name: 'Утрата чувства важности', type: 'skill', rarity: 'uncommon', cost: 1, art: '🧽',
    desc: (u, f) => `Получить ${f.b(u ? 15 : 11)} Защиты. Снять с себя Слабость и Уязвимость.`,
    play: (g, u) => { g.block(u ? 15 : 11); g.cleanse(); },
  },
  mescalito: {
    name: 'Мескалито', type: 'skill', rarity: 'uncommon', cost: 0, art: '🌵', exhaust: true,
    desc: u => `Потерять 4 здоровья. Получить 2 энергии${u ? ' и взять 1 карту' : ''}. Сгорает.`,
    play: (g, u) => { g.loseHp(4); g.energy(2); if (u) g.draw(1); },
  },
  seeing: {
    name: 'Видение', type: 'skill', rarity: 'uncommon', cost: 1, target: 'all', art: '🔮',
    desc: u => `Наложить ${u ? 3 : 2} Слабости и ${u ? 2 : 1} Уязвимость на ВСЕХ врагов.`,
    play: (g, u) => { g.debuffAll('weak', u ? 3 : 2); g.debuffAll('vulnerable', u ? 2 : 1); },
  },
  recap: {
    name: 'Перепросмотр', type: 'skill', rarity: 'uncommon', cost: 1, art: '🌬️',
    desc: (u, f) => `Получить ${f.b(4)} Защиты + ${u ? 3 : 2} за каждое Осознание${f.aw()}. Потратить половину Осознания.`,
    play: (g, u) => { const n = g.getAware(); g.block(4 + (u ? 3 : 2) * n); g.spendAware(Math.ceil(n / 2)); },
  },
  ally: {
    name: 'Союзник', type: 'power', rarity: 'uncommon', cost: 2, art: '💨',
    desc: u => `Способность. В конце каждого хода наносит ${u ? 7 : 5} урона случайному врагу.`,
    play: (g, u) => g.power('ally', u ? 7 : 5),
  },
  impecc: {
    name: 'Безупречность', type: 'power', rarity: 'uncommon', cost: 1, art: '⚖️',
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
  might: {
    name: 'Сила', type: 'skill', rarity: 'rare', cost: u => u ? 1 : 2, art: '⚡', exhaust: true,
    desc: (u, f) => `Удвоить ваше Осознание${f.aw()}. Сгорает.`,
    requires: g => g.getAware() >= 1 ? null : 'Нет Осознания',
    play: g => g.aware(g.getAware()),
  },
  leap: {
    name: 'Прыжок в бездну', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy', art: '🏔️', exhaust: true,
    desc: (u, f) => `Нанести ${f.d(u ? 44 : 32)} урона. Сгорает.`,
    play: (g, u, t) => g.hit(t, u ? 44 : 32),
  },

  discipline: {
    name: 'Дисциплина', type: 'power', rarity: 'uncommon', cost: u => u ? 1 : 2, art: '🧘',
    desc: () => 'Способность. В начале хода ваша Защита не сбрасывается, а уменьшается вдвое.',
    play: g => g.power('discipline', 1),
  },

  // ---------- карты с особыми механиками ----------
  history: {
    name: 'Стирание личной истории', type: 'skill', rarity: 'common', cost: 1, art: '🌫️',
    desc: u => `Сбросьте любые карты из руки и возьмите столько же +${u ? 2 : 1}.`,
    play: (g, u) => g.discardAndDraw(u ? 2 : 1),
  },
  fibers: {
    name: 'Светящиеся волокна', type: 'skill', rarity: 'common', cost: 0, art: '✨',
    desc: u => `Посмотрите ${u ? 4 : 3} верхние карты колоды: одну возьмите в руку, остальные можно сбросить.`,
    play: (g, u) => g.peek(u ? 4 : 3),
  },
  shiftint: {
    name: 'Сбить намерение', type: 'skill', rarity: 'uncommon', cost: u => u ? 0 : 1, target: 'enemy', art: '🎲',
    desc: () => 'Враг меняет намерение на другое случайное (особые приёмы исключены).',
    play: (g, u, t) => g.rerollIntent(t),
  },
  recall: {
    name: 'Вспоминание', type: 'skill', rarity: 'uncommon', cost: u => u ? 0 : 1, art: '🧠',
    desc: () => 'Верните любую карту из сброса в руку. В этом ходу она стоит 0.',
    requires: g => g.discardCount() ? null : 'Сброс пуст',
    play: g => g.recall(),
  },
  mimic: {
    name: 'Подражание Хенаро', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', art: '🤹',
    desc: u => `Повторите намерение врага против него: его атака бьёт его самого${u ? ' (+50%)' : ''}, его Защита достаётся вам, его ослабления — ему.`,
    play: (g, u, t) => g.mimic(t, u),
  },
  selfstalk: {
    name: 'Сталкинг себя', type: 'skill', rarity: 'uncommon', cost: 1, art: '🕵️',
    desc: u => `Самые дорогие карты в руке до конца хода стоят на 1 меньше. Взять ${u ? 2 : 1} карту.`,
    play: (g, u) => { g.discountTop(); g.draw(u ? 2 : 1); },
  },
  double: {
    name: 'Двойник', type: 'skill', rarity: 'rare', cost: u => u ? 1 : 2, art: '👥', exhaust: true,
    desc: () => 'Следующая сыгранная в этом ходу карта сработает дважды (кроме сгорающих). Сгорает.',
    play: g => g.power('echo', 1),
  },
  stopworld: {
    name: 'Неделание мира', type: 'skill', rarity: 'rare', cost: u => u ? 2 : 3, art: '⏸️', exhaust: true,
    desc: () => 'Остановите мир: в этот ход враги не действуют. Сгорает.',
    play: g => g.stopWorld(),
  },

  // ---------- уникальные: только из событий ----------
  gorda: {
    name: 'Урок Ла Горды', type: 'skill', rarity: 'unique', cost: u => u ? 0 : 1, target: 'enemy', art: '🧕',
    desc: () => 'Наложить 2 Слабости и 2 Уязвимости. Получить 1 Осознание.',
    play: (g, u, t) => { g.debuff(t, 'weak', 2); g.debuff(t, 'vulnerable', 2); g.aware(1); },
  },
  pablito: {
    name: 'Прыжок Паблито', type: 'attack', rarity: 'unique', cost: 2, target: 'enemy', art: '🪑',
    desc: (u, f) => `Нанести ${f.d(u ? 16 : 12)} урона. Получить ${f.b(u ? 10 : 8)} Защиты.`,
    play: (g, u, t) => { g.hit(t, u ? 16 : 12); g.block(u ? 10 : 8); },
  },
  scout: {
    name: 'Голубой лазутчик', type: 'power', rarity: 'unique', cost: u => u ? 0 : 1, art: '🔷',
    desc: () => 'Способность. В начале каждого хода возьмите 1 дополнительную карту.',
    play: g => g.power('scout', 1),
  },
  ixtlan: {
    name: 'Дорога в Икстлан', type: 'skill', rarity: 'unique', cost: 0, art: '🛤️', exhaust: true,
    desc: u => `Восстановить ${u ? 9 : 6} здоровья. Получить 2 Осознания. Сгорает.`,
    play: (g, u) => { g.heal(u ? 9 : 6); g.aware(2); },
  },
  coyote: {
    name: 'Разговор с койотом', type: 'skill', rarity: 'unique', cost: 1, art: '🐺',
    desc: (u, f) => `Потратить всё Осознание${f.aw()}: взять столько же карт (не больше 5)${u ? ' и получить 1 энергию' : ''}.`,
    requires: g => g.getAware() >= 1 ? null : 'Нет Осознания',
    play: (g, u) => { const n = Math.min(5, g.getAware()); g.spendAware(); g.draw(n); if (u) g.energy(1); },
  },
  lecture: {
    name: 'Лекция о летунах', type: 'skill', rarity: 'unique', cost: 1, target: 'all', art: '🎓',
    desc: u => `Наложить ${u ? 2 : 1} Уязвимость на ВСЕХ врагов. Взять 1 карту.`,
    play: (g, u) => { g.debuffAll('vulnerable', u ? 2 : 1); g.draw(1); },
  },

  // ---------- особые ----------
  fire: {
    name: 'Огонь изнутри', type: 'attack', rarity: 'special', cost: 0, target: 'all', art: '☄️', exhaust: true,
    desc: (u, f) => `Нанести ВСЕМ врагам урон: Осознание ×4${f.tot(4)}. Осознание не тратится. Сгорает.`,
    requires: g => g.getAware() >= 1 ? null : 'Нет Осознания',
    play: g => g.hitAll(4 * g.getAware()),
  },

  // ---------- статусы ----------
  nightmare: {
    name: 'Кошмарный сон', type: 'status', rarity: 'special', cost: null, art: '😱',
    unplayable: true, ethereal: true, endTurnHp: 2,
    desc: () => 'Неиграемая. Эфирная. Если в конце хода карта в руке — потеряйте 2 здоровья.',
  },
  mind: {
    name: 'Разум летуна', type: 'status', rarity: 'special', cost: null, art: '🌑',
    unplayable: true, ethereal: true,
    desc: () => 'Неиграемая. Эфирная. Чужой ум, навязанный летунами.',
  },
};

const TYPE_NAMES = { attack: 'Атака', skill: 'Навык', power: 'Способность', status: 'Статус' };
const RARITY_NAMES = { basic: 'Базовая', common: 'Обычная', uncommon: 'Необычная', rare: 'Редкая', special: 'Особая', unique: 'Уникальная' };

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
    name: 'Перо ворона', icon: '🐦',
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
  // ---------- добавлены в полировке акта I ----------
  pouch: {
    name: 'Мешочек силы', icon: '👝',
    desc: 'Каждый 3-й ход получайте 1 дополнительную энергию.',
    turnStart: (g, turn) => { if (turn % 3 === 0) g.energy(1); },
  },
  hat: {
    name: 'Соломенная шляпа Хенаро', icon: '👒',
    desc: 'Когда в бою здоровье впервые падает ниже половины, получите 12 Защиты.',
  },
  scorpion: {
    name: 'Скорпион в банке', icon: '🦂',
    desc: 'Когда летун погибает, нанесите 6 урона случайному врагу.',
    onKill: g => g.pierceRandom(6),
  },
  pencil: {
    name: 'Карандаш антрополога', icon: '✏️',
    desc: 'Когда вы тратите Осознание, получите 2 Защиты за каждое потраченное очко.',
    onSpendAware: (g, n) => g.block(2 * n),
  },
  mirror: {
    name: 'Обсидиановое зеркало', icon: '💠',
    desc: 'Летуны съедают на 1 Осознание меньше.',
  },
  poncho: {
    name: 'Пончо дона Хуана', icon: '🧣',
    desc: 'Если в конце хода у вас нет Защиты, получите 6 Защиты.',
    turnEnd: g => { if (!g.getBlock()) g.block(6); },
  },
  jug: {
    name: 'Глиняный кувшин', icon: '🏺',
    desc: 'Отдых на месте силы восстанавливает на 15 здоровья больше.',
  },
  tobacco: {
    name: 'Табак для трубки', icon: '🍂',
    desc: 'Торговец делает вам скидку 25%.',
  },
  stone: {
    name: 'Камень силы', icon: '🗿',
    desc: '+1 энергия каждый ход. Но летуны начинают бой с 1 Личной силой.',
  },
  mat: {
    name: 'Циновка сновидящего', icon: '🧶',
    desc: 'Открывает Созерцание на местах силы: можно отрешиться от карты или навсегда усилить Осознание.',
  },
  // ---------- уникальные: только из событий ----------
  tenant: {
    name: 'Дар Арендатора', icon: '🗝️', unique: true,
    desc: 'В начале каждого боя получите 3 Осознания.',
    combatStart: g => g.aware(3),
  },
  scarf: {
    name: 'Платок сестричек', icon: '🎀', unique: true,
    desc: 'Первая атака в каждом ходу наносит +4 урона.',
  },
  mask: {
    name: 'Маска нагваля Хулиана', icon: '🎭', unique: true,
    desc: 'В начале каждого боя случайный летун получает 2 Слабости и 1 Уязвимость.',
    combatStart: g => g.debuffRandom(),
  },
  crow: {
    name: 'Глаза вороны', icon: '🌘', unique: true,
    desc: 'В начале каждого боя наложите 1 Слабость на всех врагов.',
    combatStart: g => g.debuffAll('weak', 1),
  },
  shard: {
    name: 'Осколок неорганического', icon: '🧿', unique: true,
    desc: 'Непотраченное Осознание после победы даёт вдвое больше Свечения кокона.',
  },
  porch: {
    name: 'Камень с веранды', icon: '🧱', unique: true,
    desc: 'В начале каждого боя самый сильный летун получает 1 Слабость.',
    combatStart: g => g.weakStrongest(),
  },
  fang: {
    name: 'Клык дьяблеро', icon: '🦷', unique: true,
    desc: 'После каждой победы: +1 к максимальному здоровью и 4 здоровья.',
    combatEnd: r => { r.maxHp += 1; r.hp = Math.min(r.maxHp, r.hp + 4); },
  },
};
const RELIC_POOL = ['necklace', 'crystals', 'feather', 'peyote', 'pipe', 'lizards', 'gourd',
  'pouch', 'hat', 'scorpion', 'pencil', 'mirror', 'poncho', 'jug', 'tobacco', 'stone', 'mat'];

// ============================================================
//  Зелья (снадобья). use(g, target) в бою; anytime — можно пить и вне боя
// ============================================================
const POTIONS = {
  datura: {
    name: 'Отвар дурмана', color: '#b04cff', glow: '#e08aff', target: 'enemy', rarity: 'common',
    desc: 'Нанести 20 урона выбранному врагу.',
    use: (g, t) => g.pierce(t, 20),
  },
  peyote: {
    name: 'Настойка пейота', color: '#ff5fa2', glow: '#ffb0d0', rarity: 'uncommon',
    desc: 'Получить 2 энергии.',
    use: g => g.energy(2),
  },
  smoke: {
    name: 'Порошок «Дымка»', color: '#8aa6bd', glow: '#d6e6f2', rarity: 'common',
    desc: 'Взять 3 карты.',
    use: g => g.draw(3),
  },
  shield: {
    name: 'Эликсир безупречности', color: '#3b8cff', glow: '#9fd0ff', rarity: 'common',
    desc: 'Получить 12 Защиты.',
    use: g => g.block(12),
  },
  saguaro: {
    name: 'Сок сагуаро', color: '#3fcf6a', glow: '#a8ffc0', rarity: 'uncommon', anytime: true,
    desc: 'Восстановить 20 здоровья. Можно выпить и вне боя.',
    use: g => g.heal(20),
  },
  awaken: {
    name: 'Эликсир пробуждения', color: '#ff9a3c', glow: '#ffd08a', rarity: 'common',
    desc: 'Сжечь все неиграемые карты в руке и взять столько же карт из колоды.',
    use: g => g.burnUnplayable(),
  },
  holy: {
    name: 'Святая вода курандеры', color: '#cfe8ff', glow: '#ffffff', rarity: 'uncommon', anytime: true, cleanse: true,
    desc: 'Снять все проклятия. Можно выпить и вне боя. Дрожь в руках на неё не действует.',
    use: g => g.uncurse(),
  },
  eagle: {
    name: 'Слеза орла', color: '#ffc23a', glow: '#fff0a8', rarity: 'rare',
    desc: 'Получить 4 Осознания.',
    use: g => g.aware(4),
  },
};
const POTION_SLOTS = 3;

// ============================================================
//  Свечение кокона: непотраченное Осознание после победы копится через весь забег
// ============================================================
const GLOW_TIERS = [
  { at: 10, name: 'Мастер первого внимания', desc: '+1 Осознание в начале каждого боя.' },
  { at: 20, name: 'Мастер второго внимания', desc: 'Ваша энергия становится летунам невкусной — они перестают пожирать Осознание.' },
  { at: 30, name: 'Мастер третьего внимания', desc: 'Каждый бой начинается с картой «Огонь изнутри» в руке.' },
];
const GLOW_MAX = 30;

// ============================================================
//  Проклятия — постоянные, до конца забега или до «Святой воды курандеры»
// ============================================================
const CURSES = {
  forget: { name: 'Проклятие забвения', icon: '🕸️', desc: 'После боя на выбор предлагается на 1 карту меньше.' },
  tremor: { name: 'Дрожащие руки', icon: '🖐️', desc: 'Каждое выпитое зелье с шансом 50% разливается впустую.' },
};
