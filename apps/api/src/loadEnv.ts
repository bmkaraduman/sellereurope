import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Load the first .env found walking up from the current working directory,
 * so `pnpm --filter @sellereurope/api ...` (cwd = apps/api) still picks up
 * the repo-root .env.
 */
export function loadEnv(): string | undefined {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      config({ path: candidate });
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

export const ENV_PATH = loadEnv();
