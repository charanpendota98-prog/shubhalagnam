import zlib from "node:zlib";

/**
 * Minimal PNG reader for the screenshots Playwright produces.
 *
 * The dependency tree has no image decoder, and the hero-artwork regression
 * test needs real pixels to measure text contrast over the animated stage.
 * Photos and the Gradle/WebP assets are out of scope: Chromium's
 * `page.screenshot()` always emits 8-bit RGBA (colour type 6), non-interlaced,
 * which is all this handles. It throws on anything else rather than guessing.
 */
export type Bitmap = { width: number; height: number; data: Buffer };

export function decodePng(buffer: Buffer): Bitmap {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("decodePng: not a PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length; // length + type + data + crc

    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
      const interlace = body[12];
      if (bitDepth !== 8 || interlace !== 0) {
        throw new Error(`decodePng: unsupported (bitDepth ${bitDepth}, interlace ${interlace})`);
      }
      if (colorType !== 6 && colorType !== 2) {
        throw new Error(`decodePng: unsupported colour type ${colorType}`);
      }
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
  }

  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? line[i - channels] : 0;
      const up = previous[i];
      const upLeft = i >= channels ? previous[i - channels] : 0;
      switch (filter) {
        case 0:
          break;
        case 1:
          line[i] = (line[i] + left) & 0xff;
          break;
        case 2:
          line[i] = (line[i] + up) & 0xff;
          break;
        case 3:
          line[i] = (line[i] + ((left + up) >> 1)) & 0xff;
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          line[i] = (line[i] + predictor) & 0xff;
          break;
        }
        default:
          throw new Error(`decodePng: unknown filter ${filter}`);
      }
    }
    for (let x = 0; x < width; x += 1) {
      const src = x * channels;
      const dst = (y * width + x) * 4;
      out[dst] = line[src];
      out[dst + 1] = line[src + 1];
      out[dst + 2] = line[src + 2];
      out[dst + 3] = channels === 4 ? line[src + 3] : 255;
    }
    previous = line;
  }

  return { width, height, data: out };
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a[0], a[1], a[2]);
  const lb = luminance(b[0], b[1], b[2]);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Parses the CSS colour strings a renderer hands back (`rgb`, `rgba`, `oklab`). */
export function parseCssColor(color: string): [number, number, number, number] {
  if (color.startsWith("oklab") || color.startsWith("color(")) {
    // Chromium re-serialises `text-white/55` as oklab(); sRGB white with alpha is
    // good enough for a contrast floor, and the alpha is what the test needs.
    const alpha = /\/\s*([\d.]+)\s*\)/.exec(color);
    return [255, 255, 255, alpha ? Number(alpha[1]) : 1];
  }
  const numbers = color.match(/[\d.]+/g)?.map(Number) ?? [];
  const [r = 0, g = 0, b = 0, a = 1] = numbers;
  return [r, g, b, a];
}

/** Blends a translucent foreground over an opaque background sample. */
export function blend(
  foreground: [number, number, number, number],
  background: [number, number, number],
): [number, number, number] {
  const [r, g, b, a] = foreground;
  return [
    Math.round(r * a + background[0] * (1 - a)),
    Math.round(g * a + background[1] * (1 - a)),
    Math.round(b * a + background[2] * (1 - a)),
  ];
}
