import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, CloudDrizzle, Calendar, Sparkles } from 'lucide-react';

const MoodWeatherApp = () => {
  const [moods, setMoods] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadMoods();
  }, []);

  const loadMoods = async () => {
    try {
      const keys = await window.storage.list('mood:');
      if (keys && keys.keys) {
        const moodPromises = keys.keys.map(async (key) => {
          try {
            const result = await window.storage.get(key);
            return result ? JSON.parse(result.value) : null;
          } catch {
            return null;
          }
        });
        const loadedMoods = (await Promise.all(moodPromises)).filter(Boolean);
        loadedMoods.sort((a, b) => new Date(b.date) - new Date(a.date));
        setMoods(loadedMoods);
      }
    } catch (error) {
      console.log('初回読み込み:', error);
    }
  };

  const weatherOptions = [
    { type: 'clear', icon: Sun, label: '快晴', color: 'bg-orange-100 hover:bg-orange-200 text-orange-500' },
    { type: 'sunny', icon: Sun, label: '晴れ', color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600' },
    { type: 'cloudy', icon: Cloud, label: '曇り', color: 'bg-gray-100 hover:bg-gray-200 text-gray-600' },
    { type: 'drizzle', icon: CloudDrizzle, label: '小雨', color: 'bg-blue-100 hover:bg-blue-200 text-blue-500' },
    { type: 'rainy', icon: CloudRain, label: '大雨', color: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600' }
  ];

  const saveMood = async (weatherType) => {
    const today = new Date().toISOString().split('T')[0];
    const newMood = {
      date: today,
      weather: weatherType,
      timestamp: Date.now()
    };

    try {
      await window.storage.set(`mood:${today}`, JSON.stringify(newMood));
      setSelectedMood(weatherType);
      await loadMoods();
    } catch (error) {
      console.error('保存エラー:', error);
    }
  };

  const getTodayMood = () => {
    const today = new Date().toISOString().split('T')[0];
    return moods.find(m => m.date === today);
  };

  const analyzeMoods = async () => {
    if (moods.length < 3) {
      setAnalysis('少なくとも3日分の記録が必要です。もう少し記録を続けてみましょう！');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis('');

    try {
      const moodData = moods.map(m => `${m.date}: ${getWeatherLabel(m.weather)}`).join('\n');
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `以下は、ユーザーが天気で表現した気分の記録です。天気の意味は以下の通りです：
- 快晴：とても気分が良い、最高の状態
- 晴れ：気分が良い、元気
- 曇り：まあまあ、普通
- 小雨：少し憂鬱、やや落ち込み気味
- 大雨：とても落ち込んでいる、辛い

記録：
${moodData}

この記録から、優しく温かいトーンで以下を分析してください：
1. 全体的な気分の傾向
2. パターンや変化に気づいたこと
3. 前向きなアドバイスや励まし

200文字程度で、親しみやすく話しかけるように書いてください。`
            }
          ],
        })
      });

      const data = await response.json();
      const analysisText = data.content
        .map(item => (item.type === "text" ? item.text : ""))
        .filter(Boolean)
        .join("\n");
      
      setAnalysis(analysisText);
    } catch (error) {
      console.error('分析エラー:', error);
      setAnalysis('分析中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getWeatherIcon = (type) => {
    const weather = weatherOptions.find(w => w.type === type);
    return weather ? weather.icon : Sun;
  };

  const getWeatherLabel = (type) => {
    const weather = weatherOptions.find(w => w.type === type);
    return weather ? weather.label : '';
  };

  const todayMood = getTodayMood();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">今日の気分</h1>
          <p className="text-gray-600">天気で表現しましょう</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">
            今日の気分はどうですか？
          </h2>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            {weatherOptions.slice(0, 3).map((weather) => {
              const Icon = weather.icon;
              const isSelected = todayMood?.weather === weather.type;
              return (
                <button
                  key={weather.type}
                  onClick={() => saveMood(weather.type)}
                  className={`${weather.color} ${isSelected ? 'ring-4 ring-purple-400' : ''} p-5 rounded-xl transition-all duration-200 transform hover:scale-105 flex flex-col items-center gap-2`}
                >
                  <Icon size={40} strokeWidth={2} />
                  <span className="font-semibold text-base">{weather.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {weatherOptions.slice(3, 5).map((weather) => {
              const Icon = weather.icon;
              const isSelected = todayMood?.weather === weather.type;
              return (
                <button
                  key={weather.type}
                  onClick={() => saveMood(weather.type)}
                  className={`${weather.color} ${isSelected ? 'ring-4 ring-purple-400' : ''} p-5 rounded-xl transition-all duration-200 transform hover:scale-105 flex flex-col items-center gap-2`}
                >
                  <Icon size={40} strokeWidth={2} />
                  <span className="font-semibold text-base">{weather.label}</span>
                </button>
              );
            })}
          </div>

          {todayMood && (
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-purple-700">
                今日は「{getWeatherLabel(todayMood.weather)}」を選びました
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-gray-600" size={24} />
            <h3 className="text-xl font-semibold text-gray-700">記録履歴</h3>
          </div>
          
          {moods.length === 0 ? (
            <p className="text-gray-500 text-center py-8">まだ記録がありません</p>
          ) : (
            <>
              <div className="mb-4">
                <button
                  onClick={analyzeMoods}
                  disabled={isAnalyzing || moods.length < 3}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={20} />
                  {isAnalyzing ? '分析中...' : 'AIに分析してもらう'}
                </button>
              </div>

              {analysis && (
                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  <div className="flex items-start gap-2 mb-2">
                    <Sparkles className="text-purple-600 mt-1" size={20} />
                    <h4 className="font-semibold text-purple-900">AI分析結果</h4>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{analysis}</p>
                </div>
              )}

              <div className="space-y-2">
                {moods.map((mood, index) => {
                  const Icon = getWeatherIcon(mood.weather);
                  const weather = weatherOptions.find(w => w.type === mood.weather);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`${weather?.color} p-2 rounded-lg`}>
                          <Icon size={24} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{getWeatherLabel(mood.weather)}</p>
                          <p className="text-sm text-gray-500">{mood.date}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoodWeatherApp;