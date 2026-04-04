import { cpSync, existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

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
