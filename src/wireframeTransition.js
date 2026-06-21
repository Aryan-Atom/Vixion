import * as THREE from 'three';
import gsap from 'gsap';
import wireframeVertex from './shaders/wireframeTransition.vert.glsl';
import wireframeFragment from './shaders/wireframeTransition.frag.glsl';

const TRANSITION_DURATION = 1.15;
const WIREFRAME_BAND = 0.045;

const wireframeUniforms = {
  uWireProgress: { value: 0 },
  uWireMinY: { value: 0 },
  uWireMaxY: { value: 1 },
  uWireFromTop: { value: 1 },
  uWireBand: { value: WIREFRAME_BAND },
  uModelRootMatrixInverse: { value: new THREE.Matrix4() },
};

const wireframeMaterials = new Set();

let transitionTween = null;
let wireframeEnabled = false;
let isTransitioning = false;

function addBarycentric(geometry) {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const count = nonIndexed.attributes.position.count;
  const barycentric = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 3) {
    barycentric.set([1, 0, 0, 0, 1, 0, 0, 0, 1], i * 3);
  }

  nonIndexed.setAttribute(
    'barycentric',
    new THREE.BufferAttribute(barycentric, 3)
  );

  return nonIndexed;
}

function injectWireframeShader(shader) {
  Object.assign(shader.uniforms, wireframeUniforms);

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
${wireframeVertex}`
  );

  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
vBarycentric = barycentric;`
  );

  shader.vertexShader = shader.vertexShader.replace(
    '#include <project_vertex>',
    `#include <project_vertex>
{
  vec3 rootLocalPosition =
    (uModelRootMatrixInverse * modelMatrix * vec4(transformed, 1.0)).xyz;
  applyWireframeTransition(rootLocalPosition);
}`
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
${wireframeFragment}`
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `outgoingLight = applyWireframeTransition(outgoingLight);
#include <opaque_fragment>`
  );
}

function patchWireframeMaterial(material) {
  material.customProgramCacheKey = () => 'vixion-wireframe-transition-v2';
  material.extensions = { derivatives: true };

  material.onBeforeCompile = (shader) => {
    injectWireframeShader(shader);
    material.userData.wireframeShader = shader;
  };

  wireframeMaterials.add(material);
  material.needsUpdate = true;
}

export function createWireframeMaterial(texture) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });

  patchWireframeMaterial(material);
  return material;
}

export function prepareWireframeGeometry(geometry) {
  return addBarycentric(geometry);
}

export function bindWireframeModel(root) {
  root.updateWorldMatrix(true, true);
  wireframeUniforms.uModelRootMatrixInverse.value
    .copy(root.matrixWorld)
    .invert();

  const bounds = new THREE.Box3();
  root.traverse((child) => {
    if (!child.isMesh) return;

    child.geometry.computeBoundingBox();
    const meshBounds = child.geometry.boundingBox.clone();
    meshBounds.applyMatrix4(child.matrixWorld);
    meshBounds.applyMatrix4(wireframeUniforms.uModelRootMatrixInverse.value);
    bounds.union(meshBounds);
  });

  wireframeUniforms.uWireMinY.value = bounds.min.y;
  wireframeUniforms.uWireMaxY.value = bounds.max.y;

  wireframeMaterials.forEach((material) => {
    material.needsUpdate = true;
  });
}

function setRestState(enabled) {
  wireframeEnabled = enabled;
  wireframeUniforms.uWireFromTop.value = 1;
  wireframeUniforms.uWireProgress.value = enabled ? 1 : 0;
}

function updateToggleUi(enabled) {
  const toggle = document.getElementById('wireframe-toggle');
  toggle?.setAttribute('aria-pressed', String(enabled));
  toggle?.classList.toggle('is-active', enabled);
  toggle?.toggleAttribute('disabled', isTransitioning);
}

export function isWireframeEnabled() {
  return wireframeEnabled;
}

export function isWireframeTransitioning() {
  return isTransitioning;
}

export function setWireframeImmediate(enabled) {
  transitionTween?.kill();
  transitionTween = null;
  isTransitioning = false;
  setRestState(enabled);
  updateToggleUi(enabled);
}

export function animateWireframeTransition(enabled, { onComplete } = {}) {
  if (enabled === wireframeEnabled && !isTransitioning) {
    onComplete?.();
    return;
  }

  transitionTween?.kill();

  const state = { progress: 0 };
  isTransitioning = true;
  updateToggleUi(wireframeEnabled);

  wireframeUniforms.uWireFromTop.value = enabled ? 1 : 0;
  wireframeUniforms.uWireProgress.value = 0;

  transitionTween = gsap.to(state, {
    progress: 1,
    duration: TRANSITION_DURATION,
    ease: 'power2.inOut',
    onUpdate: () => {
      wireframeUniforms.uWireProgress.value = state.progress;
    },
    onComplete: () => {
      isTransitioning = false;
      setRestState(enabled);
      updateToggleUi(enabled);
      transitionTween = null;
      onComplete?.();
    },
  });
}

export function setupWireframeToggle({ storageKey, initialEnabled = false }) {
  const toggle = document.getElementById('wireframe-toggle');
  if (!toggle || toggle.dataset.wireframeBound === 'true') return;

  toggle.dataset.wireframeBound = 'true';
  setWireframeImmediate(initialEnabled);

  toggle.addEventListener('click', () => {
    if (isTransitioning) return;

    const next = !wireframeEnabled;
    animateWireframeTransition(next);

    try {
      localStorage.setItem(storageKey, next ? '1' : '0');
    } catch {
      // Ignore storage failures in restricted contexts.
    }
  });
}
