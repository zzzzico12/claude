import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, X, RotateCcw } from 'lucide-react';

// 円周率の最初の1000桁（小数点以下）
const PI_DIGITS = "1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989";

export default function PiMemoryGame() {
  const [input, setInput] = useState('');
  const [gameState, setGameState] = useState('ready'); // ready, playing, finished
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [correctDigits, setCorrectDigits] = useState(0);
  const [wrongDigit, setWrongDigit] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState]);

  const startGame = () => {
    setInput('');
    setGameState('playing');
    setStartTime(Date.now());
    setEndTime(null);
    setCorrectDigits(0);
    setWrongDigit(null);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // 数字のみを許可
    if (!/^\d*$/.test(value)) return;

    const newDigit = value[value.length - 1];
    const position = value.length - 1;

    // 正解チェック
    if (newDigit && PI_DIGITS[position] !== newDigit) {
      // 不正解
      setEndTime(Date.now());
      setGameState('finished');
      setCorrectDigits(position);
      setWrongDigit(newDigit);
      setInput(value);
      return;
    }

    setInput(value);
    
    // 全桁正解した場合
    if (value.length === PI_DIGITS.length) {
      setEndTime(Date.now());
      setGameState('finished');
      setCorrectDigits(PI_DIGITS.length);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const milliseconds = ms % 1000;
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}.${Math.floor(milliseconds / 100)}秒`;
    }
    return `${remainingSeconds}.${Math.floor(milliseconds / 100)}秒`;
  };

  const getElapsedTime = () => {
    if (!startTime) return 0;
    const end = endTime || Date.now();
    return end - startTime;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">
            π 円周率記憶ゲーム
          </h1>
          <p className="text-gray-600">
            3.14159265... の続きを入力してください
          </p>
        </div>

        {gameState === 'ready' && (
          <div className="text-center">
            <div className="mb-8">
              <div className="text-6xl font-bold text-indigo-600 mb-4">π</div>
              <p className="text-xl text-gray-700 mb-2">円周率を何桁覚えていますか？</p>
              <p className="text-gray-500">小数点以下の数字を入力してください</p>
            </div>
            <button
              onClick={startGame}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors"
            >
              ゲームスタート
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div>
            <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="text-indigo-600" />
                <span className="text-lg font-semibold">
                  {formatTime(getElapsedTime())}
                </span>
              </div>
              <div className="text-lg">
                <span className="text-gray-600">入力桁数: </span>
                <span className="font-bold text-indigo-600">{input.length}桁</span>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-2xl font-mono mb-2 text-center text-gray-700">
                3.<span className="text-indigo-600 font-bold">{input}</span>
                <span className="animate-pulse">|</span>
              </div>
            </div>

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={input}
              onChange={handleInputChange}
              className="w-full p-4 text-center text-2xl font-mono border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
              placeholder="数字を入力..."
              autoFocus
            />
          </div>
        )}

        {gameState === 'finished' && (
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
              correctDigits === PI_DIGITS.length ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {correctDigits === PI_DIGITS.length ? (
                <Check className="text-green-600" size={48} />
              ) : (
                <X className="text-red-600" size={48} />
              )}
            </div>

            <h2 className="text-3xl font-bold mb-6">
              {correctDigits === PI_DIGITS.length ? '完璧です！' : '結果'}
            </h2>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
              <div>
                <p className="text-gray-600 mb-1">正解桁数</p>
                <p className="text-4xl font-bold text-indigo-600">{correctDigits}桁</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">かかった時間</p>
                <p className="text-2xl font-bold text-gray-800">{formatTime(getElapsedTime())}</p>
              </div>
              
              {wrongDigit && (
                <div className="pt-4 border-t">
                  <p className="text-red-600 mb-2">
                    {correctDigits + 1}桁目が間違っていました
                  </p>
                  <p className="font-mono text-lg">
                    <span className="text-gray-600">入力: </span>
                    <span className="text-red-600 font-bold">{wrongDigit}</span>
                    <span className="text-gray-600"> → 正解: </span>
                    <span className="text-green-600 font-bold">{PI_DIGITS[correctDigits]}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 mb-6 font-mono break-all">
              <p className="mb-1">正解:</p>
              <p>3.<span className="text-green-600">{input.slice(0, correctDigits)}</span>{wrongDigit && <span className="text-red-600">{wrongDigit}</span>}</p>
            </div>

            <button
              onClick={startGame}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors inline-flex items-center gap-2"
            >
              <RotateCcw size={20} />
              もう一度挑戦
            </button>
          </div>
        )}
      </div>
    </div>
  );
}