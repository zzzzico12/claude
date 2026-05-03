/* ===== 設定 ===== */
const TAVILY_URL  = 'https://api.tavily.com/search';
const STORAGE_KEY = 'oshi-favorites';
const KEY_STORAGE = 'oshi-api-key';

function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || '';
}

/* ===== セキュリティユーティリティ ===== */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// http(s):// のみ許可。javascript: や data: をブロック
function sanitizeUrl(url) {
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? url : '';
  } catch { return ''; }
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
const setupScreen  = document.getElementById('setupScreen');
const apiKeyInput  = document.getElementById('apiKeyInput');
const saveKeyBtn   = document.getElementById('saveKeyBtn');
const settingsBtn  = document.getElementById('settingsBtn');
const apiKeyError  = document.getElementById('apiKeyError');

function showSetupScreen() {
  apiKeyInput.value = localStorage.getItem(KEY_STORAGE) || '';
  apiKeyError.classList.add('hidden');
  setupScreen.classList.remove('hidden');
}

function hideSetupScreen() {
  setupScreen.classList.add('hidden');
}

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  // tvly- で始まるかチェック
  if (!key.startsWith('tvly-')) {
    apiKeyError.classList.remove('hidden');
    apiKeyInput.focus();
    return;
  }
  apiKeyError.classList.add('hidden');
  localStorage.setItem(KEY_STORAGE, key);
  hideSetupScreen();
});

apiKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveKeyBtn.click();
});

apiKeyInput.addEventListener('input', () => {
  apiKeyError.classList.add('hidden');
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

/* ===== トピック切り替え ===== */
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

/* ===== 一括更新 ===== */
bulkBtn.addEventListener('click', bulkUpdate);

/* ===== 推し検索 ===== */
async function startSearch() {
  const name = searchInput.value.trim().slice(0, 50);
  if (!name || isLoading) return;

  if (!getApiKey()) { showSetupScreen(); return; }

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
  } catch {
    showSearchError('情報の取得に失敗しました。しばらくしてからお試しください。');
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
    autoAddImagesToAlbum(name, category, data.images || []);
    renderFavList();
    renderListResults(name, category, data);
    listContentEl.classList.remove('hidden');
    listResultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    showListError('情報の取得に失敗しました。しばらくしてからお試しください。');
  } finally {
    listLoadingEl.classList.add('hidden');
    isLoading = false;
  }
}

/* ===== 一括更新 ===== */
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
      autoAddImagesToAlbum(name, category, data.images || []);
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
      max_results: 8,
      language: 'ja'
    })
  });

  if (!response.ok) throw new Error(`${response.status}`);
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
  autoAddImagesToAlbum(name, category, data.images || []);
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
    const li = document.createElement('li');
    li.style.cssText = 'color:var(--t3);font-size:0.85rem;';
    li.textContent = '検索結果が見つかりませんでした。';
    listEl.appendChild(li);
    return;
  }
  results.forEach(item => {
    const safeUrl   = sanitizeUrl(item.url || '');
    const date      = item.published_date ? formatDate(item.published_date) : '';
    const domain    = safeUrl ? extractDomain(safeUrl) : '';
    const snippet   = item.content ? item.content.slice(0, 120) + '…' : '';

    const li        = document.createElement('li');
    li.className    = 'news-item';

    const dateSpan  = document.createElement('span');
    dateSpan.className   = 'news-date';
    dateSpan.textContent = date;

    const body      = document.createElement('div');
    body.className  = 'news-body';

    const link      = document.createElement('a');
    link.className  = 'news-link';
    link.href       = safeUrl || '#';
    link.target     = '_blank';
    link.rel        = 'noopener noreferrer';
    link.textContent = item.title || '';

    const snippetEl = document.createElement('div');
    snippetEl.className   = 'news-snippet';
    snippetEl.textContent = snippet;

    const sourceEl  = document.createElement('div');
    sourceEl.className   = 'news-source';
    sourceEl.textContent = domain;

    body.appendChild(link);
    body.appendChild(snippetEl);
    body.appendChild(sourceEl);
    li.appendChild(dateSpan);
    li.appendChild(body);
    listEl.appendChild(li);
  });
}

/* ===== アルバム管理 ===== */
function autoAddImagesToAlbum(name, category, images) {
  const list = loadFavorites();
  const idx  = list.findIndex(f => f.name === name && f.category === category);
  if (idx === -1) return;
  const album   = list[idx].album || [];
  const newUrls = images.map(sanitizeUrl).filter(u => u && !album.includes(u));
  if (newUrls.length === 0) return;
  list[idx].album = [...album, ...newUrls].slice(0, 50);
  saveFavorites(list);
}

function removeFromAlbum(name, category, url) {
  const list = loadFavorites();
  const idx  = list.findIndex(f => f.name === name && f.category === category);
  if (idx === -1) return;
  list[idx].album = (list[idx].album || []).filter(u => u !== url);
  saveFavorites(list);
}

/* ===== 画像グリッド描画 ===== */
function renderImageGrid(gridId, blockId, images, name, category) {
  const blockEl     = document.getElementById(blockId);
  const gridEl      = document.getElementById(gridId);
  const validImages = images.map(sanitizeUrl).filter(Boolean).slice(0, 12);

  if (validImages.length === 0) { blockEl.hidden = true; return; }

  blockEl.hidden = false;
  gridEl.innerHTML = '';

  validImages.forEach(url => {
    const card = document.createElement('div');
    card.className = 'image-card';

    const img = document.createElement('img');
    img.src   = url;
    img.alt   = '';
    img.loading        = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => card.remove());
    img.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));

    card.appendChild(img);
    gridEl.appendChild(card);
  });
}

/* ===== アルバムモーダル ===== */
function openAlbumModal(name, category) {
  const overlay = document.createElement('div');
  overlay.className = 'album-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'album-modal';

  const header = document.createElement('div');
  header.className = 'album-modal-header';

  const title = document.createElement('span');
  title.className = 'album-modal-title';

  const closeBtn = document.createElement('button');
  closeBtn.className   = 'album-modal-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const grid = document.createElement('div');
  grid.className = 'album-modal-grid';

  function renderModalGrid() {
    grid.innerHTML = '';
    const fav = loadFavorites().find(f => f.name === name && f.category === category);
    const album = fav?.album || [];

    title.textContent = `${name}のアルバム（${album.length}枚）`;

    if (album.length === 0) {
      overlay.remove();
      return;
    }

    album.forEach(url => {
      const safe = sanitizeUrl(url);
      if (!safe) return;

      const card = document.createElement('div');
      card.className = 'album-modal-card';

      const img = document.createElement('img');
      img.src            = safe;
      img.alt            = '';
      img.loading        = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => card.remove());
      img.addEventListener('click', () => window.open(safe, '_blank', 'noopener,noreferrer'));

      const removeBtn = document.createElement('button');
      removeBtn.className   = 'album-modal-remove';
      removeBtn.textContent = '✕';
      removeBtn.title       = 'アルバムから削除';
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        removeFromAlbum(name, category, url);
        renderModalGrid();
        renderFavList();
      });

      card.appendChild(img);
      card.appendChild(removeBtn);
      grid.appendChild(card);
    });
  }

  renderModalGrid();

  modal.appendChild(header);
  modal.appendChild(grid);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
}

/* ===== お気に入りボタン更新 ===== */
function updateFavBtn(name, category) {
  const saved = isFavorite(name, category);
  favBtn.classList.toggle('saved', saved);
  favBtn.querySelector('.fav-icon').textContent = saved ? '★' : '☆';
  favBtn.querySelector('.fav-text').textContent = saved ? 'お気に入り済み' : 'お気に入り';
}

/* ===== 推しリスト描画 ===== */
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

  const activeEl   = document.querySelector('.fav-item.active');
  const activeName = activeEl?.dataset.name;
  const activeCat  = activeEl?.dataset.category;

  favListEl.innerHTML = '';

  list.forEach(({ name, category, memo, lastChecked, lastSummary, album }) => {
    const li = document.createElement('li');
    li.className = 'fav-item';
    if (name === activeName && category === activeCat) li.classList.add('active');
    li.dataset.name     = name;
    li.dataset.category = category;

    // メインエリア
    const main = document.createElement('div');
    main.className = 'fav-item-main';

    // 上段：名前・カテゴリ・最終確認日
    const top = document.createElement('div');
    top.className = 'fav-item-top';

    const nameEl = document.createElement('span');
    nameEl.className   = 'fav-item-name';
    nameEl.textContent = name;

    const catEl = document.createElement('span');
    catEl.className   = 'fav-item-cat';
    catEl.textContent = category;

    top.appendChild(nameEl);
    top.appendChild(catEl);

    if (lastChecked) {
      const checkedEl = document.createElement('span');
      checkedEl.className   = 'fav-last-checked';
      checkedEl.textContent = relativeDate(lastChecked);
      top.appendChild(checkedEl);
    }

    main.appendChild(top);

    // サマリー
    if (lastSummary) {
      const summaryEl = document.createElement('div');
      summaryEl.className   = 'fav-summary';
      summaryEl.textContent = lastSummary.slice(0, 100) + '…';
      main.appendChild(summaryEl);
    }

    // メモ行
    const memoRow = document.createElement('div');
    memoRow.className = 'fav-memo-row';
    const memoSpan = document.createElement('span');
    memoSpan.className   = `fav-memo${memo ? '' : ' fav-memo-empty'}`;
    memoSpan.textContent = memo || '+ メモを追加';
    memoRow.appendChild(memoSpan);
    main.appendChild(memoRow);

    // アルバムサムネイル（タップ→モーダル）
    if (album?.length) {
      const strip = document.createElement('div');
      strip.className = 'album-strip';
      album.slice(0, 5).forEach(u => {
        const safe = sanitizeUrl(u);
        if (!safe) return;
        const thumb = document.createElement('img');
        thumb.className      = 'album-thumb';
        thumb.src            = safe;
        thumb.alt            = '';
        thumb.loading        = 'lazy';
        thumb.referrerPolicy = 'no-referrer';
        thumb.addEventListener('error', () => thumb.remove());
        strip.appendChild(thumb);
      });
      const more = document.createElement('span');
      more.className   = 'album-more';
      more.textContent = album.length > 5 ? `+${album.length - 5}` : `${album.length}枚`;
      strip.appendChild(more);
      strip.addEventListener('click', e => {
        e.stopPropagation();
        openAlbumModal(name, category);
      });
      main.appendChild(strip);
    }

    // 削除ボタン
    const removeBtn = document.createElement('button');
    removeBtn.className  = 'fav-remove-btn';
    removeBtn.setAttribute('aria-label', '削除');
    removeBtn.textContent = '✕';

    // イベント
    main.addEventListener('click', e => {
      if (e.target.closest('.fav-memo-row')) return;
      searchFromList(name, category);
    });

    memoSpan.addEventListener('click', e => {
      e.stopPropagation();
      openMemoEditor(memoSpan, name, category, memo || '');
    });

    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      openRemoveConfirm(li, name, category, name === activeName && category === activeCat);
    });

    li.appendChild(main);
    li.appendChild(removeBtn);
    favListEl.appendChild(li);
  });
}

/* ===== 削除確認 ===== */
function openRemoveConfirm(li, name, category, wasActive) {
  const removeBtn = li.querySelector('.fav-remove-btn');
  if (li.querySelector('.fav-confirm')) return;

  removeBtn.classList.add('hidden');

  const confirmEl = document.createElement('div');
  confirmEl.className = 'fav-confirm';

  const label = document.createElement('span');
  label.className   = 'fav-confirm-text';
  label.textContent = '削除しますか？';

  const yesBtn = document.createElement('button');
  yesBtn.className   = 'fav-confirm-yes';
  yesBtn.textContent = '削除';

  const noBtn = document.createElement('button');
  noBtn.className   = 'fav-confirm-no';
  noBtn.textContent = 'キャンセル';

  confirmEl.appendChild(label);
  confirmEl.appendChild(yesBtn);
  confirmEl.appendChild(noBtn);
  removeBtn.insertAdjacentElement('beforebegin', confirmEl);

  yesBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(name, category);
    if (wasActive) document.getElementById('listResults').classList.add('hidden');
  });

  noBtn.addEventListener('click', e => {
    e.stopPropagation();
    confirmEl.remove();
    removeBtn.classList.remove('hidden');
  });
}

/* ===== メモ編集 ===== */
function openMemoEditor(spanEl, name, category, currentMemo) {
  const input       = document.createElement('input');
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
function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch { return ''; }
}

function relativeDate(isoStr) {
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7)  return `${days}日前`;
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ===== Service Worker 登録 ===== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
