import { promises as fs } from "fs";
import path from "path";

const defaultConfig = `const config = {
  networks: {
    localhost: {
      deploy: [],
      initialize: [],
      verify: [],
    },
    sepolia: {
      deploy: [],
      initialize: [],
      verify: [],
    },
  },
};

export default config;
`;

export async function initScriptsConfig(
  outputPath: string = "scripts/config/scriptsConfig.ts",
) {
  const absolutePath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(process.cwd(), outputPath);
  const outputDir = path.dirname(absolutePath);

  await fs.mkdir(outputDir, { recursive: true });

  try {
    await fs.access(absolutePath);
    console.log(`kitty-init: Config already exists at ${absolutePath}`);
    return;
  } catch {
    // Continue writing.
  }

  await fs.writeFile(absolutePath, defaultConfig, "utf8");
  console.log(`kitty-init: Created ${absolutePath}`);
}

const isRunDirectly = process.argv[1]?.endsWith("init.ts");
if (isRunDirectly) {
  const maybePath = process.argv[2];
  initScriptsConfig(maybePath).catch((error) => {
    console.error("kitty-init failed:", error);
    process.exitCode = 1;
  });
}
