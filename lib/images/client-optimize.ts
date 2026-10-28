/**
 * Browser-side image downscaling for admin uploads.
 *
 * Retailer originals are 4-9 MB photos. Uploading them unchanged is what made
 * a product page download ~42 MB and a listing page ~161 MB, and it also makes
 * the admin upload slow and fragile on mobile data.
 *
 * The admin runs in a browser, so the cheapest fix is to resize BEFORE the
 * upload: the file never leaves the device at its original size, storage stays
 * small, and the upload itself gets much faster.
 *
 * This mirrors the server-side policy in lib/images/optimize.ts:
 *   - long edge capped at MAX_IMAGE_EDGE (1600px)
 *   - JPEG quality ~0.82
 *   - PNGs keep their format when they are small, so transparency survives
 */

/** Longest edge, in pixels, that we keep for an uploaded product image. */
export const MAX_UPLOAD_EDGE = 1600;

/** JPEG quality used when re-encoding. */
export const UPLOAD_JPEG_QUALITY = 0.82;

/** Files already at or under this size are uploaded untouched. */
export const UPLOAD_SKIP_BYTES = 300 * 1024;

export type OptimizeUploadResult = {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  optimized: boolean;
};

function loadImage(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({
        width,
        height,
        draw: (ctx, w, h) => ctx.drawImage(image, 0, 0, w, h),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    image.src = url;
  });
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, type: string, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode image'));
          return;
        }
        resolve(new File([blob], name, { type, lastModified: Date.now() }));
      },
      type,
      quality,
    );
  });
}

/**
 * Downscale and re-encode an image chosen in the admin.
 *
 * Never throws for an unsupported or unreadable file: the caller gets the
 * original file back so the upload can still proceed.
 */
export async function optimizeImageForUpload(file: File): Promise<OptimizeUploadResult> {
  const originalBytes = file.size;
  const untouched: OptimizeUploadResult = {
    file,
    width: 0,
    height: 0,
    originalBytes,
    optimized: false,
  };

  if (typeof document === 'undefined') return untouched;
  if (!file.type.startsWith('image/')) return untouched;
  // SVG must not be rasterised through a canvas.
  if (file.type === 'image/svg+xml') return untouched;
  if (originalBytes <= UPLOAD_SKIP_BYTES) {
    // Small enough already — but still report its dimensions.
    try {
      const image = await loadImage(file);
      return { file, width: image.width, height: image.height, originalBytes, optimized: false };
    } catch {
      return untouched;
    }
  }

  try {
    const image = await loadImage(file);
    const longest = Math.max(image.width, image.height);
    const scale = longest > MAX_UPLOAD_EDGE ? MAX_UPLOAD_EDGE / longest : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, width: image.width, height: image.height, originalBytes, optimized: false };

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // JPEG has no alpha channel; paint a white backdrop so transparent PNGs do
    // not turn black once they are flattened.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    image.draw(ctx, width, height);

    const isPng = file.type === 'image/png';
    // A PNG that is already small keeps its format (and its transparency).
    // Anything large is re-encoded as JPEG, which is dramatically smaller.
    const usePng = isPng && originalBytes <= UPLOAD_SKIP_BYTES;
    const type = usePng ? 'image/png' : 'image/jpeg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const name = usePng ? `${baseName}.png` : `${baseName}.jpg`;
    const quality = usePng ? 1 : UPLOAD_JPEG_QUALITY;

    const optimizedFile = await canvasToFile(canvas, name, type, quality);

    // If re-encoding did not actually help, keep the original.
    if (optimizedFile.size >= originalBytes) {
      return { file, width: image.width, height: image.height, originalBytes, optimized: false };
    }

    return {
      file: optimizedFile,
      width,
      height,
      originalBytes,
      optimized: true,
    };
  } catch {
    return untouched;
  }
}
