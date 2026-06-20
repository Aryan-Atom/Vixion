// ---------------------------- Imports ----------------------------
import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupTheatreScene, bindTheatreModel } from './theatre/setup.js';
import vertexShader from "./shaders/vertexShader.glsl"
import fragmentShader from "./shaders/vertexShader.glsl"

// ---------------------------- Canvas ----------------------------
const canvas = document.querySelector('#experience-canvas');

// ---------------------------- Scene ----------------------------
const scene = new THREE.Scene();

// ---------------------------- Renderer ----------------------------
const renderer = new THREE.WebGLRenderer({ canvas :canvas, antialias: true });
renderer.setPixelRatio(Math.max(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------------------------- Camera ----------------------------
const camera = new THREE.PerspectiveCamera(
  25,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(1.982033480498498, 0.3106277298483349, 0.011904999253422175);

// ---------------------------- Resize ----------------------------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (camera.isPerspectiveCamera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
});

// ---------------------------- Controls ----------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-0.0034683560499379137, 0.2695367349235052, -0.012060745148912748);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();

// ---------------------------- Theatre.js ----------------------------
setupTheatreScene({ camera });

// ---------------------------- Lighting ----------------------------
scene.add(new THREE.AmbientLight(0xffffff, 1));

// ---------------------------- Textures ----------------------------
const textureLoader = new THREE.TextureLoader();
const textureMap = {
  Background: '/Textures/Background.png',
  Thunder: '/Textures/Lightning.png',
  Vixion: '/Textures/Vision_UV.png',
};

const textures = Object.fromEntries(
  Object.entries(textureMap).map(([name, path]) => {
    const texture = textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    return [name, texture];
  })
);

function applyTexture(mesh, texture) {
  mesh.material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
}

// ---------------------------- Model Loading ----------------------------
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load(
  '/Models/Thunder2-v1.glb',
  (gltf) => {
    scene.add(gltf.scene);

    gltf.scene.traverse((child) => {
      if (child.isMesh && textures[child.name]) {
        applyTexture(child, textures[child.name]);
      }
    });

    bindTheatreModel(gltf.scene);
  },
  undefined,
  (error) => {
    console.error('Failed to load model:', error);
  }
);

// ---------------------------- Animation Loop ----------------------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
