const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const dropLabel = document.getElementById('dropLabel');
const ttlSelect = document.getElementById('ttl');
const passwordInput = document.getElementById('password');
const uploadBtn = document.getElementById('uploadBtn');
const uploadBtnLabel = document.getElementById('uploadBtnLabel');
const uploadSpinner = document.getElementById('uploadSpinner');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const errorBox = document.getElementById('uploadError');
const okBox = document.getElementById('uploadOk');

const toggleFiles = document.getElementById('toggleFiles');
const filePanel = document.getElementById('filePanel');
const fileListEl = document.getElementById('fileList');
const emptyState = document.getElementById('emptyState');
const fileCountEl = document.getElementById('fileCount');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalFileName = document.getElementById('modalFileName');
const modalPasswordInput = document.getElementById('modalPasswordInput');
const modalError = document.getElementById('modalError');
const modalCancel = document.getElementById('modalCancel');
const modalUnlock = document.getElementById('modalUnlock');

const pasteContent = document.getElementById('pasteContent');
const pasteTtl = document.getElementById('pasteTtl');
const pastePassword = document.getElementById('pastePassword');
const pasteBtn = document.getElementById('pasteBtn');
const pasteBtnLabel = document.getElementById('pasteBtnLabel');
const pasteSpinner = document.getElementById('pasteSpinner');
const pasteError = document.getElementById('pasteError');
const pasteOk = document.getElementById('pasteOk');

let filesOpen = false;
let pendingDownload = null; // { id, name, type, btn }

// ---------- helpers ----------

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatRemaining(expiresAt) {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins + 'm left';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h left';
  return Math.round(hrs / 24) + 'd left';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- drag & drop / file choice ----------
// The real <input type="file"> sits directly on top of the drop zone (see CSS —
// it's an invisible full-size overlay, not display:none) so the OS picker opens
// from a genuine, direct tap on the input itself. This is more reliable across
// mobile browsers and in-app webviews than a hidden input triggered via JS click().

fileInput.addEventListener('change', () => updateDropLabel());

['dragenter', 'dragover'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
});
['dragleave', 'drop'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });
});
dropZone.addEventListener('drop', (e) => {
  const dropped = e.dataTransfer.files;
  if (dropped && dropped[0]) {
    fileInput.files = dropped;
    updateDropLabel();
  }
});

function updateDropLabel() {
  const f = fileInput.files[0];
  dropLabel.textContent = f ? `${f.name} (${formatSize(f.size)})` : 'Choose a file, or drag it here';
}

// ---------- upload ----------

uploadBtn.addEventListener('click', () => {
  errorBox.hidden = true;
  okBox.hidden = true;
  const file = fileInput.files[0];
  if (!file) {
    dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('ttlSeconds', ttlSelect.value);
  if (passwordInput.value) formData.append('password', passwordInput.value);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'api/upload.php');

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      progressWrap.hidden = false;
      progressBar.style.width = Math.round((e.loaded / e.total) * 100) + '%';
    }
  });

  xhr.onload = () => {
    progressWrap.hidden = true;
    progressBar.style.width = '0%';
    setUploading(false);
    if (xhr.status >= 200 && xhr.status < 300) {
      const data = JSON.parse(xhr.responseText);
      okBox.textContent = data.protected ? 'Uploaded — encrypted with your password.' : 'Uploaded.';
      okBox.hidden = false;
      fileInput.value = '';
      passwordInput.value = '';
      updateDropLabel();
      refreshList();
      if (!filesOpen) openFiles();
    } else {
      let msg = 'Upload failed.';
      try { msg = JSON.parse(xhr.responseText).error || msg; } catch (e) {}
      errorBox.textContent = msg;
      errorBox.hidden = false;
    }
  };

  xhr.onerror = () => {
    progressWrap.hidden = true;
    setUploading(false);
    errorBox.textContent = 'Upload failed — check your connection.';
    errorBox.hidden = false;
  };

  setUploading(true);
  xhr.send(formData);
});

function setUploading(state) {
  uploadBtn.disabled = state;
  uploadBtnLabel.textContent = state ? 'Uploading…' : 'Upload';
  uploadSpinner.hidden = !state;
}

// ---------- paste text/link ----------

pasteBtn.addEventListener('click', async () => {
  pasteError.hidden = true;
  pasteOk.hidden = true;
  const content = pasteContent.value.trim();
  if (!content) {
    pasteContent.focus();
    return;
  }

  setPasting(true);
  try {
    const body = new URLSearchParams();
    body.set('content', content);
    body.set('ttlSeconds', pasteTtl.value);
    if (pastePassword.value) body.set('password', pastePassword.value);

    const res = await fetch('api/paste.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    const data = await res.json();

    if (!res.ok) {
      pasteError.textContent = data.error || 'Could not save that.';
      pasteError.hidden = false;
      return;
    }

    pasteOk.textContent = data.protected ? 'Saved — encrypted with your password.' : 'Saved.';
    pasteOk.hidden = false;
    pasteContent.value = '';
    pastePassword.value = '';
    refreshList();
    if (!filesOpen) openFiles();
  } catch (e) {
    pasteError.textContent = 'Something went wrong — check your connection.';
    pasteError.hidden = false;
  } finally {
    setPasting(false);
  }
});

function setPasting(state) {
  pasteBtn.disabled = state;
  pasteBtnLabel.textContent = state ? 'Saving…' : 'Save';
  pasteSpinner.hidden = !state;
}

// ---------- available files toggle ----------

function openFiles() {
  filesOpen = true;
  toggleFiles.setAttribute('aria-expanded', 'true');
  filePanel.classList.add('open');
  refreshList();
}
function closeFiles() {
  filesOpen = false;
  toggleFiles.setAttribute('aria-expanded', 'false');
  filePanel.classList.remove('open');
}
toggleFiles.addEventListener('click', () => filesOpen ? closeFiles() : openFiles());

async function refreshList() {
  try {
    const res = await fetch('api/list.php');
    const files = await res.json();
    fileCountEl.textContent = files.length;
    fileListEl.innerHTML = '';
    emptyState.hidden = files.length !== 0;

    files.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.style.animationDelay = (i * 0.05) + 's';

      const icon = f.protected
        ? `<svg class="file-icon locked" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`
        : f.type === 'text'
          ? `<svg class="file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>`
          : `<svg class="file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/></svg>`;

      const actionLabel = f.protected ? 'Show' : (f.type === 'text' ? 'Copy' : 'Download');

      row.innerHTML = `
        <div class="file-info">
          ${icon}
          <div class="file-text">
            <div class="file-name">${escapeHtml(f.name)}</div>
            <div class="file-meta">${f.type === 'text' ? f.size + ' chars' : formatSize(f.size)} · ${formatRemaining(f.expiresAt)}</div>
          </div>
        </div>
        <div class="file-actions">
          <button class="btn-icon" data-copy-id="${f.id}" title="Copy share link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
          </button>
          <button class="btn-download" data-id="${f.id}" data-name="${escapeHtml(f.name)}" data-protected="${f.protected}" data-type="${f.type}">${actionLabel}</button>
        </div>
      `;
      fileListEl.appendChild(row);
    });

    fileListEl.querySelectorAll('.btn-download').forEach(btn => {
      btn.addEventListener('click', () => handleActionClick(btn.dataset.id, btn.dataset.name, btn.dataset.protected === 'true', btn.dataset.type, btn));
    });
    fileListEl.querySelectorAll('[data-copy-id]').forEach(btn => {
      btn.addEventListener('click', () => copyShareLink(btn.dataset.copyId, btn));
    });
  } catch (e) {
    // silent — next poll retries
  }
}

// ---------- share link copy ----------

const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>`;

async function copyShareLink(id, btn) {
  const link = new URL(`view.html?id=${encodeURIComponent(id)}`, window.location.href).toString();
  const original = btn.innerHTML;
  try {
    await navigator.clipboard.writeText(link);
  } catch (e) {
    // Clipboard API unavailable (e.g. non-HTTPS) — fall back to a manual copy prompt.
    window.prompt('Copy this link:', link);
  }
  btn.classList.add('copied');
  btn.innerHTML = checkSvg;
  setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = original; }, 1400);
}

// ---------- download / reveal (file vs text, plain vs password-gated) ----------

function handleActionClick(id, name, protectedFile, type, btnEl) {
  if (type === 'text' && !protectedFile) {
    revealText(id, btnEl); // no password needed — fetch and copy straight away
    return;
  }
  if (type !== 'text' && !protectedFile) {
    window.location.href = `api/download.php?id=${encodeURIComponent(id)}`;
    return;
  }
  pendingDownload = { id, name, type, btn: btnEl };
  modalTitle.textContent = type === 'text' ? 'This link is password-protected' : 'This file is password-protected';
  modalFileName.textContent = name;
  modalPasswordInput.value = '';
  modalError.hidden = true;
  modalBackdrop.hidden = false;
  setTimeout(() => modalPasswordInput.focus(), 50);
}

async function revealText(id, btnEl) {
  const original = btnEl.textContent;
  btnEl.disabled = true;
  btnEl.textContent = '…';
  try {
    const res = await fetch(`api/download.php?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) {
      btnEl.textContent = original;
      btnEl.disabled = false;
      return;
    }
    await copyToClipboard(data.content);
    btnEl.classList.add('copied');
    btnEl.textContent = 'Copied';
    setTimeout(() => { btnEl.classList.remove('copied'); btnEl.textContent = original; btnEl.disabled = false; }, 1400);
  } catch (e) {
    btnEl.textContent = original;
    btnEl.disabled = false;
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    window.prompt('Copy this:', text);
  }
}

function closeModal() {
  modalBackdrop.hidden = true;
  pendingDownload = null;
}
modalCancel.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
modalPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptUnlock(); });
modalUnlock.addEventListener('click', attemptUnlock);

async function attemptUnlock() {
  if (!pendingDownload) return;
  const password = modalPasswordInput.value;
  if (!password) {
    modalError.textContent = 'Enter the password.';
    modalError.hidden = false;
    return;
  }
  modalUnlock.disabled = true;
  modalUnlock.textContent = 'Checking…';

  try {
    const res = await fetch('api/download.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id=${encodeURIComponent(pendingDownload.id)}&password=${encodeURIComponent(password)}`
    });

    if (!res.ok) {
      const data = await res.json();
      modalError.textContent = data.error || 'Could not verify password.';
      modalError.hidden = false;
      modalPasswordInput.select();
      return;
    }

    const btn = pendingDownload.btn;

    if (pendingDownload.type === 'text') {
      // Text/link entries: password unlocks it, then it's copied straight to
      // the clipboard — that's the "show" the person asked for.
      const data = await res.json();
      await copyToClipboard(data.content);
      if (btn) {
        btn.classList.add('copied');
        btn.textContent = 'Copied';
        setTimeout(() => { btn.classList.remove('copied'); btn.textContent = 'Show'; }, 1400);
      }
    } else {
      // Files: reveal an actual download link on the row instead of
      // auto-downloading — the person decides when to save it.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (btn) {
        const link = document.createElement('a');
        link.className = 'btn-download revealed';
        link.href = url;
        link.download = pendingDownload.name;
        link.textContent = 'Download';
        btn.replaceWith(link);
      }
    }
    closeModal();
  } catch (e) {
    modalError.textContent = 'Something went wrong. Try again.';
    modalError.hidden = false;
  } finally {
    modalUnlock.disabled = false;
    modalUnlock.textContent = 'Unlock';
  }
}

// ---------- init ----------

refreshList();
setInterval(refreshList, 5000);
