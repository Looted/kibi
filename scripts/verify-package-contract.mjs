import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import semver from "semver";

const packageName = process.argv[2];
if (!packageName) {
  throw new Error(
    "Usage: node scripts/verify-package-contract.mjs <package-name>",
  );
}

const packageRoot = process.cwd();
const packageJson = JSON.parse(
  readFileSync(path.join(packageRoot, "package.json"), "utf8"),
);
if (packageJson.name !== packageName) {
  throw new Error(
    `Expected ${packageName} package, found ${packageJson.name ?? "unknown"}`,
  );
}

function resolvePackagePath(relativePath) {
  const normalized = relativePath.replace(/^\.\//, "");
  return path.join(packageRoot, normalized);
}

if (packageName === "kibi-cli") {
  const operationsExport = packageJson.exports?.["./operations"];
  if (typeof operationsExport !== "string") {
    throw new Error("kibi-cli must declare the ./operations export");
  }
  const operationsPath = resolvePackagePath(operationsExport);
  if (!existsSync(operationsPath)) {
    throw new Error(
      `Missing packed kibi-cli operations entrypoint: ${operationsPath}`,
    );
  }

  const operations = await import(pathToFileURL(operationsPath).href);
  if (typeof operations.executeApplyPlan !== "function") {
    throw new Error(
      "kibi-cli/operations is missing the executeApplyPlan export",
    );
  }
}

if (packageName === "kibi-mcp") {
  const serverPath = resolvePackagePath(packageJson.main ?? "./dist/server.js");
  if (!existsSync(serverPath)) {
    throw new Error(`Missing packed kibi-mcp server entrypoint: ${serverPath}`);
  }
  const launcherPath = resolvePackagePath(packageJson.bin?.["kibi-mcp"] ?? "");
  const launcherSource = readFileSync(launcherPath, "utf8");
  if (launcherSource.includes("../src/server.ts")) {
    throw new Error(
      "kibi-mcp launcher must not fall back to unpackaged src/server.ts",
    );
  }
  if (!launcherSource.includes("../dist/")) {
    throw new Error(
      "kibi-mcp launcher must resolve only compiled dist entrypoints",
    );
  }
  const cliRange = packageJson.dependencies?.["kibi-cli"];
  if (typeof cliRange !== "string") {
    throw new Error("kibi-mcp must declare a kibi-cli dependency range");
  }
  const cliManifestPath = path.resolve(packageRoot, "../cli/package.json");
  if (!existsSync(cliManifestPath)) {
    throw new Error(`Missing sibling kibi-cli manifest: ${cliManifestPath}`);
  }
  const cliManifest = JSON.parse(readFileSync(cliManifestPath, "utf8"));
  const cliVersion = cliManifest.version;
  if (
    typeof cliVersion !== "string" ||
    !semver.valid(cliVersion) ||
    !semver.satisfies(cliVersion, cliRange)
  ) {
    throw new Error(
      `kibi-mcp ${packageJson.version} requires kibi-cli ${cliRange}, but the current CLI is ${cliVersion ?? "unknown"}`,
    );
  }
  if (semver.satisfies("0.19.0", cliRange)) {
    throw new Error(
      `kibi-mcp dependency range ${cliRange} still accepts broken kibi-cli 0.19.0`,
    );
  }
}

console.error(
  `Verified package contract: ${packageName}@${packageJson.version}`,
);
