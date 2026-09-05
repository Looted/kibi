// implements REQ-cli-doctor
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import * as nodeModule from "node:module";
import path from "node:path";
import { doctorCommand } from "../../src/commands/doctor.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  makeExecutable,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
  writeHook,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Doctor fixtures do not always start an engine.
    }
    removeTempDir(root);
  }
});

function preparedWorkspace(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

function writeOkManifest(cwd: string): void {
  mkdirSync(path.join(cwd, ".kb"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "manifest.json"),
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion: 5,
      semanticAdvisorBackfill: "not_applicable",
    }),
  );
}

function cliPackagePath(): string {
  return path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../../package.json",
  );
}

describe("doctorCommand remaining runtime branches", () => {
  test("reports a missing manifest when .kb exists without lifecycle state", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("Not found");
  });

  test("reports leftover knowledge files outside the canonical .kb layout", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mkdirSync(path.join(cwd, "documentation", "requirements"), {
      recursive: true,
    });
    writeFileSync(
      path.join(cwd, "documentation", "requirements", "REQ-1.md"),
      `---
id: REQ-1
title: Auth
status: open
---
`,
    );
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "table" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("legacy knowledge file");
    expect(io.logText()).toContain("kibi migrate --yes");
  });

  test("treats optional hooks as passing when none of the companion hooks exist", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("Not installed (optional)");
  });

  test("fails a pre-commit hook that invokes kibi but is not executable", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check --staged\n");
    writeHook(cwd, "post-rewrite", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("Installed but not executable");
  });

  test("reports pre-commit and post-rewrite permission failures when reads throw", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check --staged\n");
    writeHook(cwd, "post-rewrite", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const file = String(target);
      if (
        file.includes(`${path.sep}pre-commit`) ||
        file.includes(`${path.sep}post-rewrite`)
      ) {
        throw new Error("EACCES");
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("Unable to check hook permissions or read content");
  });

  test("emits a caret-range mismatch when the installed CLI is older than MCP's range", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, () => initCommand({}));
    process.env.KIBI_PACKAGE_VERSIONS = "cli=1.2.3";
    restores.push(() => {
      Reflect.deleteProperty(process.env, "KIBI_PACKAGE_VERSIONS");
    });
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const file = String(target);
      if (file === cliPackagePath() || file.endsWith(`${path.sep}cli${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-cli",
          version: "1.2.3",
          dependencies: { "kibi-core": "^1.0.0" },
        });
      }
      if (file.includes(`${path.sep}mcp${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-mcp",
          version: "1.2.3",
          main: "dist/server.js",
          dependencies: { "kibi-cli": "^1.2.4" },
        });
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toMatch(
      /package-mcp-cli-range-mismatch|package-cli-export-surface-drift/,
    );
  });

  test("treats a non-caret MCP range as satisfied and an unparseable CLI version as a mismatch", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const file = String(target);
      if (file.endsWith(`${path.sep}cli${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-cli",
          version: "dev-local",
          dependencies: { "kibi-core": "^1.0.0" },
        });
      }
      if (file.includes(`${path.sep}mcp${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-mcp",
          version: "1.0.0",
          main: "dist/server.js",
          dependencies: { "kibi-cli": "workspace:*" },
        });
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const first = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(first.exitCode).toBe(0);
    expect(io.logText()).not.toContain("package-mcp-cli-range-mismatch");

    read.mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const file = String(target);
      if (file.endsWith(`${path.sep}cli${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-cli",
          version: "dev-local",
          dependencies: { "kibi-core": "^1.0.0" },
        });
      }
      if (file.includes(`${path.sep}mcp${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-mcp",
          version: "1.0.0",
          main: "dist/server.js",
          dependencies: { "kibi-cli": "^1.0.0" },
        });
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(io.logText()).toContain("package-mcp-cli-range-mismatch");
  });

  test("accepts a newer minor/patch on the same caret major", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const file = String(target);
      if (file.endsWith(`${path.sep}cli${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-cli",
          version: "1.3.9",
          dependencies: { "kibi-core": "^1.0.0" },
        });
      }
      if (file.includes(`${path.sep}mcp${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-mcp",
          version: "1.0.0",
          main: "dist/server.js",
          dependencies: { "kibi-cli": "^1.2.3" },
        });
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).not.toContain("package-mcp-cli-range-mismatch");
  });

  test("keeps doctor JSON useful when the CLI package manifest is unreadable", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const file = String(target);
      if (file.endsWith(`${path.sep}cli${path.sep}package.json`)) {
        throw new Error("packed entrypoint");
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(io.logText());
    expect(payload.runtime.cliVersion).toBe("unknown");
    expect(payload.runtime.coreRange).toBe("unknown");
    expect(payload.migrationPlan.actions.some((action: { id: string }) =>
      action.id === "package-provenance-unresolved",
    )).toBe(true);
  });

  test("walks from an entrypoint when package.json exports are hidden", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const coreRoot = path.join(cwd, "hidden-core");
    mkdirSync(path.join(coreRoot, "dist"), { recursive: true });
    writeFileSync(
      path.join(coreRoot, "package.json"),
      JSON.stringify({
        name: "kibi-core",
        version: "9.9.9",
        main: "dist/index.js",
        dependencies: {},
      }),
    );
    writeFileSync(path.join(coreRoot, "dist", "index.js"), "export {}\n");
    writeFileSync(path.join(coreRoot, "dist", "package.json"), "{not json");
    const fakeRequire = Object.assign(
      (id: string) => {
        if (id === "kibi-core") return {};
        throw new Error(`cannot load ${id}`);
      },
      {
        resolve: (id: string) => {
          if (id === "kibi-core/package.json") {
            throw new Error("hidden exports");
          }
          if (id === "kibi-core") {
            return path.join(coreRoot, "dist", "index.js");
          }
          throw new Error(`missing ${id}`);
        },
      },
    );
    const create = spyOn(nodeModule, "createRequire").mockReturnValue(
      fakeRequire as never,
    );
    restores.push(() => create.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("9.9.9");
  });

  test("reports unresolved provenance when no installed package graph exists", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const fakeRequire = Object.assign(
      () => {
        throw new Error("absent");
      },
      {
        resolve: () => {
          throw new Error("absent");
        },
      },
    );
    const create = spyOn(nodeModule, "createRequire").mockReturnValue(
      fakeRequire as never,
    );
    restores.push(() => create.mockRestore());
    const originalExists = fs.existsSync;
    const exists = spyOn(fs, "existsSync").mockImplementation(((
      target: fs.PathLike,
    ) => {
      const file = String(target);
      if (
        file.endsWith(`${path.sep}core${path.sep}package.json`) ||
        file.endsWith(`${path.sep}mcp${path.sep}package.json`)
      ) {
        return false;
      }
      return originalExists(target);
    }) as typeof fs.existsSync);
    restores.push(() => exists.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("package-provenance-unresolved");
  });

  test("treats a local sibling manifest without a usable version as unknown", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const fakeRequire = Object.assign(
      () => {
        throw new Error("absent");
      },
      {
        resolve: () => {
          throw new Error("absent");
        },
      },
    );
    const create = spyOn(nodeModule, "createRequire").mockReturnValue(
      fakeRequire as never,
    );
    restores.push(() => create.mockRestore());
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const file = String(target);
      if (file.endsWith(`${path.sep}cli${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-cli",
          version: 12,
          dependencies: "not-an-object",
        });
      }
      if (
        file.endsWith(`${path.sep}core${path.sep}package.json`) ||
        file.endsWith(`${path.sep}mcp${path.sep}package.json`)
      ) {
        return JSON.stringify({
          name: file.includes(`${path.sep}mcp${path.sep}`)
            ? "kibi-mcp"
            : "kibi-core",
          main: 0,
          dependencies: ["bad"],
        });
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(
      io.logs.find((line) => line.includes("kibi.doctor.v1")) ?? io.logText(),
    );
    expect(payload.runtime.cliVersion).toBe("unknown");
    expect(payload.runtime.coreVersion).toBe("unknown");
  });

  test("still reports a passing SWI-Prolog check when execSync returns a 9.x banner", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const originalExec = childProcess.execSync;
    const exec = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
      options?: unknown,
    ) => {
      if (String(command).includes("swipl")) {
        return "SWI-Prolog version 9.2 (threaded)\n";
      }
      return originalExec(command, options as never);
    }) as typeof childProcess.execSync);
    restores.push(() => exec.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("version 9.2");
  });

  test("reports json failure when only one of post-checkout or post-merge exists", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("Partially installed");
  });

  test("fails a pre-commit hook that does not mention kibi", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", "#!/bin/sh\necho lint && exit 0\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("does not invoke kibi");
  });

  test("fails SWI-Prolog when execSync returns an 8.x banner", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const originalExec = childProcess.execSync;
    const exec = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
      options?: unknown,
    ) => {
      if (String(command).includes("swipl")) {
        return "SWI-Prolog version 8.4 (threaded)\n";
      }
      return originalExec(command, options as never);
    }) as typeof childProcess.execSync);
    restores.push(() => exec.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("Version 8.x found");
  });

  test("fails SWI-Prolog when the version banner cannot be parsed", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const originalExec = childProcess.execSync;
    const exec = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
      options?: unknown,
    ) => {
      if (String(command).includes("swipl")) {
        return "SWI-Prolog (threaded, 64 bits, version unknown)\n";
      }
      return originalExec(command, options as never);
    }) as typeof childProcess.execSync);
    restores.push(() => exec.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("Unable to parse version");
  });

  test("emits an export-surface review action when executeApplyPlan is not a function", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const operations = await import("../../src/public/operations/index.js");
    const original = operations.executeApplyPlan;
    Object.defineProperty(operations, "executeApplyPlan", {
      value: 1,
      configurable: true,
    });
    restores.push(() => {
      Object.defineProperty(operations, "executeApplyPlan", {
        value: original,
        configurable: true,
      });
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("package-cli-export-surface-drift");
  });
});
