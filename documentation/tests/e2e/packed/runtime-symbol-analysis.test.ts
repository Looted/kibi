import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed E2E: relocated runtime preserves ts-morph analysis",
    { timeout: 240000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;

      before(
        async () => {
          if (process.env.CI === "true") {
            assert.ok(
              process.env.KIBI_TEST_TARBALLS,
              "CI relocation coverage must use package artifacts from the build job",
            );
            assert.equal(
              existsSync(join(process.cwd(), "node_modules", ".bun")),
              false,
              "the consumer job must not have the build job's Bun dependency tree",
            );
          }
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
        },
        { timeout: 240000 },
      );

      after(
        async () => {
          await sandbox?.cleanup();
        },
        { timeout: 60000 },
      );

      it("ships runtime dependencies for the external builtin plugin", () => {
        const runtimePackage = JSON.parse(
          execFileSync(
            "tar",
            ["-xOzf", tarballs.runtime, "package/package.json"],
            {
              encoding: "utf8",
            },
          ),
        ) as {
          dependencies?: Record<string, string>;
        };
        const pluginPackage = JSON.parse(
          execFileSync(
            "tar",
            ["-xOzf", tarballs["plugin-builtin"], "package/package.json"],
            { encoding: "utf8" },
          ),
        ) as {
          dependencies?: Record<string, string>;
        };

        assert.equal(
          runtimePackage.dependencies?.["kibi-plugin-builtin"],
          "^0.1.0",
        );
        assert.equal(pluginPackage.dependencies?.["ts-morph"], "^23.0.0");
      });

      it("keeps build-machine ts-morph paths out of the runtime bundle", () => {
        const bundle = execFileSync(
          "tar",
          ["-xOzf", tarballs.runtime, "package/dist/index.js"],
          { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
        );
        const embeddedPaths = Array.from(
          bundle.matchAll(
            /(?:__dirname|__filename)\s*=\s*["']([^"']*(?:@ts-morph|typescript)[^"']*)["']/g,
          ),
          (match) => match[1] ?? "",
        );

        if (process.env.CI === "true") {
          assert.ok(
            process.env.KIBI_TEST_TARBALLS,
            "CI relocation coverage must use package artifacts from the build job",
          );
          for (const buildPath of embeddedPaths) {
            assert.equal(
              existsSync(buildPath),
              false,
              `consumer runner unexpectedly has build-tree resource ${buildPath}`,
            );
          }
        }

        assert.deepEqual(
          embeddedPaths,
          [],
          "runtime must not bake absolute ts-morph or TypeScript paths into its bundle",
        );
        assert.match(
          bundle,
          /from ["']kibi-plugin-builtin["']/,
          "runtime should resolve the builtin plugin through its package boundary",
        );
      });

      it("analyzes TypeScript symbols from the clean packed consumer install", async () => {
        const runtimeEntry = join(
          sandbox.npmPrefix,
          "node_modules",
          "kibi-runtime",
          "dist",
          "index.js",
        );
        const analysisScript = `
          import { analyzeSourceText } from ${JSON.stringify(pathToFileURL(runtimeEntry).href)};
          const result = analyzeSourceText(
            "src/greeting.ts",
            [
              "export function greet(name: string): string {",
              "  return 'Hello, ' + name;",
              "}",
            ].join("\\n"),
          );
          process.stdout.write(JSON.stringify(result));
        `;
        const result = JSON.parse(
          execFileSync(
            process.execPath,
            ["--input-type=module", "--eval", analysisScript],
            {
              cwd: sandbox.npmPrefix,
              env: sandbox.env,
              encoding: "utf8",
            },
          ),
        ) as {
          providerId: string | null;
          symbols: Array<{ name: string; kind: string; startLine: number }>;
        };

        assert.equal(result.providerId, "ts-morph");
        assert.deepEqual(
          result.symbols.map(({ name, kind, startLine }) => ({
            name,
            kind,
            startLine,
          })),
          [{ name: "greet", kind: "function", startLine: 1 }],
        );
      });
    },
  );
}
