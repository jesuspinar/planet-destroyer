/**
 * GLSL for the procedural planet surfaces.
 *
 * The `kind` uniform selects a surface style; see `SURFACE` in `../config.js`.
 */

export const planetVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const planetFragmentShader = /* glsl */ `
uniform vec3 colorA;
uniform vec3 colorB;
uniform float kind;

varying vec3 vNormal;
varying vec2 vUv;

const vec3 LIGHT_DIRECTION = vec3(-0.65, 0.75, 1.0);
const vec3 CLOUD_COLOR = vec3(0.87, 0.93, 0.95);
const vec3 POLE_COLOR = vec3(0.83, 0.93, 0.96);
const float AMBIENT = 0.18;
const float DIFFUSE = 0.95;
const float RIM_STRENGTH = 0.16;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
    f.y
  );
}

/** Fractal brownian motion: four octaves of value noise. */
float fbm(vec2 p) {
  return noise(p) * 0.5
    + noise(p * 2.1) * 0.25
    + noise(p * 4.3) * 0.125
    + noise(p * 8.2) * 0.0625;
}

/** Gas giants: horizontal cloud bands warped by noise. */
vec3 bandedSurface(vec2 uv, float n) {
  float bands = sin(uv.y * 90.0 + fbm(uv * 10.0) * 6.0);
  vec3 color = mix(colorA, colorB, smoothstep(-0.8, 0.6, bands) * 0.8 + 0.1);

  return color * (0.83 + n * 0.45);
}

/** Earth: continents, then clouds, then icy poles. */
vec3 terrestrialSurface(vec2 uv) {
  float land = fbm(uv * vec2(9.0, 6.0));
  vec3 color = mix(colorA, colorB, smoothstep(0.47, 0.51, land));

  float clouds = fbm(uv * vec2(14.0, 12.0) + vec2(23.0, 7.0));
  color = mix(color, CLOUD_COLOR, smoothstep(0.6, 0.73, clouds) * 0.87);

  float poles = smoothstep(0.43, 0.5, abs(uv.y - 0.5));

  return mix(color, POLE_COLOR, poles * 0.8);
}

/** Ice and cloud worlds: tight, even stripes. */
vec3 stripedSurface(vec2 uv, float n) {
  return mix(colorA, colorB, 0.35 + 0.4 * sin(uv.y * 55.0 + n * 5.0));
}

void main() {
  vec2 uv = vUv;
  float n = fbm(uv * vec2(15.0, 9.0));
  vec3 color = mix(colorA, colorB, n);

  if (kind == 1.0) {
    color = bandedSurface(uv, n);
  }

  if (kind == 2.0) {
    color = terrestrialSurface(uv);
  }

  if (kind == 3.0) {
    color = stripedSurface(uv, n);
  }

  float light = max(dot(normalize(vNormal), normalize(LIGHT_DIRECTION)), 0.0);
  float rim = pow(1.0 - max(vNormal.z, 0.0), 3.0);

  color *= AMBIENT + light * DIFFUSE;
  color += colorB * rim * RIM_STRENGTH;

  gl_FragColor = vec4(color, 1.0);
}
`;
