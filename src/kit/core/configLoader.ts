import { pathToFileURL } from "url";
import path from "path";
import type { Config } from "../internal/types.js";

const DEFAULT_CONFIG_CANDIDATES = [
  "scripts/config/scriptsConfig.ts",
  "scripts/config/scriptsConfig.js",
  "scripts.config.ts",
  "scripts.config.js",
];

async function importConfigFromPath(configPath: string): Promise<Config> {
  const absolutePath = path.isAbsolute(configPath)
    ? configPath
    : path.join(process.cwd(), configPath);
  const imported = await import(pathToFileURL(absolutePath).href);
  const config = (imported.default ?? imported.config) as Config | undefined;
  if (!config) {
    throw new Error(
      `kit01: Config module at ${absolutePath} must export default config.`,
    );
  }
  return config;
}

export async function loadScriptsConfig(configPath?: string): Promise<Config> {
  if (configPath) {
    return importConfigFromPath(configPath);
  }

  for (const candidate of DEFAULT_CONFIG_CANDIDATES) {
    try {
      return await importConfigFromPath(candidate);
    } catch {
      // Continue trying the next candidate.
    }
  }

  throw new Error(
    `kit02: Could not find scripts config. Tried: ${DEFAULT_CONFIG_CANDIDATES.join(", ")}`,
  );
}
