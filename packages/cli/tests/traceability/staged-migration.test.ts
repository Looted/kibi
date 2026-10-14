import { describe, expect, test } from "bun:test";
import type { StagedFile } from "../../src/traceability/git-staged.js";
import { stagedCommitCarriesMigration } from "../../src/traceability/staged-migration.js";
import { collectStagedAuthoredSymbolsManifestEvidence } from "../../src/traceability/staged-symbols-manifest.js";

// implements REQ-cli-migration-first-commit

const BASE = `symbols:
  - id: SYM-greeter
    title: Greeter
    sourceFile: src/greeter.ts
    status: active
    links:
      - REQ-greet
  - id: SYM-farewell
    title: farewell
    sourceFile: src/greeter.ts
    status: active
    tags:
      - core
    links:
      - REQ-greet
`;

/** What kibi migrate writes into BASE: legacy-link, origin and a review tag. */
const MIGRATED = `symbols:
  - id: SYM-greeter
    title: Greeter
    sourceFile: src/greeter.ts
    status: active
    granularity_reason: legacy-link
    origin:
      kind: migration
      recorded_at: '2026-01-01T00:00:00.000Z'
    links:
      - REQ-greet
  - id: SYM-farewell
    title: farewell
    sourceFile: src/greeter.ts
    status: active
    tags:
      - core
      - review:context-missing
    links:
      - REQ-greet
`;

function evidence(staged: string, ignoreMigrationOwnedEdits: boolean) {
  const manifest: StagedFile = {
    path: ".kb/symbols.yaml",
    status: "M",
    hunkRanges: [],
    content: staged,
  };
  return collectStagedAuthoredSymbolsManifestEvidence({
    sourceFiles: [],
    stagedFiles: [manifest],
    readBaseFile: () => BASE,
    ignoreMigrationOwnedEdits,
  });
}

describe("records changed only by kibi migrate", () => {
  test("are not changed by a commit that carries the migration", () => {
    expect(evidence(MIGRATED, true)).toMatchObject({
      changedEntityIds: [],
      migrationOnlyEntityIds: ["SYM-farewell", "SYM-greeter"],
    });
  });

  test("are changed by a commit that carries no migration", () => {
    const result = evidence(MIGRATED, false);
    expect(result.changedEntityIds).toEqual(["SYM-farewell", "SYM-greeter"]);
    expect(result.migrationOnlyEntityIds).toBeUndefined();
  });

  test("a record the commit also edits otherwise stays changed", () => {
    const edited = MIGRATED.replace(
      "      - REQ-greet\n  - id: SYM-farewell",
      "      - REQ-greet\n      - REQ-wave\n  - id: SYM-farewell",
    );
    expect(evidence(edited, true)).toMatchObject({
      changedEntityIds: ["SYM-greeter"],
      migrationOnlyEntityIds: ["SYM-farewell"],
    });
  });

  test("a granularity reason other than legacy-link stays changed", () => {
    const reason = MIGRATED.replace(
      "granularity_reason: legacy-link",
      "granularity_reason: module-level-behavior",
    );
    expect(evidence(reason, true).changedEntityIds).toEqual(["SYM-greeter"]);
  });
});

describe("a staged commit carries a migration", () => {
  const files =
    (entries: Record<string, string>) =>
    (filePath: string): string | null =>
      entries[filePath] ?? null;
  const manifest = (schemaVersion: number) =>
    JSON.stringify({ manifestVersion: 1, schemaVersion });

  test("when it retires the legacy config for a manifest", () => {
    expect(
      stagedCommitCarriesMigration(
        files({ ".kb/config.json": '{"schemaVersion":4}' }),
        files({ ".kb/manifest.json": manifest(10) }),
      ),
    ).toBe(true);
  });

  test("when it raises the manifest's schema generation", () => {
    expect(
      stagedCommitCarriesMigration(
        files({ ".kb/manifest.json": manifest(8) }),
        files({ ".kb/manifest.json": manifest(10) }),
      ),
    ).toBe(true);
  });

  test("not when the schema generation is unchanged", () => {
    expect(
      stagedCommitCarriesMigration(
        files({ ".kb/manifest.json": manifest(10) }),
        files({ ".kb/manifest.json": manifest(10) }),
      ),
    ).toBe(false);
  });

  test("not when no manifest is staged", () => {
    expect(
      stagedCommitCarriesMigration(
        files({ ".kb/config.json": '{"schemaVersion":4}' }),
        files({}),
      ),
    ).toBe(false);
  });
});
