import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { type Tarballs, packAll } from "./helpers.js";
import {
  type TarballResult,
  resolveOpencodeTarball,
} from "./opencode-packed-utils.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

const REPO_ROOT = resolve(process.cwd());

/**
 * Forbidden literal strings that must never appear inside a packed artifact's
 * file content.  These indicate stale absolute paths leaked into generated
 * config, startup scripts, or compiled JS.
 */
const FORBIDDEN_PATTERNS = [
  "kibi-mcp@0.13.0",
  "node_modules/.pnpm/kibi-mcp@0.13.0",
  "/dist/server/session.js",
  "/dist/server/tools.js",
];

/**
 * Whitelisted fixture directory.
 *
 * Files whose resolved absolute path starts with this prefix are excluded from
 * forbidden-string scanning so that synthetic test payloads and regression
 * samples do not trigger CI failures.
 */
const FIXTURES_DIR = resolve(
  REPO_ROOT,
  "documentation/tests/e2e/packed/fixtures",
);

function isWhitelistedPath(filePath: string): boolean {
  return resolve(filePath).startsWith(FIXTURES_DIR);
}

// ---------------------------------------------------------------------------
// Scanner primitives
// ---------------------------------------------------------------------------

/**
 * Scan a single text string for any forbidden pattern.
 *
 * @returns The subset of FORBIDDEN_PATTERNS found inside `content`.
 */
function scanTextContent(filePath: string, content: string): string[] {
  if (isWhitelistedPath(filePath)) return [];
  return FORBIDDEN_PATTERNS.filter((p) => content.includes(p));
}

/**
 * List tarball entries, stripping the leading "package/" prefix that `npm
 * pack` bakes into archive paths.
 */
function listTarballEntries(tarballPath: string): string[] {
  const out = execFileSync("tar", ["-tzf", tarballPath], { encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => l.replace(/^package\//, ""));
}

/**
 * Extract a single entry from a tarball to stdout without writing to disk.
 */
function extractFromTarball(tarballPath: string, entryPath: string): string {
  const fullPath = entryPath.startsWith("package/")
    ? entryPath
    : `package/${entryPath}`;
  return execFileSync("tar", ["-xOzf", tarballPath, fullPath], {
    encoding: "utf8",
  });
}

/**
 * Decide which tarball entries are worth scanning for forbidden strings.
 *
 * Scans `package.json`, `bin/*` scripts, and compiled JS under `dist/`.
 */
function getScanTargets(entries: string[]): string[] {
  return entries.filter((e) => {
    if (e === "package.json") return true;
    if (e.startsWith("bin/")) return true;
    if (
      e.startsWith("dist/") &&
      (e.endsWith(".js") || e.endsWith(".mjs") || e.endsWith(".cjs"))
    ) {
      return true;
    }
    return false;
  });
}

// ---------------------------------------------------------------------------
// Export-integrity verification
// ---------------------------------------------------------------------------

function normalizeDeclaredPath(p: string): string {
  return p.replace(/^\.\//, "");
}

/**
 * Check that every path referenced by `main`, `bin`, and string-valued
 * `exports` entries in a package.json actually appears inside the tarball.
 *
 * For conditional subpath exports (e.g. `{ "types": …, "import": …,
 * "default": … }`) only the `types`, `import`, and `default` condition paths
 * are verified.
 */
function verifyExportsExistInTarball(
  entries: string[],
  pkgJson: Record<string, unknown>,
): string[] {
  const errors: string[] = [];

  // -- main --
  if (typeof pkgJson.main === "string") {
    const entryPath = normalizeDeclaredPath(pkgJson.main);
    if (!entries.includes(entryPath)) {
      errors.push(`main "${entryPath}" not found in tarball entries`);
    }
  }

  // -- bin --
  if (pkgJson.bin && typeof pkgJson.bin === "object") {
    for (const [name, binPath] of Object.entries(
      pkgJson.bin as Record<string, string>,
    )) {
      const entryPath = normalizeDeclaredPath(binPath);
      if (!entries.includes(entryPath)) {
        errors.push(
          `bin["${name}"] = "${entryPath}" not found in tarball entries`,
        );
      }
    }
  } else if (typeof pkgJson.bin === "string") {
    const entryPath = normalizeDeclaredPath(pkgJson.bin);
    if (!entries.includes(entryPath)) {
      errors.push(`bin "${entryPath}" not found in tarball entries`);
    }
  }

  // -- exports --
  const exports = pkgJson.exports;
  if (exports && typeof exports === "object") {
    for (const [subpath, value] of Object.entries(
      exports as Record<string, unknown>,
    )) {
      if (typeof value === "string") {
        // Simple string-valued export:  "." → "./dist/server.js"
        const entryPath = normalizeDeclaredPath(value);
        if (!entries.includes(entryPath)) {
          errors.push(
            `exports["${subpath}"] = "${entryPath}" not found in tarball entries`,
          );
        }
      } else if (value && typeof value === "object") {
        // Conditional subpath export:  "." → { types: …, import: …, default: … }
        for (const [cond, condPath] of Object.entries(
          value as Record<string, unknown>,
        )) {
          if (["types", "import", "default"].includes(cond)) {
            if (typeof condPath === "string") {
              const entryPath = normalizeDeclaredPath(condPath);
              if (!entries.includes(entryPath)) {
                errors.push(
                  `exports["${subpath}"].${cond} = "${entryPath}" not found in tarball entries`,
                );
              }
            }
          }
        }
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// One-shot scanner for a single tarball
// ---------------------------------------------------------------------------

interface ScanResult {
  violations: Record<string, string[]>;
  exportErrors: string[];
}

function scanTarball(tarballPath: string, pkgLabel: string): ScanResult {
  const entries = listTarballEntries(tarballPath);

  // Parse package.json from inside the tarball
  const pkgJsonRaw = extractFromTarball(tarballPath, "package.json");
  let pkgJson: Record<string, unknown>;
  try {
    pkgJson = JSON.parse(pkgJsonRaw);
  } catch (e) {
    throw new Error(
      `Failed to parse package.json from ${pkgLabel} tarball (${tarballPath}): ${(e as Error).message}`,
    );
  }

  // Scan relevant files for forbidden strings
  const scanTargets = getScanTargets(entries);
  const violations: Record<string, string[]> = {};
  for (const target of scanTargets) {
    const content = extractFromTarball(tarballPath, target);
    const found = scanTextContent(target, content);
    if (found.length > 0) {
      violations[target] = found;
    }
  }

  // Verify main / bin / exports integrity
  const exportErrors = verifyExportsExistInTarball(entries, pkgJson);

  return { violations, exportErrors };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed E2E: forbidden-path hygiene and export integrity",
    { timeout: 120000 },
    () => {
      let coreTarballs: Tarballs;
      let opencodeResult: TarballResult;

      before(
        async () => {
          coreTarballs = await packAll();
          opencodeResult = resolveOpencodeTarball();
        },
        { timeout: 120000 },
      );

      after(() => {
        // no-op; packing is read-only
      });

      // ---- Synthetic (unit) tests for the scanner itself ----

      it("forbidden-string scanner must reject known-bad content", () => {
        const badContent =
          'const x = "node_modules/.pnpm/kibi-mcp@0.13.0/dist/server/session.js";';
        const violations = scanTextContent(
          "/tmp/synthetic-test.js",
          badContent,
        );
        assert.ok(
          violations.length >= 1,
          `Expected at least 1 violation, got: ${JSON.stringify(violations)}`,
        );
        assert.ok(
          violations.some((v) =>
            v.includes("node_modules/.pnpm/kibi-mcp@0.13.0"),
          ),
          "Should detect pnpm-store stale path",
        );
      });

      it("scanner must whitelist fixture-prefix paths", () => {
        const fixtureContent = "node_modules/.pnpm/kibi-mcp@0.13.0";
        const fixturePath = join(
          FIXTURES_DIR,
          "synthetic-stale-path-fixture.js",
        );
        const violations = scanTextContent(fixturePath, fixtureContent);
        assert.deepStrictEqual(
          violations,
          [],
          "Whitelisted fixture file should produce no violations",
        );
      });

      // ---- Package-by-package tarball scans ----

      it("kibi-core tarball: no forbidden paths and all exports exist", () => {
        const { violations, exportErrors } = scanTarball(
          coreTarballs.core,
          "kibi-core",
        );
        assert.deepStrictEqual(
          violations,
          {},
          `Forbidden strings found in kibi-core tarball:\n${JSON.stringify(violations, null, 2)}`,
        );
        assert.deepStrictEqual(
          exportErrors,
          [],
          `Export integrity errors in kibi-core:\n${exportErrors.join("\n")}`,
        );
      });

      it("kibi-cli tarball: no forbidden paths and all exports exist", () => {
        const { violations, exportErrors } = scanTarball(
          coreTarballs.cli,
          "kibi-cli",
        );
        assert.deepStrictEqual(
          violations,
          {},
          `Forbidden strings found in kibi-cli tarball:\n${JSON.stringify(violations, null, 2)}`,
        );
        assert.deepStrictEqual(
          exportErrors,
          [],
          `Export integrity errors in kibi-cli:\n${exportErrors.join("\n")}`,
        );
      });

      it("kibi-mcp tarball: no forbidden paths and all exports exist", () => {
        const { violations, exportErrors } = scanTarball(
          coreTarballs.mcp,
          "kibi-mcp",
        );
        assert.deepStrictEqual(
          violations,
          {},
          `Forbidden strings found in kibi-mcp tarball:\n${JSON.stringify(violations, null, 2)}`,
        );
        assert.deepStrictEqual(
          exportErrors,
          [],
          `Export integrity errors in kibi-mcp:\n${exportErrors.join("\n")}`,
        );
      });

      it("kibi-opencode tarball: no forbidden paths and all exports exist", () => {
        const { violations, exportErrors } = scanTarball(
          opencodeResult.tarballPath,
          "kibi-opencode",
        );
        assert.deepStrictEqual(
          violations,
          {},
          `Forbidden strings found in kibi-opencode tarball:\n${JSON.stringify(violations, null, 2)}`,
        );
        assert.deepStrictEqual(
          exportErrors,
          [],
          `Export integrity errors in kibi-opencode:\n${exportErrors.join("\n")}`,
        );
      });
    },
  );
}
