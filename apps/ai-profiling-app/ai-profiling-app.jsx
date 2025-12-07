import React, { useState, useRef } from 'react';
import { Upload, Camera, Sparkles, User, Brain, Eye, Loader2 } from 'lucide-react';

const AIProfilingApp = () => {
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    setError(null);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const imageUrl = e.target.result;
      setImage(imageUrl);
      
      const base64Data = imageUrl.split(',')[1];
      const mediaType = file.type;
      setImageData({ base64Data, mediaType });
    };
    
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imageData) return;

    setLoading(true);
    setError(null);
    setProfile(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: imageData.mediaType,
                    data: imageData.base64Data,
                  }
                },
                {
                  type: "text",
                  text: `この写真から読み取れる情報を基に、創造的なプロファイリングを行ってください。以下の形式のJSONで回答してください:

{
  "visualImpression": "第一印象（1-2文）",
  "personality": {
    "traits": ["特徴1", "特徴2", "特徴3", "特徴4"],
    "description": "性格の総合的な分析（2-3文）"
  },
  "lifestyle": {
    "interests": ["趣味・関心1", "趣味・関心2", "趣味・関心3"],
    "description": "ライフスタイルの推測（2-3文）"
  },
  "communication": {
    "style": "コミュニケーションスタイル",
    "description": "対人関係の特徴（2-3文）"
  },
  "strengths": ["強み1", "強み2", "強み3"],
  "professionalFit": {
    "careers": ["適職1", "適職2", "適職3"],
    "description": "職業適性の説明（2-3文）"
  },
  "uniqueInsight": "この人物についての独特な洞察（2-3文）"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON. 分析は写真から読み取れる視覚的情報（表情、服装、背景、雰囲気など）に基づいて、ポジティブで建設的な内容にしてください。`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.content[0].text;
      
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const profileData = JSON.parse(responseText);
      setProfile(profileData);
    } catch (err) {
      console.error("Error in analysis:", err);
      setError('分析中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImageData(null);
    setProfile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght:700;900&family=Noto+Sans+JP:wght@400;500;700&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(5deg); }
          66% { transform: translateY(-10px) rotate(-5deg); }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
        
        .glow-animation {
          animation: glow 2s ease-in-out infinite;
        }
        
        .slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }
        
        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .neon-border {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.4),
                      0 0 40px rgba(168, 85, 247, 0.2),
                      inset 0 0 20px rgba(168, 85, 247, 0.1);
        }
        
        .cyber-font {
          font-family: 'Orbitron', sans-serif;
        }
        
        .jp-font {
          font-family: 'Noto Sans JP', sans-serif;
        }

        .grid-background {
          background-image: 
            linear-gradient(rgba(168, 85, 247, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 slide-in">
          <div className="inline-block mb-4">
            <div className="flex items-center gap-3 px-6 py-3 glass-effect neon-border rounded-full">
              <Brain className="text-purple-400 float-animation" size={32} />
              <h1 className="text-4xl md:text-5xl font-black cyber-font text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                AI PROFILING
              </h1>
              <Sparkles className="text-pink-400 glow-animation" size={32} />
            </div>
          </div>
          <p className="text-gray-300 text-lg jp-font">写真から人物の特徴を分析します</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="glass-effect rounded-2xl p-8 border border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 cyber-font">
                <Camera className="text-purple-400" />
                画像アップロード
              </h2>

              {!image ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-500/50 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-500/5 transition-all duration-300 grid-background"
                >
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="text-purple-400 pulse-animation" size={64} />
                    <p className="text-gray-300 text-lg jp-font">クリックして画像を選択</p>
                    <p className="text-gray-500 text-sm jp-font">JPG, PNG, WEBP対応</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden neon-border">
                    <img
                      src={image}
                      alt="Uploaded"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={analyzeImage}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cyber-font neon-border"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          分析中...
                        </>
                      ) : (
                        <>
                          <Eye size={20} />
                          分析開始
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="px-6 py-4 rounded-xl font-bold glass-effect border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cyber-font"
                    >
                      リセット
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 jp-font">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="glass-effect rounded-2xl p-8 border border-purple-500/30 min-h-[600px]">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 cyber-font">
                <User className="text-purple-400" />
                分析結果
              </h2>

              {!profile && !loading && (
                <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                  <Brain className="mb-4 glow-animation" size={64} />
                  <p className="text-lg jp-font">画像をアップロードして分析を開始してください</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-96">
                  <Loader2 className="animate-spin text-purple-400 mb-4" size={64} />
                  <p className="text-gray-300 text-lg jp-font">AIが分析中...</p>
                </div>
              )}

              {profile && (
                <div className="space-y-6 jp-font">
                  {/* Visual Impression */}
                  <div className="glass-effect rounded-xl p-5 border border-purple-500/20 slide-in">
                    <h3 className="text-lg font-bold text-purple-300 mb-2 flex items-center gap-2">
                      <Eye size={20} />
                      第一印象
                    </h3>
                    <p className="text-gray-300 leading-relaxed">{profile.visualImpression}</p>
                  </div>

                  {/* Personality */}
                  <div className="glass-effect rounded-xl p-5 border border-purple-500/20 slide-in" style={{ animationDelay: '0.1s' }}>
                    <h3 className="text-lg font-bold text-purple-300 mb-3">性格特性</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {profile.personality.traits.map((trait, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-500/30 rounded-full text-sm text-purple-200 border border-purple-500/50"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-300 leading-relaxed">{profile.personality.description}</p>
                  </div>

                  {/* Lifestyle */}
                  <div className="glass-effect rounded-xl p-5 border border-purple-500/20 slide-in" style={{ animationDelay: '0.2s' }}>
                    <h3 className="text-lg font-bold text-purple-300 mb-3">ライフスタイル</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {profile.lifestyle.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-pink-500/30 rounded-full text-sm text-pink-200 border border-pink-500/50"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-300 leading-relaxed">{profile.lifestyle.description}</p>
                  </div>

                  {/* Communication */}
                  <div className="glass-effect rounded-xl p-5 border border-purple-500/20 slide-in" style={{ animationDelay: '0.3s' }}>
                    <h3 className="text-lg font-bold text-purple-300 mb-2">コミュニケーション</h3>
                    <p className="text-purple-200 font-semibold mb-2">{profile.communication.style}</p>
                    <p className="text-gray-300 leading-relaxed">{profile.communication.description}</p>
                  </div>

                  {/* Strengths */}
                  <div className="glass-effect rounded-xl p-5 border border-purple-500/20 slide-in" style={{ animationDelay: '0.4s' }}>
                    <h3 className="text-lg font-bold text-purple-300 mb-3">強み</h3>
                    <ul className="space-y-2">
                      {profile.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-300">
                          <Sparkles className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Professional Fit */}
                  <div className="glass-effect rounded-xl p-5 border border-purple-500/20 slide-in" style={{ animationDelay: '0.5s' }}>
                    <h3 className="text-lg font-bold text-purple-300 mb-3">適職</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {profile.professionalFit.careers.map((career, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-500/30 rounded-full text-sm text-blue-200 border border-blue-500/50"
                        >
                          {career}
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-300 leading-relaxed">{profile.professionalFit.description}</p>
                  </div>

                  {/* Unique Insight */}
                  <div className="glass-effect rounded-xl p-5 border border-purple-500/20 neon-border slide-in" style={{ animationDelay: '0.6s' }}>
                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                      ✨ 独特な洞察
                    </h3>
                    <p className="text-gray-200 leading-relaxed font-medium">{profile.uniqueInsight}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm jp-font slide-in" style={{ animationDelay: '0.3s' }}>
          <p>※この分析は視覚的情報に基づく推測であり、エンターテインメント目的です</p>
        </div>
      </div>
    </div>
  );
};

export default AIProfilingApp;