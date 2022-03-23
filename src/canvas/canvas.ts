import { Canvas } from "canvas";

export default function createCanvas(width: number, height: number): Canvas {
  return new Canvas(width, height);
}
