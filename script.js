/* ================================================================
   HERO
   0.0s  ロゴ（ハート）が即座に現れ、オーラをまとって約2秒ゆっくり呼吸
   2.0s  ハートが崩れて粒子になり、約2秒で横長のビジュアルへ
   完成  ハートのロゴとココロノセイセイが現れる
   以後  粒子が、呼吸するようにゆるやかに揺れ続ける
================================================================ */
(function () {
  const canvas = document.getElementById('bg-canvas');
  const veil = document.getElementById('bg-veil');
  const heartEl = document.getElementById('hero-heart');
  const auraEl = document.getElementById('hero-aura');
  const markEl = document.getElementById('hero-mark');
  const scrollHint = document.getElementById('hero-scroll');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showFinal() { markEl.classList.add('show'); scrollHint.classList.add('show'); }

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { heartEl.style.display = auraEl.style.display = 'none'; showFinal(); return; }

  const BREATH = 2.0;       // ハートが呼吸する秒数（1呼吸）
  // 粒子は一つひとつ、自分の時刻・向き・速さでハートを離れ、気の向くままに漂ってから、自分の居場所へ向かう
  const SPREAD = 1.3;       // 離れはじめる時刻のばらつき
  const DONE = BREATH + 4.0;   // ロゴが現れる時刻

  const VS = `
    attribute vec2 a_uv; attribute vec4 a_col; attribute vec2 a_start; attribute vec3 a_r; attribute vec3 a_f; attribute vec3 a_g;
    uniform vec2 u_res; uniform float u_t; uniform float u_dpr; uniform float u_img; uniform float u_cell;
    varying vec3 v_col;
    varying float v_a;
    vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
    void main(){
      float ph = a_r.y * 6.2831;
      // 粒ごとの居場所（わずかにずらして、格子に見せない）
      vec2 home = (a_uv - 0.5) * u_res * vec2(1.0, -1.0) * 1.03 + (a_r.xy - 0.5) * u_cell * 0.9;

      // --- 自我：粒ごとに、離れる時刻・向き・速さ・寄り道・迷う時間が違う ---
      float tp = max(u_t - a_f.z * ${SPREAD.toFixed(2)}, 0.0);
      float ang = a_g.x * 6.2831;
      vec2 dir = vec2(cos(ang), sin(ang));
      float sp = u_img * mix(0.12, 1.15, pow(a_g.y, 1.7));
      float k = 0.9 + 1.8 * a_g.z;                         // 進むほど失速する、その強さ
      vec2 pw = a_start + dir * sp * (1.0 - exp(-k * tp)) / k;
      pw += vec2(-dir.y, dir.x) * sin(tp * (0.7 + a_r.z * 1.6) + ph) * u_img * 0.09 * (1.0 - exp(-tp));   // ふらふらと寄り道
      pw.y -= u_img * (0.02 + 0.08 * a_g.z) * tp * tp;                                                   // 砂のように、少し落ちる

      // --- 迷ったあと、自分の気が向いた時に、居場所へ帰っていく ---
      float tH = 0.5 + a_g.y * a_g.z * 0.5 + a_r.x * 1.3;
      float dH = 0.9 + a_r.z * 0.8;
      float l = clamp((tp - tH) / dH, 0.0, 1.0);
      float h = l * l * (3.0 - 2.0 * l);
      vec2 curl = vec2(sin(home.y * 0.006 + u_t * 0.8 + ph), cos(home.x * 0.006 + u_t * 0.7 + ph));
      vec2 p = mix(pw, home, h) + curl * sin(3.14159 * l) * u_img * 0.05;

      // --- 居場所についてから：粒それぞれが、蠢き、波打ち続ける ---
      float s = smoothstep(0.85, 1.0, l);
      float br = sin(u_t * 0.85);
      vec2 wave = vec2(sin(home.y * 0.008 + u_t * 0.7 + ph * 0.3), cos(home.x * 0.008 - u_t * 0.6 + ph * 0.3)) * u_cell * 2.0
                + vec2(0.0, sin(home.x * 0.011 + home.y * 0.005 - u_t * 0.9)) * u_cell * 2.4;
      vec2 own = vec2(sin(u_t * (0.55 + a_r.z * 0.9) + ph * 3.0), cos(u_t * (0.5 + a_r.x * 0.8) + ph * 2.0)) * u_cell * 1.25
               + vec2(cos(u_t * (1.3 + a_r.y) + ph), sin(u_t * (1.1 + a_r.z) + ph * 1.7)) * u_cell * 0.35;
      p += (wave + own + home * 0.007 * br) * s;

      gl_Position = vec4(p / (u_res * 0.5), 0.0, 1.0);
      float pulse = 1.0 + 0.25 * sin(u_t * 0.9 + ph + home.x * 0.008 - home.y * 0.005) * s;
      float freeSize = 1.9 + 2.3 * a_g.z * a_g.x;
      gl_PointSize = max(1.8, mix(freeSize, u_cell * 0.92 * pulse, h)) * u_dpr;

      // 漂う間、粒ごとに違う速さで色が移ろい、帰るにつれて絵の色へ
      vec3 wander = mix(vec3(1.0), hue(fract(a_r.y * 3.0 + u_t * (0.15 + a_r.z * 0.6))), smoothstep(0.0, 0.6, tp) * 0.9);
      float toImg = smoothstep(0.35, 1.0, l);
      v_col = mix(wander, a_col.rgb, toImg) * (1.0 + 0.1 * sin(u_t * 0.9 + ph + home.x * 0.008) * s);
      v_a = (u_t > 0.0 ? 1.0 : 0.0) * mix(0.9, 1.0, h);
    }`;
  const FS = `
    precision mediump float; varying vec3 v_col; varying float v_a;
    void main(){
      vec2 d = gl_PointCoord - 0.5;
      float r = dot(d, d);
      if (r > 0.25) discard;
      gl_FragColor = vec4(min(v_col * 1.45, 1.0), v_a * smoothstep(0.25, 0.14, r));
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
  motif.src = 'assets/motif_base.jpg';
  heartImg.src = 'assets/logo2-heart-white.png';

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, count = 0, cell = 3, bufs = [];

  function heartSize() { return Math.max(90, Math.min(150, Math.min(W, H) * 0.17)); }

  // 画面の大きさに合わせて粒子とその色を組み直す
  function build() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);

    cell = Math.max(2.7, Math.sqrt((W * H) / 420000));
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
    const st = new Float32Array(count * 2), rr = new Float32Array(count * 3), ff = new Float32Array(count * 3), gg = new Float32Array(count * 3);
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const k = j * GX + i;
      uv[k * 2] = (i + 0.5) / GX; uv[k * 2 + 1] = (j + 0.5) / GY;
      col[k * 4] = img[k * 4]; col[k * 4 + 1] = img[k * 4 + 1]; col[k * 4 + 2] = img[k * 4 + 2]; col[k * 4 + 3] = 255;
      const p = pts[(Math.random() * pts.length) | 0] || [0, 0];
      st[k * 2] = p[0] * hp; st[k * 2 + 1] = p[1] * hp;
      rr[k * 3] = Math.random(); rr[k * 3 + 1] = Math.random(); rr[k * 3 + 2] = Math.random();
      gg[k * 3] = Math.random(); gg[k * 3 + 1] = Math.random(); gg[k * 3 + 2] = Math.random();
      // 崩れる順は、ばらばらの粒と、ところどころのまとまりの混ぜ合わせ
      const nz = 0.5 + 0.25 * Math.sin(p[0] * 17 + 1.3) + 0.25 * Math.sin(p[1] * 21 - p[0] * 9 + 0.4);
      ff[k * 3 + 2] = Math.pow(Math.min(1, Math.max(0, 0.65 * Math.random() + 0.35 * nz)), 1.4);
    }
    bufs.forEach((b) => gl.deleteBuffer(b)); bufs = [];
    function attr(name, data, size, type, norm) {
      const b = gl.createBuffer(); bufs.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, type, !!norm, 0, 0);
    }
    attr('a_uv', uv, 2, gl.FLOAT); attr('a_col', col, 4, gl.UNSIGNED_BYTE, true);
    attr('a_start', st, 2, gl.FLOAT); attr('a_r', rr, 3, gl.FLOAT); attr('a_f', ff, 3, gl.FLOAT); attr('a_g', gg, 3, gl.FLOAT);
  }

  let t0 = performance.now(), shown = false, heartGone = false;
  function begin() {
    build();
    let rt; window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (window.innerWidth !== W || Math.abs(window.innerHeight - H) > 140) build(); }, 180);
    });
    if (reduced) { t0 = performance.now() - (DONE + 30) * 1000; }
    else t0 = performance.now();
    requestAnimationFrame(frame);
  }

  // ゆっくり滑らかに：0→1→0（両端で速度ゼロ）
  const breathe = (x) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * x);

  function frame(now) {
    const t = (now - t0) / 1000;
    veil.style.opacity = (Math.min(Math.max(window.scrollY / (window.innerHeight * 0.85), 0), 1) * 0.5).toFixed(3);
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
