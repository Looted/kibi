// Pre-pack guard for the kibi-swipl-<platform> packages: refuse to pack a
// package whose bundled runtime was not populated from a verified pipeline
// archive. Run from a platform package directory (npm prepack).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const packageRoot = process.cwd();
const swiplModule = await import(
  pathToFileURL(
    path.resolve(import.meta.dirname, "..", "packages", "swipl", "index.js"),
  ).href
);
const { MANIFEST_FILE, sha256File, validateBuildManifest } = swiplModule;

const REQUIRED_LICENSES = ["swi-prolog", "openssl", "pcre2", "zlib"];

export function verifySwiplPayload(root) {
  const problems = [];
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  );
  const target = packageJson.kibi?.target;
  const expectedVersion = packageJson.kibi?.swiplVersion;
  if (typeof target !== "string" || typeof expectedVersion !== "string") {
    return ["package.json must declare kibi.target and kibi.swiplVersion"];
  }
  const manifestPath = path.join(root, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return [
      `${MANIFEST_FILE} is missing; populate the package from the swipl-build pipeline archive first`,
    ];
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return [`${MANIFEST_FILE} is not valid JSON: ${error.message}`];
  }
  const checked = validateBuildManifest(manifest, {
    target,
    swiplVersion: expectedVersion,
  });
  if (!checked.ok) return [checked.reason];
  const binary = path.join(root, checked.binaryPath);
  if (!existsSync(binary) || !statSync(binary).isFile()) {
    problems.push(`${checked.binaryPath} is missing`);
  } else if (sha256File(binary) !== checked.binarySha256) {
    problems.push(`${checked.binaryPath} does not match its manifest SHA-256`);
  }
  const home = path.join(root, checked.home);
  if (!existsSync(home) || !statSync(home).isDirectory()) {
    problems.push(`${checked.home} (SWI_HOME_DIR) is missing`);
  }
  const licenseDir = path.join(root, "licenses");
  const licenseFiles = existsSync(licenseDir)
    ? readdirSync(licenseDir).filter((name) => name !== "README.md")
    : [];
  for (const needle of REQUIRED_LICENSES) {
    const match = licenseFiles.find((name) =>
      name.toLowerCase().includes(needle),
    );
    if (
      match === undefined ||
      statSync(path.join(licenseDir, match)).size === 0
    ) {
      problems.push(`licenses/ has no non-empty ${needle} licence text`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const problems = verifySwiplPayload(packageRoot);
  if (problems.length > 0) {
    console.error(
      `Refusing to pack ${path.basename(packageRoot)}: bundled SWI-Prolog payload is not valid:`,
    );
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.error(`Verified SWI-Prolog payload: ${path.basename(packageRoot)}`);
}
