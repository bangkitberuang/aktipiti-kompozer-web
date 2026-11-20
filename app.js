/**
 * E-KINERJA ASN — AKTIPITI KOMPOZER WEB (v1.6)
 * Asisten & Bimbingan Harian Pekerjaan ASN Seluruh Indonesia
 */

// ============================================================================
// KONFIGURASI & STORAGE
// ============================================================================
const BUILTIN_GROQ_API_KEY = '';

const DEFAULT_CONFIG = {
  engineMode: 'local',
  groqApiKey: BUILTIN_GROQ_API_KEY,
  groqModel: 'openai/gpt-oss-120b',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  instansi: 'Dinas Komunikasi dan Informatika',
  maxKeterangan: 500,
  maxKesimpulan: 500,
  googleSheetUrl: 'https://docs.google.com/spreadsheets/d/1kaTc1yQU_4AK1YwvyLSfNn3UjvZ3iDeFwED-mgfP0E8/edit?usp=sharing',
  appsScriptUrl: ''
};

const STORAGE_KEYS = {
  CONFIG: 'ak_web_config',
  CLOUD_TEMPLATES: 'ak_web_cloud_templates',
  LAST_SYNC: 'ak_web_last_sync',
  DAILY_LOG: 'ak_web_daily_log'
};

let currentConfig = { ...DEFAULT_CONFIG };
let allActivitiesList = [];
let currentRecommendedActivity = null;
let cloudTemplates = [];
let lastCloudSyncTime = null;
let dailyLogList = [];
let deferredPrompt = null;

const sectionVariationIndices = {
  keterangan: 0,
  judul_agenda: 0,
  kesimpulan_action_plan: 0,
  peserta: 0
};

// ============================================================================
// ELEMEN DOM
// ============================================================================
const dom = {
  // Header & Status
  headerEngineBadge: document.getElementById('headerEngineBadge'),
  headerEngineText: document.getElementById('headerEngineText'),
  cloudStatusBadge: document.getElementById('cloudStatusBadge'),
  cloudStatusText: document.getElementById('cloudStatusText'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  
  // PWA Banner
  pwaInstallBanner: document.getElementById('pwaInstallBanner'),
  btnInstallPwa: document.getElementById('btnInstallPwa'),
  btnClosePwaBanner: document.getElementById('btnClosePwaBanner'),
  
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Inputs (Langkah 1)
  tanggalInput: document.getElementById('tanggalInput'),
  tanggalPreviewBadge: document.getElementById('tanggalPreviewBadge'),
  btnToday: document.getElementById('btnToday'),
  btnYesterday: document.getElementById('btnYesterday'),
  namaKegiatanInput: document.getElementById('namaKegiatanInput'),
  namaKegiatanCounter: document.getElementById('namaKegiatanCounter'),
  
  // Recommendation Box
  recActivityBadge: document.getElementById('recActivityBadge'),
  recActivityMeta: document.getElementById('recActivityMeta'),
  btnOpenCatalogModal: document.getElementById('btnOpenCatalogModal'),
  
  // Action Buttons & Alert
  alertBox: document.getElementById('alertBox'),
  alertMessage: document.getElementById('alertMessage'),
  btnGenerate: document.getElementById('btnGenerate'),
  btnGenerateText: document.getElementById('btnGenerateText'),
  btnQuickPaste: document.getElementById('btnQuickPaste'),
  btnReset: document.getElementById('btnReset'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  loadingStatusText: document.getElementById('loadingStatusText'),
  
  // Results (Langkah 2)
  resultsSection: document.getElementById('resultsSection'),
  btnCopyAll: document.getElementById('btnCopyAll'),
  btnSendToSheet: document.getElementById('btnSendToSheet'),
  
  // Recommendation in Result
  resActivityName: document.getElementById('resActivityName'),
  resTabTypeBadge: document.getElementById('resTabTypeBadge'),
  resDurationBadge: document.getElementById('resDurationBadge'),
  btnCopyRecName: document.getElementById('btnCopyRecName'),
  
  // Compliance Badges
  compKeterangan: document.getElementById('compKeterangan'),
  compKesimpulan: document.getElementById('compKesimpulan'),
  compActionPlan: document.getElementById('compActionPlan'),
  compNoBullets: document.getElementById('compNoBullets'),
  
  // Outputs & Counters
  keteranganOutput: document.getElementById('keteranganOutput'),
  keteranganCounter: document.getElementById('keteranganCounter'),
  judulAgendaOutput: document.getElementById('judulAgendaOutput'),
  judulAgendaCounter: document.getElementById('judulAgendaCounter'),
  kesimpulanOutput: document.getElementById('kesimpulanOutput'),
  kesimpulanCounter: document.getElementById('kesimpulanCounter'),
  pesertaOutput: document.getElementById('pesertaOutput'),
  pesertaCounter: document.getElementById('pesertaCounter'),
  
  // Catalog Main Tab
  catalogSearchMain: document.getElementById('catalogSearchMain'),
  catalogCategoryChips: document.querySelectorAll('.cat-chip'),
  catalogMainList: document.getElementById('catalogMainList'),
  
  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
  engineSelect: document.getElementById('engineSelect'),
  engineHint: document.getElementById('engineHint'),
  groqKeyGroup: document.getElementById('groqKeyGroup'),
  groqApiKeyInput: document.getElementById('groqApiKeyInput'),
  geminiKeyGroup: document.getElementById('geminiKeyGroup'),
  geminiApiKeyInput: document.getElementById('geminiApiKeyInput'),
  openaiKeyGroup: document.getElementById('openaiKeyGroup'),
  openaiApiKeyInput: document.getElementById('openaiApiKeyInput'),
  googleSheetUrlInput: document.getElementById('googleSheetUrlInput'),
  btnSyncSheetManual: document.getElementById('btnSyncSheetManual'),
  btnOpenSheetLink: document.getElementById('btnOpenSheetLink'),
  appsScriptUrlInput: document.getElementById('appsScriptUrlInput'),
  instansiInput: document.getElementById('instansiInput'),
  maxKeteranganInput: document.getElementById('maxKeteranganInput'),
  maxKesimpulanInput: document.getElementById('maxKesimpulanInput'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  
  // Catalog Modal
  catalogModal: document.getElementById('catalogModal'),
  btnCloseCatalogModal: document.getElementById('btnCloseCatalogModal'),
  catalogSearchInput: document.getElementById('catalogSearchInput'),
  catalogListContainer: document.getElementById('catalogListContainer'),
  
  // Toast
  toastContainer: document.getElementById('toastContainer'),
  toastMessage: document.getElementById('toastMessage')
};

// ============================================================================
// INISIALISASI APLIKASI
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  loadConfig();
  initActivitiesCatalog();
  initDateControls();
  initTabs();
  registerPwaServiceWorker();
  attachEventListeners();
  
  await initCloudMemory();
  updateEngineUi();
  updateRecommendationUi();
  renderMainCatalog();
});

// ============================================================================
// STORAGE & KONFIGURASI
// ============================================================================
function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      currentConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      // Pastikan jika groqApiKey kosong, otomatis gunakan key paten bawaan
      if (!currentConfig.groqApiKey || currentConfig.groqApiKey.trim() === '') {
        currentConfig.groqApiKey = BUILTIN_GROQ_API_KEY;
      }
      // Bersihkan jika model tersimpan adalah model yang telah didekomisioning
      if (['mixtral-8x7b-32768', 'llama-3.1-8b-instant'].includes(currentConfig.groqModel)) {
        currentConfig.groqModel = 'openai/gpt-oss-120b';
      }
    }
    const cachedTemplates = localStorage.getItem(STORAGE_KEYS.CLOUD_TEMPLATES);
    if (cachedTemplates) {
      cloudTemplates = JSON.parse(cachedTemplates);
    }
    lastCloudSyncTime = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  } catch (err) {
    console.warn('Gagal membaca config:', err);
  }
}

function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(currentConfig));
  } catch (err) {
    console.warn('Gagal menyimpan config:', err);
  }
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================
function initTabs() {
  dom.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  if (dom.btnHelpGuide) {
    dom.btnHelpGuide.addEventListener('click', () => switchTab('tab-guidance'));
  }
}

function switchTab(targetId) {
  dom.tabBtns.forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-tab') === targetId);
  });
  dom.tabContents.forEach((c) => {
    c.classList.toggle('active', c.id === targetId);
  });
  if (targetId === 'tab-catalog') {
    renderMainCatalog();
  }
}

// ============================================================================
// KATALOG 81 AKTIVITAS RESMI DISKOMINFO
// ============================================================================
function initActivitiesCatalog() {
  allActivitiesList = [];
  if (typeof DAFTAR_AKTIVITAS_UTAMA !== 'undefined' && Array.isArray(DAFTAR_AKTIVITAS_UTAMA)) {
    DAFTAR_AKTIVITAS_UTAMA.forEach((item) => {
      allActivitiesList.push({ ...item, tipe: 'Aktivitas Utama' });
    });
  }
  if (typeof DAFTAR_AKTIVITAS_TAMBAHAN !== 'undefined' && Array.isArray(DAFTAR_AKTIVITAS_TAMBAHAN)) {
    DAFTAR_AKTIVITAS_TAMBAHAN.forEach((item) => {
      allActivitiesList.push({ ...item, tipe: 'Aktivitas Tambahan' });
    });
  }

  if (allActivitiesList.length === 0) {
    allActivitiesList = [
      { id: 1, nama: 'Menyusun laporan hasil pelaksanaan tugas kedinasan', tipe: 'Aktivitas Utama', durasiTeks: '120 Menit' },
      { id: 2, nama: 'Melaksanakan peliputan dan dokumentasi kegiatan kedinasan', tipe: 'Aktivitas Utama', durasiTeks: '180 Menit' },
      { id: 3, nama: 'Mengikuti kegiatan apel pagi / upacara kedinasan', tipe: 'Aktivitas Tambahan', durasiTeks: '30 Menit' },
      { id: 4, nama: 'Mengelola dan mempublikasikan konten media sosial pemerintah', tipe: 'Aktivitas Utama', durasiTeks: '120 Menit' },
      { id: 5, nama: 'Melaksanakan live streaming siaran kegiatan kedinasan resmi', tipe: 'Aktivitas Utama', durasiTeks: '180 Menit' }
    ];
  }

  currentRecommendedActivity = allActivitiesList[0];
}

// ============================================================================
// PENGATURAN TANGGAL & HARI
// ============================================================================
function getTodayIsoDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayIsoDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatIndonesianDate(isoStr) {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const dateObj = new Date(year, monthIndex, day);
  const hari = isNaN(dateObj.getTime()) ? '' : `${namaHari[dateObj.getDay()]}, `;
  const bulan = namaBulan[monthIndex] || '';

  return `${hari}${day} ${bulan} ${year}`;
}

function initDateControls() {
  const today = getTodayIsoDate();
  dom.tanggalInput.value = today;
  updateTanggalPreview(today);

  dom.tanggalInput.addEventListener('change', () => {
    updateTanggalPreview(dom.tanggalInput.value);
    dom.btnToday.classList.remove('active');
    dom.btnYesterday.classList.remove('active');
  });

  dom.btnToday.addEventListener('click', () => {
    const t = getTodayIsoDate();
    dom.tanggalInput.value = t;
    updateTanggalPreview(t);
    dom.btnToday.classList.add('active');
    dom.btnYesterday.classList.remove('active');
  });

  dom.btnYesterday.addEventListener('click', () => {
    const y = getYesterdayIsoDate();
    dom.tanggalInput.value = y;
    updateTanggalPreview(y);
    dom.btnYesterday.classList.add('active');
    dom.btnToday.classList.remove('active');
  });
}

function updateTanggalPreview(isoStr) {
  if (dom.tanggalPreviewBadge) {
    dom.tanggalPreviewBadge.textContent = formatIndonesianDate(isoStr) || 'Tanggal belum dipilih';
  }
}

// ============================================================================
// SINKRONISASI MEMORI GOOGLE SHEET (111 TEMPLATE DISKOMINFO)
// ============================================================================
function buildGoogleSheetCsvUrl(url) {
  if (!url) return '';
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return url;
  const sheetId = match[1];

  let gid = '0';
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch) gid = gidMatch[1];

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function parseCsvToRows(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && currentRow.some(c => c.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(c => c.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function processCsvDataToTemplates(rows) {
  if (!rows || rows.length === 0) return [];

  let startIndex = 0;
  if (rows[0] && rows[0].some(col => /kategori|kegiatan|keterangan|judul|kesimpulan|peserta/i.test(col))) {
    startIndex = 1;
  }

  const list = [];
  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) continue;

    const kategori = (r[0] || '').trim();
    const kataKunci = (r[1] || '').trim();
    const namaKegiatan = (r[2] || '').trim();
    const keterangan = (r[3] || '').trim();
    const judulAgenda = (r[4] || '').trim();
    const kesimpulan = (r[5] || '').trim();
    const peserta = (r[6] || '').trim();

    if (keterangan || judulAgenda || kesimpulan || namaKegiatan) {
      list.push({
        kategori: kategori || 'Umum',
        kataKunci,
        namaKegiatan,
        keterangan,
        judulAgenda,
        kesimpulan,
        peserta
      });
    }
  }
  return list;
}

async function initCloudMemory() {
  if (cloudTemplates.length > 0) {
    updateCloudStatusUi();
    syncFromGoogleSheet(currentConfig.googleSheetUrl, true);
    return;
  }
  await syncFromGoogleSheet(currentConfig.googleSheetUrl, true);
}

async function syncFromGoogleSheet(sheetUrl, isAuto = false) {
  if (!sheetUrl) return;
  const csvUrl = buildGoogleSheetCsvUrl(sheetUrl);

  if (dom.cloudStatusBadge) {
    dom.cloudStatusBadge.className = 'cloud-badge syncing';
    dom.cloudStatusText.textContent = 'Menyinkronkan...';
  }

  try {
    let csvText = '';
    try {
      const resp = await fetch(csvUrl, { cache: 'no-cache' });
      if (resp.ok) {
        csvText = await resp.text();
      }
    } catch (_) {}

    // Fallback offline: gunakan user_sheet_live.csv
    if (!csvText) {
      const localResp = await fetch('user_sheet_live.csv');
      if (localResp.ok) {
        csvText = await localResp.text();
      }
    }

    if (!csvText) throw new Error('Data sheet kosong');

    const rows = parseCsvToRows(csvText);
    const parsed = processCsvDataToTemplates(rows);

    if (parsed.length > 0) {
      cloudTemplates = parsed;
      lastCloudSyncTime = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEYS.CLOUD_TEMPLATES, JSON.stringify(cloudTemplates));
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, lastCloudSyncTime);
      } catch (_) {}
    }

    updateCloudStatusUi();
    if (!isAuto) {
      showToast(`✅ Berhasil! ${cloudTemplates.length} template memori disinkronkan.`);
    }
  } catch (err) {
    console.warn('Sync gagal:', err);
    updateCloudStatusUi();
    if (!isAuto) {
      showToast('Gagal sinkronisasi. Pastikan link Google Sheet disetel "Siapa saja dapat melihat".');
    }
  }
}

function updateCloudStatusUi() {
  if (!dom.cloudStatusBadge) return;
  const count = cloudTemplates.length;
  if (count > 0) {
    dom.cloudStatusBadge.className = 'cloud-badge';
    dom.cloudStatusText.textContent = `${count} Template`;
  } else {
    dom.cloudStatusBadge.className = 'cloud-badge';
    dom.cloudStatusText.textContent = `Belum Terhubung`;
  }
}

// ============================================================================
// MESIN PENCOCOKAN MULTI-TOKEN (TOKEN SCORING)
// ============================================================================
const TEMPLATE_SPECIFIC_QUALIFIERS = [
  'nyari gawe', 'wakil gubernur', 'hari jadi', 'sp4n', 'lapor', 'ppid',
  'instagram', 'tiktok', 'youtube', 'twitter', 'hoaks', 'podcast', 'siniar',
  'senam', 'upacara', 'zoom', 'webinar', 'bimtek', 'kliping', 'fact sheet',
  'lembar fakta', 'faq', 'disposisi', 'audiensi', 'feature', 'kebencanaan',
  'cuaca', 'media gathering', 'talking points', 'kalender editorial', 'poster',
  'banner', 'kim', 'adpim', 'pameran', 'festival', 'voice over', 'motion graphic',
  'skrip', 'kunjungan kerja', 'harian', 'bulanan', 'mingguan', 'periodik', 'reels',
  'komisi informasi', 'usulan', 'anggaran', 'kerangka acuan', 'kak',
  'presentasi', 'nota dinas', 'portal berita', 'website', 'komentar',
  'pesan langsung', 'survei', 'sambutan', 'pidato', 'krisis', 'literasi digital',
  'analisis media', 'publikasi'
];

function hasWholePhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(text);
}

function findMatchingCloudTemplate(topic) {
  if (!cloudTemplates || cloudTemplates.length === 0) return null;
  const clean = (topic || '').toLowerCase().replace(/[.,;:!?\s]+$/g, '').trim();
  if (!clean) return null;

  const STOPWORDS = new Set([
    'dan', 'yang', 'untuk', 'pada', 'atau', 'dari', 'dalam', 'oleh', 'dengan',
    'serta', 'dapat', 'akan', 'telah', 'agar', 'bagi', 'karena', 'tentang',
    'melalui', 'secara', 'antara', 'terkait', 'sebagai', 'melakukan', 'melaksanakan',
    'kegiatan', 'pelaksanaan', 'penyelenggaraan', 'mengikuti', 'menghadiri',
    'provinsi', 'jawa', 'barat', 'pemerintah', 'pemprov', 'jabar', 'kedinasan',
    'resmi', 'bahan', 'informasi', 'komunikasi', 'publik', 'lingkungan'
  ]);

  const GENERIC_LOW_WEIGHT = new Set([
    'menyusun', 'mengelola', 'membuat', 'memantau', 'meliput', 'mendukung',
    'memperbarui', 'mengidentifikasi', 'merekap', 'menyiapkan', 'bidang',
    'ikp', 'dinas', 'acara', 'program', 'tim', 'pegawai', 'data', 'capaian',
    'kinerja', 'aplikasi', 'layanan', 'kerja', 'pimpinan'
  ]);

  const queryTokens = clean
    .split(/[\s,.\-\/()!?“”"']+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
  const queryStrongCount = queryTokens.filter(w => !GENERIC_LOW_WEIGHT.has(w)).length;
  const queryIsRapat = /\b(?:rapat|rakor|sidang|pertemuan)\b/i.test(clean);

  let bestMatch = null;
  let highestScore = 0;

  for (const t of cloudTemplates) {
    const namaNorm = (t.namaKegiatan || '').toLowerCase().replace(/[.,;:!?\s]+$/g, '').trim();
    const judulNorm = (t.judulAgenda || '').toLowerCase().replace(/[.,;:!?\s]+$/g, '').trim();
    const keyList = (t.kataKunci || '').toLowerCase().split(/[,;]+/).map(k => k.trim()).filter(Boolean);
    const targetText = `${keyList.join(' ')} ${namaNorm} ${judulNorm}`.trim();

    const templateIsRapat = /\brapat\b/i.test(targetText);
    if (templateIsRapat !== queryIsRapat) {
      continue;
    }

    let score = 0;
    let isExactPhraseMatch = false;

    // 1. Exact atau sub-frasa kuat
    if ((namaNorm && (clean === namaNorm || (clean.length >= 12 && (clean.includes(namaNorm) || namaNorm.includes(clean))))) ||
        (judulNorm && (clean === judulNorm || (clean.length >= 12 && (clean.includes(judulNorm) || judulNorm.includes(clean)))))) {
      score += 60;
      isExactPhraseMatch = true;
    }

    for (const k of keyList) {
      if (k.length >= 4 && (clean.includes(k) || (clean.length >= 10 && k.includes(clean)))) {
        score += Math.min(35, k.length);
        if (k.length >= 15) isExactPhraseMatch = true;
      }
    }

    // 2. Pencocokan token bermakna (membedakan kata kerja umum vs kata kunci topik)
    let strongMatches = 0;
    for (const token of queryTokens) {
      if (hasWholePhrase(targetText, token)) {
        const isGeneric = GENERIC_LOW_WEIGHT.has(token);
        score += isGeneric ? token.length * 0.4 : token.length * 1.6;
        if (!isGeneric) strongMatches++;
      }
    }

    // 3. Penalti / bonus untuk penanda program, kanal, atau periode spesifik
    for (const q of TEMPLATE_SPECIFIC_QUALIFIERS) {
      const inTarget = hasWholePhrase(targetText, q);
      const inQuery = hasWholePhrase(clean, q);
      if (inTarget && inQuery) {
        score += 25;
      } else if (inTarget && !inQuery) {
        score -= 30;
      }
    }

    const strongRatioOk = (strongMatches / Math.max(1, queryStrongCount)) >= 0.5;
    const hasEnoughSubstance = isExactPhraseMatch || (strongMatches >= 2 && strongRatioOk);
    if (hasEnoughSubstance && score >= 18 && score > highestScore) {
      highestScore = score;
      bestMatch = t;
    }
  }

  return bestMatch;
}

// ============================================================================
// PENCOCOKAN FORM AKTIVITAS E-KINERJA
// ============================================================================
function findBestMatchingActivities(inputText, limit = 3) {
  if (!allActivitiesList || allActivitiesList.length === 0) return [];
  if (!inputText || inputText.trim().length === 0) return allActivitiesList.slice(0, limit);

  const clean = inputText.toLowerCase().trim();
  const scored = allActivitiesList.map((act) => {
    let score = 0;
    const actName = act.nama.toLowerCase();

    if (actName === clean) score += 100;
    else if (actName.includes(clean) || clean.includes(actName)) score += 50;

    const words = clean.split(/\s+/).filter(w => w.length >= 3);
    for (const w of words) {
      if (actName.includes(w)) score += 15;
    }

    return { ...act, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function updateRecommendationUi() {
  if (currentRecommendedActivity) {
    dom.recActivityBadge.textContent = `${currentRecommendedActivity.nama} (#${currentRecommendedActivity.id})`;
    dom.recActivityMeta.textContent = `Kategori: ${currentRecommendedActivity.tipe} | Standar Durasi: ${currentRecommendedActivity.durasiTeks || '60 Menit'}`;
  }
}

// ============================================================================
// NORMALISASI BAHASA INDONESIA BAKU (EYD V / KBBI)
// ============================================================================
const PROPER_INLINE_MAP = {
  asn: 'ASN', ikp: 'IKP', ppid: 'PPID', bkd: 'BKD', bkn: 'BKN', sop: 'SOP',
  faq: 'FAQ', kak: 'KAK', dip: 'DIP', opd: 'OPD', skpd: 'SKPD', spbe: 'SPBE',
  fgd: 'FGD', hpt: 'HPT', pad: 'PAD', kim: 'KIM', tik: 'TIK', it: 'IT', ai: 'AI',
  'sp4n-lapor': 'SP4N-LAPOR!', 'sp4n-lapor!': 'SP4N-LAPOR!', 'e-kinerja': 'e-Kinerja',
  jabar: 'Jabar', jawa: 'Jawa', barat: 'Barat', diskominfo: 'Diskominfo',
  pemprov: 'Pemprov', gubernur: 'Gubernur', adpim: 'Adpim', zoom: 'Zoom',
  instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', twitter: 'Twitter',
  whatsapp: 'WhatsApp', google: 'Google', indonesia: 'Indonesia'
};

const COMMON_ACTIVITY_WORDS_LOWER = new Set([
  'apel', 'pagi', 'siang', 'sore', 'malam', 'rapat', 'koordinasi', 'evaluasi',
  'monitoring', 'kegiatan', 'kedinasan', 'resmi', 'daring', 'luring', 'online',
  'offline', 'live', 'streaming', 'siaran', 'langsung', 'dokumentasi', 'visual',
  'media', 'sosial', 'konferensi', 'pers', 'komunikasi', 'publik', 'informasi',
  'berita', 'konten', 'arsip', 'administrasi', 'dokumen', 'laporan', 'kinerja',
  'harian', 'mingguan', 'bulanan', 'tahunan', 'bidang', 'tim', 'acara',
  'peringatan', 'persiapan', 'program', 'layanan', 'pelayanan', 'masyarakat',
  'upacara', 'bendera', 'senam', 'webinar', 'bimtek', 'pelatihan', 'sosialisasi',
  'forum', 'audiensi', 'konsultasi', 'diskusi', 'sidang', 'rakor', 'briefing',
  'pimpinan', 'perangkat', 'daerah', 'instansi', 'pemerintah', 'internal',
  'eksternal', 'teknis', 'pengelolaan', 'pengarsipan', 'penyusunan',
  'pelaksanaan', 'pemantauan', 'pengumpulan', 'penyiapan', 'identifikasi',
  'rekapitulasi', 'dukungan', 'pembaruan', 'publikasi', 'naskah', 'data',
  'bahan', 'isu', 'bersama', 'secara', 'melalui', 'dalam', 'pada', 'dan', 'atau'
]);

const TITLE_LOWERCASE_PARTICLES = new Set([
  'dan', 'atau', 'serta', 'yang', 'pada', 'di', 'ke', 'dari', 'untuk', 'guna',
  'demi', 'dengan', 'secara', 'melalui', 'dalam', 'terhadap', 'tentang',
  'mengenai', 'bagi', 'oleh', 'sebagai', 'antar', 'hingga', 'sampai', 'via',
  'bersama'
]);

const EVENT_NOUN_REGEX = /^(?:apel|upacara|rapat|sidang|webinar|bimbingan\s+teknis|bimtek|pelatihan|senam|forum|technical\s+meeting|sosialisasi|konferensi|audiensi|diskusi|diklat|workshop|seminar|rakor|briefing)\b/i;

const ACTION_NOUN_REGEX = /^(?:live\s+streaming|siaran|dokumentasi|monitoring|pemantauan|peliputan|koordinasi|verifikasi|identifikasi|pengelolaan|pengumpulan|penyusunan|uji\s+coba|gladi|apel|upacara|rapat|evaluasi|publikasi|sosialisasi|audiensi|konsultasi|perekaman|penyiaran|pelaporan|pengarsipan|pengawasan|pendampingan|peninjauan|pembahasan|penanganan|tindak\s+lanjut|analisis|penyuntingan|produksi|pencatatan|pemeriksaan|penyesuaian|pembaruan|rekapitulasi)\b/i;

const ACTION_NOUN_TITLE_REGEX = /^(?:Pelaksanaan|Penyelenggaraan|Penyusunan|Pengelolaan|Pemantauan|Peliputan|Dukungan|Identifikasi|Pembuatan|Pengarsipan|Penanganan|Tindak Lanjut|Analisis|Penyiapan|Pemeriksaan|Penyuntingan|Produksi|Perancangan|Pembangunan|Publikasi|Sosialisasi|Pendampingan|Inventarisasi|Fasilitasi|Pengumpulan|Penyampaian|Evaluasi|Verifikasi|Koordinasi|Penelaahan|Penataan|Pencatatan|Keikutsertaan|Kehadiran|Pemberian)\b/i;

const VERB_NOMINALIZATION_RULES = [
  [/^mengikuti\s+(?:kegiatan|pelaksanaan)\s+/i, (rest) => EVENT_NOUN_REGEX.test(rest) ? rest : `keikutsertaan dalam ${rest}`],
  [/^mengikuti\s+/i, (rest) => EVENT_NOUN_REGEX.test(rest) ? rest : `keikutsertaan dalam ${rest}`],
  [/^menghadiri\s+(?:kegiatan|pelaksanaan)\s+/i, (rest) => EVENT_NOUN_REGEX.test(rest) ? rest : `kehadiran dalam ${rest}`],
  [/^menghadiri\s+/i, (rest) => EVENT_NOUN_REGEX.test(rest) ? rest : `kehadiran dalam ${rest}`],
  [/^melaksanakan\s+/i, (rest) => ACTION_NOUN_REGEX.test(rest) ? rest : `pelaksanaan ${rest}`],
  [/^melakukan\s+/i, (rest) => ACTION_NOUN_REGEX.test(rest) ? rest : `pelaksanaan ${rest}`],
  [/^menyelenggarakan\s+/i, (rest) => ACTION_NOUN_REGEX.test(rest) ? rest : `penyelenggaraan ${rest}`],
  [/^menyusun\s+dan\s+memperbarui\s+/i, (rest) => `penyusunan dan pembaruan ${rest}`],
  [/^menyusun\s+dan\s+menyampaikan\s+/i, (rest) => `penyusunan dan penyampaian ${rest}`],
  [/^menyusun\s+/i, (rest) => `penyusunan ${rest}`],
  [/^mengelola\s+dan\s+memperbarui\s+/i, (rest) => `pengelolaan dan pembaruan ${rest}`],
  [/^mengelola\s+dan\s+mempublikasikan\s+/i, (rest) => `pengelolaan dan publikasi ${rest}`],
  [/^mengelola\s+/i, (rest) => `pengelolaan ${rest}`],
  [/^memperbarui\s+/i, (rest) => `pembaruan ${rest}`],
  [/^mengidentifikasi\s+dan\s+merekapitulasi\s+/i, (rest) => `identifikasi dan rekapitulasi ${rest}`],
  [/^mengidentifikasi\s+dan\s+merekap\s+/i, (rest) => `identifikasi dan rekapitulasi ${rest}`],
  [/^mengidentifikasi\s+/i, (rest) => `identifikasi ${rest}`],
  [/^merekapitulasi\s+/i, (rest) => `rekapitulasi ${rest}`],
  [/^merekap\s+/i, (rest) => `rekapitulasi ${rest}`],
  [/^mendukung\s+pelaksanaan\s+/i, (rest) => `dukungan pelaksanaan ${rest}`],
  [/^mendukung\s+kegiatan\s+/i, (rest) => `dukungan kegiatan ${rest}`],
  [/^mendukung\s+/i, (rest) => `dukungan ${rest}`],
  [/^membuat\s+/i, (rest) => `pembuatan ${rest}`],
  [/^memantau\s+/i, (rest) => `pemantauan ${rest}`],
  [/^meliput\s+dan\s+mendokumentasikan\s+/i, (rest) => `peliputan dan dokumentasi ${rest}`],
  [/^meliput\s+/i, (rest) => `peliputan ${rest}`],
  [/^mendokumentasikan\s+/i, (rest) => `dokumentasi ${rest}`],
  [/^menindaklanjuti\s+/i, (rest) => `tindak lanjut ${rest}`],
  [/^menganalisis\s+/i, (rest) => `analisis ${rest}`],
  [/^menyiapkan\s+dan\s+memeriksa\s+/i, (rest) => `penyiapan dan pemeriksaan ${rest}`],
  [/^menyiapkan\s+/i, (rest) => `penyiapan ${rest}`],
  [/^memeriksa\s+/i, (rest) => `pemeriksaan ${rest}`],
  [/^menyunting\s+dan\s+menyelaraskan\s+/i, (rest) => `penyuntingan dan penyelarasan ${rest}`],
  [/^menyunting\s+/i, (rest) => `penyuntingan ${rest}`],
  [/^memproduksi\s+/i, (rest) => `produksi ${rest}`],
  [/^mendesain\s+/i, (rest) => `perancangan desain ${rest}`],
  [/^menjawab\s+/i, (rest) => `penanganan dan pemberian jawaban ${rest}`],
  [/^membangun\s+/i, (rest) => `pembangunan ${rest}`],
  [/^mempublikasikan\s+/i, (rest) => `publikasi ${rest}`],
  [/^memublikasikan\s+/i, (rest) => `publikasi ${rest}`],
  [/^mensosialisasikan\s+/i, (rest) => `sosialisasi ${rest}`],
  [/^menyosialisasikan\s+/i, (rest) => `sosialisasi ${rest}`],
  [/^mengarsipkan\s+/i, (rest) => `pengarsipan ${rest}`],
  [/^menangani\s+/i, (rest) => `penanganan ${rest}`],
  [/^mendampingi\s+/i, (rest) => `pendampingan ${rest}`],
  [/^menginventarisir\s+/i, (rest) => `inventarisasi ${rest}`],
  [/^menginventarisasi\s+/i, (rest) => `inventarisasi ${rest}`],
  [/^memfasilitasi\s+/i, (rest) => `fasilitasi ${rest}`],
  [/^mengumpulkan\s+/i, (rest) => `pengumpulan ${rest}`],
  [/^menyampaikan\s+/i, (rest) => `penyampaian ${rest}`],
  [/^mengevaluasi\s+/i, (rest) => `evaluasi ${rest}`],
  [/^memverifikasi\s+/i, (rest) => `verifikasi ${rest}`],
  [/^meng(?:k)?oordinasikan\s+/i, (rest) => `koordinasi ${rest}`],
  [/^berkoordinasi\s+/i, (rest) => `koordinasi ${rest}`],
  [/^menelaah\s+/i, (rest) => `penelaahan ${rest}`],
  [/^mencatat\s+/i, (rest) => `pencatatan ${rest}`]
];

function normalizeInlineToken(token, idx, allTokens) {
  const m = token.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/);
  if (!m) return token;
  const [, lead, core, trail] = m;
  if (!core) return token;

  if (core.includes('/')) {
    const parts = core.split('/').map((p, pIdx) => normalizeInlineToken(p, idx === 0 && pIdx === 0 ? 0 : 1, allTokens));
    return lead + parts.join('/') + trail;
  }

  const lower = core.toLowerCase();
  if (PROPER_INLINE_MAP[lower]) {
    return lead + PROPER_INLINE_MAP[lower] + trail;
  }

  const nextLower = (allTokens[idx + 1] || '').replace(/[^A-Za-z0-9-]/g, '').toLowerCase();
  if ((lower === 'provinsi' && (nextLower === 'jawa' || nextLower === 'jabar')) ||
      (lower === 'pemerintah' && nextLower === 'provinsi')) {
    return lead + lower.charAt(0).toUpperCase() + lower.slice(1) + trail;
  }

  if (/^[A-Z0-9-]{2,}$/.test(core) && /[A-Z]/.test(core)) {
    return token;
  }

  if (idx === 0 || COMMON_ACTIVITY_WORDS_LOWER.has(lower)) {
    return lead + lower + trail;
  }

  return token;
}

function normalizeTitleToken(token, idx) {
  const m = token.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/);
  if (!m) return token;
  const [, lead, core, trail] = m;
  if (!core) return token;

  if (core.includes('/')) {
    const parts = core.split('/').map((p, pIdx) => normalizeTitleToken(p, idx === 0 && pIdx === 0 ? 0 : 1));
    return lead + parts.join('/') + trail;
  }

  const lower = core.toLowerCase();
  if (PROPER_INLINE_MAP[lower]) {
    return lead + PROPER_INLINE_MAP[lower] + trail;
  }

  if (/^[A-Z0-9-]{2,}$/.test(core) && /[A-Z]/.test(core)) {
    return token;
  }

  if (idx > 0 && TITLE_LOWERCASE_PARTICLES.has(lower)) {
    return lead + lower + trail;
  }

  return lead + lower.charAt(0).toUpperCase() + lower.slice(1) + trail;
}

function formatIndonesianActivityPhrases(rawText) {
  const cleaned = (rawText || '').replace(/\s+/g, ' ').replace(/[.,;:!?\-\s]+$/g, '').trim();
  if (!cleaned) {
    return { raw: '', nounPhrase: 'aktivitas kedinasan', titlePhrase: 'Aktivitas Kedinasan' };
  }

  // Hapus pembuka redundan seperti "Melaksanakan kegiatan ..." / "Melakukan kegiatan ..."
  let work = cleaned.replace(/^(?:melaksanakan|melakukan|menyelenggarakan)\s+kegiatan\s+/i, '').trim();
  if (work.length < 5) work = cleaned;

  for (const [regex, transform] of VERB_NOMINALIZATION_RULES) {
    if (regex.test(work)) {
      const rest = work.replace(regex, '').trim();
      if (rest.length >= 3) {
        work = transform(rest);
      }
      break;
    }
  }

  const tokens = work.split(/\s+/);
  const nounPhrase = tokens.map((t, i) => normalizeInlineToken(t, i, tokens)).join(' ');
  const titlePhrase = tokens.map((t, i) => normalizeTitleToken(t, i)).join(' ');

  return { raw: cleaned, nounPhrase, titlePhrase };
}

function normalizeKegiatanText(rawText) {
  return formatIndonesianActivityPhrases(rawText).nounPhrase;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// MESIN CERDAS KEDINASAN ASN (LOCAL SMART ENGINE)
// ============================================================================
function analyzeActivityContext(topic) {
  const t = (topic || '').toLowerCase();

  let kategori = 'Pengelolaan Administrasi dan Pelaporan';
  let aktivitas = 'pengumpulan bahan kerja, koordinasi teknis, serta verifikasi kelengkapan administrasi';
  let output = 'berkas data dukung dan dokumen administrasi kedinasan yang tertata rapi';
  let manfaat = 'akuntabilitas kinerja organisasi dan kelancaran pelayanan publik';
  let tindakLanjut = 'penelaahan berkala dan pelaporan resmi kepada atasan langsung';

  if (/\b(?:apel|upacara|briefing|senam)\b/.test(t)) {
    kategori = 'Kedisiplinan dan Pengarahan Kedinasan';
    aktivitas = 'penerimaan arahan pimpinan, konsolidasi internal, serta penegakan disiplin aparatur';
    output = 'catatan arahan pimpinan dan rekapitulasi kehadiran kedinasan';
    manfaat = 'penguatan integritas, kedisiplinan, dan kesiapan kerja aparatur';
    tindakLanjut = 'pelaksanaan instruksi pimpinan dalam tugas harian';
  } else if (/live\s*streaming|\bsiaran\b|\bpodcast\b|\bsiniar\b/.test(t)) {
    kategori = 'Komunikasi dan Penyiaran Digital';
    aktivitas = 'pengecekan perangkat penyiaran, pemantauan kualitas audio dan visual, serta pengendalian jalannya siaran';
    output = 'tayangan dan rekaman siaran langsung yang stabil serta mudah diakses publik';
    manfaat = 'perluasan jangkauan informasi publik dan keterbukaan agenda pemerintah';
    tindakLanjut = 'evaluasi teknis penyiaran dan pengarsipan materi siaran digital';
  } else if (/\b(?:sosmed|medsos|instagram|youtube|tiktok|twitter)\b|media\s+sosial|\bkonten\b|\bdesain\b|\binfografis\b|\bposter\b|\breels\b/.test(t)) {
    kategori = 'Pengelolaan Konten dan Media Publikasi';
    aktivitas = 'kurasi materi informasi, penyusunan narasi komunikatif, serta penyiapan materi visual publikasi';
    output = 'materi publikasi digital, desain visual, dan laporan ketercapaian informasi';
    manfaat = 'peningkatan literasi publik dan penyebaran informasi kebijakan pemerintah secara efektif';
    tindakLanjut = 'pemantauan respons audiens dan penjadwalan konten publikasi berkala';
  } else if (/\b(?:dokumentasi|foto|video|liputan|peliputan)\b/.test(t) && !/\b(?:arsip|pengarsipan|administrasi)\b/.test(t)) {
    kategori = 'Dokumentasi dan Pengarsipan Kedinasan';
    aktivitas = 'pengambilan foto dan video lapangan, pencatatan kronologis agenda, serta kurasi materi visual';
    output = 'aset dokumentasi foto, video, dan catatan kronologis kegiatan';
    manfaat = 'ketersediaan arsip visual kedinasan dan bahan publikasi resmi instansi';
    tindakLanjut = 'pengarsipan aset visual ke repositori digital dan distribusi kepada tim publikasi';
  } else if (/\b(?:konferensi|rilis|humas|komunikasi publik|media gathering)\b/.test(t)) {
    kategori = 'Komunikasi Publik dan Kehumasan';
    aktivitas = 'penyiapan materi informasi, koordinasi dengan narasumber dan insan media, serta pendampingan publikasi';
    output = 'bahan rilis resmi, dokumentasi pelaksanaan, dan catatan keterangan narasumber';
    manfaat = 'penyampaian informasi resmi pemerintah secara akurat, seragam, dan terkoordinasi';
    tindakLanjut = 'distribusi siaran pers dan pemantauan pemberitaan lanjutan';
  } else if (/\b(?:isu|monitoring|pemantauan|sentimen|kliping|hoaks)\b/.test(t)) {
    kategori = 'Pemantauan dan Analisis Isu Publik';
    aktivitas = 'penelusuran pemberitaan media, identifikasi isu strategis, serta pemetaan sentimen publik';
    output = 'laporan pemantauan isu harian dan telaahan komunikasi publik';
    manfaat = 'deteksi dini isu strategis dan ketepatan respons komunikasi pemerintah';
    tindakLanjut = 'penyampaian ringkasan isu kepada pimpinan guna mendukung pengambilan kebijakan';
  } else if (/\b(?:rapat|koordinasi|sidang|konsolidasi|audiensi|konsultasi|fgd|diskusi|rakor)\b/.test(t)) {
    kategori = 'Koordinasi dan Kolaborasi Kedinasan';
    aktivitas = 'pembahasan substansi agenda, penyelarasan program kerja, serta perumusan kesepakatan bersama';
    output = 'notulensi rapat, daftar hadir, dan rumusan kesepakatan tindak lanjut';
    manfaat = 'sinkronisasi program kerja dan penguatan sinergi antarunit kerja';
    tindakLanjut = 'pendistribusian notulensi dan pemantauan realisasi kesepakatan';
  } else if (/\b(?:pelatihan|bimtek|workshop|sosialisasi|webinar|diklat)\b/.test(t)) {
    kategori = 'Pengembangan Kompetensi dan Edukasi';
    aktivitas = 'penelaahan materi teknis, diskusi interaktif bersama narasumber, serta pendalaman substansi';
    output = 'ringkasan materi pelatihan, catatan implementasi, dan bukti keikutsertaan';
    manfaat = 'peningkatan kapasitas kompetensi aparatur dan mutu pelaksanaan tugas';
    tindakLanjut = 'penerapan materi dalam tugas harian dan pelaporan kepada pimpinan';
  }

  return { kategori, aktivitas, output, manfaat, tindakLanjut };
}

function truncateAtWordBoundary(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  const sub = text.substring(0, maxLength);
  const lastSpace = sub.lastIndexOf(' ');
  return (lastSpace > 30 ? sub.substring(0, lastSpace) : sub).replace(/[,;:\-\s]+$/g, '').trim();
}

function findLastSentenceEnd(text, maxIdx) {
  const limit = Math.min(text.length - 1, maxIdx);
  let best = -1;
  for (let i = 0; i <= limit; i++) {
    const ch = text[i];
    if (ch !== '.' && ch !== '?' && ch !== '!') continue;
    if (ch === '!' && i < text.length - 1 && !/^\s+[A-Z]/.test(text.slice(i + 1))) continue;
    const prefix = text.slice(Math.max(0, i - 12), i + 1);
    if (/\b(?:No|Tgl|Dr|Drs|Ir|Hj|S\.Sos|S\.Kom|M\.Si|a\.n|u\.b|dll|dsb|dst|dkk)\.$/.test(prefix)) continue;
    if (i === text.length - 1 || /\s/.test(text[i + 1])) {
      best = i;
    }
  }
  return best;
}

function extractFirstSentence(text) {
  if (!text) return '';
  const clean = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch !== '.' && ch !== '?' && ch !== '!') continue;
    if (ch === '!' && i < clean.length - 1 && !/^\s+[A-Z]/.test(clean.slice(i + 1))) continue;
    const prefix = clean.slice(Math.max(0, i - 12), i + 1);
    if (/\b(?:No|Tgl|Dr|Drs|Ir|Hj|S\.Sos|S\.Kom|M\.Si|a\.n|u\.b|dll|dsb|dst|dkk)\.$/.test(prefix)) continue;
    if (i === clean.length - 1 || /\s/.test(clean[i + 1])) {
      return clean.slice(0, i + 1).trim();
    }
  }
  return clean.endsWith('.') ? clean : `${clean}.`;
}

function stripTrailingDanglingWords(clause) {
  return clause
    .replace(/[,;:\s]+$/g, '')
    .replace(/\s+(?:dan|serta|atau|yang|dengan|untuk|pada|di|ke|dari|secara|melalui|dalam|guna|sebagai|berupa)$/i, '')
    .replace(/[,;:\s]+$/g, '')
    .trim();
}

function fitKedinasanText(text, minLen = 300, maxLen = 500) {
  let clean = (text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const padKalimatList = [
    ' Seluruh tahapan pelaksanaan kegiatan didokumentasikan secara tertib sebagai bagian dari akuntabilitas kinerja organisasi.',
    ' Hasil pelaksanaan tugas selanjutnya dilaporkan kepada pimpinan sebagai bahan evaluasi dan tindak lanjut kedinasan.'
  ];

  if (clean.length < minLen) {
    clean = clean.replace(/[.,;:\-\s]+$/g, '').trim() + '.';
    for (const pad of padKalimatList) {
      if (clean.length >= minLen) break;
      if ((clean + pad).length <= maxLen) {
        clean += pad;
      } else {
        clean += pad;
        break;
      }
    }
  }

  if (clean.length > maxLen) {
    const sentenceEnd = findLastSentenceEnd(clean, maxLen - 1);
    if (sentenceEnd >= minLen - 1) {
      return clean.slice(0, sentenceEnd + 1).trim();
    }

    // Jika tidak ada batas kalimat utuh >= minLen, potong di batas klausa (koma / titik koma)
    const sub = clean.slice(0, maxLen - 1);
    const clauseIdx = Math.max(sub.lastIndexOf(', '), sub.lastIndexOf('; '));
    if (clauseIdx >= minLen - 1) {
      const trimmed = stripTrailingDanglingWords(sub.slice(0, clauseIdx));
      if (trimmed.length >= minLen - 1) {
        return `${trimmed}.`;
      }
    }

    const lastSpace = sub.lastIndexOf(' ');
    const fallbackCut = stripTrailingDanglingWords(lastSpace >= minLen - 1 ? sub.slice(0, lastSpace) : sub);
    return `${fallbackCut}.`;
  }

  if (!/[.!?]$/.test(clean)) {
    if (clean.length < maxLen) clean += '.';
    else clean = clean.slice(0, maxLen - 1).trim() + '.';
  }

  return clean;
}

function substitutePlaceholders(text, { unitKerja, tglStr, topic }) {
  if (!text) return '';
  const bulanPattern = '(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)';
  const dateRegex = new RegExp(`pada\\s+(?:tanggal\\s+)?\\d{1,2}\\s+${bulanPattern}\\s+\\d{4}`, 'gi');
  return text
    .replace(/\[(?:Tanggal|Waktu)\]/gi, tglStr)
    .replace(/\[(?:Nama\s*Unit\/Bidang|Nama\s*Unit|Bidang|Unit\s*Kerja|Instansi|Perangkat\s*Daerah)\]/gi, unitKerja)
    .replace(/\[(?:Nama\/Jenis\s*Kegiatan|Nama\s*Kegiatan|Jenis\s*Kegiatan|Kegiatan)\]/gi, topic)
    .replace(dateRegex, `pada ${tglStr}`);
}

function generateSmartKedinasanSection(sectionKey, currentText, params) {
  const { namaKegiatan, tanggalIndo, instansi, maxKeterangan, maxKesimpulan } = params;
  const phrases = formatIndonesianActivityPhrases(namaKegiatan);
  const nounPhrase = phrases.nounPhrase;
  const titlePhrase = phrases.titlePhrase;
  const tglStr = tanggalIndo || formatIndonesianDate(getTodayIsoDate());
  const unitKerja = (instansi || 'Perangkat Daerah / Instansi Pemerintah').trim();

  const ctx = analyzeActivityContext(`${phrases.raw} ${nounPhrase}`);
  const cloudMatch = findMatchingCloudTemplate(phrases.raw);

  const execVerb = /^(?:pelaksanaan|dukungan pelaksanaan|penyelenggaraan)\b/i.test(nounPhrase)
    ? 'dilakukan'
    : 'dilaksanakan';
  const headingPhrase = /^(?:kegiatan|pelaksanaan|penyelenggaraan)\b/i.test(nounPhrase)
    ? capitalizeFirst(nounPhrase)
    : `Kegiatan ${nounPhrase}`;
  const rangkaianPhrase = /^kegiatan\b/i.test(nounPhrase)
    ? `Rangkaian ${nounPhrase}`
    : `Rangkaian kegiatan ${nounPhrase}`;

  let variations = [];

  if (sectionKey === 'keterangan') {
    variations = [
      `Pada ${tglStr}, telah ${execVerb} ${nounPhrase} di ${unitKerja}. Kegiatan meliputi ${ctx.aktivitas} sehingga menghasilkan ${ctx.output}. Capaian tersebut mendukung ${ctx.manfaat} serta menjadi bahan ${ctx.tindakLanjut}.`,
      `${headingPhrase} terlaksana pada ${tglStr} dalam rangka pemenuhan tugas kedinasan pada ${unitKerja}. Rangkaian kerja mencakup ${ctx.aktivitas} dengan hasil berupa ${ctx.output}. Seluruh hasil kegiatan tersebut mendukung ${ctx.manfaat}.`,
      `Bertempat di lingkungan ${unitKerja}, pada ${tglStr} telah ${execVerb} ${nounPhrase} guna memperkuat kinerja organisasi. Agenda kerja berjalan melalui ${ctx.aktivitas} sehingga diperoleh ${ctx.output}. Hasil tersebut menjadi bahan ${ctx.tindakLanjut}.`
    ];

    if (cloudMatch && cloudMatch.keterangan) {
      const customCloud = substitutePlaceholders(cloudMatch.keterangan, { unitKerja, tglStr, topic: nounPhrase });
      variations.unshift(customCloud);
    }

    variations = variations.map((t) => fitKedinasanText(t, 300, maxKeterangan));

  } else if (sectionKey === 'judul_agenda') {
    const startsWithAction = ACTION_NOUN_TITLE_REGEX.test(titlePhrase);
    if (startsWithAction) {
      variations = [
        titlePhrase,
        `${titlePhrase} pada ${unitKerja}`,
        `Agenda ${titlePhrase}`,
        /^koordinasi\b/i.test(titlePhrase) ? `${titlePhrase} (${tglStr})` : `Koordinasi dan ${titlePhrase}`
      ];
    } else {
      variations = [
        titlePhrase,
        `Pelaksanaan ${titlePhrase}`,
        `${titlePhrase} pada ${unitKerja}`,
        `Penyelenggaraan ${titlePhrase}`
      ];
    }

    if (cloudMatch && cloudMatch.judulAgenda) {
      const customJudul = substitutePlaceholders(cloudMatch.judulAgenda, { unitKerja, tglStr, topic: titlePhrase });
      variations.unshift(customJudul);
    }

    variations = variations
      .map((t) => truncateAtWordBoundary(t, 140))
      .filter((v, i, a) => v && a.indexOf(v) === i);

  } else if (sectionKey === 'kesimpulan_action_plan') {
    const useCompactOpening = (headingPhrase.length + unitKerja.length) > 105;
    const open1 = useCompactOpening
      ? `${headingPhrase} pada ${tglStr} telah terlaksana dengan baik.`
      : `${headingPhrase} pada ${tglStr} telah terlaksana di ${unitKerja}.`;
    const open2 = useCompactOpening
      ? `${rangkaianPhrase} pada ${tglStr} berjalan dengan tertib.`
      : `${rangkaianPhrase} di ${unitKerja} pada ${tglStr} berjalan tertib.`;
    const open3 = useCompactOpening
      ? `${headingPhrase} pada ${tglStr} mendukung capaian kinerja organisasi.`
      : `${headingPhrase} pada ${tglStr} mendukung pencapaian kinerja di ${unitKerja}.`;

    variations = [
      `${open1} Tindak lanjut disusun berurutan: Pertama, menghimpun hasil berupa ${ctx.output}. Kedua, melaporkan capaian kepada pimpinan. Ketiga, mengoptimalkan hasil kerja sebagai bahan ${ctx.tindakLanjut}.`,
      `${open2} Tindak lanjut meliputi: Pertama, menata ${ctx.output}. Kedua, berkoordinasi bersama tim kerja terkait. Ketiga, memantau pelaksanaan untuk mendukung ${ctx.manfaat}.`,
      `${open3} Langkah lanjutan meliputi: Pertama, memverifikasi ${ctx.output}. Kedua, menyelaraskan tindak lanjut antarunit. Ketiga, menjadikan hasil kerja sebagai bahan ${ctx.tindakLanjut}.`
    ];

    if (cloudMatch && cloudMatch.kesimpulan) {
      const customKes = substitutePlaceholders(cloudMatch.kesimpulan, { unitKerja, tglStr, topic: nounPhrase });
      const hasFullSeq = /\bpertama\b/i.test(customKes) && /\bkedua\b/i.test(customKes);
      if (hasFullSeq) {
        variations.unshift(customKes);
      } else {
        const s1 = extractFirstSentence(customKes);
        const seqTail = `Tindak lanjut disusun berurutan: Pertama, menghimpun hasil berupa ${ctx.output}. Kedua, melaporkan capaian kepada pimpinan. Ketiga, mengoptimalkan hasil kerja sebagai bahan ${ctx.tindakLanjut}.`;
        const combined = s1 && s1.length <= 215 ? `${s1} ${seqTail}` : `${s1 || headingPhrase + ' telah terlaksana dengan baik.'} Tindak lanjut: Pertama, menata ${ctx.output}. Kedua, melaporkan hasil ke pimpinan. Ketiga, melaksanakan ${ctx.tindakLanjut}.`;
        variations.unshift(combined);
      }
    }

    variations = variations.map((t) => fitKedinasanText(t, 300, maxKesimpulan));

  } else if (sectionKey === 'peserta') {
    variations = [
      `Aparatur Sipil Negara pada ${unitKerja}, Tenaga Teknis Pendukung, dan Pihak Terkait`,
      `Kepala Perangkat Daerah, Pejabat Administrator, Pejabat Pengawas, Pejabat Fungsional, dan Staf Pelaksana Terkait pada ${unitKerja}`,
      `Tim Pelaksana Teknis, Tenaga Pendukung Operasional, dan Unsur Terkait di Lingkungan ${unitKerja}`
    ];

    if (cloudMatch && cloudMatch.peserta) {
      const customPes = substitutePlaceholders(cloudMatch.peserta, { unitKerja, tglStr, topic: nounPhrase });
      variations.unshift(customPes);
    }
  }

  const cleanCurrent = (currentText || '').trim();
  if (!cleanCurrent) {
    sectionVariationIndices[sectionKey] = 0;
    return variations[0];
  }

  let nextIdx = (sectionVariationIndices[sectionKey] + 1) % variations.length;
  for (let i = 0; i < variations.length; i++) {
    const candidate = variations[(nextIdx + i) % variations.length];
    if (candidate !== cleanCurrent) {
      sectionVariationIndices[sectionKey] = (nextIdx + i) % variations.length;
      return candidate;
    }
  }

  return variations[0];
}

function generateSmartKedinasanDraft(params) {
  const keterangan = generateSmartKedinasanSection('keterangan', '', params);
  const judulAgenda = generateSmartKedinasanSection('judul_agenda', '', params);
  const kesimpulan = generateSmartKedinasanSection('kesimpulan_action_plan', '', params);
  const peserta = generateSmartKedinasanSection('peserta', '', params);

  return {
    keterangan,
    judul_agenda: judulAgenda,
    kesimpulan_action_plan: kesimpulan,
    peserta,
    isLocal: true
  };
}

// ============================================================================
// API CLIENTS: GROQ CLOUD (LLAMA 3.3 70B), GEMINI, OPENAI
// ============================================================================
async function getActiveGroqModel(apiKey, preferredModel) {
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (resp.ok) {
      const json = await resp.json();
      const modelList = (json.data || []).map(m => m.id);

      const decommissioned = ['llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'llama-3.1-70b-versatile', 'gemma-7b-it'];
      if (preferredModel && !decommissioned.includes(preferredModel) && modelList.includes(preferredModel)) {
        return preferredModel;
      }

      const priority = [
        'openai/gpt-oss-120b',
        'llama-3.3-70b-versatile',
        'qwen/qwen3.8-27b',
        'openai/gpt-oss-20b',
        'llama-3.3-70b-specdec'
      ];
      for (const p of priority) {
        if (modelList.includes(p)) return p;
      }

      const anyText = modelList.find(id => !id.includes('whisper') && !id.includes('guard') && !decommissioned.includes(id));
      if (anyText) return anyText;
    }
  } catch (_) {}
  return 'openai/gpt-oss-120b';
}

async function callGroqApi(promptText) {
  const apiKey = (currentConfig.groqApiKey && currentConfig.groqApiKey.trim()) || BUILTIN_GROQ_API_KEY;
  if (!apiKey) throw new Error('API Key Groq belum diatur.');

  const preferred = (currentConfig.groqModel && !['mixtral-8x7b-32768', 'llama-3.1-8b-instant'].includes(currentConfig.groqModel))
    ? currentConfig.groqModel
    : 'openai/gpt-oss-120b';
  const detectedModel = await getActiveGroqModel(apiKey, preferred);

  const systemPrompt = `Anda adalah asisten resmi penyusun bahan isian form Tambah Aktivitas aplikasi e-Kinerja ASN Republik Indonesia.
WAJIB menjawab HANYA dalam format JSON object valid tanpa pengantar atau markdown triple backticks.
Struktur JSON yang WAJIB dipenuhi:
{
  "keterangan": "string (minimal 300 karakter formal)",
  "judul_agenda": "string (maksimal 150 karakter)",
  "kesimpulan_action_plan": "string (minimal 300 karakter naratif berurutan)",
  "peserta": "string (unsur kedinasan normatif)"
}`;

  const modelsToTry = [
    detectedModel,
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptText }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        const rawContent = resJson?.choices?.[0]?.message?.content;
        if (rawContent) {
          if (model !== currentConfig.groqModel) {
            currentConfig.groqModel = model;
            saveConfig();
          }
          const cleaned = rawContent.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
          return JSON.parse(cleaned);
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastErr = errJson?.error?.message || `Groq Error ${response.status}`;
      }
    } catch (e) {
      lastErr = e.message;
    }
  }

  throw new Error(`Groq: ${lastErr || 'Gagal memanggil model.'}`);
}

async function callGeminiApi(promptText) {
  const apiKey = currentConfig.geminiApiKey.trim();
  if (!apiKey) throw new Error('API Key Gemini belum diisi.');

  const model = currentConfig.geminiModel || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!resp.ok) {
    const errJson = await resp.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `Gemini Error ${resp.status}`);
  }

  const data = await resp.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error('Respons Gemini kosong.');

  const cleaned = textOutput.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
  return JSON.parse(cleaned);
}

async function callOpenAiApi(promptText) {
  const apiKey = (currentConfig.openaiApiKey || '').trim();
  if (!apiKey) throw new Error('API Key OpenAI belum diisi.');

  const systemPrompt = `Anda adalah asisten resmi penyusun bahan isian form Tambah Aktivitas aplikasi e-Kinerja ASN Republik Indonesia.
WAJIB menjawab HANYA dalam format JSON object valid tanpa pengantar atau markdown triple backticks.
Struktur JSON yang WAJIB dipenuhi:
{
  "keterangan": "string (minimal 300 karakter formal)",
  "judul_agenda": "string (maksimal 150 karakter)",
  "kesimpulan_action_plan": "string (minimal 300 karakter naratif berurutan)",
  "peserta": "string (unsur kedinasan normatif)"
}`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptText }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  if (!resp.ok) {
    const errJson = await resp.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `OpenAI Error ${resp.status}`);
  }

  const data = await resp.json();
  const textOutput = data?.choices?.[0]?.message?.content;
  if (!textOutput) throw new Error('Respons OpenAI kosong.');

  const cleaned = textOutput.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
  return JSON.parse(cleaned);
}

function buildPromptInstructions(params) {
  const { namaKegiatan, tanggalIndo, instansi, selectedActivity, maxKeterangan, maxKesimpulan } = params;

  let prompt = `Anda adalah asisten resmi penyusun bahan isian form 'Tambah Aktivitas' di portal e-Kinerja untuk ASN instansi pemerintah di Indonesia.

KONTEKS INPUT:
- Instansi/Perangkat Daerah: ${instansi}
- Tanggal Pelaksanaan: ${tanggalIndo}
- Uraian Kegiatan: "${namaKegiatan}"`;

  if (selectedActivity) {
    prompt += `\n- Pilihan Form Aktivitas Standar e-Kinerja: ${selectedActivity.nama} (${selectedActivity.tipe})`;
  }

  const cloudMatch = findMatchingCloudTemplate(namaKegiatan);
  if (cloudMatch) {
    prompt += `\n\nREFERENSI BAKU RESMI (DARI DATABASE MEMORI GOOGLE SHEET):
- Judul Agenda Acuan: ${cloudMatch.judulAgenda || '-'}
- Keterangan Acuan: ${cloudMatch.keterangan || '-'}
- Kesimpulan Acuan: ${cloudMatch.kesimpulan || '-'}
- Peserta Acuan: ${cloudMatch.peserta || '-'}
Gunakan substansi acuan resmi di atas sebagai pedoman utama perumusan naskah!`;
  }

  prompt += `\n\nATURAN WAJIB:
1. KETERANGAN: Min 300, Maks ${maxKeterangan} karakter. Menguraikan konteks, pelaksanaan substantif, dan tujuan kedinasan.
2. JUDUL AGENDA: Maks 150 karakter, formal dan jelas.
3. KESIMPULAN / ACTION PLAN: Min 300, Maks ${maxKesimpulan} karakter. Naratif berurutan memakai "Pertama, ... Kedua, ... Ketiga, ...". Dilarang markdown bullet.
4. PESERTA: Unsur aparatur dan pihak terkait.
Format output WAJIB HANYA JSON.`;

  return prompt;
}

// ============================================================================
// PROSES GENERATE UTAMA DENGAN FAILSAFE
// ============================================================================
async function handleGenerate() {
  hideAlert();
  const namaKegiatan = dom.namaKegiatanInput.value.trim();
  const tanggalIso = dom.tanggalInput.value;
  const tanggalIndo = formatIndonesianDate(tanggalIso);

  if (!tanggalIso) {
    showAlert('Tanggal pelaksanaan kegiatan wajib dipilih.');
    dom.tanggalInput.focus();
    return;
  }

  if (!namaKegiatan || namaKegiatan.length < 15) {
    showAlert('Uraian kegiatan minimal 15 karakter agar dapat dikembangkan secara akurat.');
    dom.namaKegiatanInput.focus();
    return;
  }

  if (!currentRecommendedActivity) {
    const matches = findBestMatchingActivities(namaKegiatan, 1);
    if (matches.length > 0) currentRecommendedActivity = matches[0];
  }

  const mode = currentConfig.engineMode || 'local';
  setLoading(true, 'Menyusun naskah kedinasan...');

  // JIKA MODE LOKAL
  if (mode === 'local') {
    const cloudMatch = findMatchingCloudTemplate(namaKegiatan);
    const localResult = generateSmartKedinasanDraft({
      namaKegiatan,
      tanggalIndo,
      instansi: currentConfig.instansi,
      selectedActivity: currentRecommendedActivity,
      maxKeterangan: currentConfig.maxKeterangan,
      maxKesimpulan: currentConfig.maxKesimpulan
    });

    renderResults(localResult);
    setLoading(false);

    if (cloudMatch) {
      showToast(`☁️ Memori Google Sheet diterapkan: '${cloudMatch.judulAgenda || cloudMatch.namaKegiatan}'`);
    } else {
      showToast('✓ Selesai! Disusun instan dengan Mesin Cerdas Kedinasan');
    }
    return;
  }

  // JIKA MODE DENGAN AI (GROQ / GEMINI / OPENAI)
  try {
    const prompt = buildPromptInstructions({
      namaKegiatan,
      tanggalIndo,
      instansi: currentConfig.instansi,
      selectedActivity: currentRecommendedActivity,
      maxKeterangan: currentConfig.maxKeterangan,
      maxKesimpulan: currentConfig.maxKesimpulan
    });

    let result = null;
    if (mode === 'groq') {
      result = await callGroqApi(prompt);
      showToast('✓ Diproses oleh Groq Cloud AI');
    } else if (mode === 'gemini') {
      result = await callGeminiApi(prompt);
      showToast('✓ Diproses oleh Google Gemini AI');
    } else if (mode === 'openai') {
      result = await callOpenAiApi(prompt);
      showToast('✓ Diproses oleh OpenAI ChatGPT');
    }

    if (result) {
      result.keterangan = fitKedinasanText(result.keterangan, 300, currentConfig.maxKeterangan);
      result.judul_agenda = truncateAtWordBoundary(result.judul_agenda || '', 140);
      result.kesimpulan_action_plan = fitKedinasanText(result.kesimpulan_action_plan, 300, currentConfig.maxKesimpulan);
      renderResults(result);
    }
  } catch (err) {
    console.warn('Mesin AI gagal, mengaktifkan failsafe...', err);
    const fallback = generateSmartKedinasanDraft({
      namaKegiatan,
      tanggalIndo,
      instansi: currentConfig.instansi,
      selectedActivity: currentRecommendedActivity,
      maxKeterangan: currentConfig.maxKeterangan,
      maxKesimpulan: currentConfig.maxKesimpulan
    });
    renderResults(fallback);
    showAlert(`Mesin online sedang dialihkan (${err.message}). Form tetap berhasil disusun menggunakan Mesin Cerdas Kedinasan ASN.`, true);
  } finally {
    setLoading(false);
  }
}

function renderResults(res) {
  dom.keteranganOutput.value = res.keterangan || '';
  dom.judulAgendaOutput.value = res.judul_agenda || '';
  dom.kesimpulanOutput.value = res.kesimpulan_action_plan || '';
  dom.pesertaOutput.value = res.peserta || '';

  if (currentRecommendedActivity) {
    if (dom.resActivityName) dom.resActivityName.textContent = currentRecommendedActivity.nama;
    if (dom.resTabTypeBadge) dom.resTabTypeBadge.textContent = currentRecommendedActivity.tipe;
    if (dom.resDurationBadge) dom.resDurationBadge.textContent = `⏱️ ${currentRecommendedActivity.durasiTeks || '60 Menit'}`;
  }

  dom.resultsSection.classList.remove('hidden');
  updateAllCounters();
  updateComplianceChecklist();
  dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleRegenerateSection(sectionKey, btn) {
  hideAlert();
  const namaKegiatan = dom.namaKegiatanInput.value.trim();
  const tanggalIndo = formatIndonesianDate(dom.tanggalInput.value);

  if (!namaKegiatan || namaKegiatan.length < 15) {
    showAlert('Uraian kegiatan di formulir input minimal 15 karakter.');
    return;
  }

  const sectionMap = {
    keterangan: { elem: dom.keteranganOutput, counter: updateKeteranganCounter },
    judul_agenda: { elem: dom.judulAgendaOutput, counter: updateJudulAgendaCounter },
    kesimpulan_action_plan: { elem: dom.kesimpulanOutput, counter: updateKesimpulanCounter },
    peserta: { elem: dom.pesertaOutput, counter: updatePesertaCounter }
  };

  const config = sectionMap[sectionKey];
  if (!config) return;

  const currentVal = config.elem.value;
  const newVal = generateSmartKedinasanSection(sectionKey, currentVal, {
    namaKegiatan,
    tanggalIndo,
    instansi: currentConfig.instansi,
    selectedActivity: currentRecommendedActivity,
    maxKeterangan: currentConfig.maxKeterangan,
    maxKesimpulan: currentConfig.maxKesimpulan
  });

  config.elem.value = newVal;
  config.counter();
  updateComplianceChecklist();

  btn.classList.add('rotating');
  setTimeout(() => btn.classList.remove('rotating'), 400);
  showToast('✓ Variasi narasi berhasil diperbarui');
}

// ============================================================================
// QUALITY COMPLIANCE CHECKER (PEMERIKSA KEPATUHAN E-KINERJA)
// ============================================================================
function updateComplianceChecklist() {
  const ket = dom.keteranganOutput.value.trim();
  const kes = dom.kesimpulanOutput.value.trim();
  const maxKet = currentConfig.maxKeterangan;
  const maxKes = currentConfig.maxKesimpulan;

  // 1. Keterangan Length
  const ketValid = ket.length >= 300 && ket.length <= maxKet;
  if (dom.compKeterangan) {
    dom.compKeterangan.className = ketValid ? 'comp-item valid' : 'comp-item invalid';
    dom.compKeterangan.innerHTML = ketValid 
      ? '<span class="comp-icon">✓</span> Keterangan 300–500 Karakter' 
      : `<span class="comp-icon" style="color:#d93025">✕</span> Keterangan (${ket.length} char, wajib 300-${maxKet})`;
  }

  // 2. Kesimpulan Length
  const kesValid = kes.length >= 300 && kes.length <= maxKes;
  if (dom.compKesimpulan) {
    dom.compKesimpulan.className = kesValid ? 'comp-item valid' : 'comp-item invalid';
    dom.compKesimpulan.innerHTML = kesValid 
      ? '<span class="comp-icon">✓</span> Kesimpulan 300–500 Karakter' 
      : `<span class="comp-icon" style="color:#d93025">✕</span> Kesimpulan (${kes.length} char, wajib 300-${maxKes})`;
  }

  // 3. Action Plan Sequence
  const hasSeq = /pertama|kedua|tindak lanjut|rekomendasi/i.test(kes);
  if (dom.compActionPlan) {
    dom.compActionPlan.className = hasSeq ? 'comp-item valid' : 'comp-item invalid';
    dom.compActionPlan.innerHTML = hasSeq 
      ? '<span class="comp-icon">✓</span> Action Plan Runut Berurutan' 
      : '<span class="comp-icon" style="color:#d93025">✕</span> Belum memuat alur tindak lanjut berurutan';
  }

  // 4. Forbidden Characters (simbol bullet atau strip daftar)
  const bulletRegex = /[\*\•]|(?:^|\s)-(?:\s|$)/m;
  const hasForbidden = bulletRegex.test(ket) || bulletRegex.test(kes);
  if (dom.compNoBullets) {
    dom.compNoBullets.className = !hasForbidden ? 'comp-item valid' : 'comp-item invalid';
    dom.compNoBullets.innerHTML = !hasForbidden 
      ? '<span class="comp-icon">✓</span> Bebas Simbol / Format Terlarang' 
      : '<span class="comp-icon" style="color:#d93025">✕</span> Hindari tanda bintang/strip/bullet';
  }
}

// ============================================================================
// MAIN CATALOG TAB (81 OPSI + 111 TEMPLATE SHEET)
// ============================================================================
function renderMainCatalog(category = 'all', query = '') {
  dom.catalogMainList.innerHTML = '';

  let list = [];

  if (category === 'sheet') {
    list = cloudTemplates.map((t, idx) => ({
      id: `sheet-${idx+1}`,
      nama: t.judulAgenda || t.namaKegiatan,
      tipe: `Template Google Sheet (${t.kategori || 'Umum'})`,
      durasiTeks: '120 Menit',
      isSheet: true,
      rawTemplate: t
    }));
  } else {
    list = allActivitiesList.map(a => ({ ...a, isSheet: false }));
    if (category === 'utama') list = list.filter(a => a.tipe.includes('Utama'));
    else if (category === 'tambahan') list = list.filter(a => a.tipe.includes('Tambahan'));
    else if (category === 'humas') list = list.filter(a => /humas|konten|sosmed|informasi|berita/i.test(a.nama));
    else if (category === 'liputan') list = list.filter(a => /liputan|dokumentasi|siaran|live/i.test(a.nama));
  }

  if (query) {
    const q = query.toLowerCase();
    list = list.filter(a => a.nama.toLowerCase().includes(q) || a.tipe.toLowerCase().includes(q));
  }

  if (list.length === 0) {
    dom.catalogMainList.innerHTML = '<div style="padding: 24px; text-align: center; color: #94a3b8;">Tidak ditemukan aktivitas pada kategori ini.</div>';
    return;
  }

  list.forEach((act) => {
    const row = document.createElement('div');
    row.className = 'catalog-card-entry';
    row.innerHTML = `
      <div style="flex: 1;">
        <div class="cat-entry-title">${act.nama}</div>
        <div class="cat-entry-sub">${act.tipe} • Standar Durasi: ${act.durasiTeks || '60 Menit'}</div>
      </div>
      <button type="button" class="btn-use-catalog">⚡ Gunakan</button>
    `;

    row.querySelector('.btn-use-catalog').addEventListener('click', () => {
      dom.namaKegiatanInput.value = act.nama;
      updateNamaKegiatanCounter();

      if (!act.isSheet) {
        currentRecommendedActivity = act;
        updateRecommendationUi();
      } else {
        const matches = findBestMatchingActivities(act.nama, 1);
        if (matches.length > 0) currentRecommendedActivity = matches[0];
        updateRecommendationUi();
      }

      switchTab('tab-composer');
      showToast(`Aktivitas '${act.nama.substring(0, 30)}...' dimuat ke formulir`);
    });

    dom.catalogMainList.appendChild(row);
  });
}

// ============================================================================
// SALIN KE PAPAN KLIP (CLIPBOARD) & KIRIM KE SHEET
// ============================================================================
async function copyToClipboard(text, successMsg = '✓ Berhasil disalin!') {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast(successMsg);
  } catch (err) {
    showToast('Gagal menyalin. Silakan pilih dan salin manual.');
  }
}

function copyAllResults() {
  const ket = dom.keteranganOutput.value.trim();
  const jud = dom.judulAgendaOutput.value.trim();
  const kes = dom.kesimpulanOutput.value.trim();
  const pes = dom.pesertaOutput.value.trim();

  let text = '';
  if (currentRecommendedActivity) {
    text += `=== REKOMENDASI FORM E-KINERJA ===\n[Kategori] ${currentRecommendedActivity.tipe} (Opsi #${currentRecommendedActivity.id})\n[Pilihan Form Aktivitas] ${currentRecommendedActivity.nama}\n[Standar Durasi] ${currentRecommendedActivity.durasiTeks || '60 Menit'}\n\n`;
  }
  text += `=== BAHAN ISIAN FORM E-KINERJA ===\n\n[1. KETERANGAN]\n${ket}\n\n[2. JUDUL AGENDA]\n${jud}\n\n[3. KESIMPULAN / ACTION PLAN]\n${kes}\n\n[4. PESERTA]\n${pes}`;

  copyToClipboard(text, '✓ Seluruh naskah e-Kinerja berhasil disalin lengkap!');
}

async function sendResultsToGoogleSheet() {
  const webhookUrl = currentConfig.appsScriptUrl ? currentConfig.appsScriptUrl.trim() : '';
  if (!webhookUrl) {
    showAlert('URL Webhook Google Apps Script belum diisi di menu Pengaturan (⚙️).');
    openSettingsModal();
    return;
  }

  const topic = dom.namaKegiatanInput.value.trim() || 'Aktivitas Kedinasan';
  const payload = {
    action: 'add_row',
    kategori: analyzeActivityContext(topic).kategori,
    kataKunci: topic.substring(0, 50),
    namaKegiatan: topic,
    keterangan: dom.keteranganOutput.value.trim(),
    judulAgenda: dom.judulAgendaOutput.value.trim(),
    kesimpulan: dom.kesimpulanOutput.value.trim(),
    peserta: dom.pesertaOutput.value.trim(),
    tanggal: dom.tanggalInput.value
  };

  showToast('Mengirim rekaman ke Google Sheet...');
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    showToast('✅ Berhasil dikirim ke Google Sheet!');
    setTimeout(() => syncFromGoogleSheet(currentConfig.googleSheetUrl, true), 1500);
  } catch (e) {
    showToast('Gagal mengirim ke Webhook Google Apps Script.');
  }
}

// ============================================================================
// COUNTERS & VALIDASI UI
// ============================================================================
function updateNamaKegiatanCounter() {
  const len = dom.namaKegiatanInput.value.length;
  dom.namaKegiatanCounter.textContent = `${len} / min 15`;
  dom.namaKegiatanCounter.className = len >= 15 ? 'char-badge valid' : 'char-badge info';
}

function updateKeteranganCounter() {
  const len = dom.keteranganOutput.value.length;
  const max = currentConfig.maxKeterangan;
  dom.keteranganCounter.textContent = `${len} / 300 - ${max}`;
  if (len >= 300 && len <= max) dom.keteranganCounter.className = 'char-badge valid';
  else if (len < 300) dom.keteranganCounter.className = 'char-badge warning';
  else dom.keteranganCounter.className = 'char-badge danger';
}

function updateJudulAgendaCounter() {
  const len = dom.judulAgendaOutput.value.length;
  dom.judulAgendaCounter.textContent = `${len} / maks 150`;
  dom.judulAgendaCounter.className = len <= 150 ? 'char-badge valid' : 'char-badge danger';
}

function updateKesimpulanCounter() {
  const len = dom.kesimpulanOutput.value.length;
  const max = currentConfig.maxKesimpulan;
  dom.kesimpulanCounter.textContent = `${len} / 300 - ${max}`;
  if (len >= 300 && len <= max) dom.kesimpulanCounter.className = 'char-badge valid';
  else if (len < 300) dom.kesimpulanCounter.className = 'char-badge warning';
  else dom.kesimpulanCounter.className = 'char-badge danger';
}

function updatePesertaCounter() {
  dom.pesertaCounter.textContent = `${dom.pesertaOutput.value.length}`;
}

function updateAllCounters() {
  updateKeteranganCounter();
  updateJudulAgendaCounter();
  updateKesimpulanCounter();
  updatePesertaCounter();
}

function showAlert(msg, isWarning = false) {
  dom.alertMessage.textContent = msg;
  dom.alertBox.className = isWarning ? 'alert-box warning' : 'alert-box';
  dom.alertBox.classList.remove('hidden');
}

function hideAlert() {
  dom.alertBox.classList.add('hidden');
}

function setLoading(isLoading, text = '') {
  dom.btnGenerate.disabled = isLoading;
  if (dom.btnGenerateText) {
    dom.btnGenerateText.textContent = isLoading ? (text || 'Sedang Menyusun...') : 'Generate Narasi e-Kinerja';
  }
  if (dom.loadingIndicator) {
    dom.loadingIndicator.classList.toggle('hidden', !isLoading);
  }
  if (dom.loadingStatusText && text) {
    dom.loadingStatusText.textContent = text;
  }
}

function showToast(msg) {
  dom.toastMessage.textContent = msg;
  dom.toastContainer.classList.remove('hidden');
  clearTimeout(dom.toastContainer._timer);
  dom.toastContainer._timer = setTimeout(() => {
    dom.toastContainer.classList.add('hidden');
  }, 2800);
}

// ============================================================================
// PENGATURAN MODAL & ENGINE
// ============================================================================
function updateEngineUi() {
  const mode = currentConfig.engineMode || 'local';
  const labels = {
    local: 'Mesin Cerdas',
    groq: 'Groq Cloud AI',
    gemini: 'Google Gemini',
    openai: 'OpenAI ChatGPT'
  };
  if (dom.headerEngineText) {
    dom.headerEngineText.textContent = labels[mode] || mode;
  }
}

function openSettingsModal() {
  dom.engineSelect.value = currentConfig.engineMode;
  dom.groqApiKeyInput.value = currentConfig.groqApiKey || BUILTIN_GROQ_API_KEY;
  dom.geminiApiKeyInput.value = currentConfig.geminiApiKey;
  dom.openaiApiKeyInput.value = currentConfig.openaiApiKey;
  dom.googleSheetUrlInput.value = currentConfig.googleSheetUrl;
  dom.appsScriptUrlInput.value = currentConfig.appsScriptUrl;
  dom.instansiInput.value = currentConfig.instansi;
  dom.maxKeteranganInput.value = currentConfig.maxKeterangan;
  dom.maxKesimpulanInput.value = currentConfig.maxKesimpulan;

  handleEngineSelectChange();
  dom.settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  dom.settingsModal.classList.add('hidden');
}

function handleEngineSelectChange() {
  const mode = dom.engineSelect.value;
  dom.groqKeyGroup.classList.toggle('hidden', mode !== 'groq');
  dom.geminiKeyGroup.classList.toggle('hidden', mode !== 'gemini');
  dom.openaiKeyGroup.classList.toggle('hidden', mode !== 'openai');

  const hints = {
    local: '100% gratis, tanpa kuota & tanpa API key. Mengembangkan narasi baku langsung di browser.',
    groq: '⚡ Opsi ke-2 Bawaan Aktif (Built-in Siap Pakai). Menggunakan model mutakhir Groq Cloud, respon super cepat (~1 detik) & terstruktur.',
    gemini: 'Google Gemini API resmi dari Google AI Studio.',
    openai: 'OpenAI GPT-4o-mini (memerlukan API key & saldo).'
  };
  dom.engineHint.textContent = hints[mode] || '';
}

function saveSettingsFromModal() {
  currentConfig.engineMode = dom.engineSelect.value;
  currentConfig.groqApiKey = dom.groqApiKeyInput.value.trim() || BUILTIN_GROQ_API_KEY;
  currentConfig.geminiApiKey = dom.geminiApiKeyInput.value.trim();
  currentConfig.openaiApiKey = dom.openaiApiKeyInput.value.trim();
  currentConfig.googleSheetUrl = dom.googleSheetUrlInput.value.trim();
  currentConfig.appsScriptUrl = dom.appsScriptUrlInput.value.trim();
  currentConfig.instansi = dom.instansiInput.value.trim() || DEFAULT_CONFIG.instansi;
  currentConfig.maxKeterangan = parseInt(dom.maxKeteranganInput.value, 10) || 500;
  currentConfig.maxKesimpulan = parseInt(dom.maxKesimpulanInput.value, 10) || 500;

  saveConfig();
  updateEngineUi();
  closeSettingsModal();
  showToast('Pengaturan berhasil disimpan!');
}

// ============================================================================
// MODAL KATALOG PILIHAN CEPAT
// ============================================================================
function openCatalogModal() {
  renderCatalogItems(allActivitiesList);
  dom.catalogSearchInput.value = '';
  dom.catalogModal.classList.remove('hidden');
  dom.catalogSearchInput.focus();
}

function closeCatalogModal() {
  dom.catalogModal.classList.add('hidden');
}

function renderCatalogItems(list) {
  dom.catalogListContainer.innerHTML = '';
  if (list.length === 0) {
    dom.catalogListContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8;">Tidak ditemukan aktivitas yang cocok.</div>';
    return;
  }

  list.forEach((act) => {
    const item = document.createElement('div');
    item.className = 'modal-cat-item';
    item.innerHTML = `
      <div>
        <div class="modal-cat-text">${act.nama}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${act.tipe} • Standar: ${act.durasiTeks || '60 Menit'} (Opsi #${act.id})</div>
      </div>
      <span class="modal-cat-tag">Pilih ➔</span>
    `;
    item.addEventListener('click', () => {
      currentRecommendedActivity = act;
      updateRecommendationUi();
      closeCatalogModal();
      showToast(`Pilihan form dipilih: ${act.nama}`);
    });
    dom.catalogListContainer.appendChild(item);
  });
}

// ============================================================================
// PWA SERVICE WORKER & INSTALL BANNER
// ============================================================================
function registerPwaServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.log('SW register:', e));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    dom.pwaInstallBanner.classList.remove('hidden');
  });

  if (dom.btnInstallPwa) {
    dom.btnInstallPwa.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        dom.pwaInstallBanner.classList.add('hidden');
      }
      deferredPrompt = null;
    });
  }

  if (dom.btnClosePwaBanner) {
    dom.btnClosePwaBanner.addEventListener('click', () => {
      dom.pwaInstallBanner.classList.add('hidden');
    });
  }
}

// ============================================================================
// EVENT LISTENERS BINDING
// ============================================================================
function attachEventListeners() {
  // Live input Nama Kegiatan & auto-match rekomendasi
  let debounceTimer = null;
  dom.namaKegiatanInput.addEventListener('input', () => {
    updateNamaKegiatanCounter();
    hideAlert();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const val = dom.namaKegiatanInput.value.trim();
      const matches = findBestMatchingActivities(val, 1);
      if (matches.length > 0) {
        currentRecommendedActivity = matches[0];
        updateRecommendationUi();
      }
    }, 200);
  });

  // Example chips
  document.querySelectorAll('.chip-example').forEach((chip) => {
    chip.addEventListener('click', () => {
      dom.namaKegiatanInput.value = chip.getAttribute('data-text');
      updateNamaKegiatanCounter();
      const matches = findBestMatchingActivities(dom.namaKegiatanInput.value, 1);
      if (matches.length > 0) {
        currentRecommendedActivity = matches[0];
        updateRecommendationUi();
      }
    });
  });

  // Quick Paste Button
  if (dom.btnQuickPaste) {
    dom.btnQuickPaste.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clipText = await navigator.clipboard.readText();
          if (clipText && clipText.trim()) {
            dom.namaKegiatanInput.value = clipText.trim();
            updateNamaKegiatanCounter();
            const matches = findBestMatchingActivities(clipText.trim(), 1);
            if (matches.length > 0) {
              currentRecommendedActivity = matches[0];
              updateRecommendationUi();
            }
            showToast('Teks berhasil ditempel dari clipboard!');
            return;
          }
        }
      } catch (_) {}
      dom.namaKegiatanInput.focus();
      showToast('Silakan gunakan pintasan keyboard (Ctrl+V) untuk menempel.');
    });
  }

  // Action buttons
  dom.btnGenerate.addEventListener('click', handleGenerate);
  dom.btnReset.addEventListener('click', () => {
    if (confirm('Bersihkan formulir dan hasil?')) {
      dom.namaKegiatanInput.value = '';
      updateNamaKegiatanCounter();
      dom.resultsSection.classList.add('hidden');
      hideAlert();
    }
  });

  dom.btnCopyAll.addEventListener('click', copyAllResults);
  dom.btnSendToSheet.addEventListener('click', sendResultsToGoogleSheet);

  if (dom.btnCopyRecName) {
    dom.btnCopyRecName.addEventListener('click', () => {
      const actName = dom.resActivityName ? dom.resActivityName.textContent : '';
      if (actName) copyToClipboard(actName, '✓ Nama form aktivitas berhasil disalin!');
    });
  }

  // Section Variations & Copy with visual feedback
  document.querySelectorAll('.btn-regen').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = btn.getAttribute('data-section');
      handleRegenerateSection(sec, btn);
    });
  });

  document.querySelectorAll('.btn-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const elem = document.getElementById(targetId);
      if (elem) {
        copyToClipboard(elem.value.trim(), '✓ Berhasil disalin ke clipboard!');
        const origText = btn.innerHTML;
        btn.innerHTML = '✓ Tersalin!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = origText;
          btn.classList.remove('copied');
        }, 1500);
      }
    });
  });

  // Live output counters & compliance updates
  dom.keteranganOutput.addEventListener('input', () => {
    updateKeteranganCounter();
    updateComplianceChecklist();
  });
  dom.judulAgendaOutput.addEventListener('input', updateJudulAgendaCounter);
  dom.kesimpulanOutput.addEventListener('input', () => {
    updateKesimpulanCounter();
    updateComplianceChecklist();
  });
  dom.pesertaOutput.addEventListener('input', updatePesertaCounter);

  // Header & Settings Modal events
  if (dom.headerEngineBadge) {
    dom.headerEngineBadge.addEventListener('click', openSettingsModal);
  }
  dom.btnOpenSettings.addEventListener('click', openSettingsModal);
  dom.cloudStatusBadge.addEventListener('click', openSettingsModal);
  dom.btnCloseSettingsModal.addEventListener('click', closeSettingsModal);
  dom.btnSaveSettings.addEventListener('click', saveSettingsFromModal);
  dom.engineSelect.addEventListener('change', handleEngineSelectChange);

  dom.btnSyncSheetManual.addEventListener('click', () => {
    const url = dom.googleSheetUrlInput.value.trim() || currentConfig.googleSheetUrl;
    syncFromGoogleSheet(url, false);
  });

  // Catalog Modal events
  dom.btnOpenCatalogModal.addEventListener('click', openCatalogModal);
  dom.btnCloseCatalogModal.addEventListener('click', closeCatalogModal);
  dom.catalogSearchInput.addEventListener('input', () => {
    const q = dom.catalogSearchInput.value.toLowerCase().trim();
    if (!q) {
      renderCatalogItems(allActivitiesList);
      return;
    }
    const filtered = allActivitiesList.filter(a => a.nama.toLowerCase().includes(q) || a.tipe.toLowerCase().includes(q));
    renderCatalogItems(filtered);
  });

  // Catalog Main Tab Filter
  dom.catalogCategoryChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      dom.catalogCategoryChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.getAttribute('data-cat');
      renderMainCatalog(cat, dom.catalogSearchMain.value.trim());
    });
  });

  dom.catalogSearchMain.addEventListener('input', () => {
    const activeChip = document.querySelector('.cat-chip.active');
    const cat = activeChip ? activeChip.getAttribute('data-cat') : 'all';
    renderMainCatalog(cat, dom.catalogSearchMain.value.trim());
  });

  // Close modals on overlay click
  dom.settingsModal.addEventListener('click', (e) => {
    if (e.target === dom.settingsModal) closeSettingsModal();
  });
  dom.catalogModal.addEventListener('click', (e) => {
    if (e.target === dom.catalogModal) closeCatalogModal();
  });
}
