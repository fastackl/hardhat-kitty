import { network, artifacts } from "hardhat";
import { AddressLike, Signer } from "ethers";
import { ParamType, Network, BaseContract, InterfaceAbi } from "ethers";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { glob } from "glob";
import * as table from "table";
import axios from "axios";

import * as types from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEPLOY = "deploy";
const INITIALIZE = "initialize";
const VERIFY = "verify";

const HARDHAT: string = "hardhat";
const LOCALHOST: string = "localhost";

const ADDRESSMARKER = ".";
const ADDRESSSUFFIX = `${ADDRESSMARKER}address` as string;
const ETHERNAL_WORKSPACE = process.env.ETHERNAL_WORKSPACE;
const SIGNERPREFIX = "SIGNER[" as string;
const SIGNERSUFFIX = "]";
const ENOENT = "ENOENT";
const TEMPSOL = "TempImports.sol";
const LIBRARIESKEY = "libraries";
const ARTIFACTSDIRNAME = "artifacts";
const DEPLOYMENTSDIRNAME = "deployments";
const DEPLOYMENTSDIR = "./deployments";
const TYPECHAINDIRNAME = "typechain";
type ScriptPaths = {
  artifacts: string;
  archive: string;
  cache: string;
  deployments: string;
  sources: string;
  tests: string;
  typechain: string;
};
const scriptPaths: ScriptPaths = {
  artifacts: "./artifacts",
  archive: "./archive",
  cache: "./cache",
  deployments: "./deployments",
  sources: "./contracts",
  tests: "./test",
  typechain: "./typechain",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ethers: any;

export function getScriptPaths(): ScriptPaths {
  return { ...scriptPaths };
}

export function setScriptPaths(partialPaths: Partial<ScriptPaths>): void {
  Object.assign(scriptPaths, partialPaths);
}

/**
 * Must be called before any function that uses ethers.
 * In Hardhat 3, ethers comes from an explicit network connection.
 */
export async function initEthersConnection(networkName?: string) {
  if (!ethers) {
    const connection = await network.connect(networkName) as any;
    ethers = connection.ethers;
  }
  return ethers;
}

/** Archive artifacts, deployments and typechain artifacts */
export async function archive() {
  await save();
  await Promise.all([
    deleteDirectory(scriptPaths.artifacts),
    deleteDirectory(scriptPaths.deployments),
    deleteDirectory(scriptPaths.typechain),
  ]);
}

export async function completionMsg(
  printResults: boolean,
  completionMsg: string,
) {
  if (!printResults) {
    console.log();
    console.log(completionMsg);
  }
}

export async function convertActionArrayToStrict(
  networkConfig: types.NetworkConfig,
  actionKey: keyof types.NetworkConfig,
): Promise<types.ConfigInputStrict[]> {
  const actionArray = networkConfig[actionKey];
  if (actionKey == DEPLOY) {
    return await convertToStrictDeploy(actionArray as types.DeployConfig[]);
  } else if (actionKey == INITIALIZE) {
    return await convertToStrictInitialize(
      actionArray as types.InitializeConfig[],
    );
  } else if (actionKey == VERIFY) {
    return await convertToStrictVerify(actionArray as types.VerifyConfig[]);
  } else {
    throw new Error(
      `utils02: actionKey must be one of ${DEPLOY}, ${INITIALIZE}, or ${VERIFY}`,
    );
  }
}

/** Convert DeployConfig array to DeployConfigStrict array by populating missing fields*/
export async function convertToStrictDeploy(
  deployArray: types.DeployConfig[],
): Promise<types.DeployConfigStrict[]> {
  let deployArrayStrict = deployArray as types.DeployConfigStrict[];
  await Promise.all(
    deployArrayStrict.map(async (_, deployIndex) => {
      await handle_fqnFilePath(deployArrayStrict, deployIndex);
      await handle_fqn(deployArrayStrict, deployIndex);
      await handleLibraries(deployArrayStrict, deployIndex);
      await handleFunctionArgs(deployArrayStrict, deployIndex);
    }),
  );
  return deployArrayStrict;
}

/** Convert InitializeConfig array to InitializeConfigStrict array by populating missing fields  */
export async function convertToStrictInitialize(
  initializeArray: types.InitializeConfig[],
): Promise<types.InitializeConfigStrict[]> {
  let initializeArrayStrict = initializeArray as types.InitializeConfigStrict[];
  let deployedContractMetadata = await loadDeployedContractMetadata();
  await Promise.all(
    initializeArrayStrict.map(async (_, initIndex) => {
      const contractName = initializeArrayStrict[initIndex].fqn_contractName;
      const address =
        deployedContractMetadata[contractName]?.address ??
        "utils05: contract not found";
      initializeArrayStrict[initIndex].address = address;
      await handleFunctionArgs(initializeArrayStrict, initIndex);
    }),
  );
  return initializeArrayStrict;
}

export async function convertToStrictVerify(
  verifyArray: types.VerifyConfig[],
): Promise<types.VerifyConfigStrict[]> {
  const verifyConfigStrict: types.VerifyConfigStrict[] = [];
  const metadata = await loadDeployedContractMetadata();
  if (verifyArray.length == 1 && verifyArray[0] == "ALL") {
    for (const contractName in metadata) {
      verifyConfigStrict.push({
        fqn_contractName: contractName,
        fqn_filePath: metadata[contractName].sourcePath,
        fqn: `${metadata[contractName].sourcePath}:${contractName}`,
        address: metadata[contractName].address,
        args: metadata[contractName].args,
        libraries: metadata[contractName].libraries,
      });
    }
    return verifyConfigStrict;
  } else {
    for (const contractName of verifyArray) {
      verifyConfigStrict.push({
        fqn_contractName: contractName,
        fqn_filePath: metadata[contractName].sourcePath,
        fqn: `${metadata[contractName].sourcePath}:${contractName}`,
        address: metadata[contractName].address,
        args: metadata[contractName].args,
        libraries: metadata[contractName].libraries,
      });
    }
    return verifyConfigStrict;
  }
}

export async function copyDirectory(
  source: string,
  destination: string,
): Promise<void> {
  await createDirIfENOENT(destination);
  const files = await fs.readdir(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destinationPath = path.join(destination, file);
    const isDirectory = (await fs.lstat(sourcePath)).isDirectory();
    if (isDirectory) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      try {
        await fs.copyFile(sourcePath, destinationPath);
      } catch (error) {
        console.error(
          `utils01: Failed to copy file from ${sourcePath} to ${destinationPath}:`,
          error,
        );
      }
    }
  }
}

export async function createDirIfENOENT(directory: string): Promise<void> {
  try {
    await fs.access(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== ENOENT) {
      throw error;
    }
    await fs.mkdir(directory);
  }
}

export async function deleteDirectory(directory: string): Promise<void> {
  try {
    await fs.rm(directory, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== ENOENT) {
      throw error;
    }
  }
}

export async function deleteTempImportsSol(): Promise<void> {
  await fs.unlink(path.join(scriptPaths.sources, TEMPSOL));
}

export async function directoryExistsAndHasFiles(
  directory: string,
): Promise<boolean> {
  try {
    const directoryContents = await fs.readdir(directory);
    if (directoryContents.length > 0) {
      return true;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== ENOENT) {
      throw error;
    }
  }
  return false;
}

export async function executeAndProcessResults(
  configArray: types.ConfigInputStrict[],
  processFunction: (
    config: types.ConfigInputStrict,
    metadata?: types.SingleDeploymentMetadata,
  ) => Promise<types.TransactionResult | void>,
  stream?: CustomStream,
  printTable?: boolean,
  createResultRowsFunction?: (
    config: types.ConfigInputStrict,
    logMessages: string[],
    result?: types.TransactionResult,
  ) => Promise<types.ResultRows>,
  deployedContractMetadata?: types.DeployedContractMetadata,
) {
  for (let index = 0; index < configArray.length; index++) {
    const originalConsoleLog = console.log;
    const logMessages = pipeLogsToTable();
    const contractName = configArray[index].fqn_contractName;
    try {
      const result = await (deployedContractMetadata
        ? processFunction(
            configArray[index],
            deployedContractMetadata[contractName],
          )
        : processFunction(configArray[index]));
      if (printTable && stream && createResultRowsFunction) {
        if (result) {
          const resultRows = await createResultRowsFunction(
            configArray[index],
            logMessages,
            result,
          );
          await handleExecutionResponse(
            index,
            stream,
            configArray.length,
            resultRows.error,
            resultRows,
            result,
          );
        } else {
          const resultRows = await createResultRowsFunction(
            configArray[index],
            logMessages,
          );
          await handleExecutionResponse(
            index,
            stream,
            configArray.length,
            resultRows.success,
          );
        }
      }
    } catch (error) {
      if (printTable && stream && createResultRowsFunction) {
        let errorArray: string[];
        if (error instanceof Error) {
          errorArray = [error.toString()];
        } else {
          errorArray = [
            `Caught exception of unknown type: ${JSON.stringify(error)}`,
          ];
        }
        const resultRows = await createResultRowsFunction(
          configArray[index],
          errorArray,
        );
        await handleExecutionResponse(
          index,
          stream,
          configArray.length,
          resultRows.error,
        );
      } else {
        console.error(`Error processing contract ${contractName}: ${error}`);
      }
    } finally {
      console.log = originalConsoleLog;
    }
  }
}

export async function extractArgsNamesAndSigs(
  abiItem: any,
): Promise<{ argNames: string[]; argSigs: string[] }> {
  let argNames: string[] = [];
  let argSigs: string[] = [];

  if (abiItem && abiItem.inputs) {
    argNames = abiItem.inputs.map((input: ParamType) => input.name);
    argSigs = abiItem.inputs.map((input: ParamType) => input.type);
  }

  return { argNames, argSigs };
}

export function findObject<T>(
  input: types.ConfigInputStrict,
  isObject: (value: any) => value is T,
): T | null {
  for (const key in input) {
    if (isObject(input[key as keyof types.ConfigInputStrict])) {
      return input[key as keyof types.ConfigInputStrict] as T;
    }
  }
  return null;
}

export function formatArgString(input: types.ConfigInputStrict): string[] {
  const argObject = findObject(input, types.isArgumentObjectStrict);
  if (!argObject) {
    return [""];
  }

  const { args, argNames, argSigs } = argObject;
  let formattedArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const argName = argNames[i] || "";
    const argSig = argSigs ? `(${argSigs[i]})`.gray : "";
    const argValue = args[i];
    formattedArgs.push(`  ${argName}${argSig}: ${argValue}`);
  }
  return formattedArgs;
}

export function formatLibString(input: types.ConfigInputStrict): string[] {
  const libObject = findObject(input, types.isLibraries);
  if (!libObject) {
    return [""];
  }

  let formattedLibs: string[] = [];

  for (const libName in libObject) {
    const libAddress = libObject[libName];
    formattedLibs.push(`  ${libName}: ${libAddress}`);
  }
  return formattedLibs;
}

export async function getContractArtifact(
  contractName: string,
): Promise<any> {
  const artifact = await artifacts.readArtifact(contractName);
  return artifact;
}

export async function getContractFilePath(
  contractName: string,
): Promise<string> {
  const contractFilePath = await glob(`./contracts/**/${contractName}.sol`);
  if (contractFilePath.length == 0) {
    throw new Error(`Contract ${contractName} not found`);
  }
  return contractFilePath[0];
}

export async function getContractInstance(
  contractName: string,
  deployedContractMetadata: types.DeployedContractMetadata,
) {
  const metadata = deployedContractMetadata[contractName];
  if (!metadata) {
    throw new Error(`Metadata for contract ${contractName} not found`);
  }
  const contractAddress = metadata.address;
  const contractAbi = metadata.abi;

  const signer = await ethers.provider.getSigner();

  const contract = new ethers.Contract(
    contractAddress.toString(),
    contractAbi,
    signer,
  );
  return contract;
}

export async function getNetworkName(network: Network) {
  return network.name == HARDHAT ? LOCALHOST : network.name;
}

export async function handleDeployArgsNamesAndSigs(
  configs: types.DeployConfigStrict[],
): Promise<types.DeployConfigStrict[]> {
  return Promise.all(
    configs.map(async (config) => {
      const artifact = await getContractArtifact(config.fqn_contractName);
      const abiItem = artifact.abi.find((item: any) => item.type === "constructor");
      const { argNames, argSigs } = await extractArgsNamesAndSigs(abiItem);

      config.args.argNames = argNames;
      config.args.argSigs = argSigs;

      return config;
    }),
  );
}

export async function handle_fqn(
  deployArrayStrict: types.DeployConfigStrict[],
  i: number,
): Promise<void> {
  deployArrayStrict[i].fqn =
    deployArrayStrict[i].fqn ||
    `${deployArrayStrict[i].fqn_filePath}:${deployArrayStrict[i].fqn_contractName}`;
}

export async function handle_fqnFilePath(
  deployArrayStrict: types.DeployConfigStrict[],
  i: number,
): Promise<void> {
  deployArrayStrict[i].fqn_filePath =
    deployArrayStrict[i].fqn_filePath ||
    (await getContractFilePath(deployArrayStrict[i].fqn_contractName));
}

export async function handleFunctionArgs(
  actionArrayStrict: types.ConfigInputStrict[],
  i: number,
): Promise<void> {
  actionArrayStrict[i].args = actionArrayStrict[i].args || {
    args: [],
    argNames: [],
    argSigs: [],
  };
  actionArrayStrict[i].args.args = actionArrayStrict[i].args.args || [];
  actionArrayStrict[i].args.argNames = actionArrayStrict[i].args.argNames || [];
  actionArrayStrict[i].args.argSigs = actionArrayStrict[i].args.argSigs || [];
}

export async function handleInitializeArgsNamesAndSigs(
  configs: types.InitializeConfigStrict[],
): Promise<types.InitializeConfigStrict[]> {
  return Promise.all(
    configs.map(async (config) => {
      const artifact = await getContractArtifact(config.fqn_contractName);
      const abiItem = artifact.abi.find(
        (item: any) => item.type === "function" && item.name === config.function,
      );
      const { argNames, argSigs } = await extractArgsNamesAndSigs(abiItem);

      config.args.argNames = argNames;
      config.args.argSigs = argSigs;

      return config;
    }),
  );
}

export async function handleLibraries(
  deployArrayStrict: types.DeployConfigStrict[],
  i: number,
): Promise<void> {
  deployArrayStrict[i].libraries = deployArrayStrict[i].libraries || {};
}

export async function handleExecutionResponse(
  index: number,
  tableStream: CustomStream,
  totalContracts: number,
  fallbackRows: string[][],
  resultRows?: types.ResultRows,
  result?: types.TransactionResult,
) {
  if (resultRows && result && "tx" in result) {
    resultRows.success.forEach((row) => {
      tableStream.write(row, index);
    });
  } else if (resultRows && result) {
    resultRows.error.forEach((row) => {
      tableStream.write(row, index);
    });
  } else {
    fallbackRows?.forEach((row) => {
      tableStream.write(row, index);
    });
  }
  if (index === totalContracts - 1) {
    tableStream.closeTable();
  }
}

export async function loadDeploymentAddressesIfExists(): Promise<
  any | undefined
> {
  const candidateFiles = [
    path.join(process.cwd(), "deploymentAddresses.js"),
    path.join(process.cwd(), "deploymentAddresses.ts"),
  ];
  for (const candidatePath of candidateFiles) {
    try {
      await fs.access(candidatePath);
      return await import(pathToFileURL(candidatePath).href);
    } catch {
      // Continue checking next candidate path.
    }
  }
  return undefined;
}

/**
 * Loads deployed contract instances based on the deployed contract metadata.
 */
export async function loadDeployedContractInstances(
  byoAddresses: boolean = false,
): Promise<types.DeployedContractInstances> {
  const deployedContractMetadata = await loadDeployedContractMetadata(
    byoAddresses,
  );
  const deployedContractInstances: types.DeployedContractInstances = {};

  for (const contractName of Object.keys(deployedContractMetadata)) {
    const contractInstance = await getContractInstance(
      contractName,
      deployedContractMetadata,
    );
    deployedContractInstances[contractName] = contractInstance;
  }

  return deployedContractInstances;
}

export async function loadDeployedContractMetadata(
  byoAddresses: boolean = false,
): Promise<types.DeployedContractMetadata> {
  let deploymentAddresses;
  try {
    deploymentAddresses = await loadDeploymentAddressesIfExists();
  } catch (error) {
    console.error("utils07: Failed to load deployment addresses:", error);
    deploymentAddresses = undefined;
  }
  const deployedContractMetadata: types.DeployedContractMetadata = {};

  const providerNetwork = await ethers.provider.getNetwork();
  const networkName = await getNetworkName(providerNetwork);

  const files = await fs.readdir(DEPLOYMENTSDIR);
  const jsonFiles = files.filter((file: string) => file.endsWith(".json"));

  await Promise.all(
    jsonFiles.map(async (file: string) => {
      const filePath = path.join(DEPLOYMENTSDIR, file);
      const data = await fs.readFile(filePath, "utf8");
      const metadata: types.SingleDeploymentMetadata = JSON.parse(data);
      deployedContractMetadata[metadata.contractName] = metadata;
    }),
  );

  if (byoAddresses) {
    try {
      if (deploymentAddresses[networkName]) {
        for (const contractName in deployedContractMetadata) {
          if (deploymentAddresses[networkName][contractName]) {
            const address = deploymentAddresses[networkName][contractName];
            deployedContractMetadata[contractName].address = ethers.isAddress(
              address,
            )
              ? address
              : deployedContractMetadata[contractName].address;
          }
        }
      }
    } catch (error) {
      console.error("Failed to import or process deploymentAddresses:", error);
    }
  }

  return deployedContractMetadata;
}

export function pipeLogsToTable(): string[] {
  const logMessages = [] as string[];
  console.log = function (message) {
    logMessages.push(message);
  };
  return logMessages;
}

export function previewRows(config: types.ConfigInputStrict): string[][] {
  let rows: string[][];
  if (types.isVerifyConfigStrict(config)) {
    return (rows = [
      ["  " + config.fqn_contractName + ` (${config.address.toString()})`.gray],
      formatArgString(config),
      formatLibString(config),
    ]);
  } else if (types.isDeployConfigStrict(config)) {
    return (rows = [
      ["  " + config.fqn_contractName],
      formatArgString(config),
      formatLibString(config),
    ]);
  } else if (types.isInitializeConfigStrict(config)) {
    return (rows = [
      ["  " + config.fqn_contractName + ` (${config.address.toString()})`.gray],
      ["  " + config.function],
      formatArgString(config),
    ]);
  } else {
    throw new Error(
      "utils04: config must be either DeployConfigStrict, InitializeConfigStrict, or VerifyConfigStrict",
    );
  }
}

export async function previewTable(
  stream: CustomStream,
  config: types.ConfigInputStrict[],
): Promise<void> {
  config.forEach((configInput, configIndex) => {
    const rows = previewRows(configInput);
    spreadArray(rows).forEach((row) => {
      stream.write(row, configIndex);
    });
    if (configIndex === config.length - 1) {
      stream.closeTable();
    }
  });
}

export async function pushToEthernal(
  name: string,
  address: AddressLike,
  abi: InterfaceAbi,
): Promise<void> {
  try {
    const response = await axios.post(
      `https://api.tryethernal.com/api/contracts/${address}`,
      {
        data: {
          workspace: ETHERNAL_WORKSPACE,
          name: name,
          abi: abi,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ETHERNAL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response ? error.response.status : "N/A";
      const statusText = error.response
        ? error.response.statusText
        : "No response";
      console.error(
        `Failed to push to Ethernal: ${name}. Error: ${error.message}. Status code: ${statusCode} - ${statusText}.`,
      );
    } else {
      console.error(`Failed to push to Ethernal: ${name}. Error: ${error}.`);
    }
  }
}

export async function replaceAddressReferencesInArray(
  arr: types.Args,
  deployedContractMetadata: types.DeployedContractMetadata,
): Promise<types.Args> {
  let result: types.Args = [];
  const signers = await ethers.getSigners();
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(
        await replaceAddressReferencesInArray(item, deployedContractMetadata),
      );
    } else if (typeof item === "string" && item.endsWith(ADDRESSSUFFIX)) {
      const contractName = item.split(ADDRESSMARKER)[0];
      result.push(
        deployedContractMetadata[contractName]?.address ??
          "utils05: contract not found",
      );
    } else if (
      typeof item === "string" &&
      item.startsWith(SIGNERPREFIX) &&
      item.endsWith(SIGNERSUFFIX)
    ) {
      const signerIndex = parseInt(item.split(SIGNERPREFIX)[1], 10);
      if (!isNaN(signerIndex) && signerIndex < signers.length) {
        result.push(await signers[signerIndex].getAddress());
      } else {
        result.push("utils06: signer index out of bounds");
      }
    } else {
      result.push(item);
    }
  }
  return result;
}

export async function replaceDotAddressReferences(
  action: types.DeployConfigStrict | types.InitializeConfigStrict,
  deployedContractMetadata: types.DeployedContractMetadata,
): Promise<types.DeployConfigStrict | types.InitializeConfigStrict> {
  if (types.isDeployConfigStrict(action)) {
    action.args.args = await replaceAddressReferencesInArray(
      action.args.args,
      deployedContractMetadata,
    );
    if (LIBRARIESKEY in action) {
      for (const libraryName in action.libraries) {
        const libraryAddress = action.libraries[libraryName].toString();
        if (libraryAddress.endsWith(ADDRESSSUFFIX)) {
          const contractName = libraryAddress.split(ADDRESSMARKER)[0];
          action.libraries[libraryName] =
            deployedContractMetadata[contractName].address;
        }
      }
    }
    return action as types.DeployConfigStrict;
  }

  if (types.isInitializeConfigStrict(action)) {
    action.args.args = await replaceAddressReferencesInArray(
      action.args.args,
      deployedContractMetadata,
    );
    return action as types.InitializeConfigStrict;
  }

  throw new Error(
    "utils03: action must be either DeployConfigStrict or InitializeConfigStrict",
  );
}

export async function save() {
  await createDirIfENOENT(scriptPaths.archive);
  const timestamp = new Date().toISOString();
  const newArchiveDirectory = path.join(
    scriptPaths.archive,
    timestamp.toString(),
  );

  const artifactsExist = await directoryExistsAndHasFiles(
    scriptPaths.artifacts,
  );
  const deploymentsExist = await directoryExistsAndHasFiles(
    scriptPaths.deployments,
  );
  const typechainExists = await directoryExistsAndHasFiles(
    scriptPaths.typechain,
  );

  if (artifactsExist || deploymentsExist || typechainExists) {
    await fs.mkdir(newArchiveDirectory);
    if (artifactsExist) {
      await copyDirectory(
        scriptPaths.artifacts,
        path.join(newArchiveDirectory, ARTIFACTSDIRNAME),
      );
    }
    if (deploymentsExist) {
      await copyDirectory(
        scriptPaths.deployments,
        path.join(newArchiveDirectory, DEPLOYMENTSDIRNAME),
      );
    }
    if (typechainExists) {
      await copyDirectory(
        scriptPaths.typechain,
        path.join(newArchiveDirectory, TYPECHAINDIRNAME),
      );
    }
  }
}

export async function setupPreviewTable(
  printTable: boolean,
  strictConfig: types.ConfigInputStrict[],
  previewMsg: string,
  colWidths: number[],
  colHeaders: string[],
): Promise<void> {
  if (printTable) {
    process.stdout.write(previewMsg);
    const previewStream = new CustomStream(colWidths, colHeaders);
    await previewTable(previewStream, strictConfig);
  }
}

export async function setupStreamTable(
  printTable: boolean,
  colWidths: number[],
  colHeaders: string[],
  initMsg?: string,
): Promise<CustomStream | undefined> {
  if (initMsg && printTable) {
    process.stdout.write("\n\n\n");
    process.stdout.write(initMsg);
  }
  if (printTable) {
    const stream = new CustomStream(colWidths, colHeaders);
    return stream;
  } else {
    return undefined;
  }
}

/**
 * Takes 2D array like [['ContractName'],['arg1string','arg2string','arg3string'],['lib1string','lib2string']]
 * and returns [['ContractName','arg1string','lib1string'],['','arg2string','lib2string'],['','arg3string','']]
 */
export function spreadArray(arr: string[][]): string[][] {
  const result = Array(Math.max(...arr.map((innerArr) => innerArr.length)))
    .fill(0)
    .map(() => Array(arr.length).fill(""));
  arr.forEach((innerArr, i) =>
    innerArr.forEach((val, j) => (result[j][i] = val)),
  );
  return result;
}

export async function writeTempImportsSol(
  deployConfig: types.DeployConfigStrict[],
): Promise<void> {
  let tempImportsSol = "pragma solidity >=0.5.16 <0.9.0;\n";
  let importStatements = deployConfig.map((config) => {
    if (!config.fqn_filePath.startsWith("contracts/")) {
      return `import "${config.fqn_filePath}";\n`;
    }
    return "";
  });
  tempImportsSol += importStatements.join("");

  let tempFilePath = path.join(scriptPaths.sources, "TempImports.sol");
  await fs.writeFile(tempFilePath, tempImportsSol);
}

/**
 * Custom table stream
 */
export class CustomStream {
  private static readonly FALLBACK_CLI_WIDTH = 120;
  private config: table.StreamUserConfig = {
    border: {
      topBody: "",
      topJoin: "",
      topLeft: "",
      topRight: "",
      bottomBody: "",
      bottomJoin: "",
      bottomLeft: "",
      bottomRight: "",
      bodyLeft: "",
      bodyRight: " ",
      bodyJoin: "",
      joinBody: "",
      joinLeft: "",
      joinRight: "",
      joinJoin: "",
    },
    columnDefault: { width: 50 },
    columnCount: 1,
  };
  private cliWidth = Math.floor(
    ((typeof process.stdout.columns === "number"
      ? process.stdout.columns
      : CustomStream.FALLBACK_CLI_WIDTH) * 0.89),
  );
  private headerHorizontalLine: string[] = [];
  private horizontalLine: string[] = [];
  private stream: table.WritableStream;

  constructor(columnWidthPercentages: number[], header: string[]) {
    const columnConfig = columnWidthPercentages.map((columnWidth) => ({
      width: Math.floor((columnWidth * this.cliWidth) / 100),
      wrapWord: false,
    }));
    this.headerHorizontalLine = columnWidthPercentages.map((columnWidth) =>
      "═".repeat(Math.floor((columnWidth * this.cliWidth) / 100)),
    );
    this.horizontalLine = columnWidthPercentages.map(
      (columnWidth) =>
        "•".gray +
        "─".repeat(
          Math.floor((columnWidth * this.cliWidth) / 100) -
            (columnWidthPercentages.length - 1),
        ) +
        "•".gray,
    );
    this.config = {
      ...this.config,
      columns: columnConfig,
      columnCount: columnWidthPercentages.length,
    };
    this.stream = table.createStream(this.config);
    process.stdout.write("\n");
    this.writeToStream(this.headerHorizontalLine);
    this.writeToStream(header);
    this.writeToStream(this.headerHorizontalLine);
  }

  write(row: string[], index: number): void {
    if (row[0] !== "" && index !== 0) {
      this.writeToStream(this.horizontalLine);
    }
    this.writeToStream(row);
    process.stdout.write("\n");
  }

  closeTable(): void {
    this.writeToStream(this.headerHorizontalLine);
    process.stdout.write("\n\n");
  }

  private writeToStream(content: string[]): void {
    if (!this.stream) {
      throw new Error("Stream is not initialized");
    }
    this.stream.write(content);
  }
}
