import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { builtinModules, createRequire } from "node:module";
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

if (packageName === "kibi-runtime") {
  // The runtime bundles CLI sources at build time, so a pack without a fresh
  // build would ship whatever stale dist happened to be on disk.
  for (const relativePath of [
    packageJson.main ?? "./dist/index.js",
    "./dist/engine-daemon.js",
    "./dist/skills",
  ]) {
    const entryPath = resolvePackagePath(relativePath);
    if (!existsSync(entryPath)) {
      throw new Error(`Missing packed kibi-runtime artifact: ${entryPath}`);
    }
  }
}

if (packageName === "kibi-mcp") {
  const serverPath = resolvePackagePath(packageJson.main ?? "./dist/server.js");
  if (!existsSync(serverPath)) {
    throw new Error(`Missing packed kibi-mcp server entrypoint: ${serverPath}`);
  }
  const sessionPath = resolvePackagePath("./dist/server/session.js");
  if (!existsSync(sessionPath)) {
    throw new Error(`Missing packed kibi-mcp server module: ${sessionPath}`);
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

/**
 * Module specifiers a packed file loads by package name: static imports and
 * re-exports, side-effect imports and literal dynamic imports. Comment lines
 * are skipped, so a doc example of `import("x")` is not a dependency.
 */
const BARE_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)["']((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:\/[A-Za-z0-9._/-]*)?)["']/gm;

function bareImportPackages(source) {
  const names = new Set();
  const code = source
    .split("\n")
    .filter((line) => !/^\s*(?:\/\/|\*|\/\*)/.test(line))
    .join("\n");
  for (const match of code.matchAll(BARE_IMPORT)) {
    const specifier = match[1];
    const parts = specifier.split("/");
    const name = specifier.startsWith("@")
      ? parts.slice(0, 2).join("/")
      : parts[0];
    names.add(name);
  }
  return names;
}

function packedScripts(entry, files) {
  if (!existsSync(entry)) return;
  if (statSync(entry).isDirectory()) {
    for (const child of readdirSync(entry)) {
      packedScripts(path.join(entry, child), files);
    }
  } else if (/\.[cm]?js$/.test(entry)) {
    files.push(entry);
  }
}

// A package that imports another by name must declare it: a devDependency
// resolves inside the workspace but is not installed for a consumer, so the
// published package fails to load (kibi-mcp once imported kibi-cli this way).
{
  const declared = new Set([
    packageJson.name,
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);
  const builtins = new Set(builtinModules);
  const files = [];
  for (const entry of packageJson.files ?? []) {
    packedScripts(resolvePackagePath(entry), files);
  }
  const undeclared = [];
  for (const file of files) {
    for (const name of bareImportPackages(readFileSync(file, "utf8"))) {
      if (name.startsWith("node:") || builtins.has(name)) continue;
      if (declared.has(name)) continue;
      undeclared.push(`${name} (${path.relative(packageRoot, file)})`);
    }
  }
  if (undeclared.length > 0) {
    throw new Error(
      `${packageName} imports packages it does not declare in dependencies, peerDependencies or optionalDependencies: ${undeclared.join(", ")}`,
    );
  }
}

console.error(
  `Verified package contract: ${packageName}@${packageJson.version}`,
);
