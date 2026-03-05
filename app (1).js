// ─── Persistence ──────────────────────────────────────────────────────────────
const DB_KEY = 'nutripro_v1';

function saveState() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify({
      meals:   S.meals,
      weights: S.weights,
      goals:   S.goals,
      water:   S.water,
      profile: S.profile,
      savedDate: todayStr(),
    }));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);

    // Restore persistent data
    if (d.weights && d.weights.length) S.weights = d.weights;
    if (d.goals)   S.goals   = d.goals;
    if (d.profile) S.profile = d.profile;

    // Reset meals and water if it's a new day
    if (d.savedDate === todayStr()) {
      if (d.meals)  S.meals  = d.meals;
      if (d.water != null) S.water = d.water;
    }
    // else: new day → meals and water start fresh (already [] and 0)
  } catch(e) {}
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "2025-01-15"
}

// ─── State ────────────────────────────────────────────────────────────────────
const S = {
  meals:   [],
  weights: [82, 81.8, 81.6, 81.4, 81.3, 81.1, 81],
  goals:   { cal: 0, prot: 0, agua: 0 },
  profile: { peso: '', altura: '', idade: '', sexo: 'm' },
  water:   0,
  chart:   null,
  tab:     'home',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
const fmt = (n, u='') => `${Math.round(n)}${u}`;
const pct = (v, t) => t > 0 ? Math.min(Math.round(v / t * 100), 100) : 0;

function totals() {
  return S.meals.reduce(
    (a, m) => ({ cal: a.cal+m.cal, prot: a.prot+m.prot, carb: a.carb+m.carb, fat: a.fat+m.fat }),
    { cal: 0, prot: 0, carb: 0, fat: 0 }
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function goTo(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const screen = $(`screen-${tab}`);
  const tabBtn = $(`tab-${tab}`);
  if (screen) screen.classList.add('active');
  if (tabBtn) tabBtn.classList.add('active');
  const sa = screen && screen.querySelector('.scroll-area');
  if (sa) sa.scrollTop = 0;
  S.tab = tab;

  // Init chart lazily when evolucao tab is first opened
  if (tab === 'evolucao' && !S.chart && window._chartReady) {
    initChart();
  }
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Bom dia 👋' : h < 18 ? 'Boa tarde 👋' : 'Boa noite 👋';
  const d = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  setText('greeting', `${g} · ${d}`);
  setText('topbar-meta', new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'short' }));
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function calcular() {
  const peso   = parseFloat($('peso').value);
  const altura = parseFloat($('altura').value);
  const idade  = parseFloat($('idade').value);
  const sexo   = $('sexo').value;

  if (!peso || !altura || !idade) { toast('Preencha todos os campos.', 'err'); return; }

  const tmb = sexo === 'm'
    ? 10*peso + 6.25*altura - 5*idade + 5
    : 10*peso + 6.25*altura - 5*idade - 161;

  const cal  = tmb * 1.4;
  const prot = peso * 2;
  const agua = peso * 35;

  S.goals   = { cal, prot, agua };
  S.profile = { peso, altura, idade, sexo };

  setText('r-tmb',  fmt(tmb,  ' kcal'));
  setText('r-cal',  fmt(cal,  ' kcal'));
  setText('r-prot', fmt(prot, ' g'));
  setText('r-agua', fmt(agua, ' ml'));

  const rb = $('results-block');
  if (rb) rb.classList.remove('hidden');

  saveState();
  refreshAll();
  toast('Perfil calculado!', 'ok');
}

// ─── Add Food ─────────────────────────────────────────────────────────────────
function addFood() {
  const idx  = parseInt($('foodSelect').value);
  const food = (typeof foods !== 'undefined') ? foods[idx] : null;
  const g    = parseFloat($('gramas').value);

  if (isNaN(idx) || !food || !g || g <= 0) {
    toast('Selecione o alimento e a quantidade.', 'err'); return;
  }

  const f = g / 100;
  S.meals.push({
    id: Date.now(), nome: food.nome, cat: food.cat || '', g,
    cal:  food.cal  * f,
    prot: food.prot * f,
    carb: food.carb * f,
    fat:  food.fat  * f,
  });

  $('gramas').value = '';
  saveState();
  refreshAll();
  toast(`${food.nome} adicionado!`, 'ok');
}

function removeFood(id) {
  S.meals = S.meals.filter(m => m.id !== id);
  saveState();
  refreshAll();
}

// ─── Render meals ─────────────────────────────────────────────────────────────
function renderMeals() {
  // Full list
  const ul = $('meal-list');
  if (!ul) return;
  ul.innerHTML = '';

  if (!S.meals.length) {
    ul.innerHTML = '<li class="meal-empty">Nenhum alimento adicionado ainda.</li>';
  } else {
    S.meals.forEach(m => {
      const li = document.createElement('li');
      li.className = 'meal-item';
      li.innerHTML = `
        <div class="mi-body">
          <span class="mi-cat">${m.cat}</span>
          <div class="mi-name">${m.nome}</div>
          <div class="mi-meta">${m.g}g · ${fmt(m.cal)} kcal · P ${fmt(m.prot)}g · C ${fmt(m.carb)}g · G ${fmt(m.fat)}g</div>
        </div>
        <button class="rm-btn" onclick="removeFood(${m.id})">✕</button>`;
      ul.appendChild(li);
    });
  }

  // Home mini list
  const ulH = $('home-meals');
  if (!ulH) return;
  ulH.innerHTML = '';

  if (!S.meals.length) {
    ulH.innerHTML = '<div class="home-empty">Nenhum alimento registrado hoje.</div>';
  } else {
    [...S.meals].reverse().slice(0, 4).forEach(m => {
      const li = document.createElement('li');
      li.className = 'home-meal-item';
      li.innerHTML = `<span class="hmi-name">${m.nome}</span><span class="hmi-cal">${fmt(m.cal)} kcal</span>`;
      ulH.appendChild(li);
    });
    if (S.meals.length > 4) {
      const li = document.createElement('li');
      li.className = 'home-meal-item';
      li.innerHTML = `<span class="hmi-name" style="color:var(--text3)">+${S.meals.length - 4} mais…</span>`;
      ulH.appendChild(li);
    }
  }
}

// ─── Render macros ────────────────────────────────────────────────────────────
function renderMacros() {
  const t = totals();
  const { cal: gCal } = S.goals;

  // Refeições page totals
  setText('tb-cal',  fmt(t.cal));
  setText('tb-prot', `P ${fmt(t.prot)}g`);
  setText('tb-carb', `C ${fmt(t.carb)}g`);
  setText('tb-fat',  `G ${fmt(t.fat)}g`);

  const total = t.prot + t.carb + t.fat;
  const setW = (id, v) => { const el = $(id); if (el) el.style.width = v + '%'; };
  setW('seg-p', pct(t.prot, total));
  setW('seg-c', pct(t.carb, total));
  setW('seg-f', pct(t.fat,  total));

  // Home pills
  setText('hp-prot', fmt(t.prot, 'g'));
  setText('hp-carb', fmt(t.carb, 'g'));
  setText('hp-fat',  fmt(t.fat,  'g'));

  // Home ring
  setText('home-cal', fmt(t.cal));
  const p = pct(t.cal, gCal);
  setText('home-pct', gCal ? `de ${fmt(gCal)} kcal` : '— defina o perfil');

  const ring = $('cr-fill');
  if (ring) {
    const circ = 527.8;
    ring.style.strokeDashoffset = circ - circ * p / 100;
    ring.style.stroke = p >= 100 ? '#f5c542' : 'var(--green)';
  }

  // Topbar
  if (S.meals.length > 0) setText('topbar-meta', `${fmt(t.cal)} kcal hoje`);
}

// ─── Water ────────────────────────────────────────────────────────────────────
function addWaterAmount(ml) {
  S.water = Math.max(0, S.water + ml);
  saveState();
  renderWater();
}

function setWaterManual() {
  const v = parseFloat($('water-input').value);
  if (!isNaN(v) && v >= 0) {
    S.water = v;
    $('water-input').value = '';
    saveState();
    renderWater();
    toast(`Água: ${fmt(v)} ml`, 'ok');
  }
}

function renderWater() {
  const goal = S.goals.agua || 2500;
  const p    = pct(S.water, goal);
  const color = p >= 100 ? 'var(--green)' : 'var(--water)';

  // Water page
  setText('wh-drunk', fmt(S.water));
  setText('wh-goal',  fmt(goal));
  setText('wh-pct',   p + '%');
  const whBar = $('wh-bar');
  if (whBar) { whBar.style.width = p + '%'; whBar.style.background = color; }

  // Home strip
  setText('ws-drunk', fmt(S.water));
  setText('ws-meta', `Meta: ${fmt(goal)} ml`);
  const wsBar = $('ws-bar');
  if (wsBar) { wsBar.style.width = p + '%'; wsBar.style.background = color; }
}

// ─── Refresh all ──────────────────────────────────────────────────────────────
function refreshAll() {
  renderMeals();
  renderMacros();
  renderWater();
}

// ─── Food select ──────────────────────────────────────────────────────────────
function initFoodSelect() {
  if (typeof foods === 'undefined' || !foods.length) return;

  const sel    = $('foodSelect');
  const search = $('foodSearch');
  const cat    = $('catFilter');
  if (!sel || !search || !cat) return;

  // Populate categories
  [...new Set(foods.map(f => f.cat))].filter(Boolean).forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    cat.appendChild(o);
  });

  const fill = () => {
    const q = search.value.toLowerCase().trim();
    const c = cat.value;
    sel.innerHTML = '';

    const list = foods
      .map((f, i) => ({...f, i}))
      .filter(f => (!c || f.cat === c) && (!q || f.nome.toLowerCase().includes(q)));

    if (!list.length) {
      const o = document.createElement('option');
      o.textContent = 'Sem resultados'; o.disabled = true;
      sel.appendChild(o); return;
    }

    list.forEach(({ nome, cal, prot, i }) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = `${nome}  ·  ${cal} kcal · P${prot}g`;
      sel.appendChild(o);
    });
  };

  fill();
  search.addEventListener('input', fill);
  cat.addEventListener('change', fill);
}

// ─── Chart (lazy — only when tab is opened) ────────────────────────────────────
function initChart() {
  const canvas = $('weightChart');
  if (!canvas || S.chart || typeof Chart === 'undefined') return;

  try {
    const ctx  = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(29,219,139,.18)');
    grad.addColorStop(1, 'rgba(29,219,139,0)');

    S.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels(),
        datasets: [{
          data: [...S.weights],
          borderColor: '#1ddb8b',
          backgroundColor: grad,
          borderWidth: 2,
          pointBackgroundColor: '#1ddb8b',
          pointBorderColor: '#0c0c0e',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: .42,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1c1c20',
            titleColor: '#f0f0f4',
            bodyColor: '#1ddb8b',
            padding: 10,
            callbacks: { label: c => ` ${c.parsed.y} kg` },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#44445a', font: { family: 'Space Mono', size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#44445a', font: { family: 'Space Mono', size: 10 }, callback: v => `${v}kg` } },
        },
      },
    });
  } catch(e) {
    console.warn('Chart init failed:', e);
  }
}

function chartLabels() {
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const t = new Date().getDay();
  return S.weights.map((_, i) => days[(t - S.weights.length + 1 + i + 7) % 7]);
}

function addWeight() {
  const v = parseFloat($('newWeight').value);
  if (!v || v < 20 || v > 300) { toast('Peso inválido.', 'err'); return; }

  S.weights.push(v);
  if (S.weights.length > 10) S.weights.shift();
  saveState();

  if (S.chart) {
    S.chart.data.datasets[0].data = [...S.weights];
    S.chart.data.labels = chartLabels();
    S.chart.update('active');
  }

  $('newWeight').value = '';
  toast(`${v} kg registrado!`, 'ok');
}

// ─── Scanner ──────────────────────────────────────────────────────────────────
function startScanner() {
  if (typeof Quagga === 'undefined') {
    toast('Scanner indisponível neste dispositivo.', 'err'); return;
  }
  $('scanner-overlay').classList.remove('hidden');
  Quagga.init({
    inputStream: {
      name: 'Live', type: 'LiveStream',
      target: $('scanner'),
      constraints: { facingMode: 'environment' },
    },
    decoder: { readers: ['ean_reader', 'ean_8_reader'] },
  }, err => {
    if (!err) {
      Quagga.start();
    } else {
      toast('Câmera não autorizada.', 'err');
      $('scanner-overlay').classList.add('hidden');
    }
  });

  Quagga.onDetected(d => {
    toast(`Código: ${d.codeResult.code}`, 'ok');
    Quagga.stop();
    $('scanner-overlay').classList.add('hidden');
  });
}

function stopScanner() {
  try { if (typeof Quagga !== 'undefined') Quagga.stop(); } catch(e) {}
  $('scanner-overlay').classList.add('hidden');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type='ok') {
  const wrap = $('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => {
    el.classList.remove('on');
    setTimeout(() => el.remove(), 280);
  }, 2800);
}

// ─── PWA ─────────────────────────────────────────────────────────────────────
let _prompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); _prompt = e;
  setTimeout(() => { if (_prompt) { const b = $('install-banner'); if(b) b.classList.remove('hidden'); } }, 3000);
});

async function installApp() {
  dismissInstall();
  if (!_prompt) return;
  _prompt.prompt();
  const { outcome } = await _prompt.userChoice;
  if (outcome === 'accepted') toast('App instalado! 🎉', 'ok');
  _prompt = null;
}

function dismissInstall() {
  const b = $('install-banner');
  if (b) b.classList.add('hidden');
}

// ─── Service Worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
window._appReady = false;

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setGreeting();
  initFoodSelect();
  restoreProfile();
  refreshAll();
  window._appReady = true;
  if (window._chartReady && S.tab === 'evolucao') initChart();
});

function restoreProfile() {
  const p = S.profile;
  if (!p || !p.peso) return;

  // Restore form fields
  const set = (id, v) => { const el = $(id); if (el) el.value = v; };
  set('peso',   p.peso);
  set('altura', p.altura);
  set('idade',  p.idade);
  set('sexo',   p.sexo);

  // Restore results display
  const { cal, prot, agua } = S.goals;
  if (!cal) return;

  const tmb = p.sexo === 'm'
    ? 10*p.peso + 6.25*p.altura - 5*p.idade + 5
    : 10*p.peso + 6.25*p.altura - 5*p.idade - 161;

  setText('r-tmb',  fmt(tmb,  ' kcal'));
  setText('r-cal',  fmt(cal,  ' kcal'));
  setText('r-prot', fmt(prot, ' g'));
  setText('r-agua', fmt(agua, ' ml'));

  const rb = $('results-block');
  if (rb) rb.classList.remove('hidden');
}
