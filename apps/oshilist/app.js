/* ===== 設定 ===== */
const TAVILY_URL  = 'https://api.tavily.com/search';
const STORAGE_KEY = 'oshi-favorites';
const KEY_STORAGE = 'oshi-api-key';

function getApiKey() {
  return localStorage.getItem(KEY_STORAGE)
    || (typeof CONFIG !== 'undefined' && CONFIG.API_KEY)
    || '';
}

/* ===== 状態 ===== */
let selectedCategory = '俳優・女優';
let selectedTopic    = 'すべて';
let isLoading        = false;
let isBulkUpdating   = false;
let currentName      = '';
let currentCategory  = '';

/* ===== お気に入りデータ構造 =====
  [{ name, category, memo, lastChecked, lastSummary, album: [] }]
===== */
function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveFavorites(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function isFavorite(name, category) {
  return loadFavorites().some(f => f.name === name && f.category === category);
}

function toggleFavorite(name, category) {
  let list = loadFavorites();
  if (isFavorite(name, category)) {
    list = list.filter(f => !(f.name === name && f.category === category));
  } else {
    list.push({ name, category, memo: '', lastChecked: null, lastSummary: null, album: [] });
  }
  saveFavorites(list);
  updateFavBtn(name, category);
  renderFavList();
}

function updateFavEntry(name, category, patch) {
  const list = loadFavorites();
  const idx  = list.findIndex(f => f.name === name && f.category === category);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...patch };
    saveFavorites(list);
  }
}

/* ===== DOM ===== */
const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');
const resultsEl    = document.getElementById('results');
const loadingEl    = document.getElementById('loading');
const errorBoxEl   = document.getElementById('errorBox');
const errorMsgEl   = document.getElementById('errorMsg');
const contentEl    = document.getElementById('content');
const hintEl       = document.getElementById('hint');
const favBtn       = document.getElementById('favBtn');
const bulkBtn      = document.getElementById('bulkBtn');
const bulkProgress = document.getElementById('bulkProgress');

/* ===== API キー設定画面 ===== */
const setupScreen = document.getElementById('setupScreen');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn  = document.getElementById('saveKeyBtn');
const settingsBtn = document.getElementById('settingsBtn');

function showSetupScreen() {
  apiKeyInput.value = localStorage.getItem(KEY_STORAGE) || '';
  setupScreen.classList.remove('hidden');
}

function hideSetupScreen() {
  setupScreen.classList.add('hidden');
}

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    apiKeyInput.focus();
    return;
  }
  localStorage.setItem(KEY_STORAGE, key);
  hideSetupScreen();
});

apiKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveKeyBtn.click();
});

settingsBtn.addEventListener('click', showSetupScreen);

// 起動時チェック
if (!getApiKey()) showSetupScreen();

/* ===== タブ切り替え ===== */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('panel-search').classList.toggle('hidden', target !== 'search');
    document.getElementById('panel-list').classList.toggle('hidden', target !== 'list');
    if (target === 'list') renderFavList();
  });
});

/* ===== カテゴリ切り替え ===== */
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCategory = btn.dataset.cat;
  });
});

/* ===== ④ トピック切り替え ===== */
document.querySelectorAll('.topic-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTopic = btn.dataset.topic;
  });
});

/* ===== 検索トリガー ===== */
searchBtn.addEventListener('click', startSearch);

/* ===== お気に入りボタン ===== */
favBtn.addEventListener('click', () => {
  if (currentName) toggleFavorite(currentName, currentCategory);
});

/* ===== ② 一括更新 ===== */
bulkBtn.addEventListener('click', bulkUpdate);

/* ===== 推し検索 ===== */
async function startSearch() {
  const name = searchInput.value.trim();
  if (!name || isLoading) return;

  if (!getApiKey()) {
    showSetupScreen();
    return;
  }

  currentName     = name;
  currentCategory = selectedCategory;
  isLoading       = true;
  searchBtn.disabled = true;

  hintEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  showSearchLoading(true);
  showSearchError(null);
  contentEl.classList.add('hidden');

  try {
    const data = await searchWithTavily(name, selectedCategory, selectedTopic);
    renderSearchResults(name, selectedCategory, data);
    contentEl.classList.remove('hidden');
  } catch (err) {
    showSearchError(err.message || '情報の取得に失敗しました。');
  } finally {
    showSearchLoading(false);
    isLoading = false;
    searchBtn.disabled = false;
  }
}

/* ===== 推しリストから個別検索 ===== */
async function searchFromList(name, category) {
  if (isLoading || isBulkUpdating) return;
  isLoading = true;

  const listResultsEl = document.getElementById('listResults');
  const listLoadingEl = document.getElementById('listLoading');
  const listContentEl = document.getElementById('listContent');

  listResultsEl.classList.remove('hidden');
  listLoadingEl.classList.remove('hidden');
  showListError(null);
  listContentEl.classList.add('hidden');

  document.querySelectorAll('.fav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.name === name && el.dataset.category === category);
  });

  try {
    const data = await searchWithTavily(name, category, 'すべて');
    updateFavEntry(name, category, {
      lastChecked: new Date().toISOString(),
      lastSummary: buildSummary(data.results)
    });
    renderFavList();
    renderListResults(name, category, data);
    listContentEl.classList.remove('hidden');
    listResultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showListError(err.message || '情報の取得に失敗しました。');
  } finally {
    listLoadingEl.classList.add('hidden');
    isLoading = false;
  }
}

/* ===== ② 一括更新 ===== */
async function bulkUpdate() {
  const list = loadFavorites();
  if (list.length === 0 || isBulkUpdating) return;

  isBulkUpdating = true;
  bulkBtn.disabled = true;
  bulkProgress.classList.remove('hidden');
  document.getElementById('listResults').classList.add('hidden');

  for (let i = 0; i < list.length; i++) {
    const { name, category } = list[i];
    bulkProgress.textContent = `更新中 ${i + 1} / ${list.length}  —  ${name}`;

    const itemEl = document.querySelector(
      `.fav-item[data-name="${CSS.escape(name)}"][data-category="${CSS.escape(category)}"]`
    );
    if (itemEl) itemEl.classList.add('updating');

    try {
      const data = await searchWithTavily(name, category, 'すべて');
      updateFavEntry(name, category, {
        lastChecked: new Date().toISOString(),
        lastSummary: buildSummary(data.results)
      });
    } catch { /* 個別失敗は無視して続行 */ }

    if (itemEl) itemEl.classList.remove('updating');
    renderFavList();

    if (i < list.length - 1) await sleep(800);
  }

  bulkProgress.textContent = `更新完了（${list.length}件）`;
  setTimeout(() => bulkProgress.classList.add('hidden'), 3000);
  isBulkUpdating = false;
  bulkBtn.disabled = false;
}

/* ===== Tavily API ===== */
async function searchWithTavily(name, category, topic) {
  const topicPart = (!topic || topic === 'すべて') ? '最新情報 活動' : `${topic} 最新情報`;
  const query     = `${name} ${category} ${topicPart}`;

  const response = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: getApiKey(),
      query,
      search_depth: 'advanced',
      include_answer: false,
      include_images: true,
      include_images: false,
      max_results: 8,
      language: 'ja'
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `HTTPエラー ${response.status}`);
  }
  return response.json();
}

/* ===== 検索結果から日本語まとめを生成 ===== */
function buildSummary(results) {
  if (!results || results.length === 0) return '情報が見つかりませんでした。';
  return results
    .slice(0, 3)
    .map(r => r.content?.trim())
    .filter(Boolean)
    .map(text => text.slice(0, 120))
    .join('　／　');
}

/* ===== 描画：推し検索タブ ===== */
function renderSearchResults(name, category, data) {
  document.getElementById('queryLabel').textContent = `${name}（${category}）`;
  document.getElementById('aiSummary').textContent  = buildSummary(data.results);
  buildNewsList(document.getElementById('newsList'), data.results || []);
  renderImageGrid('imageGrid', 'imageBlock', data.images || [], name, category);
  updateFavBtn(name, category);
}

/* ===== 描画：推しリストタブ（個別） ===== */
function renderListResults(name, category, data) {
  document.getElementById('listQueryLabel').textContent = `${name}（${category}）`;
  document.getElementById('listAiSummary').textContent  = buildSummary(data.results);
  buildNewsList(document.getElementById('listNewsList'), data.results || []);
  renderImageGrid('listImageGrid', 'listImageBlock', data.images || [], name, category);
}

/* ===== ニュースリスト構築 ===== */
function buildNewsList(listEl, results) {
  listEl.innerHTML = '';
  if (results.length === 0) {
    listEl.innerHTML = '<li style="color:var(--t3);font-size:0.85rem;">検索結果が見つかりませんでした。</li>';
    return;
  }
  results.forEach(item => {
    const date    = item.published_date ? formatDate(item.published_date) : '';
    const domain  = extractDomain(item.url || '');
    const snippet = item.content ? item.content.slice(0, 120) + '…' : '';
    const li = document.createElement('li');
    li.className = 'news-item';
    li.innerHTML = `
      <span class="news-date">${escHtml(date)}</span>
      <div class="news-body">
        <a class="news-link" href="${escHtml(item.url || '#')}" target="_blank" rel="noopener">
          ${escHtml(item.title || '')}
        </a>
        <div class="news-snippet">${escHtml(snippet)}</div>
        <div class="news-source">${escHtml(domain)}</div>
      </div>
    `;
    listEl.appendChild(li);
  });
}

/* ===== アルバム管理 ===== */
function toggleImageInAlbum(name, category, url) {
  const list = loadFavorites();
  const idx  = list.findIndex(f => f.name === name && f.category === category);
  if (idx === -1) return;
  const album = list[idx].album || [];
  if (album.includes(url)) {
    list[idx].album = album.filter(u => u !== url);
  } else {
    list[idx].album = [...album, url];
  }
  saveFavorites(list);
}

/* ===== 画像グリッド描画 ===== */
function renderImageGrid(gridId, blockId, images, name, category) {
  const blockEl = document.getElementById(blockId);
  const gridEl  = document.getElementById(gridId);

  // ロード失敗した画像を除外するため、まず全部試す
  const validImages = images.slice(0, 12);

  if (validImages.length === 0) {
    blockEl.hidden = true;
    return;
  }

  blockEl.hidden = false;
  gridEl.innerHTML = '';

  const fav   = loadFavorites().find(f => f.name === name && f.category === category);
  const album = fav?.album || [];

  validImages.forEach(url => {
    const card = document.createElement('div');
    card.className = 'image-card';

    const img = document.createElement('img');
    img.src     = url;
    img.alt     = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => card.remove());

    const isSaved = album.includes(url);
    const btn = document.createElement('button');
    btn.className   = `image-save-btn${isSaved ? ' saved' : ''}`;
    btn.textContent = isSaved ? '✓' : '+';
    btn.title       = isSaved ? 'アルバムから削除' : 'アルバムに追加';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      // お気に入り未登録なら先に登録
      if (!isFavorite(name, category)) toggleFavorite(name, category);
      toggleImageInAlbum(name, category, url);
      renderImageGrid(gridId, blockId, images, name, category);
      renderFavList();
    });

    // 画像クリックで新タブ表示
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => window.open(url, '_blank', 'noopener'));

    card.appendChild(img);
    card.appendChild(btn);
    gridEl.appendChild(card);
  });
}

/* ===== お気に入りボタン更新 ===== */
function updateFavBtn(name, category) {
  const saved = isFavorite(name, category);
  favBtn.classList.toggle('saved', saved);
  favBtn.querySelector('.fav-icon').textContent = saved ? '★' : '☆';
  favBtn.querySelector('.fav-text').textContent = saved ? 'お気に入り済み' : 'お気に入り';
}

/* ===== ① ③ 推しリスト描画 ===== */
function renderFavList() {
  const list        = loadFavorites();
  const favListEl   = document.getElementById('favList');
  const emptyHintEl = document.getElementById('favEmptyHint');
  const toolbarEl   = document.getElementById('listToolbar');

  if (list.length === 0) {
    favListEl.classList.add('hidden');
    emptyHintEl.classList.remove('hidden');
    toolbarEl.classList.add('hidden');
    document.getElementById('listResults').classList.add('hidden');
    return;
  }

  emptyHintEl.classList.add('hidden');
  toolbarEl.classList.remove('hidden');
  favListEl.classList.remove('hidden');

  const activeEl  = document.querySelector('.fav-item.active');
  const activeName = activeEl?.dataset.name;
  const activeCat  = activeEl?.dataset.category;

  favListEl.innerHTML = '';

  list.forEach(({ name, category, memo, lastChecked, lastSummary, album }) => {
    const li = document.createElement('li');
    li.className = 'fav-item';
    if (name === activeName && category === activeCat) li.classList.add('active');
    li.dataset.name     = name;
    li.dataset.category = category;

    const checkedStr = lastChecked ? relativeDate(lastChecked) : '';

    li.innerHTML = `
      <div class="fav-item-main">
        <div class="fav-item-top">
          <span class="fav-item-name">${escHtml(name)}</span>
          <span class="fav-item-cat">${escHtml(category)}</span>
          ${checkedStr ? `<span class="fav-last-checked">${escHtml(checkedStr)}</span>` : ''}
        </div>
        ${lastSummary ? `<div class="fav-summary">${escHtml(lastSummary.slice(0, 100))}…</div>` : ''}
        <div class="fav-memo-row">
          <span class="fav-memo ${memo ? '' : 'fav-memo-empty'}">${escHtml(memo || '+ メモを追加')}</span>
        </div>
        ${album?.length ? `<div class="album-strip">${album.slice(0, 5).map(u => `<img class="album-thumb" src="${escHtml(u)}" alt="" loading="lazy" onerror="this.remove()">`).join('')}${album.length > 5 ? `<span class="album-more">+${album.length - 5}</span>` : ''}</div>` : ''}
      </div>
      <button class="fav-remove-btn" aria-label="削除">✕</button>
    `;

    li.querySelector('.fav-item-main').addEventListener('click', e => {
      if (e.target.closest('.fav-memo-row')) return;
      searchFromList(name, category);
    });

    li.querySelector('.fav-memo').addEventListener('click', e => {
      e.stopPropagation();
      openMemoEditor(e.target, name, category, memo || '');
    });

    li.querySelector('.fav-remove-btn').addEventListener('click', e => {
      e.stopPropagation();
      openRemoveConfirm(li, name, category, name === activeName && category === activeCat);
    });

    favListEl.appendChild(li);
  });
}

/* ===== 削除確認 ===== */
function openRemoveConfirm(li, name, category, wasActive) {
  const removeBtn = li.querySelector('.fav-remove-btn');

  // すでに確認中なら何もしない
  if (li.querySelector('.fav-confirm')) return;

  removeBtn.classList.add('hidden');

  const confirm = document.createElement('div');
  confirm.className = 'fav-confirm';
  confirm.innerHTML = `
    <span class="fav-confirm-text">削除しますか？</span>
    <button class="fav-confirm-yes">削除</button>
    <button class="fav-confirm-no">キャンセル</button>
  `;

  removeBtn.insertAdjacentElement('beforebegin', confirm);

  confirm.querySelector('.fav-confirm-yes').addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(name, category);
    if (wasActive) document.getElementById('listResults').classList.add('hidden');
  });

  confirm.querySelector('.fav-confirm-no').addEventListener('click', e => {
    e.stopPropagation();
    confirm.remove();
    removeBtn.classList.remove('hidden');
  });
}

/* ===== ③ メモ編集 ===== */
function openMemoEditor(spanEl, name, category, currentMemo) {
  const input = document.createElement('input');
  input.type        = 'text';
  input.className   = 'fav-memo-input';
  input.value       = currentMemo;
  input.placeholder = 'メモを入力（100字以内）';
  input.maxLength   = 100;
  spanEl.replaceWith(input);
  input.focus();
  input.select();

  function save() {
    updateFavEntry(name, category, { memo: input.value.trim() });
    renderFavList();
  }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = currentMemo; input.blur(); }
  });
}

/* ===== UI ヘルパー ===== */
function showSearchLoading(v) { loadingEl.classList.toggle('hidden', !v); }

function showSearchError(msg) {
  if (msg) { errorMsgEl.textContent = msg; errorBoxEl.classList.remove('hidden'); }
  else      { errorBoxEl.classList.add('hidden'); }
}

function showListError(msg) {
  const box = document.getElementById('listErrorBox');
  const txt = document.getElementById('listErrorMsg');
  if (msg) { txt.textContent = msg; box.classList.remove('hidden'); }
  else      { box.classList.add('hidden'); }
}

/* ===== ユーティリティ ===== */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch { return dateStr; }
}

/* ① 相対日付 */
function relativeDate(isoStr) {
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7)  return `${days}日前`;
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
