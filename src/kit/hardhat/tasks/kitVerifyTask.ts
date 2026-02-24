import { verify } from "../../core/verify.js";

export default async function kittyVerifyTask() {
  await verify({
    configPath: process.env.KIT_CONFIG,
    printTable: process.env.PRINT === "true",
  });
}
