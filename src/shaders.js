import * as THREE from "three";

export const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;
export const earthFragmentShader = /* glsl */ `
  uniform sampler2D uSurface;
  uniform vec3 uSunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 l = normalize(uSunDirection);
    vec3 v = normalize(-vViewPosition);
    vec3 surface = texture2D(uSurface, vUv).rgb;
    float diffuse = max(dot(n, l), 0.0);
    float water = smoothstep(0.015, 0.09, surface.b - surface.g);
    float highlight = pow(max(dot(n, normalize(l + v)), 0.0), 48.0) * diffuse * water;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 color = surface * (0.08 + 1.5 * diffuse);
    color += vec3(0.3, 0.48, 0.7) * highlight * 0.25;
    color += vec3(0.015, 0.15, 0.36) * rim * (0.2 + diffuse);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
export function makeEarthMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSurface: { value: map },
      uSunDirection: { value: new THREE.Vector3() },
    },
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    fog: false,
  });
}
