import * as THREE from 'three';

const lightningUniforms = {
  uTime: { value: 0 },
};

const lightningVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lightningFragmentShader = /* glsl */ `
  uniform float uTime;

  varying vec2 vUv;

  #define PARTS 14
  #define BRANCHES 3

  float hash11(float p) {
    return fract(sin(p * 127.1) * 43758.5453);
  }

  float lhash(float x, float t) {
    float h = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      h += (fract(sin(fi * 35.51 * x + 45.51 * t * (fi + 1.0))) * 2.0 - 1.0) * 0.2;
    }
    return h;
  }

  float distSegment(vec2 a, vec2 b, vec2 p) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return length(pa - ba * h);
  }

  float bolt(vec2 uv, float time, float seed, float spread, float xScale) {
    vec2 ls = vec2(0.0, 0.0);
    vec2 le = vec2(0.0, 1.0);
    float d = 1.0;

    for (int i = 0; i < PARTS; i++) {
      float fi = float(i);
      float fn = float(PARTS);
      vec2 p1 = mix(ls, le, fi / fn);
      vec2 p2 = mix(ls, le, (fi + 1.0) / fn);

      float n1 = lhash(p1.y + seed, time * 1.7 + fi * 0.17);
      float n2 = lhash(p2.y + seed * 1.3, time * 1.7 + fi * 0.17 + 0.11);
      p1.x += n1 * spread * xScale;
      p2.x += n2 * spread * xScale;

      if (i == 0) {
        d = min(d, distSegment(ls, p2, uv));
      } else {
        d = min(d, distSegment(p1, p2, uv));
      }
    }

    return d;
  }

  float branchBolt(vec2 uv, float time, float seed) {
    float forkY = 0.35 + hash11(seed) * 0.35;
    vec2 fork = vec2(lhash(forkY, time + seed) * 0.12, forkY);
    vec2 end = fork + vec2(lhash(forkY + 2.0, time * 2.0 + seed) * 0.22, 0.18 + hash11(seed + 4.0) * 0.12);

    float d = 1.0;
    const int branchParts = 6;

    for (int i = 0; i < branchParts; i++) {
      float fi = float(i);
      float fn = float(branchParts);
      vec2 p1 = mix(fork, end, fi / fn);
      vec2 p2 = mix(fork, end, (fi + 1.0) / fn);
      p1.x += lhash(p1.y + seed, time * 2.4 + fi) * 0.05;
      p2.x += lhash(p2.y + seed, time * 2.4 + fi + 0.3) * 0.05;

      if (i == 0) {
        d = min(d, distSegment(fork, p2, uv));
      } else {
        d = min(d, distSegment(p1, p2, uv));
      }
    }

    return d;
  }

  vec3 boltColor(float d, float intensity) {
    float core = 1.0 - smoothstep(0.0, 0.006, d);
    float hot = exp(-d * 180.0);
    float glow = exp(-d * 28.0);
    float halo = exp(-d * 10.0);

    vec3 col = vec3(0.35, 0.72, 1.0) * glow * 1.4;
    col += vec3(0.75, 0.9, 1.0) * hot * 0.9;
    col += vec3(1.0) * core * 1.2;
    col += vec3(0.2, 0.45, 0.95) * halo * 0.35;

    return col * intensity;
  }

  void main() {
    vec2 uv = vec2((vUv.x - 0.5) * 2.0, vUv.y);
    float time = uTime * 3.0 + floor(uTime * 12.0) * 0.01;
    float flicker = 0.75 + 0.25 * sin(uTime * 40.0 + hash11(floor(uTime * 8.0)) * 6.28);

    float dMain = bolt(uv, time, 1.7, 0.16, 1.0);
    vec3 col = boltColor(dMain, flicker);

    for (int i = 0; i < BRANCHES; i++) {
      float fi = float(i);
      float seed = 2.0 + fi * 3.1;
      float spread = 0.08 + hash11(seed) * 0.06;
      float dBranch = bolt(uv, time + seed, seed, spread, 0.65 + hash11(seed + 1.0) * 0.5);
      col += boltColor(dBranch, flicker * (0.35 + hash11(seed + 2.0) * 0.25));

      float dSpark = branchBolt(uv, time + seed * 0.7, seed + 5.0);
      col += boltColor(dSpark, flicker * 0.45);
    }

    float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;

function createLightningMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: lightningUniforms,
    vertexShader: lightningVertexShader,
    fragmentShader: lightningFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

const _vertex = new THREE.Vector3();

function getHandSurfacePoint(handMesh, targetWorld) {
  const geometry = handMesh.geometry;
  const positions = geometry.attributes.position;
  const handBox = new THREE.Box3().setFromObject(handMesh);
  const handCenter = handBox.getCenter(new THREE.Vector3());
  const toTarget = targetWorld.clone().sub(handCenter).normalize();

  let bestPoint = handCenter.clone();
  let bestScore = -Infinity;

  for (let i = 0; i < positions.count; i++) {
    _vertex.fromBufferAttribute(positions, i);
    _vertex.applyMatrix4(handMesh.matrixWorld);

    const score = _vertex.clone().sub(handCenter).dot(toTarget);
    if (score > bestScore) {
      bestScore = score;
      bestPoint.copy(_vertex);
    }
  }

  return bestPoint;
}

function getHandSparkPoints(handMesh, targetMesh) {
  handMesh.updateWorldMatrix(true, false);
  targetMesh.updateWorldMatrix(true, false);

  const targetCenter = new THREE.Box3().setFromObject(targetMesh).getCenter(new THREE.Vector3());
  const handPointWorld = getHandSurfacePoint(handMesh, targetCenter);

  const handBox = new THREE.Box3().setFromObject(handMesh);
  const handSize = handBox.getSize(new THREE.Vector3());
  const sparkLength = Math.max(handSize.x, handSize.y, handSize.z) * 0.4;

  const toTarget = targetCenter.clone().sub(handPointWorld);
  if (toTarget.lengthSq() < 1e-6) {
    toTarget.set(0, 1, 0);
  } else {
    toTarget.normalize();
  }

  const endWorld = handPointWorld.clone().add(toTarget.multiplyScalar(sparkLength));

  return {
    start: handMesh.worldToLocal(handPointWorld.clone()),
    end: handMesh.worldToLocal(endWorld),
  };
}

function orientBolt(group, start, end) {
  const direction = end.clone().sub(start);
  const length = direction.length();

  if (length < 1e-4) return;

  group.position.copy(start);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.rotateZ(Math.PI / 2);

  group.children.forEach((child) => {
    child.scale.set(length * 0.55, length, 1);
    child.position.y = length * 0.5;
  });
}

export function createLightningEffect(handMesh, targetMesh) {
  const group = new THREE.Group();
  group.name = 'LightningEffect';
  handMesh.add(group);

  const material = createLightningMaterial();
  const bolt = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), material);
  group.add(bolt);

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), material);
  glow.scale.set(1.35, 1.0, 1);
  group.add(glow);

  const { start, end } = getHandSparkPoints(handMesh, targetMesh);
  orientBolt(group, start, end);

  return {
    group,
    update(hand, target) {
      const points = getHandSparkPoints(hand, target);
      orientBolt(group, points.start, points.end);
    },
  };
}

export function updateLightningTime(time) {
  lightningUniforms.uTime.value = time;
}
