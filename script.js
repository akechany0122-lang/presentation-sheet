/* ================================================================
   HERO
   0.0s  ロゴ（ハート）が即座に現れ、オーラをまとって約2秒ゆっくり呼吸
   2.0s  ハートが崩れて粒子になり、約2秒で横長のビジュアルへ
   完成  ハートのロゴとココロノセイセイが現れる
   以後  粒子が、呼吸するようにゆるやかに揺れ続ける
================================================================ */
(function () {
  const canvas = document.getElementById('bg-canvas');
  const hero = document.getElementById('hero');
  const heartEl = document.getElementById('hero-heart');
  const auraEl = document.getElementById('hero-aura');
  const markEl = document.getElementById('hero-mark');
  const scrollHint = document.getElementById('hero-scroll');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showFinal() { markEl.classList.add('show'); scrollHint.classList.add('show'); }

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { heartEl.style.display = auraEl.style.display = 'none'; showFinal(); return; }

  const BREATH = 2.0;       // ハートが呼吸する秒数（1呼吸）
  // 参考映像の変容：ハートの白い粒子が、霧のように画面へ広がり、
  // その霧の中から、上のほうから順に色と形が立ち上がってビジュアルになる
  const DONE_PT = 4.2;         // 崩れはじめから、ロゴが現れるまで
  const EXTRA = 0.45;          // 画面の下にはみ出して敷く粒子（スクロール時に、切れ目なく黒へ溶ける）

  const VS = `
    attribute vec2 a_uv; attribute vec4 a_col; attribute vec2 a_start; attribute vec3 a_r; attribute vec3 a_f; attribute vec3 a_g;
    uniform vec2 u_res; uniform float u_t; uniform float u_dpr; uniform float u_img; uniform float u_cell; uniform vec2 u_hc;
    varying vec3 v_col;
    varying float v_a;
    void main(){
      float ph = a_r.y * 6.2831;
      vec2 home = (a_uv - 0.5) * u_res * vec2(1.0, -1.0) * 1.03 + (a_r.xy - 0.5) * u_cell * 0.9;

      // --- 1) 霧になる：ハートの粒子が、それぞれの速さ・時刻で、息を吐くように画面へ広がる ---
      vec2 F = home + a_f.xy;   // 霧：自分の居場所のまわりに、ふわりとほどけて広がる
      float dF = length(F - u_hc) / (length(u_res) * 0.5);
      float a = clamp((u_t - (dF * 0.9 + a_r.x * 0.35 + a_g.x * 0.3)) / (1.3 + a_r.z * 0.8), 0.0, 1.0);
      float ea = 1.0 - pow(1.0 - a, 2.4);
      vec2 flow = vec2(sin(F.y * 0.005 + u_t * 0.6 + ph), cos(F.x * 0.005 + u_t * 0.5 + ph));
      vec2 pf = mix(a_start, F, ea) + flow * sin(3.14159 * a) * u_img * (0.04 + 0.1 * a_g.y);
      pf += vec2(sin(u_t * 1.3 + ph * 3.0), cos(u_t * 1.1 + ph * 2.0)) * 2.2 * smoothstep(0.6, 1.0, a);

      // --- 2) 霧の中から、上のほうから順に、色と形が立ち上がる（前線はゆるやかに波打つ） ---
      float tb = u_t - (0.9 + a_uv.y * 1.6 + a_r.y * 0.45 + 0.18 * sin(a_uv.x * 8.0 + 1.0));
      float l = clamp(tb / (1.5 + a_r.z * 0.7), 0.0, 1.0);
      float h = l * l * (3.0 - 2.0 * l);
      vec2 curl = vec2(sin(home.y * 0.006 + u_t * 0.8 + ph), cos(home.x * 0.006 + u_t * 0.7 + ph));
      vec2 p = mix(pf, home, h) + curl * sin(3.14159 * l) * u_img * 0.07;

      // --- 3) 形になってから：粒それぞれが、蠢き、波打ち続ける ---
      float s = smoothstep(0.85, 1.0, l);
      float br = sin(u_t * 0.85);
      vec2 wave = vec2(sin(home.y * 0.008 + u_t * 0.7 + ph * 0.3), cos(home.x * 0.008 - u_t * 0.6 + ph * 0.3)) * u_cell * 2.0
                + vec2(0.0, sin(home.x * 0.011 + home.y * 0.005 - u_t * 0.9)) * u_cell * 2.4;
      vec2 own = vec2(sin(u_t * (0.55 + a_r.z * 0.9) + ph * 3.0), cos(u_t * (0.5 + a_r.x * 0.8) + ph * 2.0)) * u_cell * 1.25
               + vec2(cos(u_t * (1.3 + a_r.y) + ph), sin(u_t * (1.1 + a_r.z) + ph * 1.7)) * u_cell * 0.35;
      p += (wave + own + home * 0.007 * br) * s;

      gl_Position = vec4(p / (u_res * 0.5), 0.0, 1.0);
      float pulse = 1.0 + 0.25 * sin(u_t * 0.9 + ph + home.x * 0.008 - home.y * 0.005) * s;
      float fogSize = 1.9 + 1.5 * a_g.z;
      gl_PointSize = max(1.8, mix(fogSize, u_cell * 0.92 * pulse, h)) * u_dpr;

      // 白（ハート）→ 灰白い霧 → 絵の色。色は、立ち上がりの前線とともに染まっていく
      vec3 fog = mix(vec3(0.82, 0.86, 0.9), a_col.rgb, 0.75) * (1.0 + 0.15 * a_r.x);   // ビジュアルの色を含んだ、淡い霧
      vec3 c = mix(vec3(1.0), fog, smoothstep(0.0, 0.5, a));
      v_col = mix(c, a_col.rgb, smoothstep(0.05, 0.95, l)) * (1.0 + 0.1 * sin(u_t * 0.9 + ph + home.x * 0.008) * s);
      v_a = (u_t > 0.0 ? 1.0 : 0.0) * mix(0.88, 1.0, h);
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
  const uRes = U('u_res'), uT = U('u_t'), uDpr = U('u_dpr'), uImg = U('u_img'), uCell = U('u_cell'), uHc = U('u_hc');

  const motif = new Image(), heartImg = new Image();
  let loaded = 0, ready = false;
  function onLoad() { if (++loaded === 2) begin(); }
  motif.onload = onLoad; heartImg.onload = onLoad;
  motif.src = 'assets/motif_base.jpg';
  heartImg.src = 'assets/logo2-heart-white.png';

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, H0 = 0, count = 0, cell = 3, bufs = [];

  function heartSize() { return Math.max(90, Math.min(150, Math.min(W, H0) * 0.17)); }

  // 画面の大きさに合わせて粒子とその色を組み直す
  function build() {
    W = hero.clientWidth; H0 = hero.clientHeight; H = Math.round(H0 * (1 + EXTRA));
    canvas.style.height = H + 'px';
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);

    cell = Math.max(2.7, Math.sqrt((W * H) / 420000));
    const GX = Math.ceil(W / cell), GY = Math.ceil(H / cell);
    count = GX * GY;

    // 絵を、最初の1画面いっぱいに（cover）敷き、その続きを下へ延ばしてサンプリング
    const ia = motif.naturalWidth / motif.naturalHeight, sa = W / H0;
    let sx = 0, sy = 0, sw = motif.naturalWidth, sh_ = motif.naturalHeight;
    if (sa > ia) { sh_ = sw / sa; sy = (motif.naturalHeight - sh_) / 2; }
    else { sw = sh_ * sa; sx = (motif.naturalWidth - sw) / 2; }
    const shExt = sh_ * (H / H0);
    // 絵の下端を折り返して延ばし、下へ続く部分にも、途切れなく粒子の色を与える
    const nw = motif.naturalWidth, nh = motif.naturalHeight;
    const src = document.createElement('canvas'); src.width = nw; src.height = nh * 2;
    const sc = src.getContext('2d');
    sc.drawImage(motif, 0, 0);
    sc.save(); sc.translate(0, nh * 2); sc.scale(1, -1); sc.drawImage(motif, 0, 0); sc.restore();
    const c = document.createElement('canvas'); c.width = GX; c.height = GY;
    const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high';
    cx.drawImage(src, sx, sy, sw, shExt, 0, 0, GX, GY);
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
      st[k * 2] = p[0] * hp; st[k * 2 + 1] = p[1] * hp + (H - H0) / 2;   // ハートは最初の1画面の中央
      rr[k * 3] = Math.random(); rr[k * 3 + 1] = Math.random(); rr[k * 3 + 2] = Math.random();
      gg[k * 3] = Math.random(); gg[k * 3 + 1] = Math.random(); gg[k * 3 + 2] = Math.random();
      const ang = Math.random() * 6.2832, rad = Math.pow(Math.random(), 1.5) * Math.min(W, H0) * 0.16;
      ff[k * 3] = Math.cos(ang) * rad; ff[k * 3 + 1] = Math.sin(ang) * rad;   // 霧：居場所からのずれ
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

  // ハートは、サイトを開いた瞬間から呼吸している（絵の読み込みを待たない）。
  // 絵の準備ができたら、そのとき呼吸がひと巡りするのを待って、崩れはじめる。
  const tStart = performance.now();
  let burstT = null, shown = false, heartGone = false;
  function begin() {
    if (!hero.clientWidth || !hero.clientHeight) { setTimeout(begin, 200); return; }   // 非表示のタブなどで大きさが0のときは待つ
    build();
    let rt; window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (hero.clientWidth !== W || Math.abs(hero.clientHeight - H0) > 140) build(); }, 180);
    });
    const now = (performance.now() - tStart) / 1000;
    burstT = reduced ? -1000 : Math.max(BREATH, Math.ceil(now / BREATH) * BREATH);
    ready = true;
  }
  if (reduced) { heartEl.style.display = 'none'; auraEl.style.display = 'none'; }

  // ゆっくり滑らかに：0→1→0（両端で速度ゼロ）
  const breathe = (x) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * x);

  function frame(now) {
    const t = (now - tStart) / 1000;
    if (!heartGone && !reduced) {
      if (burstT === null || t < burstT) {
        const b = breathe((t % BREATH) / BREATH);
        heartEl.style.transform = `translate(-50%,-50%) scale(${(1 + 0.085 * b).toFixed(4)})`;
        heartEl.style.filter = `drop-shadow(0 0 ${(10 + 26 * b).toFixed(1)}px rgba(255,255,255,${(0.4 + 0.45 * b).toFixed(3)}))`;
        auraEl.style.opacity = (0.28 + 0.62 * b).toFixed(3);
        auraEl.style.transform = `translate(-50%,-50%) scale(${(0.92 + 0.3 * b).toFixed(4)})`;
      } else {
        // 崩れる：ハートは粒子に置き換わり、オーラは光として広がって消える
        const k = Math.min((t - burstT) / 0.5, 1), q = 1 - Math.pow(1 - k, 2);
        heartEl.style.opacity = String(Math.max(0, 1 - k * 3));
        heartEl.style.transform = `translate(-50%,-50%) scale(${(1 + 0.03 * q).toFixed(4)})`;
        auraEl.style.opacity = (0.9 * (1 - q)).toFixed(3);
        auraEl.style.transform = `translate(-50%,-50%) scale(${(1.22 + 1.6 * q).toFixed(4)})`;
        if (k >= 1) { heartGone = true; heartEl.style.display = 'none'; auraEl.style.display = 'none'; }
      }
    }
    if (burstT !== null && window.scrollY < H0 * 1.5) {   // 画面外では描かない
      const pt = t - burstT;
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, W, H); gl.uniform1f(uT, pt > 0 ? pt : -1); gl.uniform1f(uDpr, DPR);
      gl.uniform1f(uImg, Math.min(W, H0)); gl.uniform1f(uCell, cell); gl.uniform2f(uHc, 0, (H - H0) / 2);
      if (pt > 0) gl.drawArrays(gl.POINTS, 0, count);
      if (!shown && pt >= DONE_PT) { shown = true; showFinal(); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ================================================================
   DRIFT — グループごとの映像を、ランダムな順序・大きさ・高さで並べ、ゆっくり流す
================================================================ */
(function () {
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const RATIOS = [16 / 9, 16 / 9, 4 / 3, 21 / 9, 1, 3 / 2];
  const build = (name) => {
    const f = document.createElement('figure'); f.className = 'film';
    const scr = document.createElement('div'); scr.className = 'screen';
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.poster = encodeURI('assets/videos/posters/' + name + '.jpg');
    v.dataset.src = encodeURI('assets/videos/' + name + '.mp4');
    scr.appendChild(v); f.appendChild(scr); return f;
  };
  function layout() {
    document.querySelectorAll('.drift').forEach((d) => {
      d.textContent = '';
      const track = document.createElement('div'); track.className = 'track';
      const H = Math.min(300, Math.max(150, window.innerHeight * 0.27));   // 列の高さ（CSSの --h と同じ）
      const names = shuffle(d.dataset.clips.split(',').map((s) => s.trim()).filter(Boolean));
      const items = names.map((n) => {
        const f = build(n), r = RATIOS[(Math.random() * RATIOS.length) | 0], s = 0.7 + Math.random() * 0.3;
        const scr = f.firstChild; scr.style.height = (H * s) + 'px'; scr.style.width = (H * s * r) + 'px';
        f.style.marginTop = (Math.random() * H * 0.26) + 'px';
        return f;
      });
      items.forEach((f) => track.appendChild(f));
      items.forEach((f) => track.appendChild(f.cloneNode(true)));       // 切れ目なく流れるよう、同じ列をもう一組
      d.appendChild(track);
      const half = track.scrollWidth / 2;
      track.style.setProperty('--dur', (half / (parseFloat(d.dataset.speed) || 30)).toFixed(1) + 's');
      track.style.setProperty('--dir', d.dataset.dir === 'right' ? 'reverse' : 'normal');
    });
  }
  layout();
})();

/* ================================================================
   FILM SLOTS — 画面に近づいたら読み込んで再生、離れたら止める。
   ファイルがない枠は、「配置してください」の表示のまま残る
================================================================ */
(function () {
  const films = document.querySelectorAll('.film video[data-src]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.getAttribute('src')) v.setAttribute('src', v.dataset.src);
        v.play().catch(() => {});
      } else { v.pause(); }
    });
  }, { rootMargin: '240px 320px' });
  films.forEach((v) => {
    v.addEventListener('loadeddata', () => { v.classList.add('on'); v.closest('.film').classList.add('live'); });
    v.addEventListener('error', () => { v.style.display = 'none'; });
    io.observe(v);
  });
})();

/* ================================================================
   REVEAL — 要素を、ゆっくりと現す
================================================================ */
(function () {
  const targets = document.querySelectorAll('.rv');
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.04 });
  targets.forEach((el) => io.observe(el));
})();
