import { backgroundMode } from '@/setting/WebSetting';
import { homeFXImageSize, homeFXIntensity } from '@/setting/HomeFXSetting';

/*
 * 首页背景特效引擎。
 *
 * 实现说明：
 * - 不创建舞台、背景图、标题、提示和面板，只绘制特效；
 * - 首页背景是 cover/contain 到任意视口，所有锚点都通过图片矩形换算；
 * - 不绘制流星（首页沿用现有 CSS <Meteors />）、不做背景视差、不追随鼠标；
 * - 默认参数收敛为“首页可长期常驻”的强度，并按设备降级。
 */

const TAU = Math.PI * 2;
const HORIZON = 0.70;          // 水面分界线（图片归一化坐标）
const RX0 = 0.255;             // 风之光丝左端点，贴合左侧人物发梢
const RX1 = 0.745;             // 风之光丝右端点，贴合右侧人物发梢
const FLARE = { x: 0.06, y: 0.626 }; // 左侧水面高光点
const STAR_COLORS = ['#e8f6ff', '#cfe9ff', '#ffffff', '#a8d8ff'];

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

interface Star {
  x: number;        // 屏幕归一化横坐标
  y: number;        // 天空区域内的归一化纵坐标（0 顶部，1 水平线）
  size: number;
  base: number;
  speed: number;
  phase: number;
  color: string;
  glow: boolean;
}

interface Dust {
  x: number;
  y: number;
  vy: number;
  amp: number;
  freq: number;
  phase: number;
  size: number;
  alpha: number;
}

interface Cloud {
  x: number;        // 屏幕归一化横坐标
  y: number;        // 天空区域内的归一化纵坐标
  scale: number;
  speed: number;
  alpha: number;
  phase: number;
}

interface Glint {
  y: number;        // 图片归一化纵坐标
  pos: number;
  len: number;
  speed: number;
  alpha: number;
  phase: number;
}

interface Streak {
  x: number;
  y: number;        // 天空区域内的归一化纵坐标
  len: number;
  speed: number;
  phase: number;
  alpha: number;
  curve: number;
}

interface Sparkle {
  x: number;        // 屏幕归一化横坐标
  y: number;        // 图片归一化纵坐标
  life: number;
  max: number;
  size: number;
  len: number;
  alpha: number;
}

interface Ripple {
  x: number;        // 图片归一化横坐标
  y: number;        // 图片归一化纵坐标
  r: number;
  maxR: number;
  life: number;
  speed: number;
}

interface PendingRipple {
  delay: number;
  x: number;
  y: number;
  power: number;
}

interface RibbonLine {
  y: number;
  amp: number;
  freq: number;
  speed: number;
  alpha: number;
  width: number;
  delay: number;
}

const RIBBONS: RibbonLine[] = [
  { y: 0.398, amp: 0.030, freq: 1.4, speed: 0.42, alpha: 0.22, width: 1.2, delay: 0 },
  { y: 0.452, amp: 0.042, freq: 1.1, speed: 0.31, alpha: 0.16, width: 1.6, delay: 1.3 },
  { y: 0.508, amp: 0.026, freq: 1.8, speed: 0.55, alpha: 0.13, width: 1.0, delay: 2.1 },
  { y: 0.556, amp: 0.020, freq: 2.1, speed: 0.36, alpha: 0.10, width: 0.9, delay: 3.4 },
];

export interface HomeFxOptions {
  lite?: boolean;
}

export interface HomeFxController {
  stop(): void;
  start(): void;
  destroy(): void;
}

function createRadialSprite(
  size: number,
  stops: Array<[number, string]>,
): HTMLCanvasElement | null {
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

function createLineSprite(vertical: boolean): HTMLCanvasElement | null {
  const length = 256;
  const thickness = 2;
  const sprite = document.createElement('canvas');
  sprite.width = vertical ? thickness : length;
  sprite.height = vertical ? length : thickness;
  const ctx = sprite.getContext('2d');
  if (!ctx) return null;

  const gradient = vertical
    ? ctx.createLinearGradient(0, 0, 0, length)
    : ctx.createLinearGradient(0, 0, length, 0);
  gradient.addColorStop(0, 'rgba(190, 235, 255, 0)');
  gradient.addColorStop(0.5, 'rgba(232, 250, 255, 1)');
  gradient.addColorStop(1, 'rgba(190, 235, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, sprite.width, sprite.height);
  return sprite;
}

function createCloudSprite(): HTMLCanvasElement | null {
  const sprite = document.createElement('canvas');
  sprite.width = 512;
  sprite.height = 256;
  const ctx = sprite.getContext('2d');
  if (!ctx) return null;

  const blobs = [
    { x: 110, y: 152, r: 92 },
    { x: 178, y: 126, r: 78 },
    { x: 248, y: 150, r: 98 },
    { x: 318, y: 130, r: 74 },
    { x: 388, y: 154, r: 88 },
    { x: 208, y: 172, r: 66 },
    { x: 302, y: 174, r: 70 },
  ];

  for (const blob of blobs) {
    const gradient = ctx.createRadialGradient(
      blob.x,
      blob.y,
      0,
      blob.x,
      blob.y,
      blob.r,
    );
    gradient.addColorStop(0, 'rgba(214, 238, 255, 0.55)');
    gradient.addColorStop(0.55, 'rgba(180, 220, 255, 0.18)');
    gradient.addColorStop(1, 'rgba(180, 220, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(blob.x, blob.y, blob.r, blob.r * 0.55, 0, 0, TAU);
    ctx.fill();
  }
  return sprite;
}

export function mountHomeFx(
  canvas: HTMLCanvasElement,
  options: HomeFxOptions = {},
): HomeFxController {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    return { stop() {}, start() {}, destroy() {} };
  }
  const ctx = context;
  const fitMode: string = backgroundMode;

  const lite = Boolean(options.lite);
  const intensity = homeFXIntensity * (lite ? 0.82 : 1);
  const maxDpr = lite ? 1.5 : 2;
  const minFrameMs = lite ? 1000 / 30 - 1 : 0;
  const sparkleCap = lite ? 12 : 20;

  const imageWidth = homeFXImageSize.width;
  const imageHeight = homeFXImageSize.height;

  const starGlowSprite = createRadialSprite(64, [
    [0, 'rgba(190, 236, 255, 0.9)'],
    [1, 'rgba(190, 236, 255, 0)'],
  ]);
  const flareSprite = createRadialSprite(256, [
    [0, 'rgba(238, 252, 255, 1)'],
    [0.24, 'rgba(150, 220, 255, 0.5)'],
    [1, 'rgba(120, 190, 255, 0)'],
  ]);
  const lineSprite = createLineSprite(false);
  const lineVerticalSprite = createLineSprite(true);
  const cloudSprite = createCloudSprite();

  let width = 1;
  let height = 1;
  let dpr = 1;
  let time = 0;
  let frameId = 0;
  let lastFrame = 0;
  let destroyed = false;
  let surfaceVisible = true;
  let resizeFrame = 0;
  let sparkleTimer = 0.25;
  let rippleTimer = 3 + Math.random() * 3;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionReduced = motionQuery.matches;

  const stars: Star[] = [];
  const dust: Dust[] = [];
  const clouds: Cloud[] = [];
  const glints: Glint[] = [];
  const streaks: Streak[] = [];
  const sparkles: Sparkle[] = [];
  const ripples: Ripple[] = [];
  const pendingRipples: PendingRipple[] = [];

  // 当前图片在视口中的绘制矩形（cover/contain 后）
  let rect = { x: 0, y: 0, w: 1, h: 1 };
  let visibleX0 = 0;
  let visibleX1 = 1;
  let visibleY0 = 0;
  let visibleY1 = 1;
  let horizonY = 0;
  let skyHeight = 1;
  let skyVisible = true;
  let waterVisible = true;
  let ribbonsVisible = false;
  let flareVisible = false;

  let resizeObserver: ResizeObserver | null = null;
  let surfaceObserver: IntersectionObserver | null = null;

  function updateGeometry() {
    const scale =
      fitMode === 'contain'
        ? Math.min(width / imageWidth, height / imageHeight)
        : Math.max(width / imageWidth, height / imageHeight);
    const renderedWidth = imageWidth * scale;
    const renderedHeight = imageHeight * scale;

    rect = {
      x: (width - renderedWidth) / 2,
      y: (height - renderedHeight) / 2,
      w: renderedWidth,
      h: renderedHeight,
    };

    // 图片在视口中的可见归一化范围；竖屏时通常只有中间一条
    visibleX0 = Math.max(0, -rect.x / rect.w);
    visibleX1 = Math.min(1, (width - rect.x) / rect.w);
    visibleY0 = Math.max(0, -rect.y / rect.h);
    visibleY1 = Math.min(1, (height - rect.y) / rect.h);

    horizonY = rect.y + HORIZON * rect.h;
    skyHeight = Math.max(1, Math.min(height, horizonY));

    skyVisible = horizonY > 0 && visibleY0 < HORIZON;
    waterVisible = horizonY < height && visibleY1 > HORIZON;

    // 竖屏时左右两端都在画面外，丝带和左侧光斑不再有意义
    ribbonsVisible =
      !lite &&
      visibleX0 <= RX0 &&
      visibleX1 >= RX1 &&
      visibleY0 <= 0.38 &&
      visibleY1 >= 0.57;
    flareVisible =
      !lite &&
      FLARE.x >= visibleX0 &&
      FLARE.x <= visibleX1 &&
      FLARE.y >= visibleY0 &&
      FLARE.y <= visibleY1;
  }

  function createStar(): Star {
    return {
      x: Math.pow(Math.random(), 0.78),
      y: Math.pow(Math.random(), 1.25) * 0.98,
      size: 0.6 + Math.random() * 1.5,
      base: 0.32 + Math.random() * 0.55,
      speed: 0.6 + Math.random() * 2.2,
      phase: Math.random() * TAU,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      glow: Math.random() < 0.06,
    };
  }

  function starTarget() {
    if (width < 8 || height < 8) return 0;
    const density = lite ? 14000 : 9000;
    return Math.max(
      lite ? 24 : 40,
      Math.min(lite ? 90 : 170, Math.round((width * height) / density)),
    );
  }

  function resizeStars() {
    const target = starTarget();
    while (stars.length < target) stars.push(createStar());
    if (stars.length > target) stars.length = target;
  }

  function buildDust() {
    const count = lite ? 12 : 18;
    for (let i = 0; i < count; i++) {
      dust.push({
        x: Math.random(),
        y: Math.random(),
        vy: 0.012 + Math.random() * 0.03,
        amp: 0.004 + Math.random() * 0.012,
        freq: 0.4 + Math.random() * 1.2,
        phase: Math.random() * TAU,
        size: 0.8 + Math.random() * 1.6,
        alpha: 0.15 + Math.random() * 0.45,
      });
    }
  }

  function buildClouds() {
    const count = lite ? 2 : 4;
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: Math.random() * 1.4 - 0.2,
        y: 0.08 + Math.random() * 0.78,
        scale: 0.5 + Math.random() * 0.7,
        speed: (Math.random() < 0.5 ? -1 : 1) * (0.003 + Math.random() * 0.007),
        alpha: 0.08 + Math.random() * 0.1,
        phase: Math.random() * TAU,
      });
    }
  }

  function buildGlints() {
    const count = lite ? 3 : 4;
    for (let i = 0; i < count; i++) {
      glints.push({
        y: HORIZON + 0.04 + i * 0.065,
        pos: Math.random(),
        len: 0.12 + Math.random() * 0.2,
        speed: (Math.random() < 0.5 ? -1 : 1) * (0.008 + Math.random() * 0.018),
        alpha: 0.05 + Math.random() * 0.06,
        phase: Math.random() * TAU,
      });
    }
  }

  function buildStreaks() {
    const count = lite ? 5 : 7;
    for (let i = 0; i < count; i++) {
      streaks.push({
        x: Math.random() * 1.2 - 0.1,
        y: 0.08 + Math.random() * 0.74,
        len: 0.03 + Math.random() * 0.07,
        speed: 0.012 + Math.random() * 0.025,
        phase: Math.random() * TAU,
        alpha: 0.05 + Math.random() * 0.08,
        curve: (Math.random() - 0.5) * 0.02,
      });
    }
  }

  function resize() {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width));
    const nextHeight = Math.max(1, Math.round(bounds.height));
    const nextDpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    updateGeometry();
    resizeStars();
  }

  function scheduleResize() {
    if (destroyed || resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
    });
  }

  function drawStars() {
    ctx.save();
    for (const star of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * star.speed + star.phase);
      const zoneWeight = 0.35 + 0.65 * star.x;
      const alpha = clamp01(
        star.base * (0.35 + 0.65 * twinkle) * zoneWeight * intensity,
      );
      const x = star.x * width;
      const y = star.y * skyHeight;
      const radius = Math.max(0.4, star.size * (rect.h / 700));

      if (star.glow && starGlowSprite) {
        const glowRadius = Math.max(2, radius * 6);
        ctx.globalAlpha = clamp01(alpha * 0.35);
        ctx.drawImage(
          starGlowSprite,
          x - glowRadius,
          y - glowRadius,
          glowRadius * 2,
          glowRadius * 2,
        );
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawClouds(dt: number) {
    if (!cloudSprite) return;

    ctx.save();
    for (const cloud of clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > 1.2) cloud.x = -0.2;
      else if (cloud.x < -0.2) cloud.x = 1.2;

      const cloudWidth = cloud.scale * rect.h * 1.6;
      const cloudHeight = cloudWidth * 0.5;
      const cloudY =
        cloud.y * skyHeight + Math.sin(time * 0.12 + cloud.phase) * skyHeight * 0.004;

      ctx.globalAlpha = clamp01(cloud.alpha * intensity);
      ctx.drawImage(
        cloudSprite,
        cloud.x * width - cloudWidth / 2,
        cloudY - cloudHeight / 2,
        cloudWidth,
        cloudHeight,
      );
    }

    // 水面倒影：仅桌面端保留，移动端省掉这部分填充
    if (waterVisible && !lite) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizonY, width, height - horizonY);
      ctx.clip();

      for (const cloud of clouds) {
        const cloudWidth = cloud.scale * rect.h * 1.6;
        const cloudHeight = cloudWidth * 0.5;
        const cloudY =
          cloud.y * skyHeight + Math.sin(time * 0.12 + cloud.phase) * skyHeight * 0.004;
        if (cloudY > horizonY - skyHeight * 0.02) continue;

        const mirrorY = 2 * horizonY - cloudY;
        ctx.globalAlpha = clamp01(cloud.alpha * 0.25 * intensity);
        ctx.save();
        ctx.translate(cloud.x * width, mirrorY);
        ctx.scale(1, -1);
        ctx.drawImage(
          cloudSprite,
          -cloudWidth / 2,
          -cloudHeight / 2,
          cloudWidth,
          cloudHeight,
        );
        ctx.restore();
      }

      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawWind(dt: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';

    for (const streak of streaks) {
      streak.x += streak.speed * dt;
      if (streak.x > 1.12) {
        streak.x = -0.12;
        streak.y = 0.08 + Math.random() * 0.74;
      }

      const x = streak.x * width;
      const y = streak.y * skyHeight + Math.sin(time * 0.5 + streak.phase) * skyHeight * 0.006;
      const length = streak.len * width;
      const alpha = clamp01(
        streak.alpha * intensity * (0.55 + 0.45 * Math.sin(time * 0.8 + streak.phase)),
      );

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + length * 0.5, y + streak.curve * skyHeight, x + length, y);
      ctx.strokeStyle = `rgba(214, 242, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawGlints(dt: number) {
    if (!lineSprite) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const glint of glints) {
      glint.pos += glint.speed * dt;
      if (glint.pos > 1.35) glint.pos = -0.35;
      else if (glint.pos < -0.35) glint.pos = 1.35;

      const centerX = glint.pos * width;
      const y =
        rect.y +
        glint.y * rect.h +
        Math.sin(time * 0.7 + glint.phase) * rect.h * 0.004;
      if (y < -10 || y > height + 10) continue;

      const length = glint.len * width;
      const thickness = Math.max(1, rect.h * 0.0024);
      ctx.globalAlpha = clamp01(glint.alpha * intensity);
      ctx.drawImage(
        lineSprite,
        centerX - length / 2,
        y - thickness / 2,
        length,
        thickness,
      );
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function spawnRipple(x: number, y: number, power: number) {
    ripples.push({
      x,
      y,
      r: 0,
      maxR: (0.1 + Math.random() * 0.08) * power,
      life: 1,
      speed: 0.55 + Math.random() * 0.25,
    });
    if (ripples.length > 28) ripples.shift();
  }

  function queueRipple(x: number, y: number) {
    spawnRipple(x, y, 1.5);
    pendingRipples.push(
      { delay: 0.09, x, y, power: 1.2 },
      { delay: 0.18, x, y, power: 0.9 },
    );
  }

  function updateRipples(dt: number) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i];
      ripple.r += ripple.speed * dt * 0.22;
      ripple.life -= dt * 0.65;
      if (ripple.life <= 0 || ripple.r > ripple.maxR) ripples.splice(i, 1);
    }

    for (let i = pendingRipples.length - 1; i >= 0; i--) {
      const pending = pendingRipples[i];
      pending.delay -= dt;
      if (pending.delay <= 0) {
        spawnRipple(pending.x, pending.y, pending.power);
        pendingRipples.splice(i, 1);
      }
    }

    if (!waterVisible) return;

    // 首页没有操作提示，改为低频自动生成，让水面保持“活着”
    rippleTimer -= dt;
    if (rippleTimer <= 0) {
      rippleTimer = 5 + Math.random() * 4;
      const x = visibleX0 + Math.random() * Math.max(0.01, visibleX1 - visibleX0);
      const y =
        HORIZON +
        0.03 +
        Math.random() * Math.max(0.02, 0.96 - HORIZON - 0.03);
      spawnRipple(x, y, 0.9 + Math.random() * 0.5);
    }
  }

  function drawRipples() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const ripple of ripples) {
      const alpha = Math.pow(clamp01(ripple.life), 1.5) * 0.55 * intensity;
      if (alpha <= 0.002) continue;

      const centerX = rect.x + ripple.x * rect.w;
      const centerY = rect.y + ripple.y * rect.h;
      if (centerY < -rect.h * 0.1 || centerY > height + rect.h * 0.1) continue;

      const radiusX = ripple.r * rect.h;
      const radiusY = radiusX * 0.36;

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, TAU);
      ctx.strokeStyle = `rgba(196, 238, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1 + ripple.life * 0.8;
      ctx.stroke();

      if (ripple.r > 0.03) {
        ctx.beginPath();
        ctx.ellipse(
          centerX,
          centerY,
          radiusX * 0.72,
          radiusY * 0.72,
          0,
          0,
          TAU,
        );
        ctx.strokeStyle = `rgba(120, 200, 255, ${(alpha * 0.45).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function updateSparkles(dt: number) {
    if (waterVisible) {
      sparkleTimer -= dt;
      if (sparkleTimer <= 0) {
        sparkleTimer = 0.08 + Math.random() * 0.14;
        sparkles.push({
          x: Math.random(),
          y:
            HORIZON +
            0.02 +
            Math.random() * Math.max(0.05, 0.99 - HORIZON - 0.02),
          life: 0,
          max: 0.7 + Math.random() * 1.1,
          size: 0.8 + Math.random() * 1.6,
          len: 0.6 + Math.random() * 2.2,
          alpha: 0.25 + Math.random() * 0.45,
        });
        if (sparkles.length > sparkleCap) sparkles.shift();
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sparkle = sparkles[i];
      sparkle.life += dt;
      if (sparkle.life >= sparkle.max) sparkles.splice(i, 1);
    }
  }

  function drawSparkles() {
    if (!lineSprite) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const scale = rect.h / 700;

    for (const sparkle of sparkles) {
      const envelope = Math.sin(Math.PI * (sparkle.life / sparkle.max));
      const alpha = sparkle.alpha * envelope * intensity;
      if (alpha <= 0.004) continue;

      const x = sparkle.x * width;
      const y = rect.y + sparkle.y * rect.h;
      if (y < -4 || y > height + 4) continue;

      const sparkleWidth = Math.max(2, sparkle.size * sparkle.len * scale * 4);
      const sparkleHeight = Math.max(0.8, sparkle.size * scale * 0.9);

      ctx.globalAlpha = clamp01(alpha);
      ctx.drawImage(
        lineSprite,
        x - sparkleWidth / 2,
        y - sparkleHeight / 2,
        sparkleWidth,
        sparkleHeight,
      );
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawFlare() {
    if (!flareVisible || !flareSprite || !lineSprite || !lineVerticalSprite) return;

    const breathe = 0.6 + 0.4 * Math.sin(time * 0.55);
    const x = rect.x + FLARE.x * rect.w;
    const y = rect.y + FLARE.y * rect.h + Math.sin(time * 0.4) * rect.h * 0.002;
    const radius = rect.h * (0.055 + 0.015 * breathe);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    ctx.globalAlpha = clamp01(0.24 * breathe * intensity);
    ctx.drawImage(
      flareSprite,
      x - radius * 2.2,
      y - radius * 2.2,
      radius * 4.4,
      radius * 4.4,
    );

    const half = rect.h * 0.2;
    const lineThickness = Math.max(1, rect.h * 0.002);
    ctx.globalAlpha = clamp01(0.12 * breathe * intensity);
    ctx.drawImage(
      lineSprite,
      x - half,
      y - lineThickness / 2,
      half * 2,
      lineThickness,
    );

    const verticalHeight = rect.h * 0.07;
    ctx.globalAlpha = clamp01(0.22 * breathe * intensity);
    ctx.drawImage(
      lineVerticalSprite,
      x - lineThickness / 2,
      y - verticalHeight / 2,
      lineThickness,
      verticalHeight,
    );

    ctx.restore();
  }

  function ribbonY(line: RibbonLine, u: number) {
    const envelope = Math.pow(Math.sin(Math.PI * u), 0.8);
    return (
      line.y +
      Math.sin(u * TAU * line.freq + time * line.speed + line.delay) *
        line.amp *
        envelope
    );
  }

  function drawRibbons() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';

    const steps = 48;

    for (let i = 0; i < RIBBONS.length; i++) {
      const line = RIBBONS[i];

      ctx.beginPath();
      for (let step = 0; step <= steps; step++) {
        const u = step / steps;
        const x = rect.x + (RX0 + (RX1 - RX0) * u) * rect.w;
        const y = rect.y + ribbonY(line, u) * rect.h;
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const alpha = clamp01(line.alpha * intensity * 0.75);
      // 用两层描边替代 canvas shadowBlur，成本更低
      ctx.strokeStyle = `rgba(130, 205, 255, ${(alpha * 0.35).toFixed(3)})`;
      ctx.lineWidth = line.width + 3;
      ctx.stroke();

      ctx.strokeStyle = `rgba(196, 236, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = line.width;
      ctx.stroke();

      for (let dot = 0; dot < 3; dot++) {
        const u = (time * 0.07 + dot / 3 + i * 0.13) % 1;
        const x = rect.x + (RX0 + (RX1 - RX0) * u) * rect.w;
        const y = rect.y + ribbonY(line, u) * rect.h;
        const fade = Math.pow(Math.sin(Math.PI * u), 0.8);

        ctx.fillStyle = `rgba(226, 248, 255, ${clamp01(0.45 * fade * intensity).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, rect.h * 0.0016), 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function updateDust(dt: number) {
    for (const particle of dust) {
      particle.y -= particle.vy * dt;
      particle.x += Math.sin(time * particle.freq + particle.phase) * particle.amp * dt;

      if (particle.y < -0.05) {
        particle.y = 1.03;
        particle.x = Math.random();
      }
      if (particle.x < -0.02) particle.x = 1.02;
      else if (particle.x > 1.02) particle.x = -0.02;
    }
  }

  function drawDust() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const particle of dust) {
      const flicker = 0.55 + 0.45 * Math.sin(time * 1.6 + particle.phase);
      const alpha = Math.max(0, particle.alpha * flicker * intensity);
      const radius = Math.max(0.5, particle.size * (rect.h / 700));

      ctx.fillStyle = `rgba(198, 240, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(particle.x * width, particle.y * height, radius, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw(dt: number) {
    ctx.clearRect(0, 0, width, height);

    // contain 模式下只允许在图片区域内绘制；cover 时这个裁剪通常大于视口
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    if (skyVisible) {
      drawStars();
      drawClouds(dt);
      drawWind(dt);
    }

    if (waterVisible) {
      drawGlints(dt);
    }

    updateSparkles(dt);
    if (waterVisible) drawSparkles();

    drawFlare();

    updateRipples(dt);
    if (waterVisible) drawRipples();

    if (ribbonsVisible) drawRibbons();

    updateDust(dt);
    drawDust();

    ctx.restore();
  }

  function frame(now: number) {
    if (destroyed || !frameId) return;
    frameId = requestAnimationFrame(frame);

    const elapsed = now - lastFrame;
    if (elapsed < minFrameMs) return;

    const dt = Math.min(elapsed / 1000, 0.05);
    lastFrame = now;
    time += dt;
    draw(dt);
  }

  function start() {
    if (destroyed || frameId) return;
    // 页面隐藏或滚出视口期间可能发生过尺寸变化，恢复时先校正一次
    resize();
    lastFrame = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function syncRunning() {
    if (!destroyed && !motionReduced && !document.hidden && surfaceVisible) start();
    else stop();
  }

  function onPointerDown(event: Event) {
    const pointer = event as PointerEvent;
    if (!pointer.isPrimary || pointer.button !== 0) return;

    const target = pointer.target;
    if (
      target instanceof Element &&
      target.closest(
        'a,button,[role="button"],input,textarea,select,label,[contenteditable],canvas,[data-home-fx-ignore]',
      )
    ) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const nx = (pointer.clientX - bounds.left - rect.x) / rect.w;
    const ny = (pointer.clientY - bounds.top - rect.y) / rect.h;
    if (nx < 0 || nx > 1 || ny < HORIZON || ny > 1) return;

    queueRipple(nx, ny);
  }

  function onVisibilityChange() {
    syncRunning();
  }

  function onMotionChange() {
    motionReduced = motionQuery.matches;
    syncRunning();
  }

  function destroy() {
    destroyed = true;
    stop();

    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;

    resizeObserver?.disconnect();
    resizeObserver = null;
    surfaceObserver?.disconnect();
    surfaceObserver = null;

    document.removeEventListener('visibilitychange', onVisibilityChange);
    motionQuery.removeEventListener('change', onMotionChange);
    pointerTarget.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('resize', scheduleResize);
    window.visualViewport?.removeEventListener('resize', scheduleResize);

    stars.length = 0;
    dust.length = 0;
    clouds.length = 0;
    glints.length = 0;
    streaks.length = 0;
    sparkles.length = 0;
    ripples.length = 0;
    pendingRipples.length = 0;
  }

  buildDust();
  buildClouds();
  buildGlints();
  buildStreaks();
  resize();

  // 点击水面作为彩蛋；没有交互提示，自动涟漪仍然会让水面保持变化
  const surface = document.querySelector<HTMLElement>('[data-home-fx-surface]');
  const pointerTarget: EventTarget = surface ?? window;
  pointerTarget.addEventListener('pointerdown', onPointerDown, { passive: true });

  if (surface && typeof IntersectionObserver !== 'undefined') {
    surfaceObserver = new IntersectionObserver(
      (entries) => {
        surfaceVisible = entries[0]?.isIntersecting ?? true;
        syncRunning();
      },
      { rootMargin: '120px' },
    );
    surfaceObserver.observe(surface);
  }

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener('resize', scheduleResize);
  }
  window.visualViewport?.addEventListener('resize', scheduleResize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  motionQuery.addEventListener('change', onMotionChange);

  syncRunning();

  return {
    stop,
    start: syncRunning,
    destroy,
  };
}
