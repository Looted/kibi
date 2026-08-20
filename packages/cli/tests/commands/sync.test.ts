import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync, execSync, spawnSync } from "../helpers/isolated-env.js";
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { toPrologString } from "../../dist/prolog/codec.js";
import { type SyncResult, syncCommand } from "../../src/commands/sync.js";
import {
  normalizeSemanticClause,
  semanticClaimKey,
} from "../../src/operations/semantic-advisor/clauses.js";
import { semanticSourceHash } from "../../src/operations/semantic-advisor/shared.js";
import { PrologProcess, type QueryResult } from "../../src/prolog.js";

interface Deferred<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
}

interface SyncTestHookContext {
  currentBranch: string;
  livePath: string;
  rebuild: boolean;
  stagingPath: string;
  validateOnly: boolean;
}

interface SyncTestHarness {
  afterAttach?: (context: SyncTestHookContext) => Promise<void> | void;
  beforeSave?: (
    context: SyncTestHookContext & { kbModified: boolean },
  ) => Promise<void> | void;
  createProlog?: (options: { timeout?: number }) => PrologProcess;
}

/** Source compilation intentionally follows Git's index. Keep fixtures explicit. */
function stageSources(cwd: string, ...paths: string[]): void {
  execFileSync("git", ["add", "--", ...paths], { cwd, stdio: "pipe" });
}

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createInteractiveSyncProlog(
  options: { timeout?: number } = {},
): PrologProcess {
  const prolog = new PrologProcess(options);
  (prolog as unknown as { useOneShotMode: boolean }).useOneShotMode = false;
  return prolog;
}

function createScriptedProlog(
  query: (goal: string | string[]) => Promise<QueryResult>,
): PrologProcess {
  const prolog = new PrologProcess({ timeout: 120000 });
  prolog.start = async () => {};
  prolog.terminate = async () => {};
  prolog.invalidateCache = () => {};
  prolog.query = query;
  return prolog;
}

async function runHarnessedSync(
  options: { rebuild?: boolean; validateOnly?: boolean } = {},
  harness: SyncTestHarness = {},
): Promise<SyncResult> {
  // Authored fixture files must be Git-tracked under the source-first
  // compiler policy. Tests that exercise arbitrary-untracked exclusion stage
  // their files explicitly rather than relying on the compatibility path.
  execSync("git add --all --", { cwd: process.cwd(), stdio: "pipe" });
  return (
    syncCommand as unknown as (
      syncOptions: { rebuild?: boolean; validateOnly?: boolean },
      runtime?: SyncTestHarness,
    ) => Promise<SyncResult>
  )(options, {
    createProlog: createInteractiveSyncProlog,
    ...harness,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function settlesWithin(
  promise: Promise<unknown>,
  timeoutMs: number,
): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), timeoutMs),
    ),
  ]);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withWorkingDirectory<T>(
  cwd: string,
  callback: () => Promise<T>,
): Promise<T> {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return await callback();
  } finally {
    process.chdir(previous);
  }
}

function listBranchStagingDirs(root: string, branch: string): string[] {
  const branchesDir = path.join(root, ".kb/branches");
  if (!existsSync(branchesDir)) {
    return [];
  }

  return readdirSync(branchesDir).filter((entry) =>
    entry.startsWith(`${branch}.staging.`),
  );
}

function semanticInventoryFrontmatter(
  source: string,
  role: "descriptive" | "normative",
): string {
  const claimText = normalizeSemanticClause(source);
  const claimKey = semanticClaimKey(claimText);
  return `logic_claims:
  - ${claimKey}
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ${semanticSourceHash(source)}
semantic_inventory:
  - claim_key: ${claimKey}
    claim_text: ${claimText}
    role: ${role}
    status: ontology_gap
    span: {start: 0, end: ${Buffer.byteLength(claimText, "utf8")}}`;
}

describe("kibi sync", () => {
  const TEST_TIMEOUT_MS = 20000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-sync-"));

    // Initialize git repo and create initial commit (required per ADR-012)
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git checkout -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    // Initialize KB structure
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Create test fixtures
    const reqDir = path.join(tmpDir, ".kb/requirements");
    const scenarioDir = path.join(tmpDir, ".kb/scenarios");

    mkdirSync(reqDir, { recursive: true });
    mkdirSync(scenarioDir, { recursive: true });

    // Requirement document
    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
id: req1
title: User Authentication
type: req
status: open
tags: [security, auth]
owner: alice
logic_claims:
  - CLAIM-34E07FE8B4A4FB15
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 14b9b611303fc7dfbc0fee094e99ff54ffdfd61ae01ecc36bb173dd9c172d9f4
semantic_inventory:
  - claim_key: CLAIM-34E07FE8B4A4FB15
    claim_text: System must support OAuth2 authentication
    role: normative
    status: ontology_gap
    span: {start: 0, end: 41}
---

# User Authentication

System must support OAuth2 authentication.
  `,
    );
    // Scenario document
    writeFileSync(
      path.join(scenarioDir, "scenario1.md"),
      `---
id: scenario1
title: Login Flow
status: active
tags: [auth]
---

# Login Flow

User logs in with OAuth2 provider.
`,
    );

    // Symbol manifest lives at the canonical path created by `kibi init`.
    writeFileSync(
      path.join(tmpDir, ".kb/symbols.yaml"),
      `symbols:
  - title: authenticate()
    status: active
    tags: [auth]
  - title: logout()
    status: active
    tags: [auth]
`,
    );

    stageSources(
      tmpDir,
      ".kb/requirements/req1.md",
      ".kb/scenarios/scenario1.md",
      ".kb/symbols.yaml",
    );
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test(
    "imports entities from configured paths",
    async () => {
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toContain("Imported");
      expect(output).toMatch(/\d+ entities/);
      expect(output).toMatch(/\d+ relationships/);

      const currentBranch =
        execSync("git branch --show-current", {
          cwd: tmpDir,
          encoding: "utf8",
        }).trim() || "main";
      const effectiveBranch = currentBranch;
      const kbPath = (
        await import("../../src/utils/branch-store-locator.js")
      ).branchStorePath(tmpDir, effectiveBranch);
      expect(existsSync(path.join(kbPath, "kb.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test("throws SyncError when staging KB attach fails", async () => {
    await withWorkingDirectory(tmpDir, async () => {
      const prolog = createScriptedProlog(
        async (goal): Promise<QueryResult> => {
          const text = Array.isArray(goal) ? goal.join(",") : goal;
          if (text.includes("kb_attach")) {
            return { success: false, bindings: {}, error: "attach denied" };
          }
          return { success: true, bindings: {} };
        },
      );

      expect(
        runHarnessedSync({}, { createProlog: () => prolog }),
      ).rejects.toThrow("Failed to attach to staging KB: attach denied");
    });
  });

  test("throws SyncError when staging KB save fails", async () => {
    await withWorkingDirectory(tmpDir, async () => {
      const prolog = createScriptedProlog(
        async (goal): Promise<QueryResult> => {
          const text = Array.isArray(goal) ? goal.join(",") : goal;
          if (text === "findall(Id, kb_entity(Id, _, _), ExistingIds)") {
            return { success: true, bindings: { ExistingIds: "[]" } };
          }
          if (text === "kb_save") {
            return { success: false, bindings: {}, error: "disk full" };
          }
          return { success: true, bindings: {} };
        },
      );

      expect(
        runHarnessedSync({}, { createProlog: () => prolog }),
      ).rejects.toThrow("Failed to save staging KB: disk full");
    });
  });

  describe("stale_snapshot classification", () => {
    test(
      "classifies stale_snapshot as same-branch concurrent sync self-interference",
      async () => {
        await withWorkingDirectory(tmpDir, async () => {
          const baseline = await runHarnessedSync();
          expect(baseline.success).toBe(true);

          // Touch a file to force re-processing (without this, cache makes sync return early)
          const touchedFile = path.join(tmpDir, ".kb/requirements/req1.md");
          const originalContent = readFileSync(touchedFile, "utf8");
          writeFileSync(touchedFile, `${originalContent}\n`, "utf8");

          const firstAttached = deferred<void>();
          const firstReadyToSave = deferred<void>();
          const releaseFirst = deferred<void>();
          const secondAttached = deferred<void>();
          const releaseSecond = deferred<void>();

          let firstFileIdentity: { ino: number; mtimeMs: number } | null = null;
          let secondFileIdentity: { ino: number; mtimeMs: number } | null =
            null;

          const firstSync = runHarnessedSync(
            {},
            {
              afterAttach: ({ stagingPath }) => {
                const stat = statSync(path.join(stagingPath, "kb.rdf"));
                firstFileIdentity = { ino: stat.ino, mtimeMs: stat.mtimeMs };
                firstAttached.resolve();
              },
              beforeSave: () => {
                firstReadyToSave.resolve();
                return releaseFirst.promise;
              },
            },
          );

          let secondSync: Promise<SyncResult> | undefined;

          try {
            expect(await settlesWithin(firstAttached.promise, 1500)).toBe(true);
            expect(await settlesWithin(firstReadyToSave.promise, 1500)).toBe(
              true,
            );

            secondSync = runHarnessedSync(
              {},
              {
                afterAttach: ({ stagingPath }) => {
                  const stat = statSync(path.join(stagingPath, "kb.rdf"));
                  secondFileIdentity = { ino: stat.ino, mtimeMs: stat.mtimeMs };
                  secondAttached.resolve();
                  return releaseSecond.promise;
                },
              },
            );

            expect(await settlesWithin(secondAttached.promise, 1500)).toBe(
              true,
            );
            expect(firstFileIdentity).toBeDefined();
            expect(secondFileIdentity).toBeDefined();
            expect(secondFileIdentity).not.toEqual(firstFileIdentity);

            releaseFirst.resolve();
            await firstSync;
          } finally {
            releaseSecond.resolve();
            releaseFirst.resolve();
            await Promise.allSettled(
              [firstSync, secondSync].filter(
                (promise): promise is Promise<SyncResult> =>
                  promise !== undefined,
              ),
            );
          }
        });
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "rules out isolated single-process staging delay as the stale_snapshot cause",
      async () => {
        await withWorkingDirectory(tmpDir, async () => {
          const baseline = await runHarnessedSync();
          expect(baseline.success).toBe(true);

          const result = await runHarnessedSync(
            {},
            {
              afterAttach: async () => {
                await sleep(50);
              },
              beforeSave: async () => {
                await sleep(50);
              },
            },
          );

          expect(result.success).toBe(true);
        });
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "rules out rebuild/schema-only path as the stale_snapshot cause",
      async () => {
        await withWorkingDirectory(tmpDir, async () => {
          const result = await runHarnessedSync(
            { rebuild: true },
            {
              afterAttach: async () => {
                await sleep(50);
              },
              beforeSave: async () => {
                await sleep(50);
              },
            },
          );

          expect(result.success).toBe(true);
        });
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "proves explicit external staging mutation still trips stale_snapshot",
      async () => {
        await withWorkingDirectory(tmpDir, async () => {
          const baseline = await runHarnessedSync();
          expect(baseline.success).toBe(true);

          // Touch a file to force re-processing (without this, cache makes sync return early)
          const touchedFile = path.join(tmpDir, ".kb/requirements/req1.md");
          const originalContent = readFileSync(touchedFile, "utf8");
          writeFileSync(touchedFile, `${originalContent}\n`, "utf8");

          const result = await runHarnessedSync(
            {},
            {
              afterAttach: async ({ livePath, stagingPath }) => {
                await sleep(20);
                rmSync(path.join(stagingPath, "kb.rdf"), { force: true });
                copyFileSync(
                  path.join(livePath, "kb.rdf"),
                  path.join(stagingPath, "kb.rdf"),
                );

                // Mutate the file to change its stamp and trigger stale_snapshot
                const fd = openSync(path.join(stagingPath, "kb.rdf"), "a");
                writeSync(fd, "\n");
                closeSync(fd);
              },
            },
          ).then(
            (value) => ({ ok: true as const, value }),
            (error) => ({ ok: false as const, error }),
          );

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(getErrorMessage(result.error)).toContain("stale_snapshot");
          }
        });
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "cleans up stale_snapshot unique staging directories after successful sync",
      async () => {
        await withWorkingDirectory(tmpDir, async () => {
          const result = await runHarnessedSync();

          expect(result.success).toBe(true);
          expect(listBranchStagingDirs(tmpDir, "main")).toEqual([]);
        });
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "cleans up stale_snapshot unique staging directories on validate-only exit",
      async () => {
        await withWorkingDirectory(tmpDir, async () => {
          const result = await runHarnessedSync({ validateOnly: true });

          expect(result.success).toBe(true);
          expect(result.published).toBe(false);
          expect(listBranchStagingDirs(tmpDir, "main")).toEqual([]);
        });
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "cleans only its own stale_snapshot staging directory on sync failure",
      async () => {
        await withWorkingDirectory(tmpDir, async () => {
          const preservedSibling = path.join(
            tmpDir,
            ".kb/branches",
            `main.staging.${process.pid}.${Date.now() - 1}`,
          );
          mkdirSync(preservedSibling, { recursive: true });

          let failedStagingPath: string | null = null;
          const result = await runHarnessedSync(
            {},
            {
              afterAttach: ({ stagingPath }) => {
                failedStagingPath = stagingPath;
              },
              beforeSave: () => {
                throw new Error("boom");
              },
            },
          ).then(
            () => ({ ok: true as const }),
            (error) => ({ ok: false as const, error }),
          );

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(getErrorMessage(result.error)).toContain("boom");
          }
          expect(failedStagingPath).not.toBeNull();
          if (failedStagingPath === null) {
            throw new Error("Expected failed staging path to be captured");
          }
          expect(existsSync(failedStagingPath)).toBe(false);
          expect(existsSync(preservedSibling)).toBe(true);
        });
      },
      TEST_TIMEOUT_MS,
    );
  });

  test(
    "skips unchanged files on re-run using hash cache",
    async () => {
      const firstRun = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const firstMatch = firstRun.match(/Imported (\d+) entities/);
      const firstCount = firstMatch ? Number.parseInt(firstMatch[1]) : 0;
      expect(firstCount).toBeGreaterThan(0);

      const secondRun = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const secondMatch = secondRun.match(/Imported (\d+) entities/);
      const secondCount = secondMatch ? Number.parseInt(secondMatch[1]) : 0;

      expect(secondCount).toBeLessThan(firstCount);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "writes sync cache with per-file hashes",
    async () => {
      execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const cachePath = path.join(
        (
          await import("../../src/utils/branch-store-locator.js")
        ).branchStorePath(tmpDir, "main"),
        "sync-cache.json",
      );
      expect(existsSync(cachePath)).toBe(true);

      const cache = JSON.parse(readFileSync(cachePath, "utf8")) as {
        version: number;
        hashes: Record<string, string>;
        seenAt: Record<string, string>;
      };

      expect(cache.version).toBe(1);
      expect(Object.keys(cache.hashes).length).toBeGreaterThanOrEqual(3);
      expect(cache.hashes[".kb/requirements/req1.md"]).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(cache.hashes[".kb/scenarios/scenario1.md"]).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(cache.hashes[".kb/symbols.yaml"]).toMatch(/^[a-f0-9]{64}$/);
      expect(typeof cache.seenAt[".kb/requirements/req1.md"]).toBe("string");
      expect(cache.seenAt[".kb/requirements/req1.md"]).not.toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(
        Number.isNaN(Date.parse(cache.seenAt[".kb/requirements/req1.md"])),
      ).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "re-imports files when cache seenAt values are invalid",
    async () => {
      execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const cachePath = path.join(
        (
          await import("../../src/utils/branch-store-locator.js")
        ).branchStorePath(tmpDir, "main"),
        "sync-cache.json",
      );
      const cache = JSON.parse(readFileSync(cachePath, "utf8")) as {
        version: number;
        hashes: Record<string, string>;
        seenAt: Record<string, string>;
      };

      cache.seenAt = Object.fromEntries(
        Object.entries(cache.hashes).map(([key, value]) => [key, value]),
      );
      writeFileSync(cachePath, JSON.stringify(cache, null, 2));

      const result = spawnSync("bun", [kibiBin, "sync"], {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      const output = `${result.stdout}${result.stderr}`;
      const match = output.match(
        /Imported (\d+) entities, (\d+) relationships/,
      );
      expect(match).toBeDefined();

      if (!match) throw new Error("Output format mismatch");

      expect(Number.parseInt(match[1])).toBeGreaterThan(0);

      const repairedCache = JSON.parse(readFileSync(cachePath, "utf8")) as {
        seenAt: Record<string, string>;
      };
      for (const value of Object.values(repairedCache.seenAt)) {
        expect(Number.isNaN(Date.parse(value))).toBe(false);
      }
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "re-imports only changed file hashes",
    async () => {
      execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const updatedRequirement =
        "System must support OAuth2 authentication with session renewal.";
      writeFileSync(
        path.join(tmpDir, ".kb/requirements", "req1.md"),
        `---
title: User Authentication Updated
type: req
status: open
tags: [security, auth]
owner: alice
links:
  - type: relates_to
    target: scenario1
${semanticInventoryFrontmatter(updatedRequirement, "normative")}
---

# User Authentication

${updatedRequirement}
`,
      );

      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const match = output.match(
        /Imported (\d+) entities, (\d+) relationships/,
      );
      expect(match).toBeDefined();
      if (!match) throw new Error("Output format mismatch");

      const entityCount = Number.parseInt(match[1]);
      expect(entityCount).toBeGreaterThanOrEqual(1);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "compiles one changed symbol from a multi-symbol manifest",
    () => {
      const manifestPath = path.join(tmpDir, ".kb/symbols.yaml");
      const manifest = (middleTitle: string) => `symbols:
  - id: SYM-DELTA-ONE
    title: First delta symbol
    sourceFile: src/one.ts
  - id: SYM-DELTA-TWO
    title: ${middleTitle}
    sourceFile: src/two.ts
  - id: SYM-DELTA-THREE
    title: Third delta symbol
    sourceFile: src/three.ts
`;
      writeFileSync(manifestPath, manifest("Second delta symbol"));
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      writeFileSync(manifestPath, manifest("Second delta symbol updated"));
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });
      expect(output).toMatch(/Imported 1 entities, 0 relationships/);

      const queried = JSON.parse(
        execSync(
          `bun ${kibiBin} query symbol --id SYM-DELTA-TWO --format json`,
          { cwd: tmpDir, encoding: "utf8" },
        ),
      ) as Array<{ title?: string }>;
      expect(queried[0]?.title).toBe("Second delta symbol updated");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "leftover config.json custom paths cannot break sync",
    async () => {
      writeFileSync(
        path.join(tmpDir, ".kb/config.json"),
        JSON.stringify({
          paths: { nonexistent: "nonexistent/**/*.md" },
        }),
      );

      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toContain("Imported");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "uses canonical relationship shards for semantic boundary validation",
    () => {
      const requirementPath = path.join(tmpDir, ".kb/requirements/req1.md");
      writeFileSync(
        requirementPath,
        readFileSync(requirementPath, "utf8").replace(
          "status: ontology_gap",
          "status: modeled",
        ),
      );

      const factsDir = path.join(tmpDir, ".kb/facts");
      mkdirSync(factsDir, { recursive: true });
      writeFileSync(
        path.join(factsDir, "fact1.md"),
        `---
id: fact1
title: OAuth2 authentication rule
type: fact
status: active
fact_kind: predicate
predicate_namespace: test
predicate_name: authentication_rule
predicate_args: [system, OAuth2]
canonical_key: "authentication_rule(system,OAuth2)"
polarity: assert
claim_key: CLAIM-34E07FE8B4A4FB15
claim_text: System must support OAuth2 authentication
---
`,
      );

      const relationshipsDir = path.join(tmpDir, ".kb", "relationships");
      mkdirSync(relationshipsDir, { recursive: true });
      writeFileSync(
        path.join(relationshipsDir, "semantic.yaml"),
        `relationships:
  - id: rel-semantic1234
    type: requires_predicate
    from: req1
    to: fact1
    created_at: "2026-08-15T00:00:00Z"
    created_by: agent/test
    source: test://sync-semantic-boundary
`,
      );
      stageSources(
        tmpDir,
        ".kb/requirements/req1.md",
        ".kb/facts/fact1.md",
        ".kb/relationships/semantic.yaml",
      );

      const result = spawnSync("bun", [kibiBin, "sync"], {
        cwd: tmpDir,
        encoding: "utf8",
      });
      const output = `${result.stdout}${result.stderr}`;

      expect(result.status, output).toBe(0);
      expect(output).not.toContain("proposition-complete ingestion failed");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "imports valid shard relationships without false dangling warnings",
    async () => {
      const relationshipsDir = path.join(tmpDir, ".kb", "relationships");
      mkdirSync(relationshipsDir, { recursive: true });

      writeFileSync(
        path.join(relationshipsDir, "a1.yaml"),
        `relationships:
  - id: rel-abc123def456
    type: relates_to
    from: req1
    to: scenario1
    created_at: "2026-03-16T11:45:00Z"
    created_by: agent/test
    source: test://sync-test`,
      );
      stageSources(tmpDir, ".kb/relationships/a1.yaml");

      const result = spawnSync("bun", [kibiBin, "sync"], {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      const output = `${result.stdout}${result.stderr}`;
      expect(output).toMatch(/Imported \d+ entities, [1-9]\d* relationships/);
      expect(output).not.toContain("dangling relationship(s) found");
      expect(output).not.toContain("relationship(s) failed to sync");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "extracts relationships from shard files",
    async () => {
      // First sync to get entity IDs
      execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      });

      // Create a relationship shard
      const kbDir = path.join(tmpDir, ".kb");
      const relationshipsDir = path.join(kbDir, "relationships");
      mkdirSync(relationshipsDir, { recursive: true });

      // Use hardcoded entity IDs based on the fixture
      writeFileSync(
        path.join(relationshipsDir, "a1.yaml"),
        `relationships:
  - id: rel-abc123def456
    type: relates_to
    from: req1
    to: scenario1
    created_at: "2026-03-16T11:45:00Z"
    created_by: agent/test
    source: test://sync-test`,
      );
      stageSources(tmpDir, ".kb/relationships/a1.yaml");

      // Second sync should pick up the relationship
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toMatch(/\d+ entities, \d+ relationships/);

      const before = JSON.parse(
        execSync(`bun ${kibiBin} query req --id req1 --format json`, {
          cwd: tmpDir,
          encoding: "utf8",
        }),
      ) as Array<{ relates_to?: string }>;
      expect(before[0]?.relates_to).toBe("kb:entity/scenario1");

      writeFileSync(
        path.join(relationshipsDir, "a1.yaml"),
        "relationships: []\n",
      );
      stageSources(tmpDir, ".kb/relationships/a1.yaml");
      const deletion = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });
      expect(deletion).toMatch(/Imported 0 entities, 0 relationships/);
      const after = JSON.parse(
        execSync(`bun ${kibiBin} query req --id req1 --format json`, {
          cwd: tmpDir,
          encoding: "utf8",
        }),
      ) as Array<{ relates_to?: string }>;
      expect(after[0]?.relates_to).toBeUndefined();
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "imports markdown string links as relates_to relationships",
    async () => {
      const testsDir = path.join(tmpDir, ".kb/tests");
      mkdirSync(testsDir, { recursive: true });

      writeFileSync(
        path.join(tmpDir, ".kb/requirements", "req-linked.md"),
        `---
id: req-linked
title: Requirement with mixed links
type: req
status: open
links:
  - scenario-linked
  - type: verified_by
    target: test-linked
---

# Requirement with mixed links

Import plain string links as generic relationships.
`,
      );

      writeFileSync(
        path.join(tmpDir, ".kb/scenarios", "scenario-linked.md"),
        `---
id: scenario-linked
title: Linked Scenario
status: active
---

# Linked Scenario
`,
      );

      writeFileSync(
        path.join(testsDir, "test-linked.md"),
        `---
id: test-linked
title: Linked Test
status: passing
---

# Linked Test
`,
      );
      stageSources(
        tmpDir,
        ".kb/requirements/req-linked.md",
        ".kb/scenarios/scenario-linked.md",
        ".kb/tests/test-linked.md",
      );

      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const match = output.match(
        /Imported (\d+) entities, (\d+) relationships/,
      );
      expect(match).toBeDefined();
      if (!match) throw new Error("Output format mismatch");

      expect(Number.parseInt(match[2])).toBeGreaterThanOrEqual(2);

      const queryOutput = execSync(
        `bun ${kibiBin} query req --id req-linked --format json`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      const [result] = JSON.parse(queryOutput) as Array<{
        relates_to?: string;
        verified_by?: string;
      }>;

      expect(result?.relates_to).toBe("kb:entity/scenario-linked");
      expect(result?.verified_by).toBe("kb:entity/test-linked");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "reports entity and relationship counts",
    async () => {
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toMatch(/Imported \d+ entities, \d+ relationships/);

      const match = output.match(
        /Imported (\d+) entities, (\d+) relationships/,
      );
      expect(match).toBeDefined();

      if (!match) throw new Error("Output format mismatch");

      const entityCount = Number.parseInt(match[1]);
      const relCount = Number.parseInt(match[2]);

      expect(entityCount).toBeGreaterThanOrEqual(0);
      expect(relCount).toBeGreaterThanOrEqual(0);
    },
    TEST_TIMEOUT_MS,
  );

  describe("validate-only mode", () => {
    test(
      "validate-only does not modify output artifacts",
      async () => {
        const currentBranch =
          execSync("git branch --show-current", {
            cwd: tmpDir,
            encoding: "utf8",
          }).trim() || "main";
        const effectiveBranch = currentBranch;
        const kbPath = path.join(tmpDir, `.kb/branches/${effectiveBranch}`);
        const rdfPath = path.join(kbPath, "kb.rdf");

        if (existsSync(rdfPath)) {
          rmSync(rdfPath);
        }

        const output = execSync(`bun ${kibiBin} sync --validate-only`, {
          cwd: tmpDir,
          encoding: "utf8",
        });

        expect(output).toContain("OK: Validation passed");
        expect(existsSync(rdfPath)).toBe(false);

        const cachePath = path.join(kbPath, "sync-cache.json");
        expect(existsSync(cachePath)).toBe(false);
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "validate-only returns non-zero on errors",
      async () => {
        const invalidDir = path.join(tmpDir, ".kb/requirements");
        mkdirSync(invalidDir, { recursive: true });
        writeFileSync(
          path.join(invalidDir, "invalid.md"),
          `---
invalid: yaml: [
---
`,
        );
        stageSources(tmpDir, ".kb/requirements/invalid.md");

        try {
          execSync(`bun ${kibiBin} sync --validate-only`, {
            cwd: tmpDir,
            encoding: "utf8",
            stdio: "pipe",
          });
          throw new Error("Should have failed");
        } catch (error: unknown) {
          const execError = error as {
            status?: number;
            stderr?: { toString(): string };
          };
          expect(execError.status).toBe(1);
          const stderr = execError.stderr?.toString() ?? "";
          expect(stderr).toContain("invalid.md");
          expect(stderr).toContain("FAILED");
        }
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "validate-only returns non-zero for malformed typed fact scalar fields",
      async () => {
        const factsDir = path.join(tmpDir, ".kb/facts");
        mkdirSync(factsDir, { recursive: true });
        writeFileSync(
          path.join(factsDir, "FACT-INVALID-TYPED-SCALAR.md"),
          `---
id: FACT-INVALID-TYPED-SCALAR
title: Invalid typed scalar fact
type: fact
status: active
fact_kind: property_value
subject_key: user.session
property_key: timeout_minutes
operator: eq
value_type: int
value_int: "30"
---
# Invalid typed scalar fact
`,
        );
        stageSources(tmpDir, ".kb/facts/FACT-INVALID-TYPED-SCALAR.md");

        try {
          execSync(`bun ${kibiBin} sync --validate-only`, {
            cwd: tmpDir,
            encoding: "utf8",
            stdio: "pipe",
          });
          throw new Error("Should have failed");
        } catch (error: unknown) {
          const execError = error as {
            status?: number;
            stderr?: { toString(): string };
          };
          expect(execError.status).toBe(1);
          const stderr = execError.stderr?.toString() ?? "";
          expect(stderr).toContain("FACT-INVALID-TYPED-SCALAR.md");
          expect(stderr).toContain("Entity validation failed");
          expect(stderr).toContain("/value_int: must be integer");
          expect(stderr).toContain("FAILED");
        }
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "validate-only reuses Prolog strict fact-shape validation",
      async () => {
        const factsDir = path.join(tmpDir, ".kb/facts");
        mkdirSync(factsDir, { recursive: true });
        writeFileSync(
          path.join(factsDir, "FACT-MISSING-VALUE-FIELD.md"),
          `---
id: FACT-MISSING-VALUE-FIELD
title: Missing value field fact
type: fact
status: active
fact_kind: property_value
subject_key: user.session
property_key: timeout_minutes
operator: eq
value_type: int
---
# Missing value field fact
`,
        );
        stageSources(tmpDir, ".kb/facts/FACT-MISSING-VALUE-FIELD.md");

        try {
          execSync(`bun ${kibiBin} sync --validate-only`, {
            cwd: tmpDir,
            encoding: "utf8",
            stdio: "pipe",
          });
          throw new Error("Should have failed");
        } catch (error: unknown) {
          const execError = error as {
            status?: number;
            stderr?: { toString(): string };
          };
          expect(execError.status).toBe(1);
          const stderr = execError.stderr?.toString() ?? "";
          expect(stderr).toContain(
            "Failed to upsert entity FACT-MISSING-VALUE-FIELD",
          );
          expect(stderr).toContain(
            "source=.kb/facts/FACT-MISSING-VALUE-FIELD.md",
          );
          expect(stderr).toContain("fact_kind=property_value");
          expect(stderr).toContain("missing value field");
        }
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("Typed Fact Round-trip", () => {
    test(
      "syncs and queries typed fact with value_int",
      async () => {
        const factsDir = path.join(tmpDir, ".kb/facts");
        mkdirSync(factsDir, { recursive: true });

        writeFileSync(
          path.join(factsDir, "FACT-SESSION-TIMEOUT-30.md"),
          `---
id: FACT-SESSION-TIMEOUT-30
title: Session timeout is 30 minutes
type: fact
status: active
fact_kind: property_value
subject_key: user.session
property_key: timeout_minutes
operator: eq
value_type: int
value_int: 30
unit: minutes
scope: global
polarity: require
closed_world: true
valid_from: 2026-03-23T00:00:00Z
canonical_key: user.session.timeout_minutes.eq.30
---
# Session timeout
`,
        );
        stageSources(tmpDir, ".kb/facts/FACT-SESSION-TIMEOUT-30.md");

        // Sync
        execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

        // Query and verify
        const output = execSync(
          `bun ${kibiBin} query fact --id FACT-SESSION-TIMEOUT-30 --format json`,
          { cwd: tmpDir, encoding: "utf8", stdio: "pipe" },
        );

        const result = JSON.parse(output);
        expect(result).toHaveLength(1);
        const fact = result[0];
        expect(fact.id).toBe("FACT-SESSION-TIMEOUT-30");
        expect(fact.fact_kind).toBe("property_value");
        expect(fact.value_int).toBe(30);
        expect(fact.closed_world).toBe(true);
        expect(fact.canonical_key).toBe("user.session.timeout_minutes.eq.30");
        expect(fact.valid_from).toMatch(/^2026-03-23T00:00:00/);
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "syncs and queries typed fact with value_number",
      async () => {
        const factsDir = path.join(tmpDir, ".kb/facts");
        mkdirSync(factsDir, { recursive: true });

        writeFileSync(
          path.join(factsDir, "FACT-RATE-LIMIT.md"),
          `---
id: FACT-RATE-LIMIT
title: Rate limit is 1.5 requests per second
type: fact
status: active
fact_kind: property_value
subject_key: api.client
property_key: rate_limit_rps
operator: eq
value_type: number
value_number: 1.5
unit: requests_per_second
scope: global
polarity: require
canonical_key: api.client.rate_limit_rps.eq.1.5
---
# Rate limit
`,
        );
        stageSources(tmpDir, ".kb/facts/FACT-RATE-LIMIT.md");

        // Sync
        execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

        // Query and verify
        const output = execSync(
          `bun ${kibiBin} query fact --id FACT-RATE-LIMIT --format json`,
          { cwd: tmpDir, encoding: "utf8", stdio: "pipe" },
        );

        const result = JSON.parse(output);
        expect(result).toHaveLength(1);
        const fact = result[0];
        expect(fact.value_number).toBe(1.5);
        expect(fact.canonical_key).toBe("api.client.rate_limit_rps.eq.1.5");
        expect(fact.value_int).toBeUndefined();
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "syncs and queries typed fact with value_string",
      async () => {
        const factsDir = path.join(tmpDir, ".kb/facts");
        mkdirSync(factsDir, { recursive: true });

        writeFileSync(
          path.join(factsDir, "FACT-USER-TYPE.md"),
          `---
id: FACT-USER-TYPE
title: User type can be admin
type: fact
status: active
fact_kind: property_value
subject_key: user.type
property_key: allowed_value
operator: eq
value_type: string
value_string: admin
scope: global
polarity: require
canonical_key: user.type.allowed_value.eq.admin
---
# User type
`,
        );
        stageSources(tmpDir, ".kb/facts/FACT-USER-TYPE.md");

        // Sync
        execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

        // Query and verify
        const output = execSync(
          `bun ${kibiBin} query fact --id FACT-USER-TYPE --format json`,
          { cwd: tmpDir, encoding: "utf8", stdio: "pipe" },
        );

        const result = JSON.parse(output);
        expect(result).toHaveLength(1);
        const fact = result[0];
        expect(fact.value_string).toBe("admin");
        expect(fact.canonical_key).toBe("user.type.allowed_value.eq.admin");
        expect(fact.value_int).toBeUndefined();
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("persistEntities — string escaping", () => {
    test("toPrologString handles backslash in title", () => {
      // Regression: persistence previously only escaped " not \
      const title = "C:\\Users\\foo";
      expect(toPrologString(title)).toBe('"C:\\\\Users\\\\foo"');
    });

    test("toPrologString handles newline in source path", () => {
      const source = "docs/foo\nbar.md";
      expect(toPrologString(source)).toBe('"docs/foo\\nbar.md"');
    });
  });

  describe("serializeTypedFactFields — integer guard", () => {
    test("Number.isInteger correctly identifies integers vs floats", () => {
      expect(Number.isInteger(3.5)).toBe(false);
      expect(Number.isInteger(3)).toBe(true);
    });
  });

  describe("symbol coordinate refresh — internal declaration shapes (regression)", () => {
    test(
      "sync reaches failed=0 for exported, non-exported, and class-method symbols",
      async () => {
        // Create a TypeScript source file with all three declaration shapes
        const srcDir = path.join(tmpDir, "src");
        mkdirSync(srcDir, { recursive: true });

        writeFileSync(
          path.join(srcDir, "server.ts"),
          `// implements REQ-001
export function startServer(port: number): void {
  console.log('listening on', port);
}

function parseSymbolsManifest(raw: string): unknown {
  return JSON.parse(raw);
}

export class ServerManager {
  mergeStaticLinks(base: string[], extra: string[]): string[] {
    return [...base, ...extra];
  }
}
`,
        );

        // Write a symbols.yaml pointing to those symbols
        const kbDir = path.join(tmpDir, ".kb");
        mkdirSync(kbDir, { recursive: true });
        writeFileSync(
          path.join(kbDir, "symbols.yaml"),
          `symbols:
  - id: SYM-start-server
    title: startServer
    status: active
    sourceFile: src/server.ts
  - id: SYM-parse-manifest
    title: parseSymbolsManifest
    status: active
    sourceFile: src/server.ts
  - id: SYM-merge-static-links
    title: mergeStaticLinks
    status: active
    sourceFile: src/server.ts
`,
        );

        execSync("git add src/server.ts .kb/symbols.yaml", {
          cwd: tmpDir,
          stdio: "pipe",
        });

        const output = execSync(
          `bun ${kibiBin} sync --refresh-symbol-coordinates`,
          {
            cwd: tmpDir,
            encoding: "utf8",
          },
        );

        // All three symbols must resolve — no failures
        expect(output).toMatch(/failed=0/);

        const queryOutput = execSync(
          `bun ${kibiBin} query symbol --id SYM-start-server --format json`,
          { cwd: tmpDir, encoding: "utf8" },
        );
        const queryResult = JSON.parse(queryOutput) as Array<
          Record<string, unknown>
        >;
        expect(queryResult[0]).toMatchObject({
          id: "SYM-start-server",
          sourceFile: "src/server.ts",
          sourceLine: 2,
          sourceColumn: 16,
          sourceEndLine: 4,
          sourceEndColumn: 1,
        });
      },
      TEST_TIMEOUT_MS,
    );
  });
});
