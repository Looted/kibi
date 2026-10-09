import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writePackedInstallManifest } from "../../documentation/tests/e2e/packed/packed-install-manifest.ts";
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
  test("publishable dirs include the resolver and platform packages, in dependency order, and exclude zcode", () => {
    expect([...PUBLISHABLE_DIRS]).toEqual([
      "core",
      "plugin-sdk",
      "agent-core",
      "plugin-builtin",
      "plugin-jev",
      "plugin-ui",
      "swipl-linux-x64-gnu",
      "swipl-linux-arm64-gnu",
      "swipl-darwin-arm64",
      "swipl-darwin-x64",
      "swipl",
      "plugin-treesitter",
      "runtime",
      "cli",
      "mcp",
      "opencode",
      "codex",
      "cursor",
    ]);
    expect(PUBLISHABLE_DIRS).not.toContain("zcode");
    expect(PACK_ALL_DIRS).toContain("zcode");
  });

  test("platform packages are published but never packed without their verified payload", () => {
    const platform = PACKAGE_CATALOG.filter((entry) =>
      entry.dir.startsWith("swipl-"),
    );
    expect(platform.map((entry) => entry.npmName)).toEqual([
      "kibi-swipl-linux-x64-gnu",
      "kibi-swipl-linux-arm64-gnu",
      "kibi-swipl-darwin-arm64",
      "kibi-swipl-darwin-x64",
    ]);
    for (const { dir } of platform) {
      // Release packing (publishable) and cleanup include them; every slice
      // that packs straight from a checkout, where the payload is absent,
      // does not.
      expect(dirsForSlice("publishable")).toContain(dir);
      expect(dirsForSlice("tarball-clean")).toContain(dir);
      for (const slice of [
        "pack-all",
        "packed-e2e",
        "ci-pack",
        "default-install",
      ] as const) {
        expect(dirsForSlice(slice)).not.toContain(dir);
      }
    }
    expect(CI_PACK_DIRS).toEqual(
      PUBLISHABLE_DIRS.filter((dir) => !dir.startsWith("swipl-")),
    );
  });

  test("default install excludes optional plugins", () => {
    expect(DEFAULT_INSTALL_DIRS).toContain("plugin-builtin");
    expect(DEFAULT_INSTALL_DIRS).toContain("plugin-sdk");
    expect(DEFAULT_INSTALL_DIRS).not.toContain("plugin-jev");
    const jev = PACKAGE_CATALOG.find((entry) => entry.dir === "plugin-jev");
    expect(jev?.optional).toBe(true);
    expect(jev?.includedInDefaultInstall).toBe(false);
    expect(DEFAULT_INSTALL_DIRS).not.toContain("plugin-treesitter");
    const treeSitter = PACKAGE_CATALOG.find(
      (entry) => entry.dir === "plugin-treesitter",
    );
    expect(treeSitter?.optional).toBe(true);
    expect(treeSitter?.includedInDefaultInstall).toBe(false);
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

  test("CLI and MCP default dependency trees exclude optional plugins", () => {
    const cli = JSON.parse(
      readFileSync(join(ROOT, "packages/cli/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const mcp = JSON.parse(
      readFileSync(join(ROOT, "packages/mcp/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(cli.dependencies?.["kibi-plugin-jev"]).toBeUndefined();
    expect(mcp.dependencies?.["kibi-plugin-jev"]).toBeUndefined();
    expect(cli.dependencies?.["kibi-plugin-treesitter"]).toBeUndefined();
    expect(mcp.dependencies?.["kibi-plugin-treesitter"]).toBeUndefined();
    expect(cli.dependencies?.["kibi-plugin-builtin"]).toBeDefined();
  });

  test("packed default-install manifest matches the catalog and excludes optional plugins", () => {
    const prefix = mkdtempSync(join(tmpdir(), "kibi-package-catalog-"));
    const tarballs = Object.fromEntries(
      PACK_ALL_DIRS.map((dir) => [dir, join(prefix, `${dir}.tgz`)]),
    ) as unknown as Parameters<typeof writePackedInstallManifest>[1];

    try {
      writePackedInstallManifest(prefix, tarballs);
      const manifest = JSON.parse(
        readFileSync(join(prefix, "package.json"), "utf8"),
      ) as { dependencies: Record<string, string> };
      const expectedPackages = DEFAULT_INSTALL_DIRS.map((dir) => {
        const entry = PACKAGE_CATALOG.find((item) => item.dir === dir);
        expect(entry).toBeDefined();
        return entry?.npmName;
      }).sort();

      expect(Object.keys(manifest.dependencies).sort()).toEqual(
        expectedPackages,
      );
      expect(manifest.dependencies["kibi-plugin-jev"]).toBeUndefined();
      expect(manifest.dependencies["kibi-plugin-treesitter"]).toBeUndefined();
      expect(manifest.dependencies["kibi-zcode"]).toBeUndefined();
    } finally {
      rmSync(prefix, { recursive: true, force: true });
    }
  });
});
