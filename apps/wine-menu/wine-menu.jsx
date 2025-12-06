import React, { useState } from 'react';
import { Wine, MapPin, Droplet, Sparkles, Upload, Loader2, Camera } from 'lucide-react';

const WineApp = () => {
  const [selectedWine, setSelectedWine] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [wines, setWines] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  const analyzeWineMenu = async (imageData) => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: imageData,
                  }
                },
                {
                  type: "text",
                  text: `この画像はワインメニューです。画像から以下の情報を抽出して、JSON形式で返してください。

重要: あなたの回答は有効なJSONオブジェクトのみである必要があります。JSONの外側にテキストやバッククォートを含めないでください。

各ワインについて以下の情報を抽出してください：
- name: ワインの日本語名
- nameEn: ワインの英語名（わかる場合）
- origin: 産地（国と地域）
- color: "red"、"white"、"sparkling"のいずれか
- colorJa: "赤ワイン"、"白ワイン"、"スパークリング"など
- taste: "辛口"、"甘口"、"やや辛口"、"やや甘口"など
- body: "フルボディ"、"ミディアムボディ"、"ライトボディ"
- description: ワインの特徴や説明
- price: 価格（¥記号付き）

以下の形式で返してください：
{
  "wines": [
    {
      "id": 1,
      "name": "ワイン名",
      "nameEn": "Wine Name",
      "origin": "フランス ボルドー",
      "color": "red",
      "colorJa": "赤ワイン",
      "taste": "辛口",
      "body": "フルボディ",
      "description": "説明文",
      "price": "¥10,000",
      "recommended": false
    }
  ]
}

情報が不明な場合は、合理的な推測をしてください。必ず有効なJSONのみを返してください。`
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      let responseText = data.content[0].text;
      
      // Remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const result = JSON.parse(responseText);
      
      if (result.wines && Array.isArray(result.wines)) {
        setWines(result.wines);
      }
      
    } catch (error) {
      console.error("Error analyzing menu:", error);
      alert("メニューの解析に失敗しました。もう一度お試しください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Display uploaded image
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
    };
    reader.readAsDataURL(file);

    // Convert to base64 for API
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    await analyzeWineMenu(base64Data);
  };

  const getColorBadgeStyle = (color) => {
    const styles = {
      red: 'bg-red-100 text-red-800 border-red-300',
      white: 'bg-yellow-50 text-yellow-800 border-yellow-300',
      sparkling: 'bg-blue-50 text-blue-800 border-blue-300'
    };
    return styles[color] || 'bg-gray-100 text-gray-800';
  };

  const getColorIcon = (color) => {
    if (color === 'sparkling') return '🥂';
    if (color === 'red') return '🍷';
    return '🥂';
  };

  const filteredWines = filterType === 'all' 
    ? wines 
    : wines.filter(wine => wine.color === filterType);

  const recommendedWines = wines.filter(wine => wine.recommended);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <Wine className="w-12 h-12 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">WINE LIST AI</h1>
          </div>
          <p className="text-gray-600">メニューの写真をアップロードしてください</p>
        </div>

        {/* Upload Section */}
        {wines.length === 0 && (
          <div className="mb-10">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-dashed border-purple-300">
              <div className="text-center">
                <Camera className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">ワインメニューをアップロード</h2>
                <p className="text-gray-600 mb-6">写真を選択すると自動的に解析します</p>
                
                <label className="inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isAnalyzing}
                  />
                  <div className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors cursor-pointer font-semibold inline-flex items-center">
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        解析中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        写真を選択
                      </>
                    )}
                  </div>
                </label>

                {uploadedImage && (
                  <div className="mt-6">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded menu" 
                      className="max-w-md mx-auto rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show content only when wines are loaded */}
        {wines.length > 0 && (
          <>
            {/* Add new menu button */}
            <div className="mb-6 text-center">
              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isAnalyzing}
                />
                <div className="px-6 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer font-semibold inline-flex items-center">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      解析中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      別のメニューを読み込む
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Recommended Section */}
            {recommendedWines.length > 0 && (
              <div className="mb-10 bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-200">
                <div className="flex items-center mb-4">
                  <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
                  <h2 className="text-2xl font-bold text-gray-800">本日のおすすめ</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedWines.map(wine => (
                    <div 
                      key={wine.id}
                      onClick={() => setSelectedWine(wine)}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all border border-purple-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{wine.name}</h3>
                          <p className="text-sm text-gray-600">{wine.nameEn}</p>
                        </div>
                        <span className="text-2xl">{getColorIcon(wine.color)}</span>
                      </div>
                      <p className="text-purple-600 font-semibold text-lg">{wine.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap justify-center">
          <button
            onClick={() => setFilterType('all')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filterType === 'all' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilterType('red')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filterType === 'red' 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🍷 赤ワイン
          </button>
          <button
            onClick={() => setFilterType('white')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filterType === 'white' 
                ? 'bg-yellow-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🥂 白ワイン
          </button>
          <button
            onClick={() => setFilterType('sparkling')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filterType === 'sparkling' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🍾 スパークリング
          </button>
        </div>

        {/* Wine Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWines.map(wine => (
            <div
              key={wine.id}
              onClick={() => setSelectedWine(wine)}
              className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-800 mb-1">{wine.name}</h3>
                    <p className="text-sm text-gray-500">{wine.nameEn}</p>
                  </div>
                  <span className="text-3xl ml-2">{getColorIcon(wine.color)}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">{wine.origin}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getColorBadgeStyle(wine.color)}`}>
                      {wine.colorJa}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                      {wine.taste}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{wine.description}</p>

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-2xl font-bold text-purple-600">{wine.price}</span>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">
                    詳細を見る
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
        )}

        {/* Detail Modal */}
        {selectedWine && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedWine(null)}
          >
            <div 
              className="bg-white rounded-3xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedWine.name}</h2>
                  <p className="text-lg text-gray-600">{selectedWine.nameEn}</p>
                </div>
                <span className="text-5xl">{getColorIcon(selectedWine.color)}</span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">産地</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedWine.origin}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Droplet className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">種類</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedWine.colorJa}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Wine className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">味わい</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedWine.taste} / {selectedWine.body}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-lg text-gray-800 mb-2">テイスティングノート</h3>
                <p className="text-gray-700">{selectedWine.description}</p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t">
                <span className="text-3xl font-bold text-purple-600">{selectedWine.price}</span>
                <button 
                  onClick={() => setSelectedWine(null)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WineApp;