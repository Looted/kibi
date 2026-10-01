/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Platform table, bundle-manifest validation, and package location for the
// bundled SWI-Prolog runtime. Kibi's resolver (kibi-cli) owns the lookup order;
// this module only knows what a valid per-platform package looks like.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export const MANIFEST_FILE = "build-manifest.json";
export const MANIFEST_SCHEMA = "kibi.swipl-build.v1";
export const BUNDLED_BINARY_PATH = "bin/swipl";

/** Platform key -> platform package, in a stable documented order. */
export const PLATFORM_PACKAGES = Object.freeze({
  "linux-x64-gnu": Object.freeze({
    package: "kibi-swipl-linux-x64-gnu",
    os: "linux",
    cpu: "x64",
    libc: "glibc",
  }),
  "linux-arm64-gnu": Object.freeze({
    package: "kibi-swipl-linux-arm64-gnu",
    os: "linux",
    cpu: "arm64",
    libc: "glibc",
  }),
  "darwin-arm64": Object.freeze({
    package: "kibi-swipl-darwin-arm64",
    os: "darwin",
    cpu: "arm64",
  }),
  "darwin-x64": Object.freeze({
    package: "kibi-swipl-darwin-x64",
    os: "darwin",
    cpu: "x64",
  }),
});

/**
 * Map a host to a platform key, or undefined when no bundle is published for
 * it (native Windows, musl Linux, other architectures).
 */
export function platformKey({ platform, arch, glibc }) {
  if (platform === "linux") {
    if (glibc !== true) return undefined;
    return arch === "x64" || arch === "arm64" ? `linux-${arch}-gnu` : undefined;
  }
  if (platform === "darwin") {
    return arch === "x64" || arch === "arm64" ? `darwin-${arch}` : undefined;
  }
  return undefined;
}

/**
 * Directory of an installed platform package, found from this package's own
 * location (platform packages are optional dependencies of kibi-swipl, so a
 * strict package manager only exposes them here). Undefined when absent.
 */
export function locatePlatformPackage(
  packageName,
  requireFrom = createRequire(import.meta.url),
) {
  try {
    return path.dirname(requireFrom.resolve(`${packageName}/package.json`));
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : undefined;
    if (code === "MODULE_NOT_FOUND" || code === "ERR_PACKAGE_PATH_NOT_EXPORTED")
      return undefined;
    throw error;
  }
}

function safeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\\") || value.includes("\0")) return false;
  if (path.posix.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value);
  return (
    normalized === value &&
    normalized !== "." &&
    !normalized.split("/").includes("..")
  );
}

/**
 * Validate a platform package's build manifest (the swipl-build pipeline's
 * build-manifest.json). Returns { ok: true, ... } or { ok: false, reason }.
 */
export function validateBuildManifest(manifest, expected) {
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest)
  )
    return { ok: false, reason: "manifest is not a JSON object" };
  if (manifest.schema !== MANIFEST_SCHEMA)
    return {
      ok: false,
      reason: `manifest schema must be ${MANIFEST_SCHEMA}`,
    };
  if (manifest.target !== expected.target)
    return {
      ok: false,
      reason: `manifest target ${JSON.stringify(manifest.target)} does not match ${expected.target}`,
    };
  if (
    typeof manifest.swiplVersion !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(manifest.swiplVersion)
  )
    return { ok: false, reason: "manifest swiplVersion is missing or invalid" };
  if (
    expected.swiplVersion !== undefined &&
    manifest.swiplVersion !== expected.swiplVersion
  )
    return {
      ok: false,
      reason: `manifest swiplVersion ${manifest.swiplVersion} does not match package kibi.swiplVersion ${expected.swiplVersion}`,
    };
  const binary = manifest.binary;
  if (binary === null || typeof binary !== "object")
    return { ok: false, reason: "manifest binary entry is missing" };
  if (binary.path !== BUNDLED_BINARY_PATH)
    return {
      ok: false,
      reason: `manifest binary.path must be ${BUNDLED_BINARY_PATH}`,
    };
  if (
    typeof binary.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(binary.sha256)
  )
    return {
      ok: false,
      reason: "manifest binary.sha256 must be 64 lowercase hex digits",
    };
  if (!safeRelativePath(manifest.home))
    return {
      ok: false,
      reason: "manifest home must be a normalized relative path",
    };
  return {
    ok: true,
    swiplVersion: manifest.swiplVersion,
    binaryPath: binary.path,
    binarySha256: binary.sha256,
    home: manifest.home,
  };
}

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}
