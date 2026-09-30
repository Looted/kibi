import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resetSwiplResolverCache } from "../../src/prolog/swipl-resolver.js";

export type FakeSwiplSpec =
  /** A `--version` banner; the required-library probe reports nothing missing. */
  | string
  /** Simulates "no SWI-Prolog anywhere": bundle skipped, empty PATH. */
  | Error
  | { banner: string; missingLibraries?: string[]; probeExitStatus?: number };

let activeInstalls = 0;
let savedEnv: {
  KIBI_SWIPL: string | undefined;
  PATH: string | undefined;
} | null = null;

function restoreVar(name: "KIBI_SWIPL" | "PATH", value: string | undefined) {
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

/**
 * Point Kibi's SWI-Prolog resolution at a deterministic fake for one test.
 * Goes through KIBI_SWIPL so the real resolver runs end to end. Returns a
 * restore function; nested installs restore to the original environment.
 */
export function installFakeSwipl(spec: FakeSwiplSpec): () => void {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-fake-swipl-"));
  if (activeInstalls === 0) {
    savedEnv = { KIBI_SWIPL: process.env.KIBI_SWIPL, PATH: process.env.PATH };
  }
  activeInstalls += 1;
  if (spec instanceof Error) {
    process.env.KIBI_SWIPL = "system";
    process.env.PATH = dir;
  } else {
    const {
      banner,
      missingLibraries = [],
      probeExitStatus = 0,
    } = typeof spec === "string" ? { banner: spec } : spec;
    const script = path.join(dir, "swipl");
    const missing = missingLibraries
      .map((library) => `printf '__KIBI_MISSING_LIBRARY__:%s\\n' '${library}'`)
      .join("\n");
    writeFileSync(
      script,
      `#!/bin/sh\ncase "$1" in\n--version) printf '%s' '${banner}';;\n*) ${missing || ":"}; exit ${probeExitStatus};;\nesac\n`,
    );
    chmodSync(script, 0o755);
    process.env.KIBI_SWIPL = script;
  }
  resetSwiplResolverCache();
  return () => {
    activeInstalls -= 1;
    if (activeInstalls === 0 && savedEnv !== null) {
      restoreVar("KIBI_SWIPL", savedEnv.KIBI_SWIPL);
      restoreVar("PATH", savedEnv.PATH);
      savedEnv = null;
    }
    resetSwiplResolverCache();
    rmSync(dir, { recursive: true, force: true });
  };
}
