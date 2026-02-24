import { initialize } from "../../core/initialize.js";

type KittyInitializeTaskArgs = {
  configPath: string;
  print: string;
  signerIndex: string;
};

function parseBooleanOption(value: string, fallback: boolean): boolean {
  if (value === "") {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

export default async function kittyInitializeTask(args: KittyInitializeTaskArgs) {
  const signerIndex = args.signerIndex === ""
    ? Number(process.env.SIGNERINDEX || "0")
    : Number(args.signerIndex);
  await initialize({
    configPath: args.configPath || process.env.KIT_CONFIG,
    printTable: parseBooleanOption(args.print, process.env.PRINT === "true"),
    signerIndex,
  });
}
