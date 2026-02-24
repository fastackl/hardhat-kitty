import { task } from "hardhat/config";

export const kittyDeployTask = task("kitty:deploy", "Deploy contracts from scripts config")
  .setAction(() => import("./tasks/kitDeployTask.js"))
  .build();

export const kittyInitTask = task("kitty:init", "Initialize deployed contracts from scripts config")
  .setAction(() => import("./tasks/kitInitTask.js"))
  .build();

export const kittyVerifyTask = task("kitty:verify", "Verify deployed contracts from scripts config")
  .setAction(() => import("./tasks/kitVerifyTask.js"))
  .build();

export const kittyTasks = [kittyDeployTask, kittyInitTask, kittyVerifyTask];
