// Sakura-SAR ダッシュボード（試作） メインスクリプト

// ---- 地図初期化 ----
const map = L.map('map').setView([31.588, 130.657], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 18
}).addTo(map);

// 代表ピン（座標は要確認・仮値。公開前にGoogleマップ等で実測値を確認してください）
const pins = [
  {
    name: '桜島港フェリーターミナル（避難港の例・座標要確認）',
    lat: 31.5965,
    lng: 130.5628,
    type: '避難港'
  },
  {
    name: '黒神埋没鳥居（文化財の例・座標未確定）',
    lat: 31.588,
    lng: 130.72,
    type: '文化財'
  }
];

pins.forEach(p => {
  L.marker([p.lat, p.lng]).addTo(map)
    .bindPopup(`<strong>${p.name}</strong><br>種別: ${p.type}`);
});

// ---- ダークモード ----
const darkModeToggle = document.getElementById('darkModeToggle');
const applyDarkMode = (on) => {
  document.body.classList.toggle('dark', on);
  darkModeToggle.textContent = on ? '☀️ ライトモード' : '🌙 ダークモード';
};
const savedDark = localStorage.getItem('sakuraSarDark') === 'true';
applyDarkMode(savedDark);
darkModeToggle.addEventListener('click', () => {
  const nowDark = !document.body.classList.contains('dark');
  applyDarkMode(nowDark);
  localStorage.setItem('sakuraSarDark', nowDark);
});

// ---- 解析結果データの読み込み・日付選択UI ----
const dateSelector = document.getElementById('dateSelector');
const resultTitle = document.getElementById('resultTitle');
const confidenceBadge = document.getElementById('confidenceBadge');
const resultImage = document.getElementById('resultImage');
const resultSummary = document.getElementById('resultSummary');

const coherenceLabel = { high: '信頼度: 高', medium: '信頼度: 中', low: '信頼度: 低' };

function showResult(entry) {
  if (!entry || entry.status === 'pending') {
    resultTitle.textContent = entry ? entry.pairLabel : '解析結果';
    confidenceBadge.textContent = '準備中';
    confidenceBadge.className = 'badge';
    resultImage.style.display = 'none';
    resultSummary.textContent = 'この期間のデータはまだ解析中です。準備が整い次第、公開します。';
    return;
  }
  resultTitle.textContent = entry.pairLabel;
  confidenceBadge.textContent = coherenceLabel[entry.coherenceLevel] || '-';
  confidenceBadge.className = 'badge ' + (entry.coherenceLevel || '');
  resultImage.style.display = 'block';
  resultImage.src = entry.imageUrl;
  resultSummary.textContent = entry.summary;
}

fetch('data/analyses.json')
  .then(res => res.json())
  .then(data => {
    data.forEach((entry, i) => {
      const chip = document.createElement('button');
      chip.className = 'date-chip' + (entry.status === 'pending' ? ' pending' : '');
      chip.textContent = entry.date + (entry.status === 'pending' ? '（準備中）' : '');
      chip.addEventListener('click', () => {
        document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        showResult(entry);
      });
      dateSelector.appendChild(chip);
      if (i === 0) {
        chip.classList.add('selected');
        showResult(entry);
      }
    });
  })
  .catch(err => {
    resultSummary.textContent = 'データの読み込みに失敗しました。ローカルサーバー経由で開いていますか？（README参照）';
    console.error(err);
  });
