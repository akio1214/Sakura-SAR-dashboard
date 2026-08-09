// Sakura-SAR ダッシュボード（試作） メインスクリプト

// ---- 地図初期化 ----
const map = L.map('map').setView([31.588, 130.657], 12);

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 18
}).addTo(map);

// 代表ピン（実測座標、2026-08-09確認済み）
const pinDefs = [
  { name: '桜島港フェリーターミナル（避難港の例）', lat: 31.5964541, lng: 130.5628203, layer: 'port' },
  { name: '黒神埋没鳥居（文化財の例）', lat: 31.5845576, lng: 130.7062570, layer: 'heritage' }
];

const portMarkers = L.layerGroup();
const heritageMarkers = L.layerGroup();

pinDefs.forEach(p => {
  const marker = L.marker([p.lat, p.lng]).bindPopup(`<strong>${p.name}</strong>`);
  (p.layer === 'port' ? portMarkers : heritageMarkers).addLayer(marker);
});
portMarkers.addTo(map);
heritageMarkers.addTo(map);

let insarOverlay = null;

// ---- レイヤー切替 ----
document.getElementById('layerPort').addEventListener('change', (e) => {
  e.target.checked ? map.addLayer(portMarkers) : map.removeLayer(portMarkers);
});
document.getElementById('layerHeritage').addEventListener('change', (e) => {
  e.target.checked ? map.addLayer(heritageMarkers) : map.removeLayer(heritageMarkers);
});
document.getElementById('layerInsar').addEventListener('change', (e) => {
  if (!insarOverlay) return;
  e.target.checked ? map.addLayer(insarOverlay) : map.removeLayer(insarOverlay);
});

// ---- ホワイト／ダーク切替 ----
const lightBtn = document.getElementById('lightModeBtn');
const darkBtn = document.getElementById('darkModeBtn');
const applyMode = (dark) => {
  document.body.classList.toggle('dark', dark);
  lightBtn.classList.toggle('selected', !dark);
  darkBtn.classList.toggle('selected', dark);
  localStorage.setItem('sakuraSarDark', dark);
};
applyMode(localStorage.getItem('sakuraSarDark') === 'true');
lightBtn.addEventListener('click', () => applyMode(false));
darkBtn.addEventListener('click', () => applyMode(true));

// ---- 共有ボタン ----
const shareBtn = document.getElementById('shareBtn');
const shareStatus = document.getElementById('shareStatus');
shareBtn.addEventListener('click', async () => {
  const url = 'https://akio1214.github.io/Sakura-SAR-dashboard/';
  try {
    await navigator.clipboard.writeText(url);
    shareStatus.textContent = 'ページのリンクをコピーしました。';
  } catch (err) {
    shareStatus.textContent = url; // クリップボードAPIが使えない環境向けのフォールバック表示
  }
  setTimeout(() => { shareStatus.textContent = ''; }, 4000);
});

// ---- 解析結果データ ----
const dateSelector = document.getElementById('dateSelector');
const alertBadge = document.getElementById('alertBadge');
const confidenceBadge = document.getElementById('confidenceBadge');
const statsList = document.getElementById('statsList');
const trendChart = document.getElementById('trendChart');
const resultSummary = document.getElementById('resultSummary');
const mapCaption = document.getElementById('mapCaption');

const coherenceLabel = { high: '信頼度: 高', medium: '信頼度: 中', low: '信頼度: 低' };
const statIcon = { up: '↑', down: '↓', expand: '↘' };

function renderStats(stats) {
  statsList.innerHTML = '';
  (stats || []).forEach(s => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-icon">${statIcon[s.icon] || '・'}</span>
      <div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-desc">${s.desc}</div>
      </div>`;
    statsList.appendChild(row);
  });
}

function renderTrend(doneEntries) {
  if (doneEntries.length < 2) {
    trendChart.innerHTML = '<p class="trend-empty">解析件数が増え次第、グラフを表示します（現在の解析済み件数: ' + doneEntries.length + '件）</p>';
    return;
  }
  const values = doneEntries.map(e => e.trendValueMm);
  const min = Math.min(...values), max = Math.max(...values);
  const w = 300, h = 60, pad = 6;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  trendChart.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%">
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" />
  </svg>`;
}

function showResult(entry, allDone) {
  mapCaption.textContent = entry.pairLabel + '（Sentinel-1／プロトタイプ）';

  if (insarOverlay) { map.removeLayer(insarOverlay); insarOverlay = null; }

  if (!entry || entry.status === 'pending') {
    alertBadge.textContent = '準備中';
    alertBadge.className = 'badge badge-neutral';
    confidenceBadge.textContent = '-';
    confidenceBadge.className = 'badge badge-neutral';
    statsList.innerHTML = '';
    resultSummary.textContent = 'この期間のデータはまだ解析中です。準備が整い次第、公開します。';
    trendChart.innerHTML = '';
    return;
  }

  alertBadge.textContent = entry.alertLevel === 'notice' ? '注意' : '正常';
  alertBadge.className = 'badge ' + (entry.alertLevel === 'notice' ? 'warning' : 'good');
  confidenceBadge.textContent = (coherenceLabel[entry.coherenceLevel] || '-') + (entry.coherenceValue ? `（${Math.round(entry.coherenceValue * 100)}%）` : '');
  confidenceBadge.className = 'badge ' + (entry.coherenceLevel === 'high' ? 'good' : entry.coherenceLevel === 'low' ? 'warning' : '');

  renderStats(entry.stats);
  resultSummary.textContent = entry.summary;
  renderTrend(allDone);

  if (entry.imageUrl && entry.imageBounds && document.getElementById('layerInsar').checked) {
    insarOverlay = L.imageOverlay(entry.imageUrl, entry.imageBounds, { opacity: 0.85 }).addTo(map);
  } else if (entry.imageUrl && entry.imageBounds) {
    insarOverlay = L.imageOverlay(entry.imageUrl, entry.imageBounds, { opacity: 0.85 });
  }
}

fetch('data/analyses.json')
  .then(res => res.json())
  .then(data => {
    const doneEntries = data.filter(e => e.status === 'done');
    data.forEach((entry, i) => {
      const chip = document.createElement('button');
      chip.className = 'date-chip' + (entry.status === 'pending' ? ' pending' : '');
      chip.textContent = entry.date + (entry.status === 'pending' ? '（準備中）' : '');
      chip.addEventListener('click', () => {
        document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        showResult(entry, doneEntries);
      });
      dateSelector.appendChild(chip);
      if (i === 0) {
        chip.classList.add('selected');
        showResult(entry, doneEntries);
      }
    });
  })
  .catch(err => {
    resultSummary.textContent = 'データの読み込みに失敗しました。ローカルサーバー経由で開いていますか？（docs/公開手順ガイド.md参照）';
    console.error(err);
  });
