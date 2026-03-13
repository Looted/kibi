import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { type Tarballs, packAll } from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed E2E: verify tarball contents (core present)",
    { timeout: 120000 },
    () => {
      let tarballs: Tarballs;

      before(
        async () => {
          // Produce tarballs for core, cli and mcp
          tarballs = await packAll();
        },
        { timeout: 120000 },
      );

      after(() => {
        // no-op; packing is read-only
      });

      it("kibi-core tarball must contain src/kb.pl and .pl runtime files", () => {
        const tgz = tarballs.core;
        assert.ok(
          tgz.endsWith(".tgz"),
          `Expected core tarball path, got: ${tgz}`,
        );

        // List tarball contents without extracting
        const out = execFileSync("tar", ["-tzf", tgz], { encoding: "utf8" });
        const entries = out.split("\n").map((l) => l.replace(/^package\//, ""));

        const required = ["src/kb.pl"];
        // also accept any other .pl files under src/
        const hasPlFiles = entries.some(
          (e) => e.startsWith("src/") && e.endsWith(".pl"),
        );

        for (const r of required) {
          if (!entries.includes(r)) {
            throw new Error(
              `Missing required file '${r}' in kibi-core tarball (${tgz})`,
            );
          }
        }

        if (!hasPlFiles) {
          throw new Error(
            `No Prolog (.pl) files found under src/ in kibi-core tarball (${tgz})`,
          );
        }
      });

      it("kibi-cli tarball must contain bin/kibi, dist/cli.js and declare dependency on kibi-core", () => {
        const tgz = tarballs.cli;
        assert.ok(
          tgz.endsWith(".tgz"),
          `Expected cli tarball path, got: ${tgz}`,
        );

        const out = execFileSync("tar", ["-tzf", tgz], { encoding: "utf8" });
        const entries = out.split("\n").map((l) => l.replace(/^package\//, ""));

        const required = ["bin/kibi", "dist/cli.js", "package.json"];
        for (const r of required) {
          if (!entries.includes(r)) {
            throw new Error(
              `Missing required file '${r}' in kibi-cli tarball (${tgz})`,
            );
          }
        }

        // Inspect package.json inside the tarball to ensure it lists kibi-core as dependency
        const pkgJsonRaw = execFileSync(
          "tar",
          ["-xOzf", tgz, "package/package.json"],
          { encoding: "utf8" },
        );
        let pkg: {
          dependencies?: Record<string, string>;
          peerDependencies?: Record<string, string>;
        };
        try {
          pkg = JSON.parse(pkgJsonRaw);
        } catch (e) {
          throw new Error(
            `Failed to parse package.json from kibi-cli tarball (${tgz}): ${(e as Error).message}`,
          );
        }

        const deps = {
          ...(pkg.dependencies || {}),
          ...(pkg.peerDependencies || {}),
        };
        if (!deps["kibi-core"]) {
          throw new Error(
            `kibi-cli package.json does not declare dependency on 'kibi-core' (found: ${Object.keys(deps).join(", ")})`,
          );
        }
      });

      it("kibi-mcp tarball must contain bin/kibi-mcp and dist/server.js", () => {
        const tgz = tarballs.mcp;
        assert.ok(
          tgz.endsWith(".tgz"),
          `Expected mcp tarball path, got: ${tgz}`,
        );

        const out = execFileSync("tar", ["-tzf", tgz], { encoding: "utf8" });
        const entries = out.split("\n").map((l) => l.replace(/^package\//, ""));

        const required = ["bin/kibi-mcp", "dist/server.js"];
        for (const r of required) {
          if (!entries.includes(r)) {
            throw new Error(
              `Missing required file '${r}' in kibi-mcp tarball (${tgz})`,
            );
          }
        }
      });

      // Ensure this test runs before install-smoke by naming and ordering convention used in suite
    },
  );
}
