varying vec3 vBarycentric;
varying float vWireMix;

vec3 applyWireframeTransition(vec3 shadedColor) {
  vec3 baryWidth = fwidth(vBarycentric);
  float edgeFactor = min(
    min(
      smoothstep(0.0, baryWidth.x * 1.35, vBarycentric.x),
      smoothstep(0.0, baryWidth.y * 1.35, vBarycentric.y)
    ),
    smoothstep(0.0, baryWidth.z * 1.35, vBarycentric.z)
  );
  float edge = 1.0 - edgeFactor;

  vec3 wireBase = vec3(0.015, 0.018, 0.035);
  vec3 wireLine = vec3(0.82, 0.86, 1.0);
  vec3 wireLook = mix(wireBase, wireLine, edge);

  return mix(shadedColor, wireLook, clamp(vWireMix, 0.0, 1.0));
}
