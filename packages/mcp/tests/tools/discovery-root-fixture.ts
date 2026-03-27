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
  const savedKbPlPath = process.env.KIBI_KB_PL_PATH;
  const savedDiscoveryPlPath = process.env.KIBI_DISCOVERY_PL_PATH;
  const savedChecksPlPath = process.env.KIBI_CHECKS_PL_PATH;

  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-isolated-core-"));
  const isolatedCoreRoot = path.join(tmpRoot, "isolated-core");
  const isolatedCoreSrc = path.join(isolatedCoreRoot, "src");
  const isolatedCoreSchema = path.join(isolatedCoreRoot, "schema");
  const kbPlPath = path.join(isolatedCoreSrc, "kb.pl");
  const kbDataDir = path.join(tmpRoot, "kb-data");
  const coreSrcDir = path.join(repoRoot, "packages", "core", "src");
  const coreSchemaDir = path.join(repoRoot, "packages", "core", "schema");

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;

    if (savedKbPlPath !== undefined) {
      process.env.KIBI_KB_PL_PATH = savedKbPlPath;
    } else {
      Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    }

    if (savedDiscoveryPlPath !== undefined) {
      process.env.KIBI_DISCOVERY_PL_PATH = savedDiscoveryPlPath;
    } else {
      Reflect.deleteProperty(process.env, "KIBI_DISCOVERY_PL_PATH");
    }

    if (savedChecksPlPath !== undefined) {
      process.env.KIBI_CHECKS_PL_PATH = savedChecksPlPath;
    } else {
      Reflect.deleteProperty(process.env, "KIBI_CHECKS_PL_PATH");
    }

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
