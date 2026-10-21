import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { probeFixtureReadiness } from "../fixture-readiness";
import { RequiredMcpStartupError } from "../runtime/canary-errors";
import { stageRuntimePackage } from "../runtime/staged-mcp";
import { symbolProbeFailure } from "../runtime/symbol-capability-probe";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function writePackage(
  directory: string,
  manifest: Record<string, unknown>,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "package.json"), JSON.stringify(manifest));
  await writeFile(join(directory, "index.js"), "module.exports = 1;\n");
}

describe("staged runtime packages", () => {
  test("stages a dependency closure, nesting a conflicting version", async () => {
    // Given an install where the root package and its dependency need
    // different versions of one shared package
    const install = await temporaryRoot("skillopt-stage-install-");
    const consumer = join(install, "consumer");
    await mkdir(consumer);
    await writePackage(join(install, "node_modules/root-pkg"), {
      name: "root-pkg",
      version: "1.0.0",
      dependencies: { shared: "^1.0.0", middle: "^1.0.0" },
      optionalDependencies: { "not-installed": "^1.0.0" },
    });
    await writePackage(join(install, "node_modules/shared"), {
      name: "shared",
      version: "1.0.0",
    });
    await writePackage(join(install, "node_modules/middle"), {
      name: "middle",
      version: "1.0.0",
      dependencies: { shared: "^2.0.0" },
    });
    await writePackage(
      join(install, "node_modules/middle/node_modules/shared"),
      {
        name: "shared",
        version: "2.0.0",
      },
    );
    const staged = await temporaryRoot("skillopt-stage-root-");

    // When the root package is staged
    await stageRuntimePackage("root-pkg", consumer, staged);

    // Then each package resolves the version its own install resolved
    const version = async (path: string) =>
      (
        JSON.parse(await readFile(join(staged, path), "utf8")) as {
          version: string;
        }
      ).version;
    expect(await version("node_modules/root-pkg/package.json")).toBe("1.0.0");
    expect(await version("node_modules/shared/package.json")).toBe("1.0.0");
    expect(await version("node_modules/middle/package.json")).toBe("1.0.0");
    expect(
      await version("node_modules/middle/node_modules/shared/package.json"),
    ).toBe("2.0.0");
    expect(existsSync(join(staged, "node_modules/not-installed"))).toBe(false);
  });

  test("refuses to stage a required package that is not installed", async () => {
    const consumer = await temporaryRoot("skillopt-stage-missing-");
    const staged = await temporaryRoot("skillopt-stage-missing-root-");
    await expect(
      stageRuntimePackage("absent-package-for-test", consumer, staged),
    ).rejects.toThrow("required_mcp_startup:missing_runtime_package");
  });
});

describe("symbol capability probe", () => {
  test("rejects a dry run that reports a module-load failure as invalid", () => {
    const failure = symbolProbeFailure("kb_upsert", {
      content: [
        {
          type: "text",
          text: "kb_validate_upsert: payload is invalid. Cannot find module 'ts-morph'",
        },
      ],
      structuredContent: {
        status: "error",
        data: { valid: false, dryRun: true },
      },
    });
    expect(failure).toContain("symbol_capability:kb_upsert:");
    expect(failure).toContain("Cannot find module 'ts-morph'");
  });

  test("rejects a coverage error and accepts success envelopes", () => {
    expect(
      symbolProbeFailure("kb_coverage", {
        content: [{ type: "text", text: "Coverage execution failed" }],
        isError: true,
      }),
    ).toBe("symbol_capability:kb_coverage:Coverage execution failed");
    expect(
      symbolProbeFailure("kb_coverage", {
        content: [],
        structuredContent: { status: "success", data: { rows: [] } },
      }),
    ).toBeNull();
    expect(
      symbolProbeFailure("kb_upsert", {
        content: [],
        structuredContent: { status: "success", data: { valid: true } },
      }),
    ).toBeNull();
  });

  test("readiness probes the runtime after setup stops, and cleans up on failure", async () => {
    const root = await temporaryRoot("skillopt-readiness-runtime-");
    const workspace = join(root, "probe");
    const events: string[] = [];
    await expect(
      probeFixtureReadiness(workspace, "/trusted/source/packages/cli", {
        setup: async () => {
          events.push("setup");
        },
        stop: async () => {
          events.push("stop");
        },
        probeRuntime: async (path, sourceWorktree) => {
          expect(path).toBe(workspace);
          expect(sourceWorktree).toBe("/trusted/source");
          events.push("probe");
          throw new RequiredMcpStartupError("symbol_capability:kb_coverage");
        },
      }),
    ).rejects.toThrow("required_mcp_startup:symbol_capability:kb_coverage");
    expect(events).toEqual(["setup", "stop", "probe", "stop"]);
    expect(existsSync(workspace)).toBe(false);
  });

  test("the staged runtime upserts a symbol dry run and reports coverage", async () => {
    // Given the built CLI and MCP server of this worktree
    const repository = resolve(import.meta.dir, "../../..");
    if (!existsSync(join(repository, "packages/mcp/dist/server.js"))) {
      throw new Error("build packages/mcp before running this test");
    }
    const root = await temporaryRoot("skillopt-readiness-symbols-");

    // When the default readiness probe seeds a fixture and probes the runtime
    // Then it completes without a capability failure
    await probeFixtureReadiness(
      join(root, "probe"),
      join(repository, "packages/cli"),
    );
  }, 240_000);
});
