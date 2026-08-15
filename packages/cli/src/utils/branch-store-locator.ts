import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

/**
 * The compiled branch store is keyed by the exact Git ref rather than by a
 * path derived from that ref. This keeps names such as `feature/auth` flat and
 * makes the store safe to enumerate and garbage collect.
 */
export const BRANCH_STORE_MANIFEST_VERSION = 1 as const;

export type BranchStoreManifest = Readonly<{
  version: typeof BRANCH_STORE_MANIFEST_VERSION;
  branch: string;
  key: string;
}>;

export function branchStoreKey(branch: string): string {
  return createHash("sha256")
    .update(branch, "utf8")
    .digest("hex");
}

export function branchStoresRoot(workspaceRoot: string): string {
  return path.join(path.resolve(workspaceRoot), ".kb", "branches");
}

export function branchStorePath(
  workspaceRoot: string,
  branch: string,
): string {
  return path.join(branchStoresRoot(workspaceRoot), branchStoreKey(branch));
}

export function branchStoreManifestPath(storePath: string): string {
  return path.join(storePath, "branch.json");
}

export function expectedBranchStoreManifest(
  branch: string,
): BranchStoreManifest {
  return {
    version: BRANCH_STORE_MANIFEST_VERSION,
    branch,
    key: branchStoreKey(branch),
  };
}

export function readBranchStoreManifest(
  storePath: string,
): BranchStoreManifest | null {
  const manifestPath = branchStoreManifestPath(storePath);
  if (!existsSync(manifestPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as Partial<
      BranchStoreManifest
    >;
    if (
      parsed.version !== BRANCH_STORE_MANIFEST_VERSION ||
      typeof parsed.branch !== "string" ||
      typeof parsed.key !== "string"
    ) {
      return null;
    }
    return {
      version: BRANCH_STORE_MANIFEST_VERSION,
      branch: parsed.branch,
      key: parsed.key,
    };
  } catch {
    return null;
  }
}

export function branchStoreManifestMatches(
  storePath: string,
  branch: string,
): boolean {
  const manifest = readBranchStoreManifest(storePath);
  const expected = expectedBranchStoreManifest(branch);
  return (
    manifest !== null &&
    manifest.version === expected.version &&
    manifest.branch === expected.branch &&
    manifest.key === expected.key &&
    path.basename(storePath) === expected.key
  );
}

/** Create or verify the identity fence for a newly materialized store. */
export function ensureBranchStoreManifest(
  workspaceRoot: string,
  branch: string,
): string {
  const storePath = branchStorePath(workspaceRoot, branch);
  mkdirSync(storePath, { recursive: true });
  const manifestPath = branchStoreManifestPath(storePath);
  const existing = readBranchStoreManifest(storePath);
  if (existing !== null && !branchStoreManifestMatches(storePath, branch)) {
    throw new Error(
      `Branch store identity mismatch at ${storePath}; refusing to attach it to '${branch}'.`,
    );
  }
  if (existing === null) {
    if (existsSync(manifestPath)) {
      throw new Error(
        `Branch store manifest is invalid at ${manifestPath}; refusing to overwrite it.`,
      );
    }
    const entries = readdirSync(storePath);
    if (entries.length > 0) {
      throw new Error(
        `Branch store at ${storePath} has compiled data but no valid identity manifest; refusing to adopt it.`,
      );
    }
    writeFileSync(
      manifestPath,
      `${JSON.stringify(expectedBranchStoreManifest(branch), null, 2)}\n`,
      { mode: 0o600 },
    );
  }
  return storePath;
}

export function legacyBranchStorePath(
  workspaceRoot: string,
  branch: string,
): string {
  return path.join(branchStoresRoot(workspaceRoot), branch);
}

export function isDirectory(pathname: string): boolean {
  try {
    return statSync(pathname).isDirectory();
  } catch {
    return false;
  }
}
