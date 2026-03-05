import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

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
const GENERATED_CONFIG_DIR = path.join(process.cwd(), "test", "fixtures");
let generatedConfigPath = "";

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

const linkedLibraryNetworkConfig = {
  deploy: [
    {
      fqn_contractName: "HelloWorld",
      args: { args: ["Hello from deploy!", 42] },
    },
    {
      fqn_contractName: "VersionMath",
    },
    {
      fqn_contractName: "ConfigShowcase",
      fqn_filePath: "contracts/ConfigShowcase.sol",
      fqn: "contracts/ConfigShowcase.sol:ConfigShowcase",
      args: {
        args: ["HelloWorld.address", "SIGNER[0]", "library deploy showcase", 1],
      },
      libraries: {
        VersionMath: "VersionMath.address",
      },
    },
  ],
  initialize: [
    {
      fqn_contractName: "ConfigShowcase",
      function: "initialize",
      args: {
        args: ["HelloWorld.address", "SIGNER[0]", "library initialized showcase", 2],
      },
    },
  ],
  verify: [],
};

async function readHelloWorldMetadata(): Promise<DeploymentMetadata> {
  const content = await fs.readFile(HELLO_WORLD_METADATA_PATH, "utf8");
  return JSON.parse(content) as DeploymentMetadata;
}

async function readDeploymentMetadata(
  contractName: string,
): Promise<DeploymentMetadata> {
  const metadataPath = path.join(DEPLOYMENTS_DIR, `${contractName}.json`);
  const content = await fs.readFile(metadataPath, "utf8");
  return JSON.parse(content) as DeploymentMetadata;
}

describe("hardhat-kitty plugin integration", function () {
  beforeEach(async function () {
    generatedConfigPath = path.join(
      GENERATED_CONFIG_DIR,
      `generated.${randomUUID()}.scriptsConfig.ts`,
    );
    await fs.rm(DEPLOYMENTS_DIR, { recursive: true, force: true });
    await fs.rm(generatedConfigPath, { force: true });
    delete process.env.KIT_CONFIG;
  });

  afterEach(async function () {
    await fs.rm(generatedConfigPath, { force: true });
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
    await fs.mkdir(path.dirname(generatedConfigPath), { recursive: true });
    await fs.writeFile(generatedConfigPath, configModuleSource, "utf8");
    process.env.KIT_CONFIG = generatedConfigPath;

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

  it("deploys contracts with linked libraries from scripts config", async function () {
    const connection = await network.connect();
    const runtimeNetworkName = (await connection.ethers.provider.getNetwork()).name;
    const configModuleSource = `const config = ${JSON.stringify(
      {
        networks: {
          localhost: linkedLibraryNetworkConfig,
          [runtimeNetworkName]: linkedLibraryNetworkConfig,
        },
      },
      null,
      2,
    )};\n\nexport default config;\n`;
    await fs.mkdir(path.dirname(generatedConfigPath), { recursive: true });
    await fs.writeFile(generatedConfigPath, configModuleSource, "utf8");
    process.env.KIT_CONFIG = generatedConfigPath;

    await tasks.getTask("kitty:deploy").run({});

    const configShowcaseMetadata = await readDeploymentMetadata("ConfigShowcase");
    const kitEthers = await kitUtils.initEthersConnection();
    const configShowcase = await kitEthers.getContractAt(
      "ConfigShowcase",
      configShowcaseMetadata.address,
    );

    // Constructor stores VersionMath.bump(1) so the first value is 2.
    assert.equal((await configShowcase.version()).toString(), "2");
    assert.equal(await configShowcase.label(), "library deploy showcase");

    await tasks.getTask("kitty:initialize").run({});

    // Initialize stores VersionMath.bump(2) so the updated value is 3.
    assert.equal((await configShowcase.version()).toString(), "3");
    assert.equal(await configShowcase.label(), "library initialized showcase");
  });
});
