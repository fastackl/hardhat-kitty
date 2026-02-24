import { deploy } from "../../core/deploy.js";

type KittyDeployTaskArgs = {
  configPath: string;
  print: string;
  signerIndex: string;
  ethernal: string;
};

function parseBooleanOption(value: string, fallback: boolean): boolean {
  if (value === "") {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

export default async function kittyDeployTask(args: KittyDeployTaskArgs) {
  const signerIndex = args.signerIndex === ""
    ? Number(process.env.SIGNERINDEX || "0")
    : Number(args.signerIndex);
  await deploy({
    configPath: args.configPath || process.env.KIT_CONFIG,
    printTable: parseBooleanOption(args.print, process.env.PRINT === "true"),
    signerIndex,
    ethernal: parseBooleanOption(args.ethernal, process.env.ETHERNAL === "true"),
  });
}
