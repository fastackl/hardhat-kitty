import { verify } from "../../core/verify.js";

type KittyVerifyTaskArgs = {
  configPath: string;
  print: string;
};

function parseBooleanOption(value: string, fallback: boolean): boolean {
  if (value === "") {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

export default async function kittyVerifyTask(args: KittyVerifyTaskArgs) {
  await verify({
    configPath: args.configPath || process.env.KIT_CONFIG,
    printTable: parseBooleanOption(args.print, process.env.PRINT === "true"),
  });
}
