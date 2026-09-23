import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { packagesForPack } from "../../documentation/tests/e2e/packed/packed-packages.ts";
import {
  CI_PACK_DIRS,
  DEFAULT_INSTALL_DIRS,
  PACKAGE_CATALOG,
  PACKED_E2E_DIRS,
  PACK_ALL_DIRS,
  PUBLISHABLE_DIRS,
  dirsForSlice,
} from "../package-catalog.ts";

const ROOT = join(import.meta.dir, "..", "..");

describe("canonical package catalog", () => {
  test("publishable dirs include the three plugin packages and exclude zcode", () => {
    expect([...PUBLISHABLE_DIRS]).toEqual([
      "core",
      "plugin-sdk",
      "plugin-builtin",
      "plugin-jev",
      "runtime",
      "cli",
      "mcp",
      "opencode",
      "codex",
      "cursor",
    ]);
    expect(PUBLISHABLE_DIRS).not.toContain("zcode");
    expect(PACK_ALL_DIRS).toContain("zcode");
    expect(CI_PACK_DIRS).toEqual(PUBLISHABLE_DIRS);
  });

  test("default install excludes optional Jev", () => {
    expect(DEFAULT_INSTALL_DIRS).toContain("plugin-builtin");
    expect(DEFAULT_INSTALL_DIRS).toContain("plugin-sdk");
    expect(DEFAULT_INSTALL_DIRS).not.toContain("plugin-jev");
    const jev = PACKAGE_CATALOG.find((entry) => entry.dir === "plugin-jev");
    expect(jev?.optional).toBe(true);
    expect(jev?.includedInDefaultInstall).toBe(false);
  });

  test("packed e2e pack list matches the canonical CI pack slice", () => {
    expect([...packagesForPack].sort()).toEqual([...PACKED_E2E_DIRS].sort());
    expect(dirsForSlice("packed-e2e")).toEqual([...PACKED_E2E_DIRS]);
  });

  test("hard-coded workflow pack loops are replaced by the catalog pack script", () => {
    const ci = readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8");
    const publish = readFileSync(
      join(ROOT, ".github/workflows/publish.yml"),
      "utf8",
    );
    const dockerfile = readFileSync(
      join(ROOT, "docker/test-runner.Dockerfile"),
      "utf8",
    );
    const entrypoint = readFileSync(
      join(ROOT, "scripts/docker/entrypoint.sh"),
      "utf8",
    );
    expect(ci).toContain("scripts/pack-packages.ts --slice ci-pack");
    expect(publish).toContain("scripts/pack-packages.ts --slice publishable");
    expect(dockerfile).toContain("scripts/pack-packages.ts --slice packed-e2e");
    expect(entrypoint).toContain("scripts/pack-packages.ts --slice packed-e2e");
    expect(ci).not.toContain("cd ../cursor && npm pack");
    expect(ci).not.toContain("const dirs = ['core', 'runtime', 'cli'");
  });

  test("CLI and MCP default dependency trees exclude Jev", () => {
    const cli = JSON.parse(
      readFileSync(join(ROOT, "packages/cli/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const mcp = JSON.parse(
      readFileSync(join(ROOT, "packages/mcp/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(cli.dependencies?.["kibi-plugin-jev"]).toBeUndefined();
    expect(mcp.dependencies?.["kibi-plugin-jev"]).toBeUndefined();
    expect(cli.dependencies?.["kibi-plugin-builtin"]).toBeDefined();
  });

  test("packed default-install manifest matches the catalog and excludes Jev", () => {
    const manifest = readFileSync(
      join(ROOT, "documentation/tests/e2e/packed/packed-install-manifest.ts"),
      "utf8",
    );
    for (const dir of DEFAULT_INSTALL_DIRS) {
      const entry = PACKAGE_CATALOG.find((item) => item.dir === dir);
      expect(entry).toBeDefined();
      expect(manifest).toContain(`"${entry?.npmName}"`);
    }
    expect(manifest).not.toContain("kibi-plugin-jev");
    expect(manifest).not.toContain("kibi-zcode");
  });
});
