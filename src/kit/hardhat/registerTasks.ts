import { task } from "hardhat/config";

export const kitDeployTask = task("kit:deploy", "Deploy contracts from scripts config")
  .setAction(() => import("./tasks/kitDeployTask.js"))
  .build();

export const kitInitTask = task("kit:init", "Initialize deployed contracts from scripts config")
  .setAction(() => import("./tasks/kitInitTask.js"))
  .build();

export const kitVerifyTask = task("kit:verify", "Verify deployed contracts from scripts config")
  .setAction(() => import("./tasks/kitVerifyTask.js"))
  .build();

export const kitTasks = [kitDeployTask, kitInitTask, kitVerifyTask];
