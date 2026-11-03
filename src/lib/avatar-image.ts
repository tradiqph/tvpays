// Client-side avatar processing: crop → downscale → encode, so only a small,
// sharp image ever reaches storage.

export type PixelCrop = { x: number; y: number; width: number; height: number };

/** Output edge in px. Avatars render at ≤ ~100 CSS px, so 512 stays crisp at 3x+ DPR. */
export const AVATAR_SIZE = 512;
// 0.9 WebP is visually lossless for photos at this size (~30–80 KB).
const WEBP_QUALITY = 0.9;
const JPEG_QUALITY = 0.92;
const MAX_CANVAS_PIXELS = 16_000_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read this image."));
    img.src = src;
  });
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Image processing isn't supported on this device.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}

function toBlob(c: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => c.toBlob(resolve, type, quality));
}

/**
 * Crops `src` (an object URL) using react-easy-crop's pixel area, which is
 * measured on the image after `rotation`, and returns a square WebP (JPEG
 * where WebP encoding isn't available).
 */
export async function processAvatar(
  src: string,
  crop: PixelCrop,
  rotation = 0,
): Promise<Blob> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw = img.naturalWidth * cos + img.naturalHeight * sin;
  const bh = img.naturalWidth * sin + img.naturalHeight * cos;

  // Mobile browsers cap canvas area (~16.7 MP on iOS); 48 MP photos would
  // render blank, so shrink the working copy just enough to fit.
  const s = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (bw * bh)));

  // 1. Draw the rotated image, then cut the crop out of it.
  const rotated = canvas(bw * s, bh * s);
  rotated.ctx.translate((bw * s) / 2, (bh * s) / 2);
  rotated.ctx.rotate(rad);
  rotated.ctx.scale(s, s);
  rotated.ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const cw = crop.width * s;
  let current = canvas(cw, cw);
  current.ctx.drawImage(
    rotated.c,
    crop.x * s,
    crop.y * s,
    cw,
    crop.height * s,
    0,
    0,
    current.c.width,
    current.c.height,
  );
  rotated.c.width = rotated.c.height = 0; // free memory early on phones

  // 2. Halve repeatedly until near the target: one big jump aliases and blurs.
  const target = Math.min(AVATAR_SIZE, current.c.width); // never upscale
  while (current.c.width / 2 >= target) {
    const half = canvas(current.c.width / 2, current.c.height / 2);
    half.ctx.drawImage(current.c, 0, 0, half.c.width, half.c.height);
    current.c.width = 0;
    current = half;
  }
  if (current.c.width !== target) {
    const final = canvas(target, target);
    final.ctx.drawImage(current.c, 0, 0, target, target);
    current = final;
  }

  // 3. Encode. Browsers without WebP encoding silently return PNG, so check.
  const webp = await toBlob(current.c, "image/webp", WEBP_QUALITY);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob(current.c, "image/jpeg", JPEG_QUALITY);
  if (!jpeg) throw new Error("Couldn't process this image.");
  return jpeg;
}
