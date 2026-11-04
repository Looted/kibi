import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
import { captureStagedSnapshot } from "../traceability/git-change-snapshot.js";
import { KB_PATHS } from "../utils/kb-paths.js";
import { refreshManifestCoordinates } from "./sync/manifest.js";

const MAX_GIT_OUTPUT = 256 * 1024 * 1024;

function git(args: string[], input?: Buffer): Buffer {
  const result = spawnSync("git", args, {
    input,
    maxBuffer: MAX_GIT_OUTPUT,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.error?.message ?? result.stderr.toString("utf8").trim()}`,
    );
  }
  return result.stdout;
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
    // A path runs to the end of its record and may hold newlines.
    const match = /^(\d{6}) (\w+) ([a-f0-9]+)\t(.+)/s.exec(record);
    if (!match) throw new Error("Could not parse staged Git tree");
    // Every group of a matching record is present.
    const [, mode, type, oid, file] = match as unknown as [
      string,
      string,
      string,
      string,
      string,
    ];
    if (mode === "100644" || mode === "100755") {
      if (type !== "blob") throw new Error(`Unexpected Git object for ${file}`);
      blobs.set(file, oid);
    } else {
      nonRegularPaths.add(file);
    }
  }
  return { blobs, nonRegularPaths };
}

function readBlob(oid: string): Buffer {
  const response = git(["cat-file", "--batch"], Buffer.from(`${oid}\n`));
  const end = response.indexOf(10);
  if (end < 0) throw new Error("Incomplete Git blob response");
  const header = response.subarray(0, end).toString("utf8");
  const match = /^([a-f0-9]+) blob (\d+)$/.exec(header);
  if (!match || match[1] !== oid)
    throw new Error(`Invalid Git blob response for ${oid}`);
  const start = end + 1;
  const finish = start + Number(match[2]);
  // The blob ends with a newline; past the response there is none.
  if (response[finish] !== 10) throw new Error(`Incomplete Git blob ${oid}`);
  return response.subarray(start, finish);
}

function sourcePaths(symbols: Buffer): {
  paths: string[];
  symbolCount: number;
} {
  // A scalar or null document has no symbols field.
  const parsed = parseYAML(symbols.toString("utf8")) as {
    symbols?: unknown;
  } | null;
  if (!Array.isArray(parsed?.symbols)) {
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

/**
 * Check the staged symbols manifest for exactly one captured Git index tree:
 * it is in the canonical layout sync writes, and the derived coordinate
 * artifact is not tracked.
 */
// implements REQ-cli-check
// implements REQ-symbol-coordinates-derived-locally
export async function checkGeneratedManifests(
  options: {
    changedOnly?: boolean;
  } = {},
): Promise<{ exitCode: number }> {
  let snapshotDir: string | undefined;
  try {
    const snapshot = captureStagedSnapshot(process.cwd());
    const tree = snapshot.headTree;
    const assertUnchanged = () => {
      try {
        snapshot.assertUnchanged();
      } catch {
        throw new Error(
          "Git index changed during generated-manifest analysis (or HEAD changed); retry the commit",
        );
      }
    };
    const { blobs, nonRegularPaths } = treeBlobs(tree);
    const symbolsOid = blobs.get(KB_PATHS.symbolsManifest);
    if (!symbolsOid)
      throw new Error(
        "Staged .kb/symbols.yaml is missing or is not a regular file",
      );
    if (blobs.has(KB_PATHS.symbolCoordinates)) {
      assertUnchanged();
      console.error(
        `kibi: ${KB_PATHS.symbolCoordinates} is staged, but symbol coordinates are derived locally and never committed.`,
      );
      console.error(
        `Run kibi migrate (or git rm --cached ${KB_PATHS.symbolCoordinates} and add it to .gitignore), then commit again.`,
      );
      return { exitCode: 1 };
    }
    const symbols = readBlob(symbolsOid);
    const { paths: sources, symbolCount } = sourcePaths(symbols);
    // A freshly initialized, empty symbols manifest has nothing to normalize.
    if (symbolCount === 0) {
      assertUnchanged();
      console.log("kibi: staged symbols manifest is empty; nothing to check.");
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
      const changed = new Set(snapshot.inventory.map((file) => file.path));
      if (
        !changed.has(KB_PATHS.symbolsManifest) &&
        !changed.has(KB_PATHS.symbolCoordinates)
      ) {
        assertUnchanged();
        console.log("kibi: staged symbols manifest unchanged.");
        return { exitCode: 0 };
      }
    }
    snapshotDir = mkdtempSync(path.join(tmpdir(), "kibi-generated-check-"));
    const manifestPath = path.join(snapshotDir, KB_PATHS.symbolsManifest);
    mkdirSync(path.dirname(manifestPath));
    writeFileSync(manifestPath, symbols);

    // Normalize the staged manifest the way `kibi sync
    // --refresh-symbol-coordinates` writes it. Coordinates are not compared:
    // they are derived locally and never committed, so no extraction runs.
    await refreshManifestCoordinates(manifestPath, snapshotDir, {
      quiet: true,
      enrichSymbolCoordinates: async (entries) => entries,
    });

    const drift = !readFileSync(manifestPath).equals(symbols);
    // An index mutation invalidates every comparison, even if the manifests
    // themselves were untouched. Git will commit the later index state.
    assertUnchanged();
    if (drift) {
      console.error(
        `kibi: generated manifest drift in staged snapshot: ${KB_PATHS.symbolsManifest}`,
      );
      console.error(
        "Run kibi sync --refresh-symbol-coordinates to rewrite the manifest in its canonical layout, review the diff, then stage only the intended hunks with git add -p (or git add <path> when the whole file is intended).",
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
    if (snapshotDir) rmSync(snapshotDir, { recursive: true });
  }
}
