/**
 * Canvas + MediaRecorder slideshow renderer. Produces a WebM video from a
 * set of slides with Ken Burns animation, gradient overlays, and text.
 *
 * Works in Chrome/Safari/Firefox. Records in real time — a 15s slideshow
 * takes ~15s to render. Returns a Blob the caller can download.
 */

export type Slide = {
  id: string;
  imageUrl: string;
  textOverlay: string;
  subText: string;
  duration: number; // seconds
  kenBurns: "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "none";
  textPosition: "top" | "center" | "bottom";
};

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function drawCovered(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale: number, offsetX: number, offsetY: number) {
  const baseScale = Math.max(WIDTH / img.width, HEIGHT / img.height);
  const s = baseScale * scale;
  const w = img.width * s;
  const h = img.height * s;
  const x = (WIDTH - w) / 2 + offsetX;
  const y = (HEIGHT - h) / 2 + offsetY;
  ctx.drawImage(img, x, y, w, h);
}

function drawOverlay(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, HEIGHT * 0.6, 0, HEIGHT);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawText(ctx: CanvasRenderingContext2D, slide: Slide) {
  if (!slide.textOverlay) return;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px 'Poppins', sans-serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  const y = slide.textPosition === "top" ? 300 : slide.textPosition === "center" ? HEIGHT / 2 : HEIGHT - 400;
  wrapText(ctx, slide.textOverlay, WIDTH / 2, y, WIDTH - 120, 72);

  if (slide.subText) {
    ctx.font = "500 36px 'Poppins', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    wrapText(ctx, slide.subText, WIDTH / 2, y + 100, WIDTH - 120, 42);
  }
  ctx.shadowBlur = 0;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

/**
 * Compute per-frame transform for a Ken Burns effect. t is 0..1 through the slide.
 */
function kenBurnsTransform(effect: Slide["kenBurns"], t: number): { scale: number; offsetX: number; offsetY: number } {
  switch (effect) {
    case "zoom-in":
      return { scale: 1 + 0.15 * t, offsetX: 0, offsetY: 0 };
    case "zoom-out":
      return { scale: 1.15 - 0.15 * t, offsetX: 0, offsetY: 0 };
    case "pan-left":
      return { scale: 1.1, offsetX: -60 + 120 * t, offsetY: 0 };
    case "pan-right":
      return { scale: 1.1, offsetX: 60 - 120 * t, offsetY: 0 };
    case "none":
    default:
      return { scale: 1, offsetX: 0, offsetY: 0 };
  }
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export type RenderProgress = {
  phase: "loading" | "recording" | "finalizing";
  slideIndex?: number;
  totalSlides?: number;
  elapsed?: number;
  total?: number;
};

/**
 * Render all slides into a WebM video blob. Throws if MediaRecorder or
 * canvas.captureStream aren't available in this browser.
 */
export async function renderSlideshow(
  slides: Slide[],
  onProgress?: (p: RenderProgress) => void
): Promise<Blob> {
  if (slides.length === 0) throw new Error("No slides to render");
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder is not available in this browser");
  }

  onProgress?.({ phase: "loading" });
  const images = await Promise.all(slides.map((s) => loadImage(s.imageUrl)));

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Stream the canvas → MediaRecorder
  const stream = (canvas as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream }).captureStream?.(FPS);
  if (!stream) throw new Error("canvas.captureStream is not available in this browser");

  const mimeType = pickMimeType();
  if (!mimeType) throw new Error("No supported MediaRecorder video codec found");

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  onProgress?.({ phase: "recording", totalSlides: slides.length });

  const totalDuration = slides.reduce((s, x) => s + x.duration, 0);
  const startTime = performance.now();

  try {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const img = images[i];
      const slideStart = performance.now();
      const durationMs = Math.max(500, slide.duration * 1000);

      while (performance.now() - slideStart < durationMs) {
        const t = Math.min(1, (performance.now() - slideStart) / durationMs);
        const { scale, offsetX, offsetY } = kenBurnsTransform(slide.kenBurns, t);

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        drawCovered(ctx, img, scale, offsetX, offsetY);
        drawOverlay(ctx);
        drawText(ctx, slide);

        await new Promise((r) => requestAnimationFrame(() => r(null)));

        onProgress?.({
          phase: "recording",
          slideIndex: i,
          totalSlides: slides.length,
          elapsed: (performance.now() - startTime) / 1000,
          total: totalDuration,
        });
      }
    }
  } finally {
    onProgress?.({ phase: "finalizing" });
    recorder.stop();
  }

  await stopped;
  return new Blob(chunks, { type: mimeType });
}
