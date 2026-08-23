// Vendored from MengTo/threeui (src/shaders/stream-convergence/streamConvergenceShaders.ts).
// MIT License, Copyright (c) 2026 Meng To. See THIRD_PARTY_NOTICES.md.

export const STREAM_CONVERGENCE_VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

export const STREAM_CONVERGENCE_FRAGMENT_SHADER = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_interactive_fidelity;
  varying vec2 vUv;

  mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;
    p = rotate2d(0.55) * p;

    vec3 color = vec3(0.0);
    float spread = 0.06 * (0.3 + u_interactive_fidelity * 0.7);

    for (int i = 0; i < 3; i++) {
      float offset = float(1 - i) * spread;
      float y = p.y + offset + (sin(p.x * 2.5 - u_time * 1.5) * 0.12);
      float wave = smoothstep(0.85, 0.99, sin(y * 6.0 + u_time * 2.0) * 0.5 + 0.5);
      if (i == 0) color.r += wave * 1.2;
      if (i == 1) color.g += wave * 0.5;
      if (i == 2) color.b += wave * 1.8;
    }

    float vignette = exp(-length(vUv * 2.0 - 1.0) * 0.8);
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`
