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
let speedMul = +localStorage.getItem('nagual_speed') || 1;   // ×1 / ×2 / ×3 — ускорение боя
const sleep = ms => new Promise(r => setTimeout(r, ms / speedMul));
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
stage.style.setProperty('--spd', +localStorage.getItem('nagual_speed') || 1);

// ============================================================
//  Переходы между экранами: старый экран уходит «призраком» поверх нового
// ============================================================
function beginSwap(kind = 'fade') {
  tooltip.style.display = 'none';
  if (app.firstChild) {
    const ghost = document.createElement('div');
    ghost.className = 'scr-ghost scr-ghost-' + kind;
    // при переносе узлов браузер сбрасывает прокрутку — запоминаем и восстанавливаем
    const scrolled = [...app.querySelectorAll('*')].filter(el => el.scrollTop > 0).map(el => [el, el.scrollTop]);
    while (app.firstChild) ghost.appendChild(app.firstChild);
    stage.insertBefore(ghost, app.nextSibling);
    scrolled.forEach(([el, top]) => { el.style.scrollBehavior = 'auto'; el.scrollTop = top; });
    setTimeout(() => ghost.remove(), 1300);
  }
  if (kind === 'combat' || kind === 'boss') {
    const w = document.createElement('div');
    w.className = 'wipe wipe-' + kind;
    w.innerHTML = '<i></i><i></i><b></b>';
    fxLayer.appendChild(w);
    setTimeout(() => w.remove(), 1500);
  }
  app.className = '';
  void app.offsetWidth;
  app.className = 'enter-' + kind;
  // после анимации снимаем класс — браузер перерисует экран в полной чёткости
  clearTimeout(app._enterT);
  app._enterT = setTimeout(() => { if (app.className === 'enter-' + kind) app.className = ''; }, 1900);
}
// Плавающие светлячки/искры на фоне
const motes = (n = 16, cls = '') => `<div class="motes ${cls}">${Array.from({ length: n }, () =>
  `<i style="--x:${rnd(0, 100)}%;--d:${rnd(9, 22)}s;--dl:-${rnd(0, 22)}s;--s:${rnd(2, 5)}px;--dx:${rnd(-80, 80)}px"></i>`).join('')}</div>`;

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
  if (typeof drag !== 'undefined' && drag && drag.active) { tooltip.style.display = 'none'; return; }
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
  sound: el => { muted = !muted; localStorage.setItem('nagual_mute', muted ? '1' : '0'); el.classList.toggle('off', muted); refreshTop(); },
  music: el => { Music.toggle(); el.classList.toggle('off', musicMuted); refreshTop(); },
  menu: () => showMenu(),
  potion: el => openPotionPop(+el.dataset.i),
  drinkPotion: el => { closePotionPop(); drinkPotion(+el.dataset.i); },
  dropPotion: el => {
    const i = +el.dataset.i;
    closePotionPop();
    const slot = document.querySelectorAll('.tb-potions .potion-slot')[i];
    if (slot) burst(slot, POTIONS[run.potions[i]].glow, 10, 0.5);
    run.potions[i] = null; save(); refreshTop();
  },
  speed: el => {
    speedMul = speedMul >= 3 ? 1 : speedMul + 1;
    localStorage.setItem('nagual_speed', speedMul);
    el.textContent = `⏩ ×${speedMul}`;
    stage.style.setProperty('--spd', speedMul);
  },
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
    uidSeq = Math.max(1, ...r.deck.map(c => c.uid), ...JSON.stringify(r).match(/"uid":\d+/g).map(x => +x.slice(6))) + 1;
    r.potions = r.potions || Array(POTION_SLOTS).fill(null);
    r.flags = r.flags || {};
    r.curses = r.curses || [];
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
  const desc = markKeywords(d.desc(c.up, o.combat ? fmtCombat(o.target || null) : fmtPlain), found);
  const tip = [...found].map(k => `<b>${k}</b><br>${KEYWORDS[k]}`).join('<hr>');
  return `<div class="card t-${d.type} r-${d.rarity} ${c.up ? 'up' : ''} ${o.cls || ''}" data-uid="${c.uid}" ${o.attrs || ''} ${tip && !o.noTip ? `data-tip="${esc(tip)}"` : ''} ${o.style ? `style="${o.style}"` : ''}>
    <div class="c-frame"></div>
    ${cost === null ? '' : `<div class="c-cost">${cost}</div>`}
    <div class="c-name">${d.name}${c.up ? '+' : ''}</div>
    <div class="c-art"><span>${d.art}</span></div>
    <div class="c-type">${TYPE_NAMES[d.type]}${d.rarity !== 'basic' && d.rarity !== 'special' ? ' · ' + RARITY_NAMES[d.rarity] : ''}</div>
    <div class="c-desc ${(n => n > 76 ? 'long xlong' : n > 64 ? 'long' : '')(desc.replace(/<[^>]+>/g, '').length)}"><span>${desc}</span></div>
  </div>`;
}
function relicHTML(id, extra = '') {
  const r = RELICS[id];
  return `<span class="relic ${extra}" data-tip="${esc(`<b>${r.name}</b><br>${r.desc}`)}">${r.icon}</span>`;
}

// ============================================================
//  Зелья
// ============================================================
let potionSeq = 0;
function potionSVG(id) {
  const p = POTIONS[id], k = 'pt' + (potionSeq++);
  return `<svg class="potion-svg" viewBox="0 0 40 50">
    <defs>
      <radialGradient id="${k}l" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="${p.glow}"/><stop offset=".55" stop-color="${p.color}"/><stop offset="1" stop-color="#0008"/></radialGradient>
      <clipPath id="${k}c"><circle cx="20" cy="32" r="13.2"/></clipPath>
    </defs>
    <ellipse cx="20" cy="47" rx="11" ry="2" fill="#000" opacity=".4"/>
    <rect x="15.5" y="8" width="9" height="12" rx="1.5" fill="#ffffff18" stroke="#efe2c8" stroke-width="1.2"/>
    <rect x="14" y="3.5" width="12" height="6" rx="2" fill="#8a5a2a" stroke="#3a2210" stroke-width=".8"/>
    <circle cx="20" cy="32" r="14" fill="#ffffff12" stroke="#efe2c8" stroke-width="1.4"/>
    <g clip-path="url(#${k}c)">
      <g class="liquid"><path d="M0 28 Q10 25 20 28 T40 28 L40 50 L0 50 Z" fill="url(#${k}l)"/></g>
      <circle class="bub b1" cx="15" cy="40" r="1.4" fill="${p.glow}"/><circle class="bub b2" cx="24" cy="42" r="1" fill="${p.glow}"/><circle class="bub b3" cx="20" cy="44" r="1.2" fill="${p.glow}"/>
    </g>
    <ellipse cx="14.5" cy="27" rx="2.6" ry="5" fill="#fff" opacity=".35" transform="rotate(20 14.5 27)"/>
  </svg>`;
}
function potionSlotsHTML() {
  return `<div class="tb-potions">${run.potions.map((id, i) => id
    ? `<button class="potion-slot full" data-act="potion" data-i="${i}" style="--pc:${POTIONS[id].glow}" data-tip="${esc(`<b>${POTIONS[id].name}</b><br>${POTIONS[id].desc}`)}">${potionSVG(id)}</button>`
    : `<span class="potion-slot empty" data-tip="Пустая ячейка для зелья"></span>`).join('')}</div>`;
}
const hasPotionSlot = () => run.potions.includes(null);
function gainPotion(id) {
  const i = run.potions.indexOf(null);
  if (i < 0) return false;
  run.potions[i] = id;
  refreshTop();
  const slot = document.querySelectorAll('.tb-potions .potion-slot')[i];
  if (slot) slot.classList.add('gained');
  return true;
}
function randomPotionId() {
  const r = Math.random() * 100;
  const rar = r < 10 ? 'rare' : r < 40 ? 'uncommon' : 'common';
  return pick(Object.keys(POTIONS).filter(k => POTIONS[k].rarity === rar));
}
function closePotionPop() { document.querySelectorAll('.potion-pop').forEach(x => x.remove()); }
function openPotionPop(i) {
  closePotionPop();
  const id = run.potions[i];
  if (!id) return;
  const p = POTIONS[id];
  const inCombat = cb && !cb.over;
  const canDrink = p.anytime ? !(cb && (cb.busy || cb.over)) : inCombat && !cb.busy && !cb.playing;
  const slot = document.querySelectorAll('.tb-potions .potion-slot')[i];
  const pt = stagePt(slot, 1);
  const pop = document.createElement('div');
  pop.className = 'potion-pop';
  pop.style.left = (pt.x - 120) + 'px'; pop.style.top = (pt.y + 10) + 'px';
  pop.style.setProperty('--pc', p.glow);
  pop.innerHTML = `<div class="pp-head"><div class="pp-flask">${potionSVG(id)}</div><div><b>${p.name}</b><p>${p.desc}</p></div></div>
    <div class="pp-btns">
      <button class="btn" data-act="drinkPotion" data-i="${i}" ${canDrink ? '' : 'disabled'}>Выпить</button>
      <button class="btn ghost" data-act="dropPotion" data-i="${i}">Выбросить</button>
    </div>
    ${canDrink ? '' : `<p class="pp-note">${p.anytime ? 'Сейчас нельзя' : 'Только в бою'}</p>`}`;
  stage.appendChild(pop);
}
document.addEventListener('click', e => {
  if (!e.target.closest('.potion-pop') && !e.target.closest('.potion-slot')) closePotionPop();
}, true);

// ============================================================
//  Верхняя панель
// ============================================================
function topBar() {
  const h = HEROES[run.hero];
  return `<div class="topbar">
    <div class="tb-hero" data-tip="${esc(`<b>${h.name}</b><br>${h.title}`)}"><img src="${h.portrait}" alt=""><div><b>${h.name.split(' ').pop()}</b><span>${h.title}</span></div></div>
    <div class="tb-stat" data-tip="Здоровье">❤️ <b>${run.hp}/${run.maxHp}</b></div>
    <div class="tb-stat" data-tip="Песо">💰 <b>${run.gold}</b></div>
    ${potionSlotsHTML()}
    ${glowHTML()}
    <div class="tb-relics">${(run.curses || []).map(c => `<span class="relic curse" data-tip="${esc(`<b>${CURSES[c].name}</b><br>${CURSES[c].desc}<br><i>Снимается «Святой водой курандеры» или у курандеры.</i>`)}">${CURSES[c].icon}</span>`).join('')}${run.relics.map(r => relicHTML(r)).join('')}</div>
    <div class="tb-floor" data-tip="Акт I · Пустыня летунов">Акт I · Этаж ${run.floor}</div>
    <button class="tb-btn" data-act="deck" data-tip="Посмотреть колоду">🂠 <b>${run.deck.length}</b></button>
    <button class="tb-btn ${musicMuted ? 'off' : ''}" data-act="music" data-tip="Музыка">🎵</button>
    <button class="tb-btn ${muted ? 'off' : ''}" data-act="sound" data-tip="Звуки">🔊</button>
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
    <p><b>Бой.</b> Каждый ход у вас 3 энергии и 5 карт. Перетащите карту на врага (прицельные) или вверх на поле (остальные). Можно и кликом: карта, затем враг.
      Над врагами видно их <b>намерение</b>: 🗡 атака, 🛡 защита, ⬆ усиление, 🌀 проклятие, 👁 пожирание осознания.</p>
    <p><b>Осознание 👁️</b> — ресурс Кастанеды. Копите его и тратьте: «Вспышка осознания» бьёт всех врагов, «Удар намерения» тратит 1 очко на второй удар, «Сдвиг точки сборки» — мощный одиночный удар, «Перепросмотр» даёт Защиту.
      Но летуны питаются осознанием: съеденное делает их сильнее.</p>
    <p><b>Свечение кокона ✨.</b> Осознание, оставшееся после победы, переходит в свечение и копится через весь забег:
      10 — <b>Мастер первого внимания</b> (+1 Осознание в начале боя), 20 — <b>Мастер второго внимания</b> (летуны перестают пожирать Осознание),
      30 — <b>Мастер третьего внимания</b> (каждый бой начинается с картой «Огонь изнутри»).</p>
    <p><b>Редкие летуны и проклятия.</b> Изредка встречаются редкие летуны. Шепчущий летун и Летун дрожи, если их удар пробьёт Защиту,
      накладывают постоянное проклятие (🕸️ на 1 карту меньше в наградах, 🖐️ зелья разливаются с шансом 50%).
      Снять его можно «Святой водой курандеры» или у курандеры. <b>Тёмное облако</b> вцепляется в героя без Защиты — сорвите его 15+ уроном за ход.</p>
    <p><b>Ярость.</b> На 6-м ходу (элиты — на 7-м, босс — на 14-м) летуны впадают в ярость.
      Каждый их ход, помимо обычного действия, каждый летун сжирает 2 Осознания — затягивая бой, вы теряете осознанность.
      Быстрая победа приносит больше песо.</p>
    <p><b>Карта.</b> ⚔ бой · 👹 элита (реликвия) · ❓ событие · 🔥 место силы (отдых или улучшение карты) · 💰 торговец · 🎁 сундук.</p>
    <p><b>Зелья</b> — в ячейках вверху: кликните по флакону, чтобы выпить или выбросить. Выпадают после боёв и продаются у торговца.</p>
    <p><b>Клавиши:</b> 1–9, 0 — выбрать карту · E / Пробел — закончить ход · Esc / ПКМ — отмена · ⏩ — скорость боя.</p>
  </div>
  <button class="btn" data-act="closeOverlay">Понятно</button>`);
}

function sigilSVG() {
  const rays = Array.from({ length: 24 }, (_, i) => `<line x1="200" y1="40" x2="200" y2="${i % 2 ? 70 : 58}" transform="rotate(${i * 15} 200 200)"/>`).join('');
  return `<svg viewBox="0 0 400 400"><g class="sg-outer">${rays}<circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="138" stroke-dasharray="4 10"/></g>
    <g class="sg-inner"><path d="M200 95 L291 252 L109 252 Z"/><path d="M200 305 L109 148 L291 148 Z"/><circle cx="200" cy="200" r="100"/></g>
    <g class="sg-eye"><path d="M140 200 Q200 150 260 200 Q200 250 140 200 Z"/><circle cx="200" cy="200" r="18"/></g></svg>`;
}

// ============================================================
//  Экран: титул
// ============================================================
function showTitle(fromIntro = false) {
  const saved = loadSave();
  actions = {
    newRun: () => showSelect(),
    cont: () => { run = saved; if (run.room) openRoom(); else showMap(); },
    help: () => showHelp(),
  };
  if (!fromIntro) beginSwap('fade');
  else { app.className = ''; }
  app.innerHTML = `<div class="screen title-screen">
    ${desertHTML('title-desert')}
    <div class="title-flyers">${[0, 1, 2].map(i => `<div class="tf tf${i}">${flyerSVG({ w: 90 - i * 18, body: '#05030a', body2: '#1a1026', wing: '#000', eye: '#ffd24d' })}</div>`).join('')}</div>
    ${motes(16)}
    <div class="t-hero"><div class="i-aura"></div><img src="${HEROES.castaneda.body}" alt=""></div>
    <div class="t-title">
      <div class="i-sigil">${sigilSVG()}</div>
      <h1>Путь Нагваля</h1>
      <p class="subtitle">карточный рогалик о пути воина</p>
      <div class="col t-menu">
        ${saved ? `<button class="btn big" data-act="cont">Продолжить путь <small>${HEROES[saved.hero].name}, этаж ${saved.floor}</small></button>` : ''}
        <button class="btn big ${saved ? 'ghost' : ''}" data-act="newRun">Новый путь</button>
        <button class="btn ghost" data-act="help">Как играть</button>
      </div>
    </div>
    <p class="quote">«Воин принимает свою судьбу, какой бы она ни была, и принимает её с абсолютным смирением.»</p>
    <div class="t-audio">
      <button class="tb-btn ${musicMuted ? 'off' : ''}" data-act="music" data-tip="Музыка">🎵</button>
      <button class="tb-btn ${muted ? 'off' : ''}" data-act="sound" data-tip="Звуки">🔊</button>
    </div>
  </div>`;
}

// ============================================================
//  Экран: выбор героя
// ============================================================
function showSelect() {
  let sel = 'castaneda';
  const infoHTML = h => `
        <img class="hero-full" src="${h.body}" alt="">
        <div class="hi-text">
          <h3>${h.name} <small>${h.title}</small></h3>
          <p>${h.desc}</p>
          ${h.playable ? `<p>❤️ ${h.hp} здоровья · 💰 ${h.gold} песо</p>
            <p>Стартовая реликвия: ${relicHTML(h.relic)} <b>${RELICS[h.relic].name}</b> — ${RELICS[h.relic].desc}</p>
            <p class="muted">Стартовая колода: 4 × Удар, 4 × Оборона, Удар намерения, Полевые заметки, Вспышка осознания.</p>`
            : '<p class="muted">Этот герой ещё проходит обучение у дона Хуана. Скоро!</p>'}
          <div class="row">
            <button class="btn ghost" data-act="back">Назад</button>
            <button class="btn big" data-act="start" ${h.playable ? '' : 'disabled'}>Начать путь</button>
          </div>
        </div>`;
  beginSwap('fade');
  app.innerHTML = `<div class="screen select-screen">
      <div class="sky dusk"></div><div class="mountains"></div>${motes(14)}
      <h2 class="screen-title">Выберите путь</h2>
      <div class="hero-choice">
        ${Object.values(HEROES).map(x => `<div class="hero-card ${x.id === sel ? 'sel' : ''} ${x.playable ? '' : 'locked'}" data-act="pickHero" data-id="${x.id}">
          <img src="${x.portrait}" alt="${x.name}">
          <div class="hc-name">${x.name}</div><div class="hc-title">${x.title}</div>
          ${x.playable ? '' : '<div class="soon">скоро</div>'}
        </div>`).join('')}
      </div>
      <div class="hero-info">${infoHTML(HEROES[sel])}</div>
    </div>`;
  actions = {
    pickHero: el => {
      if (el.dataset.id === sel) return;
      sel = el.dataset.id;
      // меняем только выделение и описание героя — остальной экран не трогаем
      document.querySelectorAll('.hero-card').forEach(c => c.classList.toggle('sel', c.dataset.id === sel));
      const info = document.querySelector('.hero-info');
      info.classList.add('swapping');
      setTimeout(() => {
        info.innerHTML = infoHTML(HEROES[sel]);
        info.classList.remove('swapping');
        info.classList.add('swapped');
      }, 160);
    },
    back: () => showTitle(),
    start: () => { if (HEROES[sel].playable) newRun(sel); },
  };
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
    potions: Array(POTION_SLOTS).fill(null), potionChance: 40,
    flags: {}, bonusAware: 0, room: { type: 'neow' }, curses: [],
  };
  gainRelic(h.relic);
  save();
  showNeow();
}
function gainRelic(id) {
  run.relics.push(id);
  const r = RELICS[id];
  if (r.onPickup) r.onPickup(run);
}
const hasRelic = id => run.relics.includes(id);
const glowTier = (g = run.glow || 0) => GLOW_TIERS.filter(t => g >= t.at).length;   // 0..3
function glowHTML() {
  const g = run.glow || 0, tier = glowTier(g);
  const tip = `<b>Свечение кокона: ${g}</b><br>Непотраченное в бою Осознание после победы переходит в свечение.<hr>` +
    GLOW_TIERS.map((t, i) => `${i < tier ? '✅' : '◻️'} <b>${t.at} — ${t.name}</b><br>${t.desc}`).join('<br>');
  return `<div class="tb-glow tier${tier}" data-tip="${esc(tip)}"><span class="g-ico">✨</span>
    <div class="g-bar"><i style="width:${Math.min(100, g / GLOW_MAX * 100)}%"></i>${GLOW_TIERS.map(t => `<b style="left:${t.at / GLOW_MAX * 100}%"></b>`).join('')}</div>
    <span class="g-num">${Math.min(g, GLOW_MAX)}/${GLOW_MAX}</span></div>`;
}
const canContemplate = () => !!(run.flags.contemplation || hasRelic('mat'));
const priceK = () => hasRelic('tobacco') ? 0.75 : 1;
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
    <div class="sky night"></div><div class="stars"></div><div class="mountains"></div>${motes(16)}
    <div class="scene-box">
      <div class="scene-art">${art}</div>
      <div class="scene-text"><h2>${title}</h2><p>${text}</p>${body}</div>
    </div></div>`;
}
// Обновить текст сцены на месте, не перезапуская анимацию появления всего экрана
function sceneUpdate(art, title, text, body) {
  const box = document.querySelector('#app .scene-box');
  if (!box) { beginSwap('soft'); app.innerHTML = sceneHTML(art, title, text, body); return; }
  refreshTop();
  const artEl = box.querySelector('.scene-art');
  if (artEl.dataset.art !== art && artEl.innerHTML.trim() !== art.trim()) {
    artEl.dataset.art = art;
    artEl.classList.remove('art-swap'); void artEl.offsetWidth;
    artEl.innerHTML = art; artEl.classList.add('art-swap');
  }
  const t = box.querySelector('.scene-text');
  t.classList.remove('refresh'); void t.offsetWidth;
  t.innerHTML = `<h2>${title}</h2><p>${text}</p>${body}`;
  t.classList.add('refresh');
}
const NEXT_BTN = `<div class="options"><button class="opt" data-act="next"><b>Продолжить</b></button></div>`;
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
  fight: (enc, bonus) => { run.room = { type: 'combat', kind: 'event', list: enc, bonus }; save(); startCombat('event', enc, bonus); },
  pay: n => { run.gold = Math.max(0, run.gold - n); sfx('gold'); },
  hasPotionSlot: () => hasPotionSlot(),
  randomPotion: () => { const p = randomPotionId(); gainPotion(p); return p; },
  unlockContemplation: () => { run.flags.contemplation = true; },
  uncurse: () => { run.curses = []; sfx('buff'); },
  curse: id => { if (!run.curses.includes(id)) run.curses.push(id); sfx('drain'); },
  relic: id => { if (!hasRelic(id)) gainRelic(id); sfx('buff'); },
  addCard: id => { run.deck.push(mkCard(id)); sfx('buff'); },
  maxHp: n => { run.maxHp = Math.max(1, run.maxHp + n); run.hp = Math.min(run.maxHp, Math.max(1, run.hp + Math.max(0, n))); },
  gold: n => { run.gold = Math.max(0, run.gold + n); if (n > 0) sfx('gold'); },
  chance: p => Math.random() < p,
  // бой с уникальным противником и уникальной наградой
  fightFor: (list, extra) => { run.room = { type: 'combat', kind: 'event', list, extra }; save(); startCombat('event', list, 0); },
};
function eventResult(ev, text, inPlace = false) {
  actions = { next: () => showMap() };
  if (inPlace) return sceneUpdate(ev.art, ev.title, text, NEXT_BTN);
  beginSwap('zoom');
  app.innerHTML = sceneHTML(ev.art, ev.title, text, NEXT_BTN);
}
function runEvent(ev) {
  const opts = ev.options(evApi);
  const done = text => {
    if (run.room && run.room.type !== 'combat') { run.room.result = text; save(); }
    eventResult(ev, text, true);
  };
  actions = {
    opt: el => {
      const o = opts[+el.dataset.i];
      if (o.can && !o.can()) return;
      o.go(done);
    },
  };
  beginSwap('zoom');
  app.innerHTML = sceneHTML(ev.art, ev.title, ev.text, `<div class="options">${opts.map((o, i) => {
    const ok = !o.can || o.can();
    return `<button class="opt ${ok ? '' : 'disabled'}" data-act="opt" data-i="${i}"><b>[${o.label}]</b> <span>${o.sub}</span></button>`;
  }).join('')}</div>`);
}

// Дар дона Хуана перед началом пути (аналог Нео)
const NEOW = {
  title: 'Костёр дона Хуана', art: `<img class="scene-portrait" src="${HEROES.donjuan.portrait}" alt="">`,
    text: 'Ночь в пустыне Соноры. Дон Хуан подбрасывает ветку в огонь. «Летуны пришли за твоим осознанием, — говорит он. — Прежде чем войти в их пустыню, возьми от меня дар. Только один».',
    options: api => [
      { label: 'Щит воина', sub: '+8 к максимальному здоровью.', go: done => { run.maxHp += 8; run.hp += 8; done('Ты чувствуешь, как тело наполняется силой.'); } },
      { label: 'Знание', sub: 'Выбрать одну из 3 редких карт.', go: done => api.chooseCard('rare', n => done(n ? `Дон Хуан учит тебя: «${n}».` : 'Ты отказался от знания. Дон Хуан пожимает плечами.')) },
      { label: 'Очищение', sub: 'Удалить карту из колоды.', go: done => api.removeCard(n => done(n ? `Ты оставляешь «${n}» в огне.` : 'Ты ничего не отдал огню.')) },
      { label: 'Кошель', sub: '+100 песо.', go: done => { run.gold += 100; sfx('gold'); done('«Деньги — тоже сила, если ты безупречен», — смеётся дон Хуан.'); } },
      { label: 'Снадобья', sub: 'Получить 2 случайных зелья.', go: done => { const a = api.randomPotion(), b = api.randomPotion(); done(`Дон Хуан протягивает два флакона: ${POTIONS[a].name.toLowerCase()} и ${POTIONS[b].name.toLowerCase()}.`); } },
    ],
};
function showNeow() {
  if (run.room && run.room.result) return eventResult(NEOW, run.room.result);
  runEvent(NEOW);
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
    if (n.r === 6) { n.type = 'shop'; continue; }        // гарантированный торговец в середине акта
    if (n.r === ROWS - 1) { n.type = 'rest'; continue; }
    const par = (parents[k] || []).map(pk => nodes[pk].type);
    const kids = n.next.map(nk => nodes[nk] && nodes[nk].r === 6 ? 'shop' : null);
    let t = 'monster';
    for (let tries = 0; tries < 12; tries++) {
      const w = [['monster', 45], ['event', 22], ['elite', n.r >= 5 ? 16 : 0], ['rest', n.r >= 5 && n.r !== ROWS - 2 ? 12 : 0], ['shop', n.r >= 2 ? 6 : 0]];
      const tot = w.reduce((s, x) => s + x[1], 0);
      let x = Math.random() * tot;
      for (const [tt, ww] of w) { x -= ww; if (x < 0) { t = tt; break; } }
      if (['elite', 'rest', 'shop'].includes(t) && (par.includes(t) || kids.includes(t))) continue;
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
  closePotionPop();
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
      const next = run.pos === k && avail.includes(nk);
      lines += `<line x1="${nx(n)}" y1="${ny(n)}" x2="${nx(m)}" y2="${ny(m)}" class="${walked ? 'walked' : next ? 'next' : ''}"/>`;
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
  let going = false;
  actions = {
    node: el => {
      if (going) return;
      going = true;
      el.classList.add('chosen');
      setTimeout(() => enterNode(el.dataset.k), 320);
    },
  };
  beginSwap('rise');
  app.innerHTML = `${topBar()}<div class="screen map-screen">
    <div class="sky night"></div><div class="stars"></div>${motes(18)}
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
  run.room = null;
  save();
  const sc = document.getElementById('mapScroll');
  sc.style.scrollBehavior = 'auto';
  const curRow = run.pos && run.pos !== 'boss' ? nodes[run.pos].r : -1;
  sc.scrollTop = Math.max(0, (H - 70 - (curRow + 1) * 82) - sc.clientHeight + 200);
}

function enterNode(k) {
  run.path.push(k);
  run.pos = k;
  const type = k === 'boss' ? 'boss' : run.map.nodes[k].type;
  run.floor = k === 'boss' ? ROWS + 1 : run.map.nodes[k].r + 1;
  // Комната фиксируется при входе и сохраняется: выход в меню не даст переиграть узел
  switch (type) {
    case 'boss': run.room = { type: 'combat', kind: 'boss', list: ENCOUNTERS.boss[0] }; break;
    case 'monster': run.room = { type: 'combat', kind: 'monster', list: pick(run.fights < 3 ? ENCOUNTERS.easy : Math.random() < 0.2 ? ENCOUNTERS.rare : ENCOUNTERS.hard) }; break;
    case 'elite': run.room = { type: 'combat', kind: 'elite', list: pick(ENCOUNTERS.elite) }; break;
    case 'event': {
      const ok = e => !(e.id === 'cave' && canContemplate()) && !(e.once && run.flags['ev_' + e.id]);
      let pool = EVENTS.filter(e => !run.seenEvents.includes(e.id) && ok(e));
      if (!pool.length) { run.seenEvents = []; pool = EVENTS.filter(ok); }
      if (!pool.length) pool = EVENTS.filter(e => !e.once);
      const ev = pick(pool); run.seenEvents.push(ev.id);
      if (ev.once) run.flags['ev_' + ev.id] = true;
      run.room = { type: 'event', id: ev.id };
      break;
    }
    case 'rest': run.room = { type: 'rest' }; break;
    case 'shop': run.room = { type: 'shop', stock: makeShopStock() }; break;
    case 'treasure': run.room = { type: 'treasure', relic: randomRelicId(), gold: rnd(25, 45) }; break;
  }
  save();
  openRoom();
}
function openRoom() {
  const room = run.room;
  switch (room.type) {
    case 'neow': return showNeow();
    case 'combat': return startCombat(room.kind, room.list, room.bonus || 0);
    case 'rewards': return showRewards();
    case 'event': {
      const ev = EVENTS.find(e => e.id === room.id);
      return room.result ? eventResult(ev, room.result) : runEvent(ev);
    }
    case 'rest': return showRest();
    case 'shop': return showShop();
    case 'treasure': return showTreasure();
    default: return showMap();
  }
}

// ============================================================
//  Место силы (отдых)
// ============================================================
function showRest(inPlace = false) {
  const heal = Math.floor(run.maxHp * 0.3) + (hasRelic('jug') ? 15 : 0);
  const after = text => {
    run.room.result = text; save();
    actions = { next: () => showMap() };
    sceneUpdate('🔥', 'Место силы', text, NEXT_BTN);
  };
  if (run.room && run.room.result) {
    actions = { next: () => showMap() };
    beginSwap('zoom');
    app.innerHTML = sceneHTML('🔥', 'Место силы', run.room.result, `<div class="options"><button class="opt" data-act="next"><b>Продолжить</b></button></div>`);
    return;
  }
  const contemplate = canContemplate();
  actions = {
    rest: () => { evApi.heal(heal); after(`Ты спишь у костра, и тело вспоминает силу. +${heal} здоровья.`); },
    upgrade: () => pickFromDeck({ title: 'Перепросмотр: улучшите карту', filter: canUpgrade, upgrade: true }, c => {
      if (!c) return;
      c.up = true; sfx('buff'); after(`Ты перепросмотрел свою жизнь. «${cardName(c)}» улучшена.`);
    }),
    contemplate: () => {
      if (!contemplate) return;
      actions = {
        detach: () => evApi.removeCard(n => n ? after(`Ты отрешился от «${n}». Колода стала легче.`) : showRest(true)),
        gather: () => { run.bonusAware = (run.bonusAware || 0) + 1; sfx('aware'); after(`Ты смотришь в огонь, пока внутренний диалог не стихнет. Теперь в начале каждого боя ты получаешь ещё +1 Осознание (всего +${run.bonusAware}).`); },
        back: () => showRest(true),
      };
      sceneUpdate('🕯️', 'Созерцание', 'Ты садишься лицом к огню и позволяешь миру остановиться. Что ты выберешь?',
        `<div class="options">
          <button class="opt" data-act="detach"><b>[Отрешение]</b> <span>Удалить карту из колоды.</span></button>
          <button class="opt" data-act="gather"><b>[Накопление]</b> <span>Навсегда: +1 Осознание в начале каждого боя.</span></button>
          <button class="opt" data-act="back"><b>[Назад]</b></button>
        </div>`);
    },
  };
  const restBody = `<div class="options">
      <button class="opt" data-act="rest"><b>[Отдохнуть]</b> <span>Восстановить ${heal} здоровья.</span></button>
      <button class="opt ${run.deck.some(canUpgrade) ? '' : 'disabled'}" data-act="upgrade"><b>[Перепросмотр]</b> <span>Улучшить карту.</span></button>
      ${contemplate ? `<button class="opt special" data-act="contemplate"><b>[Созерцание]</b> <span>Отрешиться от карты или навсегда усилить Осознание.</span></button>`
        : `<div class="opt locked" data-tip="Откроется, когда вы научитесь у сновидящих или найдёте их циновку.">🔒 <b>[Созерцание]</b> <span>Неизвестная практика.</span></div>`}
    </div>`;
  const restText = 'Ты нашёл место, где земля отдаёт силу. Летуны не решаются приблизиться к огню.';
  if (inPlace) return sceneUpdate('🔥', 'Место силы', restText, restBody);
  beginSwap('zoom');
  app.innerHTML = sceneHTML('🔥', 'Место силы', restText, restBody);
}

// ============================================================
//  Сундук
// ============================================================
function showTreasure() {
  const { relic, gold } = run.room;
  const opened = inPlace => {
    actions = { next: () => showMap() };
    const text = `Внутри — ${gold} песо${relic ? ` и ${RELICS[relic].icon} <b>${RELICS[relic].name}</b>: ${RELICS[relic].desc}` : ''}.`;
    if (inPlace) return sceneUpdate('🎁', 'Сундук', text, NEXT_BTN);
    beginSwap('zoom');
    app.innerHTML = sceneHTML('🎁', 'Сундук', text, NEXT_BTN);
  };
  if (run.room.opened) return opened(false);
  actions = {
    open: () => {
      if (relic) gainRelic(relic); run.gold += gold; sfx('gold');
      run.room.opened = true; save();
      opened(true);
    },
  };
  beginSwap('zoom');
  app.innerHTML = sceneHTML('🧰', 'Сундук', 'Среди камней стоит старый окованный сундук. Похоже, кто-то спрятал его от летунов.',
    `<div class="options"><button class="opt" data-act="open"><b>[Открыть]</b></button></div>`);
}

// ============================================================
//  Торговец
// ============================================================
function makeShopStock() {
  const price = { common: 75, uncommon: 110, rare: 190 };
  const k = priceK();
  const stock = {
    cards: [...rewardCards(2, false, 'common'), ...rewardCards(2, false, 'uncommon'), ...rewardCards(1, false, 'rare')]
      .map(id => ({ card: mkCard(id), price: Math.round(price[CARDS[id].rarity] * (0.9 + Math.random() * 0.2) * k), sold: false })),
    relics: [], potions: [],
    removePrice: Math.round(110 * k), removed: false,
  };
  const r1 = randomRelicId(); if (r1) stock.relics.push({ id: r1, price: Math.round(rnd(190, 240) * k), sold: false });
  const r2 = RELIC_POOL.filter(r => !run.relics.includes(r) && r !== r1); if (r2.length) stock.relics.push({ id: pick(r2), price: Math.round(rnd(190, 240) * k), sold: false });
  const pprice = { common: 55, uncommon: 75, rare: 100 };
  for (let i = 0; i < 3; i++) { const id = randomPotionId(); stock.potions.push({ id, price: Math.round(pprice[POTIONS[id].rarity] * (0.9 + Math.random() * 0.2) * k), sold: false }); }
  if (run.curses.length && !stock.potions.some(x => x.id === 'holy')) stock.potions[0] = { id: 'holy', price: Math.round(80 * k), sold: false };
  // Одна случайная карта со скидкой
  const sale = stock.cards[rnd(0, stock.cards.length - 1)];
  sale.sale = true; sale.price = Math.floor(sale.price / 2);
  return stock;
}
function showShop() {
  const stock = run.room.stock;

  let first = true;
  const render = () => {
    if (first) { beginSwap('zoom'); first = false; }
    app.innerHTML = `${topBar()}<div class="screen shop-screen">
      <div class="sky night"></div>${motes(12)}
      <div class="shop-keeper"><div class="sk-art">🧙‍♂️</div><p>«Всё, что нужно воину, — здесь. Только не торгуйся, это неблагородно»</p>${hasRelic('tobacco') ? '<p class="muted small">🍂 Скидка 25% за табак</p>' : ''}</div>
      <div class="shop-goods">
        <div class="shop-cards">${stock.cards.map((x, i) => `<div class="ware ${x.sold ? 'sold' : ''}">
          ${cardHTML(x.card, { attrs: x.sold ? '' : `data-act="buyCard" data-i="${i}"` })}
          <div class="price ${run.gold < x.price ? 'no' : ''}">${x.sold ? 'продано' : `💰 ${x.price}${x.sale ? ' <span class="sale">−50%</span>' : ''}`}</div></div>`).join('')}</div>
        <div class="shop-bottom">
          ${stock.potions.map((x, i) => `<div class="ware relic-ware potion-ware ${x.sold ? 'sold' : ''}" ${x.sold ? '' : `data-act="buyPotion" data-i="${i}"`} data-tip="${esc(`<b>${POTIONS[x.id].name}</b><br>${POTIONS[x.id].desc}`)}" style="--pc:${POTIONS[x.id].glow}">
            <div class="pw-flask">${potionSVG(x.id)}</div><div class="rw-name">${POTIONS[x.id].name}</div>
            <div class="price ${run.gold < x.price ? 'no' : ''}">${x.sold ? 'продано' : `💰 ${x.price}`}</div></div>`).join('')}
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
      run.gold -= x.price; x.sold = true; run.deck.push({ ...x.card }); sfx('gold'); save(); render();
    },
    buyPotion: el => {
      const x = stock.potions[+el.dataset.i];
      if (x.sold || run.gold < x.price) return;
      if (!hasPotionSlot()) { toast('Нет свободной ячейки для зелья'); return; }
      run.gold -= x.price; x.sold = true; sfx('gold'); render(); gainPotion(x.id); save();
    },
    buyRelic: el => {
      const x = stock.relics[+el.dataset.i];
      if (x.sold || run.gold < x.price) return;
      run.gold -= x.price; x.sold = true; gainRelic(x.id); sfx('gold'); save(); render();
    },
    buyRemove: () => {
      if (stock.removed || run.gold < stock.removePrice) return;
      const shopActions = actions;
      pickFromDeck({ title: 'Выберите карту для удаления' }, c => {
        actions = shopActions;
        if (!c) return;
        run.gold -= stock.removePrice; stock.removed = true;
        run.deck = run.deck.filter(z => z !== c); sfx('gold'); save(); render();
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
  return { uid: 'e' + (enemySeq++), id, def: d, name: d.name, hp, maxHp: hp, block: 0, st: d.thorns ? { thorns: d.thorns } : {}, hist: [], turn: 0, move: null, dead: false, seed: rnd(0, 99) };
}
const alive = () => cb.enemies.filter(e => !e.dead);
// null — можно; иначе текст причины
function whyNot(c) {
  const d = CARDS[c.id];
  if (d.unplayable) return 'Эту карту нельзя разыграть';
  if (costOf(c) > cb.p.energy) return 'Недостаточно энергии';
  return d.requires ? d.requires(G) : null;
}

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
const fx = (unit, text, cls = '', anim = null, extra = null) => fxq.push({ unit, text, cls, anim, extra });

// центр элемента в координатах сцены 1280×720
function stagePt(el, fy = 0.5) {
  if (!el) return { x: 640, y: 360 };
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - s.left) / scale, y: (r.top + r.height * fy - s.top) / scale };
}
function burst(el, color, n = 18, fy = 0.45) {
  const p = stagePt(el, fy);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    const a = Math.random() * Math.PI * 2, r = rnd(50, 150);
    d.className = 'spark';
    d.style.cssText = `left:${p.x}px;top:${p.y}px;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - 30}px;--c:${color};--s:${rnd(3, 8)}px;animation-duration:${rnd(550, 950)}ms`;
    fxLayer.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  }
}
function effectAt(el, cls, fy = 0.45, ms = 700, style = '') {
  const p = stagePt(el, fy);
  const d = document.createElement('div');
  d.className = cls;
  d.style.cssText = `left:${p.x}px;top:${p.y}px;${style}`;
  fxLayer.appendChild(d);
  setTimeout(() => d.remove(), ms);
}
function runExtra(el, extra) {
  if (extra === 'slash') effectAt(el.querySelector('.sprite') || el, 'slash', 0.5, 450, `--rot:${rnd(-55, -25)}deg`);
  else if (extra === 'shake') {
    app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake');
    const fl = document.createElement('div'); fl.className = 'hurtflash'; fxLayer.appendChild(fl); setTimeout(() => fl.remove(), 600);
  }
  else if (extra.startsWith('ring:')) effectAt(el.querySelector('.sprite') || el, 'ring', 0.5, 800, `--c:${extra.slice(5)}`);
  else if (extra.startsWith('burst:')) burst(el.querySelector('.sprite') || el, extra.slice(6), extra.includes('#b36bff') ? 34 : 16);
}
// Полёт карты из руки: в цель, в сброс, в героя или сгорание
function flyCard(el, dest, mode, delay = 0) {
  if (!el) return;
  const p = stagePt(el);
  const clone = el.cloneNode(true);
  clone.className = clone.className.replace(/\b(in-hand|sel|playable|unplayable|drawn)\b/g, '') + ' flying';
  clone.removeAttribute('data-act'); clone.removeAttribute('data-tip'); clone.removeAttribute('style');
  clone.style.left = (p.x - 75) + 'px'; clone.style.top = (p.y - 105) + 'px';
  fxLayer.appendChild(clone);
  const dx = dest.x - p.x, dy = dest.y - p.y;
  let frames, dur = 480;
  if (mode === 'attack') frames = [
    { transform: 'scale(1.2)', opacity: 1 },
    { transform: `translate(${dx * .2}px, ${dy * .2 - 110}px) scale(1.15) rotate(-5deg)`, opacity: 1, offset: .35 },
    { transform: `translate(${dx}px, ${dy}px) scale(.3) rotate(28deg)`, opacity: 0 }];
  else if (mode === 'power') frames = [
    { transform: 'scale(1.2)', opacity: 1, filter: 'brightness(1)' },
    { transform: `translate(${dx * .3}px, -150px) scale(1.3)`, opacity: 1, filter: 'brightness(1.6)', offset: .4 },
    { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: 0, filter: 'brightness(3)' }];
  else if (mode === 'burn') { dur = 700; frames = [
    { transform: 'scale(1.15)', opacity: 1, filter: 'none' },
    { transform: 'translate(0, -60px) scale(1.15)', opacity: 1, filter: 'brightness(1.8) sepia(1) saturate(3) hue-rotate(-25deg)', offset: .4 },
    { transform: 'translate(0, -150px) scale(1.05)', opacity: 0, filter: 'brightness(3) sepia(1) saturate(4) hue-rotate(-30deg) blur(6px)' }]; }
  else if (mode === 'discard') { dur = 420; frames = [
    { transform: 'scale(1)', opacity: 1 },
    { transform: `translate(${dx}px, ${dy}px) scale(.22) rotate(50deg)`, opacity: .3 }]; }
  else frames = [
    { transform: 'scale(1.2)', opacity: 1 },
    { transform: `translate(${(640 - p.x) * .5}px, -140px) scale(1.2)`, opacity: 1, offset: .4 },
    { transform: `translate(${dx}px, ${dy}px) scale(.22) rotate(40deg)`, opacity: 0 }];
  const a = clone.animate(frames, { duration: dur, delay, easing: 'cubic-bezier(.35,.7,.35,1)', fill: 'both' });
  a.onfinish = () => clone.remove();
  if (mode === 'burn') setTimeout(() => burst(clone, '#ff9a3c', 14, 0.3), delay + dur * .45);
}
// У каждого юнита своя очередь надписей: они появляются друг за другом
// со сдвигом по высоте и в стороны, а не поверх друг друга
const floatQ = {};
function flushFx() {
  const stRect = stage.getBoundingClientRect();
  const now = performance.now();
  for (const f of fxq) {
    const el = document.querySelector(`[data-unit="${f.unit}"]`);
    if (!el) continue;
    if (f.anim) { el.classList.remove(f.anim); void el.offsetWidth; el.classList.add(f.anim); }
    if (f.extra) runExtra(el, f.extra);
    if (!f.text) continue;
    const q = floatQ[f.unit] = floatQ[f.unit] || { next: 0, slot: 0, last: 0 };
    if (now - q.last > 900) q.slot = 0;                 // очередь «остыла» — начинаем с нижней строки
    const start = Math.max(now, q.next);
    const delay = start - now;
    q.next = start + 280; q.last = start; q.slot++;
    const k = (q.slot - 1) % 4;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'float ' + f.cls;
    d.textContent = f.text;
    // каждая следующая надпись стартует ниже предыдущей: поднимаются они с одной скоростью,
    // поэтому расстояние между ними не сокращается и текст не наезжает
    d.style.left = ((r.left + r.width / 2 - stRect.left) / scale + (k % 2 ? 22 : -22) * (k ? 1 : 0)) + 'px';
    d.style.top = ((r.top + r.height * 0.22 - stRect.top) / scale + k * 34) + 'px';
    d.style.animationDelay = delay + 'ms';
    fxLayer.appendChild(d);
    setTimeout(() => d.remove(), 1400 + delay);
  }
  fxq = [];
}
// Иконки статусов: анимируется только новое или изменившееся, с поочерёдной задержкой
function updateStatuses(box, st) {
  const prev = box._st || {};
  let k = 0;
  box.innerHTML = Object.entries(st).map(([key, n]) => {
    const s = STATUS_INFO[key]; if (!s) return '';
    const changed = prev[key] !== n;
    const turns = n === 1 ? 'Действует до конца следующего хода врага.' : `Действует до конца ${n}-го хода врага.`;
    const tip = `<b>${s.name}</b><br>${s.tip.replace('{n}', n).replace('{turns}', turns)}`;
    return `<span class="st ${s.debuff ? 'bad' : ''} ${changed ? 'new' : ''}" style="${changed ? `animation-delay:${(k++) * 130}ms` : ''}" data-tip="${esc(tip)}">${s.icon}<b>${n}</b></span>`;
  }).join('');
  box._st = { ...st };
}
function banner(text, kind = '') {
  const b = document.createElement('div');
  b.className = 'banner ' + kind;
  b.innerHTML = `<span>${text}</span>`;
  fxLayer.appendChild(b);
  setTimeout(() => b.remove(), 1300);
}
function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text;
  fxLayer.appendChild(t);
  setTimeout(() => t.remove(), 1400);
}

// ---- API карт ----
function thornsBack(e) {
  fx(e.uid, '🌵', 'info');
  damagePlayer(e.def.thorns);
}
function damageEnemy(e, d) {
  if (e.dead) return false;
  if (e.st.intangible) d = Math.floor(d / 2);
  if (e.clinging) {          // облако срывается, если за ход нанести ему 15+ урона
    e.turnDmg = (e.turnDmg || 0) + d;
    if (e.turnDmg >= 15 && d > 0) setTimeout(() => detachCloud(e), 0);
  }
  const blocked = Math.min(e.block, d);
  e.block -= blocked;
  const rest = d - blocked;
  e.hp -= rest;
  fx(e.uid, rest > 0 ? `-${rest}` : 'Блок', rest > 0 ? 'dmg' : 'blk', 'hurt', rest > 0 ? 'slash' : 'ring:#8fc8ff');
  sfx(rest > 0 ? 'hit' : 'block');
  if (e.hp <= 0) {
    e.hp = 0; e.dead = true; run.stats.kills++;
    sfx('death');
    fx(e.uid, '', '', null, 'burst:#b36bff');
    if (e.def.boss) cb.enemies.forEach(m => { if (!m.dead) { m.dead = true; m.hp = 0; fx(m.uid, 'бежит!', 'info', null, 'burst:#b36bff'); } });
    else run.relics.forEach(r => RELICS[r].onKill && RELICS[r].onKill(G, e));
    return true;
  }
  // вторая фаза босса
  if (e.def.phase2At && !e.phase2 && e.hp <= e.maxHp * e.def.phase2At) {
    e.phase2 = true; e.p2turn = 0;
    e.move = 'rebirth'; e.hist.push('rebirth');
    fx(e.uid, 'пробуждается!', 'drain', 'pulse', 'burst:#ff3030');
    const el = document.querySelector(`[data-unit="${e.uid}"]`);
    if (el) el.classList.add('phase2');
    setTimeout(() => { if (cb && !cb.over) banner('Истинный облик', 'danger'); }, 250);
  }
  return false;
}
function damagePlayer(d) {
  const p = cb.p;
  const blocked = Math.min(p.block, d);
  p.block -= blocked;
  const rest = d - blocked;
  run.hp = Math.max(0, run.hp - rest);
  fx('hero', rest > 0 ? `-${rest}` : 'Блок', rest > 0 ? 'dmg' : 'blk', 'hurt', rest >= 8 ? 'shake' : rest > 0 ? 'slash' : 'ring:#8fc8ff');
  sfx(rest > 0 ? 'hurt' : 'block');
  if (hasRelic('hat') && !cb.hatUsed && run.hp > 0 && run.hp < run.maxHp / 2) { cb.hatUsed = true; G.block(12); fx('hero', '👒 Шляпа Хенаро', 'buff'); }
}
// Если героя переполняет Осознание, один из летунов меняет намерение и идёт его пожирать
function checkReaction() {
  if (!cb || cb.over || cb.reacted || cb.busy || (cb.p.st.aware || 0) < 5 || glowTier() >= 2) return;
  for (const e of alive()) {
    if (!e.def.react) continue;
    const r = typeof e.def.react === 'function' ? e.def.react(e) : e.def.react;
    if (e.move === r || e.move === 'rebirth' || e.move === 'descend') continue;
    e.move = r; e.hist[e.hist.length - 1] = r;
    cb.reacted = true;
    fx(e.uid, 'почуял осознание!', 'drain', 'pulse');
    sfx('drain');
    return;
  }
}
const G = {
  hit(t, base) {
    if (!t || t.dead) t = alive()[0];
    if (!t) return false;
    if (hasRelic('scarf') && !cb.scarfUsed) { cb.scarfUsed = true; base += 4; }
    const killed = damageEnemy(t, playerDmg(base, t));
    if (t.def.thorns) thornsBack(t);
    return killed;
  },
  hitAll(base) { alive().forEach(e => { damageEnemy(e, playerDmg(base, e)); if (e.def.thorns) thornsBack(e); }); },
  block(n) { cb.p.block += n; fx('hero', `+${n} 🛡`, 'blk', null, 'ring:#8fc8ff'); sfx('block'); },
  draw(n) { drawCards(n); },
  energy(n) { cb.p.energy += n; fx('hero', `+${n} ⚡`, 'info'); },
  aware(n) { addSt(cb.p.st, 'aware', n); fx('hero', `+${n} 👁️`, 'aware', null, 'burst:#9fe2ff'); sfx('aware'); checkReaction(); },
  getAware() { return cb.p.st.aware || 0; },
  spendAware(n = Infinity) {
    const k = Math.min(n, cb.p.st.aware || 0);
    if (k > 0) {
      addSt(cb.p.st, 'aware', -k); fx('hero', `-${k} 👁️`, 'aware', null, 'ring:#9fe2ff');
      run.relics.forEach(r => RELICS[r].onSpendAware && RELICS[r].onSpendAware(G, k));
    }
  },
  getBlock() { return cb.p.block; },
  debuffRandom() { const t = pick(alive()); if (t) { G.debuff(t, 'weak', 2); G.debuff(t, 'vulnerable', 1); } },
  burnUnplayable() {
    const bad = cb.hand.filter(c => CARDS[c.id].unplayable);
    if (!bad.length) { fx('hero', 'нечего сжигать', 'info'); return; }
    cb.hand = cb.hand.filter(c => !CARDS[c.id].unplayable);
    cb.exhaust.push(...bad);
    fx('hero', `🔥 сожжено: ${bad.length}`, 'buff', null, 'burst:#ff9a3c');
    drawCards(bad.length);
  },
  uncurse() { run.curses = []; fx('hero', 'Проклятия сняты', 'buff', null, 'ring:#ffffff'); refreshTop(); },
  // «чистый» урон: не зависит от Личной силы и Слабости (зелья, реликвии)
  pierce(t, n) { if (!t || t.dead) t = alive()[0]; if (t) damageEnemy(t, t.st.vulnerable ? Math.floor(n * 1.5) : n); },
  pierceRandom(n) { const t = pick(alive()); if (t) { damageEnemy(t, n); } },
  heal(n) { run.hp = Math.min(run.maxHp, run.hp + n); fx('hero', `+${n} ❤`, 'heal', null, 'ring:#7aff8a'); sfx('buff'); },
  debuff(t, k, n) { if (t && !t.dead) { addSt(t.st, k, n); fx(t.uid, `${STATUS_INFO[k].icon} ${STATUS_INFO[k].name}`, 'debuff'); sfx('debuff'); } },
  debuffAll(k, n) { alive().forEach(e => G.debuff(e, k, n)); },
  buffSelf(k, n) { addSt(cb.p.st, k, n); fx('hero', `${STATUS_INFO[k].icon} +${n}`, 'buff'); sfx('buff'); },
  cleanse() { delete cb.p.st.weak; delete cb.p.st.vulnerable; fx('hero', 'Очищение', 'buff'); },
  loseHp(n) { run.hp = Math.max(0, run.hp - n); fx('hero', `-${n}`, 'dmg', 'hurt'); },
  power(k, n) { addSt(cb.p.st, k, n); fx('hero', `${STATUS_INFO[k].icon} ${STATUS_INFO[k].name}`, 'buff', null, 'ring:#ffd27a'); sfx('buff'); },
};

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (!cb.draw.length) {
      if (!cb.discard.length) break;
      cb.draw = shuffle(cb.discard); cb.discard = [];
      fx('drawpile', 'Перемешивание', 'info', 'pulse');
    }
    const c = cb.draw.pop();
    if (cb.hand.length >= 10) { cb.discard.push(c); toast('Рука полна'); }
    else { cb.hand.push(c); cb.fresh.add(c.uid); }
  }
}

function startCombat(kind, list = null, bonusGold = 0) {
  closePotionPop();
  if (!list) {
    if (kind === 'boss') list = ENCOUNTERS.boss[0];
    else if (kind === 'elite') list = pick(ENCOUNTERS.elite);
    else list = pick(run.fights < 3 ? ENCOUNTERS.easy : ENCOUNTERS.hard);
  }
  cb = {
    kind, bonusGold,
    enemies: list.map(mkEnemy),
    draw: shuffle(run.deck.map(c => ({ ...c }))), hand: [], discard: [], exhaust: [],
    p: { block: 0, energy: 0, maxEnergy: 3 + (hasRelic('stone') ? 1 : 0), st: {} },
    turn: 0, selected: null, busy: true, justApplied: new Set(), over: false, fresh: new Set(), playing: false,
    hoverTarget: null, potionAim: null, reacted: false, hatUsed: false,
    // на этом ходу летуны впадают в ярость — затягивать бой ради накопления невыгодно
    rageTurn: kind === 'boss' ? 14 : kind === 'elite' ? 7 : 6, raged: false,
  };
  actions = combatActions;
  renderCombatShell();
  run.relics.forEach(r => RELICS[r].combatStart && RELICS[r].combatStart(G));
  if (run.bonusAware) G.aware(run.bonusAware);
  if (glowTier() >= 1) { G.aware(1); fx('hero', 'Мастер первого внимания', 'buff'); }
  if (hasRelic('stone')) cb.enemies.forEach(e => addSt(e.st, 'strength', 1));
  cb.reacted = true;          // до первого хода игрока летуны не реагируют
  cb.enemies.forEach(chooseIntent);
  updateCombat();
  setTimeout(() => startTurn(), 900);
}

function chooseIntent(e) {
  if (e.dead) return;
  e.move = e.def.ai(e, cb);
  e.hist.push(e.move);
  e.turn++;
}

function startTurn() {
  if (!cb || cb.over) return;
  const p = cb.p;
  cb.turn++;
  cb.reacted = false;
  if (cb.turn > 1) p.block = p.st.discipline ? Math.floor(p.block / 2) : 0;
  cb.scarfUsed = false;
  p.energy = p.maxEnergy;
  if (p.st.death) G.buffSelf('strength', p.st.death);
  if (p.st.sapped) { p.energy = Math.max(0, p.energy - p.st.sapped); fx('hero', `🩸 −${p.st.sapped} энергии`, 'debuff'); delete p.st.sapped; }
  cb.enemies.forEach(e => { e.turnDmg = 0; });
  drawCards(5);
  if (p.st.scout) drawCards(p.st.scout);
  if (p.st.dream) { const n = p.st.dream; delete p.st.dream; fx('hero', `💤 +${n} карта`, 'buff'); drawCards(n); }
  if (cb.turn === 1 && glowTier() >= 3) { const c = mkCard('fire'); if (cb.hand.length < 10) { cb.hand.push(c); cb.fresh.add(c.uid); } fx('hero', 'Мастер третьего внимания', 'buff'); }
  if (cb.turn === cb.rageTurn && !cb.raged) {
    cb.raged = true;
    alive().forEach(e => { addSt(e.st, 'rage', 2); fx(e.uid, '🔥 Ярость', 'debuff', 'pulse'); });
    setTimeout(() => { if (cb && !cb.over) banner('Летуны в ярости', 'danger'); }, 900);
  }
  run.relics.forEach(r => RELICS[r].turnStart && RELICS[r].turnStart(G, cb.turn));
  cb.busy = false;
  sfx('turn');
  banner(cb.turn === 1 ? (cb.kind === 'boss' ? 'Хозяин летунов' : cb.enemies.some(e => e.def.miniboss) ? 'Тёмное облако' : cb.enemies.some(e => e.def.unique) ? 'Особый противник' : cb.kind === 'elite' ? 'Элитный летун' : cb.enemies.some(e => e.def.rare) ? 'Редкий летун' : 'Бой') : 'Ваш ход', cb.turn === 1 && cb.kind !== 'monster' ? 'danger' : '');
  updateCombat();
}


async function playCard(uid, target) {
  if (cb.busy || cb.over || cb.playing) return;
  const i = cb.hand.findIndex(c => c.uid === uid);
  if (i < 0) return;
  const c = cb.hand[i], d = CARDS[c.id];
  const why = whyNot(c);
  if (why) { toast(why); return; }
  const cost = costOf(c);
  cb.p.energy -= cost;
  cb.hand.splice(i, 1);
  cb.selected = null;
  sfx('card');
  const el = document.querySelector(`#hand .card[data-uid="${uid}"]`);
  const tgt = target ? document.querySelector(`[data-unit="${target.uid}"] .sprite`) : null;
  const mode = d.type === 'power' ? 'power' : d.type === 'attack' ? 'attack' : d.exhaust ? 'burn' : 'skill';
  const dest = mode === 'power' ? stagePt(document.querySelector('[data-unit="hero"] .sprite'), .4)
    : mode === 'attack' ? stagePt(tgt || document.getElementById('enemies'), .45)
    : stagePt(document.querySelector('.discard-pile'));
  flyCard(el, dest, mode);
  if (el) el.remove();
  cb.playing = true;
  updateCombat();
  await sleep(mode === 'attack' ? 190 : 150);
  cb.playing = false;
  if (!cb || cb.over) return;
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
  if (!alive().length) { cb.over = true; updateCombat(); await sleep(500); banner('Победа', 'win'); await sleep(1100); winCombat(); return true; }
  return false;
}

async function endTurn() {
  if (cb.busy || cb.over || cb.playing) return;
  cb.busy = true; cb.selected = null;
  const p = cb.p;
  // конец хода игрока
  if (p.st.impecc) G.block(p.st.impecc);
  run.relics.forEach(r => RELICS[r].turnEnd && RELICS[r].turnEnd(G));
  if (p.st.ally) {
    const t = pick(alive());
    if (t) { damageEnemy(t, p.st.ally); fx('hero', '💨', 'info'); }
  }
  const pile = stagePt(document.querySelector('.discard-pile'));
  [...document.querySelectorAll('#hand .card')].forEach((el, k) => {
    const c = cb.hand.find(x => x.uid === +el.dataset.uid);
    flyCard(el, pile, c && CARDS[c.id].ethereal ? 'burn' : 'discard', k * 55);
  });
  for (const c of cb.hand) {
    if (CARDS[c.id].endTurnHp) G.loseHp(CARDS[c.id].endTurnHp);
    if (CARDS[c.id].ethereal) { cb.exhaust.push(c); fx('hero', `${CARDS[c.id].name} сгорает`, 'info'); }
    else cb.discard.push(c);
  }
  cb.hand = [];
  updateCombat();
  if (await checkCombatEnd()) return;
  await sleep(500);
  banner('Ход летунов', 'enemy');
  await sleep(700);

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
  const p = cb.p;
  delete e.st.intangible;
  if (e.def.art && e.def.art.cloud && !e.clinging && e.move !== 'reform' && p.block === 0) { e.move = 'cling'; e.hist[e.hist.length - 1] = 'cling'; }
  const m = e.def.moves[e.move];
  const hp0 = run.hp;
  fx(e.uid, m.name, 'movename', m.dmg ? 'attack' : 'pulse');
  updateCombat();
  await sleep(300);
  if (m.cleanse) { delete e.st.weak; delete e.st.vulnerable; fx(e.uid, 'Очищение', 'buff'); }
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
  if (m.sap) { addSt(p.st, 'sapped', m.sap); fx('hero', '🩸 Истощение', 'debuff'); }
  if (m.cling) clingCloud(e);
  // проклятие ложится, если удар пробил Защиту
  if (m.curse && run.hp < hp0 && !run.curses.includes(m.curse)) {
    run.curses.push(m.curse); cb.cursedNow = m.curse;
    fx('hero', `${CURSES[m.curse].icon} ${CURSES[m.curse].name}`, 'drain', 'hurt', 'ring:#9a4cff');
    sfx('drain');
    setTimeout(() => { if (cb && !cb.over) banner(CURSES[m.curse].name, 'danger'); }, 300);
    refreshTop();
  }
  if (m.debuff) {
    for (const [k, v] of Object.entries(m.debuff)) {
      addSt(p.st, k, v); cb.justApplied.add(k);
      fx('hero', `${STATUS_INFO[k].icon} ${STATUS_INFO[k].name}`, 'debuff'); sfx('debuff');
    }
    if (p.st.fearless) { G.block(p.st.fearless); G.aware(1); fx('hero', '🐺 Страх побеждён', 'buff'); }
  }
  if (m.drain) {
    const n = glowTier() >= 2 ? 0 : Math.max(0, Math.min(p.st.aware || 0, m.drain) - (hasRelic('mirror') ? 1 : 0));
    if (glowTier() >= 2 && (p.st.aware || 0) > 0) fx(e.uid, 'невкусно…', 'info');
    if (n > 0) {
      const str = Math.min(n, m.drainStr || n);
      addSt(p.st, 'aware', -n); addSt(e.st, 'strength', str);
      fx('hero', `-${n} 👁️`, 'drain'); fx(e.uid, `съел осознание: 💪 +${str}`, 'drain'); sfx('drain');
    } else if ((p.st.aware || 0) > 0 && hasRelic('mirror')) fx('hero', '💠 отражено', 'buff');
  }
  // ярость: каждый ход летун дополнительно сжирает Осознание (даже мастерство второго внимания не спасает)
  if (e.st.rage && (p.st.aware || 0) > 0 && !e.dead) {
    const n = Math.min(p.st.aware, e.st.rage);
    addSt(p.st, 'aware', -n);
    fx('hero', `-${n} 👁️`, 'drain'); fx(e.uid, `🔥 сжирает осознание`, 'drain'); sfx('drain');
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
      if (cb.raged) addSt(ne.st, 'rage', 2);
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
  if (e.st.rage) { icons.push('🔥👁️'); tip.push(`В ярости: дополнительно сожрёт ${e.st.rage} Осознания.`); }
  if (m.drain && glowTier() >= 2) tip.push('Ваше осознание ему невкусно (вы — мастер второго внимания).');
  else if (m.drain) { icons.push('👁️'); tip.push(m.drain >= 99 ? `Съест всё ваше Осознание и станет сильнее${m.drainStr ? ` (не больше чем на ${m.drainStr})` : ' на столько же'}.` : `Съест до ${m.drain} Осознания и станет сильнее на столько же.`); }
  if (m.cleanse) tip.push('Снимет с себя ослабления.');
  if (m.curse) { icons.push(run.curses.includes(m.curse) ? '' : '🕸️'); if (!run.curses.includes(m.curse)) tip.push(`Если удар пробьёт Защиту — наложит постоянное проклятие «${CURSES[m.curse].name}»: ${CURSES[m.curse].desc}`); }
  if (m.sap) { icons.push('🩸'); tip.push('Высосет силы: −1 энергия в ваш следующий ход.'); }
  if (e.def.art && e.def.art.cloud && !e.clinging && e.move !== 'reform') { icons.push('☁️'); tip.push('<b>Если в начале его хода на вас нет Защиты — вцепится</b> и начнёт высасывать силы и насылать кошмары. Сорвать: 15+ урона за один ход.'); }
  if (e.clinging) tip.push('Вцепился в вас! Нанесите 15+ урона за ход, чтобы сорвать.');
  if (e.def.thorns) tip.push(`Шипы: каждая ваша атака по нему — ${e.def.thorns} урона вам.`);
  if (m.heal) tip.push(`Восстановит ${m.heal} здоровья.`);
  if (m.addCards) { icons.push('🌑'); tip.push(`Подкинет в колоду ${m.addCards.n} × «${CARDS[m.addCards.id].name}».`); }
  if (m.summon) { icons.push('🦇'); tip.push('Призовёт летунов.'); }
  return { html: icons.join(' '), tip: tip.join('<br>') };
}

function updateBar(box, hp, max, block) {
  let bar = box.querySelector('.bar');
  if (!bar) {
    box.innerHTML = '<div class="bar"><div class="lag"></div><div class="fill"></div><span></span><div class="blockbadge"></div></div>';
    bar = box.querySelector('.bar');
  }
  const w = Math.min(100, Math.max(0, hp / max * 100)) + '%';
  bar.querySelector('.fill').style.width = w;
  bar.querySelector('.lag').style.width = w;
  bar.querySelector('span').textContent = `${hp}/${max}`;
  bar.classList.toggle('has-block', block > 0);
  const bb = bar.querySelector('.blockbadge');
  if (+bb.dataset.v !== block) {
    bb.dataset.v = block; bb.textContent = block;
    if (block > 0) { bb.classList.remove('pop'); void bb.offsetWidth; bb.classList.add('pop'); }
  }
}

// ---- отрисовка боя ----
function renderCombatShell() {
  const h = HEROES[run.hero];
  beginSwap(cb.kind === 'boss' ? 'boss' : 'combat');
  app.innerHTML = `${topBar()}<div class="screen combat ${cb.kind === 'boss' ? 'boss-fight' : ''}">
    <div class="sky night"></div><div class="stars"></div><div class="moon small"></div><div class="mountains"></div><div class="ground"></div>
    ${motes(14, 'embers')}<div class="fog"></div>
    <div class="field">
      <div class="unit hero" data-unit="hero">
        <div class="sprite"><img src="${h.side || h.body}" alt=""></div>
        <div class="u-bar"></div><div class="statuses"></div>
      </div>
      <div class="enemies" id="enemies"></div>
    </div>
    <div class="hint" id="hint"></div>
    <div class="turn-info" id="turnInfo"></div>
    <div class="bottom">
      <div class="energy" id="energy" data-tip="Энергия. Восстанавливается каждый ход."><div class="e-ring"></div><div class="e-core"></div></div>
      <button class="pile draw-pile" data-unit="drawpile" data-act="viewDraw" data-tip="Колода добора (порядок скрыт)"><span class="pile-ico">🂠</span><b id="drawN"></b></button>
      <div class="hand" id="hand"></div>
      <button class="pile discard-pile" data-act="viewDiscard" data-tip="Сброс"><span class="pile-ico">♻️</span><b id="discN"></b></button>
      <button class="pile exhaust-pile" data-act="viewExhaust" data-tip="Сгоревшие карты"><span class="pile-ico">🔥</span><b id="exhN"></b></button>
      <button class="end-turn" id="endTurn" data-act="endTurn">Завершить ход</button>
      <button class="speed-btn" data-act="speed" data-tip="Скорость боя">⏩ ×${speedMul}</button>
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
  div.innerHTML = `<div class="intent"></div><div class="sprite">${enemyArt(e.def.art)}</div>
    <div class="u-name">${e.name}</div><div class="u-bar"></div><div class="statuses"></div>`;
  // наведение на врага: урон на картах пересчитывается с учётом его статусов
  div.addEventListener('pointerenter', () => { if (cb && !e.dead) { cb.hoverTarget = e; renderHand(); } });
  div.addEventListener('pointerleave', () => { if (cb && cb.hoverTarget === e && !drag) { cb.hoverTarget = null; renderHand(); } });
  document.getElementById('enemies').appendChild(div);
}

function clingCloud(e) {
  e.clinging = true;
  fx(e.uid, 'вцепился!', 'drain', 'pulse');
  setTimeout(() => { if (cb && !cb.over) banner('Облако вцепилось', 'danger'); }, 200);
}
function detachCloud(e) {
  if (!cb || !e.clinging || e.dead) return;
  e.clinging = false; e.turnDmg = 0;
  e.move = 'reform'; e.hist.push('reform');
  fx(e.uid, 'сорвано!', 'buff', 'hurt', 'burst:#b46bff');
  updateCombat();
}
function updateCombat() {
  if (!cb) return;
  refreshTop();
  const p = cb.p;
  const hero = document.querySelector('[data-unit="hero"]');
  updateBar(hero.querySelector('.u-bar'), run.hp, run.maxHp, p.block);
  hero.classList.toggle('clung', cb.enemies.some(e => e.clinging && !e.dead));
  updateStatuses(hero.querySelector('.statuses'), p.st);
  const sel = cb.selected ? cb.hand.find(c => c.uid === cb.selected) : null;
  const targeting = sel && CARDS[sel.id].target === 'enemy';
  for (const e of cb.enemies) {
    const el = document.querySelector(`[data-unit="${e.uid}"]`);
    if (!el) continue;
    el.classList.toggle('dead', e.dead);
    if (e.clinging && !el.classList.contains('clinging')) {
      const hs = document.querySelector('[data-unit="hero"] .sprite').getBoundingClientRect(), es = el.getBoundingClientRect();
      el.style.setProperty('--cling-x', ((hs.right - es.left) / scale - 70) + 'px');
    }
    el.classList.toggle('clinging', !!e.clinging);
    el.classList.toggle('targetable', !!targeting && !e.dead);
    const ii = intentInfo(e);
    const ie = el.querySelector('.intent');
    const ih = e.dead || cb.over ? '' : ii.html;
    if (ie.dataset.h !== ih) {
      ie.dataset.h = ih; ie.innerHTML = ih;
      ie.classList.remove('fresh'); void ie.offsetWidth; if (ih) ie.classList.add('fresh');
    }
    ie.dataset.tip = ii.tip;
    updateBar(el.querySelector('.u-bar'), e.hp, e.maxHp, e.block);
    updateStatuses(el.querySelector('.statuses'), e.st);
  }
  const en = document.getElementById('energy');
  if (en.dataset.v !== String(p.energy)) {
    en.dataset.v = p.energy;
    en.querySelector('.e-core').innerHTML = `<b>${p.energy}</b><span>/${p.maxEnergy}</span>`;
    en.classList.remove('pulse'); void en.offsetWidth; en.classList.add('pulse');
  }
  en.classList.toggle('empty', p.energy === 0);
  document.getElementById('drawN').textContent = cb.draw.length;
  document.getElementById('discN').textContent = cb.discard.length;
  document.getElementById('exhN').textContent = cb.exhaust.length;
  const ti = document.getElementById('turnInfo');
  const left = cb.rageTurn - cb.turn;
  ti.innerHTML = `Ход ${Math.max(1, cb.turn)}${cb.raged ? ' · <span class="rage">🔥 Летуны в ярости</span>' : left <= 3 && left > 0 ? ` · <span class="rage-soon">🔥 ярость через ${left}</span>` : ''}`;
  ti.dataset.tip = `На ${cb.rageTurn}-м ходу летуны впадают в ярость: каждый их ход, помимо обычного действия, каждый летун сжирает 2 Осознания. Затягивать бой — значит терять осознанность. Чем быстрее победа — тем больше песо.`;
  const et = document.getElementById('endTurn');
  et.disabled = cb.busy || cb.over;
  et.textContent = cb.busy && !cb.over ? 'Ход летунов…' : 'Завершить ход';
  et.classList.toggle('nudge', !cb.busy && !cb.over && !cb.hand.some(c => !whyNot(c)));
  document.getElementById('hint').textContent = cb.potionAim !== null ? 'Выберите цель для зелья' : targeting ? 'Выберите цель' : '';
  document.querySelectorAll('.enemies .unit').forEach(u => u.classList.toggle('targetable', (targeting || cb.potionAim !== null) && !u.classList.contains('dead')));
  renderHand();
  flushFx();
}

function renderHand() {
  const hand = document.getElementById('hand');
  const n = cb.hand.length;
  const spread = Math.min(118, 760 / Math.max(1, n));
  const old = new Map([...hand.children].map(el => [+el.dataset.uid, el]));
  let k = 0;
  cb.hand.forEach((c, i) => {
    const mid = (n - 1) / 2, off = i - mid;
    const x = off * spread, rot = off * 3.2, y = Math.abs(off) * Math.abs(off) * 2.6;
    const d = CARDS[c.id];
    const playable = !whyNot(c) && !cb.busy;
    const cls = [playable ? 'playable' : 'unplayable', cb.selected === c.uid ? 'sel' : ''].join(' ');
    const tmp = document.createElement('div');
    tmp.innerHTML = cardHTML(c, {
      combat: true, target: cb.hoverTarget, cls: 'in-hand ' + cls, attrs: `data-act="card" data-silent="1" data-key="${i < 10 ? (i + 1) % 10 : ''}"`,
      style: `--x:${x}px;--y:${y}px;--r:${rot}deg;z-index:${cb.selected === c.uid ? 50 : i + 1}`,
    });
    const ne = tmp.firstElementChild;
    const el = old.get(c.uid);
    if (el) {
      old.delete(c.uid);
      const drawing = el.classList.contains('drawn'), delay = el.style.animationDelay;
      const dragged = drag && drag.active && drag.el === el, keepT = el.style.transform;
      el.className = ne.className;
      el.setAttribute('style', ne.getAttribute('style'));
      if (drawing) { el.classList.add('drawn'); el.style.animationDelay = delay; }
      if (dragged) { el.classList.add(drag.aim ? 'aiming' : 'dragging'); if (keepT) el.style.transform = keepT; }
      if (el.innerHTML !== ne.innerHTML) el.innerHTML = ne.innerHTML;
      if (ne.dataset.tip) el.dataset.tip = ne.dataset.tip;
    } else {
      if (cb.fresh.has(c.uid)) {
        ne.classList.add('drawn');
        ne.style.animationDelay = (k++ * 80) + 'ms';
        ne.addEventListener('animationend', () => ne.classList.remove('drawn'), { once: true });
      }
      hand.appendChild(ne);
    }
  });
  old.forEach(el => el.remove());
  cb.fresh.clear();
}

function selectCard(uid) {
  if (cb.busy || cb.over || cb.playing) return;
  const c = cb.hand.find(x => x.uid === uid);
  if (!c) return;
  const d = CARDS[c.id];
  if (cb.selected === uid) { cb.selected = null; updateCombat(); return; }
  const why = whyNot(c);
  if (why) { toast(why); return; }
  if (d.target === 'enemy') {
    const a = alive();
    if (a.length === 1) { playCard(uid, a[0]); return; }
    cb.selected = uid; sfx('click'); updateCombat();
  } else playCard(uid, null);
}

const combatActions = {
  card: el => selectCard(+el.dataset.uid),
  target: el => {
    const e = cb.enemies.find(x => x.uid === el.dataset.unit);
    if (!e || e.dead) return;
    if (cb.potionAim !== null) return usePotionOn(cb.potionAim, e);
    if (!cb.selected) return;
    playCard(cb.selected, e);
  },
  endTurn: () => endTurn(),
  viewDraw: () => showDeckView(cb.draw, 'Колода добора'),
  viewDiscard: () => showDeckView(cb.discard, 'Сброс'),
  viewExhaust: () => showDeckView(cb.exhaust, 'Сгоревшие карты'),
  _bg: e => {
    if (!cb) return;
    if (cb.potionAim !== null && !e.target.closest('.potion-pop')) { cb.potionAim = null; updateCombat(); }
    if (cb.selected && !e.target.closest('.card')) { cb.selected = null; updateCombat(); }
  },
};

// ============================================================
//  Зелья: применение
// ============================================================
// Проклятие «Дрожащие руки»: 50% зелий разливается (кроме святой воды)
const spilled = p => run.curses.includes('tremor') && !p.cleanse && Math.random() < 0.5;
function drinkPotion(i) {
  const id = run.potions[i];
  if (!id) return;
  const p = POTIONS[id];
  if (!cb || cb.over) {                       // вне боя — только то, что можно пить всегда
    if (!p.anytime) return;
    const slot = document.querySelectorAll('.tb-potions .potion-slot')[i];
    if (slot) burst(slot, p.glow, 16, 0.5);
    run.potions[i] = null;
    if (spilled(p)) { save(); refreshTop(); toast('Руки дрожат — зелье разлито впустую'); return; }
    p.use({ heal: n => evApi.heal(n), uncurse: () => { run.curses = []; sfx('buff'); toast('Проклятия сняты'); } });
    save(); refreshTop();
    return;
  }
  if (cb.busy || cb.playing) return;
  if (p.target === 'enemy') {
    const a = alive();
    if (a.length === 1) return usePotionOn(i, a[0]);
    cb.potionAim = i; cb.selected = null; sfx('click'); updateCombat();
    return;
  }
  usePotionOn(i, null);
}
async function usePotionOn(i, target) {
  const id = run.potions[i];
  if (!id || !cb || cb.busy || cb.playing) return;
  const p = POTIONS[id];
  const slot = document.querySelectorAll('.tb-potions .potion-slot')[i];
  const toEl = target ? document.querySelector(`[data-unit="${target.uid}"] .sprite`) : document.querySelector('[data-unit="hero"] .sprite');
  flyPotion(slot, stagePt(toEl, 0.45), id);
  run.potions[i] = null;
  cb.potionAim = null; cb.playing = true;
  updateCombat();
  await sleep(420);
  cb.playing = false;
  if (!cb || cb.over) return;
  if (spilled(p)) { fx('hero', 'разлито впустую 🖐️', 'debuff', 'hurt'); sfx('debuff'); updateCombat(); return; }
  burst(toEl, p.glow, 24, 0.45);
  effectAt(toEl, 'ring', 0.45, 800, `--c:${p.glow}`);
  sfx('buff');
  p.use(G, target);
  updateCombat();
  await checkCombatEnd();
}
function flyPotion(slot, dest, id) {
  if (!slot) return;
  const a = stagePt(slot);
  const f = document.createElement('div');
  f.className = 'potion-fly';
  f.style.cssText = `left:${a.x - 22}px;top:${a.y - 27}px;--pc:${POTIONS[id].glow}`;
  f.innerHTML = potionSVG(id);
  fxLayer.appendChild(f);
  const dx = dest.x - a.x, dy = dest.y - a.y;
  f.animate([
    { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${Math.min(dy, 0) * 0.5 - 90}px) rotate(200deg) scale(1.5)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) rotate(400deg) scale(.6)`, opacity: 0.2 },
  ], { duration: 420 / speedMul, easing: 'cubic-bezier(.4,.1,.6,1)', fill: 'forwards' }).onfinish = () => f.remove();
}

// ============================================================
//  Перетаскивание карт: прицельные — стрелкой на врага, остальные — вверх на поле
// ============================================================
let drag = null, suppressClick = false;
const PLAY_LINE = 455;   // выше этой линии (в координатах сцены) карта разыгрывается
function toStage(e) { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
function arrowEl() {
  let a = document.getElementById('dragArrow');
  if (!a) {
    a = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    a.id = 'dragArrow';
    a.setAttribute('viewBox', '0 0 1280 720');
    a.innerHTML = `<defs><linearGradient id="daG" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".2"/><stop offset="1" stop-color="#ffd27a"/></linearGradient></defs>
      <path class="da-glow"/><path class="da-line"/><g class="da-head"><path d="M-16 -13 L10 0 L-16 13 L-9 0 Z"/></g>`;
    fxLayer.appendChild(a);
  }
  return a;
}
function drawArrow(from, to, hot) {
  const a = arrowEl();
  const cx = (from.x + to.x) / 2, cy = Math.min(from.y, to.y) - 140;
  const d = `M${from.x} ${from.y} Q${cx} ${cy} ${to.x} ${to.y}`;
  a.querySelector('.da-line').setAttribute('d', d);
  a.querySelector('.da-glow').setAttribute('d', d);
  const g = a.querySelector('#daG');
  g.setAttribute('x1', from.x); g.setAttribute('y1', from.y); g.setAttribute('x2', to.x); g.setAttribute('y2', to.y);
  const ang = Math.atan2(to.y - cy, to.x - cx) * 180 / Math.PI;
  a.querySelector('.da-head').setAttribute('transform', `translate(${to.x} ${to.y}) rotate(${ang})`);
  a.classList.toggle('hot', !!hot);
  a.classList.add('show');
}
function hideArrow() { const a = document.getElementById('dragArrow'); if (a) a.classList.remove('show', 'hot'); }

document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !cb || cb.busy || cb.over || cb.playing) return;
  const el = e.target.closest('#hand .card.in-hand');
  if (!el) return;
  drag = { uid: +el.dataset.uid, el, x0: e.clientX, y0: e.clientY, active: false, lastX: e.clientX, tilt: 0 };
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.active) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 10) return;
    const c = cb && cb.hand.find(x => x.uid === drag.uid);
    if (!c || cb.busy || cb.playing) { drag = null; return; }
    const d = CARDS[c.id];
    const why = whyNot(c);
    if (why) { toast(why); drag = null; suppressClick = true; return; }
    drag.active = true;
    drag.aim = d.target === 'enemy';
    cb.selected = null;
    tooltip.style.display = 'none';
    drag.el.classList.add(drag.aim ? 'aiming' : 'dragging');
    document.body.classList.add('is-dragging');
    sfx('card');
  }
  const pt = toStage(e);
  if (drag.aim) {
    const r = drag.el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const from = { x: (r.left + r.width / 2 - sr.left) / scale, y: (r.top - sr.top) / scale + 6 };
    const u = document.elementFromPoint(e.clientX, e.clientY);
    const unit = u && u.closest('.enemies .unit:not(.dead)');
    const t = unit ? cb.enemies.find(x => x.uid === unit.dataset.unit) : null;
    document.querySelectorAll('.enemies .unit').forEach(x => x.classList.toggle('drag-target', x === unit));
    if (t !== drag.target) { drag.target = t; cb.hoverTarget = t; renderHand(); }
    drawArrow(from, pt, !!t);
  } else {
    drag.tilt = drag.tilt * 0.7 + Math.max(-18, Math.min(18, (e.clientX - drag.lastX) * 0.9)) * 0.3;
    drag.lastX = e.clientX;
    // карта висит в .hand с началом координат (640, 504) — центрируем под курсором
    drag.el.style.transform = `translate(${pt.x - 715}px, ${pt.y - 609}px) rotate(${drag.tilt}deg) scale(1.12)`;
    drag.el.classList.toggle('will-play', pt.y < PLAY_LINE);
  }
});
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const dd = drag; drag = null;
  if (!dd.active) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 60);   // гасим только «хвостовой» клик после перетаскивания
  document.body.classList.remove('is-dragging');
  hideArrow();
  document.querySelectorAll('.enemies .unit').forEach(x => x.classList.remove('drag-target'));
  const pt = toStage(e);
  if (dd.aim) {
    dd.el.classList.remove('aiming');
    if (dd.target && !dd.target.dead) return playCard(dd.uid, dd.target);
    cb.hoverTarget = null; renderHand();
    return;
  }
  dd.el.classList.remove('dragging', 'will-play');
  if (pt.y < PLAY_LINE) return playCard(dd.uid, null);
  dd.el.style.transform = '';       // возвращается в руку по transition
  renderHand();
});
document.addEventListener('click', e => { if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); } }, true);

document.addEventListener('keydown', e => {
  if (!cb || cb.over || overlay.classList.contains('open')) {
    if (e.key === 'Escape' && overlay.classList.contains('open') && overlay.querySelector('[data-act="closeOverlay"]')) closeOverlay();
    return;
  }
  if (e.key === 'Escape') { cb.selected = null; cb.potionAim = null; updateCombat(); return; }
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
  const kind = cb.kind, bonus = cb.bonusGold || 0, turns = cb.turn;
  const glowGain = (cb.p.st.aware || 0) * (hasRelic('shard') ? 2 : 1), glowBefore = run.glow || 0;
  run.glow = glowBefore + glowGain;
  if (kind === 'elite') run.stats.elites++;
  cb = null;
  if (kind === 'boss') return showVictory();
  const rewards = [];
  const extra = run.room && run.room.extra;
  if (extra) [].concat(extra).forEach(x => rewards.push({ ...x }));
  // базовая награда меньше, зато быстрая победа приносит бонус
  const elite = kind === 'elite';
  const base = (elite ? rnd(15, 20) : rnd(6, 10)) + bonus;
  const fast = elite ? (turns <= 4 ? 20 : turns <= 6 ? 10 : 0) : (turns <= 3 ? 12 : turns <= 5 ? 6 : 0);
  rewards.push({ type: 'gold', n: base + fast, base, fast, turns });
  if (kind === 'elite') { const r = randomRelicId(); rewards.push(r ? { type: 'relic', id: r } : { type: 'gold', n: 60 }); }
  // шанс зелья как в Slay the Spire: 40%, после неудачи +10%, после выпадения −10%
  if (Math.random() * 100 < run.potionChance) { rewards.push({ type: 'potion', id: randomPotionId() }); run.potionChance -= 10; }
  else run.potionChance += 10;
  rewards.push({ type: 'card', ids: rewardCards(run.curses.includes('forget') ? 2 : 3, kind === 'elite') });
  run.room = { type: 'rewards', rewards, title: kind === 'elite' ? 'Элитный летун повержен!' : 'Летуны рассеяны!', glowGain, glowBefore };
  save();
  showRewards();
}

function showRewards() {
  const { rewards, title, glowGain = 0, glowBefore = 0 } = run.room;
  const newTiers = GLOW_TIERS.filter(t => glowBefore < t.at && glowBefore + glowGain >= t.at);
  let glowShown = false;
  let first = true;
  const render = () => {
    const intro = first;
    if (first) { beginSwap('fade'); first = false; }
    app.innerHTML = `${topBar()}<div class="screen scene">
      <div class="sky night"></div><div class="mountains"></div>${motes(20)}
      <div class="rewards ${intro ? '' : 'settled'}">
        <h2>${title}</h2>
        ${glowGain > 0 || newTiers.length ? `<div class="glow-gain ${glowShown ? 'settled' : ''}">
          <div class="gg-line">✨ Свечение кокона <b>+${glowGain}</b> <span class="muted">(непотраченное Осознание)</span></div>
          <div class="g-bar big"><i class="was" style="width:${Math.min(100, glowBefore / GLOW_MAX * 100)}%"></i><i class="now" style="width:${Math.min(100, (glowBefore + glowGain) / GLOW_MAX * 100)}%"></i>${GLOW_TIERS.map(t => `<b style="left:${t.at / GLOW_MAX * 100}%" class="${glowBefore + glowGain >= t.at ? 'on' : ''}"></b>`).join('')}</div>
          ${newTiers.map(t => `<div class="gg-tier">🌟 <b>${t.name}</b> — ${t.desc}</div>`).join('')}
        </div>` : ''}
        <p class="muted">Награды</p>
        ${rewards.map((r, i) => r.taken ? '' : `<button class="reward" data-act="take" data-i="${i}">${
          r.type === 'gold' ? `💰 ${r.n} песо${r.fast ? ` <small class="muted">(${r.base} + ${r.fast} за победу за ${r.turns} ${r.turns === 1 ? 'ход' : r.turns < 5 ? 'хода' : 'ходов'})</small>` : ''}` :
          r.type === 'relic' ? `${RELICS[r.id].icon} ${RELICS[r.id].name}${RELICS[r.id].unique ? ' <small class="uniq">уникальная</small>' : ''}` :
          r.type === 'cardFixed' ? `🂠 «${CARDS[r.id].name}» <small class="uniq">уникальная карта</small>` :
          r.type === 'potion' ? `<span class="rw-potion" style="--pc:${POTIONS[r.id].glow}">${potionSVG(r.id)}</span> ${POTIONS[r.id].name}` :
          '🂠 Добавить карту в колоду'}</button>`).join('')}
        <button class="btn big" data-act="next">${rewards.every(r => r.taken) ? 'Продолжить' : 'Пропустить остальное'} ➜</button>
      </div></div>`;
    if (intro && newTiers.length) setTimeout(() => { banner(newTiers[newTiers.length - 1].name, 'win'); sfx('aware'); }, 900);
    glowShown = true;
  };
  actions = {
    take: el => {
      const r = rewards[+el.dataset.i];
      if (r.type === 'gold') { run.gold += r.n; r.taken = true; sfx('gold'); save(); render(); }
      else if (r.type === 'relic') { gainRelic(r.id); r.taken = true; sfx('buff'); save(); render(); }
      else if (r.type === 'cardFixed') { run.deck.push(mkCard(r.id)); r.taken = true; sfx('buff'); save(); render(); }
      else if (r.type === 'potion') {
        if (!hasPotionSlot()) { toast('Нет свободной ячейки — выбросьте зелье (кликните по нему вверху)'); return; }
        r.taken = true; sfx('buff'); render(); gainPotion(r.id); save();
      }
      else {
        showCardChoice(r.ids, 'Выберите карту', c => { if (c) r.taken = true; actions = rewardActions; save(); render(); });
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
  beginSwap('death');
  app.innerHTML = `<div class="screen end-screen lose">
    <div class="sky night"></div><div class="mountains"></div>${motes(24, 'ash')}
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
  beginSwap('dawn');
  app.innerHTML = `<div class="screen end-screen win">
    <div class="sky dawn"></div><div class="mountains"></div>${motes(24, 'gold')}
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
//  Старт: «нажмите, чтобы начать» → заставка → титул (музыка по кругу)
// ============================================================
showGate();
