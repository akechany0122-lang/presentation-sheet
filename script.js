/* ================================================================
   HERO
   0.0s  ロゴ（ハート）が即座に現れ、オーラをまとって約2秒ゆっくり呼吸
   2.0s  ハートが崩れて粒子になり、約2秒で横長のビジュアルへ
   完成  ハートのロゴとココロノセイセイが現れる
   以後  粒子が、呼吸するようにゆるやかに揺れ続ける
================================================================ */
(function () {
  const hero = document.getElementById('hero');
  const canvas = document.getElementById('hero-canvas');
  const heartEl = document.getElementById('hero-heart');
  const auraEl = document.getElementById('hero-aura');
  const markEl = document.getElementById('hero-mark');
  const scrollHint = document.getElementById('hero-scroll');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showFinal() { markEl.classList.add('show'); scrollHint.classList.add('show'); }

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { heartEl.style.display = auraEl.style.display = 'none'; showFinal(); return; }

  const BREATH = 2.0;     // ハートが呼吸する秒数（1呼吸）
  const DUR = 1.9;        // 1粒がビジュアルに収まるまで
  const SPREAD = 0.5;     // 粒ごとの出発の遅れ（最大）
  const DONE = BREATH + DUR + SPREAD;   // ビジュアル完成の時刻

  const VS = `
    attribute vec2 a_uv; attribute vec4 a_col; attribute vec2 a_start; attribute vec3 a_r;
    uniform vec2 u_res; uniform float u_t; uniform float u_dpr; uniform float u_img; uniform float u_cell;
    varying vec3 v_col;
    varying float v_a;
    vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
    void main(){
      float ph = a_r.y * 6.2831;
      // 粒ごとの居場所（わずかにずらして、格子に見せない）
      vec2 home = (a_uv - 0.5) * u_res * vec2(1.0, -1.0) * 1.03 + (a_r.xy - 0.5) * u_cell * 0.9;
      float dist = length(home) / (length(u_res) * 0.5);
      float delay = a_r.x * ${SPREAD.toFixed(2)} + dist * 0.12;
      float l = clamp((u_t - delay) / ${DUR.toFixed(2)}, 0.0, 1.0);

      // 1) ハートから、ばらばらに落ちていく
      float f = min(l / 0.42, 1.0);
      vec2 p1 = a_start + vec2((a_r.x - 0.5) * u_img * 0.22, -(0.06 + 0.2 * a_r.z) * u_img) * f * f;
      // 2) 落ちながら、ハートの周りをぐるりと囲み、それぞれの居場所へ
      float m = clamp((l - 0.2) / 0.8, 0.0, 1.0);
      float e = m * m * (3.0 - 2.0 * m);
      float ang = (2.2 + 2.2 * a_r.y) * (1.0 - e) * smoothstep(0.0, 0.35, l);
      vec2 p = rot(mix(p1, home, e), ang);

      // 3) 居場所についてから：粒それぞれが、波打ち続ける
      float s = smoothstep(0.88, 1.0, l);
      float br = sin(u_t * 0.85);
      vec2 wave = vec2(sin(home.y * 0.008 + u_t * 0.7 + ph * 0.3), cos(home.x * 0.008 - u_t * 0.6 + ph * 0.3)) * u_cell * 1.5
                + vec2(0.0, sin(home.x * 0.011 + home.y * 0.005 - u_t * 0.9)) * u_cell * 1.8
                + vec2(cos(u_t * 0.5 + ph), sin(u_t * 0.43 + ph * 1.3)) * u_cell * 0.55;
      p += (wave + home * 0.007 * br) * s;

      gl_Position = vec4(p / (u_res * 0.5), 0.0, 1.0);
      float pulse = 1.0 + 0.22 * sin(u_t * 0.9 + ph + home.x * 0.008 - home.y * 0.005) * s;
      gl_PointSize = max(1.8, mix(2.6, u_cell * 0.8 * pulse, e)) * u_dpr;
      // 崩れはじめは白（ハートの色）、旅のあいだに絵の色へ
      v_col = mix(vec3(1.0), a_col.rgb, smoothstep(0.0, 0.5, l)) * (1.0 + 0.1 * sin(u_t * 0.9 + ph + home.x * 0.008) * s);
      v_a = u_t > 0.0 ? 1.0 : 0.0;
    }`;
  const FS = `
    precision mediump float; varying vec3 v_col; varying float v_a;
    void main(){
      vec2 d = gl_PointCoord - 0.5;
      float r = dot(d, d);
      if (r > 0.25) discard;
      gl_FragColor = vec4(min(v_col * 1.3, 1.0), v_a * smoothstep(0.25, 0.14, r));
    }`;

  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U('u_res'), uT = U('u_t'), uDpr = U('u_dpr'), uImg = U('u_img'), uCell = U('u_cell');

  const motif = new Image(), heartImg = new Image();
  let loaded = 0;
  function onLoad() { if (++loaded === 2) begin(); }
  motif.onload = onLoad; heartImg.onload = onLoad;
  motif.src = 'assets/motif_wide.jpg';
  heartImg.src = 'assets/logo2-heart-white.png';

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, count = 0, cell = 3, bufs = [];

  function heartSize() { return Math.max(90, Math.min(150, Math.min(W, H) * 0.17)); }

  // 画面の大きさに合わせて粒子とその色を組み直す
  function build() {
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);

    cell = Math.max(3.4, Math.sqrt((W * H) / 300000));
    const GX = Math.ceil(W / cell), GY = Math.ceil(H / cell);
    count = GX * GY;

    // 横長の絵を、画面いっぱいに（cover）サンプリング
    const ia = motif.naturalWidth / motif.naturalHeight, sa = W / H;
    let sx = 0, sy = 0, sw = motif.naturalWidth, sh_ = motif.naturalHeight;
    if (sa > ia) { sh_ = sw / sa; sy = (motif.naturalHeight - sh_) / 2; }
    else { sw = sh_ * sa; sx = (motif.naturalWidth - sw) / 2; }
    const c = document.createElement('canvas'); c.width = GX; c.height = GY;
    const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high';
    cx.drawImage(motif, sx, sy, sw, sh_, 0, 0, GX, GY);
    const img = cx.getImageData(0, 0, GX, GY).data;

    // 出発点：ハートのシルエットの中のランダムな点
    const hs = 200, hc = document.createElement('canvas'); hc.width = hs; hc.height = hs;
    const hx = hc.getContext('2d');
    const ar = heartImg.naturalHeight / heartImg.naturalWidth;
    hx.drawImage(heartImg, 0, (hs - hs * ar) / 2, hs, hs * ar);
    const hd = hx.getImageData(0, 0, hs, hs).data, pts = [];
    for (let y = 0; y < hs; y++) for (let x = 0; x < hs; x++) if (hd[(y * hs + x) * 4 + 3] > 60) pts.push([x / hs - 0.5, -(y / hs - 0.5)]);
    const hp = heartSize();

    const uv = new Float32Array(count * 2), col = new Uint8Array(count * 4);
    const st = new Float32Array(count * 2), rr = new Float32Array(count * 3);
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const k = j * GX + i;
      uv[k * 2] = (i + 0.5) / GX; uv[k * 2 + 1] = (j + 0.5) / GY;
      col[k * 4] = img[k * 4]; col[k * 4 + 1] = img[k * 4 + 1]; col[k * 4 + 2] = img[k * 4 + 2]; col[k * 4 + 3] = 255;
      const p = pts[(Math.random() * pts.length) | 0] || [0, 0];
      st[k * 2] = p[0] * hp; st[k * 2 + 1] = p[1] * hp;
      rr[k * 3] = Math.random(); rr[k * 3 + 1] = Math.random(); rr[k * 3 + 2] = Math.random();
    }
    bufs.forEach((b) => gl.deleteBuffer(b)); bufs = [];
    function attr(name, data, size, type, norm) {
      const b = gl.createBuffer(); bufs.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, type, !!norm, 0, 0);
    }
    attr('a_uv', uv, 2, gl.FLOAT); attr('a_col', col, 4, gl.UNSIGNED_BYTE, true);
    attr('a_start', st, 2, gl.FLOAT); attr('a_r', rr, 3, gl.FLOAT);
  }

  let t0 = performance.now(), shown = false, heartGone = false;
  function begin() {
    build();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 180); });
    if (reduced) { t0 = performance.now() - (DONE + 30) * 1000; }
    else t0 = performance.now();
    requestAnimationFrame(frame);
  }

  // ゆっくり滑らかに：0→1→0（両端で速度ゼロ）
  const breathe = (x) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * x);

  function frame(now) {
    const t = (now - t0) / 1000;
    if (!heartGone) {
      if (t < BREATH) {
        const b = breathe(t / BREATH);
        heartEl.style.transform = `translate(-50%,-50%) scale(${(1 + 0.085 * b).toFixed(4)})`;
        heartEl.style.filter = `drop-shadow(0 0 ${(10 + 26 * b).toFixed(1)}px rgba(255,255,255,${(0.4 + 0.45 * b).toFixed(3)}))`;
        auraEl.style.opacity = (0.28 + 0.62 * b).toFixed(3);
        auraEl.style.transform = `translate(-50%,-50%) scale(${(0.92 + 0.3 * b).toFixed(4)})`;
      } else {
        // 崩れる：ハートは粒子に置き換わり、オーラは光として広がって消える
        const k = Math.min((t - BREATH) / 0.5, 1), q = 1 - Math.pow(1 - k, 2);
        heartEl.style.opacity = String(Math.max(0, 1 - k * 3));
        heartEl.style.transform = `translate(-50%,-50%) scale(${(1 + 0.03 * q).toFixed(4)})`;
        auraEl.style.opacity = (0.9 * (1 - q)).toFixed(3);
        auraEl.style.transform = `translate(-50%,-50%) scale(${(1.22 + 1.6 * q).toFixed(4)})`;
        if (k >= 1) { heartGone = true; heartEl.style.display = 'none'; auraEl.style.display = 'none'; }
      }
    }
    const pt = t - BREATH;
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, W, H); gl.uniform1f(uT, pt > 0 ? pt : -1); gl.uniform1f(uDpr, DPR);
    gl.uniform1f(uImg, Math.min(W, H)); gl.uniform1f(uCell, cell);
    if (pt > 0) gl.drawArrays(gl.POINTS, 0, count);
    if (!shown && t >= DONE) { shown = true; showFinal(); }
    requestAnimationFrame(frame);
  }
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
