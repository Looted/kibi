import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  clearRecoveredPendingSourceReceipts,
  discoverSourceFiles,
} from "../../src/commands/sync/discovery.js";
import {
  configuredSourceTarget,
  normalizeAuthoredSourcePath,
  renderSourceDeletion,
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

  test("uses plural config keys and leaves directory targets ambiguous", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "kibi-source-"));
    workspaces.push(workspace);
    expect(configuredSourceTarget(workspace, "scenario")).toBeUndefined();
    expect(configuredSourceTarget(workspace, "symbol")).toBe(
      "documentation/symbols.yaml",
    );
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
    const paths = await discoverSourceFiles(
      workspace,
      { requirements: "docs" },
      { trackedOnly: true },
    );
    expect(paths.markdownFiles).toEqual([target]);
    await writeFile(target, `${body}drift\n`);
    await expect(
      discoverSourceFiles(
        workspace,
        { requirements: "docs" },
        { trackedOnly: true },
      ),
    ).rejects.toThrow("Pending source hash drift");
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

    const paths = await discoverSourceFiles(
      workspace,
      { requirements: "docs" },
      { trackedOnly: true },
    );
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
      discoverSourceFiles(
        workspace,
        { requirements: "docs" },
        { trackedOnly: true },
      ),
    ).rejects.toThrow("Pending source is missing");

    const recovery = await discoverSourceFiles(
      workspace,
      { requirements: "docs" },
      { trackedOnly: true, recoverMissingPendingSources: true },
    );
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
    const newer = await discoverSourceFiles(
      workspace,
      { requirements: "docs" },
      { trackedOnly: true, recoverMissingPendingSources: true },
    );
    expect(newer.recoveredPendingReceiptPaths).toHaveLength(1);

    clearRecoveredPendingSourceReceipts(
      workspace,
      newer.recoveredPendingReceiptPaths,
    );
    const after = await discoverSourceFiles(
      workspace,
      { requirements: "docs" },
      { trackedOnly: true },
    );
    expect(after.markdownFiles).toEqual([]);
  });
});
