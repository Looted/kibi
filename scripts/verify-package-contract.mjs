import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const packageName = process.argv[2];
if (!packageName) {
  throw new Error(
    "Usage: node scripts/verify-package-contract.mjs <package-name>",
  );
}

const packageRoot = process.cwd();
// This verifier is invoked from individual package prepack hooks. Resolve its
// development-only semver dependency from that package, not from this shared
// script's directory, so a clean consumer checkout does not need a root copy.
const requireFromPackage = createRequire(
  path.join(packageRoot, "package.json"),
);
const semver = requireFromPackage("semver");
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
  const runtimeRange = packageJson.dependencies?.["kibi-runtime"];
  if (typeof runtimeRange !== "string") {
    throw new Error("kibi-mcp must declare a kibi-runtime dependency range");
  }
  const runtimeManifestPath = path.resolve(
    packageRoot,
    "../runtime/package.json",
  );
  if (!existsSync(runtimeManifestPath)) {
    throw new Error(
      `Missing sibling kibi-runtime manifest: ${runtimeManifestPath}`,
    );
  }
  const runtimeManifest = JSON.parse(readFileSync(runtimeManifestPath, "utf8"));
  const runtimeVersion = runtimeManifest.version;
  if (
    typeof runtimeVersion !== "string" ||
    !semver.valid(runtimeVersion) ||
    !semver.satisfies(runtimeVersion, runtimeRange)
  ) {
    throw new Error(
      `kibi-mcp ${packageJson.version} requires kibi-runtime ${runtimeRange}, but the current runtime is ${runtimeVersion ?? "unknown"}`,
    );
  }
  if (semver.satisfies("0.0.0", runtimeRange)) {
    throw new Error(
      `kibi-mcp dependency range ${runtimeRange} is too broad for a versioned runtime contract`,
    );
  }
}

console.error(
  `Verified package contract: ${packageName}@${packageJson.version}`,
);
