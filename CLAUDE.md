# Sakura-SAR ダッシュボード — 開発引き継ぎメモ

このファイルはClaude Code向けの引き継ぎメモです。Cowork(別セッション)でここまで実装を進めてきました。Claude Codeで作業を始める際は、まずこのファイル全体を読んでから着手してください。

## プロジェクトの背景

鹿児島県ISHIN2026「鹿児島版AKATSUKIプロジェクト」テーマE採択案件。InSAR(SAR干渉解析)で桜島の地盤変動をmm〜cm単位で可視化する観光防災ダッシュボードのプロトタイプを作る。実施者は土本暁雄氏(鹿児島大学大学院)、単独実施。キックオフ2026/8/1、最終報告会2027/1/23。現在はフェーズ1(キックオフ〜5合目会議、8/1〜9/26)。

詳細な要件は `C:\work\Sakura-SAR\docs\UI要件定義書.md` と `C:\work\Sakura-SAR\docs\公開手順ガイド.md` を参照(このリポジトリの親フォルダにあり、Git管理外)。

## 重要な制約・注意事項

1. **`C:\work\Sakura-SAR\fig` フォルダ(SAR生データ、約26GB)は絶対にこのリポジトリにコミットしないこと。** このリポジトリのルートは`dashboard`フォルダのみで、`fig`は完全に別管理。混入させない。
2. **無料ツールのみ使用する方針。** ホスティングはGitHub Pages、地図はLeaflet+OpenStreetMap(APIキー不要)、フレームワーク不使用のVanilla HTML/CSS/JS。ビルドステップなし。
3. **実装スコープの境界線(確定事項、勝手に拡張しない):**
   - 実装する: ダッシュボード本体(PC/スマホ版レスポンシブ、公開URLで動作)、日付選択(未解析日は「準備中」表示)、6〜8件の時系列比較、コヒーレンス値に基づく信頼度表示、ダークモード切替、共有ボタン(公開URLをクリップボードにコピーするだけ。それ以上の機能は不要)
   - 対応しない(ユーザーとの合意済み): 色弱対応の配色切替、レポート出力・共有結果のエクスポート機能。ボタンは非活性表示のみでOK。
   - 手動対応: InSAR解析自体(自動化・バッチ処理はISHIN終了後の次フェーズ)、変動量要約テキスト(解析後に手動反映)、ピン留めは代表1〜2箇所のみ
   - スコープを広げる提案をする場合は、必ずその旨を明示してからユーザーに確認すること。

## 現在の実装状況(重要: GitHubには未反映のローカル変更あり)

このリポジトリは `C:\work\Sakura-SAR\dashboard` を独立したGitリポジトリとして初期化したもの。

- リモート: `https://github.com/akio1214/Sakura-SAR-dashboard.git`
- 公開URL: `https://akio1214.github.io/Sakura-SAR-dashboard/`(GitHub Pages, Source: main branch / root)
- **`git log`は1コミットのみ(初回のシンプル版)。その後モックアップ画像に合わせて大幅に作り直した内容(v2)が、コミットされずローカルに残っている状態。** 作業開始時に必ず `git status` を確認し、`data/analyses.json` `index.html` `script.js` `style.css` の変更と `design/` フォルダの追加をコミット・pushするところから始めること。

## ファイル構成

```
dashboard/
  index.html        メインHTML。3カラムレイアウト(操作パネル/地図/変動サマリー)
  style.css         スタイル。CSS Gridの grid-template-areas で
                     PC(3カラム)とスマホ(960px以下で縦積み)を切替。
                     HTML/JSは1つのまま、CSSだけで出し分ける設計。
  script.js         Leaflet地図初期化、レイヤー切替、日付選択、
                     ダーク/ライト切替、共有ボタン、変動サマリー描画
  data/analyses.json 解析結果メタデータ(スキーマは下記)
  data/images/       解析結果画像。現在は全てPython/PILで生成したダミー画像
                     (実際のInSAR結果ではない)
  design/mockup.png  ユーザー提供のUIモックアップ画像(デザインの目標)
  .gitignore
  CLAUDE.md          このファイル
```

## データスキーマ(data/analyses.json)

```json
{
  "date": "2026-06-27",
  "pairLabel": "2026-06-27 〜 2026-07-04",
  "status": "done",              // "done" | "pending"（準備中）
  "coherenceLevel": "medium",    // "high" | "medium" | "low"
  "coherenceValue": 0.55,        // 0-1
  "alertLevel": "notice",        // "notice" | "normal"
  "alertText": "...",
  "stats": [
    { "icon": "up", "value": "約12mm 隆起", "desc": "..." }
  ],                              // icon: "up" | "down" | "expand"
  "trendValueMm": 12,             // トレンドグラフ用の数値
  "summary": "...",
  "imageUrl": "data/images/xxx.png",
  "imageBounds": [[南端緯度, 西端経度], [北端緯度, 東端経度]]
}
```

`status: "pending"` のエントリは上記フィールドの多くを省略可(dateとpairLabelとstatusのみでOK)。

## 未解決のTODO(次にやるべきこと)

1. **未pushのローカル変更をコミット・push する**(上記参照)。
2. **ピン座標が仮値。** `script.js` の `pinDefs` にある桜島港フェリーターミナルと黒神埋没鳥居の緯度経度は、情報源間で食い違いがあり未確定。Googleマップ等で実測値を確認して差し替える。
3. **`imageBounds`(InSAR画像を地図に重ねる際の四隅の緯度経度)も目算の仮値。** SNAPから実際の解析結果をGeoTIFF等の正しい地理座標付きでエクスポートしたら、正確な値に差し替える。
4. **ダミー画像を実際のSNAP解析結果に差し替える。** ユーザーは現在SNAPで手動解析中(直近の状況: 2枚のSAR画像でアンラップ(unwrap)処理の手前まで進行)。結果が出たら `data/images/` に配置し `data/analyses.json` を更新する。
5. **トレンドグラフは`done`件数が2件以上にならないと表示されない仕様。** 現在1件のみなのでプレースホルダー表示中。解析件数が増えたら自然に表示される。
6. Coworkのサンドボックス環境ではネットワーク制限によりheadlessブラウザでの視覚確認ができなかった。JSON/JS構文チェックとHTTPレスポンス確認のみ実施済み。Claude Codeでは実際にブラウザ(Live Server等)で見た目を確認しながら進めること。

## ローカル動作確認方法

`index.html`を直接ダブルクリックでは`fetch('data/analyses.json')`がCORSエラーで失敗する。以下のいずれかでローカルサーバー経由にすること。

- VSCode拡張機能「Live Server」で `index.html` を右クリック→Open with Live Server
- または `cd dashboard && python -m http.server 8000` → `http://localhost:8000`

## デプロイ方法

```
cd C:\work\Sakura-SAR\dashboard
git add .
git commit -m "変更内容"
git push
```

push後1〜2分でGitHub Pagesに反映される。GitHubの認証はHTTPS+個人アクセストークン(PAT)方式で設定済み(SSHは未設定のため使わないこと)。

## これまでの経緯(要約)

1. Notion作業日誌を確認し進捗状況を報告(フェーズ1初期、SAR/InSAR基礎学習段階)。
2. UI要件定義・地図試作・無料デプロイ方針についてユーザーと合意(GitHub Pages / Leaflet+OSM / Vanilla JS)。
3. v1プロトタイプ実装・GitHub Pages公開まで完了(SSH認証エラーをHTTPS+PATで解決)。
4. ユーザーがUIモックアップ画像(`design/mockup.png`)を提供。スコープ境界(レポート出力・色弱配色は対応しない、共有ボタン(URLコピーのみ)は対応する)を確認の上、モックアップに近い形でUIを全面的に作り直した(v2、現在ローカルに未コミット)。
5. ユーザーがClaude Codeでの継続作業を希望。このメモを作成して引き継ぎ。
