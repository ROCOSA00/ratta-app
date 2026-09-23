/**
 * Reduce una foto en el propio móvil antes de subirla: las del iPhone
 * pesan 3-6 MB y superarían el límite de Supabase. Al redibujarla en un
 * canvas además se pierden los metadatos EXIF (incluida la ubicación GPS
 * donde se hizo la foto), que no queremos subir.
 */
export async function resizeImage(file: File, maxSide: number, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("not-an-image");
  }

  // createImageBitmap respeta la orientación de la cámara (from-image).
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode-failed"))), "image/jpeg", quality);
  });
}
