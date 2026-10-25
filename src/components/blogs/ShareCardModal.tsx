'use client';

/**
 * 分享卡片生成弹窗
 *
 * 用 Canvas 绘制一张 3:4 的竖版分享图（900×1200，2 倍采样保证清晰度）：
 * 天依蓝渐变底 + 白色卡片 + 封面/标题/摘要/日期 + 品牌信息与文章二维码。
 * 生成后可下载 PNG，也可长按/右键保存（微信内转发朋友圈常用）。
 *
 * 技术要点：
 * - 不引入 html2canvas 之类的重依赖，纯 Canvas API 手绘，
 *   布局固定所以可控性最好，体积也最小；
 * - 二维码用 qrcode.react 的 QRCodeCanvas 渲染成真 <canvas>，
 *   再 drawImage 到海报上（同文档 canvas 不会污染画布）；
 * - 封面若来自第三方图床：crossOrigin='anonymous' + 服务端 CORS 放行
 *   （img.xinchengp.cn 已放行 *）才能导出；加载失败或导出被污染时
 *   降级为无封面/提示截图，绝不阻塞弹窗。
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, TriangleAlert } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { copyrightConfig } from '@/setting/blogSetting';
import { Z_INDEX } from '@/utils/zIndex';

export interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  /** 文章标题 */
  title: string;
  /** 文章摘要（可空） */
  excerpt: string;
  /** 分类（可空） */
  category: string;
  /** 发布日期（可空） */
  date: string;
  /** 封面图地址（可为相对路径） */
  coverImage?: string;
  /** 文章绝对链接，用于二维码 */
  articleUrl: string;
  /** 下载文件名（不含扩展名） */
  slug: string;
}

/** 海报逻辑尺寸（实际导出为 2 倍） */
const CARD_W = 900;
const CARD_H = 1200;
const SCALE = 2;

/** 卡片内边距与区块布局（均相对 900×1200 逻辑坐标） */
const LAYOUT = {
  cardX: 70,
  cardY: 70,
  cardW: 760,
  cardH: 1060,
  cover: { x: 110, y: 110, w: 680, h: 400, r: 28 },
  metaY: 560,
  // 标题基线：胶囊行底部（600）之下留足呼吸空间，避免 42px 字形顶部侵入元信息行
  titleY: 672,
  titleFont: 'bold 42px',
  titleLineHeight: 58,
  excerptFont: '24px',
  excerptLineHeight: 36,
  separatorY: 942,
  footerTextY: 996,
  footerDomainY: 1032,
  qr: { x: 656, y: 964, size: 130 },
};

const FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

export default function ShareCardModal({
  open,
  onClose,
  title,
  excerpt,
  category,
  date,
  coverImage,
  articleUrl,
  slug,
}: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrBoxRef = useRef<HTMLDivElement | null>(null);
  /** 生成的 PNG 对象 URL，用于预览与下载 */
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  /** 导出失败（画布被跨域封面污染）时的降级提示 */
  const [exportError, setExportError] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 弹窗打开时绘制；封面异步加载完成后补绘一次
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    const draw = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setGenerating(true);
      setExportError(false);
      try {
        const coverImg = coverImage ? await loadCoverImage(coverImage) : null;
        if (cancelled) return;
        const qrCanvas = qrBoxRef.current?.querySelector('canvas') ?? null;
        drawCard(canvas, { title, excerpt, category, date, articleUrl, coverImg, qrCanvas });

        // 导出 PNG；画布被污染时 toBlob 会抛 SecurityError
        const blob = await new Promise<Blob | null>((resolve, reject) => {
          try {
            canvas.toBlob((b) => resolve(b), 'image/png');
          } catch (error) {
            reject(error);
          }
        });
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        } else {
          setExportError(true);
        }
      } catch {
        if (!cancelled) setExportError(true);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    };

    void draw();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // imageUrl 变化不触发重绘；上次生成的 objectUrl 在 effect 清理或下次生成时回收
  }, [open, title, excerpt, category, date, coverImage, articleUrl]);

  // 关闭时释放预览图
  useEffect(() => {
    if (!open) setImageUrl(null);
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `share-${slug}.png`;
    link.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          style={{ zIndex: Z_INDEX.modalBackdrop }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="生成分享卡片"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md bg-card rounded-2xl border border-border/60 shadow-2xl p-5"
            style={{ zIndex: Z_INDEX.modal }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">分享卡片</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* 预览区：canvas 始终挂载（绘制目标），展示层用生成的 PNG */}
            <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30">
              <canvas
                ref={canvasRef}
                width={CARD_W * SCALE}
                height={CARD_H * SCALE}
                className="hidden"
                aria-hidden="true"
              />
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`《${title}》分享卡片预览`}
                  className="w-full h-auto select-none"
                  draggable={false}
                />
              ) : (
                <div className="aspect-[3/4] flex items-center justify-center text-sm text-muted-foreground">
                  {generating ? '正在生成…' : '生成失败，请关闭后重试'}
                </div>
              )}

              {/* 二维码源 canvas：绘制时被读取，用户不可见 */}
              <div ref={qrBoxRef} aria-hidden="true" className="absolute -left-[9999px] top-0">
                <QRCodeCanvas value={articleUrl} size={260} level="M" marginSize={0} />
              </div>
            </div>

            {/* 操作区 */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!imageUrl}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium
                           text-primary-foreground transition-colors hover:bg-primary/90
                           disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                保存图片
              </button>
              <p className="flex-1 text-xs text-muted-foreground leading-relaxed">
                微信内长按图片即可转发；电脑端也可右键另存为
              </p>
            </div>

            {exportError && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <TriangleAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                封面图来自不允许跨域读取的站点，已改用无封面的渐变卡片；若仍无法保存，可直接截图使用。
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Canvas 绘制
// ---------------------------------------------------------------------------

interface DrawOptions {
  title: string;
  excerpt: string;
  category: string;
  date: string;
  /** 文章绝对链接：页脚展示域名 */
  articleUrl: string;
  coverImg: HTMLImageElement | null;
  /** 弹窗内隐藏的二维码源 canvas（QRCodeCanvas 渲染产物） */
  qrCanvas: HTMLCanvasElement | null;
}

function drawCard(canvas: HTMLCanvasElement, options: DrawOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  // ---- 渐变背景 + 装饰圆 ----
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#b8e7ff');
  bg.addColorStop(0.5, '#66ccff');
  bg.addColorStop(1, '#0284c7');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(120, 150, 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CARD_W - 60, CARD_H - 120, 220, 0, Math.PI * 2);
  ctx.fill();

  // ---- 白色圆角卡片（带轻投影） ----
  const { cardX, cardY, cardW, cardH } = LAYOUT;
  ctx.save();
  ctx.shadowColor = 'rgba(2, 60, 100, 0.25)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.fill();
  ctx.restore();

  // ---- 封面（无封面时用柔和渐变占位） ----
  const { cover } = LAYOUT;
  ctx.save();
  roundRect(ctx, cover.x, cover.y, cover.w, cover.h, cover.r);
  ctx.clip();
  if (options.coverImg) {
    // cover-fit 裁剪：按短边缩放后居中裁切
    const img = options.coverImg;
    const scale = Math.max(cover.w / img.width, cover.h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(
      img,
      cover.x + (cover.w - drawW) / 2,
      cover.y + (cover.h - drawH) / 2,
      drawW,
      drawH
    );
  } else {
    const ph = ctx.createLinearGradient(cover.x, cover.y, cover.x + cover.w, cover.y + cover.h);
    ph.addColorStop(0, '#e0f2fe');
    ph.addColorStop(1, '#bae6fd');
    ctx.fillStyle = ph;
    ctx.fillRect(cover.x, cover.y, cover.w, cover.h);
    ctx.font = `72px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌸', cover.x + cover.w / 2, cover.y + cover.h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  // ---- 分类胶囊 + 日期（同行顺序排布：绘制与横坐标推进共用同一次测量） ----
  ctx.textBaseline = 'middle';
  let metaX = cover.x;
  const metaCenterY = LAYOUT.metaY + 20;
  if (options.category) {
    ctx.font = `500 22px ${FONT_FAMILY}`;
    const pillW = ctx.measureText(options.category).width + 36;
    ctx.fillStyle = 'rgba(102, 204, 255, 0.16)';
    roundRect(ctx, metaX, LAYOUT.metaY, pillW, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.fillText(options.category, metaX + 18, metaCenterY + 1);
    metaX += pillW + 16;
  }
  if (options.date) {
    ctx.font = `22px ${FONT_FAMILY}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(options.date, metaX, metaCenterY + 1);
  }
  ctx.textBaseline = 'alphabetic';

  // ---- 标题（最多 3 行，超出省略） ----
  let textY = LAYOUT.titleY;
  ctx.font = `${LAYOUT.titleFont} ${FONT_FAMILY}`;
  ctx.fillStyle = '#0f172a';
  const titleLines = wrapText(ctx, options.title, cover.w, 3);
  for (const line of titleLines) {
    ctx.fillText(line, cover.x, textY);
    textY += LAYOUT.titleLineHeight;
  }
  textY += 18;

  // ---- 摘要（最多 2 行） ----
  if (options.excerpt) {
    ctx.font = `${LAYOUT.excerptFont} ${FONT_FAMILY}`;
    ctx.fillStyle = '#64748b';
    const excerptLines = wrapText(ctx, options.excerpt, cover.w, 2);
    for (const line of excerptLines) {
      ctx.fillText(line, cover.x, textY);
      textY += LAYOUT.excerptLineHeight;
    }
  }

  // ---- 页脚：分隔线 + 站点信息 + 二维码 ----
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cover.x, LAYOUT.separatorY);
  ctx.lineTo(cardX + cardW - 40, LAYOUT.separatorY);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.font = `bold 26px ${FONT_FAMILY}`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText(copyrightConfig.siteName, cover.x, LAYOUT.footerTextY);
  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(safeHost(options.articleUrl), cover.x, LAYOUT.footerDomainY);
  ctx.textBaseline = 'alphabetic';

  drawQr(ctx, options.qrCanvas);
}

/** 把二维码源 canvas 画到海报右下角（白底 + 描边） */
function drawQr(ctx: CanvasRenderingContext2D, qrCanvas: HTMLCanvasElement | null): void {
  const { qr } = LAYOUT;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, qr.x - 8, qr.y - 8, qr.size + 16, qr.size + 16, 16);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  roundRect(ctx, qr.x - 8, qr.y - 8, qr.size + 16, qr.size + 16, 16);
  ctx.stroke();

  if (qrCanvas) {
    ctx.drawImage(qrCanvas, qr.x, qr.y, qr.size, qr.size);
  } else {
    // 二维码尚未就绪：占位灰块
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(qr.x, qr.y, qr.size, qr.size);
  }
  ctx.restore();
}

/** 加载封面：相对路径补站点前缀，跨域图尝试 anonymous 读取，失败返回 null */
function loadCoverImage(coverImage: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || copyrightConfig.siteUrl).replace(/\/$/, '');
    const src = /^https?:\/\//.test(coverImage) ? coverImage : `${siteBase}${coverImage.startsWith('/') ? '' : '/'}${coverImage}`;

    const img = new Image();
    if (/^https?:\/\//.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 按像素宽度折行，最多 maxLines 行，超出补省略号 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';

  for (const char of text.replace(/\s+/g, ' ').trim()) {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  // 被截断时（还有剩余字符没进列表）给最后一行加省略号
  const truncated = lines.length === maxLines && current !== '';
  if (truncated) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'blog.xinchengp.cn';
  }
}
