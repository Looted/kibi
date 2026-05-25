/**
 * Build-time script that reads all four Kibi package.json files
 * and writes a consolidated dist/version-metadata.json.
 *
 * Runs as part of the opencode build pipeline (after tsc, before build-tui).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readVersion(pkgPath: string): string {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      version?: unknown;
    };
    return typeof pkg.version === "string" ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
}

const opencodeVer = readVersion(join(__dirname, "../package.json"));
const mcpVer = readVersion(join(__dirname, "../../mcp/package.json"));
const cliVer = readVersion(join(__dirname, "../../cli/package.json"));
const coreVer = readVersion(join(__dirname, "../../core/package.json"));

const metadata = {
  opencode: opencodeVer,
  mcp: mcpVer,
  cli: cliVer,
  core: coreVer,
};

const distDir = join(__dirname, "../dist");
mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, "version-metadata.json"), JSON.stringify(metadata));
