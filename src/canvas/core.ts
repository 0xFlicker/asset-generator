import { Canvas, CanvasRenderingContext2D } from "canvas";
import { getImage } from "./cache.js";

export interface ILayer {
  draw(ctx: CanvasRenderingContext2D): Promise<void>;
  zIndex: number;
}

export interface IGeneratable {
  generate(ctx: CanvasRenderingContext2D): void;
  layers: ILayer[];
}

export function cachedDrawImage(imgPath: string) {
  return async (ctx: CanvasRenderingContext2D) => {
    const img = await getImage(imgPath);
    ctx.drawImage(img, 0, 0);
  };
}

export function composeDrawOps(
  ...ops: ((ctx: CanvasRenderingContext2D) => Promise<void>)[]
) {
  return async (ctx: CanvasRenderingContext2D) => {
    for (const op of ops) {
      await op(ctx);
    }
  };
}

export function composeWithCanvas(
  ...ops: ((ctx: CanvasRenderingContext2D) => Promise<void>)[]
) {
  return async (ctx: CanvasRenderingContext2D) => {
    const canvas = new Canvas(ctx.canvas.width, ctx.canvas.height);
    const ctx2 = canvas.getContext("2d");
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    await composeDrawOps(...ops)(ctx2);
    ctx.drawImage(canvas, 0, 0);
  };
}

export async function renderCanvas(canvas: Canvas, layers: ILayer[]) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const layer of [...layers].sort((a, b) => a.zIndex - b.zIndex)) {
    await layer.draw(ctx);
  }
}
