// Created: 2026-02-25 00:00

const CANVAS_SIZE  = 280;
const BRUSH_RADIUS = 13;

const canvas       = document.getElementById('canvas');
const ctx          = canvas.getContext('2d');
const predDigit    = document.getElementById('predDigit');
const predConf     = document.getElementById('predConf');
const barsContainer = document.getElementById('barsContainer');
const statusEl     = document.getElementById('status');
const clearBtn     = document.getElementById('clearBtn');
const recognizeBtn = document.getElementById('recognizeBtn');

// ── Init canvas ──────────────────────────────────────────────────────────────

function initCanvas() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

// ── Build probability bars ───────────────────────────────────────────────────

const barFills = [];
const barPcts  = [];
const barDigitEls = [];

function buildBars() {
  for (let i = 0; i < 10; i++) {
    const row = document.createElement('div');
    row.className = 'bar-row';

    const dLabel = document.createElement('span');
    dLabel.className = 'bar-digit';
    dLabel.textContent = i;

    const track = document.createElement('div');
    track.className = 'bar-track';

    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    track.appendChild(fill);

    const pct = document.createElement('span');
    pct.className = 'bar-pct';
    pct.textContent = '0 %';

    row.append(dLabel, track, pct);
    barsContainer.appendChild(row);

    barFills.push(fill);
    barPcts.push(pct);
    barDigitEls.push(dLabel);
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let isDrawing = false;
let lastX = 0;
let lastY = 0;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  return [src.clientX - rect.left, src.clientY - rect.top];
}

function paintDot(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function paintLine(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = BRUSH_RADIUS * 2;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.stroke();
  paintDot(x2, y2);
}

function onStart(e) {
  e.preventDefault();
  isDrawing = true;
  [lastX, lastY] = getPos(e);
  paintDot(lastX, lastY);
}

function onMove(e) {
  e.preventDefault();
  if (!isDrawing) return;
  const [x, y] = getPos(e);
  paintLine(lastX, lastY, x, y);
  [lastX, lastY] = [x, y];
}

function onEnd(e) {
  e.preventDefault();
  if (!isDrawing) return;
  isDrawing = false;
  recognize();
}

canvas.addEventListener('mousedown',  onStart);
canvas.addEventListener('mousemove',  onMove);
canvas.addEventListener('mouseup',    onEnd);
canvas.addEventListener('mouseleave', onEnd);
canvas.addEventListener('touchstart', onStart, { passive: false });
canvas.addEventListener('touchmove',  onMove,  { passive: false });
canvas.addEventListener('touchend',   onEnd,   { passive: false });

// ── Clear ────────────────────────────────────────────────────────────────────

function clear() {
  initCanvas();
  predDigit.textContent = '–';
  predConf.textContent  = '–';
  predDigit.style.color = '#4fc3f7';
  for (let i = 0; i < 10; i++) {
    barFills[i].style.width = '0%';
    barFills[i].classList.remove('top');
    barPcts[i].textContent = '0 %';
    barPcts[i].classList.remove('top');
    barDigitEls[i].classList.remove('top');
  }
  setStatus('캔버스가 지워졌습니다.');
}

clearBtn.addEventListener('click', clear);

// ── Recognize ────────────────────────────────────────────────────────────────

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function recognize() {
  const imageData = canvas.toDataURL('image/png');

  setStatus('인식 중...');
  recognizeBtn.disabled = true;

  try {
    const res  = await fetch('/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ image: imageData }),
    });

    if (!res.ok) throw new Error(`서버 오류: ${res.status}`);

    const data = await res.json();
    updateUI(data);
    setStatus('인식 완료');
  } catch (err) {
    setStatus(`오류: ${err.message}`);
  } finally {
    recognizeBtn.disabled = false;
  }
}

recognizeBtn.addEventListener('click', recognize);

// ── Update UI ─────────────────────────────────────────────────────────────────

function updateUI({ digit, confidence, probabilities }) {
  if (digit === -1) {
    predDigit.textContent = '–';
    predConf.textContent  = '–';
    return;
  }

  predDigit.textContent = digit;
  predConf.textContent  = confidence.toFixed(1) + ' %';

  for (let i = 0; i < 10; i++) {
    const p      = probabilities[i];
    const isTop  = i === digit;

    barFills[i].style.width = p + '%';
    barFills[i].classList.toggle('top', isTop);
    barPcts[i].textContent = p.toFixed(1) + ' %';
    barPcts[i].classList.toggle('top', isTop);
    barDigitEls[i].classList.toggle('top', isTop);
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

buildBars();
initCanvas();
setStatus('준비 완료 — 캔버스에 숫자를 그리세요');
