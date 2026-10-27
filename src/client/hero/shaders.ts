export const WAVES = 24

export const endpointVertex = `
attribute float aSeed;
attribute float aAngle;
attribute float aRadius;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uInner;
uniform vec4 uWaves[${WAVES}];
uniform vec3 uBase;
uniform vec3 uLit;
uniform vec3 uFail;
uniform float uHalo;
varying vec3 vColor;
varying float vGlow;
varying float vFog;

void main() {
  float glow = 0.0;
  float applied = 0.0;
  float fail = 0.0;
  for (int i = 0; i < ${WAVES}; i++) {
    vec4 w = uWaves[i];
    if (w.z < 0.0) continue;
    float d = abs(mod(aAngle - w.x + 3.14159265, 6.2831853) - 3.14159265);
    float inside = 1.0 - smoothstep(w.y * 0.8, w.y, d);
    float arrive = w.z + (aRadius - uInner) * 0.07 + aSeed * 0.3;
    float dt = uTime - arrive;
    if (dt > 0.0 && inside > 0.0) {
      float k = exp(-dt * 1.6) * inside;
      if (w.w > 0.5) {
        fail = max(fail, k);
      } else {
        glow = max(glow, k);
        applied = max(applied, inside * exp(-dt * 0.05));
      }
    }
  }
  vec3 base = mix(uBase, uLit, applied * 0.5);
  vColor = mix(mix(base, uLit, glow), uFail, fail);
  vGlow = max(glow, fail);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.9 + 0.1 * sin(uTime * 1.1 + aSeed * 37.0);
  float size = uSize * (1.0 + vGlow * 0.7) * twinkle;
  if (uHalo > 0.5) size = vGlow < 0.03 ? 0.0 : uSize * 5.0 * vGlow;
  gl_PointSize = size * uPixelRatio / -mv.z;
  vFog = smoothstep(20.0, 46.0, -mv.z);
}
`

export const endpointFragment = `
uniform vec3 uFog;
uniform vec3 uLight;
uniform float uHalo;
uniform float uAmbient;
varying vec3 vColor;
varying float vGlow;
varying float vFog;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  if (uHalo > 0.5) {
    float a = pow(1.0 - r2, 2.2) * vGlow * 0.42;
    gl_FragColor = vec4(vColor, a * (1.0 - vFog));
    return;
  }
  vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
  vec3 l = normalize(uLight);
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);
  vec3 col = vColor * (uAmbient + (1.12 - uAmbient) * diff) + spec * (0.22 + 0.5 * vGlow);
  col += vColor * vGlow * 0.55;
  col = mix(col, uFog, vFog * 0.8);
  gl_FragColor = vec4(col, smoothstep(1.0, 0.72, r2));
}
`

export const sparkVertex = `
attribute vec3 color;
attribute float aSize;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vFog;

void main() {
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * 3.2 * uPixelRatio / -mv.z;
  vFog = smoothstep(20.0, 46.0, -mv.z);
}
`

export const sparkFragment = `
uniform vec3 uFog;
varying vec3 vColor;
varying float vFog;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  float core = smoothstep(0.32, 0.12, r2);
  float halo = pow(1.0 - r2, 3.0) * 0.5;
  vec3 col = mix(vColor, vec3(1.0), core * 0.55);
  gl_FragColor = vec4(mix(col, uFog, vFog * 0.7), max(core, halo));
}
`

export const lineVertex = `
attribute vec4 aColor;
varying vec4 vColor;
varying float vFog;

void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vFog = smoothstep(20.0, 46.0, -mv.z);
}
`

export const lineFragment = `
uniform vec3 uFog;
uniform float uOpacity;
varying vec4 vColor;
varying float vFog;

void main() {
  gl_FragColor = vec4(mix(vColor.rgb, uFog, vFog * 0.75), vColor.a * uOpacity);
}
`

export const backdropVertex = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`

export const backdropFragment = `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uGlow;
uniform vec2 uCenter;
uniform float uAspect;
uniform float uTime;
uniform float uCurtain;
uniform vec3 uCurtainColor;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
  vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
  col = mix(col, uGlow, exp(-dot(d, d) * 2.4) * 0.55);
  col += (hash(vUv * 900.0 + fract(uTime)) - 0.5) * 0.018;
  gl_FragColor = vec4(mix(col, uCurtainColor, uCurtain), 1.0);
}
`

export const plateVertex = `
varying vec2 vPos;

void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const plateFragment = `
uniform vec3 uColor;
uniform vec3 uRim;
uniform float uRadius;
varying vec2 vPos;

void main() {
  float r = length(vPos);
  float body = smoothstep(uRadius, uRadius * 0.55, r) * 0.55;
  float rim = exp(-pow((r - uRadius * 0.93) * 3.0, 2.0)) * 0.22;
  float inner = exp(-pow((r - uRadius * 0.24) * 4.0, 2.0)) * 0.18;
  gl_FragColor = vec4(mix(uColor, uRim, clamp(rim + inner, 0.0, 1.0) * 2.0), body + rim + inner);
}
`
