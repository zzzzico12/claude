# Claude Apps Collection

Claudeを使って作成したWebアプリケーションのコレクションです。

## 📁 プロジェクト構成

```
claude/
├── README.md
├── .gitignore
└── apps/
    ├── 3d-block-breaker/
    ├── 3d-tetris/
    ├── ai-profiling-app/
    ├── casino-poker/
    ├── character-prediction/
    ├── connect5/
    ├── constellation-finder/
    ├── flag-quiz-game/
    ├── food-log/
    ├── food-waste-visualizer/
    ├── health-life-simulator/
    ├── hit-and-blow/
    ├── idle-time-tracker/
    ├── joke-generator/
    ├── make10/
    ├── matrix-camera/
    ├── mood-pixel-art/
    ├── mood-tracker/
    ├── movie-diary/
    ├── movie-pronunciation-practice/
    ├── music-to-notes/
    ├── oshilist/
    ├── pi-memory-game/
    ├── prompt-optimizer/
    ├── rakugaki-3d/
    ├── realtime-translator/
    ├── solar-system-3d/
    ├── station-quest/
    ├── task-roulette/
    ├── voice-painter/
    └── wine-menu/
```

## 📱 アプリ一覧

### 1. [3D Block Breaker](apps/3d-block-breaker/)
- **説明**: 3Dグラフィックスを使用したブロック崩しゲーム
- **技術**: HTML5, WebGL, Three.js
- **特徴**: ネオンエフェクト、立体的なゲームプレイ
- **ファイル**: [3d-block-breaker.html](apps/3d-block-breaker/3d-block-breaker.html)

### 2. [3D Tetris](apps/3d-tetris/)
- **説明**: 3D空間で楽しめるテトリスゲーム
- **技術**: HTML5, WebGL, Three.js
- **特徴**: ガラスモーフィズムUI、スコア・レベルシステム
- **ファイル**: [3d-tetris.html](apps/3d-tetris/3d-tetris.html)

### 3. [AI Profiling App](apps/ai-profiling-app/)
- **説明**: 写真をAIで解析し、性格や趣味を推測するアプリ
- **技術**: React (JSX), Claude AI API
- **特徴**: 画像認識、性格分析、ライフスタイル推測
- **ファイル**: [ai-profiling-app.jsx](apps/ai-profiling-app/ai-profiling-app.jsx)

### 4. [Casino Poker](apps/casino-poker/)
- **説明**: スマブラ風UIの本格テキサスホールデムポーカー（SMASH POKER）
- **技術**: HTML5, JavaScript, Three.js, CSS3
- **特徴**: ダメージ%・KO・FINAL SMASH演出、4体AIファイター対戦、PWA対応
- **ファイル**: [smash.html](apps/casino-poker/smash.html)

### 5. [Character Prediction](apps/character-prediction/)
- **説明**: AI搭載の文字予測ゲーム
- **技術**: HTML5, JavaScript, AI/機械学習
- **特徴**: リアルタイム予測、スコア・ストリークシステム
- **ファイル**: [claude-ai-character-prediction.html](apps/character-prediction/claude-ai-character-prediction.html)

### 6. [Connect 5](apps/connect5/)
- **説明**: 9×9ボードで縦・横・斜めに5つ並べたら勝ちのゲーム（コンピューター対戦）
- **技術**: HTML5, SVG, JavaScript
- **特徴**: 重力付き石落とし、ゴーストプレビュー
- **ファイル**: [connect5.html](apps/connect5/connect5.html)

### 7. [Constellation Finder](apps/constellation-finder/)
- **説明**: 指定した場所と時刻で見える星座を検索
- **技術**: React (JSX), 天文計算
- **特徴**: 主要都市対応、季節別星座、星の配置表示
- **ファイル**: [constellation-finder.jsx](apps/constellation-finder/constellation-finder.jsx)

### 8. [Flag Quiz Game](apps/flag-quiz-game/)
- **説明**: 世界の国旗を当てるクイズゲーム
- **技術**: React (TypeScript)
- **特徴**: 50カ国以上、4択形式、スコア記録
- **ファイル**: [flag-quiz-game.tsx](apps/flag-quiz-game/flag-quiz-game.tsx)

### 9. [ごはん日記](apps/food-log/)
- **説明**: 自分だけの食べログ。訪問したお店を地図と一覧で管理するPWAアプリ
- **技術**: React, Leaflet.js, OpenStreetMap, Nominatim
- **特徴**: 評価★・写真・コメント記録、地図表示、Google マイマップ（KML/CSV）インポート、PWA対応
- **ファイル**: [food-log.html](apps/food-log/food-log.html)

### 10. [Food Waste Visualizer](apps/food-waste-visualizer/)
- **説明**: 食品廃棄物の環境影響を可視化
- **技術**: React (JSX), Claude AI API
- **特徴**: CO2・水使用量計算、環境影響グラフ
- **ファイル**: [food-waste-visualizer.jsx](apps/food-waste-visualizer/food-waste-visualizer.jsx)

### 11. [Health Life Simulator](apps/health-life-simulator/)
- **説明**: 健康習慣のパラメータで寿命をシミュレーション
- **技術**: HTML5, React
- **特徴**: 7つの健康指標、リアルタイム計算
- **ファイル**: [health-life-simulator.html](apps/health-life-simulator/health-life-simulator.html)

### 12. [Hit and Blow](apps/hit-and-blow/)
- **説明**: 数字を当てる推理ゲーム（Bulls and Cows）
- **技術**: HTML5, JavaScript
- **特徴**: ヒット＆ブロー判定、履歴表示、リトライ機能
- **ファイル**: [hit_and_blow.html](apps/hit-and-blow/hit_and_blow.html)

### 13. [Idle Time Tracker](apps/idle-time-tracker/)
- **説明**: アイドル時間を記録・可視化するトラッカー
- **技術**: HTML5, JavaScript
- **特徴**: カレンダー表示、統計機能、ヒートマップ
- **ファイル**: [idle-time-tracker.html](apps/idle-time-tracker/idle-time-tracker.html)

### 14. [Joke Generator](apps/joke-generator/)
- **説明**: テーマを入力するとAIがジョークを生成
- **技術**: React (JSX), Claude AI API
- **特徴**: 任意のテーマ、日本語ジョーク、即座に生成
- **ファイル**: [joke-generator.jsx](apps/joke-generator/joke-generator.jsx)

### 15. [Make 10](apps/make10/)
- **説明**: 4つの数字（0〜9）を四則演算で10を作るパズルゲーム
- **技術**: HTML5, JavaScript
- **特徴**: 解あり問題のみ出題、ヒント機能、正解履歴表示
- **ファイル**: [make10.html](apps/make10/make10.html)

### 16. [Matrix Camera](apps/matrix-camera/)
- **説明**: カメラ映像をマトリックス風エフェクトに変換
- **技術**: HTML5, Canvas API, WebRTC
- **特徴**: リアルタイム処理、緑色文字エフェクト、モバイル対応
- **ファイル**: [matrix-camera.html](apps/matrix-camera/matrix-camera.html)

### 17. [Mood Pixel Art](apps/mood-pixel-art/)
- **説明**: 気持ちを入力するとAIが32x32グレースケールドット絵キャラクターをアニメーション生成
- **技術**: HTML5, Canvas API, WebCodecs API
- **特徴**: 4段階グレースケール・立体感、3フレームアニメーション、MP4ダウンロード、マルチプロバイダー対応（Anthropic/OpenAI/Gemini/Groq/OpenRouter）
- **ファイル**: [mood-pixel-art.html](apps/mood-pixel-art/mood-pixel-art.html)

### 18. [Mood Tracker](apps/mood-tracker/)
- **説明**: 天気をモチーフにした気分トラッカー
- **技術**: React (TypeScript), Lucide Icons
- **特徴**: 天気アイコンで気分記録、AI分析機能
- **ファイル**: [mood-weather-tracker.tsx](apps/mood-tracker/mood-weather-tracker.tsx)

### 19. [Movie Diary](apps/movie-diary/)
- **説明**: 映画の視聴記録を日記形式で管理するアプリケーション
- **技術**: React (TypeScript)
- **特徴**: 感情スコア、統計機能、カラフルなUI
- **ファイル**: [movie-diary.tsx](apps/movie-diary/movie-diary.tsx)

### 20. [Movie Pronunciation Practice](apps/movie-pronunciation-practice/)
- **説明**: 有名映画のセリフで英語の発音練習
- **技術**: HTML5, Web Speech API
- **特徴**: リアルタイム発音認識、精度スコア、音声再生
- **ファイル**: [movie-pronunciation-practice.html](apps/movie-pronunciation-practice/movie-pronunciation-practice.html)

### 21. [Music to Notes](apps/music-to-notes/)
- **説明**: マイク入力から音楽を音符に変換
- **技術**: HTML5, Web Audio API
- **特徴**: リアルタイム音程検出、ドレミファソラシド表示
- **ファイル**: [music_to_notes.html](apps/music-to-notes/music_to_notes.html)

### 22. [Oshilist（推しリスト）](apps/oshilist/)
- **説明**: 推しの最新情報を検索・管理するPWAアプリ
- **技術**: HTML5, JavaScript, Tavily API, Service Worker
- **特徴**: カテゴリ・トピック絞り込み、お気に入り登録、推しアルバム自動収集、一括更新、メモ機能
- **ファイル**: [index.html](apps/oshilist/index.html)

### 23. [Pi Memory Game](apps/pi-memory-game/)
- **説明**: 円周率の小数点以下を暗記するメモリーゲーム
- **技術**: React (TypeScript)
- **特徴**: 1000桁収録、タイマー、リアルタイム判定
- **ファイル**: [pi-memory-game.tsx](apps/pi-memory-game/pi-memory-game.tsx)

### 24. [Prompt Optimizer](apps/prompt-optimizer/)
- **説明**: Claude 4向けにプロンプトを最適化
- **技術**: HTML5, Claude AI API
- **特徴**: 自動最適化、Before/After比較、ベストプラクティス適用
- **ファイル**: [prompt-optimizer.html](apps/prompt-optimizer/prompt-optimizer.html)

### 25. [らくがき3D](apps/rakugaki-3d/)
- **説明**: 子どもの落書き写真をAIで背景除去し、3Dキャラクターとして草原ワールドを歩かせるアプリ
- **技術**: HTML5, Three.js, @imgly/background-removal (WASM), HuggingFace Inference API
- **特徴**: ブラウザ内AI背景除去・深度推定、displacementMapによるぷっくり3D、タップジャンプ
- **ファイル**: [rakugaki-3d.html](apps/rakugaki-3d/rakugaki-3d.html)

### 26. [Realtime Translator](apps/realtime-translator/)
- **説明**: リアルタイム多言語翻訳アプリ
- **技術**: React, Tailwind CSS, 翻訳API
- **特徴**: リアルタイム翻訳、複数言語同時表示
- **ファイル**: [realtime-translator.html](apps/realtime-translator/realtime-translator.html)

### 27. [Solar System 3D](apps/solar-system-3d/)
- **説明**: 太陽系の惑星を3Dで可視化
- **技術**: React (TypeScript), Canvas API
- **特徴**: 8惑星の公転シミュレーション、ズーム・速度調整
- **ファイル**: [solar_system_3d.tsx](apps/solar-system-3d/solar_system_3d.tsx)

### 28. [Station Quest](apps/station-quest/)
- **説明**: FPS視点で駅構内を探索するゲーム
- **技術**: HTML5, Canvas API, JavaScript
- **特徴**: 3D風レイキャスティング、クエスト・ミッションシステム
- **ファイル**: [index.html](apps/station-quest/index.html)

### 29. [Task Roulette](apps/task-roulette/)
- **説明**: やることリストからランダムに選択するルーレット
- **技術**: HTML5, JavaScript, CSS3
- **特徴**: アニメーション、データ保存、ランダム選択
- **ファイル**: [task-roulette.html](apps/task-roulette/task-roulette.html)

### 30. [Voice Painter](apps/voice-painter/)
- **説明**: 声で絵を描くアプリ。音声のスペクトルをベクトル変換し、方向・色・太さに反映
- **技術**: HTML5, Web Audio API, Canvas API
- **特徴**: スペクトルベクトルの角度で進行方向、音量で線の太さ、音程で色を決定。適応的ベースラインで声の個人差を自動補正
- **ファイル**: [voice-painter.html](apps/voice-painter/voice-painter.html)

### 31. [Wine Menu](apps/wine-menu/)
- **説明**: ワインメニューをAIで解析・管理するアプリケーション
- **技術**: React (JSX), Claude AI API
- **特徴**: 画像認識、自動情報抽出、フィルタリング
- **ファイル**: [wine-menu.jsx](apps/wine-menu/wine-menu.jsx)

---

## 💡 使い方

各アプリケーションは独立したフォルダに配置されています。

### HTMLファイルの場合
ブラウザで直接開くだけで動作します。

### React コンポーネントの場合（.jsx, .tsx）
適切なReact環境にコピーして使用してください。

詳細は各アプリのREADMEを参照してください。

## 🎮 カテゴリ別

### ゲーム
- 3D Block Breaker
- 3D Tetris
- Casino Poker
- Character Prediction
- Connect 5
- Flag Quiz Game
- Hit and Blow
- Make 10
- Pi Memory Game
- Station Quest

### AI活用
- AI Profiling App
- Character Prediction
- Food Waste Visualizer
- Joke Generator
- Mood Pixel Art
- Prompt Optimizer
- らくがき3D
- Wine Menu

### クリエイティブ・アート
- Matrix Camera
- Mood Pixel Art
- らくがき3D
- Voice Painter

### 学習・トレーニング
- Flag Quiz Game
- Movie Pronunciation Practice
- Music to Notes
- Pi Memory Game

### 教育・科学
- Constellation Finder
- Food Waste Visualizer
- Health Life Simulator
- Solar System 3D

### エンターテイメント
- Casino Poker
- Task Roulette

### ユーティリティ
- ごはん日記
- Idle Time Tracker
- Mood Tracker
- Movie Diary
- Oshilist（推しリスト）
- Prompt Optimizer
- Realtime Translator
- Task Roulette
- Wine Menu

## 📝 ライセンス

MIT License

---

Made with Claude
