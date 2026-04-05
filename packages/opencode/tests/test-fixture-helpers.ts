import { cpSync, existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TempRepo {
  path: string;
  cleanup(): void;
}

export function createTempRepoFromFixture(fixtureName: string): TempRepo { // implements REQ-opencode-smart-enforcement-v1
  const fixturesDir = resolve(__dirname, "fixtures");
  const fixturePath = join(fixturesDir, fixtureName);

  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixtureName}`);
  }

  const tempDir = mkdtempSync(join(tmpdir(), `kibi-${fixtureName}-`));
  cpSync(fixturePath, tempDir, { recursive: true });

  return {
    path: tempDir,
    cleanup() {
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
