import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";

import { network, tasks } from "hardhat";
import * as kitUtils from "../src/kit/internal/utils.js";

type DeploymentMetadata = {
  contractName: string;
  address: string;
};

const DEPLOYMENTS_DIR = path.join(process.cwd(), "deployments");
const HELLO_WORLD_METADATA_PATH = path.join(
  DEPLOYMENTS_DIR,
  "HelloWorld.json",
);
const GENERATED_CONFIG_PATH = path.join(
  process.cwd(),
  "test",
  "fixtures",
  "generated.scriptsConfig.ts",
);

const defaultNetworkConfig = {
  deploy: [
    {
      fqn_contractName: "HelloWorld",
      args: { args: ["Hello from deploy!", 42] },
    },
  ],
  initialize: [
    {
      fqn_contractName: "HelloWorld",
      function: "initialize",
      args: { args: ["Hello from initialize!", 99] },
    },
  ],
  verify: [],
};

async function readHelloWorldMetadata(): Promise<DeploymentMetadata> {
  const content = await fs.readFile(HELLO_WORLD_METADATA_PATH, "utf8");
  return JSON.parse(content) as DeploymentMetadata;
}

describe("hardhat-kitty plugin integration", function () {
  beforeEach(async function () {
    await fs.rm(DEPLOYMENTS_DIR, { recursive: true, force: true });
    await fs.rm(GENERATED_CONFIG_PATH, { force: true });
    delete process.env.KIT_CONFIG;
  });

  afterEach(async function () {
    await fs.rm(GENERATED_CONFIG_PATH, { force: true });
    delete process.env.KIT_CONFIG;
  });

  it("registers plugin tasks", async function () {
    assert.ok(tasks.getTask("kitty:deploy"));
    assert.ok(tasks.getTask("kitty:initialize"));
    assert.ok(tasks.getTask("kitty:verify"));
  });

  it("deploys and initializes contracts using default scripts config", async function () {
    const connection = await network.connect();
    const runtimeNetworkName = (await connection.ethers.provider.getNetwork()).name;
    const configModuleSource = `const config = ${JSON.stringify(
      {
        networks: {
          localhost: defaultNetworkConfig,
          [runtimeNetworkName]: defaultNetworkConfig,
        },
      },
      null,
      2,
    )};\n\nexport default config;\n`;
    await fs.mkdir(path.dirname(GENERATED_CONFIG_PATH), { recursive: true });
    await fs.writeFile(GENERATED_CONFIG_PATH, configModuleSource, "utf8");
    process.env.KIT_CONFIG = GENERATED_CONFIG_PATH;

    await tasks.getTask("kitty:deploy").run({});

    const metadata = await readHelloWorldMetadata();
    assert.equal(metadata.contractName, "HelloWorld");

    const kitEthers = await kitUtils.initEthersConnection();
    const helloWorld = await kitEthers.getContractAt(
      "HelloWorld",
      metadata.address,
    );
    assert.equal(await helloWorld.sayHello(), "Hello from deploy!");

    await tasks.getTask("kitty:initialize").run({});

    assert.equal(await helloWorld.sayHello(), "Hello from initialize!");
  });
});
