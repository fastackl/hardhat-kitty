import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import * as utils from "../internal/utils.js";
import "colors";
import * as types from "../internal/types.js";
import { loadScriptsConfig } from "./configLoader.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ethers: any;
let PRINT: boolean;
let scriptsConfig: types.Config | undefined;
let DEPLOYEDCONTRACTMETADATA: types.DeployedContractMetadata = {};
const VERIFY: keyof types.NetworkConfig = "verify";

const PREVIEWHEADERS: string[] = [
  "Contract".cyan,
  "Constr Args".cyan,
  "Libs".cyan,
];
const PREVIEWCOLWIDTHS: number[] = [20, 40, 40];
const POSTHEADERS: string[] = [
  "Contract".cyan,
  "Constr Args".cyan,
  "Libs".cyan,
  "Response".cyan,
];
const POSTCOLWIDTHS: number[] = [15, 15, 35, 35];
const PREVIEWMSG: string = "\n\n\nVerification preview:";
const POSTMSG: string = "Verification results:";
const COMPLETIONMSG: string = "Verification complete.";
const TRUNCATELENGTH: number = 377;

async function initEthers(networkName?: string): Promise<void> {
  if (!ethers) {
    ethers = await utils.initEthersConnection(networkName);
  }
}

async function createVerificationResponseRows(
  config: types.ConfigInputStrict,
  logMessages: string[],
  result?: types.TransactionResult,
): Promise<types.ResultRows> {
  if (types.isVerifyConfigStrict(config)) {
    const truncatedMessages = (
      JSON.stringify(logMessages) + `result: + ${JSON.stringify(result)}`
    ).substring(0, TRUNCATELENGTH);
    const successArray = [
      ["  " + config.fqn_contractName + ` (${config.address})`.gray],
      utils.formatArgString(config),
      utils.formatLibString(config),
      [` ${truncatedMessages}`.green],
    ];
    const errorArray = [
      ["  " + config.fqn_contractName + ` (${config.address})`.gray],
      utils.formatArgString(config),
      utils.formatLibString(config),
      [` ${truncatedMessages}`.red],
    ];
    const resultRows = {
      success: utils.spreadArray(successArray),
      error: utils.spreadArray(errorArray),
    };
    return resultRows;
  } else {
    throw new Error(
      `verify01: Invalid config object: ${JSON.stringify(config)}`,
    );
  }
}

async function etherscanVerify(
  config: types.ConfigInputStrict,
  metadata?: types.SingleDeploymentMetadata,
): Promise<void> {
  if (types.isVerifyConfigStrict(config)) {
    if (!metadata) {
      throw new Error(
        `verify02: Metadata not found for contract ${config.fqn_contractName}`,
      );
    }
    const contractName = config.fqn_contractName;
    await verifyContract(
      {
        address: metadata.address.toString(),
        contract: `${metadata.sourcePath}:${contractName}`,
        constructorArgs: metadata.args.args as unknown[],
        libraries: metadata.libraries as Record<string, string>,
      },
      hre,
    );
  } else {
    throw new Error(
      `verify01: Invalid config object: ${JSON.stringify(config)}`,
    );
  }
}

async function verifyPreProcessing(): Promise<types.VerifyConfigStrict[]> {
  if (!scriptsConfig) {
    throw new Error("verify03: scripts config not loaded");
  }
  const providerNetwork = await ethers.provider.getNetwork();
  const networkName = await utils.getNetworkName(providerNetwork);

  const verifyConfig = (await utils.convertActionArrayToStrict(
    scriptsConfig.networks[networkName],
    VERIFY,
  )) as types.VerifyConfigStrict[];
  DEPLOYEDCONTRACTMETADATA = await utils.loadDeployedContractMetadata();
  return verifyConfig;
}

export type VerifyOptions = {
  configPath?: string;
  printTable?: boolean;
  networkName?: string;
};

export async function verify(options: VerifyOptions = {}) {
  const {
    configPath,
    printTable = false,
    networkName = process.env.HARDHAT_NETWORK || undefined,
  } = options;
  scriptsConfig = await loadScriptsConfig(configPath);
  await initEthers(networkName);
  PRINT = printTable || process.env.PRINT === "true";

  let verifyConfig = await verifyPreProcessing();

  await utils.setupPreviewTable(
    PRINT,
    verifyConfig,
    PREVIEWMSG,
    PREVIEWCOLWIDTHS,
    PREVIEWHEADERS,
  );

  let verifyStream = (await utils.setupStreamTable(
    PRINT,
    POSTCOLWIDTHS,
    POSTHEADERS,
    POSTMSG,
  )) as utils.CustomStream;

  await utils.executeAndProcessResults(
    verifyConfig,
    etherscanVerify,
    verifyStream,
    PRINT,
    createVerificationResponseRows,
    DEPLOYEDCONTRACTMETADATA,
  );

  await utils.completionMsg(PRINT, COMPLETIONMSG);
}

export async function testVerify(configPath?: string) {
  scriptsConfig = await loadScriptsConfig(configPath);
  await initEthers();
  let verifyConfig = await verifyPreProcessing();
  await utils.executeAndProcessResults(
    verifyConfig,
    etherscanVerify,
    undefined,
    undefined,
    undefined,
    DEPLOYEDCONTRACTMETADATA,
  );
}

export async function runVerifyScript() {
  await verify();
}
