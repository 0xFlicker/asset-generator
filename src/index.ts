import fs from "fs";
import { Command, InvalidArgumentError } from "commander";
import { utils } from "ethers";
import cliProgress from "cli-progress";
import operations from "./canvas/example/generate.js";
import createCanvas from "./canvas/canvas.js";
import { renderCanvas } from "./canvas/core.js";

const program = new Command();

function randomUint8ArrayOfLength(length: number) {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

program.version("0.0.1");

program
  .command("one")
  .option("-s, --seed <seed>", "Seed for random number generation")
  .action(async ({ seed }) => {
    const canvas = createCanvas(569, 569);

    let seedBytes: Uint8Array;
    if (seed) {
      seedBytes = utils.arrayify(seed);
    } else {
      seedBytes = randomUint8ArrayOfLength(32);
    }
    const { metadata, layers } = operations(seedBytes);
    await renderCanvas(canvas, layers);

    // Save canvas image to file
    const outPath = "./out.png";
    const outData = canvas.toBuffer("image/png");
    fs.promises.writeFile(outPath, outData);
    fs.promises.writeFile("out.json", JSON.stringify(metadata, null, 2));
    console.log(metadata.seed);
  });

function parseIntArg(value: string) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError("Not a number.");
  }
  return parsedValue;
}

program
  .command("generate")
  .option("-n, --name <name>", "Name of collection", "Test")
  .option("-c, --count <number>", "Number of NFTs to generate", parseIntArg, 5)
  .option(
    "-n, --no-clean",
    "Don't clean the generated directory before generating",
    false
  )
  .action(async ({ count, noClean, name }) => {
    const bar = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic
    );
    bar.start(count, 0);
    const canvas = createCanvas(569, 569);
    if (!noClean) {
      await fs.promises.rm("./generated/images", { recursive: true });
      await fs.promises.rm("./generated/metadata", { recursive: true });
    }
    await fs.promises.mkdir("./generated/images", { recursive: true });
    await fs.promises.mkdir("./generated/metadata", { recursive: true });
    for (let i = 0; i < count; i++) {
      const seedBytes: Uint8Array = randomUint8ArrayOfLength(32);
      const { metadata, layers } = operations(seedBytes);
      await renderCanvas(canvas, layers);
      const outData = canvas.toBuffer("image/png");

      fs.promises.writeFile(`./generated/images/${i}.png`, outData);
      fs.promises.writeFile(
        `./generated/metadata/${i}`,
        JSON.stringify(
          {
            ...metadata,
            image: `${i}.png`,
            name: `${name} #${i}`,
          },
          null,
          2
        )
      );
      bar.increment();
    }
    bar.stop();
  });

program.parse(process.argv);
