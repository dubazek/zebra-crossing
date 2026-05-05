// ============================================================
//  ZEBRA CROSSING SAFETY GAME
//  For children aged 3 - 6
// ============================================================

// ── AUDIO ENGINE (Web Audio API) ──────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx;
function initAudio() {
  if (!ctx) ctx = new AudioCtx();
}

function playTone(freq, duration, type='sine', vol=0.3, startTime=0) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime + startTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
  o.start(ctx.currentTime + startTime);
  o.stop(ctx.currentTime + startTime + duration);
}

function playSuccess() {
  initAudio();
  [523,659,784,1047].forEach((f,i) => playTone(f, 0.25, 'sine', 0.3, i*0.18));
}

function playHonk() {
  initAudio();
  playTone(200, 0.25, 'sawtooth', 0.4);
  setTimeout(() => playTone(180, 0.2, 'sawtooth', 0.35), 300);
}

function playWhoops() {
  initAudio();
  playTone(440, 0.1, 'square', 0.2);
  playTone(330, 0.2, 'square', 0.15, 0.1);
  playTone(220, 0.3, 'square', 0.1, 0.25);
}

function playWalkStep() {
  initAudio();
  playTone(120, 0.07, 'triangle', 0.15);
}

function playLightGreen() {
  initAudio();
  playTone(880, 0.15, 'sine', 0.3);
  playTone(1100, 0.15, 'sine', 0.25, 0.16);
}

function playLightYellow() {
  initAudio();
  playTone(660, 0.2, 'sine', 0.25);
}

function playCelebrate() {
  initAudio();
  const notes = [523,587,659,698,784,880,988,1047];
  notes.forEach((f,i) => playTone(f, 0.2, 'sine', 0.35, i*0.1));
}

// ── BUILD ZEBRA STRIPES ───────────────────────────────────
const stripeContainer = document.getElementById('zebra-stripes');
for(let i=0;i<7;i++){
  const s = document.createElement('div');
  s.className='stripe';
  stripeContainer.appendChild(s);
}

// ── GAME STATE ────────────────────────────────────────────
const LEVELS = {
  1: { cars:1, cycleTime:5000, yellowTime:1200, numCrossings:1 },
  2: { cars:2, cycleTime:4000, yellowTime:1000, numCrossings:2 },
  3: { cars:3, cycleTime:3500, yellowTime:900,  numCrossings:3 }
};

let state = {
  level: 1,
  phase: 'red',        // 'red' | 'yellow' | 'green'
  canWalk: false,
  walking: false,
  charX: 50,           // percent of wrapper width
  charDir: 1,          // 1 = right, -1 = left
  targetX: null,
  starsEarned: 0,
  crossingsLeft: 0,
  lookTimer: null,
  animFrame: null,
  carData: [],
  phaseTimer: null,
  paused: false,
  distractionBirdTimer: null,
};

const wrapper   = document.getElementById('game-wrapper');
const character = document.getElementById('character');
const walkBtn   = document.getElementById('walk-btn');
const speech    = document.getElementById('speech-bubble');
const starReward= document.getElementById('star-reward');
const starBar   = document.getElementById('stars-bar');
const levelBadge= document.getElementById('level-badge');
const overlay   = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg   = document.getElementById('overlay-msg');
const overlayBtn   = document.getElementById('overlay-btn');
const road      = document.getElementById('road');
const bird      = document.getElementById('bird');

// ── CAR SVG TEMPLATES ──────────────────────────────────────
function makeCar(type, id) {
  const car = document.createElement('div');
  car.className = 'car';
  car.id = id;
  car.style.top = '50%';
  car.style.transform = 'translateY(-50%)';

  const svgs = {
    bus: `<svg width="110" height="56" viewBox="0 0 110 56">
      <rect x="2" y="8" width="106" height="38" rx="8" fill="#FFD60A" stroke="#FF9F0A" stroke-width="2.5"/>
      <rect x="5" y="2" width="100" height="12" rx="6" fill="#FFD60A" stroke="#FF9F0A" stroke-width="2"/>
      <rect x="10" y="12" width="18" height="14" rx="4" fill="#87CEEB" stroke="#1565C0" stroke-width="1.5"/>
      <rect x="32" y="12" width="18" height="14" rx="4" fill="#87CEEB" stroke="#1565C0" stroke-width="1.5"/>
      <rect x="54" y="12" width="18" height="14" rx="4" fill="#87CEEB" stroke="#1565C0" stroke-width="1.5"/>
      <rect x="76" y="12" width="18" height="14" rx="4" fill="#87CEEB" stroke="#1565C0" stroke-width="1.5"/>
      <circle cx="20" cy="46" r="9" fill="#222" stroke="#555" stroke-width="2"/>
      <circle cx="20" cy="46" r="4" fill="#888"/>
      <circle cx="90" cy="46" r="9" fill="#222" stroke="#555" stroke-width="2"/>
      <circle cx="90" cy="46" r="4" fill="#888"/>
      <circle cx="6" cy="30" r="5" fill="white" stroke="#aaa" stroke-width="1"/>
      <circle cx="104" cy="30" r="5" fill="#FF3B30" stroke="#900" stroke-width="1"/>
      <rect x="0" y="28" width="5" height="6" rx="2" fill="#FFD60A"/>
    </svg>`,

    beetle: `<svg width="90" height="56" viewBox="0 0 90 56">
      <ellipse cx="45" cy="30" rx="42" ry="22" fill="#FF3B30" stroke="#B00" stroke-width="2.5"/>
      <ellipse cx="45" cy="22" rx="30" ry="16" fill="#FF3B30" stroke="#B00" stroke-width="2"/>
      <rect x="18" y="18" width="20" height="12" rx="5" fill="#87CEEB" stroke="#1565C0" stroke-width="1.5"/>
      <rect x="52" y="18" width="20" height="12" rx="5" fill="#87CEEB" stroke="#1565C0" stroke-width="1.5"/>
      <circle cx="15" cy="44" r="9" fill="#222" stroke="#555" stroke-width="2"/>
      <circle cx="15" cy="44" r="4" fill="#888"/>
      <circle cx="75" cy="44" r="9" fill="#222" stroke="#555" stroke-width="2"/>
      <circle cx="75" cy="44" r="4" fill="#888"/>
      <ellipse cx="8" cy="30" rx="7" ry="5" fill="white" stroke="#ddd" stroke-width="1"/>
      <ellipse cx="82" cy="30" rx="7" ry="5" fill="#FF6B6B" stroke="#900" stroke-width="1"/>
      <rect x="40" y="8" width="4" height="6" rx="2" fill="#333"/>
    </svg>`,

    truck: `<svg width="100" height="56" viewBox="0 0 100 56">
      <rect x="2" y="10" width="62" height="35" rx="5" fill="#4FC3F7" stroke="#0288D1" stroke-width="2.5"/>
      <rect x="62" y="18" width="36" height="27" rx="4" fill="#B0BEC5" stroke="#78909C" stroke-width="2"/>
      <rect x="8" y="14" width="22" height="16" rx="5" fill="#87CEEB" stroke="#1565C0" stroke-width="1.5"/>
      <rect x="34" y="14" width="22" height="16" rx="5" fill="#87CEEB" stroke="#1565C0" stroke-width="1.5"/>
      <circle cx="18" cy="46" r="9" fill="#222" stroke="#555" stroke-width="2"/>
      <circle cx="18" cy="46" r="4" fill="#888"/>
      <circle cx="82" cy="46" r="9" fill="#222" stroke="#555" stroke-width="2"/>
      <circle cx="82" cy="46" r="4" fill="#888"/>
      <ellipse cx="5" cy="28" rx="6" ry="5" fill="white" stroke="#ddd" stroke-width="1"/>
      <ellipse cx="95" cy="28" rx="6" ry="5" fill="#FF3B30" stroke="#900" stroke-width="1"/>
    </svg>`
  };

  car.innerHTML = svgs[type];
  return car;
}

// ── TRAFFIC LIGHT CONTROL ─────────────────────────────────
function setTrafficLight(phase) {
  const lenses = {
    red:    ['tl-red-l','tl-red-r'],
    yellow: ['tl-yellow-l','tl-yellow-r'],
    green:  ['tl-green-l','tl-green-r']
  };
  const allIds = ['tl-red-l','tl-yellow-l','tl-green-l','tl-red-r','tl-yellow-r','tl-green-r'];
  allIds.forEach(id => {
    document.getElementById(id).className = 'tl-lens';
  });
  lenses[phase].forEach(id => {
    document.getElementById(id).className = `tl-lens active-${phase}`;
  });

  // Walk man
  const walkManColor = (phase === 'red') ? '#30D158' : '#CC2200';
  ['wm-head-l','wm-body-l','wm-la-l','wm-ra-l','wm-ll-l','wm-rl-l',
   'wm-head-r','wm-body-r','wm-la-r','wm-ra-r','wm-ll-r','wm-rl-r'].forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      el.setAttribute('fill', walkManColor);
      el.setAttribute('stroke', walkManColor);
    }
  });
}

// ── SPEECH BUBBLE ─────────────────────────────────────────
let speechTimeout;
function showSpeech(msg, duration=3000) {
  clearTimeout(speechTimeout);
  speech.textContent = msg;
  speech.classList.add('visible');
  if(duration > 0) {
    speechTimeout = setTimeout(() => speech.classList.remove('visible'), duration);
  }
}
function hideSpeech() {
  clearTimeout(speechTimeout);
  speech.classList.remove('visible');
}

// ── STAR BAR ──────────────────────────────────────────────
function renderStarBar() {
  const total = LEVELS[state.level].numCrossings;
  starBar.innerHTML = '';
  for(let i=0;i<total;i++){
    const sv = document.createElementNS('http://www.w3.org/2000/svg','svg');
    sv.setAttribute('width','30'); sv.setAttribute('height','30');
    sv.setAttribute('viewBox','0 0 100 100');
    sv.classList.add('star-slot');
    const filled = i < state.starsEarned;
    sv.innerHTML = `<polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="${filled?'#FFD700':'#555'}" stroke="${filled?'#FF9F0A':'#777'}" stroke-width="3"/>`;
    if(filled) sv.classList.add('earned');
    starBar.appendChild(sv);
  }
}

// ── CARS ──────────────────────────────────────────────────
const carTypes = ['bus','beetle','truck'];
function spawnCars() {
  // remove old
  document.querySelectorAll('.car').forEach(c => c.remove());
  state.carData = [];
  const n = LEVELS[state.level].cars;
  const wrapperW = wrapper.offsetWidth;

  for(let i=0;i<n;i++){
    const type = carTypes[i % 3];
    const carEl = makeCar(type, `car-${i}`);
    road.appendChild(carEl);
    const goRight = (i % 2 === 0);
    const startX  = goRight ? -130 - i*200 : wrapperW + 30 + i*180;
    const speed   = 1.2 + i * 0.4; // px/frame
    state.carData.push({ el:carEl, x:startX, goRight, speed, stopped:false, w:110 });
    carEl.style.left = startX + 'px';
  }
}

let lastStepTime = 0;
function updateCars(ts) {
  const wrapperW = wrapper.offsetWidth;
  const stopZone = { left: wrapperW/2 - 80, right: wrapperW/2 + 80 };

  state.carData.forEach(car => {
    const shouldStop = (state.phase === 'red') ||
                       (state.phase === 'yellow');
    const nearCrossing = (car.x + car.w/2 > stopZone.left - 60 && car.x + car.w/2 < stopZone.right + 60);

    if(shouldStop && nearCrossing) {
      car.stopped = true;
      if(!car._honked) { car._honked = true; playHonk(); }
    } else if(!nearCrossing) {
      car.stopped = false;
      car._honked = false;
    }

    if(!car.stopped) {
      car.x += car.goRight ? car.speed : -car.speed;
    }

    if(car.goRight && car.x > wrapperW + 10) car.x = -150;
    if(!car.goRight && car.x < -160) car.x = wrapperW + 10;

    car.el.style.left = car.x + 'px';
    car.el.style.transform = car.goRight ? 'translateY(-50%)' : 'translateY(-50%) scaleX(-1)';
  });

  // Walk step sound
  if(state.walking && ts - lastStepTime > 300) {
    lastStepTime = ts;
    playWalkStep();
  }
}

// ── TRAFFIC LIGHT CYCLE ───────────────────────────────────
function startLightCycle() {
  clearTimeout(state.phaseTimer);
  const lvl = LEVELS[state.level];

  function goRed() {
    state.phase = 'red';
    state.canWalk = true;
    setTrafficLight('red');
    walkBtn.disabled = false;
    playLightGreen(); // walk signal
    showSpeech('Green light for you! Cross now!', 3000);
    clearLookTimer();
    // Schedule look-left-right nudge after 4s
    state.lookTimer = setTimeout(() => {
      if(state.canWalk && !state.walking) {
        character.classList.remove('idle');
        character.classList.add('looking');
        showSpeech('Look left and right! Then walk!', 4000);
      }
    }, 4000);
    state.phaseTimer = setTimeout(goYellow, lvl.cycleTime);
  }

  function goYellow() {
    state.phase = 'yellow';
    state.canWalk = false;
    setTrafficLight('yellow');
    walkBtn.disabled = true;
    clearLookTimer();
    playLightYellow();
    showSpeech('Wait... getting ready!', lvl.yellowTime);
    if(!state.walking) {
      character.classList.remove('looking','walking');
      character.classList.add('idle');
    }
    state.phaseTimer = setTimeout(goGreen, lvl.yellowTime);
  }

  function goGreen() {
    state.phase = 'green';
    state.canWalk = false;
    setTrafficLight('green');
    walkBtn.disabled = true;
    clearLookTimer();
    showSpeech('Red light for you! Stay and wait!', lvl.cycleTime - lvl.yellowTime);
    if(!state.walking) {
      character.classList.remove('looking','walking');
      character.classList.add('idle');
    }
    state.phaseTimer = setTimeout(goRed, lvl.cycleTime - lvl.yellowTime);
  }

  goGreen(); // start with green (cars moving)
}

function clearLookTimer() {
  if(state.lookTimer) { clearTimeout(state.lookTimer); state.lookTimer = null; }
}

// ── CHARACTER POSITION ────────────────────────────────────
const BOTTOM_SW_TOP_PERCENT = 50;   // top of bottom sidewalk
const TOP_SW_TOP_PERCENT    = 20;   // top of top sidewalk (destination)

function setCharPosition(leftPx, topPx) {
  character.style.left = leftPx + 'px';
  character.style.top  = topPx + 'px';
}

function getWrapperDims() {
  return { w: wrapper.offsetWidth, h: wrapper.offsetHeight };
}

function snapToBottomSidewalk() {
  const { w, h } = getWrapperDims();
  const topPx = h * BOTTOM_SW_TOP_PERCENT / 100 + 4;
  const leftPx = w / 2 - 26;
  setCharPosition(leftPx, topPx);
  state.charTopPx  = topPx;
  state.charLeftPx = leftPx;
}

function snapToTopSidewalk() {
  const { w, h } = getWrapperDims();
  const topPx = h * TOP_SW_TOP_PERCENT / 100 + 4;
  const leftPx = w / 2 - 26;
  setCharPosition(leftPx, topPx);
  state.charTopPx  = topPx;
  state.charLeftPx = leftPx;
}

// ── CROSSING LOGIC ────────────────────────────────────────
let walkAnimId;

function startCrossing() {
  if(state.walking) return;
  if(!state.canWalk) {
    // Wrong time
    character.classList.remove('idle','looking');
    character.classList.add('shake-err');
    playWhoops();
    showSpeech('Not yet! Wait for the Red light!', 2500);
    setTimeout(() => {
      character.classList.remove('shake-err');
      character.classList.add('idle');
    }, 600);
    return;
  }

  state.walking = true;
  clearLookTimer();
  hideSpeech();
  character.classList.remove('idle','looking','shake-err');
  character.classList.add('walking');

  const { w, h } = getWrapperDims();
  const fromTop   = state.charTopPx;
  // determine direction based on position
  const goUp = fromTop > h * 0.5;
  const targetTop = goUp
    ? h * TOP_SW_TOP_PERCENT / 100 + 4
    : h * BOTTOM_SW_TOP_PERCENT / 100 + 4;

  const duration = 2200; // ms
  const startTime = performance.now();

  function animateWalk(ts) {
    const elapsed = ts - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = progress < 0.5 ? 2*progress*progress : -1+(4-2*progress)*progress;

    const currentTop = fromTop + (targetTop - fromTop) * eased;
    setCharPosition(state.charLeftPx, currentTop);

    if(progress < 1) {
      walkAnimId = requestAnimationFrame(animateWalk);
    } else {
      // Arrived!
      state.walking = false;
      character.classList.remove('walking');
      character.classList.add('celebrating');
      setTimeout(() => character.classList.remove('celebrating'), 1600);

      playCelebrate();
      showStarReward();
      state.starsEarned++;
      renderStarBar();

      setTimeout(() => {
        hideStarReward();
        state.crossingsLeft--;
        if(state.crossingsLeft <= 0) {
          setTimeout(showLevelComplete, 500);
        } else {
          // Reset for next crossing
          setTimeout(() => {
            character.classList.add('idle');
            showSpeech('Great job! Cross again!', 2000);
          }, 600);
        }
      }, 2000);
    }
  }
  walkAnimId = requestAnimationFrame(animateWalk);
}

function showStarReward() {
  starReward.classList.add('show');
}
function hideStarReward() {
  starReward.classList.remove('show');
}

// ── LEVEL COMPLETE ────────────────────────────────────────
function showLevelComplete() {
  clearTimeout(state.phaseTimer);
  clearLookTimer();
  cancelAnimationFrame(state.animFrame);
  cancelAnimationFrame(walkAnimId);
  state.paused = true;

  if(state.level < 3) {
    overlayTitle.textContent = 'Level ' + state.level + ' Complete!';
    overlayMsg.textContent   = 'Amazing crossing! Ready for more cars?';
    overlayBtn.textContent   = 'Next Level!';
  } else {
    overlayTitle.textContent = 'You Are a Safety Star!';
    overlayMsg.textContent   = 'You crossed safely every time! Great road sense!';
    overlayBtn.textContent   = 'Play Again!';
  }
  overlay.classList.add('show');
  playCelebrate();
}

overlayBtn.addEventListener('click', () => {
  initAudio();
  overlay.classList.remove('show');
  if(state.level < 3) {
    state.level++;
  } else {
    state.level = 1;
  }
  startLevel(state.level);
});

// ── LEVEL START ───────────────────────────────────────────
function startLevel(lvl) {
  state.level          = lvl;
  state.starsEarned    = 0;
  state.crossingsLeft  = LEVELS[lvl].numCrossings;
  state.walking        = false;
  state.canWalk        = false;
  state.paused         = false;
  state.phase          = 'green';

  levelBadge.textContent = 'Level ' + lvl;
  renderStarBar();
  hideStarReward();
  hideSpeech();

  cancelAnimationFrame(state.animFrame);
  cancelAnimationFrame(walkAnimId);
  clearLookTimer();
  clearTimeout(state.phaseTimer);

  // Reset character
  character.className = 'idle';
  snapToBottomSidewalk();

  // Spawn cars
  spawnCars();

  // Level 3: bird distraction
  clearTimeout(state.distractionBirdTimer);
  if(lvl === 3) {
    function triggerBird() {
      if(state.paused) return;
      bird.classList.remove('flying');
      void bird.offsetWidth; // reflow
      bird.classList.add('flying');
      showSpeech('Ooh! A bird! But keep watching the light!', 3000);
      state.distractionBirdTimer = setTimeout(triggerBird, 12000);
    }
    state.distractionBirdTimer = setTimeout(triggerBird, 4000);
  } else {
    bird.classList.remove('flying');
  }

  // Start traffic light
  setTrafficLight('green');
  startLightCycle();

  // Main game loop
  function gameLoop(ts) {
    if(!state.paused) {
      updateCars(ts);
    }
    state.animFrame = requestAnimationFrame(gameLoop);
  }
  state.animFrame = requestAnimationFrame(gameLoop);

  showSpeech('Wait for the Red light for cars!', 3000);
}

// ── WALK BUTTON ───────────────────────────────────────────
walkBtn.addEventListener('click', () => {
  initAudio();
  startCrossing();
});

// Touch support
walkBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  initAudio();
  startCrossing();
}, { passive: false });

// ── INIT ──────────────────────────────────────────────────
window.addEventListener('load', () => {
  // small delay for fonts
  setTimeout(() => {
    snapToBottomSidewalk();
    startLevel(1);
  }, 400);
});

window.addEventListener('resize', () => {
  if(!state.walking) snapToBottomSidewalk();
});


