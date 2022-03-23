import type { RequestHandler, Response } from "express";
import type { NextApiResponse } from "next";
import { Canvas } from "canvas";
import { utils } from "ethers";
import {
  generateAxolotlValleyFromSeed,
  renderCanvas,
} from "@creaturenft/assets";
import type { ChildCreatureERC721 } from "@creaturenft/contracts";
import { defaultServerError, notFoundError } from "../utils/error.js";

export async function handleImage(
  tokenId: string,
  childContract: ChildCreatureERC721,
  res: Response | NextApiResponse
) {
  try {
    // TODO: check if tokenId is a valid tokenId
    // TODO: put behind a cache
    const tokenCount = await childContract.tokenCount();
    if (tokenCount.lt(tokenId)) {
      return notFoundError(res);
    }
    const seed = await childContract.seed(tokenId);

    // TODO: Check if image exists in bucket and return it
    // From seed, generate layers
    const { layers } = generateAxolotlValleyFromSeed(utils.arrayify(seed));

    // Render canvas
    const canvas = new Canvas(569, 569);
    await renderCanvas(canvas, layers);
    res.setHeader("Content-Type", "image/png");

    // Send image as buffer
    res.status(200).send(canvas.toBuffer());
  } catch (err: any) {
    defaultServerError(res, err);
  }
}

export function createGetImageHandler(childContract: ChildCreatureERC721) {
  const getMetadata: RequestHandler<{ id: string }> = async (req, res) => {
    const { id: tokenId } = req.params;
    return await handleImage(tokenId, childContract, res);
  };

  return getMetadata;
}
