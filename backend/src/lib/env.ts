import { existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

export function loadServerEnv(): void {
  const rootEnv = join(process.cwd(), ".env.local");
  if (existsSync(rootEnv)) config({ path: rootEnv });

  const legacyEnv = join(process.cwd(), "backend", ".env");
  if (existsSync(legacyEnv)) config({ path: legacyEnv });
}
