/* ================================================================
   HERO — heart breathes -> bursts -> particles form the visual
   文字なし。ハートの呼吸 → 破裂 → 粒子のままビジュアルが生成される
================================================================ */
(function () {
  const hero = document.getElementById('hero');
  const canvas = document.getElementById('hero-canvas');
  const heartEl = document.getElementById('hero-heart');
  const scrollHint = document.getElementById('hero-scroll');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { scrollHint.classList.add('show'); return; }

  const GRID = window.innerWidth < 700 ? 420 : 640;      // particles = GRID^2
  const BEAT_END = 5.4;   // seconds of breathing before the burst
  const DUR = 4.6;        // seconds for a particle to settle into the visual

  const VS = `
    attribute vec2 a_uv; attribute vec4 a_col; attribute vec2 a_start; attribute vec3 a_r;
    uniform vec2 u_res; uniform float u_t; uniform float u_dpr; uniform float u_img; uniform float u_cell;
    varying vec4 v_col;
    void main(){
      vec2 home = (a_uv - 0.5) * u_img * vec2(1.0, -1.0);
      float dist = length(home) / (u_img * 0.7);
      float delay = a_r.x * 0.9 + dist * 0.5;
      float l = clamp((u_t - delay) / ${DUR.toFixed(1)}, 0.0, 1.0);
      float e = 1.0 - pow(1.0 - l, 3.2);
      float bump = sin(3.14159 * e);
      float ph = a_r.y * 6.2831;
      vec2 swirl = vec2(sin(home.y * 0.006 + u_t * 0.7 + ph), cos(home.x * 0.006 + u_t * 0.6 + ph));
      vec2 dir = normalize(home + (a_r.xy - 0.5) * 80.0 + 0.001);
      vec2 p = mix(a_start, home, e)
             + (swirl * 0.22 + dir * (a_r.z - 0.3) * 0.5) * bump * u_img * 0.55;
      float settled = smoothstep(0.85, 1.0, l);
      p += vec2(sin(u_t * 0.35 + ph), cos(u_t * 0.3 + ph * 1.3)) * (3.0 + a_r.z * 5.0) * settled;
      gl_Position = vec4(p / (u_res * 0.5) * vec2(1.0, 1.0), 0.0, 1.0);
      gl_PointSize = max(1.6, mix(2.4, u_cell * 1.7, e)) * u_dpr;
      float a = smoothstep(0.0, 0.06, l) * (u_t > 0.0 ? 1.0 : 0.0);
      v_col = vec4(a_col.rgb, a);
    }`;
  const FS = `
    precision mediump float; varying vec4 v_col;
    void main(){
      vec2 d = gl_PointCoord - 0.5;
      if (dot(d, d) > 0.26) discard;
      gl_FragColor = vec4(min(v_col.rgb * 1.18, 1.0) * v_col.a, 1.0);
    }`;

  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U('u_res'), uT = U('u_t'), uDpr = U('u_dpr'), uImg = U('u_img'), uCell = U('u_cell');

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2), imgSize = 0;
  function resize() {
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    gl.viewport(0, 0, canvas.width, canvas.height);
    imgSize = Math.max(Math.min(W, H) * 1.0, Math.min(Math.max(W, H) * 0.62, H * 1.15));
  }
  window.addEventListener('resize', resize);
  resize();

  const motif = new Image();
  const heartImg = new Image();
  let loaded = 0;
  function onLoad() { if (++loaded === 2) init(); }
  motif.onload = onLoad; heartImg.onload = onLoad;
  motif.src = 'assets/motif_base.jpg';
  heartImg.src = 'assets/logo2-heart-white.png';

  let count = 0, heartPx = 0;
  function heartSize() { return Math.max(64, Math.min(120, Math.min(W, H) * 0.13)); }

  function init() {
    // colours: sample the visual once, each particle carries its colour
    const c = document.createElement('canvas'); c.width = c.height = GRID;
    const cx = c.getContext('2d'); cx.drawImage(motif, 0, 0, GRID, GRID);
    const img = cx.getImageData(0, 0, GRID, GRID).data;

    // start positions: random points inside the heart silhouette
    const hs = 96, hc = document.createElement('canvas'); hc.width = hs; hc.height = hs;
    const hx = hc.getContext('2d');
    const ar = heartImg.naturalHeight / heartImg.naturalWidth;
    hx.drawImage(heartImg, 0, (hs - hs * ar) / 2, hs, hs * ar);
    const hd = hx.getImageData(0, 0, hs, hs).data, pts = [];
    for (let y = 0; y < hs; y++) for (let x = 0; x < hs; x++) if (hd[(y * hs + x) * 4 + 3] > 60) pts.push([x / hs - 0.5, -(y / hs - 0.5)]);
    heartPx = heartSize();

    count = GRID * GRID;
    const uv = new Float32Array(count * 2), col = new Uint8Array(count * 4);
    const st = new Float32Array(count * 2), rr = new Float32Array(count * 3);
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const k = j * GRID + i;
      uv[k * 2] = (i + 0.5) / GRID; uv[k * 2 + 1] = (j + 0.5) / GRID;
      col[k * 4] = img[k * 4]; col[k * 4 + 1] = img[k * 4 + 1]; col[k * 4 + 2] = img[k * 4 + 2]; col[k * 4 + 3] = 255;
      const p = pts[(Math.random() * pts.length) | 0] || [0, 0];
      st[k * 2] = p[0] * heartPx; st[k * 2 + 1] = p[1] * heartPx * ar;
      rr[k * 3] = Math.random(); rr[k * 3 + 1] = Math.random(); rr[k * 3 + 2] = Math.random();
    }
    function attr(name, data, size, type, norm) {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, type, !!norm, 0, 0);
    }
    attr('a_uv', uv, 2, gl.FLOAT); attr('a_col', col, 4, gl.UNSIGNED_BYTE, true);
    attr('a_start', st, 2, gl.FLOAT); attr('a_r', rr, 3, gl.FLOAT);

    if (reduced) { heartEl.style.display = 'none'; start(-99); } else start(performance.now());
  }

  let raf = null;
  function start(t0) {
    heartEl.classList.add('in');
    const size = heartSize();
    heartEl.style.width = size + 'px';
    let hidden = false, hintShown = false;
    function frame(now) {
      const t = (now - t0) / 1000;
      // heartbeat: slow breathing, then one last strong beat that bursts
      if (!hidden) {
        let s;
        if (t < BEAT_END - 0.9) {
          const c = (t % 1.5) / 1.5;                       // lub-dub every 1.5s
          s = 1 + 0.06 * Math.sin(Math.min(c / 0.22, 1) * Math.PI) + 0.045 * Math.sin(Math.min(Math.max(c - 0.24, 0) / 0.2, 1) * Math.PI);
        } else if (t < BEAT_END) {
          const k = (t - (BEAT_END - 0.9)) / 0.9;          // swell before bursting
          s = 1 + 0.18 * (k * k) + 0.02 * Math.sin(k * 40);
        } else {
          const k = Math.min((t - BEAT_END) / 0.35, 1);
          s = 1.18 + 0.5 * k;
          heartEl.style.opacity = String(1 - k);
          if (k >= 1) { hidden = true; heartEl.style.display = 'none'; }
        }
        heartEl.style.transform = `translate(-50%,-50%) scale(${s})`;
      }
      const pt = t - BEAT_END + 0.05;                        // particle clock (negative = not yet visible)
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, W, H); gl.uniform1f(uT, pt > 0 ? pt : -1); gl.uniform1f(uDpr, DPR);
      gl.uniform1f(uImg, imgSize); gl.uniform1f(uCell, imgSize / GRID);
      if (pt > 0) gl.drawArrays(gl.POINTS, 0, count);
      if (!hintShown && pt > DUR + 1.2) { hintShown = true; scrollHint.classList.add('show'); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  // pause when the hero is off-screen
  new IntersectionObserver((es) => {
    // handled implicitly: rAF keeps cheap; nothing to restart
  }).observe(hero);
})();

/* ================================================================
   VIDEO GALLERY — show the real footage when the file exists,
   otherwise keep the placeholder frame (no broken-video icon)
================================================================ */
(function () {
  document.querySelectorAll('.video-frame video').forEach((video) => {
    const frame = video.closest('.video-frame');
    const fallback = frame.querySelector('[data-fallback]');
    video.addEventListener('loadeddata', () => {
      fallback.style.display = 'none';
      video.play().catch(() => {});
    });
    video.addEventListener('error', () => { video.style.display = 'none'; });
    // try loading; if the source 404s the error/stalled event fires and the fallback stays visible
    video.load();
  });
})();

/* ================================================================
   REVEAL — 要素を、ゆっくりと現す
================================================================ */
(function () {
  const targets = document.querySelectorAll('.sec-grid > *, .interlude, #footer .wrap > *');
  targets.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  targets.forEach((el) => io.observe(el));
})();
