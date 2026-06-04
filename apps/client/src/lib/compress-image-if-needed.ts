/** MIME-типы, для которых применяется сжатие через browser-image-compression. */
export const COMPRESSIBLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Сжимает изображение через browser-image-compression с Web Worker.
 * Возвращает оригинал, если:
 *   — тип файла не входит в COMPRESSIBLE_IMAGE_TYPES,
 *   — или isSendAsFileChecked === true,
 *   — или сжатие падает с ошибкой (fallback).
 */
export async function compressImageIfNeeded(
  file: File,
  isSendAsFileChecked: boolean,
): Promise<File> {
  if (isSendAsFileChecked || !COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return file;
  }
  try {
    const imageCompression = (await import("browser-image-compression")).default;
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
    });
    return new File([compressed], file.name, { type: compressed.type || file.type });
  } catch (err) {
    console.warn("[compressImageIfNeeded] compression failed, using original file:", err);
    return file;
  }
}
