// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  meals: [],
  weightLog: [82, 81.8, 81.6, 81.4, 81.3, 81.1, 81],
  goals: { cal: 0, prot: 0, agua: 0 },
  waterConsumed: 0,
  chart: null,
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const fmt  = (n, u = "") => `${Math.round(n)}${u}`;
const fmtD = (n, u = "") => `${parseFloat(n).toFixed(1)}${u}`;
const pct  = (val, total) => total > 0 ? Math.min(Math.round((val / total) * 100), 100) : 0;

function totals() {
  return state.meals.reduce(
    (a, m) => ({ cal: a.cal+m.cal, prot: a.prot+m.prot, carb: a.carb+m.carb, fat: a.fat+m.fat }),
    { cal: 0, prot: 0, carb: 0, fat: 0 }
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function calcular() {
  const peso   = parseFloat($("peso").value);
  const altura = parseFloat($("altura").value);
  const idade  = parseFloat($("idade").value);
  const sexo   = $("sexo").value;

  if (!peso || !altura || !idade) { showToast("Preencha todos os campos.", "error"); return; }

  const tmb = sexo === "m"
    ? 10*peso + 6.25*altura - 5*idade + 5
    : 10*peso + 6.25*altura - 5*idade - 161;

  const calorias = tmb * 1.4;
  const proteina = peso * 2;
  const agua     = peso * 35;

  state.goals = { cal: calorias, prot: proteina, agua };

  $("val-tmb").textContent  = fmt(tmb,      " kcal");
  $("val-cal").textContent  = fmt(calorias, " kcal");
  $("val-prot").textContent = fmt(proteina, " g");
  $("val-agua").textContent = fmt(agua,     " ml");

  $("results-card").classList.remove("hidden");
  $("water-meta-goal").textContent = fmt(agua, " ml");
  $("water-input").value = "";
  state.waterConsumed = 0;
  renderWater();
  updateProgress();
  showToast("Perfil calculado!", "success");
}

// ─── Food Log ─────────────────────────────────────────────────────────────────
function addFood() {
  const select = $("foodSelect");
  const idx    = parseInt(select.value);
  const food   = foods[idx];
  const g      = parseFloat($("gramas").value);

  if (isNaN(idx) || !food || !g || g <= 0) { showToast("Selecione um alimento e a quantidade.", "error"); return; }

  const f = g / 100;
  state.meals.push({ id: Date.now(), nome: food.nome, cat: food.cat, g,
    cal: food.cal*f, prot: food.prot*f, carb: food.carb*f, fat: food.fat*f });

  $("gramas").value = "";
  renderMealList();
  updateMacroPanel();
  updateProgress();
  showToast(`${food.nome} adicionado!`, "success");
}

function removeFood(id) {
  state.meals = state.meals.filter(m => m.id !== id);
  renderMealList();
  updateMacroPanel();
  updateProgress();
}

function renderMealList() {
  const ul = $("lista");
  ul.innerHTML = "";

  if (!state.meals.length) {
    ul.innerHTML = `<li class="empty-state"><span>🍽</span><p>Nenhum alimento adicionado ainda.</p></li>`;
    return;
  }

  state.meals.forEach(m => {
    const li = document.createElement("li");
    li.className = "meal-item";
    li.innerHTML = `
      <div class="meal-left">
        <span class="meal-cat">${m.cat}</span>
        <span class="meal-name">${m.nome}</span>
        <span class="meal-meta">${m.g}g &nbsp;·&nbsp; ${fmt(m.cal)} kcal &nbsp;·&nbsp; P ${fmt(m.prot)}g &nbsp;·&nbsp; C ${fmt(m.carb)}g &nbsp;·&nbsp; G ${fmt(m.fat)}g</span>
      </div>
      <button class="btn-remove" onclick="removeFood(${m.id})">✕</button>`;
    ul.appendChild(li);
  });
}

function updateMacroPanel() {
  const t = totals();
  $("totalCal").textContent  = fmt(t.cal,  " kcal");
  $("totalProt").textContent = fmt(t.prot, " g");
  $("totalCarb").textContent = fmt(t.carb, " g");
  $("totalFat").textContent  = fmt(t.fat,  " g");

  const total = t.prot + t.carb + t.fat;
  $("bar-prot").style.width = pct(t.prot, total) + "%";
  $("bar-carb").style.width = pct(t.carb, total) + "%";
  $("bar-fat").style.width  = pct(t.fat,  total) + "%";
  $("lbl-prot").textContent = pct(t.prot, total) + "%";
  $("lbl-carb").textContent = pct(t.carb, total) + "%";
  $("lbl-fat").textContent  = pct(t.fat,  total) + "%";
}

function updateProgress() {
  const t = totals();
  const { cal, prot } = state.goals;
  if (!cal) return;

  const pCal  = pct(t.cal,  cal);
  const pProt = pct(t.prot, prot);

  $("prog-cal-bar").style.width  = pCal + "%";
  $("prog-prot-bar").style.width = pProt + "%";
  $("prog-cal-label").textContent  = `${fmt(t.cal)} / ${fmt(cal)} kcal (${pCal}%)`;
  $("prog-prot-label").textContent = `${fmt(t.prot)} / ${fmt(prot)} g (${pProt}%)`;

  // color shift when over goal
  $("prog-cal-bar").style.background  = pCal  >= 100 ? "var(--warn)"  : "";
  $("prog-prot-bar").style.background = pProt >= 100 ? "var(--accent)" : "";
}

// ─── Food Select + Search + Category ─────────────────────────────────────────
function carregarAlimentos() {
  const select    = $("foodSelect");
  const search    = $("foodSearch");
  const catSelect = $("catFilter");

  // populate category dropdown
  const cats = [...new Set(foods.map(f => f.cat))];
  cats.forEach(c => {
    const op = document.createElement("option");
    op.value = c; op.textContent = c;
    catSelect.appendChild(op);
  });

  const populate = () => {
    const q   = search.value.toLowerCase().trim();
    const cat = catSelect.value;
    select.innerHTML = "";

    const filtered = foods
      .map((f, i) => ({ ...f, i }))
      .filter(f =>
        (!cat || f.cat === cat) &&
        (!q   || f.nome.toLowerCase().includes(q))
      );

    if (!filtered.length) {
      const op = document.createElement("option"); op.textContent = "Nenhum resultado"; op.disabled = true;
      select.appendChild(op); return;
    }

    filtered.forEach(({ nome, cal, prot, i }) => {
      const op = document.createElement("option");
      op.value = i;
      op.textContent = `${nome}  (${cal} kcal · P ${prot}g / 100g)`;
      select.appendChild(op);
    });
  };

  populate();
  search.addEventListener("input",    populate);
  catSelect.addEventListener("change", populate);
}

// ─── Water Tracker (editable) ─────────────────────────────────────────────────
function addWaterAmount(ml) {
  state.waterConsumed = Math.max(0, state.waterConsumed + ml);
  renderWater();
}

function setWaterManual() {
  const val = parseFloat($("water-input").value);
  if (!isNaN(val) && val >= 0) {
    state.waterConsumed = val;
    $("water-input").value = "";
    renderWater();
    showToast(`Água atualizada para ${fmt(val)} ml`, "success");
  }
}

function renderWater() {
  const goal  = state.goals.agua || 2500;
  const drunk = state.waterConsumed;
  const p     = pct(drunk, goal);

  $("water-consumed").textContent = fmt(drunk, " ml");
  $("water-pct").textContent = p + "%";
  $("water-prog-bar").style.width = p + "%";
  $("water-prog-bar").style.background = p >= 100 ? "var(--accent)" : "var(--water)";
}

// ─── Weight Chart ─────────────────────────────────────────────────────────────
function criarGrafico() {
  const ctx = $("pesoChart").getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 180);
  grad.addColorStop(0,   "rgba(52, 211, 153, 0.25)");
  grad.addColorStop(1,   "rgba(52, 211, 153, 0)");

  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: buildWeightLabels(),
      datasets: [{
        label: "Peso (kg)",
        data: [...state.weightLog],
        borderColor: "#34d399",
        backgroundColor: grad,
        borderWidth: 2,
        pointBackgroundColor: "#34d399",
        pointBorderColor: "#0d1117",
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
          backgroundColor: "#1a2233",
          titleColor: "#e2e8f0",
          bodyColor: "#34d399",
          padding: 10,
          callbacks: { label: ctx => ` ${ctx.parsed.y} kg` },
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#64748b", font: { family: "'DM Mono'" } } },
        y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#64748b", font: { family: "'DM Mono'" }, callback: v => `${v}kg` } },
      },
    },
  });
}

function buildWeightLabels() {
  const days = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const today = new Date().getDay();
  return state.weightLog.map((_, i) => {
    const d = (today - state.weightLog.length + 1 + i + 7) % 7;
    return days[d];
  });
}

function addWeight() {
  const val = parseFloat($("newWeight").value);
  if (!val || val < 20 || val > 300) { showToast("Informe um peso válido.", "error"); return; }

  state.weightLog.push(val);
  if (state.weightLog.length > 10) state.weightLog.shift();

  state.chart.data.datasets[0].data   = [...state.weightLog];
  state.chart.data.labels             = buildWeightLabels();
  state.chart.update("active");
  $("newWeight").value = "";
  showToast(`${val} kg registrado!`, "success");
}

// ─── Scanner ──────────────────────────────────────────────────────────────────
function startScanner() {
  if (typeof Quagga === "undefined") { showToast("Scanner não disponível.", "error"); return; }
  $("scanner-overlay").classList.remove("hidden");
  Quagga.init({
    inputStream: { name: "Live", type: "LiveStream", target: $("scanner"), constraints: { facingMode: "environment" } },
    decoder: { readers: ["ean_reader","ean_8_reader"] },
  }, err => {
    if (!err) Quagga.start();
    else { showToast("Câmera não autorizada.", "error"); $("scanner-overlay").classList.add("hidden"); }
  });
  Quagga.onDetected(data => {
    showToast(`Código: ${data.codeResult.code}`, "success");
    Quagga.stop();
    $("scanner-overlay").classList.add("hidden");
  });
}

function stopScanner() {
  if (typeof Quagga !== "undefined") Quagga.stop();
  $("scanner-overlay").classList.add("hidden");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "info") {
  const wrap = $("toast-container");
  const el   = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 350); }, 3000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  carregarAlimentos();
  criarGrafico();
  renderMealList();
  renderWater();
});
