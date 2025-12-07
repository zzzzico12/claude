import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function JokeGenerator() {
  const [theme, setTheme] = useState('');
  const [joke, setJoke] = useState('');
  const [loading, setLoading] = useState(false);

  const generateJoke = async () => {
    if (!theme.trim()) return;
    
    setLoading(true);
    setJoke('');

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [
            { 
              role: "user", 
              content: `「${theme}」というテーマで、面白いジョークを1つ考えてください。日本語で、短くて分かりやすいジョークをお願いします。ジョークだけを返してください。` 
            }
          ]
        })
      });

      const data = await response.json();
      const generatedJoke = data.content[0].text;
      setJoke(generatedJoke);
    } catch (error) {
      console.error("Error generating joke:", error);
      setJoke("ジョークの生成中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      generateJoke();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-16 h-16 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AIジョークメーカー</h1>
          <p className="text-gray-600">テーマを入力すると、AIが面白いジョークを作ります！</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ジョークのテーマ
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="例：猫、プログラミング、料理..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-lg"
              disabled={loading}
            />
            <button
              onClick={generateJoke}
              disabled={loading || !theme.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                "生成"
              )}
            </button>
          </div>
        </div>

        {joke && (
          <div className="bg-gradient-to-r from-yellow-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 animate-fadeIn">
            <div className="flex items-start gap-3">
              <span className="text-4xl">😄</span>
              <div className="flex-1">
                <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {joke}
                </p>
              </div>
            </div>
          </div>
        )}

        {!joke && !loading && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">テーマを入力して「生成」ボタンを押してください</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">おすすめテーマ</h3>
          <div className="flex flex-wrap gap-2">
            {['猫', 'プログラミング', '料理', '宇宙', '学校', 'スポーツ', '季節', '家族'].map((suggestedTheme) => (
              <button
                key={suggestedTheme}
                onClick={() => setTheme(suggestedTheme)}
                disabled={loading}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
              >
                {suggestedTheme}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
