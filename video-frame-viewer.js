import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class VideoFrameViewer {
  constructor(container, config, onZoomChange) {
    this.config = config;
    this.onZoomChange = onZoomChange;
    this.active = false;
    this.targetProgress = 0;
    this.currentProgress = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202025);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(-6, 4, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = false;
    this.controls.enabled = false;

    this.stack = new THREE.Group();
    this.scene.add(this.stack);
    this.clock = new THREE.Clock();
    this.renderer.domElement.addEventListener('wheel', (event) => this.handleScroll(event), { passive: false });
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.animate());
  }

  addFrame({ canvas, index, count }) {
    if (!this.geometry) {
      const height = this.config.imageWidth * canvas.height / canvas.width;
      this.geometry = new THREE.PlaneGeometry(this.config.imageWidth, height);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      forceSinglePass: true,
    });
    const image = new THREE.Mesh(this.geometry, material);
    image.position.z = ((count - 1) / 2 - index) * this.config.imageSpacing;
    this.stack.add(image);
  }

  show() {
    const sphere = new THREE.Box3().setFromObject(this.stack).getBoundingSphere(new THREE.Sphere());
    const verticalAngle = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const horizontalAngle = Math.atan(Math.tan(verticalAngle) * this.camera.aspect);
    const distance = sphere.radius / Math.sin(Math.min(verticalAngle, horizontalAngle)) * 1.2;

    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.target.copy(sphere.center);
    this.camera.position.set(-1, 0.6, 1.2).normalize().multiplyScalar(distance).add(sphere.center);
    this.camera.zoom = 1;
    this.camera.far = distance + sphere.radius * 10;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.controls.enableDamping = true;
    this.controls.enabled = true;
    this.active = true;
    this.notifyZoom();
  }

  clear() {
    this.active = false;
    this.controls.enabled = false;
    this.targetProgress = 0;
    this.currentProgress = 0;
    for (const image of this.stack.children) {
      const texture = image.material.map;
      const canvas = texture.image;
      texture.dispose();
      image.material.dispose();
      canvas.width = 0;
      canvas.height = 0;
    }
    this.stack.clear();
    this.geometry?.dispose();
    this.geometry = null;
    this.renderer.renderLists.dispose();
    this.notifyZoom();
  }

  changeZoom(zoomIn) {
    if (!this.active) return;
    const factor = zoomIn ? this.config.zoomStep : 1 / this.config.zoomStep;
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, this.config.minZoom, this.config.maxZoom);
    this.camera.updateProjectionMatrix();
    this.notifyZoom();
  }

  notifyZoom() {
    this.onZoomChange({
      canZoomIn: this.active && this.camera.zoom < this.config.maxZoom,
      canZoomOut: this.active && this.camera.zoom > this.config.minZoom,
    });
  }

  handleScroll(event) {
    event.preventDefault();
    if (!this.active) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    this.targetProgress = THREE.MathUtils.clamp(
      this.targetProgress + event.deltaY * unit / this.config.scrollPerImage,
      0,
      this.stack.children.length
    );
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    if (!this.active) return;
    this.currentProgress = THREE.MathUtils.damp(this.currentProgress, this.targetProgress, 12, delta);
    if (Math.abs(this.currentProgress - this.targetProgress) < 0.001) this.currentProgress = this.targetProgress;

    const transparency = THREE.MathUtils.clamp(this.config.maxTransparency, 0, 1);
    this.stack.children.forEach((image, index) => {
      const fraction = THREE.MathUtils.clamp(this.currentProgress - index, 0, 1);
      image.material.opacity = 1 - fraction * transparency;
      image.visible = image.material.opacity > 0;
    });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
