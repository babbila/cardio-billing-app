import { CATS, CODES, DISCLAIMER } from './data.js';
import { buildAskResult } from './parse.js';
import { addFile, listByCategory, countsByCategory, getFile, deleteFile } from './idb.js';

document.getElementById('disclaimer').textContent = DISCLAIMER;

// ---------------- Tabs ----------------
const tabs = Array.from(document.querySelectorAll('.tab'));
const panels = {
  ask: document.getElementById('panel-ask'),
  browse: document.getElementById('panel-browse'),
  sheets: document.getElementById('panel-sheets'),
};

function activateTab(mode) {
  tabs.forEach((t) => {
    const active = t.dataset.mode === mode;
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
  });
  Object.entries(panels).forEach(([key, el]) => {
    el.hidden = key !== mode;
  });
  if (mode === 'browse') refreshBrowseIndicators();
  if (mode === 'sheets') renderSheetsGrid();
}

tabs.forEach((t) => t.addEventListener('click', () => activateTab(t.dataset.mode)));
tabs.forEach((t, i) => {
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      activateTab(tabs[next].dataset.mode);
    }
  });
});

// ---------------- Speech input (optional, graceful fallback) ----------------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function wireMic(buttonId, targetInput, append) {
  const btn = document.getElementById(buttonId);
  if (!SpeechRecognition) {
    btn.disabled = true;
    btn.title = 'Voice input not supported in this browser';
    return;
  }
  let recognizing = false;
  let recognizer = null;
  btn.addEventListener('click', () => {
    if (recognizing) {
      recognizer.stop();
      return;
    }
    recognizer = new SpeechRecognition();
    recognizer.lang = 'en-US';
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;
    recognizer.onstart = () => {
      recognizing = true;
      btn.setAttribute('aria-pressed', 'true');
    };
    recognizer.onend = () => {
      recognizing = false;
      btn.setAttribute('aria-pressed', 'false');
    };
    recognizer.onerror = () => {
      recognizing = false;
      btn.setAttribute('aria-pressed', 'false');
    };
    recognizer.onresult = (event) => {
      const text = event.results[0][0].transcript;
      targetInput.value = append && targetInput.value.trim() ? `${targetInput.value.trim()}, ${text}` : text;
    };
    recognizer.start();
  });
}

wireMic('mic-btn', document.getElementById('situation-input'), false);
wireMic('mic-btn-billed', document.getElementById('already-billed-input'), true);

// ---------------- Ask mode ----------------
const askForm = document.getElementById('ask-form');
const askResult = document.getElementById('ask-result');

function renderAskResult(result) {
  if (!result.code) {
    askResult.innerHTML = `<p class="no-match">${escapeHtml(result.assumptions[0] || 'No match found.')}</p>`;
    return;
  }

  const info = result.info;
  const swapBanner = result.swapped
    ? `<div class="swap-banner">Adjusted: <strong>${escapeHtml(result.originalCode)}</strong> → <strong>${escapeHtml(result.code)}</strong> (see rationale below)</div>`
    : '';

  const rationaleItems = result.rationale.map((r) => `<li>${escapeHtml(r)}</li>`).join('');
  const assumptionItems = result.assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join('');
  const addOnChips = (result.addOns || []).map((a) => `<span class="chip">+ ${escapeHtml(a.code)} — ${escapeHtml(a.why)}</span>`).join('');

  askResult.innerHTML = `
    <div class="result-card">
      <div class="result-code-row">
        <span class="result-code">${escapeHtml(result.code)}</span>
        ${info && info.fee ? `<span class="result-fee">${escapeHtml(info.fee)}</span>` : ''}
      </div>
      ${info ? `<p class="result-label">${escapeHtml(info.label)}</p>` : ''}
      ${swapBanner}
      ${rationaleItems ? `<ul class="rationale-list">${rationaleItems}</ul>` : ''}
      ${addOnChips ? `<div class="addon-chip-row">${addOnChips}</div>` : ''}
      ${assumptionItems ? `<ul class="assumptions-list">${assumptionItems}</ul>` : ''}
    </div>
  `;
}

askForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const situation = document.getElementById('situation-input').value;
  const alreadyBilled = document.getElementById('already-billed-input').value;
  const result = buildAskResult(situation, alreadyBilled);
  renderAskResult(result);
});

// ---------------- Browse mode ----------------
const browseCatsEl = document.getElementById('browse-cats');
const browseListEl = document.getElementById('browse-list');
const browseSearchEl = document.getElementById('browse-search');
let activeBrowseCat = null; // null = all

function renderBrowseCats(counts) {
  const chips = [{ key: null, label: 'All' }, ...CATS].map((c) => {
    const selected = activeBrowseCat === c.key;
    const dot = c.key && counts[c.key] ? '<span class="sheet-dot" title="You have cheat sheets in this category"></span>' : '';
    return `<button class="cat-chip" role="tab" aria-selected="${selected}" data-cat="${c.key ?? ''}">${escapeHtml(c.label)}${dot}</button>`;
  }).join('');
  browseCatsEl.innerHTML = chips;
  browseCatsEl.querySelectorAll('.cat-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeBrowseCat = btn.dataset.cat || null;
      renderBrowseCats(counts);
      renderBrowseList();
    });
  });
}

function renderBrowseList() {
  const query = browseSearchEl.value.trim().toLowerCase();
  const items = CODES.filter((c) => {
    if (activeBrowseCat && c.cat !== activeBrowseCat) return false;
    if (!query) return true;
    return (
      c.code.toLowerCase().includes(query) ||
      c.label.toLowerCase().includes(query) ||
      (c.notes || '').toLowerCase().includes(query)
    );
  });

  if (items.length === 0) {
    browseListEl.innerHTML = `<p class="empty-note">No matching codes.</p>`;
    return;
  }

  browseListEl.innerHTML = items.map((c) => `
    <div class="code-card">
      <div class="code-card-top">
        ${c.code ? `<span class="code-card-code">${escapeHtml(c.code)}</span>` : ''}
        ${c.fee ? `<span class="code-card-fee">${escapeHtml(c.fee)}</span>` : ''}
      </div>
      <p class="code-card-label">${escapeHtml(c.label)}</p>
      ${c.notes ? `<p class="code-card-notes">${escapeHtml(c.notes)}</p>` : ''}
    </div>
  `).join('');
}

async function refreshBrowseIndicators() {
  const counts = await countsByCategory();
  renderBrowseCats(counts);
  renderBrowseList();
}

browseSearchEl.addEventListener('input', renderBrowseList);

// ---------------- My Cheat Sheets mode ----------------
const sheetCatSelect = document.getElementById('sheet-cat-select');
sheetCatSelect.innerHTML = CATS.map((c) => `<option value="${c.key}">${escapeHtml(c.label)}</option>`).join('');

const sheetsCatsEl = document.getElementById('sheets-cats');
const sheetsGridEl = document.getElementById('sheets-grid');
let activeSheetsCat = CATS[0].key;

function renderSheetsCatChips() {
  sheetsCatsEl.innerHTML = CATS.map((c) => {
    const selected = activeSheetsCat === c.key;
    return `<button class="cat-chip" role="tab" aria-selected="${selected}" data-cat="${c.key}">${escapeHtml(c.label)}</button>`;
  }).join('');
  sheetsCatsEl.querySelectorAll('.cat-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSheetsCat = btn.dataset.cat;
      renderSheetsCatChips();
      renderSheetsGrid();
    });
  });
}

async function renderSheetsGrid() {
  renderSheetsCatChips();
  const files = await listByCategory(activeSheetsCat);
  if (files.length === 0) {
    sheetsGridEl.innerHTML = `<p class="empty-note">No cheat sheets uploaded for this category yet.</p>`;
    return;
  }
  sheetsGridEl.innerHTML = files.map((f) => {
    const isImage = f.type.startsWith('image/');
    const thumb = isImage
      ? `<img alt="" src="${URL.createObjectURL(f.blob)}" />`
      : `<div class="pdf-icon" aria-hidden="true">📄</div>`;
    return `
      <div class="sheet-tile-wrap">
        <button class="sheet-tile" data-id="${f.id}" type="button">
          ${thumb}
          <span class="sheet-name">${escapeHtml(f.name)}</span>
        </button>
        <div class="sheet-tile-footer">
          <button class="delete-btn" data-delete-id="${f.id}" type="button" aria-label="Delete ${escapeHtml(f.name)}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  sheetsGridEl.querySelectorAll('.sheet-tile').forEach((btn) => {
    btn.addEventListener('click', () => openViewer(btn.dataset.id));
  });
  sheetsGridEl.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this file?')) return;
      await deleteFile(btn.dataset.deleteId);
      renderSheetsGrid();
    });
  });
}

const uploadForm = document.getElementById('upload-form');
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('sheet-file-input');
  const file = fileInput.files[0];
  if (!file) return;
  await addFile({ cat: sheetCatSelect.value, name: file.name, type: file.type, blob: file });
  fileInput.value = '';
  activeSheetsCat = sheetCatSelect.value;
  renderSheetsGrid();
});

// ---------------- Full-screen viewer ----------------
const viewerOverlay = document.getElementById('viewer-overlay');
const viewerBody = document.getElementById('viewer-body');
const viewerClose = document.getElementById('viewer-close');
let currentObjectUrl = null;

async function openViewer(id) {
  const file = await getFile(id);
  if (!file) return;
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file.blob);

  viewerBody.innerHTML = file.type.startsWith('image/')
    ? `<img src="${currentObjectUrl}" alt="${escapeHtml(file.name)}" />`
    : `<iframe src="${currentObjectUrl}" title="${escapeHtml(file.name)}"></iframe>`;

  viewerOverlay.hidden = false;
  viewerClose.focus();
}

function closeViewer() {
  viewerOverlay.hidden = true;
  viewerBody.innerHTML = '';
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

viewerClose.addEventListener('click', closeViewer);
viewerOverlay.addEventListener('click', (e) => {
  if (e.target === viewerOverlay) closeViewer();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !viewerOverlay.hidden) closeViewer();
});

// ---------------- utils ----------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------- Service worker ----------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// initial paint
refreshBrowseIndicators();
