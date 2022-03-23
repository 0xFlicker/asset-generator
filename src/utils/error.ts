import { Response } from "express";
import type { NextApiResponse } from "next";
export function defaultServerError(
  res: Response | NextApiResponse,
  error: any
) {
  console.error(error);
  return res.status(500).json(
    process.env.NODE_ENV === "production"
      ? { error: "Something went wrong" }
      : {
          error: error.message,
          stack: error.stack,
        }
  );
}

export function notFoundError(req: Response | NextApiResponse) {
  req.status(404).json({ error: "Not found" });
}
