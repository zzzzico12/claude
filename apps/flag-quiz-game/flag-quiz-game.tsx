import React, { useState, useEffect } from 'react';
import { Shuffle, Trophy, RotateCcw } from 'lucide-react';

const FlagQuizGame = () => {
  const countries = [
    { name: '日本', code: 'JP', flag: '🇯🇵' },
    { name: 'アメリカ', code: 'US', flag: '🇺🇸' },
    { name: 'イギリス', code: 'GB', flag: '🇬🇧' },
    { name: 'フランス', code: 'FR', flag: '🇫🇷' },
    { name: 'ドイツ', code: 'DE', flag: '🇩🇪' },
    { name: 'イタリア', code: 'IT', flag: '🇮🇹' },
    { name: 'スペイン', code: 'ES', flag: '🇪🇸' },
    { name: 'カナダ', code: 'CA', flag: '🇨🇦' },
    { name: 'オーストラリア', code: 'AU', flag: '🇦🇺' },
    { name: '中国', code: 'CN', flag: '🇨🇳' },
    { name: '韓国', code: 'KR', flag: '🇰🇷' },
    { name: 'ブラジル', code: 'BR', flag: '🇧🇷' },
    { name: 'メキシコ', code: 'MX', flag: '🇲🇽' },
    { name: 'アルゼンチン', code: 'AR', flag: '🇦🇷' },
    { name: 'インド', code: 'IN', flag: '🇮🇳' },
    { name: 'ロシア', code: 'RU', flag: '🇷🇺' },
    { name: 'トルコ', code: 'TR', flag: '🇹🇷' },
    { name: 'サウジアラビア', code: 'SA', flag: '🇸🇦' },
    { name: '南アフリカ', code: 'ZA', flag: '🇿🇦' },
    { name: 'エジプト', code: 'EG', flag: '🇪🇬' },
    { name: 'オランダ', code: 'NL', flag: '🇳🇱' },
    { name: 'ベルギー', code: 'BE', flag: '🇧🇪' },
    { name: 'スイス', code: 'CH', flag: '🇨🇭' },
    { name: 'スウェーデン', code: 'SE', flag: '🇸🇪' },
    { name: 'ノルウェー', code: 'NO', flag: '🇳🇴' },
    { name: 'デンマーク', code: 'DK', flag: '🇩🇰' },
    { name: 'フィンランド', code: 'FI', flag: '🇫🇮' },
    { name: 'ポーランド', code: 'PL', flag: '🇵🇱' },
    { name: 'ギリシャ', code: 'GR', flag: '🇬🇷' },
    { name: 'ポルトガル', code: 'PT', flag: '🇵🇹' },
    { name: 'アイルランド', code: 'IE', flag: '🇮🇪' },
    { name: 'オーストリア', code: 'AT', flag: '🇦🇹' },
    { name: 'チェコ', code: 'CZ', flag: '🇨🇿' },
    { name: 'タイ', code: 'TH', flag: '🇹🇭' },
    { name: 'ベトナム', code: 'VN', flag: '🇻🇳' },
    { name: 'シンガポール', code: 'SG', flag: '🇸🇬' },
    { name: 'マレーシア', code: 'MY', flag: '🇲🇾' },
    { name: 'インドネシア', code: 'ID', flag: '🇮🇩' },
    { name: 'フィリピン', code: 'PH', flag: '🇵🇭' },
    { name: 'ニュージーランド', code: 'NZ', flag: '🇳🇿' },
    { name: 'チリ', code: 'CL', flag: '🇨🇱' },
    { name: 'コロンビア', code: 'CO', flag: '🇨🇴' },
    { name: 'ペルー', code: 'PE', flag: '🇵🇪' },
    { name: 'ウクライナ', code: 'UA', flag: '🇺🇦' },
    { name: 'イスラエル', code: 'IL', flag: '🇮🇱' },
    { name: 'UAE', code: 'AE', flag: '🇦🇪' },
    { name: 'ナイジェリア', code: 'NG', flag: '🇳🇬' },
    { name: 'ケニア', code: 'KE', flag: '🇰🇪' },
    { name: 'パキスタン', code: 'PK', flag: '🇵🇰' },
    { name: 'バングラデシュ', code: 'BD', flag: '🇧🇩' },
  ];

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);

  const generateQuestion = () => {
    const correctAnswer = countries[Math.floor(Math.random() * countries.length)];
    const wrongAnswers = [];
    
    while (wrongAnswers.length < 3) {
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      if (randomCountry.code !== correctAnswer.code && !wrongAnswers.includes(randomCountry)) {
        wrongAnswers.push(randomCountry);
      }
    }
    
    const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    
    setCurrentQuestion(correctAnswer);
    setOptions(allOptions);
    setShowResult(false);
    setSelectedAnswer(null);
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  const handleAnswer = (country) => {
    if (showResult) return;
    
    setSelectedAnswer(country);
    setShowResult(true);
    setTotal(total + 1);
    
    if (country.code === currentQuestion.code) {
      setScore(score + 1);
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  const nextQuestion = () => {
    generateQuestion();
  };

  const resetGame = () => {
    setScore(0);
    setTotal(0);
    generateQuestion();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="text-yellow-500" />
              世界国旗クイズ
            </h1>
            <button
              onClick={resetGame}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="リセット"
            >
              <RotateCcw className="text-gray-600" />
            </button>
          </div>

          <div className="mb-8 flex justify-between items-center bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-xl">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">正解数</p>
              <p className="text-3xl font-bold text-blue-600">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">回答数</p>
              <p className="text-3xl font-bold text-purple-600">{total}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">正答率</p>
              <p className="text-3xl font-bold text-pink-600">
                {total > 0 ? Math.round((score / total) * 100) : 0}%
              </p>
            </div>
          </div>

          {currentQuestion && (
            <>
              <div className="mb-8 text-center">
                <p className="text-xl text-gray-700 mb-6 font-medium">この国旗はどこの国?</p>
                <div className="text-9xl mb-4 animate-bounce">
                  {currentQuestion.flag}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                {options.map((country) => {
                  let buttonClass = "w-full p-4 text-lg font-semibold rounded-xl transition-all transform hover:scale-105 ";
                  
                  if (!showResult) {
                    buttonClass += "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg";
                  } else if (country.code === currentQuestion.code) {
                    buttonClass += "bg-green-500 text-white shadow-lg ring-4 ring-green-300";
                  } else if (selectedAnswer && country.code === selectedAnswer.code) {
                    buttonClass += "bg-red-500 text-white shadow-lg ring-4 ring-red-300";
                  } else {
                    buttonClass += "bg-gray-300 text-gray-600 cursor-not-allowed";
                  }

                  return (
                    <button
                      key={country.code}
                      onClick={() => handleAnswer(country)}
                      disabled={showResult}
                      className={buttonClass}
                    >
                      {country.name}
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect ? '🎉 正解!' : '❌ 不正解...'}
                  </div>
                  {!isCorrect && (
                    <p className="text-gray-700 mb-4">
                      正解は <span className="font-bold text-green-600">{currentQuestion.flag} {currentQuestion.name}</span> でした
                    </p>
                  )}
                  <button
                    onClick={nextQuestion}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
                  >
                    <Shuffle size={20} />
                    次の問題
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlagQuizGame;