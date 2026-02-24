import { task } from "hardhat/config";

export const kittyDeployTask = task("kitty:deploy", "Deploy contracts from scripts config")
  .addOption({
    name: "configPath",
    description: "Path to scripts config file",
    defaultValue: "",
  })
  .addOption({
    name: "print",
    description: "Print results table (true/false)",
    defaultValue: "",
  })
  .addOption({
    name: "signerIndex",
    description: "Signer index to use (number)",
    defaultValue: "",
  })
  .addOption({
    name: "ethernal",
    description: "Push deployments to Ethernal (true/false)",
    defaultValue: "",
  })
  .setAction(() => import("./tasks/kittyDeployTask.js"))
  .build();

export const kittyInitializeTask = task("kitty:initialize", "Initialize deployed contracts from scripts config")
  .addOption({
    name: "configPath",
    description: "Path to scripts config file",
    defaultValue: "",
  })
  .addOption({
    name: "print",
    description: "Print results table (true/false)",
    defaultValue: "",
  })
  .addOption({
    name: "signerIndex",
    description: "Signer index to use (number)",
    defaultValue: "",
  })
  .setAction(() => import("./tasks/kittyInitializeTask.js"))
  .build();

export const kittyVerifyTask = task("kitty:verify", "Verify deployed contracts from scripts config")
  .addOption({
    name: "configPath",
    description: "Path to scripts config file",
    defaultValue: "",
  })
  .addOption({
    name: "print",
    description: "Print results table (true/false)",
    defaultValue: "",
  })
  .setAction(() => import("./tasks/kittyVerifyTask.js"))
  .build();

export const kittyTasks = [kittyDeployTask, kittyInitializeTask, kittyVerifyTask];
