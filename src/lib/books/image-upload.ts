const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);
const FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const SUPPORTED_IMAGE_INPUT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
export const SUPPORTED_IMAGE_TYPES = new Set(Object.keys(FILE_EXTENSIONS));

export async function prepareImageUpload(file: File) {
  const detectedType = await detectImageType(file);
  if (detectedType === "image/heic") {
    const { heicTo } = await import("heic-to/csp");
    const converted = await heicTo({ blob: file, type: "image/jpeg", quality: 0.88 });
    if (!converted.size) throw new Error("Не удалось преобразовать HEIC-фотографию.");
    return new File([converted], replaceExtension(file.name, "jpg"), { type: "image/jpeg", lastModified: file.lastModified });
  }

  const type = detectedType || file.type;
  if (!SUPPORTED_IMAGE_TYPES.has(type)) throw new Error("Выберите фотографию в формате HEIC, JPEG, PNG или WebP.");
  if (file.type === type) return file;
  return new File([file], replaceExtension(file.name, FILE_EXTENSIONS[type]), { type, lastModified: file.lastModified });
}

export async function detectImageType(file: Blob) {
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 8) === "ftyp") {
    for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
      if (HEIF_BRANDS.has(ascii(bytes, offset, offset + 4))) return "image/heic";
    }
  }
  return "";
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function replaceExtension(filename: string, extension: string) {
  const basename = filename.replace(/\.[^.]+$/, "") || "photo";
  return `${basename}.${extension}`;
}
