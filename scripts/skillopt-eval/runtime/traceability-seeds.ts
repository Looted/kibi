import { execFile } from "node:child_process";
/**
 * Evaluator-owned fixtures for the kibi-traceability held-out cases whose
 * premise is a particular KB state: a relationship authored in a legacy
 * relationship shard (live, stale, or already removed from the shard), and
 * symbols whose source moved or was replaced. Each starts from the seeded
 * fresh KB and adds only what its prompt describes.
 */
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type RelationshipSelector = Readonly<{
  type: string;
  from: string;
  to: string;
}>;

export const SHARD_IDS = {
  base: "REQ-SETUP-BASE",
  related: "REQ-SETUP-RELATED",
  test: "TEST-SETUP-FIXTURE",
} as const;

/** The relationship the shard cases sanction for removal. */
export const SHARD_TARGET_EDGE: RelationshipSelector = {
  type: "depends_on",
  from: SHARD_IDS.base,
  to: SHARD_IDS.related,
};

/** An unrelated record in the same shard that must survive. */
export const SHARD_KEPT_EDGE: RelationshipSelector = {
  type: "verified_by",
  from: SHARD_IDS.base,
  to: SHARD_IDS.test,
};

/**
 * The tracked shard that holds both records: Kibi names a shard by the first
 * two hex digits of SHA-256 of the records' `from` id.
 */
export const SHARD_PATH = `.kb/relationships/${createHash("sha256").update(SHARD_IDS.base).digest("hex").slice(0, 2)}.yaml`;

/** The public file naming the sanctioned edge. */
export const RELATIONSHIP_DELETE_FILE = "relationship-delete.json";

/** Shard cases: the public file names the relationship they act on. */
export const RELATIONSHIP_DELETE_OBJECTIVES: ReadonlySet<string> = new Set([
  "relationship_shard_delete",
  "legacy_shard_edge_cleanup",
  "legacy_shard_reconciliation",
]);

function recordId(edge: RelationshipSelector): string {
  return `rel-${createHash("sha256")
    .update(`${edge.type}\0${edge.from}\0${edge.to}`)
    .digest("hex")
    .slice(0, 12)}`;
}

function shardRecord(edge: RelationshipSelector, comment: string): string[] {
  return [
    `  # ${comment}`,
    `  - id: ${recordId(edge)}`,
    `    type: ${edge.type}`,
    `    from: ${edge.from}`,
    `    to: ${edge.to}`,
    '    created_at: "2026-10-01T09:00:00.000Z"',
    "    created_by: kibi/upsert",
    "    source: mcp://kibi/upsert",
  ];
}

export function shardDocument(
  edges: readonly Readonly<{ edge: RelationshipSelector; comment: string }>[],
): string {
  return [
    "# Relationships authored before entity files carried their own links.",
    "relationships:",
    ...edges.flatMap(({ edge, comment }) => shardRecord(edge, comment)),
    "",
  ].join("\n");
}

const FULL_SHARD = shardDocument([
  {
    edge: SHARD_TARGET_EDGE,
    comment: "Planning dependency from the first fixture release.",
  },
  {
    edge: SHARD_KEPT_EDGE,
    comment: "Direct verification link kept for the release report.",
  },
]);

const RELATED_REQUIREMENT = [
  "---",
  `id: ${SHARD_IDS.related}`,
  "title: seeded related fixture requirement",
  "status: open",
  "required_evidence: asserted",
  "type: req",
  "---",
  "",
  "## Context",
  "",
  "This evaluator-owned requirement is the far endpoint of the seeded shard relationship; it must stay in the knowledge base when that relationship is removed.",
  "",
].join("\n");

/** Documents the shard fixtures add to the seeded fresh KB. */
export const SHARD_DOCUMENTS: Readonly<Record<string, string>> = {
  [`.kb/requirements/${SHARD_IDS.related}.md`]: RELATED_REQUIREMENT,
  [SHARD_PATH]: FULL_SHARD,
};

async function commitAll(workspace: string, message: string): Promise<void> {
  await execFileAsync("git", ["add", "-A"], { cwd: workspace });
  // The pre-commit gate `kibi init` installs is bypassed for evaluator setup.
  await execFileAsync("git", ["commit", "-q", "--no-verify", "-m", message], {
    cwd: workspace,
  });
}

/**
 * After the import, a person annotated the shard: the authored source is
 * newer than the compiled store, so the KB is stale until the next sync.
 */
export async function annotateShard(workspace: string): Promise<void> {
  const path = join(workspace, SHARD_PATH);
  await writeFile(
    path,
    `${await readFile(path, "utf8")}# Reviewed 2026-11-01: the planning dependency is obsolete.\n`,
    "utf8",
  );
  await commitAll(workspace, "Annotate the legacy relationship shard");
}

/**
 * After the import, the target record was removed from the shard by hand:
 * the authored source proves the edge absent while the compiled store still
 * holds it.
 */
export async function removeTargetFromShard(workspace: string): Promise<void> {
  await writeFile(
    join(workspace, SHARD_PATH),
    shardDocument([
      {
        edge: SHARD_KEPT_EDGE,
        comment: "Direct verification link kept for the release report.",
      },
    ]),
    "utf8",
  );
  await commitAll(workspace, "Drop the obsolete planning dependency");
}

export const MOVED_SYMBOL = {
  id: "SYM-SETUP-LEGACY-FAMILY",
  title: "legacyFixtureFamily",
  deletedFile: "src/legacy-fixture.ts",
  /** Where the same declaration lives now. */
  currentFile: "src/fixture.ts",
} as const;

const LEGACY_SOURCE =
  'export function legacyFixtureFamily(): string {\n  return "legacy";\n}\n';

/** Source and manifest entry for the symbol whose file is deleted later. */
export const MOVED_SYMBOL_DOCUMENTS: Readonly<Record<string, string>> = {
  [MOVED_SYMBOL.deletedFile]: LEGACY_SOURCE,
};

/** The symbols.yaml entry for a symbol, linked like the seeded one. */
export function symbolEntry(
  symbol: Readonly<{ id: string; title: string; sourceFile: string }>,
  links: readonly Readonly<{ type: string; target: string }>[],
): string[] {
  return [
    `  - id: ${symbol.id}`,
    `    title: ${symbol.title}`,
    "    status: active",
    `    sourceFile: ${symbol.sourceFile}`,
    ...(links.length === 0
      ? []
      : [
          "    relationships:",
          ...links.flatMap((link) => [
            `      - type: ${link.type}`,
            `        target: ${link.target}`,
          ]),
        ]),
  ];
}

/**
 * The declaration moved into src/fixture.ts and its old file was deleted,
 * so the catalogued symbol now points at a file that no longer exists.
 */
export async function moveLegacySymbolSource(workspace: string): Promise<void> {
  const fixture = join(workspace, MOVED_SYMBOL.currentFile);
  await writeFile(
    fixture,
    `${await readFile(fixture, "utf8")}\n${LEGACY_SOURCE}`,
    "utf8",
  );
  await rm(join(workspace, MOVED_SYMBOL.deletedFile));
  await commitAll(workspace, "Move legacyFixtureFamily into src/fixture.ts");
}

export const REPLACED_SYMBOL = {
  obsolete: "SYM-SETUP-FAMILY-V1",
  obsoleteTitle: "fixtureFamilyV1",
  replacement: "SYM-SETUP-FAMILY-V2",
  replacementTitle: "fixtureFamilyV2",
  sourceFile: "src/fixture.ts",
  test: "TEST-SETUP-FAMILY-V2",
  testFile: "tests/fixture-family-v2.test.ts",
} as const;

const V1_SOURCE =
  'export function fixtureFamilyV1(): string {\n  return "v1";\n}\n';
const V2_SOURCE =
  'export function fixtureFamilyV2(): string {\n  return "v2";\n}\n';

/** The replacement's test exists before the obsolete symbol goes away. */
export const REPLACED_SYMBOL_DOCUMENTS: Readonly<Record<string, string>> = {
  [REPLACED_SYMBOL.testFile]: [
    'import { expect, test } from "bun:test";',
    'import { fixtureFamilyV2 } from "../src/fixture";',
    "",
    'test("fixtureFamilyV2 returns v2", () => {',
    '  expect(fixtureFamilyV2()).toBe("v2");',
    "});",
    "",
  ].join("\n"),
  [`.kb/tests/${REPLACED_SYMBOL.test}.md`]: [
    "---",
    `id: ${REPLACED_SYMBOL.test}`,
    "title: fixtureFamilyV2 returns v2",
    "status: passing",
    `text_ref: ${REPLACED_SYMBOL.testFile}`,
    "links:",
    "  - type: validates",
    "    target: REQ-SETUP-BASE",
    "verification_scope: unit",
    "---",
    "",
    "This evaluator-owned unit test calls fixtureFamilyV2, the replacement of fixtureFamilyV1, and checks its result.",
    "",
  ].join("\n"),
};

/** Source with both declarations, as committed before the replacement. */
export function sourceWithBothVersions(fixtureSource: string): string {
  return `${fixtureSource}\n${V1_SOURCE}\n${V2_SOURCE}`;
}

/** fixtureFamilyV1 was removed from the source; only V2 remains. */
export async function removeObsoleteDeclaration(
  workspace: string,
): Promise<void> {
  const fixture = join(workspace, REPLACED_SYMBOL.sourceFile);
  const source = await readFile(fixture, "utf8");
  await writeFile(fixture, source.replace(`\n${V1_SOURCE}`, ""), "utf8");
  await commitAll(workspace, "Remove fixtureFamilyV1");
}
