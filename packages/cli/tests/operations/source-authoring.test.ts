import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import {
  clearRecoveredPendingSourceReceipts,
  discoverSourceFiles,
} from "../../src/commands/sync/discovery.js";
import {
  configuredSourceTarget,
  normalizeAuthoredSourcePath,
  renderSourceDeletion,
  renderYamlRelationshipDeletion,
  writePendingSourceReceipt,
  writeSourceForUpsert,
} from "../../src/operations/mutation/source-authoring.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

function context(workspaceRoot: string): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-15T00:00:00.000Z"),
    fs: nodeFilesystem,
  };
}

describe("source-first authoring", () => {
  test("normalizes in-workspace legacy absolute sources", () => {
    expect(normalizeAuthoredSourcePath("/tmp", "/tmp/docs/REQ.md")).toBe(
      "docs/REQ.md",
    );
  });

  test("returns canonical lane directories and the symbols manifest", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    expect(configuredSourceTarget(workspace, "scenario")).toBe(".kb/scenarios");
    expect(configuredSourceTarget(workspace, "symbol")).toBe(
      ".kb/symbols.yaml",
    );
  });

  test("allows canonical .kb/ knowledge paths and rejects derived runtime trees", () => {
    expect(normalizeAuthoredSourcePath("/tmp", ".kb/adr/ADR-026.md")).toBe(
      ".kb/adr/ADR-026.md",
    );
    expect(() =>
      normalizeAuthoredSourcePath("/tmp", ".kb/branches/develop/kb.pl"),
    ).toThrow(/derived state/);
  });

  test("writes canonical relative identity and preserves Markdown body bytes", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    const target = path.join(workspace, "docs", "REQ.md");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      "---\nid: REQ-1\ntitle: Old\ntype: req\n---\n\nexact body\n",
    );
    const result = await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-1",
        properties: { title: "New" },
      },
      {
        id: "REQ-1",
        type: "req",
        title: "New",
        source: "/tmp/legacy",
        status: "open",
      },
      { id: "REQ-1", source: target },
      context(workspace),
    );
    expect(result?.receipt.path).toBe("docs/REQ.md");
    expect(await readFile(target, "utf8")).toContain("exact body");
  });

  test("preserves repeated and unrelated Markdown relationships on a partial upsert", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    const target = path.join(workspace, "docs", "REQ.md");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      [
        "---",
        "id: REQ-1",
        "title: Old",
        "status: open",
        "links:",
        "  - type: requires_property",
        "    target: FACT-A",
        "  - type: requires_property",
        "    target: FACT-B",
        "  - type: specified_by",
        "    target: SCEN-KEEP",
        "type: req",
        "---",
        "",
        "exact body",
        "",
      ].join("\n"),
    );

    await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-1",
        properties: { title: "New", status: "open" },
        relationships: [{ type: "verified_by", from: "REQ-1", to: "TEST-NEW" }],
      },
      { id: "REQ-1", type: "req", title: "New", status: "open" },
      { id: "REQ-1", source: target },
      context(workspace),
    );

    const updated = await readFile(target, "utf8");
    expect(updated.match(/type: requires_property/g)).toHaveLength(2);
    expect(updated).toContain("target: FACT-A");
    expect(updated).toContain("target: FACT-B");
    expect(updated).toContain("type: specified_by");
    expect(updated).toContain("target: SCEN-KEEP");
    expect(updated).toContain("exact body");
  });

  test("patches only the selected symbol in a YAML manifest", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    const target = path.join(workspace, "symbols.yaml");
    const original =
      "symbols:\n  - id: SYM-1\n    title: First\n  - id: SYM-2\n    title: Keep\n";
    await writeFile(target, original);
    await writeSourceForUpsert(
      {
        type: "symbol",
        id: "SYM-1",
        properties: { title: "Updated" },
        document: { path: "symbols.yaml" },
      },
      { id: "SYM-1", type: "symbol", title: "Updated", source: "symbols.yaml" },
      { id: "SYM-1", source: "symbols.yaml" },
      context(workspace),
    );
    const updated = await readFile(target, "utf8");
    expect(updated).toContain("title: Updated");
    expect(updated).toContain("id: SYM-2");
    expect(
      renderSourceDeletion("symbols.yaml", "SYM-1", "symbol", updated).mode,
    ).toBe("write");
  });

  test("partial symbol upserts preserve authored provenance fields", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    const target = path.join(workspace, "symbols.yaml");
    const original = [
      "symbols:",
      "  - id: SYM-A",
      "    title: First",
      "    status: active",
      "    sourceFile: scripts/example.ts",
      "    granularity_reason: module-level-behavior",
      "    symbol_role: behavioral",
      "",
    ].join("\n");
    await writeFile(target, original);
    await writeSourceForUpsert(
      {
        type: "symbol",
        id: "SYM-A",
        properties: { title: "First", status: "active" },
        relationships: [
          { type: "covered_by", from: "SYM-A", to: "TEST-COVERAGE" },
        ],
        document: { path: "symbols.yaml" },
      },
      {
        id: "SYM-A",
        type: "symbol",
        title: "First",
        status: "active",
        source: "symbols.yaml",
      },
      { id: "SYM-A", source: "symbols.yaml" },
      context(workspace),
    );
    const updated = await readFile(target, "utf8");
    expect(updated).toContain("sourceFile: scripts/example.ts");
    expect(updated).toContain("granularity_reason: module-level-behavior");
    expect(updated).toContain("symbol_role: behavioral");
    expect(updated).toContain("target: TEST-COVERAGE");
  });

  test("coalesces compatible duplicate symbols and preserves every link", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    const target = path.join(workspace, "symbols.yaml");
    const original = [
      "symbols:",
      "  - id: SYM-DUP",
      "    title: Duplicate",
      "    status: active",
      "    sourceFile: src/example.ts",
      "    symbol_role: function",
      "    links:",
      "      - REQ-LEGACY-A",
      "      - type: verified_by",
      "        target: TEST-LEGACY",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-ONE",
      "        evidence: source-manifest",
      "  - id: SYM-DUP",
      "    title: Duplicate",
      "    status: active",
      "    sourceFile: src/example.ts",
      "    granularity_reason: one-declaration",
      "    links:",
      "      - REQ-LEGACY-B",
      "    relationships:",
      "      - type: covered_by",
      "        target: TEST-TWO",
      "  - id: SYM-KEEP",
      "    title: Keep",
      "",
    ].join("\n");
    await writeFile(target, original);

    await writeSourceForUpsert(
      {
        type: "symbol",
        id: "SYM-DUP",
        properties: { title: "Duplicate", status: "active" },
        relationships: [
          { type: "covered_by", from: "SYM-DUP", to: "TEST-NEW" },
        ],
        document: { path: "symbols.yaml" },
      },
      {
        id: "SYM-DUP",
        type: "symbol",
        title: "Duplicate",
        status: "active",
        sourceFile: "src/example.ts",
        source: "symbols.yaml",
      },
      { id: "SYM-DUP", source: "symbols.yaml" },
      context(workspace),
    );

    const parsed = loadYaml(await readFile(target, "utf8")) as {
      symbols: Array<Record<string, unknown>>;
    };
    const coalesced = parsed.symbols.filter(
      (symbol) => symbol.id === "SYM-DUP",
    );
    expect(coalesced).toHaveLength(1);
    expect(coalesced[0]).toMatchObject({
      sourceFile: "src/example.ts",
      symbol_role: "function",
      granularity_reason: "one-declaration",
    });
    expect(coalesced[0]?.links).toEqual([
      "REQ-LEGACY-A",
      { type: "verified_by", target: "TEST-LEGACY" },
      "REQ-LEGACY-B",
    ]);
    expect(coalesced[0]?.relationships).toEqual([
      { type: "covered_by", target: "TEST-NEW" },
      { type: "covered_by", target: "TEST-TWO" },
      {
        type: "implements",
        target: "REQ-ONE",
        evidence: "source-manifest",
      },
    ]);
    expect(parsed.symbols.some((symbol) => symbol.id === "SYM-KEEP")).toBe(
      true,
    );
  });

  test("rejects conflicting duplicate fields before changing source bytes", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    const target = path.join(workspace, "symbols.yaml");
    const original = [
      "symbols:",
      "  - id: SYM-CONFLICT",
      "    title: Same",
      "    sourceFile: src/one.ts",
      "  - id: SYM-CONFLICT",
      "    title: Same",
      "    sourceFile: src/two.ts",
      "",
    ].join("\n");
    await writeFile(target, original);

    await expect(
      writeSourceForUpsert(
        {
          type: "symbol",
          id: "SYM-CONFLICT",
          properties: { title: "Same" },
          document: { path: "symbols.yaml" },
        },
        {
          id: "SYM-CONFLICT",
          type: "symbol",
          title: "Same",
          source: "symbols.yaml",
        },
        { id: "SYM-CONFLICT", source: "symbols.yaml" },
        context(workspace),
      ),
    ).rejects.toMatchObject({ code: "SOURCE_DUPLICATE_CONFLICT" });

    expect(await readFile(target, "utf8")).toBe(original);
  });

  test("rejects conflicting or malformed duplicate relationships before writing", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    const target = path.join(workspace, "symbols.yaml");
    const input = {
      type: "symbol",
      id: "SYM-RELATION-CONFLICT",
      properties: { title: "Same" },
      document: { path: "symbols.yaml" },
    } as const;
    const entity = {
      id: "SYM-RELATION-CONFLICT",
      type: "symbol",
      title: "Same",
      source: "symbols.yaml",
    } as const;
    const existing = { id: "SYM-RELATION-CONFLICT", source: "symbols.yaml" };
    const upsert = () =>
      writeSourceForUpsert(input, entity, existing, context(workspace));

    const conflicting = [
      "symbols:",
      "  - id: SYM-RELATION-CONFLICT",
      "    title: Same",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-1",
      "        evidence: first",
      "  - id: SYM-RELATION-CONFLICT",
      "    title: Same",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-1",
      "        evidence: second",
      "",
    ].join("\n");
    await writeFile(target, conflicting);
    await expect(upsert()).rejects.toMatchObject({
      code: "SOURCE_DUPLICATE_CONFLICT",
    });
    expect(await readFile(target, "utf8")).toBe(conflicting);

    const malformed = [
      "symbols:",
      "  - id: SYM-RELATION-CONFLICT",
      "    title: Same",
      "    relationships: not-a-list",
      "  - id: SYM-RELATION-CONFLICT",
      "    title: Same",
      "",
    ].join("\n");
    await writeFile(target, malformed);
    await expect(upsert()).rejects.toMatchObject({
      code: "SOURCE_DUPLICATE_CONFLICT",
    });
    expect(await readFile(target, "utf8")).toBe(malformed);
  });

  test("removes one exact YAML symbol relationship without rewriting unrelated content", () => {
    const original = [
      "# authored manifest",
      "symbols:",
      "  # keep this symbol",
      "  - id: SYM-REMOVE",
      "    title: Remove one relationship",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-REMOVE",
      "      # keep this relationship comment",
      "      - type: covered_by",
      "        target: TEST-KEEP",
      "  - id: SYM-KEEP",
      "    title: Unrelated symbol",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-KEEP",
      "",
    ].join("\n");
    const rendered = renderYamlRelationshipDeletion(
      ".kb/symbols.yaml",
      original,
      { type: "implements", from: "SYM-REMOVE", to: "REQ-REMOVE" },
    );

    expect(rendered).toEqual({
      removed: true,
      body: [
        "# authored manifest",
        "symbols:",
        "  # keep this symbol",
        "  - id: SYM-REMOVE",
        "    title: Remove one relationship",
        "    relationships:",
        "      # keep this relationship comment",
        "      - type: covered_by",
        "        target: TEST-KEEP",
        "  - id: SYM-KEEP",
        "    title: Unrelated symbol",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-KEEP",
        "",
      ].join("\n"),
    });

    expect(
      renderYamlRelationshipDeletion(".kb/symbols.yaml", original, {
        type: "implements",
        from: "SYM-REMOVE",
        to: "REQ-MISSING",
      }),
    ).toEqual({ body: original, removed: false });
  });

  test("accepts exact-hash pending sources and blocks drift", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    execFileSync("git", ["init", "-b", "main"], { cwd: workspace });
    const target = path.join(workspace, "docs", "REQ.md");
    await mkdir(path.dirname(target), { recursive: true });
    const body = "---\nid: REQ-PENDING\ntype: req\ntitle: Pending\n---\n";
    await writeFile(target, body);
    writePendingSourceReceipt(
      workspace,
      "docs/REQ.md",
      createHash("sha256").update(body).digest("hex"),
    );
    const paths = await discoverSourceFiles(workspace, { trackedOnly: true });
    expect(paths.markdownFiles).toEqual([target]);
    await writeFile(target, `${body}drift\n`);
    await expect(
      discoverSourceFiles(workspace, { trackedOnly: true }),
    ).rejects.toThrow("Pending source hash drift");
  });

  test("does not treat pending relationship shards as symbol manifests", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    execFileSync("git", ["init", "-b", "main"], { cwd: workspace });
    const shard = ".kb/relationships/ab.yaml";
    const absolute = path.join(workspace, shard);
    await mkdir(path.dirname(absolute), { recursive: true });
    const body = "from: REQ-1\nto: SCEN-1\ntype: specified_by\n";
    await writeFile(absolute, body);
    writePendingSourceReceipt(
      workspace,
      shard,
      createHash("sha256").update(body).digest("hex"),
    );

    const paths = await discoverSourceFiles(workspace, { trackedOnly: true });
    expect(paths.manifestFiles).not.toContain(absolute);
    expect(paths.markdownFiles).not.toContain(absolute);
  });

  test("refreshes a pending receipt after a second Kibi source write", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    execFileSync("git", ["init", "-b", "main"], { cwd: workspace });
    const source = "docs/REQ-PENDING-UPDATE.md";
    await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-PENDING-UPDATE",
        properties: { title: "First", semantic_text: "Pending source." },
        document: { path: source },
      },
      {
        id: "REQ-PENDING-UPDATE",
        type: "req",
        title: "First",
        semantic_text: "Pending source.",
        source,
      },
      undefined,
      context(workspace),
    );
    await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-PENDING-UPDATE",
        properties: { title: "Second", semantic_text: "Pending source." },
      },
      {
        id: "REQ-PENDING-UPDATE",
        type: "req",
        title: "Second",
        semantic_text: "Pending source.",
        source,
      },
      { id: "REQ-PENDING-UPDATE", source },
      context(workspace),
    );

    const paths = await discoverSourceFiles(workspace, { trackedOnly: true });
    expect(paths.markdownFiles).toEqual([path.join(workspace, source)]);
    expect(await readFile(path.join(workspace, source), "utf8")).toContain(
      "title: Second",
    );
  });

  test("only explicit recovery may retire a missing pending source", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    execFileSync("git", ["init", "-b", "main"], { cwd: workspace });
    writePendingSourceReceipt(workspace, "docs/REQ-MISSING.md", "a".repeat(64));

    await expect(
      discoverSourceFiles(workspace, { trackedOnly: true }),
    ).rejects.toThrow("Pending source is missing");

    const recovery = await discoverSourceFiles(workspace, {
      trackedOnly: true,
      recoverMissingPendingSources: true,
    });
    expect(recovery.markdownFiles).toEqual([]);
    expect(recovery.recoveredPendingReceiptPaths).toHaveLength(1);

    // Simulate another source operation replacing the receipt while the
    // recovery rebuild is publishing.  Cleanup must retain that newer
    // receipt instead of deleting by the stable hashed filename.
    writePendingSourceReceipt(workspace, "docs/REQ-MISSING.md", "b".repeat(64));
    expect(() =>
      clearRecoveredPendingSourceReceipts(
        workspace,
        recovery.recoveredPendingReceiptPaths,
      ),
    ).toThrow(
      "Pending source receipt changed during recovery for docs/REQ-MISSING.md",
    );
    const newer = await discoverSourceFiles(workspace, {
      trackedOnly: true,
      recoverMissingPendingSources: true,
    });
    expect(newer.recoveredPendingReceiptPaths).toHaveLength(1);

    clearRecoveredPendingSourceReceipts(
      workspace,
      newer.recoveredPendingReceiptPaths,
    );
    const after = await discoverSourceFiles(workspace, { trackedOnly: true });
    expect(after.markdownFiles).toEqual([]);
  });
});
