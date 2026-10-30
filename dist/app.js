const video = document.querySelector('#camera');
const canvas = document.querySelector('#preview');
const ctx = canvas.getContext('2d');
const canvasWrap = document.querySelector('#canvasWrap');
const cameraEmpty = document.querySelector('#cameraEmpty');
const countdown = document.querySelector('#countdown');
const statusText = document.querySelector('#statusText');
const templateLabel = document.querySelector('#templateLabel');
const frameCounter = document.querySelector('#frameCounter');
const shotCount = document.querySelector('#shotCount');
const downloadButton = document.querySelector('#downloadButton');
const toast = document.querySelector('#toast');
const shareButton = document.querySelector('#shareButton');
let exportFile = null;
let exportRevision = 0;
let cameraStarting = false;

const templateConfig = {
  ...artworkTemplates,
  portrait: { width: 900, height: 1200, ratio: '3 / 4', label: 'PORTRAIT · 3:4' },
  story: { width: 720, height: 1280, ratio: '9 / 16', label: 'STORY · 9:16' },
  square: { width: 900, height: 900, ratio: '1 / 1', label: 'SQUARE · 1:1' },
  fourcut: { width: 900, height: 1125, ratio: '4 / 5', label: '4 CUT · 4:5' }
};

const filterConfig = {
  clean: 'none',
  glow: 'brightness(1.08) contrast(.94) saturate(1.08) sepia(.08)',
  dusk: 'contrast(1.08) saturate(.85) hue-rotate(332deg) brightness(.88)',
  mono: 'grayscale(1) contrast(1.14)',
  citrus: 'saturate(1.32) contrast(1.05) sepia(.12) hue-rotate(345deg)'
};

let state = {
  template: 'penguins',
  filter: 'clean',
  extra: 'none',
  stream: null,
  facingMode: 'user',
  sourceImage: null,
  shots: [],
  running: false,
  counting: false
};
let selectedSlot = 0;
const drafts = new Map();
let liveFit = { zoom:1, x:0, y:0 };
const slotSurface = document.createElement('canvas');
const slotContext = slotSurface.getContext('2d', { willReadFrequently:true });
const currentArt = () => artworkTemplates[state.template];
const requiredShots = () => currentArt()?.slots.length || (state.template === 'fourcut' ? 4 : 1);
const filledShots = () => state.shots.slice(0, requiredShots()).filter(Boolean).length;
const complete = () => filledShots() === requiredShots();
const selectedFit = () => state.shots[selectedSlot]?.fit || liveFit;

function renderArtwork(guides) {
  const art = currentArt();
  if (!art.image.complete || !art.image.naturalWidth) return;
  ctx.drawImage(art.image, 0, 0, canvas.width, canvas.height);
  art.slots.forEach((slot, index) => {
    const [x,y,w,h] = slot.box;
    if (slotSurface.width !== w || slotSurface.height !== h) { slotSurface.width = w; slotSurface.height = h; }
    const shot = state.shots[index];
    const source = shot?.image || (index === selectedSlot ? getLiveSource() : null);
    slotContext.clearRect(0,0,w,h);
    if (source) {
      const fit = shot?.fit || liveFit;
      const sw = source.videoWidth || source.naturalWidth || source.width;
      const sh = source.videoHeight || source.naturalHeight || source.height;
      const scale = Math.max(w/sw,h/sh) * fit.zoom;
      const dw = sw * scale, dh = sh * scale;
      const dx = (w-dw)/2 + fit.x * (dw-w)/2;
      const dy = (h-dh)/2 + fit.y * (dh-h)/2;
      // Filter in a separate surface so Safari's pixel fallback respects the cutout.
      drawMedia(slotContext, source, dx,dy,dw,dh);
    } else { slotContext.fillStyle='#eaeaea'; slotContext.fillRect(0,0,w,h); }
    ctx.save();
    ctx.clip(slot.clip);
    ctx.drawImage(slotSurface,x,y,w,h);
    if (!source && guides) {
      ctx.fillStyle='#555'; ctx.font=`600 ${Math.round(w*.1)}px Manrope, sans-serif`;
      ctx.textAlign='center'; ctx.fillText(`PHOTO ${index+1}`,x+w/2,y+h/2); ctx.textAlign='left';
    }
    ctx.restore();
    if (guides && index === selectedSlot) { ctx.save(); ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=3; ctx.setLineDash([9,9]); ctx.stroke(slot.clip); ctx.restore(); }
  });
}

function resizeCanvas() {
  const config = templateConfig[state.template];
  if (canvas.width !== config.width || canvas.height !== config.height) {
    canvas.width = config.width;
    canvas.height = config.height;
  }
  canvasWrap.style.aspectRatio = config.ratio;
  canvasWrap.style.setProperty('--phone-preview-width', `calc(48svh * ${config.width / config.height})`);
  templateLabel.textContent = config.label;
}

function coverRect(sourceWidth, sourceHeight, x, y, width, height) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const sw = width / scale;
  const sh = height / scale;
  return { sx: (sourceWidth - sw) / 2, sy: (sourceHeight - sh) / 2, sw, sh, dx: x, dy: y, dw: width, dh: height };
}

function getLiveSource() {
  if (state.sourceImage) return state.sourceImage;
  if (state.stream?.active && video.readyState >= 2) return video;
  return null;
}

function drawMedia(target, source, x, y, width, height, filter = filterConfig[state.filter]) {
  if (!source) {
    target.fillStyle = '#292925';
    target.fillRect(x, y, width, height);
    return;
  }
  const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height;
  if (!sourceWidth || !sourceHeight) return;
  const crop = coverRect(sourceWidth, sourceHeight, x, y, width, height);
  target.save();
  target.filter = filter;
  if (source === video && state.facingMode === 'user') {
    target.translate(x + width, 0);
    target.scale(-1, 1);
    crop.dx = 0;
  }
  target.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, crop.dx, crop.dy, crop.dw, crop.dh);
  target.restore();
  // Older Safari versions lack CanvasRenderingContext2D.filter.
  if (!('filter' in CanvasRenderingContext2D.prototype) && filter !== 'none') {
    const px = Math.max(0, Math.floor(x)), py = Math.max(0, Math.floor(y));
    const pw = Math.min(target.canvas.width-px, Math.ceil(width)), ph = Math.min(target.canvas.height-py, Math.ceil(height));
    if (pw <= 0 || ph <= 0) return;
    const pixels = target.getImageData(px, py, pw, ph);
    const data = pixels.data;
    const settings = {
      clean: [1, 1, 1, 0, 0], glow: [1.08, .94, 1.08, 5, -3],
      dusk: [.88, 1.08, .85, 8, 12], mono: [1, 1.14, 0, 0, 0],
      citrus: [1, 1.05, 1.32, 8, -8]
    }[state.filter];
    const [brightness, contrast, saturation, red, blue] = settings;
    for (let i = 0; i < data.length; i += 4) {
      const gray = .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2];
      for (let channel = 0; channel < 3; channel++) {
        data[i + channel] = ((gray + (data[i + channel] - gray) * saturation) * brightness - 128) * contrast + 128 + (channel === 0 ? red : channel === 2 ? blue : 0);
      }
    }
    target.putImageData(pixels, px, py);
  }
}

function drawShot(target, imageData, x, y, width, height) {
  if (!imageData) {
    drawMedia(target, getLiveSource(), x, y, width, height);
    return;
  }
  if (!imageData.image) {
    imageData.image = new Image();
    imageData.image.src = imageData.url;
  }
  if (imageData.image.complete || imageData.image instanceof HTMLCanvasElement) drawMedia(target, imageData.image, x, y, width, height);
}

function drawDecoration(target, width, height) {
  target.save();
  if (state.extra === 'sparkles') {
    target.fillStyle = '#d9ff55';
    target.font = `700 ${Math.round(width * .065)}px Georgia`;
    target.fillText('✦', width * .07, height * .12);
    target.fillText('✦', width * .83, height * .22);
    target.font = `700 ${Math.round(width * .04)}px Georgia`;
    target.fillText('✦', width * .12, height * .84);
    target.fillText('✦', width * .88, height * .73);
  }
  if (state.extra === 'hearts') {
    target.fillStyle = '#ff756f';
    target.font = `700 ${Math.round(width * .055)}px Georgia`;
    target.fillText('♥', width * .07, height * .13);
    target.fillText('♥', width * .84, height * .18);
    target.fillText('♥', width * .13, height * .86);
    target.fillText('♥', width * .86, height * .79);
  }
  if (state.extra === 'stamp') {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    target.font = `500 ${Math.round(width * .024)}px monospace`;
    const textWidth = target.measureText(date).width;
    target.fillStyle = 'rgba(0,0,0,.62)';
    target.fillRect(width - textWidth - width * .075, height - width * .1, textWidth + width * .04, width * .055);
    target.fillStyle = '#d9ff55';
    target.fillText(date, width - textWidth - width * .055, height - width * .063);
  }
  target.restore();
}

function renderFrame(loop = true, guides = true) {
  resizeCanvas();
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(0, 0, width, height);

  if (currentArt()) {
    renderArtwork(guides);
  } else if (state.template === 'portrait' || state.template === 'story' || state.template === 'square') {
    drawShot(ctx, state.shots[0], 0, 0, width, height);
  } else {
    const gap = Math.round(width * .018);
    const margin = Math.round(width * .06);
    const footer = Math.round(height * .105);
    const cellW = (width - margin * 2 - gap) / 2;
    const cellH = (height - margin * 2 - gap - footer) / 2;
    for (let i = 0; i < 4; i++) {
      const x = margin + (i % 2) * (cellW + gap);
      const y = margin + Math.floor(i / 2) * (cellH + gap);
      drawShot(ctx, state.shots[i], x, y, cellW, cellH);
    }
    ctx.fillStyle = '#171714';
    ctx.font = `800 ${Math.round(width * .034)}px Manrope, sans-serif`;
    ctx.fillText('Y2K PHOTOBOOTH', margin, height - margin * .72);
    ctx.textAlign = 'right';
    ctx.font = `500 ${Math.round(width * .018)}px monospace`;
    ctx.fillText('MAKE A MOMENT · KEEP THE FEELING', width - margin, height - margin * .75);
    ctx.textAlign = 'left';
  }
  drawDecoration(ctx, width, height);
  if (loop) setTimeout(() => requestAnimationFrame(() => {
    if (!document.hidden) renderFrame();
    else renderFrameLater();
  }), 1000 / 24);
}

function renderFrameLater() {
  setTimeout(() => document.hidden ? renderFrameLater() : renderFrame(), 500);
}

async function startCamera() {
  if (cameraStarting || state.counting) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Camera access is not supported here. Try uploading a photo.');
    return;
  }
  try {
    cameraStarting = true;
    if (state.stream) state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
    video.srcObject = null;
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: state.facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    video.srcObject = state.stream;
    await video.play();
    const actualFacing = state.stream.getVideoTracks()[0].getSettings().facingMode;
    if (actualFacing) state.facingMode = actualFacing;
    state.sourceImage = null;
    state.running = true;
    cameraEmpty.classList.add('hidden');
    statusText.textContent = state.facingMode === 'user' ? 'FRONT CAMERA · LIVE' : 'BACK CAMERA · LIVE';
  } catch (error) {
    console.error(error);
    showToast('Camera permission was blocked. You can still upload a photo.');
  } finally {
    cameraStarting = false;
  }
}

async function flipCamera() {
  if (cameraStarting || state.counting) return;
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  await startCamera();
}

function loadUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.stream?.getTracks().forEach(track => track.stop());
      state.stream = null;
      video.srcObject = null;
      state.sourceImage = image;
      cameraEmpty.classList.add('hidden');
      statusText.textContent = 'UPLOADED PHOTO';
      if (currentArt()) captureCurrentSource();
      else showToast('Photo loaded. Pick a look and take your shot.');
    };
    image.onerror = () => showToast('This photo could not be opened. Try a JPEG or PNG.');
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function takePhoto() {
  if (state.counting) return;
  if (!getLiveSource()) {
    await startCamera();
    return;
  }
  state.counting = true;
  for (const number of ['3', '2', '1']) {
    countdown.textContent = number;
    countdown.classList.remove('show');
    void countdown.offsetWidth;
    countdown.classList.add('show');
    await wait(650);
  }
  countdown.textContent = '✦';
  await wait(180);
  captureCurrentSource();
  countdown.classList.remove('show');
  state.counting = false;
}

function captureCurrentSource() {
  const source = getLiveSource();
  if (!source) return;
  const capture = document.createElement('canvas');
  const sw = source.videoWidth || source.naturalWidth;
  const sh = source.videoHeight || source.naturalHeight;
  const scale = Math.min(1, 1800/Math.max(sw,sh));
  capture.width = Math.round(sw*scale);
  capture.height = Math.round(sh*scale);
  const captureCtx = capture.getContext('2d');
  drawMedia(captureCtx, source, 0, 0, capture.width, capture.height, 'none');
  const shot = { url: capture.toDataURL('image/jpeg', .94), image: capture, fit:{...liveFit} };
  if (currentArt()) {
    state.shots[selectedSlot] = shot;
    const next = currentArt().slots.findIndex((_,i) => !state.shots[i]);
    if (next >= 0) selectedSlot = next;
    liveFit = { zoom:1,x:0,y:0 };
  } else if (state.template === 'fourcut') {
    if (state.shots.length >= 4) state.shots.shift();
    state.shots.push(shot);
  } else {
    state.shots = [shot];
  }
  updateShots();
  showToast(complete() ? 'Your template is ready to save.' : `Photo saved. Fill photo ${selectedSlot+1} next.`);
  if (complete()) togglePanel(true);
}

function updateShots() {
  document.querySelectorAll('.shot').forEach((button, index) => {
    const shot = state.shots[index];
    button.hidden = index >= requiredShots();
    button.setAttribute('aria-label', shot ? `Select photo ${index+1}` : `Empty photo ${index+1}`);
    button.innerHTML = shot ? `<img src="${shot.url}" alt="Captured shot ${index + 1}">` : `<span>${index + 1}</span>`;
    button.classList.toggle('empty', !shot);
  });
  const required = requiredShots();
  shotCount.textContent = `${filledShots()} / ${required}`;
  frameCounter.textContent = currentArt() ? `PHOTO ${selectedSlot+1} / ${required}` : `${filledShots()} / ${required} CAPTURED`;
  downloadButton.disabled = true;
  document.querySelector('#artworkTools').hidden = !currentArt();
  document.querySelector('#photoAdjustment').hidden = !currentArt();
  canvasWrap.classList.toggle('artwork-preview', !!currentArt());
  cameraEmpty.classList.toggle('hidden', !!currentArt() || !!getLiveSource());
  document.querySelector('#slotButtons').innerHTML = currentArt() ? currentArt().slots.map((_,i)=>`<button data-slot="${i}" aria-pressed="${i===selectedSlot}">Photo ${i+1}${state.shots[i]?' ✓':''}</button>`).join('') : '';
  const fit = selectedFit();
  document.querySelector('#photoZoom').value=fit.zoom;
  document.querySelector('#photoX').value=fit.x;
  document.querySelector('#photoY').value=fit.y;
  prepareExport();
}

async function prepareExport() {
  const revision = ++exportRevision;
  exportFile = null;
  shareButton.disabled = true;
  downloadButton.disabled = true;
  if (!complete()) return;
  await currentArt()?.ready;
  await Promise.all(state.shots.filter(Boolean).map(async shot => {
    if (!shot.image) { shot.image = new Image(); shot.image.src = shot.url; }
    if (shot.image.decode) await shot.image.decode();
  }));
  if (revision !== exportRevision) return;
  renderFrame(false, false);
  canvas.toBlob(blob => {
    if (!blob || revision !== exportRevision) return;
    exportFile = new File([blob], `y2k-photobooth-${state.template}.png`, { type: 'image/png' });
    downloadButton.disabled = false;
    shareButton.hidden = !navigator.canShare?.({ files: [exportFile] });
    shareButton.disabled = false;
    if (!shareButton.hidden) document.querySelector('#saveNote').textContent = 'Tap Save to Photos / Share, then choose Save Image to keep it in Photos.';
  }, 'image/png');
}

async function sharePhoto() {
  if (!exportFile) return;
  try { await navigator.share({ files: [exportFile], title: 'My Y2K Photobooth photo' }); }
  catch (error) { if (error.name !== 'AbortError') showToast('Sharing is unavailable here. Use Save your photo to download.'); }
}

function chooseFromGroup(containerSelector, button, stateKey, value) {
  document.querySelectorAll(`${containerSelector} button`).forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  state[stateKey] = value;
  prepareExport();
}

function selectTemplate(button) {
  if (state.counting) return;
  drafts.set(state.template, state.shots);
  state.template = button.dataset.template;
  state.shots = drafts.get(state.template) || [];
  selectedSlot = 0;
  liveFit = {zoom:1,x:0,y:0};
  document.querySelectorAll('[data-template]').forEach(item => { item.classList.toggle('active',item.dataset.template===state.template); item.setAttribute('aria-pressed',String(item.dataset.template===state.template)); });
  resizeCanvas();
  updateShots();
  togglePanel(false);
}

function removeShot(index) {
  if (!state.shots[index]) return;
  state.shots.splice(index, 1);
  updateShots();
  showToast('Shot removed.');
}

function downloadPhoto() {
  if (!exportFile) return;
  const link = document.createElement('a');
  link.download = `y2k-photobooth-${state.template}-${Date.now()}.png`;
  link.href = URL.createObjectURL(exportFile);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  showToast('Download started. Check Files → Downloads.');
}

function resetAll() {
  if (state.counting) return;
  state.filter = 'clean';
  state.extra = 'none';
  state.shots = [];
  drafts.set(state.template, []);
  selectedSlot=0;
  liveFit={zoom:1,x:0,y:0};
  document.querySelectorAll('#filterList button').forEach(button => button.classList.toggle('active', button.dataset.filter === 'clean'));
  document.querySelectorAll('#extraList button').forEach(button => button.classList.toggle('active', button.dataset.extra === 'none'));
  resizeCanvas();
  updateShots();
  showToast('Back to a clean slate.');
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

document.querySelector('#startCamera').addEventListener('click', startCamera);
document.querySelector('#enableCamera').addEventListener('click', startCamera);
document.querySelector('#artworkGallery').innerHTML = Object.entries(artworkTemplates).map(([key,art]) => `<button class="artwork-card" data-template="${key}"><img src="./templates/${art.file}.png" alt="${art.name} photo template"><span>${art.name}</span><small>${art.slots.length} photo${art.slots.length>1?'s':''}</small></button>`).join('');
document.querySelector('#artworkGallery').addEventListener('click', event => {
  const button=event.target.closest('[data-template]'); if(button) selectTemplate(button);
});
document.querySelector('#slotButtons').addEventListener('click', event => {
  const button=event.target.closest('[data-slot]'); if(button && !state.counting) { selectedSlot=Number(button.dataset.slot); updateShots(); }
});
for (const [id,key] of [['photoZoom','zoom'],['photoX','x'],['photoY','y']]) {
  document.getElementById(id).addEventListener('input',event => { selectedFit()[key]=Number(event.target.value); prepareExport(); });
}
document.querySelector('#clearSlot').addEventListener('click', () => { if(state.counting)return; state.shots[selectedSlot]=null; updateShots(); });
document.querySelector('#resetFit').addEventListener('click', () => { Object.assign(selectedFit(),{zoom:1,x:0,y:0}); updateShots(); });
function togglePanel(force) {
  const panel = document.querySelector('.control-panel');
  const expanded = typeof force === 'boolean' ? force : !panel.classList.contains('expanded');
  panel.classList.toggle('expanded', expanded);
  document.querySelector('#panelToggle').setAttribute('aria-expanded', String(expanded));
  document.querySelector('#panelToggle').setAttribute('aria-label', expanded ? 'Collapse booth settings' : 'Expand booth settings');
  document.querySelector('#panelToggle').textContent = expanded ? '−' : '＋';
}
document.querySelector('#panelToggle').addEventListener('click', () => togglePanel());
document.querySelector('#settingsShortcut').addEventListener('click', () => {
  togglePanel();
  if (!matchMedia('(max-width:600px)').matches) document.querySelector('#templateGrid button').focus();
});
document.querySelectorAll('.upload-trigger').forEach(button => button.addEventListener('click', () => document.querySelector('#uploadPhoto').click()));
shareButton.addEventListener('click', sharePhoto);
document.querySelector('#flipCamera').addEventListener('click', flipCamera);
document.querySelector('#shutter').addEventListener('click', takePhoto);
document.querySelector('#uploadPhoto').addEventListener('change', event => { if(!state.counting)loadUpload(event.target.files[0]); event.target.value=''; });
document.querySelector('#templateGrid').addEventListener('click', event => {
  const button = event.target.closest('button[data-template]');
  if (button) selectTemplate(button);
});
document.querySelector('#filterList').addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]');
  if (button) chooseFromGroup('#filterList', button, 'filter', button.dataset.filter);
});
document.querySelector('#extraList').addEventListener('click', event => {
  const button = event.target.closest('button[data-extra]');
  if (button) chooseFromGroup('#extraList', button, 'extra', button.dataset.extra);
});
document.querySelector('#shots').addEventListener('click', event => {
  const button = event.target.closest('.shot');
  if (button && !state.counting) { if(currentArt()){selectedSlot=Number(button.dataset.index);updateShots();}else removeShot(Number(button.dataset.index)); }
});
document.querySelector('#resetAll').addEventListener('click', resetAll);
document.querySelector('#downloadButton').addEventListener('click', downloadPhoto);
window.addEventListener('beforeunload', () => state.stream?.getTracks().forEach(track => track.stop()));

selectTemplate(document.querySelector('[data-template="penguins"]'));
renderFrame();
