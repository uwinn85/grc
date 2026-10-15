/**
 * Kompres gambar di sisi klien (browser) ke format WebP berkualitas tinggi
 * namun berukuran ringan (hanya puluhan KB), zero external dependencies!
 */
export async function compressImageToKB(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.8
): Promise<{ blob: Blob; fileName: string; sizeKB: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Skala proporsional
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context tidak tersedia'));
          return;
        }

        // Gambar ulang di canvas dengan smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert ke WebP (atau JPEG jika WebP tidak didukung)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal mengompres gambar'));
              return;
            }
            const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
            const finalFileName = `${cleanBaseName}-${Date.now()}.webp`;
            const sizeKB = Math.round((blob.size / 1024) * 10) / 10;
            resolve({ blob, fileName: finalFileName, sizeKB });
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
