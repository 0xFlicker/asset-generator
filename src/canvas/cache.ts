import fs from "fs";
import canvas from "canvas";

const imageBufferCache = new Map<string, canvas.Image>();

export async function getImage(imgPath: string): Promise<canvas.Image> {
  if (imageBufferCache.has(imgPath)) {
    return imageBufferCache.get(imgPath) as canvas.Image;
  }

  const imgData = await fs.promises.readFile(imgPath);
  const img = new canvas.Image();
  img.src = imgData;
  imageBufferCache.set(imgPath, img);
  return img;
}
