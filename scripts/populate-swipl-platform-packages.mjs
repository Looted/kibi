// Release packaging for the kibi-swipl-<platform> packages: turn the verified
// swipl-build pipeline archives into package payloads (bin/, lib/, licenses/,
// build-manifest.json) that `npm pack` can ship.
//
//   node scripts/populate-swipl-platform-packages.mjs --artifacts <dir>
//
// <dir> holds one `swipl-<target>/` directory per target, exactly as
// actions/download-artifact writes them, each with the archive and its
// `.sha256` sidecar. Nothing is trusted on its own: the sidecar digest, then
// the pinned dependency/patch/provenance checks and safe extraction of the
// pipeline's own verifier (swipl-spike.py extract-archive), then the manifest's
// binary SHA-256 against the installed binary.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { verifySwiplPayload } from "./verify-swipl-payload.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const PAYLOAD_ENTRIES = ["bin", "lib", "licenses", "build-manifest.json"];
const SHA256_LINE = /^([0-9a-f]{64}) {2}([^/\\\n]+)\n?$/;

// implements REQ-prolog-bundled-release
export function sha256Of(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

// implements REQ-prolog-bundled-release
export function readPins(repoRoot = REPO_ROOT) {
  const pins = JSON.parse(
    readFileSync(path.join(repoRoot, "scripts", "swipl-version.json"), "utf8"),
  );
  if (typeof pins.version !== "string") {
    throw new Error("scripts/swipl-version.json has no version pin");
  }
  return pins;
}

// implements REQ-prolog-bundled-release
export function archiveName(version, target) {
  return `swipl-${version}-${target}.tar.gz`;
}

/**
 * Check the `.sha256` sidecar against the archive bytes. The sidecar must name
 * exactly this archive, so a sidecar copied from another artifact cannot pass.
 * Returns the lowercase digest.
 */
// implements REQ-prolog-bundled-release
export function verifyArchiveSidecar(archivePath, sidecarPath) {
  if (!existsSync(archivePath)) {
    throw new Error(`archive is missing: ${archivePath}`);
  }
  if (!existsSync(sidecarPath)) {
    throw new Error(`checksum sidecar is missing: ${sidecarPath}`);
  }
  const match = SHA256_LINE.exec(readFileSync(sidecarPath, "ascii"));
  if (match === null) {
    throw new Error(
      `${path.basename(sidecarPath)} is not '<sha256>  <archive name>'`,
    );
  }
  const [, declared, name] = match;
  if (name !== path.basename(archivePath)) {
    throw new Error(
      `${path.basename(sidecarPath)} names ${name}, not ${path.basename(archivePath)}`,
    );
  }
  const actual = sha256Of(archivePath);
  if (actual !== declared) {
    throw new Error(
      `SHA-256 mismatch for ${path.basename(archivePath)}: sidecar ${declared}, archive ${actual}`,
    );
  }
  return actual;
}

/** Verified extraction through the pipeline's own archive verifier. */
// implements REQ-prolog-bundled-release
export function extractWithPipelineVerifier({
  archive,
  sidecar,
  target,
  workdir,
  repoRoot = REPO_ROOT,
  env = process.env,
  python = env.PYTHON ?? "python3",
}) {
  const result = spawnSync(
    python,
    [
      path.join(repoRoot, "scripts", "swipl-spike.py"),
      "extract-archive",
      "--target",
      target,
      "--archive",
      archive,
      "--checksum",
      sidecar,
      "--workdir",
      workdir,
    ],
    { encoding: "utf8", env: { ...env, PYTHONDONTWRITEBYTECODE: "1" } },
  );
  if (result.status !== 0) {
    throw new Error(
      `archive verification failed for ${target}: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
  return JSON.parse(result.stdout.trim().split("\n").pop()).prefix;
}

function walkFiles(root) {
  const found = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else found.push({ full, link: entry.isSymbolicLink() });
    }
  };
  visit(root);
  return found;
}

const NAME_CHAR = "[A-Za-z0-9_.+-]";

const NATIVE_MAGIC = [
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF
  Buffer.from([0xfe, 0xed, 0xfa, 0xce]), // Mach-O 32-bit
  Buffer.from([0xfe, 0xed, 0xfa, 0xcf]), // Mach-O 64-bit
  Buffer.from([0xce, 0xfa, 0xed, 0xfe]),
  Buffer.from([0xcf, 0xfa, 0xed, 0xfe]),
  Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // universal
];

function isNativeFile(content) {
  return NATIVE_MAGIC.some((magic) => content.subarray(0, 4).equals(magic));
}

/**
 * For each name, the native files (ELF/Mach-O: the only places the dynamic
 * loader or dlopen reads a library name from) that mention it as a whole name.
 */
function nativeReferences(files, names) {
  const patterns = new Map(
    [...names].map((name) => [
      name,
      new RegExp(
        `(?<!${NAME_CHAR})${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!${NAME_CHAR})`,
      ),
    ]),
  );
  const mentions = new Map([...names].map((name) => [name, new Set()]));
  for (const file of files) {
    const content = readFileSync(file);
    if (!isNativeFile(content)) continue;
    const text = content.toString("latin1");
    for (const [name, pattern] of patterns) {
      if (pattern.test(text)) mentions.get(name).add(file);
    }
  }
  return mentions;
}

/**
 * `npm pack` silently drops symbolic links, but the runtime loads shared
 * libraries through them (libz.so.1 -> libz.so.1.3.2). Replace every link with
 * a regular file so the tarball is complete, and avoid shipping a second copy
 * of a library under a name nothing refers to: a link that no payload file
 * mentions by name is dropped, and a real file that only links pointed at is
 * renamed into its first referenced link instead of being copied beside it.
 * Returns what was done, for the release report.
 */
// implements REQ-prolog-bundled-release
export function materializeSymlinks(payloadRoot) {
  const root = realpathSync(payloadRoot);
  const entries = walkFiles(root);
  const links = entries.filter((entry) => entry.link).map((e) => e.full);
  const regular = entries.filter((entry) => !entry.link).map((e) => e.full);
  const finalTarget = new Map();
  for (const link of links) {
    const target = realpathSync(link);
    if (!target.startsWith(`${root}${path.sep}`)) {
      throw new Error(`symlink escapes the payload: ${link}`);
    }
    if (!statSync(target).isFile()) {
      throw new Error(`symlink does not end at a regular file: ${link}`);
    }
    finalTarget.set(link, target);
  }
  const mentions = nativeReferences(
    regular,
    new Set([...links, ...finalTarget.values()].map((p) => path.basename(p))),
  );
  // A library naming itself (its own SONAME) is not a reason to keep a name:
  // only another native file loading it is.
  const referencedBy = (name, target) =>
    [...mentions.get(name)].some((file) => file !== target);
  const byTarget = new Map();
  for (const link of links) {
    const target = finalTarget.get(link);
    byTarget.set(target, [...(byTarget.get(target) ?? []), link]);
  }
  const summary = { materialized: [], dropped: [], renamed: [] };
  const rel = (file) => path.relative(root, file);
  for (const [target, group] of byTarget) {
    const kept = group
      .filter((link) => referencedBy(path.basename(link), target))
      .sort();
    for (const link of group) {
      if (kept.includes(link)) continue;
      rmSync(link);
      summary.dropped.push(rel(link));
    }
    let copySource = target;
    let copyTo = kept;
    if (kept.length > 0 && !referencedBy(path.basename(target), target)) {
      // The real file's own name is unused: it becomes the first kept name.
      const [first, ...others] = kept;
      rmSync(first);
      renameSync(target, first);
      summary.renamed.push(`${rel(target)} -> ${rel(first)}`);
      copySource = first;
      copyTo = others;
    }
    for (const link of copyTo) {
      rmSync(link);
      cpSync(copySource, link);
      summary.materialized.push(rel(link));
    }
  }
  const remaining = walkFiles(root).filter((entry) => entry.link);
  if (remaining.length > 0) {
    throw new Error(
      `symbolic links remain after materialization: ${remaining.map((e) => rel(e.full)).join(", ")}`,
    );
  }
  return summary;
}

function copyPayload(prefix, destination) {
  for (const entry of PAYLOAD_ENTRIES) {
    const source = path.join(prefix, entry);
    if (!existsSync(source)) {
      throw new Error(`archive prefix has no ${entry}`);
    }
    const into = path.join(destination, entry);
    if (entry === "licenses" && existsSync(into)) {
      // Keep the committed licenses/README.md; everything else is payload.
      for (const name of readdirSync(into)) {
        if (name !== "README.md")
          rmSync(path.join(into, name), { recursive: true });
      }
    } else {
      rmSync(into, { recursive: true, force: true });
    }
    cpSync(source, into, {
      recursive: true,
      verbatimSymlinks: true,
      preserveTimestamps: true,
    });
  }
}

function directorySize(root) {
  let total = 0;
  for (const entry of walkFiles(root)) total += lstatSync(entry.full).size;
  return total;
}

/** Populate one platform package from its pipeline archive; returns a report. */
// implements REQ-prolog-bundled-release
export function populatePlatformPackage({
  target,
  artifactsDir,
  packagesRoot = path.join(REPO_ROOT, "packages"),
  repoRoot = REPO_ROOT,
  version = readPins(repoRoot).version,
  extract = extractWithPipelineVerifier,
  scratchRoot = tmpdir(),
  env = process.env,
}) {
  const packageDir = path.join(packagesRoot, `swipl-${target}`);
  if (!existsSync(path.join(packageDir, "package.json"))) {
    throw new Error(`no platform package for ${target} at ${packageDir}`);
  }
  const packageJson = JSON.parse(
    readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );
  if (packageJson.kibi?.target !== target) {
    throw new Error(`${packageDir} is not the ${target} package`);
  }
  if (packageJson.kibi?.swiplVersion !== version) {
    throw new Error(
      `${packageJson.name} declares SWI-Prolog ${packageJson.kibi?.swiplVersion}, but scripts/swipl-version.json pins ${version}`,
    );
  }
  const sourceDir = path.join(artifactsDir, `swipl-${target}`);
  const name = archiveName(version, target);
  const archive = path.join(sourceDir, name);
  const sidecar = `${archive}.sha256`;
  const archiveSha256 = verifyArchiveSidecar(archive, sidecar);

  const work = mkdtempSync(path.join(scratchRoot, `kibi-swipl-${target}-`));
  try {
    const prefix = extract({
      archive,
      sidecar,
      target,
      workdir: path.join(work, "verify"),
      repoRoot,
      env,
    });
    // Only the four shipped entries leave the verified prefix (share/ holds
    // man pages and pkg-config metadata that the runtime never reads).
    const staged = path.join(work, "staged");
    mkdirSync(staged);
    copyPayload(prefix, staged);
    const links = materializeSymlinks(staged);
    copyPayload(staged, packageDir);
    const problems = verifySwiplPayload(packageDir);
    if (problems.length > 0) {
      throw new Error(
        `populated ${packageJson.name} is invalid: ${problems.join("; ")}`,
      );
    }
    const manifest = JSON.parse(
      readFileSync(path.join(packageDir, "build-manifest.json"), "utf8"),
    );
    const binary = path.join(packageDir, manifest.binary.path);
    if ((statSync(binary).mode & 0o111) === 0) {
      throw new Error(
        `${manifest.binary.path} is not executable after extraction`,
      );
    }
    return {
      target,
      package: packageJson.name,
      archive: name,
      archiveSha256,
      archiveBytes: statSync(archive).size,
      binarySha256: manifest.binary.sha256,
      sourceCommit: manifest.sourceCommit,
      workflowRunId: manifest.workflowRunId,
      payloadBytes: directorySize(packageDir),
      links,
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// implements REQ-prolog-bundled-release
export function platformTargets(
  packagesRoot = path.join(REPO_ROOT, "packages"),
) {
  return readdirSync(packagesRoot)
    .filter((entry) => entry.startsWith("swipl-"))
    .map((entry) => entry.slice("swipl-".length))
    .sort();
}

// implements REQ-prolog-bundled-release
export function parseArgs(argv) {
  const options = { targets: undefined, artifacts: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifacts") options.artifacts = argv[++index];
    else if (arg === "--targets") options.targets = argv[++index]?.split(",");
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.artifacts) {
    throw new Error(
      "usage: populate-swipl-platform-packages.mjs --artifacts <dir> [--targets a,b]",
    );
  }
  return options;
}

// implements REQ-prolog-bundled-release
export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const targets = options.targets ?? platformTargets();
  const reports = [];
  for (const target of targets) {
    reports.push(
      populatePlatformPackage({
        target,
        artifactsDir: path.resolve(options.artifacts),
      }),
    );
  }
  for (const report of reports) {
    console.log(JSON.stringify(report));
  }
  return reports;
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(
      `populate-swipl-platform-packages: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
