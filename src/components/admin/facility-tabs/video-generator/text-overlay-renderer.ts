/**
 * Canvas + MediaRecorder text-overlay compositor. Plays the source video
 * through an invisible <video>, draws each frame to a canvas with text
 * overlays, and records the canvas stream (combined with the original
 * audio track) as a WebM blob.
 *
 * Renders in real time — a 10s source video takes ~10s to export.
 */

import type { TextLayer } from "./types";

export type CompositeProgress = {
  phase: "loading" | "recording" | "finalizing";
  elapsed?: number;
  total?: number;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

type Vec = { x: number; y: number };

function positionFor(canvas: HTMLCanvasElement, position: TextLayer["position"]): Vec {
  const x = canvas.width / 2;
  if (position === "top") return { x, y: canvas.height * 0.2 };
  if (position === "center") return { x, y: canvas.height / 2 };
  return { x, y: canvas.height - canvas.height * 0.18 };
}

function styleFor(layer: TextLayer): { font: string; color: string; shadow: string } {
  const size = layer.style === "headline" ? 64 : layer.style === "cta" ? 52 : layer.style === "subhead" ? 44 : 38;
  const weight = layer.style === "headline" || layer.style === "cta" ? "700" : "600";
  const family = "'Poppins', -apple-system, system-ui, sans-serif";
  return {
    font: `${weight} ${size}px ${family}`,
    color: "#ffffff",
    shadow: "rgba(0,0,0,0.65)",
  };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
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

function drawLayer(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, layer: TextLayer, progress: number) {
  // progress is 0..1 across the video. Layer is active when enterAt <= progress <= exitAt.
  if (progress < layer.enterAt || progress > layer.exitAt) return;
  if (!layer.text.trim()) return;

  const localT = (progress - layer.enterAt) / Math.max(0.001, layer.exitAt - layer.enterAt);
  const fadeIn = Math.min(1, localT * 5);
  const fadeOut = Math.min(1, (1 - localT) * 5);
  const alpha = Math.min(fadeIn, fadeOut);

  const style = styleFor(layer);
  const pos = positionFor(canvas, layer.position);
  let x = pos.x;
  const y = pos.y;
  let text = layer.text;

  // Animation: typewriter reveals text over first half
  if (layer.animation === "typewriter" && localT < 0.5) {
    const reveal = Math.floor(text.length * (localT * 2));
    text = text.slice(0, reveal);
  }

  // Animation: slide-up translates y in the first 30% of the layer
  let yAdj = y;
  if (layer.animation === "slide-up" && localT < 0.3) {
    yAdj = y + (1 - localT / 0.3) * 60;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = style.shadow;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  const lineHeight = parseInt(style.font.match(/(\d+)px/)?.[1] || "48", 10) * 1.15;
  wrap(ctx, text, x, yAdj, canvas.width - 120, lineHeight);
  ctx.restore();
}

/**
 * Composite text overlays onto the source video. Returns a Blob of the
 * rendered video. Throws if MediaRecorder or captureStream aren't available.
 */
export async function compositeTextOverlays(
  videoUrl: string,
  layers: TextLayer[],
  onProgress?: (p: CompositeProgress) => void
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder not available in this browser");

  onProgress?.({ phase: "loading" });

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = false;
  video.playsInline = true;
  video.src = videoUrl;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });

  const width = video.videoWidth || 1080;
  const height = video.videoHeight || 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const canvasStream = (canvas as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream }).captureStream?.(30);
  if (!canvasStream) throw new Error("canvas.captureStream is not available");

  // Attempt to include audio from the source video
  const videoEl = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
  const capture = videoEl.captureStream || videoEl.mozCaptureStream;
  if (capture) {
    try {
      const videoStream = capture.call(videoEl);
      videoStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
    } catch {
      // audio capture unsupported — continue video-only
    }
  }

  const mimeType = pickMimeType();
  if (!mimeType) throw new Error("No supported MediaRecorder codec");
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 5_000_000 });
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  onProgress?.({ phase: "recording", elapsed: 0, total: video.duration });

  await video.play().catch((err) => {
    throw new Error(`Failed to play source video: ${err.message}`);
  });

  const activeLayers = layers.filter((l) => l.text.trim());

  await new Promise<void>((resolve) => {
    const render = () => {
      if (video.ended || video.paused) {
        resolve();
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const progress = video.duration > 0 ? video.currentTime / video.duration : 0;
      for (const layer of activeLayers) {
        drawLayer(ctx, canvas, layer, progress);
      }
      onProgress?.({ phase: "recording", elapsed: video.currentTime, total: video.duration });
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  });

  onProgress?.({ phase: "finalizing" });
  recorder.stop();
  await stopped;
  return new Blob(chunks, { type: mimeType });
}
