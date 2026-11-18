import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useCoreModuleGoal } from "../../src/prolog/codec.js";
import {
  resolveSwipl,
  swiplChildEnv,
} from "../../src/prolog/swipl-resolver.js";

const CORE_SRC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../core/src",
);

describe("useCoreModuleGoal", () => {
  test("loads the module of the same name next to the engine's kb.pl", () => {
    expect(useCoreModuleGoal("/opt/a/kibi-core/src/checks.pl")).toBe(
      "\\+ \\+ (module_property(kb, file(KibiKbFile)) -> file_directory_name(KibiKbFile, KibiCoreDir), directory_file_path(KibiCoreDir, 'checks.pl', KibiCoreModule), use_module(KibiCoreModule) ; use_module('/opt/a/kibi-core/src/checks.pl'))",
    );
  });

  test("normalizes Windows separators and quotes atoms", () => {
    const goal = useCoreModuleGoal("C:\\Users\\O'Hara\\core\\src\\it's.pl");
    expect(goal).toContain("directory_file_path(KibiCoreDir, 'it''s.pl',");
    expect(goal).toContain("use_module('C:/Users/O''Hara/core/src/it''s.pl')");
  });

  test("a path with no directory names the file itself", () => {
    expect(useCoreModuleGoal("checks.pl")).toContain(
      "directory_file_path(KibiCoreDir, 'checks.pl', KibiCoreModule)",
    );
  });
});

describe("useCoreModuleGoal against a second copy of the core", () => {
  // Two installs of one release share one engine. The engine has loaded
  // kb.pl and discovery.pl from copy A; a client of copy B asks for its own
  // discovery.pl.
  function runWithTwoCores(clientGoal: (moduleB: string) => string) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-two-cores-"));
    try {
      const coreA = path.join(dir, "a", "src");
      const coreB = path.join(dir, "b", "src");
      cpSync(CORE_SRC, coreA, { recursive: true });
      cpSync(CORE_SRC, coreB, { recursive: true });
      const quoted = (file: string) => `'${file.replaceAll("'", "''")}'`;
      const discoveryB = path.join(coreB, "discovery.pl");
      const goal = `use_module(${quoted(path.join(coreA, "kb.pl"))}), use_module(${quoted(path.join(coreA, "discovery.pl"))}), catch((${clientGoal(discoveryB)}, module_property(discovery, file(F)), format("loaded ~w~n", [F])), E, (print_message(error, E), format("error ~q~n", [E]))), halt`;
      const swipl = resolveSwipl();
      const result = spawnSync(swipl.bin, ["-q", "-g", goal, "-t", "halt(1)"], {
        encoding: "utf8",
        env: swiplChildEnv(swipl),
        timeout: 120_000,
      });
      return { stdout: result.stdout, coreA };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  test("a plain use_module of the client's copy is refused", () => {
    const { stdout } = runWithTwoCores(
      (moduleB) => `use_module('${moduleB.replaceAll("'", "''")}')`,
    );
    expect(stdout).toContain("permission_error(redefine,module,discovery)");
  }, 130_000);

  test("the goal loads the engine's own copy instead", () => {
    const { stdout, coreA } = runWithTwoCores((moduleB) =>
      useCoreModuleGoal(moduleB),
    );
    expect(stdout).toContain(`loaded ${path.join(coreA, "discovery.pl")}`);
    expect(stdout).not.toContain("error");
  }, 130_000);
});
