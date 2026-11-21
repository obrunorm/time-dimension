import { CONFIG } from './config.js';
import { extractFrames } from './frames.js';
import { VideoFrameViewer } from './video-frame-viewer.js';

const ui = {
  upload: document.querySelector('#upload-screen'),
  viewerScreen: document.querySelector('#viewer-screen'),
  dropZone: document.querySelector('#video-drop-zone'),
  file: document.querySelector('#video-file'),
  select: document.querySelector('#select-video'),
  loading: document.querySelector('#frame-extraction-progress'),
  message: document.querySelector('#progress-message'),
  progress: document.querySelector('#progress'),
  error: document.querySelector('#upload-error'),
  cancel: document.querySelector('#cancel'),
  back: document.querySelector('#back'),
  videoName: document.querySelector('#viewer-video-name'),
  zoomIn: document.querySelector('#zoom-in'),
  zoomOut: document.querySelector('#zoom-out'),
};

let viewer;
let currentOperation = null;

function getViewer() {
  if (!viewer) {
    viewer = new VideoFrameViewer(document.querySelector('#viewer-canvas-container'), CONFIG, (zoom) => {
      ui.zoomIn.disabled = !zoom.canZoomIn;
      ui.zoomOut.disabled = !zoom.canZoomOut;
    });
  }
  return viewer;
}

function showError(message) {
  ui.error.textContent = message;
  ui.error.hidden = false;
}

function setLoading(loading) {
  ui.dropZone.hidden = loading;
  ui.loading.hidden = !loading;
  ui.upload.setAttribute('aria-busy', String(loading));
}

async function openVideo(file) {
  if (currentOperation) return;
  ui.error.hidden = true;
  const hasVideoExtension = /\.(mp4|webm|mov|m4v|ogv|ogg|avi|mkv)$/i.test(file.name);
  if (!file.type.startsWith('video/') && !hasVideoExtension) {
    showError('Please select a video file.');
    return;
  }

  const operation = new AbortController();
  currentOperation = operation;
  ui.progress.value = 0;
  ui.message.textContent = 'Preparing video...';
  setLoading(true);

  try {
    const scene = getViewer();
    scene.clear();
    for await (const frame of extractFrames(file, CONFIG, operation.signal)) {
      operation.signal.throwIfAborted();
      scene.addFrame(frame);
      ui.progress.value = (frame.index + 1) / frame.count * 100;
      ui.message.textContent = `Extracting frame ${frame.index + 1} of ${frame.count}...`;
    }

    operation.signal.throwIfAborted();
    ui.videoName.textContent = file.name;
    ui.upload.hidden = true;
    ui.viewerScreen.hidden = false;
    scene.show();
    ui.back.focus();
  } catch (error) {
    viewer?.clear();
    ui.upload.hidden = false;
    ui.viewerScreen.hidden = true;
    if (error.name !== 'AbortError') {
      console.error(error);
      showError(error.message || 'Unable to process the video.');
    }
  } finally {
    currentOperation = null;
    ui.file.value = '';
    setLoading(false);
    if (!ui.upload.hidden) ui.select.focus();
  }
}

function backToSelection() {
  viewer?.clear();
  ui.viewerScreen.hidden = true;
  ui.upload.hidden = false;
  ui.error.hidden = true;
  ui.file.value = '';
  ui.videoName.textContent = '';
  ui.progress.value = 0;
  ui.select.focus();
}

ui.select.addEventListener('click', () => ui.file.click());
ui.file.addEventListener('change', () => {
  const file = ui.file.files[0];
  if (file) openVideo(file);
});
ui.cancel.addEventListener('click', () => currentOperation?.abort());
ui.back.addEventListener('click', backToSelection);
ui.zoomIn.addEventListener('click', () => viewer?.changeZoom(true));
ui.zoomOut.addEventListener('click', () => viewer?.changeZoom(false));

for (const event of ['dragover', 'drop']) {
  window.addEventListener(event, (e) => e.preventDefault());
}
ui.dropZone.addEventListener('dragover', () => ui.dropZone.classList.add('is-dragging'));
ui.dropZone.addEventListener('dragleave', (event) => {
  if (!ui.dropZone.contains(event.relatedTarget)) ui.dropZone.classList.remove('is-dragging');
});
ui.dropZone.addEventListener('drop', (event) => {
  ui.dropZone.classList.remove('is-dragging');
  const files = event.dataTransfer.files;
  if (files.length !== 1) {
    showError('Please add one video at a time.');
    return;
  }
  openVideo(files[0]);
});
