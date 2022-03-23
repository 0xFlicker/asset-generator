import type { RequestHandler, Response } from "express";
import type { NextApiResponse } from "next";
import { utils } from "ethers";
import { generateAxolotlValleyFromSeed } from "@creaturenft/assets";
import { ChildCreatureERC721 } from "@creaturenft/contracts";
import { defaultServerError, notFoundError } from "../utils/error.js";

export async function handleMetadata(
  tokenId: string,
  baseURL: string,
  childContract: ChildCreatureERC721,
  res: Response | NextApiResponse
) {
  try {
    // TODO: check if tokenId is a valid tokenId
    const tokenCount = await childContract.tokenCount();
    if (tokenCount.lt(tokenId)) {
      return notFoundError(res);
    }
    // TODO: put behind a cache
    const seed = await childContract.seed(tokenId);

    // TODO: Check if image exists in bucket and return it
    // From seed, generate metadata
    const { metadata } = generateAxolotlValleyFromSeed(utils.arrayify(seed));
    res.status(200).json({
      ...metadata,
      token_id: tokenId,
      name: `#${tokenId}`,
      image: `${baseURL}${tokenId}`,
    });
  } catch (err: any) {
    defaultServerError(res, err);
  }
}

export function createGetMetadataHandler(
  baseURL: string,
  childContract: ChildCreatureERC721
) {
  const getMetadata: RequestHandler<{ id: string }> = async (req, res) => {
    const { id: tokenId } = req.params;
    return await handleMetadata(tokenId, baseURL, childContract, res);
  };
  return getMetadata;
}
