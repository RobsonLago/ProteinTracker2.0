// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  meals: [],
  weightLog: [82, 81.8, 81.6, 81.4, 81.3, 81.1, 81],
  goals: { cal: 0, prot: 0, agua: 0 },
  waterConsumed: 0,
  chart: null,
  activeTab: 'home',
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const fmt = (n, u='') => `${Math.round(n)}${u}`;
const pct = (v, t) => t > 0 ? Math.min(Math.round((v/t)*100), 100) : 0;

function totals() {
  return state.meals.reduce(
    (a, m) => ({ cal:a.cal+m.cal, prot:a.prot+m.prot, carb:a.carb+m.carb, fat:a.fat+m.fat }),
    { cal:0, prot:0, carb:0, fat:0 }
  );
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────
function goTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  $(`page-${tab}`).classList.add('active');
  $(`nav-${tab}`).classList.add('active');
  state.activeTab = tab;
  // scroll to top on tab switch
  $(`page-${tab}`).querySelector('.page-scroll').scrollTop = 0;
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function calcular() {
  const peso   = parseFloat($('peso').value);
  const altura = parseFloat($('altura').value);
  const idade  = parseFloat($('idade').value);
  const sexo   = $('sexo').value;

  if (!peso || !altura || !idade) { showToast('Preencha todos os campos.', 'error'); return; }

  const tmb = sexo === 'm'
    ? 10*peso + 6.25*altura - 5*idade + 5
    : 10*peso + 6.25*altura - 5*idade - 161;

  const calorias = tmb * 1.4;
  const proteina = peso * 2;
  const agua     = peso * 35;

  state.goals = { cal: calorias, prot: proteina, agua };

  $('val-tmb').textContent  = fmt(tmb,      ' kcal');
  $('val-cal').textContent  = fmt(calorias, ' kcal');
  $('val-prot').textContent = fmt(proteina, ' g');
  $('val-agua').textContent = fmt(agua,     ' ml');

  $('results-card').classList.remove('hidden');
  $('hero-meta').textContent = fmt(calorias, ' kcal');
  $('water-meta-goal').textContent = fmt(agua);
  $('hi-goal').textContent = fmt(agua);

  updateAll();
  showToast('Perfil calculado!', 'success');
}

// ─── Food Log ─────────────────────────────────────────────────────────────────
function addFood() {
  const idx  = parseInt($('foodSelect').value);
  const food = foods[idx];
  const g    = parseFloat($('gramas').value);

  if (isNaN(idx) || !food || !g || g <= 0) {
    showToast('Selecione um alimento e a quantidade.', 'error'); return;
  }

  const f = g / 100;
  state.meals.push({
    id: Date.now(), nome: food.nome, cat: food.cat, g,
    cal:  food.cal*f, prot: food.prot*f,
    carb: food.carb*f, fat:  food.fat*f,
  });

  $('gramas').value = '';
  updateAll();
  showToast(`${food.nome} adicionado!`, 'success');
}

function removeFood(id) {
  state.meals = state.meals.filter(m => m.id !== id);
  updateAll();
}

function renderMealList() {
  // Full list (refeicoes page)
  const ul = $('lista');
  ul.innerHTML = '';

  if (!state.meals.length) {
    ul.innerHTML = `<li class="empty-state"><span>🍽</span><p>Nenhum alimento ainda.</p></li>`;
  } else {
    state.meals.forEach(m => {
      const li = document.createElement('li');
      li.className = 'meal-item';
      li.innerHTML = `
        <div class="meal-left">
          <span class="meal-cat">${m.cat}</span>
          <span class="meal-name">${m.nome}</span>
          <span class="meal-meta">${m.g}g · ${fmt(m.cal)} kcal · P${fmt(m.prot)}g · C${fmt(m.carb)}g · G${fmt(m.fat)}g</span>
        </div>
        <button class="btn-remove" onclick="removeFood(${m.id})">✕</button>`;
      ul.appendChild(li);
    });
  }

  // Mini list (home page — last 3)
  const ulHome = $('lista-home');
  ulHome.innerHTML = '';
  if (!state.meals.length) {
    ulHome.innerHTML = `<li class="empty-mini">Nenhum alimento registrado hoje.</li>`;
  } else {
    [...state.meals].reverse().slice(0,3).forEach(m => {
      const li = document.createElement('li');
      li.className = 'meal-mini';
      li.innerHTML = `
        <span class="meal-mini-name">${m.nome}</span>
        <span class="meal-mini-cal">${fmt(m.cal)} kcal</span>`;
      ulHome.appendChild(li);
    });
    if (state.meals.length > 3) {
      const li = document.createElement('li');
      li.className = 'meal-mini more';
      li.textContent = `+${state.meals.length - 3} mais…`;
      ulHome.appendChild(li);
    }
  }
}

function updateMacros() {
  const t = totals();
  $('totalCal').textContent  = fmt(t.cal,  ' kcal');
  $('totalProt').textContent = fmt(t.prot, 'g');
  $('totalCarb').textContent = fmt(t.carb, 'g');
  $('totalFat').textContent  = fmt(t.fat,  'g');

  const totalG = t.prot + t.carb + t.fat;
  const pp = pct(t.prot, totalG), pc = pct(t.carb, totalG), pf = pct(t.fat, totalG);

  $('bar-prot').style.width = pp + '%';
  $('bar-carb').style.width = pc + '%';
  $('bar-fat').style.width  = pf + '%';
  $('lbl-prot').textContent = pp + '%';
  $('lbl-carb').textContent = pc + '%';
  $('lbl-fat').textContent  = pf + '%';

  // Home macro cards
  const { prot:gProt } = state.goals;
  $('mq-prot').textContent = fmt(t.prot, 'g');
  $('mq-carb').textContent = fmt(t.carb, 'g');
  $('mq-fat').textContent  = fmt(t.fat,  'g');
  $('mq-prot-bar').style.width = pct(t.prot, gProt||100) + '%';
  $('mq-carb-bar').style.width = Math.min(pct(t.carb, (state.goals.cal||2000)*0.005), 100) + '%';
  $('mq-fat-bar').style.width  = Math.min(pct(t.fat,  (state.goals.cal||2000)*0.003), 100) + '%';

  // Header summary
  $('hs-cal').textContent  = fmt(t.cal, ' kcal');
  $('hs-prot').textContent = fmt(t.prot, 'g P');
  if (state.meals.length) $('header-summary').classList.remove('hidden');
}

function updateHeroDashboard() {
  const t   = totals();
  const cal = state.goals.cal || 0;

  $('hero-cal').innerHTML = `${fmt(t.cal)} <span>kcal</span>`;

  const p = pct(t.cal, cal);
  $('ring-pct').textContent = p + '%';

  // SVG ring animation: circumference = 2π×52 ≈ 326.7
  const circ  = 326.7;
  const offset = circ - (circ * p / 100);
  $('ring-cal').style.strokeDashoffset = offset;
  $('ring-cal').style.stroke = p >= 100 ? '#f97316' : '#22d3a0';
}

// ─── Water ────────────────────────────────────────────────────────────────────
function addWaterAmount(ml) {
  state.waterConsumed = Math.max(0, state.waterConsumed + ml);
  renderWater();
}

function setWaterManual() {
  const val = parseFloat($('water-input').value);
  if (!isNaN(val) && val >= 0) {
    state.waterConsumed = val;
    $('water-input').value = '';
    renderWater();
    showToast(`Água: ${fmt(val)} ml`, 'success');
  }
}

function renderWater() {
  const goal  = state.goals.agua || 2500;
  const drunk = state.waterConsumed;
  const p     = pct(drunk, goal);
  const color = p >= 100 ? '#22d3a0' : '#38bdf8';

  // Evolução page
  $('water-consumed').textContent  = fmt(drunk);
  $('water-meta-goal').textContent = fmt(goal);
  $('water-pct').textContent       = p + '%';
  $('water-prog-bar').style.width  = p + '%';
  $('water-prog-bar').style.background = color;

  // Home card
  $('hi-water').textContent = fmt(drunk);
  $('hi-goal').textContent  = fmt(goal) + ' ml';
  $('hi-pct').textContent   = p + '%';
  $('hi-bar').style.width   = p + '%';
  $('hi-bar').style.background = color;
}

// ─── All update ───────────────────────────────────────────────────────────────
function updateAll() {
  renderMealList();
  updateMacros();
  updateHeroDashboard();
  renderWater();
}

// ─── Food Select ──────────────────────────────────────────────────────────────
function carregarAlimentos() {
  const select = $('foodSelect');
  const search = $('foodSearch');
  const cat    = $('catFilter');

  const cats = [...new Set(foods.map(f => f.cat))];
  cats.forEach(c => {
    const op = document.createElement('option');
    op.value = c; op.textContent = c;
    cat.appendChild(op);
  });

  const populate = () => {
    const q  = search.value.toLowerCase().trim();
    const cv = cat.value;
    select.innerHTML = '';

    const filtered = foods
      .map((f,i) => ({...f, i}))
      .filter(f => (!cv || f.cat === cv) && (!q || f.nome.toLowerCase().includes(q)));

    if (!filtered.length) {
      const op = document.createElement('option');
      op.textContent = 'Nenhum resultado'; op.disabled = true;
      select.appendChild(op); return;
    }
    filtered.forEach(({nome, cal, prot, i}) => {
      const op = document.createElement('option');
      op.value = i;
      op.textContent = `${nome}  (${cal} kcal · P${prot}g /100g)`;
      select.appendChild(op);
    });
  };

  populate();
  search.addEventListener('input', populate);
  cat.addEventListener('change', populate);
}

// ─── Weight Chart ─────────────────────────────────────────────────────────────
function criarGrafico() {
  const ctx  = $('pesoChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, 'rgba(34,211,160,0.22)');
  grad.addColorStop(1, 'rgba(34,211,160,0)');

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: buildLabels(),
      datasets: [{
        label: 'Peso (kg)',
        data: [...state.weightLog],
        borderColor: '#22d3a0',
        backgroundColor: grad,
        borderWidth: 2,
        pointBackgroundColor: '#22d3a0',
        pointBorderColor: '#09090f',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.45,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a2233',
          titleColor: '#e2e8f0',
          bodyColor: '#22d3a0',
          padding: 10,
          callbacks: { label: c => ` ${c.parsed.y} kg` },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#525878', font: { family: 'DM Mono' } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#525878', font: { family: 'DM Mono' }, callback: v => `${v}kg` } },
      },
    },
  });
}

function buildLabels() {
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const today = new Date().getDay();
  return state.weightLog.map((_,i) => {
    const d = (today - state.weightLog.length + 1 + i + 7) % 7;
    return days[d];
  });
}

function addWeight() {
  const val = parseFloat($('newWeight').value);
  if (!val || val < 20 || val > 300) { showToast('Peso inválido.', 'error'); return; }
  state.weightLog.push(val);
  if (state.weightLog.length > 10) state.weightLog.shift();
  state.chart.data.datasets[0].data   = [...state.weightLog];
  state.chart.data.labels             = buildLabels();
  state.chart.update('active');
  $('newWeight').value = '';
  showToast(`${val} kg registrado!`, 'success');
}

// ─── Scanner ──────────────────────────────────────────────────────────────────
function startScanner() {
  if (typeof Quagga === 'undefined') { showToast('Scanner indisponível.', 'error'); return; }
  $('scanner-overlay').classList.remove('hidden');
  Quagga.init({
    inputStream: { name:'Live', type:'LiveStream', target:$('scanner'), constraints:{facingMode:'environment'} },
    decoder: { readers: ['ean_reader','ean_8_reader'] },
  }, err => {
    if (!err) Quagga.start();
    else { showToast('Câmera não autorizada.', 'error'); $('scanner-overlay').classList.add('hidden'); }
  });
  Quagga.onDetected(data => {
    showToast(`Código: ${data.codeResult.code}`, 'success');
    Quagga.stop();
    $('scanner-overlay').classList.add('hidden');
  });
}

function stopScanner() {
  if (typeof Quagga !== 'undefined') Quagga.stop();
  $('scanner-overlay').classList.add('hidden');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type='info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $('toast-container').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 2800);
}

// ─── PWA Install ─────────────────────────────────────────────────────────────
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install banner after 2s if not already installed
  setTimeout(() => {
    if (deferredPrompt) showInstallBanner();
  }, 2000);
});

function showInstallBanner() {
  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.innerHTML = `
    <div class="install-text">
      <strong>Instalar NutriPro</strong>
      <span>Acesse direto da tela inicial</span>
    </div>
    <button class="btn-install" onclick="installApp()">Instalar</button>
    <button class="btn-dismiss" onclick="this.closest('.install-banner').remove()">✕</button>`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('show'));
}

async function installApp() {
  document.querySelector('.install-banner')?.remove();
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') showToast('App instalado! 🎉', 'success');
  deferredPrompt = null;
}

// ─── Service Worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Header date
  const d = new Date();
  $('header-date').textContent = d.toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' });

  carregarAlimentos();
  criarGrafico();
  updateAll();
});
