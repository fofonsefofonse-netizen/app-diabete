const MAX_DIMENSION = 1024;
const JPEG_QUALITY  = 0.85;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

export async function compressImage(base64: string): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ data: base64, mimeType: 'image/jpeg' }); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ data: canvas.toDataURL('image/jpeg', JPEG_QUALITY), mimeType: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error("Impossible de charger l'image"));
    img.src = base64;
  });
}
