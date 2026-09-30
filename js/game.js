'use strict';
// ============================================================
//  Утилиты
// ============================================================
const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const fxLayer = document.getElementById('fx');
const stage = document.getElementById('stage');
const tooltip = document.getElementById('tooltip');

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let uidSeq = 1;
const mkCard = (id, up = false) => ({ uid: uidSeq++, id, up });
const cardName = c => CARDS[c.id].name + (c.up ? '+' : '');
const costOf = c => { const k = CARDS[c.id].cost; return typeof k === 'function' ? k(c.up) : k; };
const canUpgrade = c => !c.up && CARDS[c.id].type !== 'status';

// ============================================================
//  Масштабирование сцены 1280×720
// ============================================================
let scale = 1;
function fitStage() {
  scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener('resize', fitStage);
fitStage();

// ============================================================
//  Звук (синтез, без файлов)
// ============================================================
let actx = null, muted = localStorage.getItem('nagual_mute') === '1';
function sfx(kind) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const tone = (f1, f2, dur, type = 'sine', vol = 0.15, delay = 0) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t + delay);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + delay + dur);
      g.gain.setValueAtTime(vol, t + delay); g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(g).connect(actx.destination); o.start(t + delay); o.stop(t + delay + dur);
    };
    const noise = (dur, vol = 0.2, freq = 1200) => {
      const b = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
      f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
      s.buffer = b; s.connect(f).connect(g).connect(actx.destination); s.start(t);
    };
    switch (kind) {
      case 'card': tone(500, 800, 0.08, 'triangle', 0.08); break;
      case 'hit': noise(0.18, 0.5, 900); tone(180, 60, 0.15, 'square', 0.08); break;
      case 'hurt': noise(0.25, 0.5, 500); tone(120, 50, 0.25, 'sawtooth', 0.1); break;
      case 'block': tone(900, 600, 0.12, 'triangle', 0.1); break;
      case 'buff': tone(400, 900, 0.2, 'sine', 0.1); tone(600, 1200, 0.2, 'sine', 0.06, 0.08); break;
      case 'debuff': tone(500, 150, 0.3, 'sawtooth', 0.06); break;
      case 'aware': tone(700, 1400, 0.25, 'sine', 0.08); tone(1050, 2100, 0.25, 'sine', 0.04, 0.05); break;
      case 'drain': tone(900, 100, 0.5, 'sawtooth', 0.08); break;
      case 'turn': tone(300, 450, 0.15, 'triangle', 0.1); break;
      case 'click': tone(700, 600, 0.05, 'square', 0.04); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.1, i * 0.12)); break;
      case 'lose': [400, 300, 200, 120].forEach((f, i) => tone(f, f * 0.9, 0.4, 'sawtooth', 0.07, i * 0.2)); break;
      case 'gold': tone(1200, 1600, 0.1, 'square', 0.05); tone(1600, 2000, 0.1, 'square', 0.04, 0.07); break;
      case 'death': noise(0.5, 0.4, 300); tone(300, 40, 0.6, 'sawtooth', 0.08); break;
    }
  } catch (e) { /* звук не обязателен */ }
}

// ============================================================
//  Подсказки
// ============================================================
document.addEventListener('mouseover', e => {
  const el = e.target.closest('[data-tip]');
  if (!el || !el.dataset.tip) { tooltip.style.display = 'none'; return; }
  tooltip.innerHTML = el.dataset.tip;
  tooltip.style.display = 'block';
  const r = el.getBoundingClientRect();
  const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
  let x = r.right + 8, y = r.top;
  if (x + tw > window.innerWidth - 4) x = r.left - tw - 8;
  if (x < 4) x = Math.min(window.innerWidth - tw - 4, Math.max(4, r.left));
  if (y + th > window.innerHeight - 4) y = window.innerHeight - th - 4;
  if (y < 4) y = 4;
  tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px';
});
document.addEventListener('mousedown', () => { tooltip.style.display = 'none'; });

// ============================================================
//  Клики: data-act="имя" → actions[имя](el, ev)
// ============================================================
let actions = {};
const globalActions = {
  deck: () => showDeckView(run.deck, 'Колода'),
  sound: () => { muted = !muted; localStorage.setItem('nagual_mute', muted ? '1' : '0'); refreshTop(); },
  menu: () => showMenu(),
  closeOverlay: () => closeOverlay(),
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) { if (actions._bg) actions._bg(e); return; }
  const fn = actions[el.dataset.act] || globalActions[el.dataset.act];
  if (fn) { if (!el.dataset.silent) sfx('click'); fn(el, e); }
});
document.addEventListener('contextmenu', e => { if (cb && cb.selected) { e.preventDefault(); cb.selected = null; updateCombat(); } });

// ============================================================
//  Сохранение
// ============================================================
let run = null;   // текущее прохождение
let cb = null;    // текущий бой
const SAVE_KEY = 'nagual_run_v1';
function save() { if (run) localStorage.setItem(SAVE_KEY, JSON.stringify(run)); }
function loadSave() {
  try {
    const r = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!r || !r.map) return null;
    uidSeq = Math.max(1, ...r.deck.map(c => c.uid)) + 1;
    return r;
  } catch (e) { return null; }
}
function clearSave() { localStorage.removeItem(SAVE_KEY); }

// ============================================================
//  Карточки (HTML)
// ============================================================
const KW_RULES = [
  [/Защит[а-яё]*/g, 'Защита'], [/Осознани[а-яё]*/g, 'Осознание'], [/Личн[а-яё]* сил[а-яё]*/g, 'Личная сила'],
  [/Уязвимост[а-яё]*/g, 'Уязвимость'], [/Слабост[а-яё]*/g, 'Слабость'], [/Сгорает/g, 'Сгорает'],
  [/Эфирная/g, 'Эфирная'], [/Неиграемая/g, 'Неиграемая'], [/Способность/g, 'Способность'],
];
function markKeywords(text, found) {
  for (const [re, k] of KW_RULES) text = text.replace(re, m => { found.add(k); return `<b class="kw">${m}</b>`; });
  return text;
}
const fmtPlain = { d: n => n, b: n => n, aw: () => '', tot: () => '' };
function fmtCombat(target) {
  return {
    d: n => { const v = playerDmg(n, target); return v === n ? `${v}` : `<span class="${v > n ? 'plus' : 'minus'}">${v}</span>`; },
    b: n => n,
    aw: () => ` <span class="aw-now">(сейчас ${cb.p.st.aware || 0})</span>`,
    tot: k => ` <span class="aw-now">(сейчас ${playerDmg(k * (cb.p.st.aware || 0), target)})</span>`,
  };
}
function cardHTML(c, o = {}) {
  const d = CARDS[c.id];
  const cost = costOf(c);
  const found = new Set();
  const desc = markKeywords(d.desc(c.up, o.combat ? fmtCombat(null) : fmtPlain), found);
  const tip = [...found].map(k => `<b>${k}</b><br>${KEYWORDS[k]}`).join('<hr>');
  return `<div class="card t-${d.type} r-${d.rarity} ${c.up ? 'up' : ''} ${o.cls || ''}" data-uid="${c.uid}" ${o.attrs || ''} ${tip && !o.noTip ? `data-tip="${esc(tip)}"` : ''} ${o.style ? `style="${o.style}"` : ''}>
    <div class="c-frame"></div>
    ${cost === null ? '' : `<div class="c-cost">${cost}</div>`}
    <div class="c-name">${d.name}${c.up ? '+' : ''}</div>
    <div class="c-art"><span>${d.art}</span></div>
    <div class="c-type">${TYPE_NAMES[d.type]}${d.rarity !== 'basic' && d.rarity !== 'special' ? ' · ' + RARITY_NAMES[d.rarity] : ''}</div>
    <div class="c-desc ${desc.replace(/<[^>]+>/g, '').length > 64 ? 'long' : ''}"><span>${desc}</span></div>
  </div>`;
}
function relicHTML(id, extra = '') {
  const r = RELICS[id];
  return `<span class="relic ${extra}" data-tip="${esc(`<b>${r.name}</b><br>${r.desc}`)}">${r.icon}</span>`;
}

// ============================================================
//  Верхняя панель
// ============================================================
function topBar() {
  const h = HEROES[run.hero];
  return `<div class="topbar">
    <div class="tb-hero"><img src="${h.portrait}" alt=""><div><b>${h.name}</b><span>${h.title}</span></div></div>
    <div class="tb-stat" data-tip="Здоровье">❤️ <b>${run.hp}/${run.maxHp}</b></div>
    <div class="tb-stat" data-tip="Песо">💰 <b>${run.gold}</b></div>
    <div class="tb-relics">${run.relics.map(r => relicHTML(r)).join('')}</div>
    <div class="tb-floor">Акт I · Пустыня летунов · Этаж ${run.floor}</div>
    <button class="tb-btn" data-act="deck" data-tip="Посмотреть колоду">🂠 <b>${run.deck.length}</b></button>
    <button class="tb-btn" data-act="sound" data-tip="Звук">${muted ? '🔇' : '🔊'}</button>
    <button class="tb-btn" data-act="menu" data-tip="Меню">☰</button>
  </div>`;
}
function refreshTop() { const t = document.querySelector('.topbar'); if (t && run) t.outerHTML = topBar(); }

// ============================================================
//  Оверлеи
// ============================================================
function openOverlay(html, cls = '') {
  overlay.innerHTML = `<div class="ov-box ${cls}">${html}</div>`;
  overlay.classList.add('open');
}
function closeOverlay() { overlay.classList.remove('open'); overlay.innerHTML = ''; tooltip.style.display = 'none'; }

function sortedDeck(cards) {
  const order = { attack: 0, skill: 1, power: 2, status: 3 };
  return [...cards].sort((a, b) => order[CARDS[a.id].type] - order[CARDS[b.id].type] || CARDS[a.id].name.localeCompare(CARDS[b.id].name));
}
function showDeckView(cards, title, keepOrder = false) {
  const list = keepOrder ? cards : sortedDeck(cards);
  openOverlay(`<h2>${title} <small>(${cards.length})</small></h2>
    <div class="card-grid">${list.map(c => cardHTML(c)).join('') || '<p class="muted">Пусто</p>'}</div>
    <button class="btn" data-act="closeOverlay">Закрыть</button>`, 'wide');
}

// Выбрать карту из колоды (удаление, улучшение)
function pickFromDeck({ title, filter = () => true, upgrade = false, cancel = true }, onPick) {
  const list = sortedDeck(run.deck.filter(filter));
  const prevActions = actions;
  const restore = () => { actions = prevActions; };
  openOverlay(`<h2>${title}</h2>
    <div class="card-grid">${list.map(c => cardHTML(c, { attrs: 'data-act="pickDeck"', cls: 'pickable' })).join('') || '<p class="muted">Нет подходящих карт</p>'}</div>
    ${cancel || !list.length ? '<button class="btn ghost" data-act="pickCancel">Отмена</button>' : ''}`, 'wide');
  actions = {
    ...prevActions,
    pickDeck: el => {
      const card = run.deck.find(c => c.uid === +el.dataset.uid);
      if (!upgrade) { closeOverlay(); restore(); onPick(card); return; }
      const after = { ...card, up: true, uid: -1 };
      openOverlay(`<h2>Улучшить карту?</h2>
        <div class="compare">${cardHTML(card)}<div class="arrow">➜</div>${cardHTML(after)}</div>
        <div class="row"><button class="btn" data-act="pickConfirm">Улучшить</button><button class="btn ghost" data-act="pickBack">Назад</button></div>`);
      actions.pickConfirm = () => { closeOverlay(); restore(); onPick(card); };
      actions.pickBack = () => { restore(); pickFromDeck({ title, filter, upgrade, cancel }, onPick); };
    },
    pickCancel: () => { closeOverlay(); restore(); onPick(null); },
  };
}

// Выбор одной из нескольких карт (награда)
function showCardChoice(ids, title, onPick, skipLabel = 'Пропустить') {
  const prevActions = actions;
  const cards = ids.map(id => mkCard(id));
  openOverlay(`<h2>${title}</h2>
    <div class="card-row">${cards.map(c => cardHTML(c, { attrs: 'data-act="choose"', cls: 'pickable big' })).join('')}</div>
    <button class="btn ghost" data-act="chooseSkip">${skipLabel}</button>`, 'wide');
  actions = {
    ...prevActions,
    choose: el => {
      const c = cards.find(x => x.uid === +el.dataset.uid);
      run.deck.push(c); closeOverlay(); actions = prevActions; sfx('buff'); onPick(c);
    },
    chooseSkip: () => { closeOverlay(); actions = prevActions; onPick(null); },
  };
}

function showMenu() {
  const prevActions = actions;
  openOverlay(`<h2>Пауза</h2>
    <div class="col">
      <button class="btn" data-act="menuResume">Продолжить</button>
      <button class="btn ghost" data-act="menuHelp">Как играть</button>
      <button class="btn ghost" data-act="menuQuit">Выйти в главное меню</button>
      <button class="btn danger" data-act="menuAbandon">Сдаться (прохождение будет потеряно)</button>
    </div>`);
  actions = {
    ...prevActions,
    menuResume: () => { closeOverlay(); actions = prevActions; },
    menuHelp: () => { actions = prevActions; showHelp(); },
    menuQuit: () => { closeOverlay(); cb = null; showTitle(); },
    menuAbandon: () => { closeOverlay(); cb = null; clearSave(); run = null; showTitle(); },
  };
}

function showHelp() {
  openOverlay(`<h2>Как играть</h2>
  <div class="help">
    <p>Пройдите пустыню летунов снизу вверх по карте и победите <b>Хозяина летунов</b>.</p>
    <p><b>Бой.</b> Каждый ход у вас 3 энергии и 5 карт. Кликните карту, затем врага (если враг один — карта играется сразу).
      Над врагами видно их <b>намерение</b>: 🗡 атака, 🛡 защита, ⬆ усиление, 🌀 проклятие, 👁 пожирание осознания.</p>
    <p><b>Осознание 👁️</b> — ресурс Кастанеды. Копите его и тратьте картой «Сдвиг точки сборки» или усиливайте «Перепросмотр».
      Но летуны питаются осознанием: съеденное делает их сильнее.</p>
    <p><b>Карта.</b> ⚔ бой · 👹 элита (реликвия) · ❓ событие · 🔥 место силы (отдых или улучшение карты) · 💰 торговец · 🎁 сундук.</p>
    <p><b>Клавиши:</b> 1–9, 0 — выбрать карту · E / Пробел — закончить ход · Esc / ПКМ — отмена.</p>
  </div>
  <button class="btn" data-act="closeOverlay">Понятно</button>`);
}

// ============================================================
//  Экран: титул
// ============================================================
function showTitle() {
  const saved = loadSave();
  actions = {
    newRun: () => showSelect(),
    cont: () => { run = saved; showMap(); },
    help: () => showHelp(),
  };
  app.innerHTML = `<div class="screen title-screen">
    <div class="sky"></div><div class="stars"></div><div class="moon"></div>
    <div class="title-flyers">${[0, 1, 2, 3].map(i => `<div class="tf tf${i}">${flyerSVG({ w: 120 - i * 18, body: '#05030a', body2: '#1a1026', wing: '#000', eye: '#ffd24d' })}</div>`).join('')}</div>
    <div class="mountains"></div>
    <div class="title-box">
      <h1>Путь Нагваля</h1>
      <p class="subtitle">карточный рогалик о пути воина</p>
      <div class="col">
        ${saved ? `<button class="btn big" data-act="cont">Продолжить путь <small>${HEROES[saved.hero].name}, этаж ${saved.floor}</small></button>` : ''}
        <button class="btn big ${saved ? 'ghost' : ''}" data-act="newRun">Новый путь</button>
        <button class="btn ghost" data-act="help">Как играть</button>
      </div>
      <p class="quote">«Воин принимает свою судьбу, какой бы она ни была, и принимает её с абсолютным смирением.»</p>
    </div>
  </div>`;
}

// ============================================================
//  Экран: выбор героя
// ============================================================
function showSelect() {
  let sel = 'castaneda';
  const render = () => {
    const h = HEROES[sel];
    app.innerHTML = `<div class="screen select-screen">
      <div class="sky dusk"></div><div class="mountains"></div>
      <h2 class="screen-title">Выберите путь</h2>
      <div class="hero-choice">
        ${Object.values(HEROES).map(x => `<div class="hero-card ${x.id === sel ? 'sel' : ''} ${x.playable ? '' : 'locked'}" data-act="pickHero" data-id="${x.id}">
          <img src="${x.portrait}" alt="${x.name}">
          <div class="hc-name">${x.name}</div><div class="hc-title">${x.title}</div>
          ${x.playable ? '' : '<div class="soon">скоро</div>'}
        </div>`).join('')}
      </div>
      <div class="hero-info">
        <img class="hero-full" src="${h.body}" alt="">
        <div class="hi-text">
          <h3>${h.name} <small>${h.title}</small></h3>
          <p>${h.desc}</p>
          ${h.playable ? `<p>❤️ ${h.hp} здоровья · 💰 ${h.gold} песо</p>
            <p>Стартовая реликвия: ${relicHTML(h.relic)} <b>${RELICS[h.relic].name}</b> — ${RELICS[h.relic].desc}</p>
            <p class="muted">Стартовая колода: 5 × Удар, 4 × Оборона, Полевые заметки.</p>`
            : '<p class="muted">Этот герой ещё проходит обучение у дона Хуана. Скоро!</p>'}
          <div class="row">
            <button class="btn ghost" data-act="back">Назад</button>
            <button class="btn big" data-act="start" ${h.playable ? '' : 'disabled'}>Начать путь</button>
          </div>
        </div>
      </div>
    </div>`;
  };
  actions = {
    pickHero: el => { sel = el.dataset.id; render(); },
    back: () => showTitle(),
    start: () => { if (HEROES[sel].playable) newRun(sel); },
  };
  render();
}

// ============================================================
//  Новое прохождение
// ============================================================
function newRun(heroId) {
  const h = HEROES[heroId];
  run = {
    hero: heroId, hp: h.hp, maxHp: h.hp, gold: h.gold,
    deck: h.deck.map(id => mkCard(id)), relics: [],
    map: genMap(), pos: null, path: [], floor: 0, fights: 0,
    seenEvents: [], stats: { kills: 0, elites: 0, cards: 0 },
  };
  gainRelic(h.relic);
  showNeow();
}
function gainRelic(id) {
  run.relics.push(id);
  const r = RELICS[id];
  if (r.onPickup) r.onPickup(run);
}
function randomRelicId() {
  const pool = RELIC_POOL.filter(r => !run.relics.includes(r));
  return pool.length ? pick(pool) : null;
}
function cardPool(rarity) { return HEROES[run.hero].pool.filter(id => CARDS[id].rarity === rarity); }
function rollRarity(elite) {
  const r = Math.random() * 100;
  if (elite) return r < 10 ? 'rare' : r < 50 ? 'uncommon' : 'common';
  return r < 5 ? 'rare' : r < 40 ? 'uncommon' : 'common';
}
function rewardCards(n = 3, elite = false, rarity = null) {
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 100) {
    const id = pick(cardPool(rarity || rollRarity(elite)));
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

// ============================================================
//  Событие-сцена (общий шаблон) + API событий
// ============================================================
function sceneHTML(art, title, text, body) {
  return `${topBar()}<div class="screen scene">
    <div class="sky night"></div><div class="mountains"></div>
    <div class="scene-box">
      <div class="scene-art">${art}</div>
      <div class="scene-text"><h2>${title}</h2><p>${text}</p>${body}</div>
    </div></div>`;
}
const evApi = {
  get run() { return run; },
  damage: n => { run.hp = Math.max(1, run.hp - n); sfx('hurt'); },
  heal: n => { run.hp = Math.min(run.maxHp, run.hp + n); sfx('buff'); },
  randomRelic: () => { const r = randomRelicId(); if (r) gainRelic(r); else run.gold += 50; return r; },
  upgradeRandom: k => {
    const list = shuffle(run.deck.filter(canUpgrade)).slice(0, k);
    list.forEach(c => { c.up = true; });
    return list.map(cardName);
  },
  removeCard: cb2 => pickFromDeck({ title: 'Выберите карту для удаления', filter: () => true }, c => {
    if (!c) return cb2(null);
    run.deck = run.deck.filter(x => x !== c); cb2(cardName(c));
  }),
  chooseCard: (rarity, cb2) => showCardChoice(rewardCards(3, false, rarity), 'Выберите карту', c => cb2(c ? cardName(c) : null)),
  fight: (enc, bonus) => startCombat('event', enc, bonus),
};
function runEvent(ev) {
  const opts = ev.options(evApi);
  const done = text => {
    actions = { next: () => showMap() };
    app.innerHTML = sceneHTML(ev.art, ev.title, text, `<div class="options"><button class="opt" data-act="next"><b>Продолжить</b></button></div>`);
  };
  actions = {
    opt: el => {
      const o = opts[+el.dataset.i];
      if (o.can && !o.can()) return;
      o.go(done);
    },
  };
  app.innerHTML = sceneHTML(ev.art, ev.title, ev.text, `<div class="options">${opts.map((o, i) => {
    const ok = !o.can || o.can();
    return `<button class="opt ${ok ? '' : 'disabled'}" data-act="opt" data-i="${i}"><b>[${o.label}]</b> <span>${o.sub}</span></button>`;
  }).join('')}</div>`);
}

// Дар дона Хуана перед началом пути (аналог Нео)
function showNeow() {
  runEvent({
    title: 'Костёр дона Хуана', art: `<img class="scene-portrait" src="${HEROES.donjuan.portrait}" alt="">`,
    text: 'Ночь в пустыне Соноры. Дон Хуан подбрасывает ветку в огонь. «Летуны пришли за твоим осознанием, — говорит он. — Прежде чем войти в их пустыню, возьми от меня дар. Только один».',
    options: api => [
      { label: 'Щит воина', sub: '+8 к максимальному здоровью.', go: done => { run.maxHp += 8; run.hp += 8; done('Ты чувствуешь, как тело наполняется силой.'); } },
      { label: 'Знание', sub: 'Выбрать одну из 3 редких карт.', go: done => api.chooseCard('rare', n => done(n ? `Дон Хуан учит тебя: «${n}».` : 'Ты отказался от знания. Дон Хуан пожимает плечами.')) },
      { label: 'Очищение', sub: 'Удалить карту из колоды.', go: done => api.removeCard(n => done(n ? `Ты оставляешь «${n}» в огне.` : 'Ты ничего не отдал огню.')) },
      { label: 'Кошель', sub: '+100 песо.', go: done => { run.gold += 100; sfx('gold'); done('«Деньги — тоже сила, если ты безупречен», — смеётся дон Хуан.'); } },
    ],
  });
}

// ============================================================
//  Карта уровня
// ============================================================
const ROWS = 15, COLS = 7;
const NODE_INFO = {
  monster: { icon: '⚔️', name: 'Бой с летунами' },
  elite: { icon: '👹', name: 'Элитный летун' },
  event: { icon: '❓', name: 'Неизвестность' },
  rest: { icon: '🔥', name: 'Место силы' },
  shop: { icon: '💰', name: 'Торговец' },
  treasure: { icon: '🎁', name: 'Сундук' },
  boss: { icon: '👁️', name: 'Хозяин летунов' },
};
function genMap() {
  const nodes = {};
  const key = (r, c) => r + '_' + c;
  const edges = new Set();
  const starts = [];
  for (let p = 0; p < 6; p++) {
    let c = rnd(0, COLS - 1);
    if (p === 1) while (c === starts[0]) c = rnd(0, COLS - 1);
    starts.push(c);
    for (let r = 0; r < ROWS; r++) {
      const k = key(r, c);
      if (!nodes[k]) nodes[k] = { r, c, next: [], type: null, jx: rnd(-14, 14), jy: rnd(-10, 10) };
      if (r === ROWS - 1) break;
      const opts = [c - 1, c, c + 1].filter(x => x >= 0 && x < COLS)
        .filter(nc => nc === c || !edges.has(key(r, nc) + '>' + key(r + 1, c)));
      const nc = pick(opts);
      const e = k + '>' + key(r + 1, nc);
      if (!edges.has(e)) { edges.add(e); nodes[k].next.push(key(r + 1, nc)); }
      c = nc;
    }
  }
  // родители
  const parents = {};
  for (const [k, n] of Object.entries(nodes)) for (const nk of n.next) (parents[nk] = parents[nk] || []).push(k);
  const byRow = Object.entries(nodes).sort((a, b) => a[1].r - b[1].r);
  for (const [k, n] of byRow) {
    if (n.r === 0) { n.type = 'monster'; continue; }
    if (n.r === 8) { n.type = 'treasure'; continue; }
    if (n.r === ROWS - 1) { n.type = 'rest'; continue; }
    const par = (parents[k] || []).map(pk => nodes[pk].type);
    let t = 'monster';
    for (let tries = 0; tries < 12; tries++) {
      const w = [['monster', 45], ['event', 22], ['elite', n.r >= 5 ? 16 : 0], ['rest', n.r >= 5 && n.r !== ROWS - 2 ? 12 : 0], ['shop', n.r >= 2 ? 6 : 0]];
      const tot = w.reduce((s, x) => s + x[1], 0);
      let x = Math.random() * tot;
      for (const [tt, ww] of w) { x -= ww; if (x < 0) { t = tt; break; } }
      if (['elite', 'rest', 'shop'].includes(t) && par.includes(t)) continue;
      break;
    }
    n.type = t;
  }
  return { nodes };
}
function availableNodes() {
  const nodes = run.map.nodes;
  if (!run.pos) return Object.keys(nodes).filter(k => nodes[k].r === 0);
  if (run.pos === 'boss') return [];
  const cur = nodes[run.pos];
  if (cur.r === ROWS - 1) return ['boss'];
  return cur.next;
}

function showMap() {
  cb = null;
  save();
  const nodes = run.map.nodes;
  const avail = availableNodes();
  const W = 720, H = ROWS * 82 + 230;
  const nx = n => 60 + n.c * 100 + n.jx;
  const ny = n => H - 70 - n.r * 82 + n.jy;
  const boss = { x: W / 2, y: 95 };
  const onPath = new Set(run.path);
  let lines = '';
  for (const [k, n] of Object.entries(nodes)) {
    for (const nk of n.next) {
      const m = nodes[nk];
      const walked = onPath.has(k) && onPath.has(nk) && run.path.indexOf(nk) === run.path.indexOf(k) + 1;
      lines += `<line x1="${nx(n)}" y1="${ny(n)}" x2="${nx(m)}" y2="${ny(m)}" class="${walked ? 'walked' : ''}"/>`;
    }
    if (n.r === ROWS - 1) lines += `<line x1="${nx(n)}" y1="${ny(n)}" x2="${boss.x}" y2="${boss.y + 50}" class="${run.pos === 'boss' && run.path[run.path.length - 2] === k ? 'walked' : ''}"/>`;
  }
  const circles = Object.entries(nodes).map(([k, n]) => {
    const info = NODE_INFO[n.type];
    const cls = [avail.includes(k) ? 'avail' : '', onPath.has(k) ? 'visited' : '', run.pos === k ? 'cur' : ''].join(' ');
    return `<g class="mnode ${cls}" ${avail.includes(k) ? `data-act="node" data-k="${k}"` : ''} transform="translate(${nx(n)},${ny(n)})">
      <circle r="24"/><text y="8">${info.icon}</text><title>${info.name}</title></g>`;
  }).join('');
  const bossCls = avail.includes('boss') ? 'avail' : '';
  actions = {
    node: el => enterNode(el.dataset.k),
  };
  app.innerHTML = `${topBar()}<div class="screen map-screen">
    <div class="sky night"></div>
    <div class="map-legend">
      <h3>Акт I</h3><p class="muted">Пустыня летунов</p>
      ${Object.entries(NODE_INFO).map(([, v]) => `<div>${v.icon} ${v.name}</div>`).join('')}
      <p class="muted small">Выберите светящийся узел, чтобы идти дальше.</p>
    </div>
    <div class="map-scroll" id="mapScroll">
      <svg class="map-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
        <g class="lines">${lines}</g>
        <g class="mnode boss ${bossCls}" ${bossCls ? 'data-act="node" data-k="boss"' : ''} transform="translate(${boss.x},${boss.y})">
          <circle r="54"/><text y="16" class="boss-icon">👁️</text><text y="80" class="boss-label">Хозяин летунов</text></g>
        ${circles}
      </svg>
    </div>
  </div>`;
  const sc = document.getElementById('mapScroll');
  const curRow = run.pos && run.pos !== 'boss' ? nodes[run.pos].r : -1;
  sc.scrollTop = Math.max(0, (H - 70 - (curRow + 1) * 82) - sc.clientHeight + 200);
}

function enterNode(k) {
  run.path.push(k);
  run.pos = k;
  if (k === 'boss') { run.floor = ROWS + 1; return startCombat('boss'); }
  const n = run.map.nodes[k];
  run.floor = n.r + 1;
  switch (n.type) {
    case 'monster': return startCombat('monster');
    case 'elite': return startCombat('elite');
    case 'event': {
      let pool = EVENTS.filter(e => !run.seenEvents.includes(e.id));
      if (!pool.length) { run.seenEvents = []; pool = EVENTS; }
      const ev = pick(pool); run.seenEvents.push(ev.id);
      return runEvent(ev);
    }
    case 'rest': return showRest();
    case 'shop': return showShop();
    case 'treasure': return showTreasure();
  }
}

// ============================================================
//  Место силы (отдых)
// ============================================================
function showRest() {
  const heal = Math.floor(run.maxHp * 0.3);
  actions = {
    rest: () => { evApi.heal(heal); after(`Ты спишь у костра, и тело вспоминает силу. +${heal} здоровья.`); },
    upgrade: () => pickFromDeck({ title: 'Перепросмотр: улучшите карту', filter: canUpgrade, upgrade: true }, c => {
      if (!c) return showRest();
      c.up = true; sfx('buff'); after(`Ты перепросмотрел свою жизнь. «${cardName(c)}» улучшена.`);
    }),
  };
  const after = text => {
    actions = { next: () => showMap() };
    app.innerHTML = sceneHTML('🔥', 'Место силы', text, `<div class="options"><button class="opt" data-act="next"><b>Продолжить</b></button></div>`);
  };
  app.innerHTML = sceneHTML('🔥', 'Место силы',
    'Ты нашёл место, где земля отдаёт силу. Летуны не решаются приблизиться к огню.',
    `<div class="options">
      <button class="opt" data-act="rest"><b>[Отдохнуть]</b> <span>Восстановить ${heal} здоровья.</span></button>
      <button class="opt ${run.deck.some(canUpgrade) ? '' : 'disabled'}" data-act="upgrade"><b>[Перепросмотр]</b> <span>Улучшить карту.</span></button>
    </div>`);
}

// ============================================================
//  Сундук
// ============================================================
function showTreasure() {
  const relic = randomRelicId();
  const gold = rnd(25, 45);
  actions = {
    open: () => {
      if (relic) gainRelic(relic); run.gold += gold; sfx('gold');
      actions = { next: () => showMap() };
      app.innerHTML = sceneHTML('🎁', 'Сундук', `Внутри — ${gold} песо${relic ? ` и ${RELICS[relic].icon} <b>${RELICS[relic].name}</b>: ${RELICS[relic].desc}` : ''}.`,
        `<div class="options"><button class="opt" data-act="next"><b>Продолжить</b></button></div>`);
    },
  };
  app.innerHTML = sceneHTML('🧰', 'Сундук', 'Среди камней стоит старый окованный сундук. Похоже, кто-то спрятал его от летунов.',
    `<div class="options"><button class="opt" data-act="open"><b>[Открыть]</b></button></div>`);
}

// ============================================================
//  Торговец
// ============================================================
function showShop() {
  const price = { common: 50, uncommon: 75, rare: 150 };
  const stock = {
    cards: [...rewardCards(2, false, 'common'), ...rewardCards(2, false, 'uncommon'), ...rewardCards(1, false, 'rare')]
      .map(id => ({ card: mkCard(id), price: Math.round(price[CARDS[id].rarity] * (0.9 + Math.random() * 0.2)), sold: false })),
    relics: [],
    removePrice: 75, removed: false,
  };
  const r1 = randomRelicId(); if (r1) stock.relics.push({ id: r1, price: rnd(140, 165), sold: false });
  const r2 = RELIC_POOL.filter(r => !run.relics.includes(r) && r !== r1); if (r2.length) stock.relics.push({ id: pick(r2), price: rnd(140, 165), sold: false });
  // Одна случайная карта со скидкой
  stock.cards[rnd(0, stock.cards.length - 1)].sale = true;
  stock.cards.forEach(x => { if (x.sale) x.price = Math.floor(x.price / 2); });

  const render = () => {
    app.innerHTML = `${topBar()}<div class="screen shop-screen">
      <div class="sky night"></div>
      <div class="shop-keeper"><div class="sk-art">🧙‍♂️</div><p>«Всё, что нужно воину, — здесь. Только не торгуйся, это неблагородно»</p></div>
      <div class="shop-goods">
        <div class="shop-cards">${stock.cards.map((x, i) => `<div class="ware ${x.sold ? 'sold' : ''}">
          ${cardHTML(x.card, { attrs: x.sold ? '' : `data-act="buyCard" data-i="${i}"` })}
          <div class="price ${run.gold < x.price ? 'no' : ''}">${x.sold ? 'продано' : `💰 ${x.price}${x.sale ? ' <span class="sale">−50%</span>' : ''}`}</div></div>`).join('')}</div>
        <div class="shop-bottom">
          ${stock.relics.map((x, i) => `<div class="ware relic-ware ${x.sold ? 'sold' : ''}" ${x.sold ? '' : `data-act="buyRelic" data-i="${i}"`}>
            ${relicHTML(x.id, 'big')}<div class="rw-name">${RELICS[x.id].name}</div>
            <div class="price ${run.gold < x.price ? 'no' : ''}">${x.sold ? 'продано' : `💰 ${x.price}`}</div></div>`).join('')}
          <div class="ware relic-ware ${stock.removed ? 'sold' : ''}" ${stock.removed ? '' : 'data-act="buyRemove"'}>
            <span class="relic big">🗑️</span><div class="rw-name">Удалить карту</div>
            <div class="price ${run.gold < stock.removePrice ? 'no' : ''}">${stock.removed ? 'готово' : `💰 ${stock.removePrice}`}</div></div>
          <button class="btn big" data-act="leave">Уйти ➜</button>
        </div>
      </div></div>`;
  };
  actions = {
    buyCard: el => {
      const x = stock.cards[+el.dataset.i];
      if (x.sold || run.gold < x.price) return;
      run.gold -= x.price; x.sold = true; run.deck.push(x.card); sfx('gold'); render();
    },
    buyRelic: el => {
      const x = stock.relics[+el.dataset.i];
      if (x.sold || run.gold < x.price) return;
      run.gold -= x.price; x.sold = true; gainRelic(x.id); sfx('gold'); render();
    },
    buyRemove: () => {
      if (stock.removed || run.gold < stock.removePrice) return;
      const shopActions = actions;
      pickFromDeck({ title: 'Выберите карту для удаления' }, c => {
        actions = shopActions;
        if (!c) return;
        run.gold -= stock.removePrice; stock.removed = true;
        run.deck = run.deck.filter(z => z !== c); sfx('gold'); render();
      });
    },
    leave: () => showMap(),
  };
  render();
}

// ============================================================
//  БОЙ
// ============================================================
let enemySeq = 1;
function mkEnemy(id) {
  const d = ENEMIES[id];
  const hp = rnd(d.hp[0], d.hp[1]);
  return { uid: 'e' + (enemySeq++), id, def: d, name: d.name, hp, maxHp: hp, block: 0, st: {}, hist: [], turn: 0, move: null, dead: false, seed: rnd(0, 99) };
}
const alive = () => cb.enemies.filter(e => !e.dead);

function playerDmg(base, target) {
  let d = base + (cb.p.st.strength || 0);
  if (cb.p.st.weak) d = Math.floor(d * 0.75);
  if (target && target.st.vulnerable) d = Math.floor(d * 1.5);
  return Math.max(0, d);
}
function enemyDmg(e, base) {
  let d = base + (e.st.strength || 0);
  if (e.st.weak) d = Math.floor(d * 0.75);
  if (cb.p.st.vulnerable) d = Math.floor(d * 1.5);
  return Math.max(0, d);
}
const addSt = (st, k, n) => { st[k] = (st[k] || 0) + n; if (st[k] <= 0) delete st[k]; };

// ---- эффекты на экране ----
let fxq = [];
const fx = (unit, text, cls = '', anim = null) => fxq.push({ unit, text, cls, anim });
function flushFx() {
  const stRect = stage.getBoundingClientRect();
  const perUnit = {};
  for (const f of fxq) {
    const el = document.querySelector(`[data-unit="${f.unit}"]`);
    if (!el) continue;
    if (f.anim) { el.classList.remove(f.anim); void el.offsetWidth; el.classList.add(f.anim); }
    if (!f.text) continue;
    const r = el.getBoundingClientRect();
    const k = perUnit[f.unit] = (perUnit[f.unit] || 0) + 1;
    const d = document.createElement('div');
    d.className = 'float ' + f.cls;
    d.textContent = f.text;
    d.style.left = ((r.left + r.width / 2 - stRect.left) / scale + rnd(-30, 30)) + 'px';
    d.style.top = ((r.top + r.height * 0.35 - stRect.top) / scale - k * 26) + 'px';
    fxLayer.appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }
  fxq = [];
}
function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text;
  fxLayer.appendChild(t);
  setTimeout(() => t.remove(), 1400);
}

// ---- API карт ----
function damageEnemy(e, d) {
  if (e.dead) return false;
  const blocked = Math.min(e.block, d);
  e.block -= blocked;
  const rest = d - blocked;
  e.hp -= rest;
  fx(e.uid, rest > 0 ? `-${rest}` : 'Блок', rest > 0 ? 'dmg' : 'blk', 'hurt');
  sfx(rest > 0 ? 'hit' : 'block');
  if (e.hp <= 0) {
    e.hp = 0; e.dead = true; run.stats.kills++;
    sfx('death');
    if (e.def.boss) cb.enemies.forEach(m => { if (!m.dead) { m.dead = true; m.hp = 0; fx(m.uid, 'бежит!', 'info'); } });
    return true;
  }
  return false;
}
function damagePlayer(d) {
  const p = cb.p;
  const blocked = Math.min(p.block, d);
  p.block -= blocked;
  const rest = d - blocked;
  run.hp = Math.max(0, run.hp - rest);
  fx('hero', rest > 0 ? `-${rest}` : 'Блок', rest > 0 ? 'dmg' : 'blk', 'hurt');
  sfx(rest > 0 ? 'hurt' : 'block');
}
const G = {
  hit(t, base) {
    if (!t || t.dead) t = alive()[0];
    if (!t) return false;
    return damageEnemy(t, playerDmg(base, t));
  },
  hitAll(base) { alive().forEach(e => damageEnemy(e, playerDmg(base, e))); },
  block(n) { cb.p.block += n; fx('hero', `+${n} 🛡`, 'blk'); sfx('block'); },
  draw(n) { drawCards(n); },
  energy(n) { cb.p.energy += n; fx('hero', `+${n} ⚡`, 'info'); },
  aware(n) { addSt(cb.p.st, 'aware', n); fx('hero', `+${n} 👁️`, 'aware'); sfx('aware'); },
  getAware() { return cb.p.st.aware || 0; },
  spendAware() { delete cb.p.st.aware; },
  debuff(t, k, n) { if (t && !t.dead) { addSt(t.st, k, n); fx(t.uid, `${STATUS_INFO[k].icon} ${STATUS_INFO[k].name}`, 'debuff'); sfx('debuff'); } },
  debuffAll(k, n) { alive().forEach(e => G.debuff(e, k, n)); },
  buffSelf(k, n) { addSt(cb.p.st, k, n); fx('hero', `${STATUS_INFO[k].icon} +${n}`, 'buff'); sfx('buff'); },
  cleanse() { delete cb.p.st.weak; delete cb.p.st.vulnerable; fx('hero', 'Очищение', 'buff'); },
  loseHp(n) { run.hp = Math.max(0, run.hp - n); fx('hero', `-${n}`, 'dmg', 'hurt'); },
  power(k, n) { addSt(cb.p.st, k, n); fx('hero', `${STATUS_INFO[k].icon} ${STATUS_INFO[k].name}`, 'buff'); sfx('buff'); },
};

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (!cb.draw.length) {
      if (!cb.discard.length) break;
      cb.draw = shuffle(cb.discard); cb.discard = [];
    }
    const c = cb.draw.pop();
    if (cb.hand.length >= 10) { cb.discard.push(c); toast('Рука полна'); }
    else cb.hand.push(c);
  }
}

function startCombat(kind, list = null, bonusGold = 0) {
  if (!list) {
    if (kind === 'boss') list = ENCOUNTERS.boss[0];
    else if (kind === 'elite') list = pick(ENCOUNTERS.elite);
    else list = pick(run.fights < 3 ? ENCOUNTERS.easy : ENCOUNTERS.hard);
  }
  cb = {
    kind, bonusGold,
    enemies: list.map(mkEnemy),
    draw: shuffle(run.deck.map(c => ({ ...c }))), hand: [], discard: [], exhaust: [],
    p: { block: 0, energy: 0, maxEnergy: 3, st: {} },
    turn: 0, selected: null, busy: true, justApplied: new Set(), over: false,
  };
  actions = combatActions;
  renderCombatShell();
  run.relics.forEach(r => RELICS[r].combatStart && RELICS[r].combatStart(G));
  cb.enemies.forEach(chooseIntent);
  updateCombat();
  setTimeout(() => startTurn(), 500);
}

function chooseIntent(e) {
  if (e.dead) return;
  e.move = e.def.ai(e, cb);
  e.hist.push(e.move);
  e.turn++;
}

function startTurn() {
  if (cb.over) return;
  const p = cb.p;
  cb.turn++;
  if (cb.turn > 1) p.block = 0;
  p.energy = p.maxEnergy;
  if (p.st.death) G.buffSelf('strength', p.st.death);
  drawCards(5);
  run.relics.forEach(r => RELICS[r].turnStart && RELICS[r].turnStart(G, cb.turn));
  cb.busy = false;
  sfx('turn');
  banner(cb.turn === 1 ? (cb.kind === 'boss' ? 'Хозяин летунов' : 'Бой') : 'Ваш ход');
  updateCombat();
}

function banner(text) {
  const b = document.createElement('div');
  b.className = 'banner'; b.textContent = text;
  fxLayer.appendChild(b);
  setTimeout(() => b.remove(), 1100);
}

async function playCard(uid, target) {
  if (cb.busy || cb.over) return;
  const i = cb.hand.findIndex(c => c.uid === uid);
  if (i < 0) return;
  const c = cb.hand[i], d = CARDS[c.id];
  if (d.unplayable) { toast('Эту карту нельзя разыграть'); return; }
  const cost = costOf(c);
  if (cost > cb.p.energy) { toast('Недостаточно энергии'); return; }
  cb.p.energy -= cost;
  cb.hand.splice(i, 1);
  cb.selected = null;
  sfx('card');
  if (d.type === 'attack') fx('hero', '', '', 'lunge');
  d.play(G, c.up, target);
  if (d.type === 'power') { /* способности исчезают */ }
  else if (d.exhaust) { cb.exhaust.push(c); }
  else cb.discard.push(c);
  run.stats.cards++;
  updateCombat();
  await checkCombatEnd();
}

async function checkCombatEnd() {
  if (cb.over) return true;
  if (run.hp <= 0) { cb.over = true; await sleep(700); gameOver(); return true; }
  if (!alive().length) { cb.over = true; await sleep(800); winCombat(); return true; }
  return false;
}

async function endTurn() {
  if (cb.busy || cb.over) return;
  cb.busy = true; cb.selected = null;
  const p = cb.p;
  // конец хода игрока
  if (p.st.impecc) G.block(p.st.impecc);
  if (p.st.ally) {
    const t = pick(alive());
    if (t) { damageEnemy(t, p.st.ally); fx('hero', '💨', 'info'); }
  }
  for (const c of cb.hand) {
    if (CARDS[c.id].ethereal) { cb.exhaust.push(c); fx('hero', `${CARDS[c.id].name} сгорает`, 'info'); }
    else cb.discard.push(c);
  }
  cb.hand = [];
  updateCombat();
  if (await checkCombatEnd()) return;
  await sleep(450);

  // ход врагов
  for (const e of alive()) e.block = 0;
  updateCombat();
  for (const e of [...cb.enemies]) {
    if (e.dead || cb.over) continue;
    await doEnemyMove(e);
    if (await checkCombatEnd()) return;
    await sleep(380);
  }
  // тики дебаффов
  for (const e of cb.enemies) for (const k of ['weak', 'vulnerable']) if (e.st[k]) addSt(e.st, k, -1);
  for (const k of ['weak', 'vulnerable']) if (p.st[k] && !cb.justApplied.has(k)) addSt(p.st, k, -1);
  cb.justApplied.clear();
  cb.enemies.forEach(chooseIntent);
  updateCombat();
  await sleep(200);
  startTurn();
}

async function doEnemyMove(e) {
  const m = e.def.moves[e.move];
  const p = cb.p;
  fx(e.uid, m.name, 'movename', m.dmg ? 'attack' : 'pulse');
  updateCombat();
  await sleep(300);
  if (m.block) { e.block += m.block; fx(e.uid, `+${m.block} 🛡`, 'blk'); sfx('block'); }
  if (m.buff) for (const [k, v] of Object.entries(m.buff)) { addSt(e.st, k, v); fx(e.uid, `${STATUS_INFO[k].icon} +${v}`, 'buff'); sfx('buff'); }
  if (m.dmg) {
    for (let i = 0; i < (m.times || 1); i++) {
      damagePlayer(enemyDmg(e, m.dmg));
      updateCombat();
      if (run.hp <= 0) return;
      if ((m.times || 1) > 1) await sleep(200);
    }
  }
  if (m.heal) { e.hp = Math.min(e.maxHp, e.hp + m.heal); fx(e.uid, `+${m.heal} ❤`, 'heal'); }
  if (m.debuff) for (const [k, v] of Object.entries(m.debuff)) {
    addSt(p.st, k, v); cb.justApplied.add(k);
    fx('hero', `${STATUS_INFO[k].icon} ${STATUS_INFO[k].name}`, 'debuff'); sfx('debuff');
  }
  if (m.drain) {
    const n = Math.min(p.st.aware || 0, m.drain);
    if (n > 0) {
      addSt(p.st, 'aware', -n); addSt(e.st, 'strength', n);
      fx('hero', `-${n} 👁️`, 'drain'); fx(e.uid, `съел осознание: 💪 +${n}`, 'drain'); sfx('drain');
    }
  }
  if (m.addCards) {
    for (let i = 0; i < m.addCards.n; i++) {
      const c = mkCard(m.addCards.id);
      if (m.addCards.to === 'draw') cb.draw.splice(rnd(0, cb.draw.length), 0, c); else cb.discard.push(c);
    }
    fx('hero', `+${m.addCards.n} 🌑 ${CARDS[m.addCards.id].name}`, 'debuff');
  }
  if (m.summon) {
    const room = 4 - alive().length;
    m.summon.slice(0, Math.max(0, room)).forEach(id => {
      const ne = mkEnemy(id);
      cb.enemies.push(ne);
      ensureEnemyEl(ne, true);
    });
  }
  updateCombat();
}

// ---- намерения ----
function intentInfo(e) {
  const m = e.def.moves[e.move];
  if (!m) return { html: '', tip: '' };
  let icons = [], tip = [`<b>${m.name}</b>`];
  if (m.dmg) {
    const d = enemyDmg(e, m.dmg);
    icons.push(`<span class="i-atk">🗡️ ${d}${m.times > 1 ? '×' + m.times : ''}</span>`);
    tip.push(`Атакует на ${d}${m.times > 1 ? ' × ' + m.times : ''} урона.`);
  }
  if (m.block) { icons.push('🛡️'); tip.push(`Получит ${m.block} Защиты.`); }
  if (m.buff) { icons.push('⬆️'); tip.push('Усиливается.'); }
  if (m.debuff) { icons.push('🌀'); tip.push('Накладывает: ' + Object.entries(m.debuff).map(([k, v]) => `${STATUS_INFO[k].name} ${v}`).join(', ') + '.'); }
  if (m.drain) { icons.push('👁️'); tip.push(m.drain >= 99 ? 'Съест всё ваше Осознание и станет сильнее на столько же.' : `Съест ${m.drain} Осознания и станет сильнее.`); }
  if (m.heal) tip.push(`Восстановит ${m.heal} здоровья.`);
  if (m.addCards) { icons.push('🌑'); tip.push(`Подкинет в колоду ${m.addCards.n} × «${CARDS[m.addCards.id].name}».`); }
  if (m.summon) { icons.push('🦇'); tip.push('Призовёт летунов.'); }
  return { html: icons.join(' '), tip: tip.join('<br>') };
}

function statusesHTML(st) {
  return Object.entries(st).map(([k, n]) => {
    const s = STATUS_INFO[k]; if (!s) return '';
    return `<span class="st ${s.debuff ? 'bad' : ''}" data-tip="${esc(`<b>${s.name}</b><br>${s.tip.replace('{n}', n)}`)}">${s.icon}<b>${n}</b></span>`;
  }).join('');
}
function barHTML(hp, max, block) {
  return `<div class="bar ${block ? 'has-block' : ''}"><div class="fill" style="width:${Math.max(0, hp / max * 100)}%"></div><span>${hp}/${max}</span>
    ${block ? `<div class="blockbadge">${block}</div>` : ''}</div>`;
}

// ---- отрисовка боя ----
function renderCombatShell() {
  const h = HEROES[run.hero];
  app.innerHTML = `${topBar()}<div class="screen combat ${cb.kind === 'boss' ? 'boss-fight' : ''}">
    <div class="sky night"></div><div class="stars"></div><div class="mountains"></div><div class="ground"></div>
    <div class="field">
      <div class="unit hero" data-unit="hero">
        <div class="sprite"><img src="${h.body}" alt=""></div>
        <div class="u-bar"></div><div class="statuses"></div>
      </div>
      <div class="enemies" id="enemies"></div>
    </div>
    <div class="hint" id="hint"></div>
    <div class="bottom">
      <div class="energy" id="energy" data-tip="Энергия. Восстанавливается каждый ход."></div>
      <button class="pile draw-pile" data-act="viewDraw" data-tip="Колода добора (порядок скрыт)">🂠<b id="drawN"></b></button>
      <div class="hand" id="hand"></div>
      <button class="pile discard-pile" data-act="viewDiscard" data-tip="Сброс">♻️<b id="discN"></b></button>
      <button class="pile exhaust-pile" data-act="viewExhaust" data-tip="Сгоревшие карты">🔥<b id="exhN"></b></button>
      <button class="end-turn" id="endTurn" data-act="endTurn">Завершить ход</button>
    </div>
  </div>`;
  cb.enemies.forEach(e => ensureEnemyEl(e));
}
function ensureEnemyEl(e, summoned = false) {
  if (document.querySelector(`[data-unit="${e.uid}"]`)) return;
  const div = document.createElement('div');
  div.className = `unit enemy ${e.def.elite ? 'elite' : ''} ${e.def.boss ? 'boss' : ''} ${summoned ? 'summoned' : ''}`;
  div.dataset.unit = e.uid;
  div.dataset.act = 'target';
  div.dataset.silent = '1';
  div.innerHTML = `<div class="intent"></div><div class="sprite">${flyerSVG(e.def.art)}</div>
    <div class="u-name">${e.name}</div><div class="u-bar"></div><div class="statuses"></div>`;
  document.getElementById('enemies').appendChild(div);
}

function updateCombat() {
  if (!cb) return;
  refreshTop();
  const p = cb.p;
  const hero = document.querySelector('[data-unit="hero"]');
  hero.querySelector('.u-bar').innerHTML = barHTML(run.hp, run.maxHp, p.block);
  hero.querySelector('.statuses').innerHTML = statusesHTML(p.st);
  const sel = cb.selected ? cb.hand.find(c => c.uid === cb.selected) : null;
  const targeting = sel && CARDS[sel.id].target === 'enemy';
  for (const e of cb.enemies) {
    const el = document.querySelector(`[data-unit="${e.uid}"]`);
    if (!el) continue;
    el.classList.toggle('dead', e.dead);
    el.classList.toggle('targetable', !!targeting && !e.dead);
    const ii = intentInfo(e);
    const ie = el.querySelector('.intent');
    ie.innerHTML = e.dead || cb.over ? '' : ii.html;
    ie.dataset.tip = ii.tip;
    el.querySelector('.u-bar').innerHTML = barHTML(e.hp, e.maxHp, e.block);
    el.querySelector('.statuses').innerHTML = statusesHTML(e.st);
  }
  document.getElementById('energy').innerHTML = `<b>${p.energy}</b>/${p.maxEnergy}`;
  document.getElementById('drawN').textContent = cb.draw.length;
  document.getElementById('discN').textContent = cb.discard.length;
  document.getElementById('exhN').textContent = cb.exhaust.length;
  const et = document.getElementById('endTurn');
  et.disabled = cb.busy || cb.over;
  et.textContent = cb.busy && !cb.over ? 'Ход врагов…' : 'Завершить ход';
  document.getElementById('hint').textContent = targeting ? 'Выберите цель' : '';
  renderHand();
  flushFx();
}

function renderHand() {
  const hand = document.getElementById('hand');
  const n = cb.hand.length;
  const spread = Math.min(118, 760 / Math.max(1, n));
  hand.innerHTML = cb.hand.map((c, i) => {
    const mid = (n - 1) / 2, off = i - mid;
    const x = off * spread, rot = off * 3.2, y = Math.abs(off) * Math.abs(off) * 2.6;
    const d = CARDS[c.id];
    const playable = !d.unplayable && costOf(c) <= cb.p.energy && !cb.busy;
    const cls = [playable ? 'playable' : 'unplayable', cb.selected === c.uid ? 'sel' : ''].join(' ');
    return cardHTML(c, {
      combat: true, cls: 'in-hand ' + cls, attrs: `data-act="card" data-silent="1" data-key="${i < 10 ? (i + 1) % 10 : ''}"`,
      style: `--x:${x}px;--y:${y}px;--r:${rot}deg;z-index:${cb.selected === c.uid ? 50 : i + 1}`,
    });
  }).join('');
}

function selectCard(uid) {
  if (cb.busy || cb.over) return;
  const c = cb.hand.find(x => x.uid === uid);
  if (!c) return;
  const d = CARDS[c.id];
  if (cb.selected === uid) { cb.selected = null; updateCombat(); return; }
  if (d.unplayable) { toast('Эту карту нельзя разыграть'); return; }
  if (costOf(c) > cb.p.energy) { toast('Недостаточно энергии'); return; }
  if (d.target === 'enemy') {
    const a = alive();
    if (a.length === 1) { playCard(uid, a[0]); return; }
    cb.selected = uid; sfx('click'); updateCombat();
  } else playCard(uid, null);
}

const combatActions = {
  card: el => selectCard(+el.dataset.uid),
  target: el => {
    if (!cb.selected) return;
    const e = cb.enemies.find(x => x.uid === el.dataset.unit);
    if (!e || e.dead) return;
    playCard(cb.selected, e);
  },
  endTurn: () => endTurn(),
  viewDraw: () => showDeckView(cb.draw, 'Колода добора'),
  viewDiscard: () => showDeckView(cb.discard, 'Сброс'),
  viewExhaust: () => showDeckView(cb.exhaust, 'Сгоревшие карты'),
  _bg: e => { if (cb && cb.selected && !e.target.closest('.card')) { cb.selected = null; updateCombat(); } },
};

document.addEventListener('keydown', e => {
  if (!cb || cb.over || overlay.classList.contains('open')) {
    if (e.key === 'Escape' && overlay.classList.contains('open') && overlay.querySelector('[data-act="closeOverlay"]')) closeOverlay();
    return;
  }
  if (e.key === 'Escape') { cb.selected = null; updateCombat(); return; }
  if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У' || e.key === ' ') { e.preventDefault(); endTurn(); return; }
  if (/^[0-9]$/.test(e.key)) {
    const i = e.key === '0' ? 9 : +e.key - 1;
    if (cb.hand[i]) selectCard(cb.hand[i].uid);
  }
});

// ---- итог боя ----
function winCombat() {
  sfx('win');
  run.relics.forEach(r => RELICS[r].combatEnd && RELICS[r].combatEnd(run));
  run.fights++;
  const kind = cb.kind, bonus = cb.bonusGold || 0;
  if (kind === 'elite') run.stats.elites++;
  cb = null;
  if (kind === 'boss') return showVictory();
  const rewards = [];
  const gold = (kind === 'elite' ? rnd(25, 35) : rnd(10, 20)) + bonus;
  rewards.push({ type: 'gold', n: gold });
  if (kind === 'elite') { const r = randomRelicId(); if (r) rewards.push({ type: 'relic', id: r }); }
  rewards.push({ type: 'card', ids: rewardCards(3, kind === 'elite') });
  showRewards(rewards, kind === 'elite' ? 'Элитный летун повержен!' : 'Летуны рассеяны!');
}

function showRewards(rewards, title) {
  const render = () => {
    app.innerHTML = `${topBar()}<div class="screen scene">
      <div class="sky night"></div><div class="mountains"></div>
      <div class="rewards">
        <h2>${title}</h2>
        <p class="muted">Награды</p>
        ${rewards.map((r, i) => r.taken ? '' : `<button class="reward" data-act="take" data-i="${i}">${
          r.type === 'gold' ? `💰 ${r.n} песо` :
          r.type === 'relic' ? `${RELICS[r.id].icon} ${RELICS[r.id].name}` :
          '🂠 Добавить карту в колоду'}</button>`).join('')}
        <button class="btn big" data-act="next">${rewards.every(r => r.taken) ? 'Продолжить' : 'Пропустить остальное'} ➜</button>
      </div></div>`;
  };
  actions = {
    take: el => {
      const r = rewards[+el.dataset.i];
      if (r.type === 'gold') { run.gold += r.n; r.taken = true; sfx('gold'); render(); }
      else if (r.type === 'relic') { gainRelic(r.id); r.taken = true; sfx('buff'); render(); }
      else {
        showCardChoice(r.ids, 'Выберите карту', c => { if (c) r.taken = true; actions = rewardActions; render(); });
      }
    },
    next: () => showMap(),
  };
  const rewardActions = actions;
  render();
}

// ---- поражение / победа ----
function statsHTML() {
  return `<div class="stats">
    <div>Этаж: <b>${run.floor}</b></div><div>Летунов повержено: <b>${run.stats.kills}</b></div>
    <div>Элит: <b>${run.stats.elites}</b></div><div>Карт разыграно: <b>${run.stats.cards}</b></div>
    <div>Колода: <b>${run.deck.length}</b></div><div>Реликвий: <b>${run.relics.length}</b></div></div>`;
}
function gameOver() {
  sfx('lose');
  clearSave();
  cb = null;
  actions = { title: () => { run = null; showTitle(); }, again: () => { const h = run.hero; newRun(h); } };
  app.innerHTML = `<div class="screen end-screen lose">
    <div class="sky night"></div><div class="mountains"></div>
    <div class="end-box">
      <h1>Летуны насытились</h1>
      <p>Осознание Кастанеды поглощено. Но смерть — лишь советчица воина.</p>
      ${statsHTML()}
      <div class="row"><button class="btn big" data-act="again">Попробовать снова</button><button class="btn ghost" data-act="title">В меню</button></div>
    </div></div>`;
}
function showVictory() {
  clearSave();
  actions = { title: () => { run = null; showTitle(); } };
  app.innerHTML = `<div class="screen end-screen win">
    <div class="sky dawn"></div><div class="mountains"></div>
    <div class="end-box">
      <h1>Акт I пройден!</h1>
      <p>Хозяин летунов рассеялся в предрассветном тумане. Дон Хуан улыбается: «Теперь ты знаешь, кто питается тобой. Это только начало пути».</p>
      <div class="hero-row"><img src="${HEROES.castaneda.body}" alt=""><img src="${HEROES.donjuan.body}" alt=""><img src="${HEROES.genaro.body}" alt=""></div>
      ${statsHTML()}
      <p class="muted">Продолжение следует: Акт II, Дон Хуан и Дон Хенаро — в разработке.</p>
      <div class="row"><button class="btn big" data-act="title">В главное меню</button></div>
    </div></div>`;
}

// ============================================================
//  Старт
// ============================================================
showTitle();
