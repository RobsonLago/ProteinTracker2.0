// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  meals: [],
  weightLog: [82, 81.8, 81.6, 81.4, 81.3, 81.1, 81],
  goals: { cal: 0, prot: 0, agua: 0 },
  chart: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const fmt = (n, unit = "") => `${Math.round(n)}${unit}`;
const macroPercent = (total, val) => total > 0 ? Math.round((val / total) * 100) : 0;

function totals() {
  return state.meals.reduce(
    (acc, m) => ({
      cal: acc.cal + m.cal,
      prot: acc.prot + m.prot,
      carb: acc.carb + m.carb,
      fat: acc.fat + m.fat,
    }),
    { cal: 0, prot: 0, carb: 0, fat: 0 }
  );
}

// ─── Profile / TMB ────────────────────────────────────────────────────────────
function calcular() {
  const peso = parseFloat($("peso").value);
  const altura = parseFloat($("altura").value);
  const idade = parseFloat($("idade").value);
  const sexo = $("sexo").value;

  if (!peso || !altura || !idade) {
    showToast("Preencha todos os campos do perfil.", "error");
    return;
  }

  const tmb =
    sexo === "m"
      ? 10 * peso + 6.25 * altura - 5 * idade + 5
      : 10 * peso + 6.25 * altura - 5 * idade - 161;

  const calorias = tmb * 1.4;
  const proteina = peso * 2;
  const agua = peso * 35;

  state.goals = { cal: calorias, prot: proteina, agua };

  $("val-tmb").textContent = fmt(tmb, " kcal");
  $("val-cal").textContent = fmt(calorias, " kcal");
  $("val-prot").textContent = fmt(proteina, " g");
  $("val-agua").textContent = fmt(agua, " ml");

  $("results-card").classList.remove("hidden");
  renderWaterChecklist(agua);
  updateProgress();
  showToast("Metabolismo calculado com sucesso!", "success");
}

// ─── Food Log ─────────────────────────────────────────────────────────────────
function addFood() {
  const select = $("foodSelect");
  const food = foods[select.value];
  const g = parseFloat($("gramas").value);

  if (!food || !g || g <= 0) {
    showToast("Selecione um alimento e informe a quantidade.", "error");
    return;
  }

  const factor = g / 100;
  const entry = {
    id: Date.now(),
    nome: food.nome,
    g,
    cal: food.cal * factor,
    prot: food.prot * factor,
    carb: food.carb * factor,
    fat: food.fat * factor,
  };

  state.meals.push(entry);
  renderMealList();
  updateMacroPanel();
  updateProgress();
  $("gramas").value = "";
  showToast(`${food.nome} adicionado!`, "success");
}

function removeFood(id) {
  state.meals = state.meals.filter((m) => m.id !== id);
  renderMealList();
  updateMacroPanel();
  updateProgress();
}

function renderMealList() {
  const ul = $("lista");
  ul.innerHTML = "";

  if (state.meals.length === 0) {
    ul.innerHTML = `<li class="empty-state">Nenhum alimento adicionado ainda.</li>`;
    return;
  }

  state.meals.forEach((m) => {
    const li = document.createElement("li");
    li.className = "meal-item";
    li.innerHTML = `
      <div class="meal-info">
        <span class="meal-name">${m.nome}</span>
        <span class="meal-meta">${m.g}g &bull; ${fmt(m.cal)} kcal &bull; P: ${fmt(m.prot)}g &bull; C: ${fmt(m.carb)}g &bull; G: ${fmt(m.fat)}g</span>
      </div>
      <button class="btn-remove" onclick="removeFood(${m.id})" title="Remover">✕</button>
    `;
    ul.appendChild(li);
  });
}

function updateMacroPanel() {
  const t = totals();
  $("totalCal").textContent = fmt(t.cal, " kcal");
  $("totalProt").textContent = fmt(t.prot, " g");
  $("totalCarb").textContent = fmt(t.carb, " g");
  $("totalFat").textContent = fmt(t.fat, " g");

  const totalMacroG = t.prot + t.carb + t.fat;
  $("bar-prot").style.width = macroPercent(totalMacroG, t.prot) + "%";
  $("bar-carb").style.width = macroPercent(totalMacroG, t.carb) + "%";
  $("bar-fat").style.width = macroPercent(totalMacroG, t.fat) + "%";
}

function updateProgress() {
  const t = totals();
  const { cal, prot } = state.goals;

  if (!cal) return;

  const pCal = Math.min((t.cal / cal) * 100, 100);
  const pProt = Math.min((t.prot / prot) * 100, 100);

  $("prog-cal-bar").style.width = pCal + "%";
  $("prog-prot-bar").style.width = pProt + "%";
  $("prog-cal-label").textContent = `${fmt(t.cal)} / ${fmt(cal)} kcal`;
  $("prog-prot-label").textContent = `${fmt(t.prot)} / ${fmt(prot)} g`;
}

// ─── Food Select ──────────────────────────────────────────────────────────────
function carregarAlimentos() {
  const select = $("foodSelect");
  const searchInput = $("foodSearch");

  const populate = (filter = "") => {
    select.innerHTML = "";
    const filtered = foods
      .map((f, i) => ({ ...f, i }))
      .filter((f) => f.nome.toLowerCase().includes(filter.toLowerCase()));

    filtered.forEach(({ nome, cal, i }) => {
      const op = document.createElement("option");
      op.value = i;
      op.textContent = `${nome} — ${cal} kcal/100g`;
      select.appendChild(op);
    });

    if (filtered.length === 0) {
      const op = document.createElement("option");
      op.textContent = "Nenhum alimento encontrado";
      op.disabled = true;
      select.appendChild(op);
    }
  };

  populate();
  searchInput.addEventListener("input", (e) => populate(e.target.value));
}

// ─── Water Checklist ──────────────────────────────────────────────────────────
function renderWaterChecklist(agua) {
  const copos = Math.ceil(agua / 250);
  const container = $("waterChecklist");
  container.innerHTML = "";

  for (let i = 1; i <= copos; i++) {
    const btn = document.createElement("button");
    btn.className = "water-cup";
    btn.title = `Copo ${i} — 250ml`;
    btn.innerHTML = `<span class="cup-icon">🥛</span><span class="cup-num">${i}</span>`;
    btn.addEventListener("click", function () {
      this.classList.toggle("drunk");
      updateWaterCount();
    });
    container.appendChild(btn);
  }

  $("water-total").textContent = fmt(agua, " ml");
  $("water-count").textContent = `0 / ${copos} copos`;
}

function updateWaterCount() {
  const total = document.querySelectorAll(".water-cup").length;
  const drunk = document.querySelectorAll(".water-cup.drunk").length;
  $("water-count").textContent = `${drunk} / ${total} copos`;
}

// ─── Weight Chart ─────────────────────────────────────────────────────────────
function criarGrafico() {
  const ctx = $("pesoChart").getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
  gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      datasets: [
        {
          label: "Peso (kg)",
          data: state.weightLog,
          borderColor: "#10b981",
          backgroundColor: gradient,
          borderWidth: 2.5,
          pointBackgroundColor: "#10b981",
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1f2937",
          titleColor: "#f9fafb",
          bodyColor: "#d1fae5",
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} kg`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#9ca3af" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#9ca3af", callback: (v) => `${v} kg` },
        },
      },
    },
  });
}

function addWeight() {
  const input = $("newWeight");
  const val = parseFloat(input.value);
  if (!val || val < 20 || val > 300) {
    showToast("Informe um peso válido.", "error");
    return;
  }

  state.weightLog.push(val);
  if (state.weightLog.length > 7) state.weightLog.shift();

  state.chart.data.datasets[0].data = state.weightLog;
  state.chart.update();
  input.value = "";
  showToast(`Peso ${val} kg registrado!`, "success");
}

// ─── Scanner ──────────────────────────────────────────────────────────────────
function startScanner() {
  if (typeof Quagga === "undefined") {
    showToast("Scanner não disponível.", "error");
    return;
  }

  $("scanner-overlay").classList.remove("hidden");

  Quagga.init(
    {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: $("scanner"),
        constraints: { facingMode: "environment" },
      },
      decoder: { readers: ["ean_reader", "ean_8_reader"] },
    },
    (err) => {
      if (!err) Quagga.start();
      else {
        showToast("Câmera não autorizada.", "error");
        $("scanner-overlay").classList.add("hidden");
      }
    }
  );

  Quagga.onDetected((data) => {
    const code = data.codeResult.code;
    showToast(`Código detectado: ${code}`, "success");
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
  const container = $("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  carregarAlimentos();
  criarGrafico();
  renderMealList();
});
