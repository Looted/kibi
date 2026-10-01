#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const FIXTURES = Object.freeze({
  python:
    "packages/plugin-treesitter/tests/fixtures/python/nested-duplicate.py",
  go: "packages/plugin-treesitter/tests/fixtures/go/declarations.go",
  rust: "packages/plugin-treesitter/tests/fixtures/rust/declarations.rs",
});
const REQUIRED_PACKAGES = ["kibi-cli", "kibi-plugin-treesitter"];
const BENCHMARK_REQUIREMENT_CLAUSES = Object.freeze([
  "Each synthetic benchmark scenario includes exactly one Python source fixture.",
  "Each synthetic benchmark scenario includes exactly one Go source fixture.",
  "Each synthetic benchmark scenario includes exactly one Rust source fixture.",
]);
const BENCHMARK_REQUIREMENT_TEXT = BENCHMARK_REQUIREMENT_CLAUSES.join(" ");
const OUTPUT_NAME = "benchmark-result.json";
const SAMPLE_INTERVAL_MS = 20;
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const PERFORMANCE_PREFIX = "[kibi-performance] ";
const MAX_PERFORMANCE_DURATION_MS = 60_000;
const MAX_TRACE_FILE_BYTES = 512 * 1024;
const MAX_TRACE_DIRECTORY_BYTES = 32 * 1024 * 1024;
const MAX_TRACE_DIRECTORY_EVENTS = 100_000;

function usage() {
  return `Usage:
  node scripts/benchmark-installed-staged-impact.mjs \\
    --prefix <npm-prefix> \\
    --qualification <package-qualification.json> \\
    --runtime-archive <catalog-pinned-web-tree-sitter.tgz> \\
    --output-dir <new-directory> [options]

Required:
  --prefix PATH             Installed npm prefix containing node_modules/
  --qualification PATH      Existing source-byte or final-pack qualification JSON
  --runtime-archive PATH    Catalog-pinned web-tree-sitter archive for exact byte comparison
  --output-dir PATH         New directory for benchmark-result.json; must not exist

Options:
  --small-count N           Synthetic declarations in the small repo (default 12, range 3–24)
  --large-count N           Synthetic declarations in the large repo (default 120, range 3–240)
  --repeats N               Repeated read-only measurements (default 3, range 2–5)
  --parser-report PATH      Optional parser report, stored only as a separate reference
  --parser-report-sha256 H  Required exact SHA-256 pin when --parser-report is supplied
  --help                    Show this help

This benchmark invokes only the installed public Kibi CLI. It parses checked-in
Python, Go and Rust fixtures plus inert synthetic declarations; it never runs
the analyzed source. Git-hook behavior and protected check-diff event authority
are outside this local staged-check measurement. Timing is observational:
worker phase sums may overlap, Prolog timings are query round-trip wall time,
and cold/warm labels apply only to the owned Kibi engine.`;
}

function parseArgs(argv) {
  const options = {
    smallCount: 12,
    largeCount: 120,
    repeats: 3,
    help: false,
  };
  const names = new Map([
    ["--prefix", "prefix"],
    ["--qualification", "qualification"],
    ["--runtime-archive", "runtimeArchive"],
    ["--output-dir", "outputDir"],
    ["--small-count", "smallCount"],
    ["--large-count", "largeCount"],
    ["--repeats", "repeats"],
    ["--parser-report", "parserReport"],
    ["--parser-report-sha256", "parserReportSha256"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (name === "--help") {
      options.help = true;
      continue;
    }
    const property = names.get(name);
    if (!property) throw new Error(`Unknown option: ${name}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires a value`);
    }
    options[property] = value;
    index += 1;
  }

  if (options.help) return options;
  for (const required of [
    "prefix",
    "qualification",
    "runtimeArchive",
    "outputDir",
  ]) {
    if (typeof options[required] !== "string") {
      throw new Error(
        `Missing required option: --${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      );
    }
  }
  for (const key of ["smallCount", "largeCount", "repeats"]) {
    const parsed = Number(options[key]);
    if (!Number.isInteger(parsed)) throw new Error(`${key} must be an integer`);
    options[key] = parsed;
  }
  if (options.smallCount < 3 || options.smallCount > 24) {
    throw new Error("--small-count must be between 3 and 24");
  }
  if (options.largeCount < 3 || options.largeCount > 240) {
    throw new Error("--large-count must be between 3 and 240");
  }
  if (options.largeCount <= options.smallCount) {
    throw new Error("--large-count must exceed --small-count");
  }
  if (options.repeats < 2 || options.repeats > 5) {
    throw new Error("--repeats must be between 2 and 5");
  }
  for (const key of [
    "prefix",
    "qualification",
    "runtimeArchive",
    "outputDir",
    "parserReport",
  ]) {
    if (options[key] !== undefined) options[key] = path.resolve(options[key]);
  }
  if (
    options.parserReport &&
    !/^[a-f0-9]{64}$/.test(options.parserReportSha256 ?? "")
  ) {
    throw new Error(
      "--parser-report requires a lowercase --parser-report-sha256 pin",
    );
  }
  if (!options.parserReport && options.parserReportSha256 !== undefined) {
    throw new Error("--parser-report-sha256 requires --parser-report");
  }
  return options;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, description) {
  if (!isRecord(value)) throw new Error(`${description} must be a JSON object`);
  return value;
}

function readJson(filePath, description) {
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`Cannot read ${description}: ${error.message}`);
  }
  try {
    return { value: JSON.parse(text), bytes: Buffer.from(text, "utf8") };
  } catch (error) {
    throw new Error(`${description} is not valid JSON: ${error.message}`);
  }
}

function field(buffer, start, length) {
  const end = buffer.indexOf(0, start);
  const boundedEnd = end < 0 || end > start + length ? start + length : end;
  return buffer.subarray(start, boundedEnd).toString("utf8");
}

function parseOctal(buffer, start, length, description) {
  const text = field(buffer, start, length).trim().replace(/^\0+/, "");
  if (text === "") return 0;
  if (!/^[0-7]+$/.test(text)) {
    throw new Error(`Unsupported tar ${description} encoding`);
  }
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid tar ${description}`);
  }
  return value;
}

function parsePax(data) {
  const values = {};
  let offset = 0;
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset);
    if (space < 0) throw new Error("Malformed PAX entry length");
    const lengthText = data.subarray(offset, space).toString("ascii");
    const length = Number.parseInt(lengthText, 10);
    if (
      !Number.isInteger(length) ||
      length <= 0 ||
      offset + length > data.length
    ) {
      throw new Error("Malformed PAX entry");
    }
    const row = data
      .subarray(space + 1, offset + length)
      .toString("utf8")
      .replace(/\n$/, "");
    const equals = row.indexOf("=");
    if (equals <= 0) throw new Error("Malformed PAX key/value");
    values[row.slice(0, equals)] = row.slice(equals + 1);
    offset += length;
  }
  return values;
}

function safeTarPath(rawName) {
  const name = rawName.replace(/\0.*$/, "").replace(/\/$/, "");
  if (!name || name.startsWith("/") || name.includes("\\")) {
    throw new Error("Tarball contains an unsafe path");
  }
  const parts = name.split("/");
  if (parts.some((part) => part === ".." || part === "." || part === "")) {
    throw new Error("Tarball contains a non-canonical path");
  }
  if (parts[0] !== "package" || parts.length < 2) {
    throw new Error("Tarball entry is outside its package root");
  }
  return parts.slice(1).join("/");
}

function parseNpmTarball(tarballBytes) {
  const archive = gunzipSync(tarballBytes);
  const entries = new Map();
  let offset = 0;
  let pendingPax = {};
  let pendingLongName = null;

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const headerSize = parseOctal(header, 124, 12, "entry size");
    const type = field(header, 156, 1) || "0";
    const dataStart = offset + 512;
    if (dataStart + headerSize > archive.length) {
      throw new Error("Tarball entry extends past archive end");
    }
    const metadata = archive.subarray(dataStart, dataStart + headerSize);
    const nextOffset = dataStart + Math.ceil(headerSize / 512) * 512;

    if (type === "x") {
      pendingPax = parsePax(metadata);
      offset = nextOffset;
      continue;
    }
    if (type === "g") throw new Error("Global PAX headers are unsupported");
    if (type === "L") {
      pendingLongName = metadata
        .toString("utf8")
        .replace(/\0.*$/, "")
        .replace(/\n$/, "");
      offset = nextOffset;
      continue;
    }
    if (type === "K") throw new Error("GNU long-link headers are unsupported");

    const headerName = field(header, 0, 100);
    const prefix = field(header, 345, 155);
    const name =
      pendingPax.path ??
      pendingLongName ??
      (prefix ? `${prefix}/${headerName}` : headerName);
    if (name.replace(/\/$/, "") === "package" && type === "5") {
      pendingPax = {};
      pendingLongName = null;
      offset = nextOffset;
      continue;
    }
    const relativePath = safeTarPath(name);
    const mode = parseOctal(header, 100, 8, "file mode");
    const linkTarget = pendingPax.linkpath ?? field(header, 157, 100);
    const size =
      pendingPax.size === undefined ? headerSize : Number(pendingPax.size);
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      dataStart + size > archive.length
    ) {
      throw new Error("Invalid PAX tar entry size");
    }
    const content = archive.subarray(dataStart, dataStart + size);
    if (type === "5") {
      // Directory entries carry no source bytes and are checked through child files.
    } else if (type === "0" || type === "\0") {
      if (entries.has(relativePath))
        throw new Error(`Duplicate tar path ${relativePath}`);
      entries.set(relativePath, {
        kind: "file",
        bytes: Buffer.from(content),
        mode,
      });
    } else if (type === "2") {
      const linkPath = path.posix.normalize(
        path.posix.join(path.posix.dirname(relativePath), linkTarget),
      );
      if (
        path.posix.isAbsolute(linkTarget) ||
        linkTarget.includes("\\") ||
        linkPath === ".." ||
        linkPath.startsWith("../")
      ) {
        throw new Error(
          `Tarball contains an escaping symlink: ${relativePath}`,
        );
      }
      if (entries.has(relativePath))
        throw new Error(`Duplicate tar path ${relativePath}`);
      entries.set(relativePath, { kind: "symlink", target: linkTarget, mode });
    } else if (type === "1") {
      throw new Error(`Tarball hardlinks are unsupported: ${relativePath}`);
    } else {
      throw new Error(`Unsupported tar entry type ${JSON.stringify(type)}`);
    }

    pendingPax = {};
    pendingLongName = null;
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function readRegularSourceFile(packageRoot, relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    relativePath
      .split("/")
      .some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Packaged source path is not canonical");
  }
  const rootMetadata = lstatSync(packageRoot);
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
    throw new Error("Source package root must be a real directory");
  }
  const realRoot = realpathSync(packageRoot);
  const parts = relativePath.split("/");
  let cursor = packageRoot;
  for (let index = 0; index < parts.length; index += 1) {
    cursor = path.join(cursor, parts[index]);
    const metadata = lstatSync(cursor);
    if (metadata.isSymbolicLink()) {
      throw new Error(`Source package contains a symlink: ${relativePath}`);
    }
    if (index < parts.length - 1 && !metadata.isDirectory()) {
      throw new Error(
        `Source package path is not a directory: ${relativePath}`,
      );
    }
    if (index === parts.length - 1 && !metadata.isFile()) {
      throw new Error(`Packaged source is not a regular file: ${relativePath}`);
    }
    const realPath = realpathSync(cursor);
    if (
      realPath !== realRoot &&
      !realPath.startsWith(`${realRoot}${path.sep}`)
    ) {
      throw new Error(
        `Packaged source escapes its package root: ${relativePath}`,
      );
    }
  }
  return readFileSync(cursor);
}

function qualifySourcePackageTarballs({
  repoRoot,
  packages,
  expectedFolders,
  outputPath,
}) {
  if (typeof repoRoot !== "string" || repoRoot.length === 0) {
    throw new Error(
      "Source qualification requires the current repository root",
    );
  }
  if (!Array.isArray(packages) || packages.length === 0) {
    throw new Error(
      "Source qualification requires a nonempty package inventory",
    );
  }
  if (!Array.isArray(expectedFolders) || expectedFolders.length === 0) {
    throw new Error(
      "Source qualification requires the complete expected package folders",
    );
  }
  const repo = path.resolve(repoRoot);
  const packagesDirectory = path.join(repo, "packages");
  if (lstatSync(packagesDirectory).isSymbolicLink()) {
    throw new Error("Repository packages directory must not be a symlink");
  }
  const expectedFolderSet = new Set(expectedFolders);
  if (expectedFolderSet.size !== expectedFolders.length) {
    throw new Error("Expected source package folders contain duplicates");
  }
  const seenFolders = new Set();
  const seenNames = new Set();
  const seenTarballs = new Set();
  const tarballs = [];
  let packagedFiles = 0;
  for (const itemValue of packages) {
    const item = requireRecord(itemValue, "source package input");
    for (const key of ["folder", "sourceDirectory", "tarballPath"]) {
      if (typeof item[key] !== "string" || item[key].length === 0) {
        throw new Error(`Source package input is missing ${key}`);
      }
    }
    if (
      path.basename(item.folder) !== item.folder ||
      item.folder === "." ||
      item.folder === ".."
    ) {
      throw new Error("Source package folder must be a single path segment");
    }
    const expectedDirectory = path.join(packagesDirectory, item.folder);
    const sourceDirectory = path.resolve(item.sourceDirectory);
    if (sourceDirectory !== expectedDirectory) {
      throw new Error(
        `Source package escapes the current repository: ${item.folder}`,
      );
    }
    const folderMetadata = lstatSync(expectedDirectory);
    if (!folderMetadata.isDirectory() || folderMetadata.isSymbolicLink()) {
      throw new Error(
        `Repository source package is not a real directory: ${item.folder}`,
      );
    }
    const archivePath = path.resolve(item.tarballPath);
    if (seenFolders.has(item.folder)) {
      throw new Error(`Duplicate source package folder: ${item.folder}`);
    }
    if (seenTarballs.has(archivePath)) {
      throw new Error(`Duplicate package tarball path: ${archivePath}`);
    }
    seenFolders.add(item.folder);
    seenTarballs.add(archivePath);
    const archiveMetadata = lstatSync(archivePath);
    if (!archiveMetadata.isFile() || archiveMetadata.isSymbolicLink()) {
      throw new Error(`Package archive must be a regular file: ${item.folder}`);
    }
    const archiveBytes = readFileSync(archivePath);
    const archiveEntries = parseNpmTarball(archiveBytes);
    if (archiveEntries.size === 0) {
      throw new Error(`Package archive is empty: ${item.folder}`);
    }
    const manifestEntry = archiveEntries.get("package.json");
    if (!manifestEntry || manifestEntry.kind !== "file") {
      throw new Error(
        `Package archive has no regular package.json: ${item.folder}`,
      );
    }
    const sourceManifestBytes = readRegularSourceFile(
      sourceDirectory,
      "package.json",
    );
    if (!manifestEntry.bytes.equals(sourceManifestBytes)) {
      throw new Error(
        `Packaged manifest differs from current source: ${item.folder}`,
      );
    }
    const manifest = requireRecord(
      JSON.parse(sourceManifestBytes.toString("utf8")),
      `source package.json for ${item.folder}`,
    );
    if (
      typeof manifest.name !== "string" ||
      manifest.name.length === 0 ||
      typeof manifest.version !== "string" ||
      manifest.version.length === 0
    ) {
      throw new Error(`Source package identity is invalid: ${item.folder}`);
    }
    if (seenNames.has(manifest.name)) {
      throw new Error(
        `Duplicate first-party package identity: ${manifest.name}`,
      );
    }
    seenNames.add(manifest.name);

    const filePaths = [...archiveEntries.keys()].sort();
    for (const relativePath of filePaths) {
      const entry = archiveEntries.get(relativePath);
      if (entry.kind !== "file") {
        throw new Error(
          `First-party package archive contains a non-regular file: ${item.folder}/${relativePath}`,
        );
      }
      const sourceBytes = readRegularSourceFile(sourceDirectory, relativePath);
      if (!entry.bytes.equals(sourceBytes)) {
        throw new Error(
          `Packaged bytes differ from current source/build output: ${item.folder}/${relativePath}`,
        );
      }
    }
    packagedFiles += filePaths.length;
    tarballs.push({
      name: manifest.name,
      version: manifest.version,
      path: archivePath,
      sha256: sha256(archiveBytes),
      bytes: archiveBytes.length,
      files: filePaths.length,
    });
  }
  const actualFolders = [...seenFolders].sort();
  const expectedFolderList = [...expectedFolderSet].sort();
  if (
    tarballs.length !== expectedFolders.length ||
    actualFolders.length !== expectedFolderList.length ||
    actualFolders.some(
      (folder, index) => folder !== expectedFolderList[index],
    ) ||
    packagedFiles < tarballs.length
  ) {
    throw new Error("Source qualification package or file count drifted");
  }
  const report = {
    qualificationVersion: "kibi.source-candidate-package-qualification.v1",
    method:
      "each_tarball_regular_file_and_manifest_compared_to_current_package_source_or_build_file",
    generatedAt: new Date().toISOString(),
    packageCount: tarballs.length,
    packagedFiles,
    mismatches: [],
    tarballs,
  };
  if (outputPath !== undefined) {
    const output = path.resolve(outputPath);
    if (!existsSync(path.dirname(output)) || existsSync(output)) {
      throw new Error(
        "Qualification output parent must exist and output must be new",
      );
    }
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  }
  return report;
}

function verifyCatalogRuntimeArchiveBytes(runtimeArchiveBytes, runtimeCatalog) {
  const expectedPackedBytes = runtimeCatalog.packedBytes;
  const expectedUnpackedBytes = runtimeCatalog.unpackedBytes;
  if (
    !Number.isSafeInteger(expectedPackedBytes) ||
    expectedPackedBytes < 1 ||
    expectedPackedBytes > 8_000_000 ||
    !Number.isSafeInteger(expectedUnpackedBytes) ||
    expectedUnpackedBytes < 1 ||
    expectedUnpackedBytes > 50_000_000
  ) {
    throw new Error(
      "Catalog-pinned runtime size metadata is outside safe bounds",
    );
  }
  if (runtimeArchiveBytes.length !== expectedPackedBytes) {
    throw new Error(
      "Catalog-pinned runtime archive size does not match catalog",
    );
  }
  const archiveIntegrity = `sha512-${createHash("sha512")
    .update(runtimeArchiveBytes)
    .digest("base64")}`;
  if (archiveIntegrity !== runtimeCatalog.npmIntegrity) {
    throw new Error(
      "Catalog-pinned runtime archive SHA-512 does not match catalog",
    );
  }
  const archiveEntries = parseNpmTarball(runtimeArchiveBytes);
  if ([...archiveEntries.values()].some((entry) => entry.kind !== "file")) {
    throw new Error(
      "Catalog-pinned runtime archive contains a non-regular entry",
    );
  }
  const packageManifestBytes = archiveEntries.get("package.json")?.bytes;
  if (!packageManifestBytes) {
    throw new Error("Catalog-pinned runtime archive has no package.json");
  }
  const packageManifest = requireRecord(
    JSON.parse(packageManifestBytes.toString("utf8")),
    "catalog-pinned runtime package.json",
  );
  if (
    packageManifest.name !== runtimeCatalog.package ||
    packageManifest.version !== runtimeCatalog.version ||
    packageManifest.license !== runtimeCatalog.license
  ) {
    throw new Error(
      "Catalog-pinned runtime package identity/license differs from catalog",
    );
  }
  const unpackedBytes = [...archiveEntries.values()].reduce(
    (total, entry) => total + entry.bytes.length,
    0,
  );
  if (unpackedBytes !== expectedUnpackedBytes) {
    throw new Error(
      "Catalog-pinned runtime unpacked size does not match catalog",
    );
  }
  return {
    archiveEntries,
    archiveIntegrity,
    archiveSha256: sha256(runtimeArchiveBytes),
    unpackedBytes,
    packageManifest,
  };
}

async function fetchCatalogPinnedRuntimeArchive({
  catalogPath,
  outputPath,
  fetchImpl = globalThis.fetch,
}) {
  const catalog = requireRecord(
    readJson(catalogPath, "Tree-sitter runtime catalog").value,
    "Tree-sitter runtime catalog",
  );
  const runtime = requireRecord(catalog.runtime, "catalog runtime");
  const expectedUrl =
    "https://registry.npmjs.org/web-tree-sitter/-/web-tree-sitter-0.27.0.tgz";
  if (
    runtime.package !== "web-tree-sitter" ||
    runtime.version !== "0.27.0" ||
    runtime.npmTarball !== expectedUrl
  ) {
    throw new Error(
      "Runtime catalog does not name the approved web-tree-sitter artifact",
    );
  }
  if (typeof fetchImpl !== "function") {
    throw new Error(
      "Fetch is unavailable for the catalog-pinned runtime archive",
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetchImpl(expectedUrl, {
      redirect: "error",
      signal: controller.signal,
    });
    if (
      response.status !== 200 ||
      response.ok !== true ||
      response.redirected === true ||
      (response.url && response.url !== expectedUrl)
    ) {
      throw new Error(
        "Catalog-pinned runtime fetch did not return the exact registry artifact",
      );
    }
    const contentLength = response.headers?.get?.("content-length");
    if (
      contentLength !== null &&
      contentLength !== undefined &&
      (!/^\d+$/.test(contentLength) ||
        Number(contentLength) !== runtime.packedBytes)
    ) {
      throw new Error(
        "Catalog-pinned runtime response length differs from catalog",
      );
    }
    if (!response.body || typeof response.body.getReader !== "function") {
      throw new Error(
        "Catalog-pinned runtime response has no bounded body stream",
      );
    }
    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      totalBytes += chunk.length;
      if (totalBytes > runtime.packedBytes) {
        await reader.cancel();
        throw new Error(
          "Catalog-pinned runtime response exceeded its catalog byte bound",
        );
      }
      chunks.push(chunk);
    }
    const archiveBytes = Buffer.concat(chunks, totalBytes);
    const verified = verifyCatalogRuntimeArchiveBytes(archiveBytes, runtime);
    const output = path.resolve(outputPath);
    if (!existsSync(path.dirname(output)) || existsSync(output)) {
      throw new Error(
        "Runtime archive output parent must exist and output must be new",
      );
    }
    writeFileSync(output, archiveBytes, { flag: "wx", mode: 0o600 });
    return {
      path: output,
      url: expectedUrl,
      package: runtime.package,
      version: runtime.version,
      packedBytes: archiveBytes.length,
      unpackedBytes: verified.unpackedBytes,
      sha256: verified.archiveSha256,
      integrity: verified.archiveIntegrity,
      fileCount: verified.archiveEntries.size,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function collectInstalledFiles(
  directory,
  relativeDirectory = "",
  options = {},
) {
  const result = new Map();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      options.excludeDependencyTrees === true &&
      entry.name === "node_modules"
    ) {
      continue;
    }
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    const absolutePath = path.join(directory, entry.name);
    const metadata = lstatSync(absolutePath);
    if (metadata.isDirectory()) {
      for (const [childPath, child] of collectInstalledFiles(
        absolutePath,
        relativePath,
        options,
      )) {
        result.set(childPath, child);
      }
    } else if (metadata.isSymbolicLink()) {
      result.set(relativePath, {
        kind: "symlink",
        target: readlinkSync(absolutePath),
      });
    } else if (metadata.isFile()) {
      result.set(relativePath, {
        kind: "file",
        bytes: readFileSync(absolutePath),
      });
    } else {
      throw new Error(
        `Installed package contains a special file: ${relativePath}`,
      );
    }
  }
  return result;
}

function packageDirectory(nodeModules, packageName) {
  const segments = packageName.split("/");
  if (
    segments.length > 2 ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid package name in qualification: ${packageName}`);
  }
  return path.join(nodeModules, ...segments);
}

function packageRelativeRoot(nodeModules, packageRoot) {
  const relative = path.relative(nodeModules, packageRoot);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      "Installed package root escapes the explicit node_modules tree",
    );
  }
  return relative.split(path.sep).join("/");
}

function assertInstalledPackageRoot(nodeModules, packageRoot, packageName) {
  if (!existsSync(packageRoot) || !lstatSync(packageRoot).isDirectory()) {
    throw new Error(
      `Dependency is not installed at the explicit prefix: ${packageName}`,
    );
  }
  const realNodeModules = realpathSync(nodeModules);
  const installedRoot = realpathSync(packageRoot);
  if (!installedRoot.startsWith(`${realNodeModules}${path.sep}`)) {
    throw new Error(
      `Installed package escapes the explicit prefix: ${packageName}`,
    );
  }
  return installedRoot;
}

function resolveInstalledDependency(nodeModules, fromPackageRoot, packageName) {
  const packageSegments = packageName.split("/");
  if (
    packageSegments.length > 2 ||
    packageSegments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    throw new Error(
      `Invalid dependency name in installed package: ${packageName}`,
    );
  }
  const boundary = path.dirname(nodeModules);
  let cursor = fromPackageRoot;
  while (true) {
    const candidate = path.join(cursor, "node_modules", ...packageSegments);
    if (existsSync(candidate)) {
      const realRoot = assertInstalledPackageRoot(
        nodeModules,
        candidate,
        packageName,
      );
      return { packageRoot: candidate, realRoot };
    }
    if (cursor === boundary) break;
    const parent = path.dirname(cursor);
    if (parent === cursor || !parent.startsWith(boundary)) break;
    cursor = parent;
  }
  const topLevel = packageDirectory(nodeModules, packageName);
  if (existsSync(topLevel)) {
    const realRoot = assertInstalledPackageRoot(
      nodeModules,
      topLevel,
      packageName,
    );
    return { packageRoot: topLevel, realRoot };
  }
  return null;
}

function installedFileInventory(packageRoot) {
  const entries = collectInstalledFiles(packageRoot, "", {
    excludeDependencyTrees: true,
  });
  const files = [...entries]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([relativePath, entry]) => {
      if (entry.kind === "file") {
        return {
          path: relativePath,
          kind: "file",
          bytes: entry.bytes.length,
          sha256: sha256(entry.bytes),
        };
      }
      const resolvedTarget = path.resolve(
        packageRoot,
        path.dirname(relativePath),
        entry.target,
      );
      if (
        path.isAbsolute(entry.target) ||
        !resolvedTarget.startsWith(`${path.resolve(packageRoot)}${path.sep}`)
      ) {
        throw new Error(
          `Installed package contains an escaping symlink: ${relativePath}`,
        );
      }
      return { path: relativePath, kind: "symlink", target: entry.target };
    });
  return {
    entries,
    files,
    sha256: sha256(Buffer.from(JSON.stringify(files), "utf8")),
    fileCount: files.length,
    unpackedBytes: files.reduce(
      (total, entry) => total + (entry.bytes ?? 0),
      0,
    ),
  };
}

function collectInstalledDependencyClosure(nodeModules, qualifiedPackages) {
  const packages = new Map();
  const missingOptional = [];
  const dependencyEdges = [];
  const queue = qualifiedPackages.map((source) => ({
    name: source.name,
    packageRoot: source.installedRoot,
    archiveEntries: source.archiveEntries,
    sourceQualification: true,
  }));

  while (queue.length > 0) {
    const queued = queue.shift();
    const relativeRoot = packageRelativeRoot(nodeModules, queued.packageRoot);
    if (packages.has(relativeRoot)) continue;
    const realRoot = assertInstalledPackageRoot(
      nodeModules,
      queued.packageRoot,
      queued.name,
    );
    const manifestBytes = readFileSync(
      path.join(queued.packageRoot, "package.json"),
    );
    const manifest = requireRecord(
      JSON.parse(manifestBytes.toString("utf8")),
      `installed package.json for ${queued.name}`,
    );
    if (manifest.name !== queued.name || typeof manifest.version !== "string") {
      throw new Error(`Installed package identity is invalid: ${queued.name}`);
    }
    const inventory = installedFileInventory(queued.packageRoot);
    const record = {
      name: queued.name,
      version: manifest.version,
      relativeRoot,
      installedRoot: queued.packageRoot,
      realRoot,
      sourceQualification: queued.sourceQualification,
      archiveEntries: queued.archiveEntries ?? null,
      manifest,
      manifestSha256: sha256(manifestBytes),
      inventory,
    };
    packages.set(relativeRoot, record);

    const dependencyGroups = [
      ["dependency", manifest.dependencies ?? {}, false],
      ["optional_dependency", manifest.optionalDependencies ?? {}, true],
      ["peer_dependency", manifest.peerDependencies ?? {}, false],
    ];
    for (const [group, dependencies, optional] of dependencyGroups) {
      if (!isRecord(dependencies)) {
        throw new Error(`Invalid ${group} manifest for ${queued.name}`);
      }
      for (const [dependencyName, specifier] of Object.entries(
        dependencies,
      ).sort(([a], [b]) => a.localeCompare(b))) {
        const resolved = resolveInstalledDependency(
          nodeModules,
          queued.packageRoot,
          dependencyName,
        );
        if (!resolved) {
          if (
            optional ||
            manifest.peerDependenciesMeta?.[dependencyName]?.optional === true
          ) {
            missingOptional.push({
              from: relativeRoot,
              name: dependencyName,
              declaredAs: group,
              specifier,
            });
            continue;
          }
          throw new Error(
            `Required ${group.replaceAll("_", " ")} ${dependencyName} is missing for ${queued.name}`,
          );
        }
        const childRelativeRoot = packageRelativeRoot(
          nodeModules,
          resolved.packageRoot,
        );
        dependencyEdges.push({
          from: relativeRoot,
          name: dependencyName,
          declaredAs: group,
          specifier,
          installedPath: childRelativeRoot,
        });
        if (!packages.has(childRelativeRoot)) {
          queue.push({
            name: dependencyName,
            packageRoot: resolved.packageRoot,
            sourceQualification: false,
          });
        }
      }
    }
  }

  const orderedPackages = [...packages.values()].sort((left, right) =>
    left.relativeRoot.localeCompare(right.relativeRoot),
  );
  return {
    packages: orderedPackages,
    packageByPath: packages,
    dependencyEdges: dependencyEdges.sort(
      (left, right) =>
        left.from.localeCompare(right.from) ||
        left.name.localeCompare(right.name),
    ),
    missingOptional,
    installedFileCount: orderedPackages.reduce(
      (total, item) => total + item.inventory.fileCount,
      0,
    ),
    installedUnpackedBytes: orderedPackages.reduce(
      (total, item) => total + item.inventory.unpackedBytes,
      0,
    ),
  };
}

function verifyPinnedRuntimeArchive(
  runtimeArchiveBytes,
  runtimeCatalog,
  installedPackage,
) {
  const catalogIntegrity = runtimeCatalog.npmIntegrity;
  const archiveIntegrity = `sha512-${createHash("sha512")
    .update(runtimeArchiveBytes)
    .digest("base64")}`;
  if (archiveIntegrity !== catalogIntegrity) {
    throw new Error(
      "Pinned runtime archive SHA-512 does not match the shipped catalog",
    );
  }
  if (
    Number.isInteger(runtimeCatalog.packedBytes) &&
    runtimeArchiveBytes.length !== runtimeCatalog.packedBytes
  ) {
    throw new Error(
      "Pinned runtime archive byte length differs from the shipped catalog",
    );
  }
  const archiveEntries = parseNpmTarball(runtimeArchiveBytes);
  const packageJsonBytes = archiveEntries.get("package.json")?.bytes;
  if (!packageJsonBytes)
    throw new Error("Pinned runtime archive has no package.json");
  const packageManifest = requireRecord(
    JSON.parse(packageJsonBytes.toString("utf8")),
    "pinned runtime archive package.json",
  );
  if (
    packageManifest.name !== runtimeCatalog.package ||
    packageManifest.version !== runtimeCatalog.version
  ) {
    throw new Error(
      "Pinned runtime archive package identity differs from the shipped catalog",
    );
  }
  const archiveUnpackedBytes = [...archiveEntries.values()].reduce(
    (total, entry) => total + (entry.kind === "file" ? entry.bytes.length : 0),
    0,
  );
  if (
    Number.isInteger(runtimeCatalog.unpackedBytes) &&
    archiveUnpackedBytes !== runtimeCatalog.unpackedBytes
  ) {
    throw new Error(
      "Pinned runtime archive unpacked size differs from the shipped catalog",
    );
  }
  const installedEntries = collectInstalledFiles(
    installedPackage.installedRoot,
  );
  const archivePaths = [...archiveEntries.keys()].sort();
  const installedPaths = [...installedEntries.keys()].sort();
  if (
    archivePaths.length !== installedPaths.length ||
    archivePaths.some((entry, index) => entry !== installedPaths[index])
  ) {
    throw new Error(
      "Installed runtime file inventory differs from the catalog-pinned archive",
    );
  }
  for (const relativePath of archivePaths) {
    const expected = archiveEntries.get(relativePath);
    const installed = installedEntries.get(relativePath);
    if (
      expected.kind !== installed.kind ||
      (expected.kind === "file" && !expected.bytes.equals(installed.bytes)) ||
      (expected.kind === "symlink" && expected.target !== installed.target)
    ) {
      throw new Error(
        `Installed runtime bytes differ from the catalog-pinned archive: ${relativePath}`,
      );
    }
  }
  return {
    status: "installed_bytes_match_catalog_pinned_archive",
    package: packageManifest.name,
    version: packageManifest.version,
    archiveBytes: runtimeArchiveBytes.length,
    archiveSha256: sha256(runtimeArchiveBytes),
    archiveSha512Integrity: archiveIntegrity,
    unpackedBytes: archiveUnpackedBytes,
    fileCount: archiveEntries.size,
    installedInventorySha256: installedPackage.inventory.sha256,
  };
}

function verifyParserRuntimeProvenance(
  prefix,
  nodeModules,
  runtimeArchivePath,
  packageSources,
  closure,
) {
  const plugin = packageSources.find(
    ({ name }) => name === "kibi-plugin-treesitter",
  );
  const catalogBytes = plugin?.archiveEntries.get("catalog.json")?.bytes;
  const pluginPackageBytes = plugin?.archiveEntries.get("package.json")?.bytes;
  if (!catalogBytes || !pluginPackageBytes) {
    throw new Error(
      "Qualified Tree-sitter plugin is missing its package catalog",
    );
  }
  const catalog = requireRecord(
    JSON.parse(catalogBytes.toString("utf8")),
    "qualified Tree-sitter catalog",
  );
  const pluginManifest = requireRecord(
    JSON.parse(pluginPackageBytes.toString("utf8")),
    "qualified Tree-sitter package manifest",
  );
  if (
    catalog.schemaVersion !== "kibi.treesitter-language-catalog.v1" ||
    catalog.plugin !== plugin.name ||
    catalog.pluginVersion !== pluginManifest.version
  ) {
    throw new Error(
      "Qualified Tree-sitter catalog identity does not match its archive",
    );
  }
  const runtime = requireRecord(catalog.runtime, "Tree-sitter catalog runtime");
  if (
    typeof runtime.package !== "string" ||
    typeof runtime.version !== "string" ||
    typeof runtime.npmTarball !== "string" ||
    typeof runtime.npmIntegrity !== "string" ||
    !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(runtime.npmIntegrity) ||
    pluginManifest.dependencies?.[runtime.package] !== runtime.version
  ) {
    throw new Error(
      "Tree-sitter runtime dependency does not match the shipped catalog",
    );
  }
  if (!Array.isArray(catalog.languages) || catalog.languages.length === 0) {
    throw new Error("Qualified Tree-sitter catalog has no language assets");
  }
  const checkedParserAssets = [];
  for (const language of catalog.languages) {
    const checks = [
      [language.asset, language.assetBytes, language.assetSha256, "asset"],
      [language.query, language.queryBytes, language.querySha256, "query"],
      ...(language.supplementalQueries ?? []).map((query) => [
        query.path,
        query.queryBytes,
        query.querySha256,
        "supplemental_query",
      ]),
    ];
    for (const [assetPath, expectedBytes, expectedHash, kind] of checks) {
      if (
        typeof assetPath !== "string" ||
        !Number.isInteger(expectedBytes) ||
        !/^[a-f0-9]{64}$/.test(expectedHash ?? "")
      ) {
        throw new Error(`Invalid parser asset approval for ${language.id}`);
      }
      const entry = plugin.archiveEntries.get(assetPath);
      if (
        !entry ||
        entry.kind !== "file" ||
        entry.bytes.length !== expectedBytes ||
        sha256(entry.bytes) !== expectedHash
      ) {
        throw new Error(
          `Qualified parser asset differs from its catalog: ${assetPath}`,
        );
      }
      checkedParserAssets.push({
        language: language.id,
        kind,
        path: assetPath,
        bytes: expectedBytes,
        sha256: expectedHash,
      });
    }
  }

  const pluginRelativeRoot = packageRelativeRoot(
    nodeModules,
    plugin.installedRoot,
  );
  const runtimeEdge = closure.dependencyEdges.find(
    (edge) => edge.from === pluginRelativeRoot && edge.name === runtime.package,
  );
  if (!runtimeEdge) {
    throw new Error(
      "Installed Tree-sitter runtime is absent from the plugin dependency closure",
    );
  }
  const runtimePackage = closure.packageByPath.get(runtimeEdge.installedPath);
  if (!runtimePackage || runtimePackage.version !== runtime.version) {
    throw new Error(
      "Installed Tree-sitter runtime version differs from the catalog",
    );
  }
  if (
    !existsSync(runtimeArchivePath) ||
    !statSync(runtimeArchivePath).isFile()
  ) {
    throw new Error(
      "--runtime-archive must name an existing catalog-pinned archive",
    );
  }
  if (
    Number.isInteger(runtime.packedBytes) &&
    statSync(runtimeArchivePath).size !== runtime.packedBytes
  ) {
    throw new Error("--runtime-archive size differs from the shipped catalog");
  }
  const runtimeArchiveBytes = readFileSync(runtimeArchivePath);
  const runtimeArchiveComparison = verifyPinnedRuntimeArchive(
    runtimeArchiveBytes,
    runtime,
    runtimePackage,
  );

  const lockCandidates = [
    {
      path: path.join(nodeModules, ".package-lock.json"),
      relativePath: "node_modules/.package-lock.json",
    },
    {
      path: path.join(prefix, "package-lock.json"),
      relativePath: "package-lock.json",
    },
  ];
  let lock = null;
  for (const candidate of lockCandidates) {
    if (!existsSync(candidate.path) || !statSync(candidate.path).isFile())
      continue;
    const parsed = readJson(candidate.path, "installed-prefix package lock");
    const lockRoot = requireRecord(
      parsed.value,
      "installed-prefix package lock",
    );
    const lockPackages = requireRecord(
      lockRoot.packages,
      "package lock packages",
    );
    const lockKey = `node_modules/${runtimePackage.relativeRoot}`;
    const lockEntry = lockPackages[lockKey];
    if (!isRecord(lockEntry)) continue;
    lock = {
      relativePath: candidate.relativePath,
      sha256: sha256(parsed.bytes),
      entryPath: lockKey,
      entry: lockEntry,
    };
    break;
  }
  if (!lock) {
    throw new Error(
      "Installed prefix has no npm lock entry for the catalog-pinned Tree-sitter runtime",
    );
  }
  if (
    lock.entry.version !== runtime.version ||
    lock.entry.resolved !== runtime.npmTarball ||
    lock.entry.integrity !== runtime.npmIntegrity
  ) {
    throw new Error(
      "Installed-prefix npm lock entry differs from the shipped runtime catalog",
    );
  }
  return {
    pluginCatalog: {
      path: "kibi-plugin-treesitter/catalog.json",
      sha256: sha256(catalogBytes),
      pluginVersion: catalog.pluginVersion,
      runtime: {
        package: runtime.package,
        version: runtime.version,
        npmTarball: runtime.npmTarball,
        npmIntegrity: runtime.npmIntegrity,
        license: runtime.license ?? null,
        packedBytes: runtime.packedBytes ?? null,
        unpackedBytes: runtime.unpackedBytes ?? null,
      },
    },
    lockProvenance: {
      status: "catalog_integrity_and_resolved_url_match",
      path: lock.relativePath,
      sha256: lock.sha256,
      entryPath: lock.entryPath,
      package: runtime.package,
      version: lock.entry.version,
      resolved: lock.entry.resolved,
      integrity: lock.entry.integrity,
      installedPackageInventorySha256: runtimePackage.inventory.sha256,
      installedBytesComparedToCatalogArchive: true,
      approvedArchiveSha256: runtimeArchiveComparison.archiveSha256,
      limitation:
        "The lock integrity and local archive comparison qualify web-tree-sitter; other third-party installed package bytes remain observational inventories unless an approved archive is supplied for them.",
    },
    approvedRuntimeArchiveComparison: runtimeArchiveComparison,
    checkedParserAssets,
  };
}

function normalizeQualificationReport(qualification) {
  if (
    !Array.isArray(qualification.mismatches) ||
    qualification.mismatches.length !== 0
  ) {
    throw new Error("Qualification report must have an empty mismatches array");
  }
  const sourceCandidate = Array.isArray(qualification.tarballs);
  const finalPack = Array.isArray(qualification.packages);
  if (sourceCandidate === finalPack) {
    throw new Error(
      "Qualification must use exactly one supported package inventory shape",
    );
  }
  const entries = sourceCandidate
    ? qualification.tarballs.map((item) => ({
        name: item?.name,
        version: item?.version,
        path: item?.path,
        sha256: item?.sha256,
        bytes: item?.bytes,
        files: undefined,
      }))
    : qualification.packages.map((item) => ({
        name: item?.name,
        version: item?.version,
        path: item?.tarball,
        sha256: item?.tarballSha256,
        bytes: item?.tarballBytes,
        files: item?.files,
      }));
  const declaredPackageCount = sourceCandidate
    ? qualification.packageCount
    : qualification.publishableCount;
  if (
    !Number.isInteger(declaredPackageCount) ||
    declaredPackageCount !== entries.length
  ) {
    throw new Error(
      "Qualification package count does not match its package inventory",
    );
  }
  if (entries.length === 0)
    throw new Error("Qualification package inventory is empty");
  return {
    format: sourceCandidate
      ? "source_candidate_tarballs_v1"
      : "final_pack_packages_v1",
    entries,
    declaredFileCount: sourceCandidate
      ? qualification.packagedFiles
      : qualification.fileCount,
  };
}

/**
 * Every first-party Kibi dependency of a qualified package must itself be
 * archive-qualified. Optional dependencies (the per-platform kibi-swipl
 * bundles) are only installed on their platform, so they are required only
 * when they are actually installed.
 */
function verifyQualifiedKibiDependencies(
  packageSources,
  qualifiedNames,
  isInstalled = () => true,
) {
  const firstPartyDependencies = new Set();
  for (const source of packageSources) {
    const manifestBytes = source.archiveEntries.get("package.json")?.bytes;
    if (!manifestBytes) continue;
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    for (const [group, optional] of [
      [manifest.dependencies, false],
      [manifest.optionalDependencies, true],
      [manifest.peerDependencies, false],
    ]) {
      if (!isRecord(group)) continue;
      for (const dependencyName of Object.keys(group)) {
        if (!dependencyName.startsWith("kibi-")) continue;
        if (optional && !isInstalled(dependencyName)) continue;
        firstPartyDependencies.add(dependencyName);
      }
    }
  }
  for (const dependencyName of firstPartyDependencies) {
    if (!qualifiedNames.has(dependencyName)) {
      throw new Error(
        `Qualification omits first-party Kibi dependency ${dependencyName}`,
      );
    }
  }
  return [...firstPartyDependencies].sort();
}

function verifyQualification(options) {
  if (!existsSync(options.prefix) || !statSync(options.prefix).isDirectory()) {
    throw new Error("--prefix must name an existing npm prefix directory");
  }
  const nodeModules = path.join(options.prefix, "node_modules");
  if (!existsSync(nodeModules) || !statSync(nodeModules).isDirectory()) {
    throw new Error("The explicit prefix must contain node_modules/");
  }
  const parsed = readJson(options.qualification, "package qualification");
  const qualification = requireRecord(parsed.value, "package qualification");
  const normalized = normalizeQualificationReport(qualification);

  const seen = new Set();
  const packages = [];
  const packageSources = [];
  let packagedFiles = 0;
  let packageBytes = 0;
  for (const itemValue of normalized.entries) {
    const item = requireRecord(itemValue, "qualification package entry");
    for (const key of ["name", "version", "path", "sha256", "bytes"]) {
      if (
        typeof item[key] !== "string" &&
        !(key === "bytes" && Number.isInteger(item[key]))
      ) {
        throw new Error(`Qualification tarball entry is missing ${key}`);
      }
    }
    if (!/^[a-f0-9]{64}$/.test(item.sha256) || item.bytes < 1) {
      throw new Error(`Qualification tarball pin is invalid for ${item.name}`);
    }
    if (seen.has(item.name))
      throw new Error(`Duplicate qualified package ${item.name}`);
    seen.add(item.name);

    const archivePath = path.resolve(item.path);
    const archiveBytes = readFileSync(archivePath);
    if (
      archiveBytes.length !== item.bytes ||
      sha256(archiveBytes) !== item.sha256
    ) {
      throw new Error(`Qualified tarball byte pin does not match ${item.name}`);
    }
    const archiveEntries = parseNpmTarball(archiveBytes);
    const packageRoot = packageDirectory(nodeModules, item.name);
    if (!existsSync(packageRoot) || !lstatSync(packageRoot).isDirectory()) {
      throw new Error(
        `Qualified package is not installed at the explicit prefix: ${item.name}`,
      );
    }
    const installedRoot = realpathSync(packageRoot);
    const realNodeModules = realpathSync(nodeModules);
    if (!installedRoot.startsWith(`${realNodeModules}${path.sep}`)) {
      throw new Error(
        `Installed package escapes the explicit prefix: ${item.name}`,
      );
    }
    const installedEntries = collectInstalledFiles(packageRoot, "", {
      excludeDependencyTrees: true,
    });
    const expectedPaths = [...archiveEntries.keys()].sort();
    const installedPaths = [...installedEntries.keys()].sort();
    if (
      expectedPaths.length !== installedPaths.length ||
      expectedPaths.some((entry, index) => entry !== installedPaths[index])
    ) {
      throw new Error(
        `Installed file inventory differs from the qualified tarball for ${item.name}`,
      );
    }
    if (Number.isInteger(item.files) && item.files !== expectedPaths.length) {
      throw new Error(
        `Qualification file count differs from archive contents for ${item.name}`,
      );
    }
    let unpackedBytes = 0;
    for (const relativePath of expectedPaths) {
      const expected = archiveEntries.get(relativePath);
      const installed = installedEntries.get(relativePath);
      if (expected.kind !== installed.kind) {
        throw new Error(
          `Installed file type differs from the qualified tarball: ${item.name}/${relativePath}`,
        );
      }
      if (expected.kind === "file") {
        if (sha256(expected.bytes) !== sha256(installed.bytes)) {
          throw new Error(
            `Installed file bytes differ from the qualified tarball: ${item.name}/${relativePath}`,
          );
        }
        unpackedBytes += expected.bytes.length;
      } else if (expected.target !== installed.target) {
        throw new Error(
          `Installed symlink differs from the qualified tarball: ${item.name}/${relativePath}`,
        );
      }
    }
    const packageJsonBytes = archiveEntries.get("package.json")?.bytes;
    if (!packageJsonBytes)
      throw new Error(`Archive has no package.json: ${item.name}`);
    const packageJson = JSON.parse(packageJsonBytes.toString("utf8"));
    if (
      packageJson.name !== item.name ||
      packageJson.version !== item.version
    ) {
      throw new Error(
        `Archive package identity disagrees with qualification: ${item.name}`,
      );
    }
    const installedPackageJson = JSON.parse(
      readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    );
    if (
      installedPackageJson.name !== item.name ||
      installedPackageJson.version !== item.version
    ) {
      throw new Error(
        `Installed package identity disagrees with qualification: ${item.name}`,
      );
    }
    packages.push({
      name: item.name,
      version: item.version,
      tarballSha256: item.sha256,
      archiveBytes: item.bytes,
      installedFileCount: installedEntries.size,
      installedUnpackedBytes: unpackedBytes,
    });
    packageSources.push({
      name: item.name,
      installedRoot: packageRoot,
      relativeRoot: packageRelativeRoot(nodeModules, packageRoot),
      archiveEntries,
    });
    packagedFiles += expectedPaths.length;
    packageBytes += item.bytes;
  }
  for (const requiredName of REQUIRED_PACKAGES) {
    if (!seen.has(requiredName))
      throw new Error(`Qualification omits required package ${requiredName}`);
  }
  const firstPartyDependencyNames = verifyQualifiedKibiDependencies(
    packageSources,
    seen,
    (name) =>
      existsSync(
        path.join(packageDirectory(nodeModules, name), "package.json"),
      ),
  );
  if (
    Number.isInteger(normalized.declaredFileCount) &&
    normalized.declaredFileCount !== packagedFiles
  ) {
    throw new Error(
      "Qualification file count does not match verified archive contents",
    );
  }

  const dependencyClosure = collectInstalledDependencyClosure(
    nodeModules,
    packageSources,
  );
  for (const edge of dependencyClosure.dependencyEdges) {
    if (
      edge.name.startsWith("kibi-") &&
      !dependencyClosure.packageByPath.get(edge.installedPath)
        ?.sourceQualification
    ) {
      throw new Error(
        `Kibi dependency is installed but not covered by source qualification: ${edge.name}`,
      );
    }
  }
  const parserRuntimeProvenance = verifyParserRuntimeProvenance(
    options.prefix,
    nodeModules,
    options.runtimeArchive,
    packageSources,
    dependencyClosure,
  );

  const cliPackage = packageDirectory(nodeModules, "kibi-cli");
  const cliEntry = path.join(cliPackage, "bin", "kibi");
  if (!existsSync(cliEntry) || !statSync(cliEntry).isFile()) {
    throw new Error("Qualified kibi-cli package has no bin/kibi entry");
  }
  const plugin = packages.find(({ name }) => name === "kibi-plugin-treesitter");
  const cli = packages.find(({ name }) => name === "kibi-cli");
  return {
    cliEntry,
    pluginVersion: plugin.version,
    cliVersion: cli.version,
    packageSources: dependencyClosure.packages,
    dependencyClosure,
    parserRuntimeProvenance,
    sourceQualification: {
      sha256: sha256(parsed.bytes),
      format: normalized.format,
      packageCount: packages.length,
      verifiedPackagedFiles: packagedFiles,
      archiveBytes: packageBytes,
      packages,
      installedDependencyClosure: {
        strategy: "recursive_manifest_resolution_from_explicit_npm_prefix",
        packageCount: dependencyClosure.packages.length,
        installedFileCount: dependencyClosure.installedFileCount,
        installedUnpackedBytes: dependencyClosure.installedUnpackedBytes,
        firstPartyArchiveQualifiedPackageCount: packages.length,
        firstPartyKibiDependencyNames: firstPartyDependencyNames,
        thirdPartyInstalledInventoryPackageCount:
          dependencyClosure.packages.filter(
            ({ sourceQualification }) => !sourceQualification,
          ).length,
        missingOptionalDependencies: dependencyClosure.missingOptional,
        dependencyEdges: dependencyClosure.dependencyEdges,
        packages: dependencyClosure.packages.map((item) => ({
          name: item.name,
          version: item.version,
          relativeRoot: item.relativeRoot,
          sourceQualification: item.sourceQualification
            ? "qualified_first_party_archive"
            : "observed_installed_prefix_only",
          manifestSha256: item.manifestSha256,
          inventorySha256: item.inventory.sha256,
          fileCount: item.inventory.fileCount,
          unpackedBytes: item.inventory.unpackedBytes,
          files: item.inventory.files,
        })),
        thirdPartyByteQualification:
          "third-party installed bytes are SHA-256 inventoried and copy-checked; web-tree-sitter is also compared byte-for-byte to the catalog-pinned archive, while other third-party packages remain unqualified against registry archives",
      },
    },
  };
}

function copyQualifiedPackages(packageSources, workspace) {
  const localNodeModules = path.join(workspace, "node_modules");
  mkdirSync(localNodeModules, { recursive: false });
  for (const item of [...packageSources].sort(
    (left, right) =>
      left.relativeRoot.split("/").length -
      right.relativeRoot.split("/").length,
  )) {
    const destination = path.join(
      localNodeModules,
      ...item.relativeRoot.split("/"),
    );
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(item.installedRoot, destination, {
      recursive: true,
      dereference: false,
      verbatimSymlinks: true,
    });
    const localEntries = collectInstalledFiles(destination, "", {
      excludeDependencyTrees: true,
    });
    const localInventory = installedFileInventory(destination);
    if (localInventory.sha256 !== item.inventory.sha256) {
      throw new Error(
        `Temporary project package copy differs from the installed-prefix inventory: ${item.name}`,
      );
    }
    if (item.archiveEntries) {
      const expectedPaths = [...item.archiveEntries.keys()].sort();
      const localPaths = [...localEntries.keys()].sort();
      if (
        expectedPaths.length !== localPaths.length ||
        expectedPaths.some((entry, index) => entry !== localPaths[index])
      ) {
        throw new Error(
          `Temporary project package copy differs from the qualified release: ${item.name}`,
        );
      }
      for (const relativePath of expectedPaths) {
        const expected = item.archiveEntries.get(relativePath);
        const local = localEntries.get(relativePath);
        if (
          expected.kind !== local.kind ||
          (expected.kind === "file" &&
            sha256(expected.bytes) !== sha256(local.bytes)) ||
          (expected.kind === "symlink" && expected.target !== local.target)
        ) {
          throw new Error(
            `Temporary project package bytes differ from the qualified release: ${item.name}/${relativePath}`,
          );
        }
      }
    }
  }
  return localNodeModules;
}

function readRssBytes(pid) {
  if (!Number.isInteger(pid) || pid < 1 || process.platform !== "linux")
    return null;
  try {
    const status = readFileSync(`/proc/${pid}/status`, "utf8");
    const match = /^VmRSS:\s+(\d+)\s+kB$/m.exec(status);
    return match ? Number(match[1]) * 1024 : null;
  } catch {
    return null;
  }
}

function makeRuntimeEnvironment(workspace, traceDirectory) {
  const gitConfig = path.join(workspace, "home", ".gitconfig-empty");
  const environment = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: path.join(workspace, "home"),
    USERPROFILE: path.join(workspace, "home"),
    TMPDIR: workspace,
    TEMP: workspace,
    TMP: workspace,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    NODE_ENV: "production",
    KIBI_RUNTIME_DIR: path.join(workspace, "runtime"),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: gitConfig,
  };
  for (const name of [
    "LD_LIBRARY_PATH",
    "SWI_HOME_DIR",
    "SWI_BOOT_PATH",
    "SystemRoot",
    "WINDIR",
    "PATHEXT",
  ]) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  mkdirSync(environment.HOME, { recursive: true });
  writeFileSync(gitConfig, "");
  mkdirSync(environment.KIBI_RUNTIME_DIR, { recursive: true });
  if (traceDirectory !== undefined) {
    environment.KIBI_PERF_TIMINGS = "1";
    environment.KIBI_PERF_TRACE_DIR = traceDirectory;
  }
  return environment;
}

function isPathWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function assertPrivateTraceDirectory(directory, protectedRoots = []) {
  if (
    typeof directory !== "string" ||
    !path.isAbsolute(directory) ||
    typeof process.getuid !== "function"
  ) {
    throw new Error("Performance trace directory is not safely verifiable");
  }
  const linkInfo = lstatSync(directory);
  if (!linkInfo.isDirectory() || linkInfo.isSymbolicLink()) {
    throw new Error("Performance trace directory must be a real directory");
  }
  const realDirectory = realpathSync(directory);
  if (path.resolve(directory) !== realDirectory) {
    throw new Error("Performance trace directory must use its canonical path");
  }
  const directoryInfo = statSync(realDirectory);
  if (
    directoryInfo.uid !== process.getuid() ||
    (directoryInfo.mode & 0o077) !== 0
  ) {
    throw new Error(
      "Performance trace directory must be private and user-owned",
    );
  }
  for (const protectedRoot of protectedRoots) {
    const canonicalRoot = realpathSync(protectedRoot);
    if (isPathWithin(canonicalRoot, realDirectory)) {
      throw new Error(
        "Performance trace directory must be outside the checkout and scenario",
      );
    }
  }
  return realDirectory;
}

function listPerformanceTraceFiles(directory, protectedRoots = []) {
  const realDirectory = assertPrivateTraceDirectory(directory, protectedRoots);
  const names = readdirSync(realDirectory).sort();
  const files = new Map();
  let totalBytes = 0;
  for (const name of names) {
    const match = /^kibi-performance-(\d+)\.jsonl$/.exec(name);
    if (!match)
      throw new Error("Performance trace directory has an unexpected entry");
    const pid = Number(match[1]);
    if (!Number.isSafeInteger(pid) || pid < 1) {
      throw new Error("Performance trace filename has an invalid PID");
    }
    const filename = path.join(realDirectory, name);
    const fileInfo = lstatSync(filename);
    if (
      !fileInfo.isFile() ||
      fileInfo.isSymbolicLink() ||
      fileInfo.uid !== process.getuid() ||
      (fileInfo.mode & 0o077) !== 0 ||
      fileInfo.nlink !== 1
    ) {
      throw new Error(
        "Performance trace file is not a private owned regular file",
      );
    }
    if (fileInfo.size > MAX_TRACE_FILE_BYTES) {
      throw new Error("Performance trace file exceeded its byte bound");
    }
    totalBytes += fileInfo.size;
    if (totalBytes > MAX_TRACE_DIRECTORY_BYTES) {
      throw new Error("Performance trace directory exceeded its byte bound");
    }
    files.set(name, { pid, size: fileInfo.size });
  }
  return files;
}

function capturePerformanceTraceOffsets(directory, protectedRoots = []) {
  return listPerformanceTraceFiles(directory, protectedRoots);
}

function readPerformanceTraceWindow(directory, before, protectedRoots = []) {
  const after = listPerformanceTraceFiles(directory, protectedRoots);
  for (const name of before.keys()) {
    if (!after.has(name)) {
      throw new Error(
        "Performance trace file disappeared during an invocation",
      );
    }
  }

  const events = [];
  let readBytes = 0;
  for (const [name, current] of after) {
    const offset = before.get(name)?.size ?? 0;
    if (current.size < offset) {
      return { status: "truncated", events: [] };
    }
    readBytes += current.size - offset;
    if (readBytes > MAX_TRACE_DIRECTORY_BYTES) {
      return { status: "truncated", events: [] };
    }
    if (current.size === offset) continue;
    const bytes = readFileSync(path.join(directory, name));
    if (bytes.length !== current.size) {
      return { status: "truncated", events: [] };
    }
    const window = bytes.subarray(offset);
    if (window.at(-1) !== 0x0a) {
      return { status: "truncated", events: [] };
    }
    const lines = window.toString("utf8").slice(0, -1).split("\n");
    for (const line of lines) {
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        throw new Error("Performance trace contains malformed JSON");
      }
      if (!isRecord(event)) {
        throw new Error("Performance trace event must be a JSON object");
      }
      if (event.kind === "trace-limit") {
        if (
          Object.keys(event).sort().join(",") !== "kind,limit,pid" ||
          event.pid !== current.pid ||
          !["bytes", "events"].includes(event.limit)
        ) {
          throw new Error("Performance trace limit marker is malformed");
        }
        return { status: "truncated", events: [] };
      }
      const keys = Object.keys(event).sort().join(",");
      if (
        keys !== "durationMs,kind,pid" ||
        ![
          "prolog-round-trip",
          "prolog-process-cache-hit",
          "engine-query-cache-hit",
          "engine-freshness-cache-hit",
        ].includes(event.kind) ||
        event.pid !== current.pid ||
        typeof event.durationMs !== "number" ||
        !Number.isFinite(event.durationMs) ||
        event.durationMs < 0 ||
        event.durationMs > MAX_PERFORMANCE_DURATION_MS
      ) {
        throw new Error("Performance trace event has an invalid schema");
      }
      events.push({
        kind: event.kind,
        durationMs: event.durationMs,
        pid: event.pid,
      });
      if (events.length > MAX_TRACE_DIRECTORY_EVENTS) {
        return { status: "truncated", events: [] };
      }
    }
  }
  let status = "unavailable_no_new_events";
  if (events.length > 0) status = "observed";
  else if (after.size === 0) status = "unavailable_no_events";
  return { status, events };
}

function parseSourceAnalysisTimings(stderr) {
  const observations = [];
  const expectedKeys = [
    "analysisWallMs",
    "kind",
    "language",
    "parseWallMs",
    "parserInitializationWallMs",
    "totalAnalysisWallMs",
  ];
  for (const line of stderr.split("\n")) {
    if (!line.startsWith(PERFORMANCE_PREFIX)) continue;
    let event;
    try {
      event = JSON.parse(line.slice(PERFORMANCE_PREFIX.length));
    } catch {
      throw new Error("Kibi emitted malformed source-analysis timing JSON");
    }
    if (isRecord(event) && event.kind === "source-analysis-truncated") {
      if (
        Object.keys(event).sort().join(",") !== "kind,reason" ||
        !["byte_limit", "event_limit"].includes(event.reason)
      ) {
        throw new Error(
          "Kibi emitted a malformed source-analysis limit marker",
        );
      }
      return {
        status: "truncated",
        eventCount: null,
        phaseWallMs: null,
        observations: [],
      };
    }
    if (
      !isRecord(event) ||
      Object.keys(event).sort().join(",") !== expectedKeys.join(",") ||
      event.kind !== "source-analysis" ||
      !["python", "go", "rust"].includes(event.language) ||
      ![
        event.parserInitializationWallMs,
        event.parseWallMs,
        event.analysisWallMs,
        event.totalAnalysisWallMs,
      ].every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 0 &&
          value <= MAX_PERFORMANCE_DURATION_MS,
      )
    ) {
      throw new Error(
        "Kibi emitted a source-analysis timing with an invalid schema",
      );
    }
    observations.push({
      language: event.language,
      parserInitializationWallMs: event.parserInitializationWallMs,
      parseWallMs: event.parseWallMs,
      analysisWallMs: event.analysisWallMs,
      totalAnalysisWallMs: event.totalAnalysisWallMs,
    });
    if (observations.length > 5_000) {
      throw new Error("Kibi emitted too many source-analysis timing events");
    }
  }
  if (observations.length === 0) {
    return {
      status: "unavailable_no_events",
      eventCount: null,
      phaseWallMs: null,
      observations: [],
    };
  }
  return {
    status: "observed",
    eventCount: observations.length,
    phaseWallMs: {
      parserInitialization: observations.reduce(
        (total, event) => total + event.parserInitializationWallMs,
        0,
      ),
      parse: observations.reduce(
        (total, event) => total + event.parseWallMs,
        0,
      ),
      analysis: observations.reduce(
        (total, event) => total + event.analysisWallMs,
        0,
      ),
      totalAnalysis: observations.reduce(
        (total, event) => total + event.totalAnalysisWallMs,
        0,
      ),
    },
    observations,
  };
}

function assertAcceptedCheckTimingCoverage(
  sourceAnalysis,
  prologTiming,
  { requireRoundTrip = false } = {},
) {
  const expectedLanguages = ["python", "go", "rust"];
  if (
    sourceAnalysis.status !== "observed" ||
    !Array.isArray(sourceAnalysis.observations) ||
    !expectedLanguages.every((language) =>
      sourceAnalysis.observations.some(
        (observation) => observation.language === language,
      ),
    )
  ) {
    throw new Error(
      "Accepted staged check omitted complete Python, Go and Rust parser timing observations",
    );
  }
  if (
    !["observed", "observed_without_round_trips"].includes(
      prologTiming.status,
    ) ||
    !Number.isSafeInteger(prologTiming.eventCount) ||
    prologTiming.eventCount < 1 ||
    !Number.isSafeInteger(prologTiming.roundTrips.count) ||
    !Number.isSafeInteger(prologTiming.cacheHits.count) ||
    prologTiming.roundTrips.count + prologTiming.cacheHits.count < 1
  ) {
    throw new Error(
      "Accepted staged check omitted usable Prolog round-trip or cache timing observations",
    );
  }
  if (requireRoundTrip && prologTiming.roundTrips.count < 1) {
    throw new Error(
      "Accepted one-shot staged check omitted a genuine Prolog query round trip",
    );
  }
}

function summarizePrologTiming(window) {
  if (window.status !== "observed") {
    return {
      status: window.status,
      eventCount: null,
      roundTrips: { count: null, observedWallMs: null },
      cacheHits: { count: null, observedLookupWallMs: null, byKind: null },
    };
  }
  const roundTrips = window.events.filter(
    ({ kind }) => kind === "prolog-round-trip",
  );
  const cacheHits = window.events.filter(({ kind }) =>
    kind.endsWith("cache-hit"),
  );
  const byKind = Object.fromEntries(
    [
      "prolog-process-cache-hit",
      "engine-query-cache-hit",
      "engine-freshness-cache-hit",
    ].map((kind) => [
      kind,
      cacheHits.filter((event) => event.kind === kind).length,
    ]),
  );
  return {
    status: roundTrips.length > 0 ? "observed" : "observed_without_round_trips",
    eventCount: window.events.length,
    roundTrips: {
      count: roundTrips.length,
      observedWallMs:
        roundTrips.length > 0
          ? roundTrips.reduce((total, event) => total + event.durationMs, 0)
          : null,
    },
    cacheHits: {
      count: cacheHits.length,
      observedLookupWallMs:
        cacheHits.length > 0
          ? cacheHits.reduce((total, event) => total + event.durationMs, 0)
          : null,
      byKind,
    },
  };
}

function sampleMemory(childPid, enginePid, samples, startedAt) {
  const childBytes = readRssBytes(childPid);
  const engineBytes = readRssBytes(enginePid);
  if (childBytes === null && engineBytes === null) return;
  samples.push({
    offsetMs: Math.max(0, performance.now() - startedAt),
    childRssBytes: childBytes,
    engineRssBytes: engineBytes,
    observedTotalBytes: (childBytes ?? 0) + (engineBytes ?? 0),
  });
}

async function spawnMeasured(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const stdout = [];
  const stderr = [];
  const samples = [];
  const maxOutputBytes = 12 * 1024 * 1024;
  let outputBytes = 0;
  let spawnAt = null;
  let sampler = null;
  let timedOut = false;
  let closedAt = null;
  let killTimer = null;
  let killTimeout = null;

  const resultPromise = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("spawn", () => {
      spawnAt = performance.now();
      if (options.sampleMemory) {
        sampleMemory(child.pid, options.enginePid, samples, spawnAt);
        sampler = setInterval(
          () => sampleMemory(child.pid, options.enginePid, samples, spawnAt),
          SAMPLE_INTERVAL_MS,
        );
      }
      killTimeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        killTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
      }, options.timeoutMs ?? COMMAND_TIMEOUT_MS);
    });
    child.once("close", (code, signal) => {
      closedAt = performance.now();
      if (sampler) clearInterval(sampler);
      if (killTimeout) clearTimeout(killTimeout);
      if (killTimer) clearTimeout(killTimer);
      if (options.sampleMemory && spawnAt !== null) {
        sampleMemory(child.pid, options.enginePid, samples, spawnAt);
      }
      resolve({ code, signal, timedOut, spawnAt, stdout, stderr, samples });
    });
  });

  child.stdout.on("data", (chunk) => {
    outputBytes += chunk.length;
    if (outputBytes > maxOutputBytes) {
      child.kill("SIGTERM");
      return;
    }
    stdout.push(Buffer.from(chunk));
  });
  child.stderr.on("data", (chunk) => {
    outputBytes += chunk.length;
    if (outputBytes > maxOutputBytes) {
      child.kill("SIGTERM");
      return;
    }
    stderr.push(Buffer.from(chunk));
  });
  if (options.input === undefined) child.stdin.end();
  else child.stdin.end(options.input);

  let result;
  try {
    result = await resultPromise;
  } catch (error) {
    if (sampler) clearInterval(sampler);
    if (killTimeout) clearTimeout(killTimeout);
    if (killTimer) clearTimeout(killTimer);
    throw error;
  }
  const stdoutText = Buffer.concat(stdout).toString("utf8");
  const stderrText = Buffer.concat(stderr).toString("utf8");
  if (result.timedOut)
    throw new Error(
      `Command timed out after ${options.timeoutMs ?? COMMAND_TIMEOUT_MS} ms`,
    );
  if (outputBytes > maxOutputBytes)
    throw new Error("Command output exceeded the 12 MiB safety bound");
  const spawnToCloseMs =
    result.spawnAt === null || closedAt === null
      ? null
      : closedAt - result.spawnAt;
  return {
    code: result.code,
    signal: result.signal,
    stdout: stdoutText,
    stderr: stderrText,
    spawnToCloseMs,
    rss: summarizeRss(result.samples),
  };
}

function summarizeRss(samples) {
  const totals = samples.map(({ observedTotalBytes }) => observedTotalBytes);
  const offsets = samples.map(({ offsetMs }) => offsetMs);
  const deltas = offsets.slice(1).map((value, index) => value - offsets[index]);
  return {
    samplingIntervalMs: SAMPLE_INTERVAL_MS,
    sampleCount: samples.length,
    observedWindowMs: offsets.length
      ? offsets[offsets.length - 1] - offsets[0]
      : 0,
    observedIntervalMinMs: deltas.length ? Math.min(...deltas) : null,
    observedIntervalMaxMs: deltas.length ? Math.max(...deltas) : null,
    sampledPeakBytes: totals.length ? Math.max(...totals) : null,
    scope:
      "direct Kibi CLI host process plus a previously verified Kibi engine host PID when supplied on Linux; staged checks and cold status record CLI host RSS only until the engine PID is verified afterward; host RSS includes worker threads, sampled lower bound, excludes descendant OS processes such as SWI-Prolog and unrelated processes",
  };
}

function runGit(args, cwd, env) {
  const result = spawnSync("git", args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: 12 * 1024 * 1024,
  });
  if (result.error)
    throw new Error(`git ${args[0]} failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function gitSnapshotIdentity(workspace, env) {
  return {
    head: runGit(["rev-parse", "HEAD"], workspace, env).trim(),
    indexTree: runGit(["write-tree"], workspace, env).trim(),
  };
}

function assertGitSnapshotPreserved(before, after, label) {
  if (before.head !== after.head || before.indexTree !== after.indexTree) {
    throw new Error(`${label} changed the synthetic Git HEAD or staged index`);
  }
}

function parseCommandJson(output, description) {
  try {
    return requireRecord(JSON.parse(output.trim()), `${description} output`);
  } catch (error) {
    throw new Error(
      `${description} did not return one JSON value: ${error.message}`,
    );
  }
}

function publicData(envelope) {
  if (isRecord(envelope.structuredContent)) {
    if (isRecord(envelope.structuredContent.data))
      return envelope.structuredContent.data;
    return envelope.structuredContent;
  }
  if (isRecord(envelope.data)) return envelope.data;
  return envelope;
}

function assertSuccess(result, description) {
  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(
      `${description} failed with exit ${result.code}${detail ? `: ${detail}` : ""}`,
    );
  }
}

async function invokeKibi(cliEntry, args, cwd, env, options = {}) {
  const input =
    options.input === undefined
      ? undefined
      : `${JSON.stringify(options.input)}\n`;
  const traceDirectory = options.traceDirectory ?? env.KIBI_PERF_TRACE_DIR;
  const protectedRoots = [REPOSITORY_ROOT, cwd];
  const traceOffsets =
    typeof traceDirectory === "string"
      ? capturePerformanceTraceOffsets(traceDirectory, protectedRoots)
      : null;
  const command = await spawnMeasured(process.execPath, [cliEntry, ...args], {
    cwd,
    env,
    ...(input === undefined ? {} : { input }),
    ...(options.enginePid ? { enginePid: options.enginePid } : {}),
    sampleMemory: options.sampleMemory === true,
    timeoutMs: options.timeoutMs,
  });
  if (options.requireSuccess !== false)
    assertSuccess(command, `kibi ${args.join(" ")}`);
  const sourceAnalysis = parseSourceAnalysisTimings(command.stderr);
  const prologTiming =
    traceOffsets === null
      ? summarizePrologTiming({ status: "unavailable_not_enabled", events: [] })
      : summarizePrologTiming(
          readPerformanceTraceWindow(
            traceDirectory,
            traceOffsets,
            protectedRoots,
          ),
        );
  const output = options.json
    ? parseCommandJson(command.stdout, `kibi ${args[0]}`)
    : null;
  return {
    command,
    output,
    data: output ? publicData(output) : null,
    sourceAnalysis,
    prologTiming,
  };
}

async function verifyScenarioEnginePid(
  cliEntry,
  workspace,
  env,
  expectedPid = null,
) {
  const beforeJanitor = gitSnapshotIdentity(workspace, env);
  const janitor = await invokeKibi(
    cliEntry,
    ["engine", "janitor", "--all", "--format", "json"],
    workspace,
    env,
    { json: true },
  );
  assertGitSnapshotPreserved(
    beforeJanitor,
    gitSnapshotIdentity(workspace, env),
    "Read-only scenario engine verification",
  );
  const findings = janitor.data?.findings;
  const liveSockets = Array.isArray(findings)
    ? findings.filter(
        (finding) =>
          finding.kind === "socket" &&
          finding.holderState === "alive" &&
          Number.isSafeInteger(finding.pid) &&
          finding.pid > 0,
      )
    : [];
  if (liveSockets.length !== 1) {
    const findingSummary = Array.isArray(findings)
      ? findings.map(({ kind, holderState, action, pid }) => ({
          kind,
          holderState,
          action,
          hasPid: Number.isSafeInteger(pid) && pid > 0,
        }))
      : findings;
    throw new Error(
      `Public read-only engine janitor did not observe exactly one live scenario engine socket after status: ${JSON.stringify(findingSummary)}`,
    );
  }
  const observedPid = liveSockets[0].pid;
  if (expectedPid !== null && observedPid !== expectedPid) {
    throw new Error(
      "Warm status did not retain the engine PID observed after the preceding status",
    );
  }
  const beforeStatus = gitSnapshotIdentity(workspace, env);
  const status = await invokeKibi(
    cliEntry,
    ["engine", "status"],
    workspace,
    env,
  );
  assertGitSnapshotPreserved(
    beforeStatus,
    gitSnapshotIdentity(workspace, env),
    "Engine status verification",
  );
  const statusData = parseCommandJson(
    status.command.stdout,
    "kibi engine status",
  );
  if (
    statusData.running !== true ||
    statusData.pid !== observedPid ||
    (expectedPid !== null && statusData.pid !== expectedPid)
  ) {
    throw new Error(
      "Public engine status did not confirm the scenario engine PID observed by the janitor",
    );
  }
  return {
    pid: statusData.pid,
    janitorSpawnToCloseMs: janitor.command.spawnToCloseMs,
    engineStatusSpawnToCloseMs: status.command.spawnToCloseMs,
  };
}

async function stopEngineAndRemoveWorkspace({
  workspace,
  traceDirectory,
  measurements,
  stopEngine,
  primaryError,
}) {
  try {
    const stopped = await stopEngine();
    measurements.engineCleanup = {
      status: "stopped",
      spawnToCloseMs: stopped.command.spawnToCloseMs,
      verifiedBy: "successful public kibi engine stop command",
    };
  } catch (cleanupError) {
    const detail =
      cleanupError instanceof Error
        ? cleanupError.message
        : String(cleanupError);
    const error = new Error(
      `${primaryError instanceof Error ? `${primaryError.message}; ` : ""}Public engine stop failed; temporary workspace preserved at ${workspace}: ${detail}`,
    );
    error.benchmarkCleanup = {
      status: "stop_failed_workspace_preserved",
      workspacePath: workspace,
      ...(typeof traceDirectory === "string"
        ? { traceDirectoryPath: traceDirectory }
        : {}),
      verifiedBy:
        "public kibi engine stop failed; no PID was signaled directly",
    };
    throw error;
  }
  rmSync(workspace, { recursive: true, force: true });
  if (typeof traceDirectory === "string") {
    rmSync(traceDirectory, { recursive: true, force: true });
  }
}

function createSyntheticDeclarations(language, count) {
  const declarations = [];
  for (let index = 0; index < count; index += 1) {
    const marker = String(index).padStart(3, "0");
    if (language === "python") {
      declarations.push(
        `\ndef bench_generated_${marker}(value):\n    return f"{value}:kibi-bench-baseline-${marker}"\n`,
      );
    } else if (language === "go") {
      declarations.push(
        `\nfunc BenchGenerated${marker}(value string) string { return value + ":kibi-bench-baseline-${marker}" }\n`,
      );
    } else {
      declarations.push(
        `\npub fn bench_generated_${marker}() -> &'static str { ":kibi-bench-baseline-${marker}" }\n`,
      );
    }
  }
  return declarations.join("");
}

function fixtureSources(count) {
  const quotient = Math.floor(count / 3);
  const counts = [quotient, quotient, count - quotient * 2];
  const extensionByLanguage = { python: "py", go: "go", rust: "rs" };
  return Object.entries(FIXTURES).map(([language, relativePath], index) => {
    const fixturePath = path.join(REPOSITORY_ROOT, relativePath);
    const original = readFileSync(fixturePath, "utf8");
    const content = `${original.replace(/\s*$/, "\n")}${createSyntheticDeclarations(language, counts[index])}`;
    return {
      language,
      relativeFixture: relativePath,
      relativePath: `src/benchmark/${language}/fixture.${extensionByLanguage[language]}`,
      content,
      declarationCount: counts[index],
    };
  });
}

function stageContent(source) {
  if (source.declarationCount < 1)
    throw new Error(`No generated declaration in ${source.relativePath}`);
  const marker = ":kibi-bench-baseline-000";
  if (!source.content.includes(marker))
    throw new Error(`Missing generated marker in ${source.relativePath}`);
  return source.content.replace(marker, ":kibi-bench-staged-000");
}

function makeEntityInput(
  type,
  id,
  properties,
  relationships = [],
  documentPath = undefined,
) {
  return {
    type,
    id,
    properties,
    ...(relationships.length > 0 ? { relationships } : {}),
    ...(documentPath ? { document: { path: documentPath } } : {}),
  };
}

async function authorEntity(cliEntry, workspace, env, input) {
  const validationInput = {
    type: input.type,
    id: input.id,
    properties: input.properties,
    ...(input.relationships ? { relationships: input.relationships } : {}),
  };
  const validation = await invokeKibi(
    cliEntry,
    ["validate-upsert", "--input", "-"],
    workspace,
    env,
    { input: validationInput, json: true },
  );
  if (validation.data.valid !== true) {
    throw new Error(
      `Public validate-upsert rejected ${input.id}: ${(validation.data.errors ?? []).join("; ")}`,
    );
  }
  await invokeKibi(cliEntry, ["upsert", "--input", "-"], workspace, env, {
    input,
    json: true,
  });
}

function normalizeBenchmarkClaim(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
}

function buildRequirementInput(receipt) {
  const text = BENCHMARK_REQUIREMENT_TEXT;
  if (receipt.inventory_contract?.source_field !== "semantic_text") {
    throw new Error(
      "Semantic advisor did not bind its receipt to semantic_text",
    );
  }
  const sourceHash = sha256(Buffer.from(text, "utf8"));
  if (receipt.inventory_contract.source_hash !== sourceHash) {
    throw new Error(
      "Semantic advisor source hash differs from the exact benchmark prose bytes",
    );
  }
  const propositions = receipt.propositions;
  if (!Array.isArray(propositions))
    throw new Error("Semantic advisor returned no proposition ledger");
  const contextRoles = new Set(["rationale", "example", "subjective"]);
  const expectedLanguageByClaim = new Map(
    BENCHMARK_REQUIREMENT_CLAUSES.map((claim, index) => [
      normalizeBenchmarkClaim(claim),
      ["python", "go", "rust"][index],
    ]),
  );
  const modeledByLanguage = new Map();
  const semanticInventory = [];
  const logicClaims = [];
  for (const proposition of propositions) {
    const contextOnly = contextRoles.has(proposition.role);
    const normalizedClaim = normalizeBenchmarkClaim(proposition.claim_text);
    const language = expectedLanguageByClaim.get(normalizedClaim);
    if (!language || modeledByLanguage.has(language) || contextOnly) {
      throw new Error(
        `Semantic advisor returned an unexpected or non-core benchmark claim: ${proposition.claim_text}`,
      );
    }
    modeledByLanguage.set(language, proposition);
    logicClaims.push(proposition.claim_key);
    semanticInventory.push({
      claim_key: proposition.claim_key,
      claim_text: proposition.claim_text,
      role: proposition.role,
      status: "modeled",
      span: proposition.span,
      ...(proposition.semantic_key
        ? { semantic_key: proposition.semantic_key }
        : {}),
      ...(proposition.payload_hash
        ? { payload_hash: proposition.payload_hash }
        : {}),
    });
  }
  if (
    modeledByLanguage.size !== BENCHMARK_REQUIREMENT_CLAUSES.length ||
    logicClaims.length !== BENCHMARK_REQUIREMENT_CLAUSES.length
  ) {
    throw new Error(
      "Semantic advisor did not return and preserve all three core fixture claims",
    );
  }

  const subjectKey = "benchmark.synthetic_scenario_fixture_set";
  const subjectId = "FACT-BENCH-SYNTHETIC-FIXTURE-SET";
  const propertyFacts = ["python", "go", "rust"].map((language) => {
    const proposition = modeledByLanguage.get(language);
    const propertyKey = `${language}_fixture_count`;
    const factId = `FACT-BENCH-${language.toUpperCase()}-FIXTURE-COUNT`;
    return {
      id: factId,
      entity: makeEntityInput("fact", factId, {
        title: `Synthetic benchmark ${language} fixture count`,
        status: "active",
        source: "benchmark-synthetic-fixture",
        fact_kind: "property_value",
        subject_key: subjectKey,
        property_key: propertyKey,
        operator: "eq",
        value_type: "int",
        value_int: 1,
        canonical_key: `${subjectKey}.${propertyKey}.eq.1`,
        claim_key: proposition.claim_key,
        claim_text: proposition.claim_text,
      }),
      proposition,
    };
  });
  return {
    facts: [
      makeEntityInput("fact", subjectId, {
        title: "Synthetic benchmark scenario fixture set",
        status: "active",
        source: "benchmark-synthetic-fixture",
        fact_kind: "subject",
        subject_key: subjectKey,
        canonical_key: subjectKey,
      }),
      ...propertyFacts.map(({ entity }) => entity),
    ],
    entity: makeEntityInput(
      "req",
      "REQ-BENCH-PARSER-001",
      {
        title: "Synthetic parser benchmark intent",
        status: "open",
        priority: "must",
        source: "benchmark-synthetic-fixture",
        semantic_text: text,
        semantic_inventory_version: receipt.inventory_contract.version,
        semantic_source_field: receipt.inventory_contract.source_field,
        semantic_source_hash: sourceHash,
        semantic_inventory: semanticInventory,
        logic_claims: logicClaims,
      },
      [],
      ".kb/requirements/REQ-BENCH-PARSER-001.md",
    ),
    relationships: [
      { type: "constrains", from: "REQ-BENCH-PARSER-001", to: subjectId },
      ...propertyFacts.map(({ id }) => ({
        type: "requires_property",
        from: "REQ-BENCH-PARSER-001",
        to: id,
      })),
    ],
  };
}

function symbolAnchor(language) {
  if (language === "go") return "BenchGenerated000";
  return "bench_generated_000";
}

function addBaselineFiles(workspace, packageVersion, sources) {
  const packageConfig = {
    name: "kibi-installed-staged-impact-benchmark",
    private: true,
    version: "1.0.0",
    devDependencies: { "kibi-plugin-treesitter": packageVersion },
    kibi: {
      plugins: [
        {
          package: "kibi-plugin-treesitter",
          capabilities: { "kibi.symbol-extractor.v2": { mode: "augment" } },
        },
      ],
    },
  };
  writeFileSync(
    path.join(workspace, "package.json"),
    `${JSON.stringify(packageConfig, null, 2)}\n`,
  );
  writeFileSync(
    path.join(workspace, ".gitignore"),
    "node_modules/\nhome/\nruntime/\n",
  );
  for (const source of sources) {
    const file = path.join(workspace, source.relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, source.content, "utf8");
  }
}

function writeBaselineImpactPolicy(workspace) {
  const policyPath = path.join(workspace, ".kibi", "impact-policy.json");
  mkdirSync(path.dirname(policyPath), { recursive: true });
  const policy = {
    contractVersion: "kibi.impact-policy.v1",
    id: "synthetic-benchmark-strict-policy",
    version: "1",
    allowUnsupportedReview: false,
    allowedPartial: [],
    notApplicablePaths: [],
  };
  writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`, {
    flag: "wx",
  });
  return policyPath;
}

function stageBaselineFiles(workspace, env) {
  runGit(
    ["add", "-A", "--", ".gitignore", ".kb", "package.json", "src"],
    workspace,
    env,
  );
  runGit(["add", "-f", "--", ".kibi/impact-policy.json"], workspace, env);
}

function containsStagedImpactReviewNeeded(value) {
  if (Array.isArray(value)) return value.some(containsStagedImpactReviewNeeded);
  if (!isRecord(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    if (
      ["id", "code", "rule", "diagnosticCode", "kind"].includes(key) &&
      child === "staged_file_impact_review_needed"
    ) {
      return true;
    }
    if (containsStagedImpactReviewNeeded(child)) return true;
  }
  return false;
}

function checkStagedImpactReviewRequired(command, envelope) {
  if (command.code !== 1) {
    throw new Error(
      `Expected the strict pre-review staged check to exit 1, got ${command.code}`,
    );
  }
  const data = publicData(envelope);
  if (
    typeof data.operationalError !== "string" ||
    !data.operationalError.includes("Staged impact review failed") ||
    !data.operationalError.includes("Captured impact review record missing")
  ) {
    throw new Error(
      "Pre-review staged check did not report the expected missing impact-review operational error",
    );
  }
  const legacyAdvisoryObserved = containsStagedImpactReviewNeeded(data);
  if (!Array.isArray(data.staged?.files) || data.staged.files.length === 0) {
    throw new Error(
      "Pre-review staged check did not expose changed files under the strict baseline policy",
    );
  }
  return {
    exitCode: command.code,
    expectedOperationalErrorObserved: true,
    missingImpactReviewFailureObserved: true,
    legacyMissingImpactReviewAdvisoryObserved: legacyAdvisoryObserved,
    stagedFileCount: data.staged.files.length,
    blockingViolationCount: Array.isArray(data.violations)
      ? data.violations.length
      : null,
  };
}

function checkStagedOutput(envelope) {
  const data = publicData(envelope);
  if (!Array.isArray(data.violations)) {
    throw new Error(
      "Staged check output does not expose the blocking violations array",
    );
  }
  if (data.violations.length > 0) {
    throw new Error(
      `Staged check reported ${data.violations.length} blocking violation(s)`,
    );
  }
  if (containsStagedImpactReviewNeeded(data))
    throw new Error(
      "Staged check still reports staged_file_impact_review_needed",
    );
  const stagedFiles = data.staged?.files;
  if (!Array.isArray(stagedFiles)) {
    throw new Error(
      "Staged check output does not expose its staged file inventory",
    );
  }
  return {
    violations: data.violations.length,
    stagedFileCount: stagedFiles.length,
  };
}

function normalizeRelativePath(value) {
  return typeof value === "string"
    ? value.replaceAll("\\", "/").replace(/^\.\//, "")
    : "";
}

function assignSyntheticReviewIdentity(
  record,
  reviewedAt = new Date().toISOString(),
) {
  if (!isRecord(record.reviewer)) {
    throw new Error("Prepared impact-review template has no reviewer object");
  }
  if (
    Number.isNaN(Date.parse(reviewedAt)) ||
    new Date(reviewedAt).toISOString() !== reviewedAt
  ) {
    throw new Error("Synthetic review timestamp must be a valid ISO timestamp");
  }
  record.reviewer = {
    ...record.reviewer,
    id: "synthetic-benchmark-author",
    source: "self-claimed-local",
  };
  record.reviewedAt = reviewedAt;
  return record;
}

function authorPreparedRecord(preparation, sources, workspace) {
  if (preparation.preparationVersion !== "kibi.impact-review-preparation.v1") {
    throw new Error(
      "Public prepare-impact-review returned an unsupported contract version",
    );
  }
  const template = preparation.authorship?.recordTemplate;
  if (
    !isRecord(template) ||
    template.isValidImpactReviewRecord !== false ||
    !isRecord(template.record)
  ) {
    throw new Error(
      "Preparation must return the explicitly invalid authoring template",
    );
  }
  const record = structuredClone(template.record);
  assignSyntheticReviewIdentity(record);
  if (!Array.isArray(record.files))
    throw new Error("Prepared record template has no files array");
  if (
    !Array.isArray(preparation.requirementScopes) ||
    !Array.isArray(preparation.residualReviewObligations)
  ) {
    throw new Error(
      "Preparation omitted requirement scopes or residual review obligations",
    );
  }
  const scopes = new Map(
    preparation.requirementScopes.map((scope) => [
      normalizeRelativePath(scope.path),
      scope,
    ]),
  );
  const residuals = preparation.residualReviewObligations.filter(
    (entry) => entry.pending === true,
  );
  const templatePaths = new Set(
    record.files.map((file) => normalizeRelativePath(file.path)),
  );
  for (const obligation of residuals) {
    if (!templatePaths.has(normalizeRelativePath(obligation.path))) {
      throw new Error(
        "Preparation returned a pending obligation outside its authored file inventory",
      );
    }
  }
  const codePaths = new Set(sources.map(({ relativePath }) => relativePath));
  const writtenPaths = [];

  for (const file of record.files) {
    const filePath = normalizeRelativePath(file.path);
    if (!filePath || file.decision !== null || file.analysisReviews !== null) {
      throw new Error(
        "Preparation file entries must retain null decision/reviews until authorship",
      );
    }
    const pending = residuals.filter(
      (obligation) => normalizeRelativePath(obligation.path) === filePath,
    );
    if (pending.length > 0) {
      const details = pending
        .map(
          ({ side, status, diagnosticCodes }) =>
            `${side}:${status}:${(diagnosticCodes ?? []).join(",")}`,
        )
        .join("; ");
      throw new Error(
        `Parser scope requires an unsupported/partial human review for ${filePath}; refusing synthetic approval (${details})`,
      );
    }
    file.analysisReviews = [];
    if (codePaths.has(filePath)) {
      const scope = scopes.get(filePath);
      const requirementIds = [...new Set(scope?.requirementIds ?? [])].sort();
      if (requirementIds.length === 0) {
        throw new Error(
          `Prepared scope has no requirement ownership for staged parser input ${filePath}`,
        );
      }
      for (const requirementId of requirementIds) {
        const before = scope.before.find(
          (context) => context.id === requirementId,
        );
        const after = scope.after.find(
          (context) => context.id === requirementId,
        );
        if (
          !before ||
          !after ||
          before.state !== "present" ||
          after.state !== "present" ||
          before.entityFingerprint !== after.entityFingerprint
        ) {
          throw new Error(
            `Requirement ${requirementId} is not unchanged across the prepared parser-file scope`,
          );
        }
      }
      file.decision = {
        kind: "impact",
        requirementIds,
        knowledge: {
          state: "still_current",
          rationale:
            "The staged inert parser declarations change only the synthetic input bodies; the linked benchmark requirement and its intent remain unchanged.",
        },
      };
    } else if (filePath === ".kb/symbol-coordinates.yaml") {
      file.decision = {
        kind: "no_impact",
        reason: "Generated source-coordinate refresh only",
        rationale:
          "This generated artifact updates locations for the existing source-linked symbols after the staged synthetic source edit; it does not change requirement intent.",
      };
    } else {
      throw new Error(
        `No explicit benchmark decision rule covers prepared path ${filePath}`,
      );
    }
    writtenPaths.push(filePath);
  }
  for (const sourcePath of codePaths) {
    if (!writtenPaths.includes(sourcePath))
      throw new Error(
        `Prepared record omitted staged parser file ${sourcePath}`,
      );
  }

  const recordPath = path.join(workspace, ".kibi", "impact-review.json");
  mkdirSync(path.dirname(recordPath), { recursive: true });
  writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, {
    flag: "wx",
  });
  return { recordPath, authoredFilePaths: writtenPaths };
}

function safeText(text, replacements) {
  let result = text;
  for (const [needle, replacement] of replacements) {
    if (needle) result = result.replaceAll(needle, replacement);
  }
  return result;
}

function summarizeParserReference(
  parserReportPath,
  parserReportSha256,
  qualificationSha256,
) {
  if (!parserReportPath) {
    return {
      status: "unavailable",
      reason:
        "No separate parser report was supplied; current-run worker phase observations are reported independently per staged CLI command.",
    };
  }
  const report = readJson(parserReportPath, "supplied parser report");
  const actualHash = sha256(report.bytes);
  if (actualHash !== parserReportSha256) {
    throw new Error(
      "Supplied parser report does not match its explicit SHA-256 pin",
    );
  }
  const data = requireRecord(report.value, "supplied parser report");
  if (
    typeof data.checkedAt !== "string" ||
    typeof data.runtimeNote !== "string" ||
    typeof data.rssNote !== "string" ||
    !isRecord(data.startupMeasurement) ||
    !Array.isArray(data.scenarios) ||
    data.scenarios.length === 0
  ) {
    throw new Error(
      "Supplied parser report does not match the expected installed-parser report shape",
    );
  }
  let reportQualification = null;
  if (
    typeof data.sourceQualificationSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(data.sourceQualificationSha256)
  ) {
    reportQualification = data.sourceQualificationSha256;
  } else if (
    typeof data.packageQualificationSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(data.packageQualificationSha256)
  ) {
    reportQualification = data.packageQualificationSha256;
  }
  const numberOrNull = (value) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : null;
  const countOrNull = (value) =>
    Number.isSafeInteger(value) && value >= 0 ? value : null;
  const scenarios = data.scenarios.map((scenario) => ({
    size: ["small", "large"].includes(scenario.size) ? scenario.size : null,
    processLaunchToCloseMs: numberOrNull(scenario.processLaunchToCloseMs),
    sampledRssPeakBytes: countOrNull(scenario.sampledRssPeakBytes),
    cold: Array.isArray(scenario.cold)
      ? scenario.cold.map((measurement) => ({
          elapsedMs: numberOrNull(measurement?.elapsedMs),
          contentBytes: countOrNull(measurement?.contentBytes),
          symbolCount: countOrNull(measurement?.symbolCount),
        }))
      : [],
    warmMedianMs: numberOrNull(scenario.warmMedianMs),
  }));
  const parsedCheckedAt = Date.parse(data.checkedAt);
  return {
    status: "separate_reference_only",
    sha256: actualHash,
    checkedAt: Number.isFinite(parsedCheckedAt)
      ? new Date(parsedCheckedAt).toISOString()
      : null,
    freeFormNotesIncluded: false,
    sourceQualificationSha256: reportQualification,
    matchesCurrentQualificationArtifact:
      reportQualification === qualificationSha256,
    scenarios,
    limitation:
      "This report is not merged with this run's staged workflow measurements; matching qualification hashes are required to attribute parser metrics to the current candidate.",
  };
}

function environmentMetadata() {
  let bunVersion = null;
  try {
    const bun = spawnSync("bun", ["--version"], {
      encoding: "utf8",
      timeout: 3000,
      stdio: "pipe",
    });
    if (bun.status === 0) bunVersion = bun.stdout.trim() || null;
  } catch {
    bunVersion = null;
  }
  const release = os.release();
  const wsl = process.platform === "linux" && /microsoft|wsl/i.test(release);
  return {
    nodeVersion: process.version,
    bunVersionDetected: bunVersion,
    bunUsedForBenchmark: false,
    platform: process.platform,
    osRelease: release,
    architecture: process.arch,
    wsl,
    cpuCount: os.availableParallelism?.() ?? os.cpus().length,
    totalMemoryBytes: os.totalmem(),
  };
}

function sourceCheckoutMetadata() {
  const scriptBytes = readFileSync(SCRIPT_PATH);
  const benchmarkScript = {
    path: path.relative(REPOSITORY_ROOT, SCRIPT_PATH),
    bytes: scriptBytes.length,
    sha256: sha256(scriptBytes),
  };
  const fixtures = Object.entries(FIXTURES).map(([language, relativePath]) => {
    const bytes = readFileSync(path.join(REPOSITORY_ROOT, relativePath));
    return {
      language,
      path: relativePath,
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  });
  try {
    const commit = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      timeout: 3000,
    });
    return {
      commit: commit.status === 0 ? commit.stdout.trim() : null,
      benchmarkScript,
      fixtures,
    };
  } catch {
    return { commit: null, benchmarkScript, fixtures };
  }
}

async function runScenario({
  size,
  count,
  repeats,
  cliEntry,
  pluginVersion,
  packageSources,
}) {
  const workspace = mkdtempSync(path.join(os.tmpdir(), `kibi-impact-${size}-`));
  const traceDirectory = mkdtempSync(
    path.join(os.tmpdir(), `kibi-impact-trace-${size}-`),
  );
  chmodSync(traceDirectory, 0o700);
  const env = makeRuntimeEnvironment(workspace, traceDirectory);
  const sources = fixtureSources(count);
  const sourceFiles = sources.map(({ relativePath }) => relativePath);
  const measurements = {
    size,
    syntheticDeclarationCount: count,
    languageDistribution: Object.fromEntries(
      sources.map(({ language, declarationCount }) => [
        language,
        declarationCount,
      ]),
    ),
    sourceFileCount: sources.length,
    sourceFixturePaths: sources.map(({ relativeFixture }) => relativeFixture),
    authoring: { commands: 0, completed: false },
    versionStartup: null,
    baselineImpactPolicy: null,
    preReviewImpactGate: null,
    impactReviewPreparation: null,
    localStagedChecks: [],
    engineColdWarmBoundary: null,
    status: [],
    engineStatus: [],
    localStagedGateAccepted: false,
  };
  let primaryError = null;

  try {
    const versionStartup = await spawnMeasured(
      process.execPath,
      [cliEntry, "--version"],
      { cwd: workspace, env },
    );
    assertSuccess(versionStartup, "kibi --version");
    if (versionStartup.stdout.trim().length === 0) {
      throw new Error("kibi --version returned no version text");
    }
    measurements.versionStartup = {
      spawnToCloseMs: versionStartup.spawnToCloseMs,
      command: "installed public CLI --version",
    };
    addBaselineFiles(workspace, pluginVersion, sources);
    copyQualifiedPackages(packageSources, workspace);
    runGit(["init", "-b", "main"], workspace, env);
    runGit(["config", "user.name", "Kibi Synthetic Benchmark"], workspace, env);
    runGit(["config", "user.email", "benchmark@kibi.invalid"], workspace, env);
    const emptyHooks = path.join(workspace, "empty-hooks");
    mkdirSync(emptyHooks);
    runGit(["config", "core.hooksPath", emptyHooks], workspace, env);
    await invokeKibi(cliEntry, ["init", "--no-hooks"], workspace, env);
    const impactPolicyPath = writeBaselineImpactPolicy(workspace);
    measurements.baselineImpactPolicy = {
      path: ".kibi/impact-policy.json",
      contractVersion: "kibi.impact-policy.v1",
      id: "synthetic-benchmark-strict-policy",
      version: "1",
      allowUnsupportedReview: false,
      allowedPartialCount: 0,
      notApplicablePathCount: 0,
      sourceSha256: sha256(readFileSync(impactPolicyPath)),
    };

    const semanticAdvisor = await invokeKibi(
      cliEntry,
      ["semantic-advisor", "--input", "-"],
      workspace,
      env,
      {
        input: {
          type: "req",
          id: "REQ-BENCH-PARSER-001",
          title: "Synthetic parser benchmark intent",
          text: BENCHMARK_REQUIREMENT_TEXT,
          clauses: BENCHMARK_REQUIREMENT_CLAUSES,
        },
        json: true,
      },
    );
    const receipt = semanticAdvisor.data.receipt;
    if (!isRecord(receipt))
      throw new Error("Semantic advisor omitted its public receipt");
    await authorEntity(
      cliEntry,
      workspace,
      env,
      makeEntityInput(
        "test",
        "TEST-BENCH-PARSER-001",
        {
          title: "Staged parser fixture check",
          status: "pending",
          source: "benchmark-synthetic-fixture",
          verification_scope: "integration",
          verification_perspective: "internal",
        },
        [],
        ".kb/tests/TEST-BENCH-PARSER-001.md",
      ),
    );
    await authorEntity(
      cliEntry,
      workspace,
      env,
      makeEntityInput(
        "scenario",
        "SCEN-BENCH-PARSER-001",
        {
          title: "Mixed-language source files are staged for analysis",
          status: "active",
          source: "benchmark-synthetic-fixture",
        },
        [
          {
            type: "verified_by",
            from: "SCEN-BENCH-PARSER-001",
            to: "TEST-BENCH-PARSER-001",
          },
        ],
        ".kb/scenarios/SCEN-BENCH-PARSER-001.md",
      ),
    );
    const requirementPlan = buildRequirementInput(receipt);
    for (const fact of requirementPlan.facts) {
      await authorEntity(cliEntry, workspace, env, fact);
    }
    await authorEntity(cliEntry, workspace, env, {
      ...requirementPlan.entity,
      relationships: [
        ...requirementPlan.relationships,
        {
          type: "specified_by",
          from: "REQ-BENCH-PARSER-001",
          to: "SCEN-BENCH-PARSER-001",
        },
      ],
    });
    for (const source of sources) {
      const id = `SYM-BENCH-${source.language.toUpperCase()}`;
      await authorEntity(
        cliEntry,
        workspace,
        env,
        makeEntityInput(
          "symbol",
          id,
          {
            title: symbolAnchor(source.language),
            status: "active",
            source: "benchmark-synthetic-fixture",
            sourceFile: source.relativePath,
            symbol_role: "behavioral",
          },
          [{ type: "implements", from: id, to: "REQ-BENCH-PARSER-001" }],
        ),
      );
    }
    const authoringSync = await invokeKibi(
      cliEntry,
      ["sync", "--refresh-symbol-coordinates"],
      workspace,
      env,
    );
    measurements.authoring = {
      commands: 4 + 2 * (3 + requirementPlan.facts.length) + 2 * sources.length,
      completed: true,
      setupNotTimed: true,
      coordinateRefreshExit: authoringSync.command.code,
      modeledCoreSemanticClaims:
        requirementPlan.entity.properties.logic_claims.length,
      unresolvedCoreSemanticClaimCount: 0,
      testStatus: "pending (no proof asserted)",
    };

    stageBaselineFiles(workspace, env);
    runGit(
      ["commit", "-m", `synthetic ${size} parser baseline`],
      workspace,
      env,
    );
    const attachedNormalizationSync = await invokeKibi(
      cliEntry,
      ["sync", "--refresh-symbol-coordinates"],
      workspace,
      env,
    );
    const normalizedBaselineFiles = runGit(
      ["diff", "--name-only"],
      workspace,
      env,
    )
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(normalizeRelativePath)
      .sort();
    const unexpectedBaselineFiles = normalizedBaselineFiles.filter(
      (filePath) =>
        filePath !== ".kb/symbols.yaml" &&
        filePath !== ".kb/symbol-coordinates.yaml",
    );
    if (unexpectedBaselineFiles.length > 0) {
      throw new Error(
        `Committed baseline normalization changed unexpected files: ${unexpectedBaselineFiles.join(", ")}`,
      );
    }
    if (normalizedBaselineFiles.length > 0) {
      runGit(["add", "--", ...normalizedBaselineFiles], workspace, env);
      runGit(
        ["commit", "-m", `normalize synthetic ${size} parser baseline`],
        workspace,
        env,
      );
    }
    measurements.authoring.attachedNormalizationRefreshExit =
      attachedNormalizationSync.command.code;
    measurements.authoring.attachedNormalizationFiles = normalizedBaselineFiles;
    for (const source of sources) {
      writeFileSync(
        path.join(workspace, source.relativePath),
        stageContent(source),
        "utf8",
      );
    }
    const refresh = await invokeKibi(
      cliEntry,
      ["sync", "--refresh-symbol-coordinates"],
      workspace,
      env,
    );
    const changed = runGit(["diff", "--name-only"], workspace, env)
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(normalizeRelativePath)
      .sort();
    const unexpected = changed.filter(
      (filePath) =>
        !sourceFiles.includes(filePath) &&
        filePath !== ".kb/symbol-coordinates.yaml",
    );
    const missingSources = sourceFiles.filter(
      (filePath) => !changed.includes(filePath),
    );
    if (unexpected.length > 0 || missingSources.length > 0) {
      throw new Error(
        `Source refresh produced an unexpected tracked diff: ${changed.join(", ")}`,
      );
    }
    runGit(["add", "--", ...changed], workspace, env);

    const missingReviewCheck = await invokeKibi(
      cliEntry,
      ["check", "--staged", "--format", "json"],
      workspace,
      env,
      {
        json: true,
        sampleMemory: true,
        requireSuccess: false,
      },
    );
    measurements.preReviewImpactGate = {
      spawnToCloseMs: missingReviewCheck.command.spawnToCloseMs,
      rss: missingReviewCheck.command.rss,
      ...checkStagedImpactReviewRequired(
        missingReviewCheck.command,
        missingReviewCheck.output,
      ),
      sourceAnalysis: missingReviewCheck.sourceAnalysis,
      prologTiming: missingReviewCheck.prologTiming,
    };

    const preparation = await invokeKibi(
      cliEntry,
      ["prepare-impact-review", "--input", "-"],
      workspace,
      env,
      {
        input: { scope: { kind: "staged" } },
        json: true,
        sampleMemory: true,
      },
    );
    const prepared = publicData(preparation.output);
    const authored = authorPreparedRecord(prepared, sources, workspace);
    runGit(["add", "-f", "--", ".kibi/impact-review.json"], workspace, env);
    const reviewScopeVerification = await invokeKibi(
      cliEntry,
      ["prepare-impact-review", "--input", "-"],
      workspace,
      env,
      {
        input: { scope: { kind: "staged" } },
        json: true,
        sampleMemory: true,
      },
    );
    const verifiedPreparation = publicData(reviewScopeVerification.output);
    const preparedScopeFingerprint = prepared.recordHeaders?.scope?.fingerprint;
    const verifiedScopeFingerprint =
      verifiedPreparation.recordHeaders?.scope?.fingerprint;
    if (
      typeof preparedScopeFingerprint !== "string" ||
      typeof verifiedScopeFingerprint !== "string" ||
      verifiedScopeFingerprint !== preparedScopeFingerprint
    ) {
      throw new Error(
        `Staging the authored review changed its excluded scope fingerprint: ${JSON.stringify({ preparedScopeFingerprint, verifiedScopeFingerprint })}`,
      );
    }
    measurements.impactReviewPreparation = {
      spawnToCloseMs: preparation.command.spawnToCloseMs,
      rss: preparation.command.rss,
      preparationVersion: prepared.preparationVersion,
      preparedFileCount: Array.isArray(prepared.files)
        ? prepared.files.length
        : null,
      authoredDecisionFileCount: authored.authoredFilePaths.length,
      reviewTransportExclusionVerified: true,
      reviewScopeVerificationSpawnToCloseMs:
        reviewScopeVerification.command.spawnToCloseMs,
      residualReviewObligationCount: Array.isArray(
        prepared.residualReviewObligations,
      )
        ? prepared.residualReviewObligations.filter(
            ({ pending }) => pending === true,
          ).length
        : null,
      scope:
        "public prepare-impact-review over the exact staged synthetic index",
      sourceAnalysis: preparation.sourceAnalysis,
      prologTiming: preparation.prologTiming,
    };

    const stopped = await invokeKibi(
      cliEntry,
      ["engine", "stop"],
      workspace,
      env,
    );
    const beforeStoppedCleanup = gitSnapshotIdentity(workspace, env);
    const stoppedCleanup = await invokeKibi(
      cliEntry,
      ["engine", "janitor", "--all", "--apply", "--format", "json"],
      workspace,
      env,
      { json: true },
    );
    assertGitSnapshotPreserved(
      beforeStoppedCleanup,
      gitSnapshotIdentity(workspace, env),
      "Cold-engine artifact cleanup",
    );
    const cleanupFindings = stoppedCleanup.data.findings;
    if (
      !Array.isArray(cleanupFindings) ||
      cleanupFindings.some(
        (finding) =>
          finding.holderState !== "dead" || finding.action !== "clean",
      ) ||
      stoppedCleanup.data.cleaned !== cleanupFindings.length
    ) {
      throw new Error(
        "Public engine janitor did not limit cold-boundary cleanup to dead engine artifacts",
      );
    }
    const beforeStoppedVerification = gitSnapshotIdentity(workspace, env);
    const stoppedVerification = await invokeKibi(
      cliEntry,
      ["engine", "janitor", "--all", "--format", "json"],
      workspace,
      env,
      { json: true },
    );
    assertGitSnapshotPreserved(
      beforeStoppedVerification,
      gitSnapshotIdentity(workspace, env),
      "Read-only cold-engine verification",
    );
    const stoppedFindings = stoppedVerification.data.findings;
    if (!Array.isArray(stoppedFindings) || stoppedFindings.length !== 0) {
      const findingSummary = Array.isArray(stoppedFindings)
        ? stoppedFindings.map(({ kind, holderState, action }) => ({
            kind,
            holderState,
            action,
          }))
        : stoppedFindings;
      throw new Error(
        `Public read-only engine janitor did not verify an empty isolated engine runtime before the staged checks and cold status: ${JSON.stringify(findingSummary)}`,
      );
    }
    measurements.engineColdWarmBoundary = {
      status: "stopped_before_staged_and_status_measurements",
      stopCommandSpawnToCloseMs: stopped.command.spawnToCloseMs,
      janitorCleanupSpawnToCloseMs: stoppedCleanup.command.spawnToCloseMs,
      janitorCleanupFindingCount: cleanupFindings.length,
      janitorCleanedCount: stoppedCleanup.data.cleaned,
      absenceVerifiedBy:
        "public kibi engine stop, dead-artifact janitor cleanup, and read-only janitor verification with no findings",
      beforeCheckFindingCount: stoppedFindings.length,
      verifierPreservedHeadAndIndex: true,
      oneShotStagedChecks: [],
      verifications: [],
    };

    for (let repeat = 0; repeat < repeats; repeat += 1) {
      const check = await invokeKibi(
        cliEntry,
        ["check", "--staged", "--format", "json"],
        workspace,
        env,
        {
          json: true,
          sampleMemory: true,
          requireSuccess: false,
        },
      );
      if (check.command.code !== 0) {
        const failedData = publicData(check.output);
        const violationSummary = Array.isArray(failedData.violations)
          ? failedData.violations.map((violation) => ({
              id:
                violation.id ??
                violation.rule ??
                violation.code ??
                "unidentified",
              entityId: violation.entityId ?? null,
              file: violation.file ?? null,
              name: violation.name ?? null,
              description: violation.description ?? null,
            }))
          : [];
        throw new Error(
          `Accepted staged check exited ${check.command.code}: ${JSON.stringify(
            {
              operationalError: failedData.operationalError ?? null,
              violations: violationSummary,
            },
          )}`,
        );
      }
      const checkSummary = checkStagedOutput(check.output);
      assertAcceptedCheckTimingCoverage(
        check.sourceAnalysis,
        check.prologTiming,
        { requireRoundTrip: true },
      );
      const beforePostCheckJanitor = gitSnapshotIdentity(workspace, env);
      const postCheckJanitor = await invokeKibi(
        cliEntry,
        ["engine", "janitor", "--all", "--format", "json"],
        workspace,
        env,
        { json: true },
      );
      assertGitSnapshotPreserved(
        beforePostCheckJanitor,
        gitSnapshotIdentity(workspace, env),
        "One-shot staged-check engine verification",
      );
      const postCheckFindings = postCheckJanitor.data.findings;
      if (!Array.isArray(postCheckFindings) || postCheckFindings.length !== 0) {
        throw new Error(
          "One-shot staged check unexpectedly left a persistent engine artifact",
        );
      }
      measurements.engineColdWarmBoundary.oneShotStagedChecks.push({
        afterCheck: repeat + 1,
        persistentEngineFindingCount: postCheckFindings.length,
        janitorSpawnToCloseMs: postCheckJanitor.command.spawnToCloseMs,
      });
      measurements.localStagedChecks.push({
        repeat: repeat + 1,
        runState: repeat === 0 ? "first-one-shot" : "repeat-one-shot",
        persistentEngineObservedAfterCheck: false,
        spawnToCloseMs: check.command.spawnToCloseMs,
        rss: check.command.rss,
        sourceAnalysis: check.sourceAnalysis,
        prologTiming: check.prologTiming,
        ...checkSummary,
      });
    }
    measurements.localStagedGateAccepted = true;

    let measuredEnginePid = null;
    for (let repeat = 0; repeat < repeats; repeat += 1) {
      const status = await invokeKibi(
        cliEntry,
        ["status", "--input", "-"],
        workspace,
        env,
        {
          input: {},
          json: true,
          sampleMemory: true,
          enginePid: measuredEnginePid ?? undefined,
        },
      );
      const engineVerification = await verifyScenarioEnginePid(
        cliEntry,
        workspace,
        env,
        measuredEnginePid,
      );
      measuredEnginePid = engineVerification.pid;
      measurements.engineColdWarmBoundary.verifications.push({
        afterStatus: repeat + 1,
        pid: engineVerification.pid,
        janitorSpawnToCloseMs: engineVerification.janitorSpawnToCloseMs,
        engineStatusSpawnToCloseMs:
          engineVerification.engineStatusSpawnToCloseMs,
      });
      measurements.status.push({
        repeat: repeat + 1,
        engineState: repeat === 0 ? "cold-engine" : "warm-engine",
        enginePidConfirmedAfterStatus: engineVerification.pid,
        spawnToCloseMs: status.command.spawnToCloseMs,
        rss: status.command.rss,
        syncState: status.data.syncState ?? null,
        dirty: status.data.dirty ?? null,
        sourceAnalysis: status.sourceAnalysis,
        prologTiming: status.prologTiming,
      });
      measurements.engineStatus.push({
        repeat: repeat + 1,
        spawnToCloseMs: engineVerification.engineStatusSpawnToCloseMs,
        enginePidObserved: true,
      });
      if (repeat === 0) {
        measurements.engineColdWarmBoundary = {
          ...measurements.engineColdWarmBoundary,
          status: "cold_status_started_and_warm_engine_confirmed",
          afterColdStatusLiveSocketObserved: true,
          warmEngineReused: true,
        };
      }
    }
    return measurements;
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    await stopEngineAndRemoveWorkspace({
      workspace,
      traceDirectory,
      measurements,
      primaryError,
      stopEngine: () =>
        invokeKibi(cliEntry, ["engine", "stop"], workspace, env, {
          timeoutMs: 15000,
        }),
    });
  }
}

function prepareOutputDirectory(directory) {
  const parent = path.dirname(directory);
  if (!existsSync(parent) || !statSync(parent).isDirectory()) {
    throw new Error("The parent of --output-dir must already exist");
  }
  if (existsSync(directory))
    throw new Error("--output-dir must not already exist");
  mkdirSync(directory);
}

function writeReport(outputDir, report) {
  const reportPath = path.join(outputDir, OUTPUT_NAME);
  const data = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(reportPath, data, { flag: "wx" });
  return reportPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (Number.parseInt(process.versions.node.split(".")[0], 10) < 22) {
    throw new Error("The installed Kibi CLI requires Node.js 22 or newer");
  }
  for (const sourcePath of Object.values(FIXTURES)) {
    if (!existsSync(path.join(REPOSITORY_ROOT, sourcePath))) {
      throw new Error(
        `Required public parser fixture is missing: ${sourcePath}`,
      );
    }
  }
  const candidate = verifyQualification(options);
  const parserReference = summarizeParserReference(
    options.parserReport,
    options.parserReportSha256,
    candidate.sourceQualification.sha256,
  );
  prepareOutputDirectory(options.outputDir);
  const report = {
    version: "kibi.installed-staged-impact-benchmark.v3",
    createdAt: new Date().toISOString(),
    status: "running",
    environment: environmentMetadata(),
    sourceCheckout: sourceCheckoutMetadata(),
    candidate: {
      cliVersion: candidate.cliVersion,
      pluginVersion: candidate.pluginVersion,
      qualification: candidate.sourceQualification,
      parserRuntimeProvenance: candidate.parserRuntimeProvenance,
    },
    parserMeasurement: {
      currentRunTiming:
        "source-analysis worker phase observations are recorded per CLI command in each scenario",
      currentRunTimingLocation:
        "scenarios[*].localStagedChecks[*].sourceAnalysis",
      phaseSumNote:
        "Per-worker wall intervals may overlap because the extractor can run concurrent workers; phase sums are not an additive end-to-end decomposition.",
      separateReference: parserReference,
    },
    methodology: {
      stagedUnit:
        "new inert declarations distributed across checked-in Python, Go and Rust parser fixtures",
      processTiming:
        "operating-system process spawn event through child close event for each public CLI invocation",
      startupTiming:
        "installed public CLI --version process spawn-to-close measured separately per scenario",
      rss: `sampled every ${SAMPLE_INTERVAL_MS} ms for the direct CLI host process plus a previously verified Kibi engine PID when known on Linux; staged checks and cold status record CLI host RSS only until the engine PID is verified afterward; host RSS includes worker threads, excludes descendant OS processes such as SWI-Prolog and unrelated processes, and observed peak is a sampled lower bound`,
      cacheState:
        "staged checks run in fresh one-shot Prolog processes and must leave no persistent engine artifact; cold-engine means the first public status call after public engine stop and a clean read-only janitor report, and warm-engine means the next status call after janitor and engine status confirm reuse of the same live PID. Each CLI process and parser worker is fresh; OS page-cache state is uncontrolled, so parser phases are not labeled cold or warm",
      parserTiming:
        "opt-in worker parser setup (initialization and grammar/query loading), parse, source analysis (declaration matching and extraction), and total analysis path through result creation before cleanup; source paths/content are not emitted; each observation belongs to a fresh parser worker",
      prologTiming:
        "numeric observations from the official PrologProcess query boundary, including transport/serialization wall time; these are not SWI CPU time. Engine/Prolog cache-hit lookup events are separate; values are not derived by subtracting end-to-end medians",
      hooks: "not measured; synthetic repository uses kibi init --no-hooks",
      protectedGate:
        "kibi check-diff is not run because it requires verified event authority; this report covers local kibi check --staged only",
      analyzedSourceExecution: false,
      authoredProof: false,
    },
    scenarios: [],
  };
  const cli = candidate.cliEntry;
  try {
    for (const [size, count] of [
      ["small", options.smallCount],
      ["large", options.largeCount],
    ]) {
      process.stdout.write(
        `Running ${size} staged scenario (${count} synthetic declarations)…\n`,
      );
      report.scenarios.push(
        await runScenario({
          size,
          count,
          repeats: options.repeats,
          cliEntry: cli,
          pluginVersion: candidate.pluginVersion,
          packageSources: candidate.packageSources,
        }),
      );
    }
    report.status = "completed";
  } catch (error) {
    report.status = "failed";
    report.failure = safeText(
      error instanceof Error ? error.message : String(error),
      [
        [options.prefix, "<installed-prefix>"],
        [os.tmpdir(), "<temporary-directory>"],
        [options.outputDir, "<output-directory>"],
      ],
    );
    if (isRecord(error) && isRecord(error.benchmarkCleanup)) {
      report.cleanup = error.benchmarkCleanup;
    }
    const reportPath = writeReport(options.outputDir, report);
    process.stderr.write(
      `Benchmark stopped safely; partial report: ${reportPath}\n`,
    );
    throw error;
  }
  const reportPath = writeReport(options.outputDir, report);
  process.stdout.write(`Benchmark report written: ${reportPath}\n`);
}

export {
  assignSyntheticReviewIdentity,
  assertAcceptedCheckTimingCoverage,
  authorPreparedRecord,
  buildRequirementInput,
  capturePerformanceTraceOffsets,
  checkStagedImpactReviewRequired,
  collectInstalledDependencyClosure,
  copyQualifiedPackages,
  createSyntheticDeclarations,
  fetchCatalogPinnedRuntimeArchive,
  installedFileInventory,
  makeRuntimeEnvironment,
  normalizeQualificationReport,
  parseNpmTarball,
  parseSourceAnalysisTimings,
  qualifySourcePackageTarballs,
  readPerformanceTraceWindow,
  summarizePrologTiming,
  verifyQualifiedKibiDependencies,
  stageContent,
  stageBaselineFiles,
  stopEngineAndRemoveWorkspace,
  verifyCatalogRuntimeArchiveBytes,
  verifyPinnedRuntimeArchive,
  writeBaselineImpactPolicy,
};

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
