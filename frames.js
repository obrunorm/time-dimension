export async function* extractFrames(file, config, signal) {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    const ready = waitForEvent(video, 'loadeddata', signal);
    video.src = url;
    video.load();
    await ready;

    if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth) {
      throw new Error('Unable to determine the video duration or dimensions.');
    }

    if (video.duration > config.maxDurationSeconds) {
      throw new Error('The video exceeds the 1-minute (60-second) limit. Please choose a shorter video.');
    }

    const scale = Math.min(1, config.maxFrameSize / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const count = Math.max(1, Math.floor(config.frameLimit));

    const lastTime = Math.max(0, video.duration - Math.min(0.1, video.duration / 2));

    for (let index = 0; index < count; index++) {
      signal.throwIfAborted();
      const time = count === 1 ? 0 : index * lastTime / (count - 1);
      if (Math.abs(video.currentTime - time) > 0.000001) {
        const seekComplete = waitForEvent(video, 'seeked', signal);
        video.currentTime = time;
        await seekComplete;
      }

      signal.throwIfAborted();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not extract the video frames.');
      context.drawImage(video, 0, 0, width, height);
      yield { canvas, index, count };
    }
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

function waitForEvent(video, eventName, signal) {
  return new Promise((resolve, reject) => {
    let timeoutId;
    function clear() {
      clearTimeout(timeoutId);
      video.removeEventListener(eventName, complete);
      video.removeEventListener('error', fail);
      signal.removeEventListener('abort', cancel);
    }
    function complete() { clear(); resolve(); }
    function fail() {
      clear();
      reject(new Error('Unable to read the video. Try an H.264 MP4 or a WebM file supported by your browser.'));
    }
    function cancel() { clear(); reject(new DOMException('Operation canceled.', 'AbortError')); }
    if (signal.aborted) { cancel(); return; }
    video.addEventListener(eventName, complete, { once: true });
    video.addEventListener('error', fail, { once: true });
    signal.addEventListener('abort', cancel, { once: true });
    timeoutId = setTimeout(() => {
      clear();
      reject(new Error('The video took too long to respond. Please try another file.'));
    }, 30000);
  });
}
