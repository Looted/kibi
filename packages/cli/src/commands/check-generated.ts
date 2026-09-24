import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
import { refreshManifestCoordinates } from "./sync/manifest.js";

const MANIFESTS = [".kb/symbols.yaml", ".kb/symbol-coordinates.yaml"] as const;
const MAX_GIT_OUTPUT = 256 * 1024 * 1024;

function git(args: string[], input?: Buffer): Buffer {
  const result = spawnSync("git", args, {
    input,
    maxBuffer: MAX_GIT_OUTPUT,
    encoding: "buffer",
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.error?.message ?? result.stderr.toString("utf8").trim()}`,
    );
  }
  return result.stdout;
}

function indexTree(): string {
  return git(["write-tree"]).toString("utf8").trim();
}

function treeBlobs(tree: string): {
  blobs: Map<string, string>;
  nonRegularPaths: Set<string>;
} {
  const entries = git(["ls-tree", "-r", "-z", "--full-tree", tree]);
  const blobs = new Map<string, string>();
  const nonRegularPaths = new Set<string>();
  for (const record of entries.toString("utf8").split("\0")) {
    if (!record) continue;
    const match = /^(\d{6}) (\w+) ([a-f0-9]+)\t(.+)$/.exec(record);
    if (!match) throw new Error("Could not parse staged Git tree");
    const [, mode, type, oid, file] = match;
    if (file === undefined || oid === undefined)
      throw new Error("Could not parse staged Git tree");
    if (mode === "100644" || mode === "100755") {
      if (type !== "blob") throw new Error(`Unexpected Git object for ${file}`);
      blobs.set(file, oid);
    } else {
      nonRegularPaths.add(file);
    }
  }
  return { blobs, nonRegularPaths };
}

function readBlobs(oids: string[]): Map<string, Buffer> {
  if (oids.length === 0) return new Map();
  const response = git(
    ["cat-file", "--batch"],
    Buffer.from(`${oids.join("\n")}\n`),
  );
  const contents = new Map<string, Buffer>();
  let offset = 0;
  for (const oid of oids) {
    const end = response.indexOf(10, offset);
    if (end < 0) throw new Error("Incomplete Git blob response");
    const header = response.subarray(offset, end).toString("utf8");
    const match = /^([a-f0-9]+) blob (\d+)$/.exec(header);
    if (!match || match[1] !== oid)
      throw new Error(`Invalid Git blob response for ${oid}`);
    const size = Number(match[2]);
    const start = end + 1;
    const finish = start + size;
    if (
      !Number.isSafeInteger(size) ||
      finish >= response.length ||
      response[finish] !== 10
    ) {
      throw new Error(`Incomplete Git blob ${oid}`);
    }
    contents.set(oid, response.subarray(start, finish));
    offset = finish + 1;
  }
  return contents;
}

function sourcePaths(symbols: Buffer): {
  paths: string[];
  symbolCount: number;
} {
  const parsed = parseYAML(symbols.toString("utf8"));
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("symbols" in parsed) ||
    !Array.isArray(parsed.symbols)
  ) {
    throw new Error("Staged .kb/symbols.yaml has no symbols array");
  }
  const sources = new Set<string>();
  for (const symbol of parsed.symbols) {
    const source = symbol?.sourceFile;
    if (typeof source !== "string") continue;
    const normalized = path.posix.normalize(source.replaceAll("\\", "/"));
    if (
      normalized === "." ||
      path.posix.isAbsolute(normalized) ||
      /^[A-Za-z]:/.test(normalized) ||
      normalized.split("/").includes("..")
    ) {
      throw new Error(
        `Symbol source must be a repository-relative path: ${source}`,
      );
    }
    sources.add(normalized);
  }
  return { paths: [...sources], symbolCount: parsed.symbols.length };
}

/** Compare generated artifacts for exactly one captured Git index tree. */
// implements REQ-cli-check
export async function checkGeneratedManifests(
  options: {
    changedOnly?: boolean;
  } = {},
): Promise<{ exitCode: number }> {
  let snapshotDir: string | undefined;
  try {
    const tree = indexTree();
    const { blobs, nonRegularPaths } = treeBlobs(tree);
    const symbolsOid = blobs.get(MANIFESTS[0]);
    if (!symbolsOid)
      throw new Error(
        "Staged .kb/symbols.yaml is missing or is not a regular file",
      );
    const initial = readBlobs([symbolsOid]);
    const symbols = initial.get(symbolsOid);
    if (!symbols) throw new Error("Could not read staged .kb/symbols.yaml");
    const { paths: sources, symbolCount } = sourcePaths(symbols);
    // Plain sync does not publish coordinate artifacts for a freshly
    // initialized, empty symbols manifest. The first commit must remain usable.
    if (symbolCount === 0) {
      if (indexTree() !== tree)
        throw new Error(
          "Git index changed during generated-manifest analysis; retry the commit",
        );
      console.log(
        "kibi: staged symbols manifest is empty; no coordinates to refresh.",
      );
      return { exitCode: 0 };
    }
    const nonRegularEntries = [...nonRegularPaths];
    const nonRegular = sources.find((source) =>
      nonRegularEntries.some(
        (entry) => source === entry || source.startsWith(`${entry}/`),
      ),
    );
    if (nonRegular)
      throw new Error(
        `Staged symbol source is not a regular file: ${nonRegular}`,
      );
    if (options.changedOnly) {
      const changed = new Set(
        git(["diff", "--cached", "--name-only", "--no-renames", "-z"])
          .toString("utf8")
          .split("\0")
          .filter(Boolean),
      );
      if (![...MANIFESTS, ...sources].some((file) => changed.has(file))) {
        if (indexTree() !== tree)
          throw new Error(
            "Git index changed during generated-manifest analysis; retry the commit",
          );
        console.log(
          "kibi: no staged symbol sources or generated manifests changed.",
        );
        return { exitCode: 0 };
      }
    }
    const files = [...MANIFESTS, ...sources];
    const objectIds = [
      ...new Set(
        files
          .map((file) => blobs.get(file))
          .filter((oid): oid is string => !!oid),
      ),
    ];
    const content = readBlobs(objectIds);
    snapshotDir = mkdtempSync(path.join(tmpdir(), "kibi-generated-check-"));
    for (const file of files) {
      const oid = blobs.get(file);
      if (!oid) continue;
      const target = path.join(snapshotDir, file);
      mkdirSync(path.dirname(target), { recursive: true });
      const bytes = content.get(oid);
      if (!bytes) throw new Error(`Could not read staged blob for ${file}`);
      writeFileSync(target, bytes);
    }

    await refreshManifestCoordinates(
      path.join(snapshotDir, MANIFESTS[0]),
      snapshotDir,
      {
        refreshSymbolCoordinates: true,
        quiet: true,
      },
    );

    const snapshot = snapshotDir;
    const drift = MANIFESTS.filter((file) => {
      const generatedPath = path.join(snapshot, file);
      const expected = existsSync(generatedPath)
        ? readFileSync(generatedPath)
        : undefined;
      const oid = blobs.get(file);
      const staged = oid ? content.get(oid) : undefined;
      return expected === undefined
        ? staged !== undefined
        : staged === undefined || !expected.equals(staged);
    });
    // An index mutation invalidates every comparison, even if the manifests
    // themselves were untouched. Git will commit the later index state.
    if (indexTree() !== tree)
      throw new Error(
        "Git index changed during generated-manifest analysis; retry the commit",
      );
    if (drift.length > 0) {
      console.error(
        `kibi: generated manifest drift in staged snapshot: ${drift.join(", ")}`,
      );
      console.error(
        "Run kibi sync --refresh-symbol-coordinates, review the diff, then stage only the intended hunks with git add -p (or git add <path> when the whole file is intended).",
      );
      return { exitCode: 1 };
    }
    console.log("kibi: staged generated manifests are current.");
    return { exitCode: 0 };
  } catch (error) {
    console.error(
      `kibi: generated manifest check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { exitCode: 1 };
  } finally {
    if (snapshotDir) rmSync(snapshotDir, { recursive: true, force: true });
  }
}
