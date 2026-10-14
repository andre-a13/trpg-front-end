const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_EDGE = 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode-failed"));
    image.src = source;
  });
}

export type ImageValidationError = "invalid-format" | "too-large" | "processing-failed";

export async function normalizeIllustration(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("invalid-format" satisfies ImageValidationError);
  if (file.size > MAX_FILE_SIZE) throw new Error("too-large" satisfies ImageValidationError);

  try {
    const source = await readAsDataUrl(file);
    const image = await loadImage(source);
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) throw new Error("processing-failed");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.8);
  } catch (error) {
    if (error instanceof Error && (error.message === "invalid-format" || error.message === "too-large")) throw error;
    throw new Error("processing-failed" satisfies ImageValidationError);
  }
}

