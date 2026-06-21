import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const MODEL_PATH = '/Models/Thunder2-v1.glb';

const TEXTURE_MAP = {
  Background: '/Textures/Background.webp',
  Thunder: '/Textures/Lightning.png',
  Vixion: '/Textures/Vision_UV.webp',
};

const IMAGE_PATHS = [
  '/assets/logo.svg',
  '/assets/projects/ideal-foundation.png',
  '/assets/projects/2cal.png',
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadTexture(loader, path) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}

function loadModel(gltfLoader, path, onProgress) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      resolve,
      (event) => {
        if (event.total > 0) {
          onProgress(event.loaded / event.total);
        }
      },
      reject
    );
  });
}

export async function preloadAssets(onProgress) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  const textureLoader = new THREE.TextureLoader();
  const textureCount = Object.keys(TEXTURE_MAP).length;

  const progress = {
    model: 0,
    textures: 0,
    images: 0,
    fonts: 0,
  };

  const weights = {
    model: 0.6,
    textures: 0.25,
    images: 0.1,
    fonts: 0.05,
  };

  const report = () => {
    const total =
      progress.model * weights.model +
      progress.textures * weights.textures +
      progress.images * weights.images +
      progress.fonts * weights.fonts;

    onProgress?.(Math.min(1, total));
  };

  const gltfPromise = loadModel(gltfLoader, MODEL_PATH, (value) => {
    progress.model = value;
    report();
  }).then((gltf) => {
    progress.model = 1;
    report();
    return gltf;
  });

  const texturesPromise = Promise.all(
    Object.entries(TEXTURE_MAP).map(async ([name, path]) => {
      const texture = await loadTexture(textureLoader, path);
      progress.textures += 1 / textureCount;
      report();
      return [name, texture];
    })
  ).then((entries) => {
    progress.textures = 1;
    report();
    return Object.fromEntries(entries);
  });

  const imagesPromise = Promise.allSettled(
    IMAGE_PATHS.map(async (path, index) => {
      await loadImage(path);
      progress.images = (index + 1) / IMAGE_PATHS.length;
      report();
    })
  ).then(() => {
    progress.images = 1;
    report();
  });

  const fontsPromise = (document.fonts?.ready ?? Promise.resolve()).then(() => {
    progress.fonts = 1;
    report();
  });

  const [gltf, textures] = await Promise.all([
    gltfPromise,
    texturesPromise,
    imagesPromise,
    fontsPromise,
  ]);

  onProgress?.(1);

  return { gltf, textures };
}

export function dismissLoader() {
  const loader = document.getElementById('loader');
  if (!loader) {
    document.body.classList.add('is-ready');
    return;
  }

  loader.classList.add('is-hidden');
  loader.setAttribute('aria-busy', 'false');
  document.body.classList.add('is-ready');

  loader.addEventListener(
    'transitionend',
    () => {
      loader.remove();
    },
    { once: true }
  );
}
