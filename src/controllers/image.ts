import AWS from "aws-sdk";
import { Canvas } from "canvas";
import {
  generateAxolotlValleyFromSeed,
  renderCanvas,
} from "@creaturenft/assets";
import { ChildCreatureERC721__factory } from "@creaturenft/contracts";
import { defaultProvider, networkStringToNetworkType } from "@creaturenft/web3";
import { utils } from "ethers";

const network = networkStringToNetworkType(process.env.NETWORK);
const provider = defaultProvider(network);

const creatureContract = ChildCreatureERC721__factory.connect(
  process.env.CHILD_CREATURE_ERC721_ADDRESS,
  provider
);
const s3 = new AWS.S3();

/**
 *
 * @param key {string}
 * @returns {Promise<boolean>}
 */
async function s3Exists(key) {
  const params = {
    Bucket: process.env.ASSET_BUCKET,
    Key: key,
  };
  try {
    const data = await s3.headObject(params).promise();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 *
 * @param key {string}
 * @param imageData {Buffer}
 * @returns {Promise<void>}
 */
async function s3WriteObject(key, imageData) {
  const params = {
    Bucket: process.env.ASSET_BUCKET,
    Key: key,
    Body: imageData,
    ACL: "public-read",
    ContentDisposition: "inline",
    ContentType: "image/png",
  };
  await s3.putObject(params).promise();
}

// Handler
export async function handler(event, context) {
  const {
    pathParameters: { tokenId: tokenIdStr },
    requestContext: { stage },
  } = event;
  const tokenId = parseInt(tokenIdStr);
  if (!Number.isInteger(tokenId)) {
    return {
      statusCode: 400,
      body: "Token ID must be an integer",
    };
  }
  if (tokenId < 0) {
    return {
      statusCode: 400,
      body: "Token ID must be greater than 0",
    };
  }

  const tokenCount = await creatureContract.tokenCount();
  if (tokenCount.lt(tokenId)) {
    return {
      statusCode: 400,
      body: `Token ID must be less than ${tokenCount.toString()}`,
    };
  }
  const seed = await creatureContract.seed(tokenId);

  const exists = await s3Exists(`${stage}/image/${seed}.png`);

  if (!exists) {
    // From seed, generate layers
    const { layers } = generateAxolotlValleyFromSeed(utils.arrayify(seed));

    // Render canvas
    const canvas = new Canvas(569, 569);
    await renderCanvas(canvas, layers);

    // Save canvas to S3
    const imageData = canvas.toBuffer();
    await s3WriteObject(`${stage}/image/${seed}.png`, imageData);
  }

  return {
    statusCode: 301,
    headers: {
      Location: `${process.env.ASSET_URL}/${stage}/image/${seed}.png`,
    },
  };
}
