import React, { useState, useEffect } from 'react';
import { Film, Plus, TrendingUp, Calendar, Heart, Smile, Zap, MapPin, Users, Clock, BarChart3, PieChart, Award, Image } from 'lucide-react';

const MovieDiaryApp = () => {
  const [movies, setMovies] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    locationType: 'theater',
    watchedWith: '',
    mood: [],
    genre: '',
    emotionScores: {
      cried: 5,
      laughed: 5,
      thrilled: 5
    },
    memo: '',
    posterColor: '#e74c3c'
  });

  const moodOptions = ['感動', 'ワクワク', 'リラックス', '興奮', '癒し', '学び'];
  const genreOptions = ['SF', '恋愛', 'アクション', 'ホラー', 'コメディ', 'ドラマ', 'アニメ', 'ドキュメンタリー'];
  const posterColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      const result = await window.storage.get('movie-diary-data');
      if (result) {
        setMovies(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('初回起動: データを初期化します');
    }
  };

  const saveMovies = async (updatedMovies) => {
    try {
      await window.storage.set('movie-diary-data', JSON.stringify(updatedMovies));
      setMovies(updatedMovies);
    } catch (error) {
      console.error('保存エラー:', error);
    }
  };

  const handleAddMovie = () => {
    if (!formData.title || !formData.date) return;

    const newMovie = {
      id: Date.now(),
      ...formData,
      year: new Date(formData.date).getFullYear()
    };

    const updatedMovies = [...movies, newMovie];
    saveMovies(updatedMovies);
    
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      locationType: 'theater',
      watchedWith: '',
      mood: [],
      genre: '',
      emotionScores: { cried: 5, laughed: 5, thrilled: 5 },
      memo: '',
      posterColor: '#e74c3c'
    });
    setShowAddForm(false);
  };

  const handleDeleteMovie = (id) => {
    const updatedMovies = movies.filter(m => m.id !== id);
    saveMovies(updatedMovies);
  };

  const toggleMood = (mood) => {
    const newMoods = formData.mood.includes(mood)
      ? formData.mood.filter(m => m !== mood)
      : [...formData.mood, mood];
    setFormData({ ...formData, mood: newMoods });
  };

  const getYearlyStats = () => {
    const yearMovies = movies.filter(m => m.year === selectedYear);
    
    const genreCounts = {};
    const locationCounts = {};
    const moodCounts = {};
    const monthlyCounts = {};
    let totalCried = 0, totalLaughed = 0, totalThrilled = 0;

    // 月別カウントの初期化（1月から12月）
    for (let i = 1; i <= 12; i++) {
      monthlyCounts[i] = 0;
    }

    yearMovies.forEach(movie => {
      if (movie.genre) genreCounts[movie.genre] = (genreCounts[movie.genre] || 0) + 1;
      if (movie.location) locationCounts[movie.location] = (locationCounts[movie.location] || 0) + 1;
      movie.mood.forEach(m => moodCounts[m] = (moodCounts[m] || 0) + 1);
      totalCried += movie.emotionScores.cried;
      totalLaughed += movie.emotionScores.laughed;
      totalThrilled += movie.emotionScores.thrilled;
      
      // 月別カウント
      const month = new Date(movie.date).getMonth() + 1;
      monthlyCounts[month]++;
    });

    const mostCriedMovie = yearMovies.reduce((max, m) => 
      m.emotionScores.cried > (max?.emotionScores.cried || 0) ? m : max, null);
    const mostLaughedMovie = yearMovies.reduce((max, m) => 
      m.emotionScores.laughed > (max?.emotionScores.laughed || 0) ? m : max, null);
    const mostThrilledMovie = yearMovies.reduce((max, m) => 
      m.emotionScores.thrilled > (max?.emotionScores.thrilled || 0) ? m : max, null);

    return {
      totalCount: yearMovies.length,
      genreCounts,
      locationCounts,
      moodCounts,
      monthlyCounts,
      mostCriedMovie,
      mostLaughedMovie,
      mostThrilledMovie,
      avgCried: yearMovies.length > 0 ? (totalCried / yearMovies.length).toFixed(1) : 0,
      avgLaughed: yearMovies.length > 0 ? (totalLaughed / yearMovies.length).toFixed(1) : 0,
      avgThrilled: yearMovies.length > 0 ? (totalThrilled / yearMovies.length).toFixed(1) : 0
    };
  };

  const stats = getYearlyStats();
  const availableYears = [...new Set(movies.map(m => m.year))].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Film className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                映画日記
              </h1>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              記録する
            </button>
          </div>
        </div>

        {/* ビュー切り替え */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setCurrentView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentView === 'list' 
                ? 'bg-white shadow-md text-purple-600' 
                : 'bg-white/50 text-gray-600 hover:bg-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            記録一覧
          </button>
          <button
            onClick={() => setCurrentView('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentView === 'stats' 
                ? 'bg-white shadow-md text-purple-600' 
                : 'bg-white/50 text-gray-600 hover:bg-white'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            年間まとめ
          </button>
        </div>

        {/* 追加フォーム */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">新しい映画を記録</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">映画タイトル *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="例：君の名は。"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">鑑賞日 *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ジャンル</label>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    {genreOptions.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">場所の種類</label>
                  <select
                    value={formData.locationType}
                    onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="theater">映画館</option>
                    <option value="streaming">配信サービス</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">場所名</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder={formData.locationType === 'theater' ? '例：TOHOシネマズ' : '例：Netflix'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">誰と見たか</label>
                <input
                  type="text"
                  value={formData.watchedWith}
                  onChange={(e) => setFormData({ ...formData, watchedWith: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="例：友達、家族、一人で"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">気分タグ</label>
                <div className="flex flex-wrap gap-2">
                  {moodOptions.map(mood => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => toggleMood(mood)}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        formData.mood.includes(mood)
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">感情スコア</label>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <Heart className="w-4 h-4" />
                      泣けた度
                    </span>
                    <span className="text-sm font-medium text-purple-600">{formData.emotionScores.cried}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.emotionScores.cried}
                    onChange={(e) => setFormData({
                      ...formData,
                      emotionScores: { ...formData.emotionScores, cried: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <Smile className="w-4 h-4" />
                      笑った度
                    </span>
                    <span className="text-sm font-medium text-purple-600">{formData.emotionScores.laughed}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.emotionScores.laughed}
                    onChange={(e) => setFormData({
                      ...formData,
                      emotionScores: { ...formData.emotionScores, laughed: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <Zap className="w-4 h-4" />
                      ドキドキ度
                    </span>
                    <span className="text-sm font-medium text-purple-600">{formData.emotionScores.thrilled}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.emotionScores.thrilled}
                    onChange={(e) => setFormData({
                      ...formData,
                      emotionScores: { ...formData.emotionScores, thrilled: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ポスターカラー</label>
                <div className="flex gap-2">
                  {posterColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, posterColor: color })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        formData.posterColor === color ? 'ring-4 ring-purple-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">一言日記</label>
                <textarea
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  placeholder="映画を見た直後の余韻を残しましょう..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddMovie}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  記録を保存
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 記録一覧ビュー */}
        {currentView === 'list' && (
          <div className="space-y-4">
            {movies.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">まだ映画の記録がありません</p>
                <p className="text-sm text-gray-400 mt-2">「記録する」ボタンから最初の映画を追加しましょう！</p>
              </div>
            ) : (
              [...movies].reverse().map(movie => (
                <div key={movie.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                  <div className="flex gap-4">
                    <div
                      className="w-24 h-36 rounded-lg flex items-center justify-center text-white text-4xl font-bold shadow-md flex-shrink-0"
                      style={{ backgroundColor: movie.posterColor }}
                    >
                      🎬
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{movie.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(movie.date).toLocaleDateString('ja-JP')}
                            </span>
                            {movie.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {movie.location}
                              </span>
                            )}
                            {movie.watchedWith && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {movie.watchedWith}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMovie(movie.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          削除
                        </button>
                      </div>

                      {movie.genre && (
                        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full mb-3">
                          {movie.genre}
                        </span>
                      )}

                      {movie.mood.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {movie.mood.map(m => (
                            <span key={m} className="px-2 py-1 bg-pink-50 text-pink-600 text-xs rounded-full">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-gray-600">泣けた</span>
                          <span className="font-bold text-red-500">{movie.emotionScores.cried}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Smile className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-600">笑った</span>
                          <span className="font-bold text-yellow-500">{movie.emotionScores.laughed}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Zap className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600">ドキドキ</span>
                          <span className="font-bold text-blue-500">{movie.emotionScores.thrilled}</span>
                        </div>
                      </div>

                      {movie.memo && (
                        <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg italic">
                          "{movie.memo}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 統計ビュー */}
        {currentView === 'stats' && (
          <div className="space-y-6">
            {availableYears.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
            )}

            {stats.totalCount === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{selectedYear}年の記録がありません</p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-8 text-white text-center">
                  <h2 className="text-4xl font-bold mb-2">{stats.totalCount}本</h2>
                  <p className="text-lg opacity-90">{selectedYear}年の鑑賞数</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.mostCriedMovie && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center gap-2 mb-3 text-red-500">
                        <Award className="w-5 h-5" />
                        <h3 className="font-bold">最も泣いた映画</h3>
                      </div>
                      <p className="text-lg font-bold text-gray-800">{stats.mostCriedMovie.title}</p>
                      <p className="text-3xl font-bold text-red-500 mt-2">{stats.mostCriedMovie.emotionScores.cried}</p>
                    </div>
                  )}

                  {stats.mostLaughedMovie && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center gap-2 mb-3 text-yellow-500">
                        <Award className="w-5 h-5" />
                        <h3 className="font-bold">最も笑った映画</h3>
                      </div>
                      <p className="text-lg font-bold text-gray-800">{stats.mostLaughedMovie.title}</p>
                      <p className="text-3xl font-bold text-yellow-500 mt-2">{stats.mostLaughedMovie.emotionScores.laughed}</p>
                    </div>
                  )}

                  {stats.mostThrilledMovie && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center gap-2 mb-3 text-blue-500">
                        <Award className="w-5 h-5" />
                        <h3 className="font-bold">最もドキドキした映画</h3>
                      </div>
                      <p className="text-lg font-bold text-gray-800">{stats.mostThrilledMovie.title}</p>
                      <p className="text-3xl font-bold text-blue-500 mt-2">{stats.mostThrilledMovie.emotionScores.thrilled}</p>
                    </div>
                  )}
                </div>

                {Object.keys(stats.genreCounts).length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <PieChart className="w-5 h-5 text-purple-600" />
                      <h3 className="font-bold text-gray-800">ジャンル別統計</h3>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(stats.genreCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([genre, count]) => (
                          <div key={genre} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-24">{genre}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${(count / stats.totalCount) * 100}%` }}
                              >
                                <span className="text-white text-xs font-bold">{count}本</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {Object.keys(stats.locationCounts).length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      <h3 className="font-bold text-gray-800">場所別ランキング</h3>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(stats.locationCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([location, count], index) => (
                          <div key={location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-purple-600">#{index + 1}</span>
                              <span className="font-medium text-gray-800">{location}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-600">{count}回</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-800">月別鑑賞数</h3>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(stats.monthlyCounts).map(([month, count]) => {
                      const maxCount = Math.max(...Object.values(stats.monthlyCounts));
                      const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
                      return (
                        <div key={month} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 w-12">{monthNames[parseInt(month) - 1]}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                              style={{ width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                            >
                              {count > 0 && (
                                <span className="text-white text-sm font-bold">{count}本</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDiaryApp;