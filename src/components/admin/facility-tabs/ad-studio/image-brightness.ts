/**
 * Samples the bottom portion of an image (where text overlays go)
 * and returns whether it's dark or light.
 *
 * Returns: { isDark: boolean, avgLuminance: number }
 *
 * Usage: const { isDark } = await getImageBrightness(imageUrl)
 *   - isDark true  → use white pill with dark text
 *   - isDark false → use dark pill with white text
 */
export async function getImageBrightness(
  imageUrl: string,
  sampleRegion: "bottom" | "full" = "bottom"
): Promise<{ isDark: boolean; avgLuminance: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 100; // sample at low res for speed
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ isDark: true, avgLuminance: 0.3 });
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);

      // Sample the bottom 30% of the image (where text overlays sit)
      const startY = sampleRegion === "bottom" ? Math.floor(size * 0.7) : 0;
      const sampleHeight = sampleRegion === "bottom" ? size - startY : size;

      const imageData = ctx.getImageData(0, startY, size, sampleHeight);
      const pixels = imageData.data;

      let totalLuminance = 0;
      const pixelCount = pixels.length / 4;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        // Relative luminance formula
        totalLuminance += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }

      const avgLuminance = totalLuminance / pixelCount;

      // Below 0.45 = dark image, above = light image
      resolve({ isDark: avgLuminance < 0.45, avgLuminance });
    };

    img.onerror = () => {
      // Default to dark pill (safe fallback)
      resolve({ isDark: true, avgLuminance: 0.3 });
    };

    img.src = imageUrl;
  });
}
