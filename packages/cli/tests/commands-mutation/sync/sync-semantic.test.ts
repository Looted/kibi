import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SyncError } from "../../../src/commands/sync.js";
import { createInvalidAuthoringDiagnostic } from "../../../src/diagnostics.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import { git } from "../../helpers/in-process-workspace.js";
import { type SyncHarness, emptyCache, syncHarness } from "./sync-harness.js";

let h: SyncHarness;
beforeEach(() => {
  h = syncHarness();
});
afterEach(() => h.restore());

const A = "docs/a.md";
const B = "docs/b.md";

function req(
  id: string,
  source: string,
  extra: Record<string, unknown> = {},
): ExtractionResult {
  return {
    entity: { id, type: "req", title: id, source, ...extra },
    relationships: [],
  } as unknown as ExtractionResult;
}

function sources(markdown: string[]) {
  h.world.discovery.markdownFiles = markdown.map((file) => h.path(file));
  for (const file of markdown) h.world.hashes[file] ??= `hash-${file}`;
}

function extracted(extra: Record<string, unknown>) {
  h.set("processExtractions", async () => ({
    results: [],
    failures: [],
    failedCacheKeys: new Set<string>(),
    errors: [],
    ...extra,
  }));
}

/** Make another branch store look synced and stage `file` as new. */
function laterBranch(file: string) {
  const root = h.world.root;
  const other = path.join(root, ".kb", "branches", "other");
  mkdirSync(other, { recursive: true });
  writeFileSync(
    path.join(other, "sync-cache.json"),
    JSON.stringify({ hashes: { x: "1" } }),
  );
  git(root, "init -q -b main --template=");
  git(root, "config user.email 'test@test.com'");
  git(root, "config user.name 'Kibi Test'");
  git(root, "commit -q --allow-empty --no-verify -m base");
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), "x\n");
  git(root, `add ${file}`);
}

describe("extraction failures", () => {
  test("a first-sync failure keeps the baseline", async () => {
    sources([A]);
    extracted({
      failures: [
        { file: h.path(A), message: "bad yaml" },
        { file: h.path("docs/unlisted.md"), message: "ignored" },
      ],
      failedCacheKeys: new Set([A]),
    });
    await h.run();
    expect(h.written()[0]?.extractionFailures).toStrictEqual({
      [A]: { hash: `hash-${A}`, message: "bad yaml", baseline: true },
    });
  });

  test("a staged new source on a later branch gets no baseline", async () => {
    sources([A]);
    laterBranch(A);
    extracted({
      failures: [{ file: h.path(A), message: "bad yaml" }],
      failedCacheKeys: new Set([A]),
    });
    await h.run();
    expect(h.written()[0]?.extractionFailures).toStrictEqual({
      [A]: { hash: `hash-${A}`, message: "bad yaml" },
    });
  });

  test("a failure keeps the semantics it last compiled with", async () => {
    sources([A, B]);
    h.world.cache = emptyCache({
      hashes: { "docs/other.md": "o" },
      semanticHashes: { [A]: "sa" },
      semanticContracts: { [A]: false },
      extractionFailures: {
        [B]: {
          hash: "old",
          message: "m",
          baseline: true,
          semanticHash: "sb",
          semanticContract: true,
        },
      },
    });
    extracted({
      failures: [
        { file: h.path(A), message: "a broke" },
        { file: h.path(B), message: "b broke" },
      ],
      failedCacheKeys: new Set([A, B]),
    });
    await h.run();
    expect(h.written()[0]?.extractionFailures).toEqual({
      [A]: {
        hash: `hash-${A}`,
        message: "a broke",
        semanticHash: "sa",
        semanticContract: false,
      },
      [B]: {
        hash: `hash-${B}`,
        message: "b broke",
        baseline: true,
        semanticHash: "sb",
        semanticContract: true,
      },
    });
  });
});

describe("proposition-complete ingestion", () => {
  function boundary(errors: string[], sourceHash = "semantic") {
    h.set("validateSemanticInventoryBoundary", () => ({ sourceHash, errors }));
  }

  test("a first sync accepts requirements as the baseline", async () => {
    sources([A]);
    const result = req("REQ-1", A, {});
    result.relationships = [
      { type: "relates_to", from: "REQ-1", to: "ADR-1" },
      { type: "relates_to", from: "ADR-9", to: "REQ-1" },
    ];
    h.set("processExtractions", async () => ({
      results: [
        result,
        {
          ...req("SC-1", A),
          entity: { id: "SC-1", type: "scenario", source: A },
        },
      ],
      failures: [],
      failedCacheKeys: new Set(),
      errors: [],
    }));
    boundary(["no inventory"]);
    await h.run();
    expect(h.calls.analyzeSemanticAdvisorInput).toHaveLength(1);
    const [payload] = h.calls.analyzeSemanticAdvisorInput?.[0] as [
      { payload: Record<string, unknown> },
    ];
    expect(payload.payload).toEqual({
      type: "req",
      id: "REQ-1",
      properties: result.entity,
      relationships: [{ type: "relates_to", from: "REQ-1", to: "ADR-1" }],
    });
    expect(h.calls.validateSemanticInventoryBoundary?.[0]).toEqual([
      payload.payload,
      [{ type: "relates_to", from: "REQ-1", to: "ADR-1" }],
      "receipt",
    ]);
    expect(h.written()[0]).toMatchObject({
      semanticHashes: { [A]: "semantic" },
      semanticContracts: { [A]: false },
    });
  });

  test("an advertised inventory is always enforced", async () => {
    sources([A, B]);
    extracted({
      results: [
        req("REQ-1", A, { semantic_inventory_version: 1 }),
        req("REQ-2", B, { semantic_source_hash: "x" }),
        req("REQ-3", "docs/c.md", { semantic_inventory: {} }),
      ],
    });
    boundary(["stale claims"]);
    const failure = await h.run().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SyncError);
    expect((failure as Error).message).toBe(
      [
        "3 requirement(s) failed proposition-complete ingestion:",
        `  ${A}: proposition-complete ingestion failed: stale claims.`,
        `  ${B}: proposition-complete ingestion failed: stale claims.`,
        "  docs/c.md: proposition-complete ingestion failed: stale claims.",
        "Run 'kibi migrate' to re-derive inventories that drifted with the semantic advisor (it lists any that need a manual fix), or run kb_model mode analyze with the requirement's id and complete prose and preserve its inventory contract.",
      ].join("\n"),
    );
  });

  test("new requirements after the baseline need an inventory", async () => {
    sources([A, B]);
    h.world.cache = emptyCache({ hashes: { "docs/old.md": "o" } });
    extracted({ results: [req("REQ-1", A), req("REQ-2", B)] });
    boundary(["missing", "unparsed"]);
    await expect(h.run()).rejects.toThrow(
      new SyncError(
        [
          "2 requirement(s) failed proposition-complete ingestion:",
          `  ${A}: proposition-complete ingestion failed: missing; unparsed.`,
          `  ${B}: proposition-complete ingestion failed: missing; unparsed.`,
          "REQ-1, REQ-2 state(s) no inventory, which 'kibi migrate' does not derive: for each, run kb_model mode analyze (CLI: kibi model) with the requirement's id and its complete semantic_text, then write the returned inventory contract into the requirement (kb_upsert with semantic_inventory, semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims), or retire it through a superseding requirement.",
        ].join("\n"),
      ),
    );
  });

  test("a staged new requirement on a later branch is enforced", async () => {
    sources([A]);
    laterBranch(A);
    extracted({ results: [req("REQ-1", A)] });
    boundary(["missing"]);
    await expect(h.run()).rejects.toThrow("1 requirement(s) failed");
  });

  test("a contract or changed prose is enforced; unchanged prose is not", async () => {
    sources(["docs/c.md", "docs/p.md", "docs/same.md"]);
    h.world.cache = emptyCache({
      hashes: {
        "docs/c.md": "old",
        "docs/p.md": "old",
        "docs/same.md": "old",
      },
      semanticHashes: { "docs/p.md": "before", "docs/same.md": "semantic" },
      semanticContracts: { "docs/c.md": true },
    });
    extracted({
      results: [
        req("REQ-C", "docs/c.md"),
        req("REQ-P", "docs/p.md"),
        req("REQ-S", "docs/same.md"),
      ],
    });
    boundary(["drift"]);
    const failure = (await h.run().catch((error: unknown) => error)) as Error;
    expect(failure.message.split("\n").slice(0, 3)).toEqual([
      "2 requirement(s) failed proposition-complete ingestion:",
      "  docs/c.md: proposition-complete ingestion failed: drift.",
      "  docs/p.md: proposition-complete ingestion failed: drift.",
    ]);
  });

  test("a requirement that last failed is judged by its last compiled hash", async () => {
    sources([A, B]);
    h.world.cache = emptyCache({
      hashes: { "docs/old.md": "o" },
      extractionFailures: {
        [A]: { hash: "x", message: "m", baseline: true },
        [B]: { hash: "y", message: "m" },
      },
    });
    h.set(
      "failedSourceKeepsSemanticBaseline",
      (failure: { baseline?: boolean }, sourceHash: string) =>
        failure.baseline === true && sourceHash === "semantic",
    );
    extracted({ results: [req("REQ-A", A), req("REQ-B", B)] });
    boundary(["missing"]);
    const failure = (await h.run().catch((error: unknown) => error)) as Error;
    expect(failure.message.split("\n").slice(0, 2)).toEqual([
      "1 requirement(s) failed proposition-complete ingestion:",
      `  ${B}: proposition-complete ingestion failed: missing.`,
    ]);
    expect(
      h.calls.failedSourceKeepsSemanticBaseline?.map((call) => call[1]),
    ).toEqual(["semantic", "semantic"]);
  });

  test("a source that compiled since its last failure is judged by its prose", async () => {
    sources([A]);
    h.world.cache = emptyCache({
      hashes: { [A]: "old" },
      semanticHashes: { [A]: "semantic" },
      extractionFailures: { [A]: { hash: "x", message: "m" } },
    });
    extracted({ results: [req("REQ-A", A)] });
    boundary(["missing"]);
    await h.run();
    expect(h.calls.failedSourceKeepsSemanticBaseline).toBeUndefined();
  });

  test("a passing requirement records its semantic hash", async () => {
    sources([A]);
    h.world.cache = emptyCache({ hashes: { [A]: "old" } });
    extracted({
      results: [req("REQ-1", A, { semantic_inventory_version: 2 })],
    });
    boundary([], "fresh");
    await h.run();
    expect(h.written()[0]).toMatchObject({
      semanticHashes: { [A]: "fresh" },
      semanticContracts: { [A]: true },
    });
  });
});

describe("authoring errors", () => {
  test("embedded entities become diagnostics", async () => {
    sources([A]);
    extracted({
      errors: [
        { file: h.path(A), message: "Embedded Entity Violation: scenario" },
        { file: h.path(B), message: "bad yaml" },
      ],
    });
    const result = await h.run();
    expect(result.failures[0]).toEqual(
      createInvalidAuthoringDiagnostic(h.path(A), ["scenario"]),
    );
    expect(
      result.failures.filter((d) => d.category === "INVALID_AUTHORING"),
    ).toHaveLength(1);
  });

  test("a validation with only errors fails", async () => {
    sources([A]);
    extracted({ errors: [{ file: h.path(A), message: "bad yaml" }] });
    const result = await h.run(
      { validateOnly: true },
      { createProlog: () => h.fakeProlog() },
    );
    expect(result).toMatchObject({
      success: false,
      published: false,
      exitCode: 1,
      relationshipCount: 0,
    });
    expect(h.errors).toEqual([
      `${h.path(A)}: bad yaml`,
      "FAILED: 1 errors found",
    ]);
    expect(h.events).not.toContain("prolog.start");
  });

  test("a validation with errors and results goes on", async () => {
    sources([A]);
    extracted({
      results: [req("REQ-1", A)],
      errors: [{ file: h.path(B), message: "bad yaml" }],
    });
    await h.run({ validateOnly: true }, { createProlog: () => h.fakeProlog() });
    expect(h.events).toContain("prolog.start");
  });

  test("a compile with only errors goes on", async () => {
    sources([A]);
    extracted({ errors: [{ file: h.path(A), message: "bad yaml" }] });
    const result = await h.run();
    expect(result.success).toBe(true);
  });
});
