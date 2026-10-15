export const PROFILE_PHOTO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MIN_DIMENSION = 350;
const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 50_000_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export class ProfilePhotoError extends Error {
  code: "missing" | "type" | "size" | "decode" | "dimensions" | "encode";

  constructor(code: ProfilePhotoError["code"]) {
    super(code);
    this.name = "ProfilePhotoError";
    this.code = code;
  }
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new ProfilePhotoError("decode"));
      element.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new ProfilePhotoError("encode"));
    }, "image/jpeg", quality);
  });
}

/** Decode, size-check, and compress one profile image to a real JPEG under the API limit. */
export async function prepareProfilePhoto(file: File): Promise<File> {
  if (!file || file.size <= 0) throw new ProfilePhotoError("missing");
  if (file.type && !ALLOWED_TYPES.has(file.type.toLowerCase())) throw new ProfilePhotoError("type");
  if (file.size > MAX_SOURCE_BYTES) throw new ProfilePhotoError("size");
  if (typeof window === "undefined" || typeof document === "undefined") throw new ProfilePhotoError("decode");

  let decoded: DecodedImage;
  try {
    decoded = await decodeImage(file);
  } catch {
    throw new ProfilePhotoError("decode");
  }

  try {
    const { width, height } = decoded;
    if (!width || !height || Math.min(width, height) < MIN_DIMENSION
      || Math.max(width, height) > MAX_DIMENSION || width * height > MAX_PIXELS) {
      throw new ProfilePhotoError("dimensions");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new ProfilePhotoError("encode");
    ctx.fillStyle = "#ffffff";

    // Downscale large camera originals while keeping the shorter edge at or above
    // the server's minimum accepted resolution. Never crop the member's image.
    const minScale = MIN_DIMENSION / Math.min(width, height);
    const preferredScale = Math.min(1, 1600 / Math.max(width, height));
    const baseScale = Math.max(preferredScale, minScale);
    const scales = [baseScale, Math.max(minScale, Math.min(baseScale, 0.85)),
      Math.max(minScale, Math.min(baseScale, 0.7)), minScale];

    for (const scale of [...new Set(scales)]) {
      canvas.width = Math.max(MIN_DIMENSION, Math.round(width * scale));
      canvas.height = Math.max(MIN_DIMENSION, Math.round(height * scale));
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58]) {
        const blob = await canvasBlob(canvas, quality);
        if (blob.size <= PROFILE_PHOTO_MAX_UPLOAD_BYTES) {
          const prepared = new File([blob], "profile-photo.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          if (prepared.size < 4 * 1024) throw new ProfilePhotoError("dimensions");
          return prepared;
        }
      }
    }
    throw new ProfilePhotoError("size");
  } catch (error) {
    if (error instanceof ProfilePhotoError) throw error;
    throw new ProfilePhotoError("encode");
  } finally {
    decoded.dispose();
  }
}

export function profilePhotoErrorMessage(code: ProfilePhotoError["code"], telugu: boolean): string {
  const copy = {
    missing: ["Choose a profile photo before continuing.", "కొనసాగించే ముందు ప్రొఫైల్ ఫోటోను ఎంచుకోండి."],
    type: ["Use a JPEG, PNG, or WebP image. HEIC is accepted only if your browser can read it.", "JPEG, PNG లేదా WebP ఫోటోను ఉపయోగించండి. మీ browser చదవగలిగితే మాత్రమే HEIC పనిచేస్తుంది."],
    size: ["This image is too large. Choose one under 25 MB; it will be compressed before upload.", "ఈ ఫోటో పరిమాణం ఎక్కువగా ఉంది. 25 MB లోపు ఫోటోను ఎంచుకోండి; అప్‌లోడ్‌కు ముందు పరిమాణం తగ్గుతుంది."],
    decode: ["This file could not be read as an image. Choose a valid photo and try again.", "ఈ ఫైల్‌ను ఫోటోగా చదవలేకపోయాం. సరైన ఫోటోను ఎంచుకుని మళ్లీ ప్రయత్నించండి."],
    dimensions: ["Use a clear image at least 350 × 350 px, with no extreme crop or panorama.", "కనీసం 350 × 350 పిక్సెల్‌ల స్పష్టమైన ఫోటోను ఎంచుకోండి; అతిగా కత్తిరించిన లేదా పొడవైన panorama ఫోటో వద్దు."],
    encode: ["The photo could not be prepared on this device. Try a JPEG or PNG image.", "ఈ పరికరంలో ఫోటోను సిద్ధం చేయలేకపోయాం. JPEG లేదా PNG ఫోటోతో మళ్లీ ప్రయత్నించండి."],
  } as const;
  return copy[code][telugu ? 1 : 0];
}
