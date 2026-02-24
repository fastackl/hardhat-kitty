import { tasks } from "hardhat";
import {
  BaseContract,
  ContractTransactionResponse,
  Network,
  Signer,
} from "ethers";
import { promises as fs } from "fs";
import * as utils from "../internal/utils.js";
import "colors";

import * as types from "../internal/types.js";

import { loadScriptsConfig } from "./configLoader.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ethers: any;
let PRINT: boolean;
let NETWORK: Network;
let SIGNER: Signer;
let ETHERNAL: boolean;
let scriptsConfig: types.Config | undefined;

async function initEthers(networkName?: string): Promise<void> {
  if (!ethers) {
    ethers = await utils.initEthersConnection(networkName);
  }
}

const DEPLOY: keyof types.NetworkConfig = "deploy";
const PREVIEWHEADERS: string[] = [
  "Contract".cyan,
  "Constr Args".cyan,
  "Libs".cyan,
];
const PREVIEWCOLWIDTHS: number[] = [20, 40, 40];
const POSTHEADERS: string[] = [
  "Contract".cyan,
  "Address".cyan,
  "Response".cyan,
];
const POSTCOLWIDTHS: number[] = [20, 40, 40];
const PREVIEWMSG: string = "\n\n\nDeployment preview:";
const POSTMSG: string = "Deployment results:";
const COMPLETIONMSG: string = "Deployment complete.";
const TRUNCATELENGTH: number = 377;
const DEPLOYEDCONTRACTINSTANCES: types.DeployedContractInstances = {};
const deployedContractMetadata: types.DeployedContractMetadata = {};

async function archiveArtifacts() {
  const scriptPaths = utils.getScriptPaths();
  const triggerArchive = await utils.directoryExistsAndHasFiles(
    scriptPaths.deployments,
  );
  if (triggerArchive) {
    await utils.archive();
  }
}

/** For use in utils.handleTransactionResponse() */
async function createDeploymentResultRows(
  config: types.ConfigInputStrict,
  logMessages: string[],
  result?: types.TransactionResult,
): Promise<types.ResultRows> {
  if (types.isDeployConfigStrict(config)) {
    const truncTx = result?.tx
      ? JSON.stringify(result?.tx).substring(0, TRUNCATELENGTH)
      : "";
    const successArray: string[][] = [
      [
        "  " + config.fqn_contractName,
        "  " + result?.metadata?.address.toString(),
        `  ${truncTx}`.green,
      ],
    ];
    const errorArray: string[][] = [
      [
        "  " + config.fqn_contractName,
        "",
        "  " + result?.error?.red + " " + logMessages.join(" ").red,
      ],
    ];
    const resultRows = {
      success: successArray,
      error: errorArray,
    };
    return resultRows;
  } else {
    throw new Error(`Unsupported config type: ${config}`);
  }
}

async function deploySingleContract(
  config: types.ConfigInputStrict,
): Promise<types.TransactionResult> {
  if (types.isDeployConfigStrict(config)) {
    if (!config.fqn) {
      const errorMsg = "deploy01: fqn is undefined for config";
      console.log(`deploy02: ${errorMsg}`);
      return {
        contractName: config.fqn_contractName,
        error: errorMsg,
        metadata: undefined,
      };
    }

    try {
      const deployment = await prepareAndDeployContract(config);
      const tx = deployment.contract.deploymentTransaction();
      const metadata = await saveDeploymentData(
        config,
        deployment.contract,
        NETWORK,
        tx,
      );

      return {
        contractName: config.fqn_contractName,
        metadata: metadata[
          config.fqn_contractName
        ] as types.SingleDeploymentMetadata,
        tx: tx as ContractTransactionResponse,
      };
    } catch (err) {
      const errorMsg = `deploy03: Error deploying contract: ${
        err instanceof Error ? err.message : err
      }`;
      console.log(errorMsg);
      return {
        contractName: config.fqn_contractName,
        error: errorMsg,
      };
    }
  } else {
    throw new Error(`Unsupported config type: ${config}`);
  }
}

async function deployPreProcessing(): Promise<types.DeployConfigStrict[]> {
  if (!scriptsConfig) {
    throw new Error("deploy05: scripts config not loaded");
  }
  NETWORK = await ethers.provider.getNetwork();
  const networkName = await utils.getNetworkName(NETWORK);

  let strictDeployConfig = (await utils.convertActionArrayToStrict(
    scriptsConfig.networks[networkName],
    DEPLOY,
  )) as types.DeployConfigStrict[];

  await tasks.getTask("build").run({});

  strictDeployConfig = await utils.handleDeployArgsNamesAndSigs(
    strictDeployConfig,
  );

  return strictDeployConfig;
}

async function prepareAndDeployContract(
  config: types.DeployConfigStrict,
): Promise<{ contract: BaseContract }> {
  const strictDeployConfig = (await utils.replaceDotAddressReferences(
    config,
    deployedContractMetadata,
  )) as types.DeployConfigStrict;
  const ContractFactory = await ethers.getContractFactory(config.fqn!, {
    libraries: strictDeployConfig.libraries,
  });
  const contract = await ContractFactory.connect(SIGNER)
    .deploy(...strictDeployConfig.args.args)
    .then((deployed: BaseContract) => deployed.waitForDeployment());

  if (ETHERNAL) {
    try {
      await utils.pushToEthernal(
        strictDeployConfig.fqn_contractName,
        await contract.getAddress(),
        contract.interface.formatJson(),
      );
    } catch (error) {
      console.error(error);
    }
  }

  DEPLOYEDCONTRACTINSTANCES[config.fqn_contractName] = contract;
  return { contract };
}

async function saveDeploymentData(
  deployConfig: types.DeployConfigStrict,
  contract: BaseContract,
  network: Network,
  tx: ContractTransactionResponse | null,
): Promise<types.DeployedContractMetadata> {
  const scriptPaths = utils.getScriptPaths();
  await utils.createDirIfENOENT(scriptPaths.deployments);
  const deploymentData: types.SingleDeploymentMetadata = {
    contractName: deployConfig.fqn_contractName,
    sourcePath: deployConfig.fqn_filePath,
    args: deployConfig.args,
    libraries: deployConfig.libraries,
    abi: contract.interface.formatJson(),
    buildTime: new Date().toISOString(),
    network: network.name,
    txHash: tx ? tx.hash : "",
    address: await contract.getAddress(),
  };
  const deploymentDataString = JSON.stringify(deploymentData);
  try {
    await fs.writeFile(
      `${scriptPaths.deployments}/${deployConfig.fqn_contractName}.json`,
      deploymentDataString,
    );
  } catch (error) {
    console.error(`deploy03: ${(error as Error).message}`);
  }

  deployedContractMetadata[deployConfig.fqn_contractName] = deploymentData;
  return deployedContractMetadata;
}

export type DeployOptions = {
  configPath?: string;
  printTable?: boolean;
  signerIndex?: number;
  ethernal?: boolean;
  networkName?: string;
};

export async function deploy(options: DeployOptions = {}) {
  const {
    configPath,
    printTable = false,
    signerIndex = 0,
    ethernal = false,
    networkName = process.env.HARDHAT_NETWORK || undefined,
  } = options;

  scriptsConfig = await loadScriptsConfig(configPath);
  await initEthers(networkName);
  PRINT = printTable || process.env.PRINT === "true";
  SIGNER = (await ethers.getSigners())[
    Number(signerIndex || process.env.SIGNERINDEX || "0")
  ];
  ETHERNAL = ethernal || process.env.ETHERNAL === "true";
  console.log("Hardhat auto-compile (not optional) . . .");

  await archiveArtifacts();

  let strictDeployConfig = await deployPreProcessing();

  await utils.setupPreviewTable(
    PRINT,
    strictDeployConfig,
    PREVIEWMSG,
    PREVIEWCOLWIDTHS,
    PREVIEWHEADERS,
  );

  let postDeployStream = (await utils.setupStreamTable(
    PRINT,
    POSTCOLWIDTHS,
    POSTHEADERS,
    POSTMSG,
  )) as utils.CustomStream;

  await utils.executeAndProcessResults(
    strictDeployConfig,
    deploySingleContract,
    postDeployStream,
    PRINT,
    createDeploymentResultRows,
  );

  await utils.completionMsg(PRINT, COMPLETIONMSG);

  return DEPLOYEDCONTRACTINSTANCES;
}

/** Leaner version of deployment for testing at speed */
export async function testDeploy(
  signerIndex: number = 0,
  ethernal: boolean = false,
  configPath?: string,
) {
  scriptsConfig = await loadScriptsConfig(configPath);
  await initEthers();
  SIGNER = (await ethers.getSigners())[
    Number(signerIndex || process.env.SIGNERINDEX || "0")
  ];
  ETHERNAL = ethernal || process.env.ETHERNAL === "true";
  let strictDeployConfig = await deployPreProcessing();

  await utils.executeAndProcessResults(
    strictDeployConfig,
    deploySingleContract,
  );

  return DEPLOYEDCONTRACTINSTANCES;
}

export async function runDeployScript() {
  await deploy();
}
