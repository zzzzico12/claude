import React, { useState } from 'react';
import { Star, MapPin, Calendar, Clock, Search } from 'lucide-react';

// 主要都市の座標データ
const CITIES = {
  '東京': { lat: 35.6762, lon: 139.6503, timezone: 9 },
  '大阪': { lat: 34.6937, lon: 135.5023, timezone: 9 },
  '札幌': { lat: 43.0642, lon: 141.3469, timezone: 9 },
  '福岡': { lat: 33.5904, lon: 130.4017, timezone: 9 },
  'ニューヨーク': { lat: 40.7128, lon: -74.0060, timezone: -5 },
  'ロンドン': { lat: 51.5074, lon: -0.1278, timezone: 0 },
  'パリ': { lat: 48.8566, lon: 2.3522, timezone: 1 },
  'シドニー': { lat: -33.8688, lon: 151.2093, timezone: 10 },
  'ソウル': { lat: 37.5665, lon: 126.9780, timezone: 9 },
  '北京': { lat: 39.9042, lon: 116.4074, timezone: 8 }
};

// 主要星座のデータ（赤経、赤緯、見える季節、星の配置）
const CONSTELLATIONS = {
  // 春の星座
  'おおぐま座': {
    ra: 11, dec: 50, season: 'spring', months: [3,4,5,6],
    stars: [
      {name: 'ドゥーベ', x: 0, y: 0},
      {name: 'メラク', x: 30, y: -10},
      {name: 'フェクダ', x: 50, y: 0},
      {name: 'メグレズ', x: 70, y: 0},
      {name: 'アリオト', x: 90, y: 10},
      {name: 'ミザール', x: 110, y: 5},
      {name: 'ベネトナシュ', x: 130, y: -5}
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[0,3]]
  },
  'こぐま座': {
    ra: 15, dec: 75, season: 'spring', months: [4,5,6],
    stars: [
      {name: 'ポラリス', x: 60, y: 100},
      {name: 'コカブ', x: 40, y: 60},
      {name: 'フェルカド', x: 80, y: 55},
      {name: 'ユルドゥン', x: 60, y: 30}
    ],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  'しし座': {
    ra: 10.5, dec: 15, season: 'spring', months: [3,4,5],
    stars: [
      {name: 'レグルス', x: 50, y: 0},
      {name: 'デネボラ', x: 120, y: 40},
      {name: 'アルギエバ', x: 70, y: 30},
      {name: 'ゾスマ', x: 100, y: 50},
      {name: 'アダフェラ', x: 30, y: 40}
    ],
    lines: [[4,2],[2,0],[2,3],[3,1]]
  },
  'おとめ座': {
    ra: 13.5, dec: -3, season: 'spring', months: [4,5,6],
    stars: [
      {name: 'スピカ', x: 60, y: 20},
      {name: 'ポリマ', x: 40, y: 50},
      {name: 'ヴィンデミアトリクス', x: 80, y: 60}
    ],
    lines: [[1,0],[1,2]]
  },
  'うしかい座': {
    ra: 14.5, dec: 30, season: 'spring', months: [5,6,7],
    stars: [
      {name: 'アークトゥルス', x: 60, y: 50},
      {name: 'ネッカル', x: 60, y: 80},
      {name: 'セギヌス', x: 40, y: 60},
      {name: 'イザール', x: 80, y: 30}
    ],
    lines: [[1,0],[0,2],[0,3]]
  },
  'かんむり座': {
    ra: 15.8, dec: 30, season: 'spring', months: [5,6,7],
    stars: [
      {name: 'ゲンマ', x: 60, y: 60},
      {name: 'ヌサカン', x: 40, y: 50},
      {name: 'アルフェッカ', x: 80, y: 50},
      {name: 'テータ', x: 30, y: 30},
      {name: 'イオタ', x: 90, y: 30}
    ],
    lines: [[3,1],[1,0],[0,2],[2,4]]
  },
  'からす座': {
    ra: 12.5, dec: -20, season: 'spring', months: [4,5],
    stars: [
      {name: 'ギエナー', x: 40, y: 60},
      {name: 'クラズ', x: 60, y: 70},
      {name: 'アルゴラブ', x: 70, y: 40},
      {name: 'ミンカル', x: 30, y: 30}
    ],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  
  // 夏の星座
  'さそり座': {
    ra: 16.5, dec: -26, season: 'summer', months: [6,7,8],
    stars: [
      {name: 'アンタレス', x: 60, y: 40},
      {name: 'シャウラ', x: 100, y: 0},
      {name: 'サルガス', x: 90, y: 10},
      {name: 'デシュバ', x: 50, y: 50},
      {name: 'グラフィアス', x: 30, y: 60}
    ],
    lines: [[4,3],[3,0],[0,2],[2,1]]
  },
  'いて座': {
    ra: 19, dec: -25, season: 'summer', months: [7,8,9],
    stars: [
      {name: 'カウス・アウストラリス', x: 60, y: 20},
      {name: 'ヌンキ', x: 90, y: 50},
      {name: 'アスケラ', x: 70, y: 60},
      {name: 'カウス・メディア', x: 50, y: 40},
      {name: 'カウス・ボレアリス', x: 40, y: 60}
    ],
    lines: [[0,3],[3,4],[4,2],[2,1]]
  },
  'はくちょう座': {
    ra: 20.5, dec: 45, season: 'summer', months: [7,8,9],
    stars: [
      {name: 'デネブ', x: 60, y: 100},
      {name: 'サドル', x: 60, y: 60},
      {name: 'アルビレオ', x: 60, y: 0},
      {name: 'ギェナー', x: 20, y: 60},
      {name: 'デルタ', x: 100, y: 60}
    ],
    lines: [[0,1],[1,2],[1,3],[1,4]]
  },
  'こと座': {
    ra: 18.8, dec: 38, season: 'summer', months: [7,8,9],
    stars: [
      {name: 'ベガ', x: 60, y: 80},
      {name: 'シェリアク', x: 40, y: 40},
      {name: 'スラファト', x: 80, y: 40},
      {name: 'デルタ', x: 50, y: 20}
    ],
    lines: [[0,1],[0,2],[1,3],[2,3]]
  },
  'わし座': {
    ra: 19.8, dec: 8, season: 'summer', months: [7,8,9],
    stars: [
      {name: 'アルタイル', x: 60, y: 50},
      {name: 'タラゼド', x: 40, y: 60},
      {name: 'アルシャイン', x: 80, y: 60},
      {name: 'デネブ・オカブ', x: 60, y: 20}
    ],
    lines: [[1,0],[0,2],[0,3]]
  },
  'へびつかい座': {
    ra: 17.5, dec: -5, season: 'summer', months: [6,7,8],
    stars: [
      {name: 'ラス・アルハゲ', x: 60, y: 80},
      {name: 'サビク', x: 60, y: 20},
      {name: 'イェド・プリオル', x: 40, y: 50},
      {name: 'ケバルライ', x: 80, y: 50}
    ],
    lines: [[0,2],[0,3],[2,1],[3,1]]
  },
  'ヘルクレス座': {
    ra: 17, dec: 30, season: 'summer', months: [6,7,8],
    stars: [
      {name: 'ラス・アルゲティ', x: 40, y: 80},
      {name: 'コルネフォロス', x: 60, y: 60},
      {name: 'ゼータ', x: 60, y: 40},
      {name: 'サリン', x: 80, y: 50}
    ],
    lines: [[0,1],[1,2],[1,3]]
  },
  'りゅう座': {
    ra: 17.5, dec: 65, season: 'summer', months: [6,7,8,9],
    stars: [
      {name: 'エルタニン', x: 60, y: 60},
      {name: 'ラスタバン', x: 70, y: 70},
      {name: 'アルタイス', x: 50, y: 50},
      {name: 'エダシク', x: 80, y: 40}
    ],
    lines: [[0,1],[0,2],[2,3]]
  },
  
  // 秋の星座
  'ペガスス座': {
    ra: 23, dec: 20, season: 'autumn', months: [9,10,11],
    stars: [
      {name: 'マルカブ', x: 80, y: 0},
      {name: 'シェアト', x: 80, y: 60},
      {name: 'アルゲニブ', x: 20, y: 0},
      {name: 'アルフェラッツ', x: 20, y: 60}
    ],
    lines: [[0,1],[1,3],[3,2],[2,0]]
  },
  'アンドロメダ座': {
    ra: 1, dec: 38, season: 'autumn', months: [10,11,12],
    stars: [
      {name: 'アルフェラッツ', x: 20, y: 40},
      {name: 'ミラク', x: 50, y: 60},
      {name: 'アルマク', x: 80, y: 80},
      {name: 'デルタ', x: 60, y: 30}
    ],
    lines: [[0,1],[1,2],[1,3]]
  },
  'カシオペヤ座': {
    ra: 1, dec: 60, season: 'autumn', months: [9,10,11,12],
    stars: [
      {name: 'シェダル', x: 0, y: 0},
      {name: 'カフ', x: 30, y: 30},
      {name: 'ツィー', x: 60, y: 10},
      {name: 'ルクバー', x: 90, y: 35},
      {name: 'セギン', x: 120, y: 20}
    ],
    lines: [[0,1],[1,2],[2,3],[3,4]]
  },
  'ケフェウス座': {
    ra: 22, dec: 65, season: 'autumn', months: [9,10,11],
    stars: [
      {name: 'アルデラミン', x: 60, y: 80},
      {name: 'アルフィルク', x: 40, y: 50},
      {name: 'アルライ', x: 80, y: 50},
      {name: 'エライ', x: 60, y: 20}
    ],
    lines: [[0,1],[0,2],[1,3],[2,3]]
  },
  'ペルセウス座': {
    ra: 3, dec: 45, season: 'autumn', months: [11,12,1],
    stars: [
      {name: 'ミルファク', x: 60, y: 80},
      {name: 'アルゴル', x: 40, y: 50},
      {name: 'アティク', x: 80, y: 60},
      {name: 'ゼータ', x: 60, y: 30}
    ],
    lines: [[0,1],[0,2],[0,3],[1,3]]
  },
  'みずがめ座': {
    ra: 22.5, dec: -10, season: 'autumn', months: [9,10,11],
    stars: [
      {name: 'サダルメリク', x: 40, y: 70},
      {name: 'サダルスウド', x: 70, y: 60},
      {name: 'スカト', x: 60, y: 30},
      {name: 'アンカ', x: 50, y: 50}
    ],
    lines: [[0,3],[3,1],[1,2]]
  },
  'うお座': {
    ra: 0.5, dec: 10, season: 'autumn', months: [10,11,12],
    stars: [
      {name: 'アルリシャ', x: 60, y: 50},
      {name: 'カイトゥム', x: 40, y: 30},
      {name: 'エータ', x: 80, y: 70},
      {name: 'オメガ', x: 30, y: 60}
    ],
    lines: [[1,0],[0,2],[0,3]]
  },
  'やぎ座': {
    ra: 21, dec: -18, season: 'summer', months: [8,9,10],
    stars: [
      {name: 'ダビー', x: 40, y: 50},
      {name: 'デネブ・アルゲディ', x: 70, y: 60},
      {name: 'ナシラ', x: 60, y: 30},
      {name: 'アルゲディ', x: 30, y: 40}
    ],
    lines: [[3,0],[0,1],[1,2]]
  },
  'くじら座': {
    ra: 2, dec: -10, season: 'autumn', months: [10,11,12],
    stars: [
      {name: 'メンカル', x: 40, y: 70},
      {name: 'ディフダ', x: 80, y: 40},
      {name: 'ミラ', x: 60, y: 50},
      {name: 'バテン・カイトス', x: 50, y: 30}
    ],
    lines: [[0,2],[2,1],[2,3]]
  },
  
  // 冬の星座
  'オリオン座': {
    ra: 5.5, dec: 5, season: 'winter', months: [12,1,2,3],
    stars: [
      {name: 'ベテルギウス', x: 20, y: 80},
      {name: 'ベラトリックス', x: 80, y: 70},
      {name: 'アルニラム', x: 40, y: 40},
      {name: 'アルニタク', x: 30, y: 35},
      {name: 'ミンタカ', x: 50, y: 45},
      {name: 'リゲル', x: 70, y: 0},
      {name: 'サイフ', x: 50, y: 10}
    ],
    lines: [[0,2],[1,4],[2,3],[2,4],[3,6],[4,5],[5,6]]
  },
  'おうし座': {
    ra: 4.5, dec: 16, season: 'winter', months: [11,12,1,2],
    stars: [
      {name: 'アルデバラン', x: 50, y: 40},
      {name: 'エルナト', x: 80, y: 70},
      {name: 'アルキオネ', x: 30, y: 60},
      {name: 'ゼータ', x: 70, y: 50}
    ],
    lines: [[2,0],[0,3],[3,1]]
  },
  'ふたご座': {
    ra: 7, dec: 22, season: 'winter', months: [12,1,2,3],
    stars: [
      {name: 'カストル', x: 40, y: 80},
      {name: 'ポルックス', x: 60, y: 70},
      {name: 'アルヘナ', x: 70, y: 30},
      {name: 'メブスタ', x: 50, y: 50}
    ],
    lines: [[0,3],[3,1],[1,2]]
  },
  'こいぬ座': {
    ra: 7.5, dec: 6, season: 'winter', months: [1,2,3],
    stars: [
      {name: 'プロキオン', x: 60, y: 60},
      {name: 'ゴメイサ', x: 40, y: 40}
    ],
    lines: [[0,1]]
  },
  'おおいぬ座': {
    ra: 6.8, dec: -20, season: 'winter', months: [1,2,3],
    stars: [
      {name: 'シリウス', x: 60, y: 50},
      {name: 'ミルザム', x: 40, y: 30},
      {name: 'ウェズン', x: 80, y: 70},
      {name: 'アダラ', x: 70, y: 30}
    ],
    lines: [[1,0],[0,2],[0,3]]
  },
  'ぎょしゃ座': {
    ra: 6, dec: 42, season: 'winter', months: [12,1,2],
    stars: [
      {name: 'カペラ', x: 60, y: 80},
      {name: 'メンカリナン', x: 70, y: 60},
      {name: 'エル・ナト', x: 40, y: 40},
      {name: 'ハッサレー', x: 50, y: 50}
    ],
    lines: [[0,1],[1,3],[3,2],[2,0]]
  },
  'エリダヌス座': {
    ra: 3.5, dec: -30, season: 'winter', months: [12,1,2],
    stars: [
      {name: 'アケルナル', x: 60, y: 0},
      {name: 'クルサ', x: 50, y: 40},
      {name: 'ザウラク', x: 40, y: 60},
      {name: 'アカマル', x: 70, y: 50}
    ],
    lines: [[2,1],[1,3],[3,0]]
  },
  'うさぎ座': {
    ra: 5.5, dec: -20, season: 'winter', months: [1,2],
    stars: [
      {name: 'アルネブ', x: 40, y: 60},
      {name: 'ニハル', x: 70, y: 50},
      {name: 'イプシロン', x: 60, y: 30},
      {name: 'ミュー', x: 50, y: 40}
    ],
    lines: [[0,3],[3,1],[1,2]]
  },
  'はと座': {
    ra: 5.8, dec: -35, season: 'winter', months: [1,2],
    stars: [
      {name: 'ファクト', x: 50, y: 60},
      {name: 'ウェズン', x: 70, y: 40},
      {name: 'デルタ', x: 40, y: 30}
    ],
    lines: [[0,1],[0,2]]
  },
  
  // 黄道十二星座（追加分）
  'おひつじ座': {
    ra: 2.5, dec: 20, season: 'autumn', months: [10,11,12],
    stars: [
      {name: 'ハマル', x: 60, y: 60},
      {name: 'シェラタン', x: 40, y: 50},
      {name: 'メサルティム', x: 50, y: 40}
    ],
    lines: [[0,1],[1,2]]
  },
  'かに座': {
    ra: 8.5, dec: 20, season: 'winter', months: [2,3,4],
    stars: [
      {name: 'アクベンス', x: 40, y: 60},
      {name: 'アルタルフ', x: 60, y: 50},
      {name: 'アセルス・ボレアリス', x: 50, y: 40},
      {name: 'アセルス・アウストラリス', x: 70, y: 30}
    ],
    lines: [[0,1],[1,2],[1,3]]
  },
  'てんびん座': {
    ra: 15.5, dec: -15, season: 'summer', months: [6,7],
    stars: [
      {name: 'ズベン・エル・ゲヌビ', x: 40, y: 40},
      {name: 'ズベン・エル・シャマリ', x: 70, y: 60},
      {name: 'ズベン・エル・アクラビ', x: 60, y: 30}
    ],
    lines: [[0,2],[2,1]]
  }
};

const ConstellationFinder = () => {
  const [selectedCity, setSelectedCity] = useState('東京');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('21:00');
  const [visibleConstellations, setVisibleConstellations] = useState([]);
  const [selectedConstellation, setSelectedConstellation] = useState(null);

  // 恒星時を計算
  const calculateLocalSiderealTime = (dateStr, timeStr, lon) => {
    const datetime = new Date(`${dateStr}T${timeStr}`);
    const year = datetime.getFullYear();
    const month = datetime.getMonth() + 1;
    const day = datetime.getDate();
    const hour = datetime.getHours();
    const minute = datetime.getMinutes();
    
    // ユリウス日の計算
    let y = year, m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const jd = Math.floor(365.25 * y) + Math.floor(30.6001 * (m + 1)) + day + 1720994.5;
    const jd0 = jd - 0.5;
    const t = (jd0 - 2451545.0) / 36525.0;
    
    // グリニッジ恒星時
    const gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 
                t * t * (0.000387933 - t / 38710000.0);
    
    // 地方恒星時
    const lst = (gst + lon + (hour + minute / 60) * 15) % 360;
    return lst / 15; // 時間単位に変換
  };

  // 方位角と高度を計算
  const calculateAltAz = (ra, dec, lat, lst) => {
    const ha = (lst - ra) * 15 * Math.PI / 180; // 時角
    const decRad = dec * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    
    // 高度の計算
    const sinAlt = Math.sin(decRad) * Math.sin(latRad) + 
                   Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha);
    const alt = Math.asin(sinAlt) * 180 / Math.PI;
    
    // 方位角の計算
    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / 
                  (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
    if (Math.sin(ha) > 0) az = 360 - az;
    
    return { altitude: alt, azimuth: az };
  };

  // 方位を文字列で返す
  const getDirection = (azimuth) => {
    const directions = [
      { name: '北', min: 337.5, max: 360 },
      { name: '北', min: 0, max: 22.5 },
      { name: '北東', min: 22.5, max: 67.5 },
      { name: '東', min: 67.5, max: 112.5 },
      { name: '南東', min: 112.5, max: 157.5 },
      { name: '南', min: 157.5, max: 202.5 },
      { name: '南西', min: 202.5, max: 247.5 },
      { name: '西', min: 247.5, max: 292.5 },
      { name: '北西', min: 292.5, max: 337.5 }
    ];
    
    for (let dir of directions) {
      if (azimuth >= dir.min && azimuth < dir.max) {
        return dir.name;
      }
    }
    return '北';
  };

  const findConstellations = () => {
    const city = CITIES[selectedCity];
    const lst = calculateLocalSiderealTime(date, time, city.lon);
    const currentMonth = new Date(`${date}T${time}`).getMonth() + 1;
    
    const visible = [];
    
    for (let [name, data] of Object.entries(CONSTELLATIONS)) {
      const { altitude, azimuth } = calculateAltAz(data.ra, data.dec, city.lat, lst);
      
      if (altitude > 10) { // 地平線から10度以上
        visible.push({
          name,
          altitude: altitude.toFixed(1),
          azimuth: azimuth.toFixed(1),
          direction: getDirection(azimuth),
          season: data.season,
          stars: data.stars,
          lines: data.lines,
          isBestSeason: data.months.includes(currentMonth)
        });
      }
    }
    
    visible.sort((a, b) => b.altitude - a.altitude);
    setVisibleConstellations(visible);
    if (visible.length > 0) setSelectedConstellation(visible[0]);
  };

  const ConstellationDiagram = ({ constellation }) => {
    if (!constellation) return null;
    
    const maxX = Math.max(...constellation.stars.map(s => s.x));
    const maxY = Math.max(...constellation.stars.map(s => s.y));
    const scale = 200 / Math.max(maxX, maxY);
    
    return (
      <div className="bg-gray-900 rounded-lg p-4 mt-4">
        <h3 className="text-lg font-semibold text-white mb-2">{constellation.name}の星座図</h3>
        <svg width="250" height="250" className="mx-auto">
          <rect width="250" height="250" fill="#0a0a1a" />
          
          {/* 線を描画 */}
          {constellation.lines.map((line, idx) => {
            const start = constellation.stars[line[0]];
            const end = constellation.stars[line[1]];
            return (
              <line
                key={idx}
                x1={25 + start.x * scale}
                y1={225 - start.y * scale}
                x2={25 + end.x * scale}
                y2={225 - end.y * scale}
                stroke="#4a90e2"
                strokeWidth="2"
              />
            );
          })}
          
          {/* 星を描画 */}
          {constellation.stars.map((star, idx) => (
            <g key={idx}>
              <circle
                cx={25 + star.x * scale}
                cy={225 - star.y * scale}
                r="4"
                fill="#ffffff"
              />
              <text
                x={25 + star.x * scale}
                y={215 - star.y * scale}
                fill="#ffd700"
                fontSize="10"
                textAnchor="middle"
              >
                {star.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 pt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="text-yellow-300" size={32} />
            <h1 className="text-4xl font-bold text-white">星座ファインダー</h1>
          </div>
          <p className="text-purple-200">日時と場所から見える星座を探します</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 shadow-xl">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="flex items-center gap-2 text-white mb-2 font-medium">
                <MapPin size={18} />
                場所
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {Object.keys(CITIES).map(city => (
                  <option key={city} value={city} className="bg-indigo-900">{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-white mb-2 font-medium">
                <Calendar size={18} />
                日付
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-white mb-2 font-medium">
                <Clock size={18} />
                時刻
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <button
            onClick={findConstellations}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
          >
            <Search size={20} />
            星座を検索
          </button>
        </div>

        {visibleConstellations.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">見える星座一覧</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {visibleConstellations.map((constellation, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedConstellation(constellation)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedConstellation?.name === constellation.name
                        ? 'bg-purple-500/50 border-2 border-purple-300'
                        : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                          {constellation.name}
                          {constellation.isBestSeason && (
                            <span className="text-xs bg-yellow-400 text-gray-900 px-2 py-1 rounded-full">
                              見頃
                            </span>
                          )}
                        </h3>
                        <p className="text-purple-200 text-sm mt-1">
                          方角: <span className="font-semibold text-white">{constellation.direction}</span>
                          （{constellation.azimuth}°）
                        </p>
                        <p className="text-purple-200 text-sm">
                          高度: <span className="font-semibold text-white">{constellation.altitude}°</span>
                        </p>
                      </div>
                      <Star className="text-yellow-300" size={24} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              {selectedConstellation && (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedConstellation.name}
                  </h2>
                  <div className="bg-purple-500/20 rounded-lg p-3 mb-4">
                    <p className="text-white">
                      <span className="font-semibold">方角:</span> {selectedConstellation.direction}
                      （方位角 {selectedConstellation.azimuth}°）
                    </p>
                    <p className="text-white">
                      <span className="font-semibold">高度:</span> {selectedConstellation.altitude}°
                    </p>
                    <p className="text-purple-200 text-sm mt-2">
                      {selectedConstellation.direction}の空、地平線から{selectedConstellation.altitude}度の高さを探してください
                    </p>
                  </div>
                  <ConstellationDiagram constellation={selectedConstellation} />
                  
                  <div className="mt-4 bg-white/5 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">主な恒星:</h4>
                    <ul className="text-purple-200 text-sm space-y-1">
                      {selectedConstellation.stars.map((star, idx) => (
                        <li key={idx}>・{star.name}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {visibleConstellations.length === 0 && (
          <div className="text-center text-purple-200 mt-8">
            <p>上の検索ボタンを押して、星座を探してみましょう！</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstellationFinder;