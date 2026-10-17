import live2dMessageManager from '@/utils/live2dMessageManager';
import { Z_INDEX } from '@/utils/zIndex';

/**
 * 全屏烟花引擎
 *
 * 从 ScrollToTop 中抽离为模块级单例：
 * - 引擎状态不再存放在渲染作用域，组件重渲染不会重置运行标记；
 * - 所有定时器与 rAF 由 stop() 统一清理，路由切换时可直接卸载特效；
 * - 尊重 prefers-reduced-motion，系统要求减少动态效果时不启动。
 */

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const calculateDistance = (p1x: number, p1y: number, p2x: number, p2y: number) => {
  const xDistance = p1x - p2x;
  const yDistance = p1y - p2y;
  return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
};

class Firework {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  distanceToTarget: number;
  distanceTraveled: number;
  coordinates: number[][];
  coordinateCount: number;
  angle: number;
  speed: number;
  acceleration: number;
  brightness: number;
  targetRadius: number;
  size: number;
  onBurst: (x: number, y: number, size: number) => void;

  constructor(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    onBurst: (x: number, y: number, size: number) => void,
  ) {
    this.x = sx;
    this.y = sy;
    this.sx = sx;
    this.sy = sy;
    this.tx = tx;
    this.ty = ty;
    this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
    this.distanceTraveled = 0;
    this.coordinates = [];
    this.coordinateCount = 3;
    this.onBurst = onBurst;

    while (this.coordinateCount--) {
      this.coordinates.push([this.x, this.y]);
    }

    this.angle = Math.atan2(ty - sy, tx - sx);
    this.speed = 1;
    this.acceleration = 1.01;
    this.brightness = random(50, 70);
    this.targetRadius = 2;
    this.size = random(0.7, 2);
  }

  update() {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);

    if (this.targetRadius < 8) {
      this.targetRadius += 0.3;
    } else {
      this.targetRadius = 1;
    }

    this.speed *= this.acceleration;

    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

    if (this.distanceTraveled >= this.distanceToTarget) {
      this.onBurst(this.tx, this.ty, this.size);
      return false;
    }

    this.x += vx;
    this.y += vy;
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, hue: number) {
    ctx.save();
    ctx.scale(this.size, this.size);

    ctx.beginPath();
    ctx.moveTo(
      this.coordinates[this.coordinates.length - 1][0] / this.size,
      this.coordinates[this.coordinates.length - 1][1] / this.size,
    );
    ctx.lineTo(this.x / this.size, this.y / this.size);
    ctx.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.tx / this.size, this.ty / this.size, this.targetRadius, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  coordinates: number[][];
  coordinateCount: number;
  angle: number;
  speed: number;
  friction: number;
  gravity: number;
  hue: number;
  brightness: number;
  alpha: number;
  decay: number;
  size: number;

  constructor(x: number, y: number, size: number, baseHue: number) {
    this.x = x;
    this.y = y;
    this.coordinates = [];
    this.coordinateCount = 5;

    while (this.coordinateCount--) {
      this.coordinates.push([this.x, this.y]);
    }

    this.angle = random(0, Math.PI * 2);
    this.speed = random(1, 7) * size;
    this.friction = 0.95;
    this.gravity = 0.6;
    this.hue = random(baseHue - 20, baseHue + 20);
    this.brightness = random(50, 80);
    this.alpha = 1;
    this.decay = random(0.008, 0.015);
    this.size = size;
  }

  update() {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);
    this.speed *= this.friction;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed + this.gravity;
    this.alpha -= this.decay;
    return this.alpha > this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.scale(this.size, this.size);

    ctx.beginPath();
    ctx.moveTo(
      this.coordinates[this.coordinates.length - 1][0] / this.size,
      this.coordinates[this.coordinates.length - 1][1] / this.size,
    );
    ctx.lineTo(this.x / this.size, this.y / this.size);
    ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

class FireworksEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private fireworks: Firework[] = [];
  private particles: Particle[] = [];
  private hue = 120;
  private animationId: number | null = null;
  private running = false;
  private volleyCount = 0;
  private maxVolleys = 5;
  private volleyTimer: ReturnType<typeof setTimeout> | null = null;
  private filterRevealTimer: ReturnType<typeof setTimeout> | null = null;
  private filterRemoveTimer: ReturnType<typeof setTimeout> | null = null;

  get isRunning(): boolean {
    return this.running;
  }

  start(message?: string): void {
    if (this.running) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.running = true;
    live2dMessageManager.enterFireworksMode();
    this.initCanvas();

    const messages = ['哇，好漂亮的烟花呀！', '好美的烟花啊！'];
    live2dMessageManager.showFireworksMessage(
      message || messages[Math.floor(Math.random() * messages.length)],
      5000,
    );

    this.volleyCount = 0;
    this.maxVolleys = 5 + Math.floor(Math.random() * 3);
    this.launchVolley();
    this.loop();
  }

  stop(): void {
    const wasRunning = this.running;
    this.running = false;

    if (this.volleyTimer) {
      clearTimeout(this.volleyTimer);
      this.volleyTimer = null;
    }
    if (this.filterRevealTimer) {
      clearTimeout(this.filterRevealTimer);
      this.filterRevealTimer = null;
    }
    if (this.filterRemoveTimer) {
      clearTimeout(this.filterRemoveTimer);
      this.filterRemoveTimer = null;
    }

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    const filter = document.getElementById('fireworks-dark-filter');
    if (filter?.parentNode) {
      filter.style.opacity = '0';
      filter.parentNode.removeChild(filter);
    }

    this.canvas = null;
    this.ctx = null;
    this.fireworks = [];
    this.particles = [];

    if (wasRunning) {
      live2dMessageManager.exitFireworksMode();
    }
  }

  private initCanvas(): void {
    const oldCanvas = document.getElementById('fireworks-canvas');
    oldCanvas?.remove();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'fireworks-canvas';
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.position = 'fixed';
    this.canvas.style.inset = '0';
    this.canvas.style.zIndex = String(Z_INDEX.fireworks);
    this.canvas.style.pointerEvents = 'none';

    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // 浅色模式下加一层暗幕，让烟花更明显
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      const filter = document.createElement('div');
      filter.id = 'fireworks-dark-filter';
      filter.style.position = 'fixed';
      filter.style.inset = '0';
      filter.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      filter.style.zIndex = String(Z_INDEX.fireworksMask);
      filter.style.pointerEvents = 'none';
      filter.style.opacity = '0';
      filter.style.transition = 'opacity 1s ease-in-out';
      document.body.appendChild(filter);

      this.filterRevealTimer = setTimeout(() => {
        filter.style.opacity = '1';
        this.filterRevealTimer = null;
      }, 100);
    }
  }

  private createParticles(x: number, y: number, size: number): void {
    let count = 80;
    while (count--) {
      this.particles.push(new Particle(x, y, size, this.hue));
    }
  }

  private loop = (): void => {
    if (!this.running) return;

    this.animationId = requestAnimationFrame(this.loop);
    this.hue += 0.5;

    const { ctx, canvas } = this;
    if (!ctx || !canvas) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    let i = this.fireworks.length;
    while (i--) {
      const firework = this.fireworks[i];
      firework.draw(ctx, this.hue);
      if (!firework.update()) {
        this.fireworks.splice(i, 1);
      }
    }

    i = this.particles.length;
    while (i--) {
      const particle = this.particles[i];
      particle.draw(ctx);
      if (!particle.update()) {
        this.particles.splice(i, 1);
      }
    }

    if (this.fireworks.length === 0 && this.particles.length === 0) {
      this.stop();
    }
  };

  private launchVolley = (): void => {
    if (!this.running || this.volleyCount >= this.maxVolleys) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;

    const live2dElement = document.getElementById('landlord');
    let launchX1 = cw / 2;
    let launchY = ch;

    if (live2dElement) {
      const rect = live2dElement.getBoundingClientRect();
      launchX1 = rect.left - 50;
      launchY = rect.bottom;
    }

    const centerLine = cw / 2;
    const distanceFromCenter = centerLine - launchX1;
    const launchX2 = centerLine + distanceFromCenter;
    const baseSpeed = Math.min(cw, ch) / 1000;
    const fireworkCount = 7 + Math.floor(Math.random() * 6);

    const randomTargetX = (): number => {
      const roll = Math.random();
      if (roll < 0.5) {
        return random(cw * 0.35, cw * 0.65);
      }
      if (roll < 0.8) {
        return random(cw * 0.25, cw * 0.75);
      }
      return random(cw * 0.15, cw * 0.85);
    };

    for (let i = 0; i < fireworkCount; i++) {
      const targetX1 = randomTargetX();
      const targetY1 = random(ch * 0.15, ch * 0.85);

      let targetX2 = randomTargetX();
      let targetY2 = random(ch * 0.15, ch * 0.85);
      while (calculateDistance(targetX1, targetY1, targetX2, targetY2) < cw * 0.1) {
        targetX2 = randomTargetX();
        targetY2 = random(ch * 0.15, ch * 0.85);
      }

      const firework1 = new Firework(
        launchX1,
        launchY,
        targetX1,
        targetY1,
        (x, y, size) => this.createParticles(x, y, size),
      );
      firework1.speed = baseSpeed;
      this.fireworks.push(firework1);

      const firework2 = new Firework(
        launchX2,
        launchY,
        targetX2,
        targetY2,
        (x, y, size) => this.createParticles(x, y, size),
      );
      firework2.speed = baseSpeed;
      this.fireworks.push(firework2);
    }

    this.volleyCount += 1;

    if (this.volleyCount < this.maxVolleys) {
      this.volleyTimer = setTimeout(() => {
        this.volleyTimer = null;
        this.launchVolley();
      }, 1500);
    }
  };
}

export const fireworksEngine = new FireworksEngine();
