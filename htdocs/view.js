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

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    window.prompt('Copy this:', text);
    return false;
  }
}

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

const loadingState = document.getElementById('loadingState');
const notFoundState = document.getElementById('notFoundState');
const fileState = document.getElementById('fileState');
const viewFileName = document.getElementById('viewFileName');
const viewFileMeta = document.getElementById('viewFileMeta');
const viewFileIcon = document.getElementById('viewFileIcon');

const unprotectedBlock = document.getElementById('unprotectedBlock');
const directDownloadLink = document.getElementById('directDownloadLink');

const unprotectedTextBlock = document.getElementById('unprotectedTextBlock');
const unprotectedTextContent = document.getElementById('unprotectedTextContent');
const copyUnprotectedBtn = document.getElementById('copyUnprotectedBtn');

const protectedBlock = document.getElementById('protectedBlock');
const passwordGate = document.getElementById('passwordGate');
const viewPasswordInput = document.getElementById('viewPasswordInput');
const showBtn = document.getElementById('showBtn');
const viewError = document.getElementById('viewError');

const revealedLink = document.getElementById('revealedLink');
const revealedDownloadLink = document.getElementById('revealedDownloadLink');
const revealedFileName = document.getElementById('revealedFileName');

const revealedText = document.getElementById('revealedText');
const revealedTextContent = document.getElementById('revealedTextContent');
const copyRevealedBtn = document.getElementById('copyRevealedBtn');

const lockSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
const fileSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/></svg>`;
const linkSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>`;

async function init() {
  if (!id) {
    showNotFound();
    return;
  }
  try {
    const res = await fetch(`api/info.php?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      showNotFound();
      return;
    }
    const info = await res.json();
    render(info);
  } catch (e) {
    showNotFound();
  }
}

function showNotFound() {
  loadingState.hidden = true;
  notFoundState.hidden = false;
}

async function render(info) {
  loadingState.hidden = true;
  fileState.hidden = false;

  const isText = info.type === 'text';
  viewFileIcon.innerHTML = info.protected ? lockSvg : (isText ? linkSvg : fileSvg);
  viewFileIcon.classList.toggle('locked', !!info.protected);
  viewFileName.textContent = info.name;
  viewFileMeta.textContent = `${isText ? info.size + ' chars' : formatSize(info.size)} · ${formatRemaining(info.expiresAt)}`;

  if (info.protected) {
    protectedBlock.hidden = false;
    showBtn.addEventListener('click', () => attemptShow(info));
    viewPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptShow(info); });
    return;
  }

  if (isText) {
    // No password needed — fetch and show right away.
    try {
      const res = await fetch(`api/download.php?id=${encodeURIComponent(info.id)}`);
      const data = await res.json();
      unprotectedTextContent.textContent = data.content;
      unprotectedTextBlock.hidden = false;
      copyUnprotectedBtn.addEventListener('click', async () => {
        const ok = await copyToClipboard(data.content);
        if (ok) flashCopied(copyUnprotectedBtn);
      });
    } catch (e) {
      showNotFound();
    }
  } else {
    unprotectedBlock.hidden = false;
    directDownloadLink.href = `api/download.php?id=${encodeURIComponent(info.id)}`;
    directDownloadLink.textContent = `Download ${info.name}`;
  }
}

function flashCopied(btn) {
  const original = btn.textContent;
  btn.textContent = 'Copied';
  setTimeout(() => { btn.textContent = original; }, 1400);
}

async function attemptShow(info) {
  const password = viewPasswordInput.value;
  if (!password) {
    viewError.textContent = 'Enter the password.';
    viewError.hidden = false;
    return;
  }
  showBtn.disabled = true;
  showBtn.textContent = 'Checking…';
  viewError.hidden = true;

  try {
    const res = await fetch('api/download.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id=${encodeURIComponent(id)}&password=${encodeURIComponent(password)}`
    });

    if (!res.ok) {
      const data = await res.json();
      viewError.textContent = data.error || 'Could not verify password.';
      viewError.hidden = false;
      return;
    }

    passwordGate.hidden = true;

    if (info.type === 'text') {
      const data = await res.json();
      revealedTextContent.textContent = data.content;
      revealedText.hidden = false;
      copyRevealedBtn.addEventListener('click', async () => {
        const ok = await copyToClipboard(data.content);
        if (ok) flashCopied(copyRevealedBtn);
      });
    } else {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      revealedDownloadLink.href = url;
      revealedDownloadLink.download = info.name;
      revealedFileName.textContent = info.name;
      revealedLink.hidden = false;
    }
  } catch (e) {
    viewError.textContent = 'Something went wrong. Try again.';
    viewError.hidden = false;
  } finally {
    showBtn.disabled = false;
    showBtn.textContent = 'Show';
  }
}

init();
