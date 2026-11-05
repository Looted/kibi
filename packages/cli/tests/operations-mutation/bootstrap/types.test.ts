import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  BOOTSTRAP_PROVIDER_ORDER,
  INTENT_CLAIM_KINDS,
  KNOWLEDGE_SOURCE_AUTHORITIES,
  KNOWLEDGE_SOURCE_KINDS,
  bootstrapEmptyKbSnapshotId,
  bootstrapPlanHash,
} from "../../../src/operations/bootstrap/types.js";
import { canonicalize } from "../../../src/operations/semantic-advisor/shared.js";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

describe("bootstrap plan identity", () => {
  test("hashes the canonical plan without its own hash", () => {
    expect(bootstrapPlanHash({ b: 1, a: [2], planHash: "old" })).toBe(
      sha('{"a":[2],"b":1}'),
    );
    expect(bootstrapPlanHash({ planHash: "x" })).toBe(sha("{}"));
  });

  test("binds an empty KB to branch, snapshot and source hashes", () => {
    const input = {
      branch: "main",
      workspaceSnapshot: "snap",
      sourceHashes: { "a.md": "h", "b.md": null },
    };
    expect(bootstrapEmptyKbSnapshotId(input)).toBe(
      `empty-source-state-${sha(
        canonicalize({
          version: "kibi.empty-source-state.v1",
          branch: "main",
          workspaceSnapshot: "snap",
          sourceHashes: { "a.md": "h", "b.md": null },
        }),
      )}`,
    );
    expect(bootstrapEmptyKbSnapshotId(input)).toBe(
      `empty-source-state-${sha('{"branch":"main","sourceHashes":{"a.md":"h","b.md":null},"version":"kibi.empty-source-state.v1","workspaceSnapshot":"snap"}')}`,
    );
  });
});

describe("bootstrap vocabularies", () => {
  test("are stable", () => {
    expect(KNOWLEDGE_SOURCE_KINDS).toStrictEqual([
      "issue_tracker",
      "wiki",
      "specification",
      "design",
      "decision_log",
      "support",
      "chat",
      "repository_docs",
      "other",
    ]);
    expect(KNOWLEDGE_SOURCE_AUTHORITIES).toStrictEqual([
      "authoritative",
      "supporting",
      "stale",
    ]);
    expect(INTENT_CLAIM_KINDS).toStrictEqual([
      "intent",
      "observation",
      "open_question",
    ]);
    expect(BOOTSTRAP_PROVIDER_ORDER).toStrictEqual([
      "typed_kibi_docs",
      "generic_repo_docs",
      "repo_metadata",
      "repo_layout",
      "test_topology",
      "source_symbols",
    ]);
  });
});
