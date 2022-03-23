import { createFilter, FilterOperations, hexToVector3 } from "../filters.js";
import {
  cachedDrawImage,
  composeDrawOps,
  composeWithCanvas,
  ILayer,
} from "../core.js";
import { resolveProperties } from "../utils.js";
import {
  BackgroundColors,
  BaseColor,
  TailTypes,
  IFrillType,
  IFaceType,
  IHeadType,
  IArmType,
  IAccessoriesType,
  IMouthType,
  ISpecialType,
  HoodieColor,
} from "./types.js";
import {
  accentBlack,
  accentBrown,
  accentHoodieOrange,
  accentHoodiePurple,
  accentHoodieRed,
  accentLime,
  accentPeach,
  accentPink,
  accentRed,
  accentWhite,
  baseBlack,
  baseBrown,
  baseHoodieOrange,
  baseHoodiePurple,
  baseHoodieRed,
  baseLime,
  basePeach,
  basePink,
  baseRed,
  baseWhite,
  pureGreen,
} from "./colors.js";

type ApplyFilter = (o: FilterOperations) => unknown;
interface Colorizer {
  color: string;
  filter: ApplyFilter[];
}
const baseColorDetails: Colorizer[] = [
  {
    color: "Pink",
    filter: [(f) => f.chromaKey(pureGreen, basePink)],
  },
  {
    color: "Peach",
    filter: [(f) => f.chromaKey(pureGreen, basePeach)],
  },
  {
    color: "Brown",
    filter: [(f) => f.chromaKey(pureGreen, baseBrown)],
  },
  { color: "White", filter: [(f) => f.chromaKey(pureGreen, baseWhite)] },
  {
    color: "Lime",
    filter: [(f) => f.chromaKey(pureGreen, baseLime)],
  },
  { color: "Black", filter: [(f) => f.chromaKey(pureGreen, baseBlack)] },
  { color: "Red", filter: [(f) => f.chromaKey(pureGreen, baseRed)] },
];

const accentColorDetails: Colorizer[] = [
  {
    color: "Pink",
    filter: [(f) => f.chromaKey(pureGreen, accentPink)],
  },
  {
    color: "Peach",
    filter: [(f) => f.chromaKey(pureGreen, accentPeach)],
  },
  {
    color: "Brown",
    filter: [(f) => f.chromaKey(pureGreen, accentBrown)],
  },
  { color: "White", filter: [(f) => f.chromaKey(pureGreen, accentWhite)] },
  {
    color: "Lime",
    filter: [(f) => f.chromaKey(pureGreen, accentLime)],
  },
  { color: "Black", filter: [(f) => f.chromaKey(pureGreen, accentBlack)] },
  { color: "Red", filter: [(f) => f.chromaKey(pureGreen, accentRed)] },
];

const hoodieBaseDetails: Colorizer[] = [
  {
    color: "Red",
    filter: [(f) => f.chromaKey(pureGreen, baseHoodieRed)],
  },
  {
    color: "Purple",
    filter: [(f) => f.chromaKey(pureGreen, baseHoodiePurple)],
  },
  {
    color: "Orange",
    filter: [(f) => f.chromaKey(pureGreen, baseHoodieOrange)],
  },
];

const hoodieAccentDetails: Colorizer[] = [
  {
    color: "Red",
    filter: [(f) => f.chromaKey(pureGreen, accentHoodieRed)],
  },
  {
    color: "Purple",
    filter: [(f) => f.chromaKey(pureGreen, accentHoodiePurple)],
  },
  {
    color: "Orange",
    filter: [(f) => f.chromaKey(pureGreen, accentHoodieOrange)],
  },
];

function isSpecialColor(color: string) {
  return ["Diamond", "Gold"].includes(color);
}

interface IBackgroundLayer {
  color: BackgroundColors;
}

export function makeBackgroundLayer({ color }: IBackgroundLayer) {
  return {
    draw: cachedDrawImage(resolveProperties(`${color}.PNG`)),
    zIndex: -Infinity,
  };
}

interface ISplitLayer<
  PrimaryColor extends string,
  SecondaryColor extends string
> {
  baseColor: PrimaryColor;
  baseColorBasePath: string;
  secondaryColor?: SecondaryColor;
  secondaryColorBasePath: string;
  zIndex: number;
}

function applyColorFilters(colorDetails: Colorizer[], color: string) {
  const ops: ILayer["draw"][] = [];
  const filters = colorDetails.find((c) => c.color === color)?.filter;
  if (filters) {
    ops.push(
      ...filters.map((filterOp) => {
        const [ops, filter] = createFilter();
        filterOp(filter);
        return ops();
      })
    );
  }
  return ops;
}

function makeLegacySplitColorGenerator<
  PrimaryColor extends string,
  SecondaryColor extends string
>({
  zIndex,
  baseColor,
  secondaryColor,
  baseColorBasePath,
  secondaryColorBasePath,
}: ISplitLayer<PrimaryColor, SecondaryColor>) {
  let drawOp: ILayer["draw"];

  if (secondaryColor) {
    drawOp = composeDrawOps(
      cachedDrawImage(
        resolveProperties(`${baseColorBasePath}/${baseColor}.PNG`)
      ),
      cachedDrawImage(
        resolveProperties(`${secondaryColorBasePath}/${secondaryColor}.PNG`)
      )
    );
  } else {
    drawOp = cachedDrawImage(
      resolveProperties(`${baseColorBasePath}/${baseColor}.PNG`)
    );
  }

  return {
    draw: drawOp,
    zIndex,
  };
}

function makeSplitColorGenerator<
  PrimaryColor extends string,
  SecondaryColor extends string
>({
  zIndex,
  baseColor,
  secondaryColor,
  baseColorBasePath,
  secondaryColorBasePath,
}: ISplitLayer<PrimaryColor, SecondaryColor>) {
  let drawOp: ILayer["draw"];

  function applyColor(
    colorDetails: Colorizer[],
    color: string,
    basePath: string,
    baseColorPath: string
  ) {
    const isSpecialColor = ["Diamond", "Gold"].includes(color);
    const ops = [
      cachedDrawImage(
        resolveProperties(
          `${basePath}/${isSpecialColor ? color : baseColorPath}.PNG`
        )
      ),
    ];
    if (!isSpecialColor) {
      ops.push(...applyColorFilters(colorDetails, color));
    }
    return ops;
  }

  const baseColorOps = applyColor(
    baseColorDetails,
    baseColor,
    baseColorBasePath,
    "BaseColor"
  );
  const secondaryColorOps = secondaryColor
    ? applyColor(
        accentColorDetails,
        secondaryColor,
        secondaryColorBasePath,
        "SplitColor"
      )
    : [];

  drawOp = composeWithCanvas(...baseColorOps, ...secondaryColorOps);

  return {
    draw: drawOp,
    zIndex,
  };
}

function makeConditionalColorGenerator<
  PrimaryColor extends string,
  SecondaryColor extends string
>({
  zIndex,
  baseColor,
  secondaryColor,
  baseColorBasePath,
  secondaryColorBasePath,
}: ISplitLayer<PrimaryColor, SecondaryColor>) {
  let drawOp: ILayer["draw"];

  if (secondaryColor) {
    drawOp = cachedDrawImage(
      resolveProperties(`${secondaryColorBasePath}/${secondaryColor}.PNG`)
    );
  } else {
    drawOp = cachedDrawImage(
      resolveProperties(`${baseColorBasePath}/${baseColor}.PNG`)
    );
  }

  return {
    draw: drawOp,
    zIndex,
  };
}

interface IBaseLayer {
  color: BaseColor;
  splitColor?: BaseColor;
}

export function makeBaseLayer({ color, splitColor }: IBaseLayer) {
  return makeSplitColorGenerator({
    zIndex: -100000,
    baseColor: color,
    secondaryColor: splitColor,
    baseColorBasePath: "BaseColor",
    secondaryColorBasePath: "SplitColor",
  });
}

interface ITailLayer extends IBaseLayer {
  tailType: TailTypes;
}

export function makeTailLayer({ color, splitColor, tailType }: ITailLayer) {
  return [
    makeConditionalColorGenerator({
      zIndex: -1000,
      baseColor: color,
      secondaryColor: splitColor,
      baseColorBasePath: `Tails/${tailType}-Colors`,
      secondaryColorBasePath: `Tails/${tailType}-Colors`,
    }),
    {
      draw: cachedDrawImage(resolveProperties(`Tails/${tailType}.PNG`)),
      zIndex: -500,
    },
  ];
}

export function makeOutlineLayer() {
  return {
    draw: cachedDrawImage(resolveProperties("Base/Base.PNG")),
    zIndex: 1700,
  };
}

interface IEarsLayer extends IBaseLayer {
  frillType: IFrillType;
}
interface IMouthLayer {
  mouthType: IMouthType;
}
interface IFaceLayer {
  faceType: IFaceType;
}
interface IHeadLayer {
  headType: IHeadType;
  color: BaseColor;
  splitColor?: BaseColor;
}
type ISpecialLayer = {
  specialType: ISpecialType;
} & IEarsLayer &
  IMouthLayer &
  IFaceLayer &
  IHeadLayer;
export function makeSpecialOrHeadThingsLayer({
  color,
  faceType,
  frillType,
  mouthType,
  headType,
  specialType,
  splitColor,
}: ISpecialLayer) {
  if (specialType === "None") {
    return [
      ...makeEarsLayer({
        color,
        frillType,
        splitColor,
      }),
      makeMouthLayer({
        mouthType,
      }),
      makeEyeLayer({
        faceType,
      }),
      makeHeadLayer({
        color,
        splitColor,
        headType,
      }),
    ];
  }
  if (specialType === "TV Head") {
    return [
      {
        draw: cachedDrawImage(resolveProperties(`Special/${specialType}.PNG`)),
        zIndex: 1000000000,
      },
    ];
  }
  return [
    {
      draw: cachedDrawImage(resolveProperties(`Special/${specialType}.PNG`)),
      zIndex: 1000000000,
    },
    ...makeEarsLayer({
      color,
      frillType,
      splitColor,
    }),
  ];
}

function makeEarsLayer({ color, splitColor, frillType }: IEarsLayer) {
  const ops: ILayer["draw"][] = [];
  if (isSpecialColor(color)) {
    ops.push(
      cachedDrawImage(
        resolveProperties(`Ears/${frillType}-Colors/Base/${color}.PNG`)
      )
    );
  } else {
    const colorFilters = applyColorFilters(baseColorDetails, color);
    ops.push(
      composeWithCanvas(
        cachedDrawImage(
          resolveProperties(`Ears/${frillType}-Colors/${frillType}-Base.PNG`)
        ),
        ...colorFilters
      ),
      composeWithCanvas(
        cachedDrawImage(
          resolveProperties(`Ears/${frillType}-Colors/${frillType}-Accent.PNG`)
        ),
        ...colorFilters
      )
    );
  }
  if (splitColor) {
    if (isSpecialColor(splitColor)) {
      ops.push(
        cachedDrawImage(
          resolveProperties(`Ears/${frillType}-Colors/Base/${splitColor}.PNG`)
        )
      );
    } else {
      const colorFilters = applyColorFilters(accentColorDetails, splitColor);
      ops.push(
        composeWithCanvas(
          cachedDrawImage(
            resolveProperties(
              `Ears/${frillType}-Colors/${frillType}-Base-Split.PNG`
            )
          ),
          ...colorFilters
        ),
        composeWithCanvas(
          cachedDrawImage(
            resolveProperties(
              `Ears/${frillType}-Colors/${frillType}-Accent-Split.PNG`
            )
          ),
          ...colorFilters
        )
      );
    }
  }
  ops.push(cachedDrawImage(resolveProperties(`Ears/${frillType}.PNG`)));
  return [
    {
      draw: composeWithCanvas(...ops),
      zIndex: 1500,
    },
  ];
}

function makeMouthLayer({ mouthType }: IMouthLayer) {
  return {
    draw: cachedDrawImage(resolveProperties(`Mouths/${mouthType}.PNG`)),
    zIndex: 10000010,
  };
}

function makeEyeLayer({ faceType }: IFaceLayer) {
  return {
    draw: cachedDrawImage(resolveProperties(`Eyes/${faceType}.PNG`)),
    zIndex: 10000000,
  };
}

function makeHeadLayer({ headType, color, splitColor }: IHeadLayer) {
  let drawOp: ILayer["draw"];

  if (["Side", "Tuft"].includes(headType)) {
    drawOp = composeDrawOps(
      cachedDrawImage(
        resolveProperties(`Head/${headType}-Color/${splitColor || color}.PNG`)
      ),
      cachedDrawImage(resolveProperties(`Head/${headType}.PNG`))
    );
  } else {
    drawOp = cachedDrawImage(resolveProperties(`Head/${headType}.PNG`));
  }

  return {
    draw: drawOp,
    zIndex: 10000005,
  };
}

interface IArmsLayer {
  armType: IArmType;
  color: BaseColor;
  splitColor?: BaseColor;
}
export function makeArmsLayer({ armType, color, splitColor }: IArmsLayer) {
  return [
    {
      draw: cachedDrawImage(resolveProperties(`Arms/${armType}.PNG`)),
      zIndex: 1000105,
    },
    makeLegacySplitColorGenerator({
      zIndex: 1000100,
      baseColor: color,
      secondaryColor: splitColor,
      baseColorBasePath: `Arms/${armType}-Colors/Base`,
      secondaryColorBasePath: `Arms/${armType}-Colors/Split`,
    }),
  ];
}
interface IAccessoriesLayer {
  accessoryType: IAccessoriesType;
  color: HoodieColor;
}
export function makeAccessoriesLayer({
  accessoryType,
  color,
}: IAccessoriesLayer) {
  const ops: ILayer[] = [];
  if (accessoryType === "Flamingo") {
    ops.push({
      draw: cachedDrawImage(
        resolveProperties(`Accessories/${accessoryType}B.PNG`)
      ),
      zIndex: 50000,
    });
    ops.push({
      draw: cachedDrawImage(
        resolveProperties(`Accessories/${accessoryType}T.PNG`)
      ),
      zIndex: 1000000,
    });
  } else if (accessoryType === "Hoodie") {
    ops.push({
      draw: composeWithCanvas(
        cachedDrawImage(resolveProperties(`Accessories/HoodieBase.PNG`)),
        ...applyColorFilters(hoodieBaseDetails, color)
      ),
      zIndex: 1000000,
    });
    ops.push({
      draw: composeWithCanvas(
        cachedDrawImage(resolveProperties(`Accessories/HoodieLine.PNG`))
      ),
      zIndex: 1000030,
    });
    ops.push({
      draw: composeWithCanvas(
        cachedDrawImage(resolveProperties(`Accessories/SleevesColor.PNG`)),
        ...applyColorFilters(hoodieBaseDetails, color)
      ),
      zIndex: 1000500,
    });
    ops.push({
      draw: composeWithCanvas(
        cachedDrawImage(resolveProperties(`Accessories/HoodieAccent.PNG`)),
        ...applyColorFilters(hoodieAccentDetails, color)
      ),
      zIndex: 1000020,
    });
    ops.push({
      draw: composeWithCanvas(
        cachedDrawImage(resolveProperties(`Accessories/SleevesLine.PNG`))
      ),
      zIndex: 1000530,
    });
  } else {
    ops.push({
      draw: cachedDrawImage(
        resolveProperties(`Accessories/${accessoryType}.PNG`)
      ),
      zIndex: 1000000,
    });
  }
  return ops;
}
