import { deploy } from "../../core/deploy.js";

export default async function kitDeployTask() {
  await deploy({
    configPath: process.env.KIT_CONFIG,
    printTable: process.env.PRINT === "true",
    signerIndex: Number(process.env.SIGNERINDEX || "0"),
    ethernal: process.env.ETHERNAL === "true",
  });
}
