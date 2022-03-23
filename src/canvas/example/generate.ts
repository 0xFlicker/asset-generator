import { omit } from "ramda";
import type { IMetadata } from "../../types.js";
import { ILayer } from "../core";
import { mapWeightedValuesToRange, weightSampleFromWeights } from "../utils.js";
import {
  makeAccessoriesLayer,
  makeArmsLayer,
  makeBackgroundLayer,
  makeBaseLayer,
  makeSpecialOrHeadThingsLayer,
  makeOutlineLayer,
  makeTailLayer,
} from "./operations.js";
import { BaseColor } from "./types";
import * as weights from "./weights.js";
import { utils } from "ethers";

function chompLast256bits(inNum: number): number {
  return inNum % 256;
}

type IAttributeMetadata = Omit<IMetadata, "name" | "image" | "tokenId"> & {
  seed: string;
};

export default function (_seed: Uint8Array): {
  metadata: IAttributeMetadata;
  layers: ILayer[];
} {
  let seed = _seed;
  const seedChomper = (range: number) => {
    if (range != 255) {
      throw new Error(`Expected a range of 255 but got ${range}`);
    }
    const value = seed[0];
    seed = seed.slice(1);
    return value;
  };
  const backgroundColor = weightSampleFromWeights(
    weights.backgroundWeights,
    seedChomper
  );
  const baseColor = weightSampleFromWeights(weights.colorWeights, seedChomper);
  const split = weightSampleFromWeights(weights.splitWeights, seedChomper);
  let secondaryColor: BaseColor | undefined;
  if (split === "Split") {
    const secondaryColorWeights = mapWeightedValuesToRange(
      0,
      255,
      omit([baseColor], weights.colorWeights)
    );
    secondaryColor = weightSampleFromWeights(
      secondaryColorWeights,
      seedChomper
    );
  } else {
    // Eat the alt color
    seed = seed.slice(1);
  }
  const accessory = weightSampleFromWeights(
    weights.accessoryWeights,
    seedChomper
  );
  const accessoryColor = weightSampleFromWeights(
    weights.accessoryColorWeights,
    seedChomper
  );
  const tail = weightSampleFromWeights(weights.tailWeights, seedChomper);
  const arm = weightSampleFromWeights(weights.armWeights, seedChomper);
  const frills = weightSampleFromWeights(weights.frillWeights, seedChomper);
  const face = weightSampleFromWeights(weights.faceWeights, seedChomper);
  const mouth = weightSampleFromWeights(weights.mouthWeights, seedChomper);
  const head = weightSampleFromWeights(weights.headWeights, seedChomper);
  const special = weightSampleFromWeights(
    weights.specialFeatureWeights,
    seedChomper
  );

  const metadata: IAttributeMetadata = {
    seed: utils.hexlify(_seed),
    attributes: [
      {
        trait_type: "Background Color",
        value: backgroundColor,
      },
      {
        trait_type: "Base Color",
        value: baseColor,
      },
      {
        trait_type: "Split Color",
        value: split === "Split" && secondaryColor ? secondaryColor : "None",
      },
      {
        trait_type: "Accessory",
        value: accessory,
      },
      ...(accessory === "Hoodie"
        ? [
            {
              trait_type: "Accessory Color",
              value: accessoryColor,
            },
          ]
        : []),
      {
        trait_type: "Tail",
        value: tail,
      },
      {
        trait_type: "Arm",
        value: arm,
      },
      {
        trait_type: "Frills",
        value: frills,
      },
      {
        trait_type: "Face",
        value: face,
      },
      {
        trait_type: "Mouth",
        value: mouth,
      },
      {
        trait_type: "Head",
        value: head,
      },
    ],
  };

  return {
    metadata,
    layers: [
      makeBackgroundLayer({ color: backgroundColor }),
      makeBaseLayer({ color: baseColor, splitColor: secondaryColor }),
      ...makeAccessoriesLayer({
        accessoryType: accessory,
        color: accessoryColor,
      }),
      ...makeArmsLayer({
        armType: arm,
        color: baseColor,
        splitColor: secondaryColor,
      }),
      ...makeSpecialOrHeadThingsLayer({
        frillType: frills,
        faceType: face,
        mouthType: mouth,
        headType: head,
        specialType: special,
        color: baseColor,
        splitColor: secondaryColor,
      }),
      makeOutlineLayer(),
      ...makeTailLayer({
        color: baseColor,
        splitColor: secondaryColor,
        tailType: tail,
      }),
    ],
  };
}
