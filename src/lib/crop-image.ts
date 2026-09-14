/**
 * Canvas half of the seller photo cropper (image-crop-modal.tsx does the
 * dragging/zooming via react-easy-crop; this turns its pixel crop into the
 * final file). Split out from the modal so the geometry — the part that can
 * go subtly wrong (crop box hanging off the edge of the source image) — is
 * plain, unit-testable math with no <canvas> involved.
 */

export type PixelCrop = { x: number; y: number; width: number; height: number };

/** Keeps a crop box inside the source image's actual bounds. react-easy-crop
 * already does this internally, but a hand-rolled caller (or a future one)
 * shouldn't be able to hand this a box that overruns the image and crashes
 * `drawImage`. */
export function clampCropToImage(crop: PixelCrop, imageWidth: number, imageHeight: number): PixelCrop {
  const width = Math.min(Math.max(crop.width, 1), imageWidth);
  const height = Math.min(Math.max(crop.height, 1), imageHeight);
  const x = Math.min(Math.max(crop.x, 0), imageWidth - width);
  const y = Math.min(Math.max(crop.y, 0), imageHeight - height);
  return { x, y, width, height };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = src;
  });
}

/**
 * Draws the cropped region of `imageSrc` onto an off-screen canvas and
 * resolves the result as a Blob. Needs a real <canvas> 2D context, which
 * jsdom doesn't provide — exercised by hand / e2e, not unit tests.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  crop: PixelCrop,
  mimeType = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const safeCrop = clampCropToImage(crop, image.naturalWidth, image.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = safeCrop.width;
  canvas.height = safeCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.drawImage(
    image,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    safeCrop.width,
    safeCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process that image."))),
      mimeType,
      quality
    );
  });
}
