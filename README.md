# Time Dimension

Explore time as depth by turning a video into interactive layers of frames.

**[Try the live demo](https://obrunorm.github.io/time-dimension/)** — open the site and select a video up to 1 minute long.

Time Dimension is a browser-based visualization built with Three.js. Instead of watching frames replace one another during playback, you can see sampled moments arranged together in a 3D stack. Rotate the stack, zoom in, and scroll to gradually reveal its layers.

## The idea: time as a dimension

In relativity, describing an event requires both where it happens and when it happens: three spatial coordinates and one time coordinate. Together, these form four-dimensional spacetime. This is the sense in which time is commonly called the fourth dimension. [Einstein Online: Spacetime](https://www.einstein-online.info/en/explandict/spacetime/)

Physicists use spacetime diagrams to represent temporal and spatial relationships geometrically. A diagram can place time along a visible axis, allowing events and their relationships to be examined together. [MIT: Spacetime, Simultaneity, and the Consequences of Lorentz](https://ocw-preview.odl.mit.edu/courses/8-033-introduction-to-relativity-and-spacetime-physics-fall-2024/mit8_033_f24_lec04.pdf)

This project borrows the visual idea of giving time an axis. A video contains two image coordinates and a sequence of timestamps. The viewer maps the image coordinates onto each plane and maps temporal order onto depth:

```text
Video:   image width + image height + time
Viewer:  plane width + plane height + stack depth
```

Each plane represents a sampled moment. Moving through the stack reveals change over time as a spatial arrangement.

This is an illustrative visualization of video data, not a simulation of relativistic spacetime or a reconstruction of a scene's physical depth. The stack represents two image dimensions plus time; it does not recover three spatial dimensions plus time. Rotating the view changes how you inspect that representation, rather than performing a physical transformation between observers.

## Features

- Drag and drop a video or select a local file.
- Accept videos up to **1 minute (60 seconds)** long.
- Extract **60 evenly distributed samples** by default, rather than every original video frame.
- Display the samples as parallel planes with small gaps.
- Rotate and pan the camera around the stack.
- Gradually adjust layer transparency using the mouse wheel.
- Zoom in and out with dedicated buttons.
- Track extraction progress and cancel processing.
- Return to the selection screen to load another video.
- Process video locally in the browser without uploading it to a server.

## Run locally

You need a modern browser with WebGL support and a local HTTP server. No build step or package installation is required.

```sh
git clone https://github.com/obrunorm/time-dimension.git
cd time-dimension
python -m http.server 5500 --bind 127.0.0.1
```

Open [http://127.0.0.1:5500](http://127.0.0.1:5500).

Alternatively, open the project in Visual Studio Code and launch `index.html` using Live Server. Serve the files over HTTP instead of opening the HTML directly with `file://`.

Three.js and OrbitControls are loaded from UNPKG using an import map. An internet connection is needed to load those dependencies. Video selection and frame extraction happen locally; the video is not sent to UNPKG.

## Controls

| Control | Action |
| --- | --- |
| Left mouse button + drag | Rotate around the stack |
| Right mouse button + drag | Pan the view |
| Scroll down | Increase transparency, one layer after another |
| Scroll up | Restore layer opacity in reverse order |
| `+` button | Zoom in |
| `−` button | Zoom out |
| Choose another video | Clear the current stack and return to file selection |

The camera starts to the left of the stack. The mouse wheel controls transparency rather than zoom.

## Configuration

Edit `config.js` to change the visualization:

| Setting | Default | Purpose |
| --- | --- | --- |
| `maxDurationSeconds` | `60` | Maximum accepted video duration in seconds |
| `imageWidth` | `4` | Width of each plane in scene units |
| `imageSpacing` | `0.08` | Distance between neighboring planes |
| `frameLimit` | `60` | Number of samples extracted across the video |
| `maxTransparency` | `0.93` | Maximum transparency reached by each layer, from `0` to `1` |
| `scrollPerImage` | `60` | Normalized scroll amount needed to transition one layer |
| `zoomStep` | `1.2` | Zoom multiplier for each button click |
| `minZoom` | `0.25` | Minimum camera zoom |
| `maxZoom` | `8` | Maximum camera zoom |
| `maxFrameSize` | `640` | Maximum frame width or height in pixels; aspect ratio is preserved |

For example, `maxTransparency: 0.5` allows layers to become up to 50% transparent. A value of `1` allows them to disappear completely. Increasing `frameLimit` or `maxFrameSize` increases processing and memory requirements.

The visible duration notice and duration error currently say 60 seconds. Keep those messages aligned if you change `maxDurationSeconds`.

## How it works

1. A selected local file is opened through a temporary object URL in an HTML video element.
2. The browser checks the video's duration and dimensions.
3. The extractor seeks to evenly spaced timestamps and draws each image onto a separate canvas.
4. Each canvas becomes a Three.js texture on a plane in the stack.
5. The render loop updates the camera controls and smoothly applies scroll-driven opacity changes.
6. Switching videos releases the previous textures, materials, geometry, and canvas contents. The temporary video URL is revoked after extraction or cancellation.

## Project structure

```text
time-dimension/
├── index.html
├── styles.css
├── main.js
├── config.js
├── frames.js
├── video-frame-viewer.js
└── README.md
```

- `index.html`: file selection, extraction progress, and viewer controls.
- `styles.css`: upload and viewer layouts.
- `main.js`: application flow, file events, errors, and navigation.
- `config.js`: visualization and extraction settings.
- `frames.js`: browser-based video decoding, seeking, and frame capture.
- `video-frame-viewer.js`: Three.js scene, camera, textures, transparency, zoom, and cleanup.

## Compatibility and limitations

- Video support depends on the codecs available in your browser. H.264 MP4 and WebM are useful starting points; a file extension alone does not guarantee support.
- The application samples timestamps using the browser's media API. It is not an exhaustive, frame-accurate export of the source video.
- Opaque planes can obscure layers behind them. Rotate the stack or use the scroll transparency effect to inspect more of the sequence.
- Rendering speed depends on the device, browser, frame count, and texture resolution.
- Frames exist in memory for visualization and are not saved as image files.

## Further reading

- [Einstein Online: Spacetime](https://www.einstein-online.info/en/explandict/spacetime/)
- [MIT OpenCourseWare: Spacetime, Simultaneity, and the Consequences of Lorentz](https://ocw-preview.odl.mit.edu/courses/8-033-introduction-to-relativity-and-spacetime-physics-fall-2024/mit8_033_f24_lec04.pdf)
- [Three.js documentation](https://threejs.org/docs/)
