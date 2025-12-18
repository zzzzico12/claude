import { useState, useRef } from "react";

// 食材ごとの環境影響データ（単位: 100gあたり）
const foodImpactData = {
  '牛肉': { co2: 2700, water: 1540, ecosystem: 9 },
  '豚肉': { co2: 1200, water: 600, ecosystem: 6 },
  '鶏肉': { co2: 600, water: 430, ecosystem: 4 },
  '魚': { co2: 500, water: 350, ecosystem: 5 },
  'ご飯': { co2: 270, water: 250, ecosystem: 3 },
  'パン': { co2: 340, water: 160, ecosystem: 2 },
  '野菜': { co2: 200, water: 130, ecosystem: 2 },
  'チーズ': { co2: 1350, water: 500, ecosystem: 7 },
  '卵': { co2: 450, water: 330, ecosystem: 3 },
  'その他': { co2: 300, water: 200, ecosystem: 3 }
};

function SimpleBarChart({ data, dataKey, color, label }) {
  const maxValue = Math.max(...data.map(item => item[dataKey]));
  
  return (
    <div className="mb-8">
      <h4 className="text-base font-semibold text-gray-700 mb-3">
        {label}
      </h4>
      {data.map((item, index) => {
        const percentage = (item[dataKey] / maxValue) * 100;
        return (
          <div key={index} className="mb-3">
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-gray-900">{item.name}</span>
              <span className="font-bold" style={{ color }}>{item[dataKey]}</span>
            </div>
            <div className="bg-gray-200 rounded-lg h-6 overflow-hidden">
              <div 
                className="h-full rounded-lg transition-all duration-500"
                style={{ 
                  background: color,
                  width: `${percentage}%`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FoodWasteVisualizer() {
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setShowResult(false);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setAnalyzing(true);
    
    try {
      const base64Data = image.split(',')[1];
      
      // 画像のメディアタイプを判定
      let mediaType = "image/jpeg";
      if (image.startsWith('data:image/png')) {
        mediaType = "image/png";
      } else if (image.startsWith('data:image/webp')) {
        mediaType = "image/webp";
      } else if (image.startsWith('data:image/gif')) {
        mediaType = "image/gif";
      }
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64Data,
                  }
                },
                {
                  type: "text",
                  text: `この食事の写真を分析して、残されている（食べ残し）食材を特定してください。

画像に残っている食材それぞれについて、以下の形式で必ずJSON形式のみで回答してください。

重要な指示：
- あなたの応答は有効なJSONオブジェクトのみである必要があります
- バッククォート、説明文、その他のテキストは一切含めないでください
- JSONのみを出力してください

{
  "items": [
    {
      "name": "食材名（牛肉/豚肉/鶏肉/魚/ご飯/パン/野菜/チーズ/卵/その他 のいずれか）",
      "amount": 推定重量（グラム単位の数値）,
      "description": "簡単な説明"
    }
  ]
}

例：
{
  "items": [
    {
      "name": "ご飯",
      "amount": 80,
      "description": "茶碗半分程度の白米"
    },
    {
      "name": "野菜",
      "amount": 50,
      "description": "サラダの残り"
    }
  ]
}`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("APIエラー:", errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("API応答:", data);
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error("APIレスポンスの形式が不正です");
      }
      
      let responseText = data.content[0].text;
      
      // JSONの抽出とクリーニング
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      console.log("パース前のテキスト:", responseText);
      
      const analysisResult = JSON.parse(responseText);
      
      if (!analysisResult.items || !Array.isArray(analysisResult.items)) {
        throw new Error("解析結果の形式が不正です");
      }
      
      // 環境影響を計算
      let totalCO2 = 0;
      let totalWater = 0;
      let totalEcosystem = 0;
      
      const detailedItems = analysisResult.items.map(item => {
        const baseData = foodImpactData[item.name] || foodImpactData['その他'];
        const multiplier = item.amount / 100;
        
        const co2 = Math.round(baseData.co2 * multiplier);
        const water = Math.round(baseData.water * multiplier);
        const ecosystem = Math.round(baseData.ecosystem * multiplier * 10) / 10;
        
        totalCO2 += co2;
        totalWater += water;
        totalEcosystem += ecosystem;
        
        return {
          ...item,
          co2,
          water,
          ecosystem
        };
      });

      setResult({
        items: detailedItems,
        total: {
          co2: Math.round(totalCO2),
          water: Math.round(totalWater),
          ecosystem: Math.round(totalEcosystem * 10) / 10
        }
      });
      
      setShowResult(true);

    } catch (error) {
      console.error("分析エラー詳細:", error);
      alert(`画像の分析中にエラーが発生しました。\n\nエラー: ${error.message}\n\nブラウザのコンソールで詳細を確認してください。`);
    } finally {
      setAnalyzing(false);
    }
  };

  const getImpactLevel = (value, type) => {
    if (type === 'co2') {
      if (value < 500) return { level: '低', color: '#10b981' };
      if (value < 1500) return { level: '中', color: '#f59e0b' };
      return { level: '高', color: '#ef4444' };
    } else if (type === 'water') {
      if (value < 300) return { level: '低', color: '#10b981' };
      if (value < 800) return { level: '中', color: '#f59e0b' };
      return { level: '高', color: '#ef4444' };
    } else {
      if (value < 5) return { level: '低', color: '#10b981' };
      if (value < 15) return { level: '中', color: '#f59e0b' };
      return { level: '高', color: '#ef4444' };
    }
  };

  const equivalentData = result ? [
    {
      label: '車の走行距離',
      value: `${(result.total.co2 / 130).toFixed(1)} km`,
      icon: '🚗',
      description: 'この量のCO2は車で走る距離に相当'
    },
    {
      label: 'シャワー時間',
      value: `${(result.total.water / 12).toFixed(1)} 分`,
      icon: '🚿',
      description: 'この水量はシャワーを使う時間に相当'
    },
    {
      label: '木の本数',
      value: `${(result.total.ecosystem / 2).toFixed(1)} 本分`,
      icon: '🌳',
      description: '生態系への影響を木の本数で換算'
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-purple-800 p-5">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-10">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-3">
            🌍 フードロス可視化アプリ
          </h1>
          <p className="text-gray-600 mb-4">
            食べ残しの環境影響を見える化します
          </p>
          <div className="inline-block bg-blue-50 border-2 border-blue-400 rounded-xl px-5 py-3">
            <p className="text-sm text-blue-900 font-semibold">
              🤖 AI搭載：実際の画像を分析します
            </p>
          </div>
        </div>

        {/* アップロードエリア */}
        <div className="mb-10">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-3 border-dashed border-gray-300 rounded-2xl p-16 text-center cursor-pointer transition-all hover:border-purple-500 hover:bg-gray-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {image ? (
              <div>
                <img
                  src={image}
                  alt="アップロード画像"
                  className="max-w-full max-h-96 rounded-xl mb-5 mx-auto"
                />
                <p className="text-purple-600 font-semibold">
                  📸 クリックして画像を変更
                </p>
              </div>
            ) : (
              <div>
                <div className="text-6xl mb-4">📸</div>
                <p className="text-lg text-gray-800 font-semibold mb-2">
                  食事の写真をアップロード
                </p>
                <p className="text-sm text-gray-500">
                  クリックして画像を選択してください
                </p>
              </div>
            )}
          </div>

          {image && (
            <button
              onClick={analyzeImage}
              disabled={analyzing}
              className={`w-full mt-5 px-6 py-4 rounded-xl text-lg font-bold text-white transition-all ${
                analyzing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-purple-800 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {analyzing && (
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {analyzing ? 'AI分析中...' : '🌱 環境影響を分析'}
              </div>
            </button>
          )}
        </div>

        {/* 結果表示 */}
        {showResult && result && (
          <div className="animate-fadeIn border-t-2 border-gray-200 pt-10">
            {/* 食べ残した食材の詳細 */}
            <div className="bg-red-50 rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-red-900 mb-5">
                🍽️ 食べ残した食材の詳細
              </h2>
              <div className="flex flex-col gap-4">
                {result.items.map((item, index) => (
                  <div key={index} className="bg-white p-5 rounded-xl shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-bold mb-1">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.description}
                        </p>
                      </div>
                      <div className="bg-red-100 px-4 py-2 rounded-full font-bold text-red-900">
                        {item.amount}g
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          CO2
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {item.co2}g
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          水
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {item.water}L
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          生態系
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {item.ecosystem}pt
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 総合影響サマリー */}
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-yellow-900 mb-3">
                📊 環境影響の総合評価
              </h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-5 rounded">
                <p className="text-sm text-yellow-900">
                  ⚠️ <strong>この環境影響は、食材の生産・輸送・販売・廃棄のすべての過程で発生した影響の合計です。</strong>
                  <br />
                  食べ残すことで、これまでのすべての工程で使われた資源とエネルギーが無駄になります。
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-xl shadow">
                  <div className="text-3xl mb-2">💨</div>
                  <div className="text-sm text-gray-600 mb-1">CO2排出量</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {result.total.co2}
                    <span className="text-base ml-1">g</span>
                  </div>
                  <div 
                    className="mt-2 px-3 py-1 rounded-full text-xs font-bold text-white inline-block"
                    style={{ background: getImpactLevel(result.total.co2, 'co2').color }}
                  >
                    影響度: {getImpactLevel(result.total.co2, 'co2').level}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow">
                  <div className="text-3xl mb-2">💧</div>
                  <div className="text-sm text-gray-600 mb-1">水資源消費</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {result.total.water}
                    <span className="text-base ml-1">L</span>
                  </div>
                  <div 
                    className="mt-2 px-3 py-1 rounded-full text-xs font-bold text-white inline-block"
                    style={{ background: getImpactLevel(result.total.water, 'water').color }}
                  >
                    影響度: {getImpactLevel(result.total.water, 'water').level}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow">
                  <div className="text-3xl mb-2">🌿</div>
                  <div className="text-sm text-gray-600 mb-1">生態系影響</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {result.total.ecosystem}
                    <span className="text-base ml-1">pt</span>
                  </div>
                  <div 
                    className="mt-2 px-3 py-1 rounded-full text-xs font-bold text-white inline-block"
                    style={{ background: getImpactLevel(result.total.ecosystem, 'ecosystem').color }}
                  >
                    影響度: {getImpactLevel(result.total.ecosystem, 'ecosystem').level}
                  </div>
                </div>
              </div>
            </div>

            {/* わかりやすい比較 */}
            <div className="bg-green-50 rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-bold text-green-900 mb-5">
                💡 日常生活で例えると...
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {equivalentData.map((item, index) => (
                  <div key={index} className="bg-white p-5 rounded-xl text-center shadow">
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <div className="text-sm text-gray-600 mb-1">
                      {item.label}
                    </div>
                    <div className="text-2xl font-bold text-green-800">
                      {item.value}
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* グラフ表示 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-5">
                📈 食材別の環境影響グラフ
              </h3>
              <SimpleBarChart 
                data={result.items} 
                dataKey="co2" 
                color="#ef4444" 
                label="CO2排出量 (g)" 
              />
              <SimpleBarChart 
                data={result.items} 
                dataKey="water" 
                color="#3b82f6" 
                label="水資源消費 (L)" 
              />
              <SimpleBarChart 
                data={result.items} 
                dataKey="ecosystem" 
                color="#10b981" 
                label="生態系影響 (pt)" 
              />
            </div>

            {/* アクションメッセージ */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-8 rounded-2xl text-center">
              <h3 className="text-2xl font-bold mb-3">
                🌱 次回からできること
              </h3>
              <p className="text-base leading-relaxed opacity-95">
                少しずつ、食べられる量だけ盛り付けることで、<br />
                地球環境への負荷を減らすことができます。<br />
                一人ひとりの小さな行動が、大きな変化につながります！
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
