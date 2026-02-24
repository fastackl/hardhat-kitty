import { initialize } from "../../core/initialize.js";

export default async function kittyInitTask() {
  await initialize({
    configPath: process.env.KIT_CONFIG,
    printTable: process.env.PRINT === "true",
    signerIndex: Number(process.env.SIGNERINDEX || "0"),
  });
}
