'use strict';
// ============================================================
//  Пустыня с кактусами (общий фон заставки и титульного экрана)
//  и вступительная заставка под «Хрипелище» (assets/audio/intro.mp3)
// ============================================================

const SUN_X = 820, HORIZON = 468;

function saguaro(x, base, h, s, arms, body, rim) {
  const side = Math.sign(SUN_X - x) || 1;         // с какой стороны светит солнце
  const trunk = `M${x} ${base} L${x} ${base - h}`;
  const armPaths = arms.map(([dir, at, len, up]) => {
    const y = base - h * at;
    const ax = x + dir * len;
    return `M${x} ${y} L${ax} ${y} L${ax} ${y - up}`;
  });
  const draw = (d, w, color, dx = 0) => `<path d="${d}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(${dx},0)"/>`;
  const all = [[trunk, s], ...armPaths.map(a => [a, s * 0.62])];
  const ribs = `<path d="M${x - s * 0.18} ${base} L${x - s * 0.18} ${base - h + s * 0.4} M${x + s * 0.18} ${base} L${x + s * 0.18} ${base - h + s * 0.4}" stroke="${rim}" stroke-opacity=".12" stroke-width="${Math.max(1, s * 0.06)}"/>`;
  return `<g class="cactus" style="transform-origin:${x}px ${base}px">
    ${all.map(([d, w]) => draw(d, w, rim, side * Math.max(1.5, w * 0.12))).join('')}
    ${all.map(([d, w]) => draw(d, w, body)).join('')}${ribs}</g>`;
}
function pricklyPear(x, base, k, body, rim) {
  const pads = [[0, -18, 16, 22, 0], [-20, -44, 13, 18, -25], [18, -46, 12, 17, 22], [-2, -70, 11, 15, 5]];
  return `<g class="cactus" style="transform-origin:${x}px ${base}px">${pads.map(([dx, dy, rx, ry, r]) =>
    `<ellipse cx="${x + dx * k}" cy="${base + dy * k}" rx="${rx * k}" ry="${ry * k}" transform="rotate(${r} ${x + dx * k} ${base + dy * k})" fill="${body}" stroke="${rim}" stroke-width="${1.2 * k}" stroke-opacity=".35"/>`).join('')}</g>`;
}

function desertSVG() {
  const backC = '#1f0d27', backRim = '#ff9a6a';
  const frontC = '#0b0410', frontRim = '#ffb070';
  return `<svg class="desert-svg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMax slice">
  <defs>
    <radialGradient id="dsSun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6d0"/><stop offset=".45" stop-color="#ffc56a"/><stop offset=".75" stop-color="#ff7a3a"/><stop offset="1" stop-color="#ff5a2a" stop-opacity="0"/></radialGradient>
    <radialGradient id="dsGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb060" stop-opacity=".75"/><stop offset=".5" stop-color="#ff6a3a" stop-opacity=".25"/><stop offset="1" stop-color="#ff4a2a" stop-opacity="0"/></radialGradient>
    <linearGradient id="dsGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1230"/><stop offset=".35" stop-color="#170a1d"/><stop offset="1" stop-color="#070309"/></linearGradient>
    <linearGradient id="dsMesaFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a2e5a"/><stop offset="1" stop-color="#3a1a44"/></linearGradient>
    <linearGradient id="dsMesaNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#43193f"/><stop offset="1" stop-color="#26102e"/></linearGradient>
    <clipPath id="dsHorizon"><rect x="0" y="0" width="1280" height="${HORIZON + 4}"/></clipPath>
    <clipPath id="dsDisk"><circle cx="${SUN_X}" cy="${HORIZON}" r="118"/></clipPath>
  </defs>
  <g class="l-sun" clip-path="url(#dsHorizon)">
    <circle class="sun-glow" cx="${SUN_X}" cy="${HORIZON}" r="420" fill="url(#dsGlow)"/>
    <circle class="sun-disk" cx="${SUN_X}" cy="${HORIZON}" r="120" fill="url(#dsSun)"/>
    <g class="sun-bands" fill="#5a1f3a" opacity=".55" clip-path="url(#dsDisk)">
      <rect x="${SUN_X - 130}" y="${HORIZON - 40}" width="260" height="5"/><rect x="${SUN_X - 130}" y="${HORIZON - 24}" width="260" height="7"/><rect x="${SUN_X - 130}" y="${HORIZON - 10}" width="260" height="9"/>
    </g>
  </g>
  <g class="l-mesa-far"><path fill="url(#dsMesaFar)" d="M0 ${HORIZON} L0 400 L40 396 L70 372 L190 368 L214 392 L300 398 L330 430 L470 432 L500 404 L520 386 L640 382 L660 404 L700 440 L1000 444 L1030 410 L1060 380 L1190 374 L1215 398 L1280 402 L1280 ${HORIZON} Z"/></g>
  <g class="l-mesa-near"><path fill="url(#dsMesaNear)" d="M0 ${HORIZON + 2} L0 440 L120 436 L150 414 L260 410 L285 438 L380 446 L420 452 L560 454 L1040 456 L1100 430 L1130 412 L1230 408 L1250 430 L1280 434 L1280 ${HORIZON + 2} Z"/></g>
  <g class="l-ground"><path fill="url(#dsGround)" d="M0 ${HORIZON} C 200 ${HORIZON - 6} 420 ${HORIZON + 8} 640 ${HORIZON} C 860 ${HORIZON - 8} 1080 ${HORIZON + 6} 1280 ${HORIZON} L1280 720 L0 720 Z"/>
    <path fill="#10061a" opacity=".8" d="M0 560 C 260 520 520 575 800 548 C 1000 530 1160 560 1280 548 L1280 720 L0 720 Z"/></g>
  <g class="l-cacti-back">
    ${saguaro(470, 500, 64, 9, [[-1, .55, 12, 14], [1, .7, 10, 10]], backC, backRim)}
    ${saguaro(560, 492, 44, 7, [[1, .5, 9, 10]], backC, backRim)}
    ${saguaro(1060, 506, 80, 11, [[-1, .45, 14, 18], [1, .62, 13, 16]], backC, backRim)}
    ${saguaro(1140, 496, 50, 8, [[-1, .6, 10, 10]], backC, backRim)}
    ${saguaro(690, 488, 36, 6, [[1, .55, 8, 8]], backC, backRim)}
    ${pricklyPear(620, 512, .7, backC, backRim)}
    ${pricklyPear(960, 515, .8, backC, backRim)}
  </g>
  <g class="l-cacti-front">
    ${saguaro(64, 760, 430, 44, [[1, .42, 58, 90], [-1, .58, 40, 70], [1, .7, 44, 40]], frontC, frontRim)}
    ${saguaro(1212, 760, 360, 38, [[-1, .45, 52, 88], [1, .6, 38, 60]], frontC, frontRim)}
    ${saguaro(1015, 745, 190, 24, [[-1, .5, 30, 44], [1, .62, 26, 30]], frontC, frontRim)}
    ${pricklyPear(170, 730, 1.6, frontC, frontRim)}
    ${pricklyPear(1110, 735, 1.3, frontC, frontRim)}
    <path fill="${frontC}" d="M480 720 L500 690 L540 684 L575 700 L590 720 Z M880 720 L900 700 L930 696 L950 720 Z"/>
  </g></svg>`;
}

// Фон: небо, звёзды, пустыня, пыль, летуны вдали
function desertHTML(cls = '') {
  return `<div class="desert ${cls}">
    <div class="d-sky"></div><div class="d-sky-sunset"></div><div class="stars"></div>
    ${desertSVG()}
    <div class="d-haze"></div>
  </div>`;
}

// ------------------------------------------------------------
//  Музыка: интро один раз, затем тема по кругу
// ------------------------------------------------------------
let musicMuted = localStorage.getItem('nagual_music_mute') === '1';
const Music = {
  intro: null, theme: null,
  fade(a, to, ms, done) {
    if (!a) return;
    clearInterval(a._fade);
    const from = a.volume, t0 = performance.now();
    a._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { clearInterval(a._fade); if (done) done(); }
    }, 30);
  },
  playIntro() {
    this.intro = new Audio('assets/audio/intro.mp3');
    this.intro.volume = musicMuted ? 0 : 0.95;
    return this.intro.play();
  },
  stopIntro(ms = 500) {
    const a = this.intro;
    if (!a) return;
    this.fade(a, 0, ms, () => a.pause());
  },
  // Плейлист: треки чередуются по кругу, первым идёт «Linen Sirens»
  tracks: ['assets/audio/linen_sirens.mp3', 'assets/audio/granite_lantern.mp3'],
  track: 0,
  startTheme() {
    if (!this.theme) {
      this.theme = new Audio(this.tracks[this.track]);
      this.theme.volume = 0;
      this.theme.addEventListener('ended', () => this.nextTrack());
    }
    if (musicMuted || !this.theme.paused) return;
    this.theme.play().then(() => this.fade(this.theme, 0.45, 2500)).catch(() => {});
  },
  nextTrack() {
    this.track = (this.track + 1) % this.tracks.length;
    this.theme.src = this.tracks[this.track];
    this.theme.volume = 0;
    if (musicMuted) return;
    this.theme.play().then(() => this.fade(this.theme, 0.45, 1500)).catch(() => {});
  },
  toggle() {
    musicMuted = !musicMuted;
    localStorage.setItem('nagual_music_mute', musicMuted ? '1' : '0');
    if (musicMuted) {
      if (this.theme) this.fade(this.theme, 0, 400, () => this.theme.pause());
      if (this.intro) this.intro.volume = 0;
    } else {
      if (this.intro && !this.intro.paused) this.intro.volume = 0.95;
      else this.startTheme();
    }
  },
};

// ------------------------------------------------------------
//  Экран «нажмите, чтобы начать» (браузеры не дают играть звук без клика)
// ------------------------------------------------------------
function showGate() {
  const gate = document.createElement('div');
  gate.className = 'gate';
  gate.innerHTML = `<div class="gate-sigil">${sigilSVG()}</div>
    <div class="gate-text">Нажмите, чтобы начать</div>
    <div class="gate-hint">🎧 лучше со звуком</div>`;
  stage.appendChild(gate);
  const go = () => {
    document.removeEventListener('keydown', go);
    gate.classList.add('out');
    setTimeout(() => gate.remove(), 600);
    playIntro();
  };
  gate.addEventListener('click', go, { once: true });
  document.addEventListener('keydown', go, { once: true });
}

// ------------------------------------------------------------
//  Заставка. Тайминг под «Хрипелище» (13.8 с):
//  0–1.9 нарастание · 1.9 удар · 3.9 удар · 7.4 кульминация · 11.1 удар · 11.7–13.8 затухание
// ------------------------------------------------------------
const INTRO_LEN = 13.8;
let introDone = false;

function playIntro() {
  const title = 'Путь Нагваля';
  const letters = [...title].map((ch, i) => ch === ' ' ? '<span class="sp"> </span>'
    : `<span style="--i:${i}">${ch}</span>`).join('');
  const swarm = Array.from({ length: 11 }, (_, i) => {
    const w = rnd(50, 120);
    return `<div class="i-fl" style="--y:${rnd(40, 300)}px;--d:${(rnd(26, 40) / 10).toFixed(1)}s;--dl:${(1.9 + i * 0.12).toFixed(2)}s;--a:${rnd(20, 60)}px">
      <div class="i-fl-in">${flyerSVG({ w, body: '#07040c', body2: '#1a1026', wing: '#000', eye: '#ffd24d' })}</div></div>`;
  }).join('');
  const dust = Array.from({ length: 36 }, () =>
    `<i style="--x:${rnd(0, 100)}%;--dx:${rnd(-120, 120)}px;--h:${rnd(80, 260)}px;--s:${rnd(3, 9)}px;--dl:${(1.9 + Math.random() * 0.3).toFixed(2)}s"></i>`).join('');
  const burst = Array.from({ length: 28 }, (_, i) => {
    const a = i / 28 * Math.PI * 2, r = rnd(160, 340);
    return `<i style="--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r * 0.6}px;--s:${rnd(3, 8)}px"></i>`;
  }).join('');

  const el = document.createElement('div');
  el.className = 'intro';
  el.innerHTML = `
    <div class="i-cam">
      ${desertHTML('intro-desert')}
      <div class="i-swarm">${swarm}</div>
      <div class="i-eyes">${[[-150, 0], [150, 0], [-60, -40], [60, -40], [0, 40], [0, -90]].map(([x, y]) =>
        `<i style="--x:${x}px;--y:${y}px"></i>`).join('')}</div>
      <div class="i-dust">${dust}</div>
      <div class="i-hero">
        <div class="i-walker"><img src="assets/heroes/castaneda_walk.png" alt=""></div>
        <div class="i-aura"></div>
        <img class="i-stand" src="${HEROES.castaneda.body}" alt="">
      </div>
      <div class="i-shock"></div>
      <div class="i-title">
        <div class="i-sigil">${sigilSVG()}</div>
        <h1>${letters}</h1>
        <div class="i-burst">${burst}</div>
        <p class="i-sub">карточный рогалик о пути воина</p>
      </div>
    </div>
    <div class="i-flash f1"></div><div class="i-flash f2"></div><div class="i-flash f3"></div><div class="i-flash f4"></div>
    <div class="i-bar top"></div><div class="i-bar bottom"></div>
    <button class="i-skip">Пропустить ›</button>`;
  stage.appendChild(el);

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    el.classList.add('play');
    introTimer = setTimeout(finishIntro, INTRO_LEN * 1000);
  };
  const skip = e => {
    if (e.type === 'keydown' && !['Escape', 'Enter', ' '].includes(e.key)) return;
    Music.stopIntro(400);
    finishIntro();
  };
  el.querySelector('.i-skip').addEventListener('click', skip);
  document.addEventListener('keydown', skip);
  el._skip = skip;

  // Запускаем анимацию, когда звук действительно пошёл — так они совпадут
  Music.playIntro().then(() => {
    if (Music.intro.currentTime > 0) start();
    else Music.intro.addEventListener('playing', start, { once: true });
  }).catch(start);
  setTimeout(start, 1500);   // страховка: если звук так и не стартовал
}
let introTimer = null;

function finishIntro() {
  if (introDone) return;
  introDone = true;
  clearTimeout(introTimer);
  const el = document.querySelector('.intro');
  if (el) {
    document.removeEventListener('keydown', el._skip);
    el.classList.add('out');
    setTimeout(() => el.remove(), 1000);
  }
  showTitle(true);
  Music.startTheme();
}
