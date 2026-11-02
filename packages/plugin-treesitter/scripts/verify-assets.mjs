import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const manifestPath = join(packageRoot, "integrity.json");
const writeManifest = process.argv.includes("--write");
const requiredFiles = [
  "package.json",
  "README.md",
  "CHANGELOG.md",
  "LICENSE.md",
  "catalog.json",
  "SBOM.spdx.json",
  "THIRD_PARTY_NOTICES.md",
];

async function walkFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

async function sha256(path) {
  const bytes = await readFile(path);
  return {
    path: relative(packageRoot, path).split(sep).join("/"),
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const packageJson = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf8"),
);
const catalog = JSON.parse(
  await readFile(join(packageRoot, "catalog.json"), "utf8"),
);
const sbom = JSON.parse(
  await readFile(join(packageRoot, "SBOM.spdx.json"), "utf8"),
);
if (
  catalog.plugin !== packageJson.name ||
  catalog.pluginVersion !== packageJson.version
) {
  throw new Error(
    "catalog.json plugin identity/version must match package.json",
  );
}
if (
  sbom.packages[0]?.name !== packageJson.name ||
  sbom.packages[0]?.versionInfo !== packageJson.version ||
  sbom.packages[0]?.externalRefs?.[0]?.referenceLocator !==
    `pkg:npm/${packageJson.name}@${packageJson.version}`
) {
  throw new Error("SBOM plugin identity/version must match package.json");
}
if (
  packageJson.dependencies?.[catalog.runtime?.package] !==
    catalog.runtime?.version ||
  packageJson.dependencies?.[catalog.runtime?.package] !== "0.27.0"
) {
  throw new Error(
    "package.json runtime dependency must exactly match the qualified runtime catalog",
  );
}

for (const file of requiredFiles) {
  await readFile(join(packageRoot, file));
}

const includedPaths = [
  ...requiredFiles,
  ...(
    await Promise.all(
      ["dist", "assets", "licenses"].map((directory) =>
        walkFiles(join(packageRoot, directory)),
      ),
    )
  )
    .flat()
    .map((path) => relative(packageRoot, path).split(sep).join("/")),
].sort();
if (includedPaths.includes("integrity.json")) {
  throw new Error("integrity.json must be excluded from its own hash list");
}

// Grammars in language packs: package.json declares each pack as an optional
// peer in the pinned major (^X.0.0); catalog.json pins the exact version and
// each grammar file by size and SHA-256, which the plugin checks at load time.
// A pack manifest may only hold the keys below, so it stays data only.
const PACK_MANIFEST_KEYS = new Set([
  "name",
  "version",
  "description",
  "license",
  "author",
  "homepage",
  "repository",
  "bugs",
  "keywords",
  "files",
  "publishConfig",
]);
const resolvePack = createRequire(join(packageRoot, "package.json"));
for (const language of catalog.languages) {
  if (language.pack === undefined) continue;
  const peerRange = `^${language.packVersion.split(".")[0]}.0.0`;
  if (
    packageJson.peerDependencies?.[language.pack] !== peerRange ||
    packageJson.peerDependenciesMeta?.[language.pack]?.optional !== true ||
    packageJson.devDependencies?.[language.pack] !== language.packVersion
  )
    throw new Error(
      `${language.pack} must be an optional peer dependency on ${peerRange} and a dev dependency on ${language.packVersion}`,
    );
  const packRoot = dirname(
    resolvePack.resolve(`${language.pack}/package.json`),
  );
  const pack = JSON.parse(
    await readFile(join(packRoot, "package.json"), "utf8"),
  );
  if (pack.version !== language.packVersion)
    throw new Error(
      `${language.pack} is ${pack.version}; catalog.json pins ${language.packVersion}`,
    );
  if (!pack.files?.includes(language.asset))
    throw new Error(`${language.pack} does not publish ${language.asset}`);
  const extraKeys = Object.keys(pack).filter(
    (key) => !PACK_MANIFEST_KEYS.has(key),
  );
  if (extraKeys.length > 0)
    throw new Error(
      `${language.pack} must hold data only; remove ${extraKeys.join(", ")} from its package.json`,
    );
  const entry = await sha256(join(packRoot, language.asset));
  if (
    entry.bytes !== language.assetBytes ||
    entry.sha256 !== language.assetSha256
  )
    throw new Error(
      `Parser asset metadata mismatch: ${language.pack}/${language.asset}`,
    );
}

for (const language of catalog.languages) {
  for (const relativePath of [
    ...(language.pack === undefined ? [language.asset] : []),
    language.query,
    ...(language.supplementalQueries ?? []).map((query) => query.path),
  ]) {
    if (!includedPaths.includes(relativePath)) {
      throw new Error(
        `Catalog path ${relativePath} is not included in the package closure`,
      );
    }
    const entry = await sha256(join(packageRoot, relativePath));
    if (
      relativePath === language.asset &&
      (entry.bytes !== language.assetBytes ||
        entry.sha256 !== language.assetSha256)
    ) {
      throw new Error(`Parser asset metadata mismatch: ${relativePath}`);
    }
    if (
      relativePath === language.query &&
      (entry.bytes !== language.queryBytes ||
        entry.sha256 !== language.querySha256)
    ) {
      throw new Error(`Query metadata mismatch: ${relativePath}`);
    }
    const supplemental = language.supplementalQueries?.find(
      (query) => query.path === relativePath,
    );
    if (
      supplemental &&
      (entry.bytes !== supplemental.queryBytes ||
        entry.sha256 !== supplemental.querySha256)
    ) {
      throw new Error(`Supplemental query metadata mismatch: ${relativePath}`);
    }
  }
}

const files = await Promise.all(
  includedPaths.map((path) => sha256(join(packageRoot, path))),
);
const expected = {
  schemaVersion: "kibi.package-integrity.v1",
  package: packageJson.name,
  version: packageJson.version,
  algorithm: "sha256",
  selfHash: {
    path: "integrity.json",
    excluded: true,
    reason:
      "A manifest cannot contain its own digest; the host approval digest covers this file.",
  },
  files,
};
const serialized = `${JSON.stringify(expected, null, 2)}\n`;
if (writeManifest) {
  await writeFile(manifestPath, serialized);
  process.stdout.write(`Wrote integrity manifest for ${files.length} files.\n`);
} else {
  const actual = await readFile(manifestPath, "utf8");
  if (actual !== serialized) {
    throw new Error(
      "integrity.json is stale; rebuild and run node scripts/verify-assets.mjs --write",
    );
  }
  process.stdout.write(
    `Verified integrity manifest for ${files.length} files.\n`,
  );
}
