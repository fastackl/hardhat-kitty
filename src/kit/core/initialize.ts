import {
  Contract,
  ContractTransactionResponse,
  Network,
  Signer,
} from "ethers";
import * as utils from "../internal/utils.js";
import "colors";
import * as types from "../internal/types.js";
import { loadScriptsConfig } from "./configLoader.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ethers: any;
let PRINT: boolean;
let NETWORK: Network;
let SIGNER: Signer;
let scriptsConfig: types.Config | undefined;
const INITIALIZE: keyof types.NetworkConfig = "initialize";
let DEPLOYEDCONTRACTMETADATA: types.DeployedContractMetadata = {};
const PREVIEWMSG: string = "\n\n\nInitialization preview:";
const PREVIEWCOLWIDTHS: number[] = [20, 40, 40];
const PREVIEWCOLHEADERS: string[] = [
  "Contract".cyan,
  "Function".cyan,
  "Args".cyan,
];
const POSTCOLWIDTHS: number[] = [15, 15, 35, 35];
const POSTHEADERS: string[] = [
  "Contract".cyan,
  "Function".cyan,
  "Args".cyan,
  "Response".cyan,
];
const POSTMSG: string = "Initialization results:";
const COMPLETIONMSG: string = "Initialization complete.";
const TRUNCATELENGTH: number = 377;

async function initEthers(networkName?: string): Promise<void> {
  if (!ethers) {
    ethers = await utils.initEthersConnection(networkName);
  }
}

async function convertInitializeConfigToStrict(networkName: string) {
  if (!scriptsConfig) {
    throw new Error("init05: scripts config not loaded");
  }
  return (await utils.convertActionArrayToStrict(
    scriptsConfig.networks[networkName],
    INITIALIZE,
  )) as types.InitializeConfigStrict[];
}

async function callSingleFunction(
  config: types.ConfigInputStrict,
  metadata?: types.SingleDeploymentMetadata,
): Promise<types.TransactionResult> {
  if (types.isInitializeConfigStrict(config)) {
    if (!metadata) {
      throw new Error(
        `init02: Metadata not found for contract ${config.fqn_contractName}`,
      );
    }
    const contract = (await utils.getContractInstance(config.fqn_contractName, {
      [config.fqn_contractName]: metadata,
    })) as Contract;

    const contractWithSigner = contract.connect(SIGNER);

    const contractFunction = contractWithSigner[
      config.function as keyof typeof contractWithSigner
    ] as (...args: any[]) => Promise<ContractTransactionResponse>;

    if (typeof contractFunction !== "function") {
      throw new Error(
        `init01: Function ${config.function} not found on contract ${config.fqn_contractName}`,
      );
    }
    const result: types.TransactionResult = {
      contractName: config.fqn_contractName,
      metadata: metadata,
    };
    try {
      const tx: ContractTransactionResponse = await contractFunction(
        ...config.args.args,
      );
      const txReceipt = await tx.wait();

      txReceipt
        ? (result.tx = tx)
        : (result.error = "init02: txReceipt is null");
      return result;
    } catch (err) {
      result.error = `init03: Error calling function: ${
        err instanceof Error ? err.message : err
      }`;
      console.log(result.error);
      return result;
    }
  } else {
    throw new Error(`Unsupported config type: ${config}`);
  }
}

async function createInitializationResultRows(
  config: types.ConfigInputStrict,
  logMessages: string[],
  result?: types.TransactionResult,
): Promise<types.ResultRows> {
  if (types.isInitializeConfigStrict(config)) {
    const truncTx = result?.tx
      ? JSON.stringify(result.tx).substring(0, TRUNCATELENGTH)
      : "";
    const successArray: string[][] = [
      ["  " + result?.metadata?.contractName],
      ["  " + config.function],
      utils.formatArgString(config),
      [`  ${truncTx}`.green],
    ];
    const errorArray: string[][] = [
      ["  " + result?.metadata?.contractName],
      ["  " + config.function],
      utils.formatArgString(config),
      ["  " + result?.error?.red + " " + logMessages.join("").red],
    ];
    const resultRows = {
      success: utils.spreadArray(successArray),
      error: utils.spreadArray(errorArray),
    };
    return resultRows;
  } else {
    throw new Error(`Unsupported config type: ${config}`);
  }
}

async function initializePreProcessing(): Promise<
  types.InitializeConfigStrict[]
> {
  NETWORK = await ethers.provider.getNetwork();
  const networkName = await utils.getNetworkName(NETWORK);

  let strictInitializeConfig = await convertInitializeConfigToStrict(
    networkName,
  );
  strictInitializeConfig = await utils.handleInitializeArgsNamesAndSigs(
    strictInitializeConfig,
  );

  DEPLOYEDCONTRACTMETADATA = await utils.loadDeployedContractMetadata();

  strictInitializeConfig = await Promise.all(
    strictInitializeConfig.map(
      async (config) =>
        utils.replaceDotAddressReferences(
          config,
          DEPLOYEDCONTRACTMETADATA,
        ) as Promise<types.InitializeConfigStrict>,
    ),
  );

  return strictInitializeConfig;
}

export type InitializeOptions = {
  configPath?: string;
  printTable?: boolean;
  signerIndex?: number;
  networkName?: string;
};

export async function initialize(options: InitializeOptions = {}) {
  const {
    configPath,
    printTable = false,
    signerIndex = 0,
    networkName = process.env.HARDHAT_NETWORK || undefined,
  } = options;
  scriptsConfig = await loadScriptsConfig(configPath);
  await initEthers(networkName);
  PRINT = printTable || process.env.PRINT === "true";
  SIGNER = (await ethers.getSigners())[
    Number(signerIndex || process.env.SIGNERINDEX || "0")
  ];

  let strictInitializeConfig = await initializePreProcessing();

  await utils.setupPreviewTable(
    PRINT,
    strictInitializeConfig,
    PREVIEWMSG,
    PREVIEWCOLWIDTHS,
    PREVIEWCOLHEADERS,
  );

  let initStream = (await utils.setupStreamTable(
    PRINT,
    POSTCOLWIDTHS,
    POSTHEADERS,
    POSTMSG,
  )) as utils.CustomStream;

  await utils.executeAndProcessResults(
    strictInitializeConfig,
    callSingleFunction,
    initStream,
    PRINT,
    createInitializationResultRows,
    DEPLOYEDCONTRACTMETADATA,
  );

  await utils.completionMsg(PRINT, COMPLETIONMSG);
}

/** Leaner version of initialization for testing at speed */
export async function testInitialize(
  signerIndex: number = 0,
  configPath?: string,
) {
  scriptsConfig = await loadScriptsConfig(configPath);
  await initEthers();
  SIGNER = (await ethers.getSigners())[
    Number(signerIndex || process.env.SIGNERINDEX || "0")
  ];

  let strictInitializeConfig = await initializePreProcessing();

  await utils.executeAndProcessResults(
    strictInitializeConfig,
    callSingleFunction,
    undefined,
    undefined,
    undefined,
    DEPLOYEDCONTRACTMETADATA,
  );
}

export async function runInitializeScript() {
  await initialize();
}
