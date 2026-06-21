// ---------------------------- Imports ----------------------------
import './style.css';
import { getViewportHeight, getViewportWidth, setupViewportSync } from './viewport.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupTheatreScene, bindTheatreModel } from './theatre/setup.js';
import { getTheatreSheet, getTheatreProject } from './theatre.js';
import { setupScrollTrigger } from './theatre/scrollTrigger.js';
import { setupContentAnimations } from './content/animations.js';
import { preloadAssets, dismissLoader } from './preload.js';

setupViewportSync();

// ---------------------------- Canvas ----------------------------
const canvas = document.querySelector('#experience-canvas');

// ---------------------------- Scene ----------------------------
const scene = new THREE.Scene();

// ---------------------------- Renderer ----------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.max(window.devicePixelRatio, 2));
renderer.setSize(getViewportWidth(), getViewportHeight());
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------------------------- Camera ----------------------------
const camera = new THREE.PerspectiveCamera(
  25,
  getViewportWidth() / getViewportHeight(),
  0.1,
  1000
);
camera.position.set(1.982033480498498, 0.3106277298483349, 0.011904999253422175);

// ---------------------------- Resize ----------------------------
function handleViewportChange() {
  renderer.setSize(getViewportWidth(), getViewportHeight());

  if (camera.isPerspectiveCamera) {
    camera.aspect = getViewportWidth() / getViewportHeight();
    camera.updateProjectionMatrix();
  }
}

window.addEventListener('resize', handleViewportChange);
window.visualViewport?.addEventListener('resize', handleViewportChange);

// ---------------------------- Controls ----------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-0.0034683560499379137, 0.2695367349235052, -0.012060745148912748);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enabled = false;
controls.update();

// ---------------------------- Theatre.js ----------------------------
setupTheatreScene({ camera });

let lenis;
let scrollController;

const content = setupContentAnimations({ deferInitial: true });

setupScrollTrigger(getTheatreSheet(), getTheatreProject(), {
  onSectionChange: (index) => content.goToSection(index),
}).then((controller) => {
  scrollController = controller;
  lenis = controller.lenis;
});

document.querySelector('.contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
});

// ---------------------------- Lighting ----------------------------
scene.add(new THREE.AmbientLight(0xffffff, 1));

function applyTexture(mesh, texture) {
  mesh.material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
}

function updateLoaderProgress(progress) {
  const percent = Math.round(progress * 100);
  const fill = document.querySelector('.loader__fill');
  const label = document.querySelector('.loader__percent');
  const track = document.querySelector('.loader__track');

  if (fill) fill.style.width = `${percent}%`;
  if (label) label.textContent = `${percent}%`;
  if (track) track.setAttribute('aria-valuenow', String(percent));
}

async function initExperience() {
  try {
    const { gltf, textures } = await preloadAssets(updateLoaderProgress);

    scene.add(gltf.scene);

    gltf.scene.traverse((child) => {
      if (child.isMesh && textures[child.name]) {
        applyTexture(child, textures[child.name]);
      }
    });

    bindTheatreModel(gltf.scene);

    await new Promise((resolve) => setTimeout(resolve, 250));
    await dismissLoader();
    content.playInitial();
  } catch (error) {
    console.error('Failed to preload experience:', error);
    await dismissLoader();
    content.playInitial();
  }
}

initExperience();

// ---------------------------- Animation Loop ----------------------------
function animate(time) {
  requestAnimationFrame(animate);
  lenis?.raf(time);
  controls.update();
  renderer.render(scene, camera);
}

animate();
