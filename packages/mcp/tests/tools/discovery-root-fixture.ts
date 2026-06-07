import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(fixtureDir, "../../../..");

export interface IsolatedCoreFixture {
  kbPlPath: string;
  kbDataDir: string;
  cleanup: () => void;
}

// implements REQ-002, REQ-013
export function setupIsolatedCore(): IsolatedCoreFixture {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-isolated-core-"));
  const isolatedCoreRoot = path.join(tmpRoot, "isolated-core");
  const isolatedCoreSrc = path.join(isolatedCoreRoot, "src");
  const isolatedCoreSchema = path.join(isolatedCoreRoot, "schema");
  const kbPlPath = path.join(isolatedCoreSrc, "kb.pl");
  const kbDataDir = path.join(tmpRoot, "kb-data");
  const coreSrcDir = path.join(repoRoot, "packages", "core", "src");
  const coreSchemaDir = path.join(repoRoot, "packages", "core", "schema");

  let cleanedUp = false;
  const savedEnv = {
    KIBI_KB_PL_PATH: process.env.KIBI_KB_PL_PATH,
    KIBI_DISCOVERY_PL_PATH: process.env.KIBI_DISCOVERY_PL_PATH,
    KIBI_CHECKS_PL_PATH: process.env.KIBI_CHECKS_PL_PATH,
  };

  const restoreOptionalEnv = (key: keyof typeof savedEnv): void => {
    const original = savedEnv[key];
    if (original === undefined) {
      Reflect.deleteProperty(process.env, key);
      return;
    }
    process.env[key] = original;
  };

  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;

    restoreOptionalEnv("KIBI_KB_PL_PATH");
    restoreOptionalEnv("KIBI_DISCOVERY_PL_PATH");
    restoreOptionalEnv("KIBI_CHECKS_PL_PATH");

    rmSync(tmpRoot, { recursive: true, force: true });
  };

  try {
    mkdirSync(isolatedCoreRoot, { recursive: true });
    cpSync(coreSrcDir, isolatedCoreSrc, { recursive: true });
    cpSync(coreSchemaDir, isolatedCoreSchema, { recursive: true });
    mkdirSync(kbDataDir, { recursive: true });

    process.env.KIBI_KB_PL_PATH = kbPlPath;
    Reflect.deleteProperty(process.env, "KIBI_DISCOVERY_PL_PATH");
    Reflect.deleteProperty(process.env, "KIBI_CHECKS_PL_PATH");

    return {
      kbPlPath,
      kbDataDir,
      cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
