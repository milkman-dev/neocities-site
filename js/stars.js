(function () {
  // ── star canvas (behind content) ─────────────────────
  const starCanvas = document.createElement('canvas');
  starCanvas.id = 'star-canvas';
  starCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  document.body.insertBefore(starCanvas, document.body.firstChild);

  // ── comet canvas (behind boxes, in front of clouds) ──
  const cometCanvas = document.createElement('canvas');
  cometCanvas.id = 'comet-canvas';
  cometCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
  document.body.insertBefore(cometCanvas, document.body.firstChild);

  const sCtx = starCanvas.getContext('2d');
  const cCtx = cometCanvas.getContext('2d');

  const COUNT = 130;
  const stars = [];
  const comets = [];

  const COMET_COLORS = [
    [255, 229, 180], // yellow  #FFE5B4
    [255, 183, 197], // pink    #FFB7C5
    [180, 210, 255], // blue    #B4D2FF
  ];

  function resize() {
    starCanvas.width  = cometCanvas.width  = window.innerWidth;
    starCanvas.height = cometCanvas.height = window.innerHeight;
  }

  function randomStar() {
    return {
      x: Math.random() * starCanvas.width,
      y: Math.random() * starCanvas.height,
      size: Math.random() * 1.2 + 0.2,
      speed: Math.random() * 0.6 + 0.15,
      opacity: Math.random() * 0.5 + 0.15,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  function spawnComet() {
    const angle = (Math.random() * 25 + 20) * Math.PI / 180;
    const speed = Math.random() * 8 + 8;
    const trailLen = Math.random() * 100 + 80;
    const color = COMET_COLORS[Math.floor(Math.random() * COMET_COLORS.length)];
    return {
      x: Math.random() * cometCanvas.width * 0.8,
      y: Math.random() * cometCanvas.height * 0.3,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      speed, trailLen, color,
      size: Math.random() * 1.2 + 0.8,
      opacity: 0,
      phase: 'in',
      life: 0,
      maxLife: trailLen / speed * 5,
    };
  }

  function init() {
    resize();
    for (let i = 0; i < COUNT; i++) stars.push(randomStar());
  }

  function draw(t) {
    sCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    cCtx.clearRect(0, 0, cometCanvas.width, cometCanvas.height);

    // ── stars ───────────────────────────────────────────
    for (const s of stars) {
      const flicker = s.opacity + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.12;
      sCtx.beginPath();
      sCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      sCtx.fillStyle = `rgba(210,225,255,${Math.max(0, Math.min(1, flicker))})`;
      sCtx.fill();

      s.y += s.speed;
      if (s.y > starCanvas.height + 4) {
        Object.assign(s, randomStar(), { y: -4, x: Math.random() * starCanvas.width });
      }
    }

    // ── comet spawn (~every 2–5s) ───────────────────────
    if (comets.length < 5 && Math.random() < 0.005) {
      comets.push(spawnComet());
    }

    // ── comets ──────────────────────────────────────────
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];

      if (c.phase === 'in') {
        c.opacity = Math.min(1, c.opacity + 0.04);
        if (c.opacity >= 1) c.phase = 'travel';
      } else if (c.phase === 'out') {
        c.opacity = Math.max(0, c.opacity - 0.03);
        if (c.opacity <= 0) { comets.splice(i, 1); continue; }
      }

      c.life++;
      if (c.phase === 'travel' && c.life > c.maxLife) c.phase = 'out';

      const [r, g, b] = c.color;
      const tailX = c.x - (c.dx / c.speed) * c.trailLen;
      const tailY = c.y - (c.dy / c.speed) * c.trailLen;

      // trail
      const grad = cCtx.createLinearGradient(tailX, tailY, c.x, c.y);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},${c.opacity * 0.9})`);
      cCtx.beginPath();
      cCtx.moveTo(tailX, tailY);
      cCtx.lineTo(c.x, c.y);
      cCtx.strokeStyle = grad;
      cCtx.lineWidth = c.size;
      cCtx.lineCap = 'round';
      cCtx.stroke();

      // head
      cCtx.beginPath();
      cCtx.arc(c.x, c.y, c.size * 1.4, 0, Math.PI * 2);
      cCtx.fillStyle = `rgba(${r},${g},${b},${c.opacity})`;
      cCtx.fill();

      // sparkle
      for (let j = 0; j < 6; j++) {
        const sa = Math.random() * Math.PI * 2;
        const sd = Math.random() * c.size * 6 + c.size * 0.5;
        const sx = c.x + Math.cos(sa) * sd;
        const sy = c.y + Math.sin(sa) * sd;
        const ss = Math.random() * 1.0 + 0.2;
        const so = Math.random() * c.opacity * 0.85;
        cCtx.beginPath();
        cCtx.arc(sx, sy, ss, 0, Math.PI * 2);
        cCtx.fillStyle = `rgba(255,255,255,${so})`;
        cCtx.fill();
      }

      // glow
      const glow = cCtx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 6);
      glow.addColorStop(0, `rgba(${r},${g},${b},${c.opacity * 0.3})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      cCtx.beginPath();
      cCtx.arc(c.x, c.y, c.size * 6, 0, Math.PI * 2);
      cCtx.fillStyle = glow;
      cCtx.fill();

      c.x += c.dx;
      c.y += c.dy;

      if (c.x > cometCanvas.width + 50 || c.y > cometCanvas.height + 50) {
        comets.splice(i, 1);
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  requestAnimationFrame(draw);
})();
