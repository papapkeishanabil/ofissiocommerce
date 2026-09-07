import "server-only";

import { inflateSync } from "node:zlib";

export interface DecodedPngImage {
  width: number;
  height: number;
  colorSpace: "DeviceRGB" | "DeviceGray";
  /** Pixel data tanpa filter PNG: RGB triplets atau 1 byte gray per pixel. */
  colorData: Buffer;
  /** Kanal alpha sebagai grayscale 8-bit, bila PNG punya transparansi. */
  smaskData: Buffer | null;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Decoder PNG minimal untuk embed PDF: depth 8, non-interlaced, color type
 * 0 (gray) / 2 (RGB) / 3 (palette) / 4 (gray+alpha) / 6 (RGBA). Semua jalur
 * yang tidak didukung melempar Error — pemanggil fallback ke placeholder.
 */
export function decodePng(bytes: Buffer): DecodedPngImage {
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("File bukan PNG valid.");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  let palette: Buffer | null = null;
  let paletteAlpha: Buffer | null = null;
  const idatChunks: Buffer[] = [];
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = Math.min(bytes.length, dataStart + length);
    const data = bytes.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
      interlace = data[12]!;
    } else if (type === "PLTE") {
      palette = Buffer.from(data);
    } else if (type === "tRNS") {
      paletteAlpha = Buffer.from(data);
    } else if (type === "IDAT") {
      idatChunks.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4; // CRC
  }
  if (!width || !height) throw new Error("Dimensi PNG tidak terbaca.");
  if (bitDepth !== 8) throw new Error("PNG bit depth selain 8 tidak didukung.");
  if (interlace !== 0) throw new Error("PNG interlaced tidak didukung.");
  if (colorType === 3 && (!palette || palette.length < 3)) {
    throw new Error("Palet PNG tidak terbaca.");
  }

  const channels = channelCount(colorType);
  const rowLength = width * channels;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const expected = (rowLength + 1) * height;
  if (inflated.length < expected) throw new Error("Data pixel PNG tidak lengkap.");
  const unfiltered = unfilterScanlines(inflated, rowLength, height, channels);

  return buildImage(unfiltered, { width, height, colorType, palette, paletteAlpha });
}

function channelCount(colorType: number) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 3) return 1;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  throw new Error(`PNG color type ${colorType} tidak didukung.`);
}

function unfilterScanlines(
  inflated: Buffer,
  rowLength: number,
  height: number,
  channels: number,
) {
  const output = Buffer.allocUnsafe(rowLength * height);
  const prior = Buffer.alloc(rowLength);
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[row * (rowLength + 1)]!;
    const source = inflated.subarray(
      row * (rowLength + 1) + 1,
      row * (rowLength + 1) + 1 + rowLength,
    );
    const target = output.subarray(row * rowLength, (row + 1) * rowLength);
    switch (filter) {
      case 0:
        source.copy(target);
        break;
      case 1: {
        for (let index = 0; index < rowLength; index += 1) {
          const left = index >= channels ? target[index - channels]! : 0;
          target[index] = (source[index]! + left) & 0xff;
        }
        break;
      }
      case 2: {
        for (let index = 0; index < rowLength; index += 1) {
          target[index] = (source[index]! + prior[index]!) & 0xff;
        }
        break;
      }
      case 3: {
        for (let index = 0; index < rowLength; index += 1) {
          const left = index >= channels ? target[index - channels]! : 0;
          target[index] = (source[index]! + ((left + prior[index]!) >> 1)) & 0xff;
        }
        break;
      }
      case 4: {
        for (let index = 0; index < rowLength; index += 1) {
          const left = index >= channels ? target[index - channels]! : 0;
          const up = prior[index]!;
          const upperLeft = index >= channels ? prior[index - channels]! : 0;
          target[index] = (source[index]! + paethPredictor(left, up, upperLeft)) & 0xff;
        }
        break;
      }
      default:
        throw new Error(`Filter PNG ${filter} tidak didukung.`);
    }
    target.copy(prior);
  }
  return output;
}

function paethPredictor(left: number, up: number, upperLeft: number) {
  const p = left + up - upperLeft;
  const pLeft = Math.abs(p - left);
  const pUp = Math.abs(p - up);
  const pUpperLeft = Math.abs(p - upperLeft);
  if (pLeft <= pUp && pLeft <= pUpperLeft) return left;
  if (pUp <= pUpperLeft) return up;
  return upperLeft;
}

function buildImage(
  unfiltered: Buffer,
  input: {
    width: number;
    height: number;
    colorType: number;
    palette: Buffer | null;
    paletteAlpha: Buffer | null;
  },
): DecodedPngImage {
  const { width, height, colorType } = input;
  const pixelCount = width * height;

  if (colorType === 2 || colorType === 6) {
    const hasAlpha = colorType === 6;
    const colorData = Buffer.alloc(pixelCount * 3);
    const smaskData = hasAlpha ? Buffer.alloc(pixelCount) : null;
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const source = pixel * (hasAlpha ? 4 : 3);
      const target = pixel * 3;
      colorData[target] = unfiltered[source]!;
      colorData[target + 1] = unfiltered[source + 1]!;
      colorData[target + 2] = unfiltered[source + 2]!;
      if (smaskData) smaskData[pixel] = unfiltered[source + 3]!;
    }
    return { width, height, colorSpace: "DeviceRGB", colorData, smaskData };
  }

  if (colorType === 0 || colorType === 4) {
    const hasAlpha = colorType === 4;
    const colorData = Buffer.alloc(pixelCount);
    const smaskData = hasAlpha ? Buffer.alloc(pixelCount) : null;
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const source = pixel * (hasAlpha ? 2 : 1);
      colorData[pixel] = unfiltered[source]!;
      if (smaskData) smaskData[pixel] = unfiltered[source + 1]!;
    }
    return { width, height, colorSpace: "DeviceGray", colorData, smaskData };
  }

  // colorType 3 — indeks palet.
  const palette = input.palette!;
  const hasAlpha = Boolean(input.paletteAlpha?.length);
  const colorData = Buffer.alloc(pixelCount * 3);
  const smaskData = hasAlpha ? Buffer.alloc(pixelCount) : null;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const index = unfiltered[pixel]!;
    const entry = index * 3;
    const target = pixel * 3;
    colorData[target] = palette[entry] ?? 0;
    colorData[target + 1] = palette[entry + 1] ?? 0;
    colorData[target + 2] = palette[entry + 2] ?? 0;
    if (smaskData) smaskData[pixel] = input.paletteAlpha![index] ?? 255;
  }
  return { width, height, colorSpace: "DeviceRGB", colorData, smaskData };
}
