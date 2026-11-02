/* 亿企云 · 首页 Hero 粒子网络动画
   轻量 Canvas 实现：无依赖、无缝循环、自动适配 DPR 与尺寸。
   site.js 异步渲染会重建 #blocks，因此持续监听并在 canvas 被移除后自动补回；
   prefers-reduced-motion 时绘制单帧静态画面。 */
(function () {
  if (document.body.dataset.page !== 'home') return;

  var engine = null; /* 当前动画引擎 { canvas, stop } */

  function ensure() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var canvas = hero.querySelector('.yc-hero-canvas');
    if (canvas && engine && engine.canvas === canvas) return;
    if (engine) { engine.stop(); engine = null; }
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'yc-hero-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      hero.insertBefore(canvas, hero.firstChild);
    }
    engine = startEngine(canvas, hero);
  }

  function startEngine(canvas, hero) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, parts = [], raf = 0, running = false;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var COLORS = ['43,92,246', '0,179,154', '80,140,255'];

    function rand(a, b) { return a + Math.random() * (b - a); }

    function resize() {
      var r = hero.getBoundingClientRect();
      W = Math.max(r.width, 1); H = Math.max(r.height, 1);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(130, Math.max(55, (W * H) / 11000)));
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: rand(0, W), y: rand(0, H),
          vx: rand(-0.22, 0.22), vy: rand(-0.16, 0.16),
          r: rand(1.4, 3.2),
          c: COLORS[i % COLORS.length],
          a: rand(0.5, 0.95),
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      var link = Math.min(180, Math.max(135, W / 8));
      var i, j, p, q, dx, dy, d;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      }
      ctx.lineWidth = 1;
      for (i = 0; i < parts.length; i++) {
        for (j = i + 1; j < parts.length; j++) {
          p = parts[i]; q = parts[j];
          dx = p.x - q.x; dy = p.y - q.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < link) {
            ctx.strokeStyle = 'rgba(43,92,246,' + (0.30 * (1 - d / link)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    }

    window.addEventListener('resize', function () { resize(); if (reduced) frame(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (!reduced) start();
    });

    resize();
    frame(); /* 先同步绘制一帧，保证静态快照/首帧即有内容 */
    if (reduced) { /* 静态模式只画一帧 */ }
    else start();

    return { canvas: canvas, stop: stop };
  }

  /* 初次 + 持续兜底：site.js 重建 #blocks 后自动补回 canvas */
  ensure();
  var mo = new MutationObserver(ensure);
  mo.observe(document.getElementById('blocks') || document.body, { childList: true, subtree: true });
})();
