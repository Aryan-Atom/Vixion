attribute vec3 barycentric;

varying vec3 vBarycentric;
varying float vWireMix;

uniform float uWireProgress;
uniform float uWireMinY;
uniform float uWireMaxY;
uniform float uWireFromTop;
uniform float uWireBand;
uniform mat4 uModelRootMatrixInverse;

void applyWireframeTransition(in vec3 rootLocalPosition) {
  float normalizedY =
    (rootLocalPosition.y - uWireMinY) / max(uWireMaxY - uWireMinY, 1e-5);
  float threshold =
    uWireFromTop > 0.5 ? (1.0 - uWireProgress) : uWireProgress;

  vWireMix = smoothstep(threshold - uWireBand, threshold + uWireBand, normalizedY);
}
