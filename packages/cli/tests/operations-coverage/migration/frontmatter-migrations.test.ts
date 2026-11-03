import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  planContextMissingTags,
  planSemanticTextPins,
  withAddedTag,
} from "../../../src/operations/migration/entity-body-context.js";
import {
  listLaneMarkdownFiles,
  readTopLevelField,
  withTopLevelField,
} from "../../../src/operations/migration/kb-sources.js";
import { planPolarityValueBackfill } from "../../../src/operations/migration/polarity-values.js";
import {
  claimReviewInstruction,
  planProofContractClaimPins,
  readProofContractClaimCandidates,
} from "../../../src/operations/migration/proof-contract-claims.js";
import { untrackCoordinateArtifact } from "../../../src/operations/migration/untrack-symbol-coordinates.js";
import * as prologJson from "../../../src/public/operations/prolog-json.js";
import * as runtimeTypes from "../../../src/public/operations/runtime-types.js";
import { scratch } from "../helpers.js";

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function workspace(files: Record<string, string> = {}): string {
  const ws = scratch(files);
  cleanups.push(ws.cleanup);
  return ws.root;
}

describe("context migrations", () => {
  test("skip a requirement whose semantic_text cannot be pinned in place", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md":
        "---\nid: REQ-a\ntitle: A\ntype: req\nsemantic_text:\n  - listed\n---\nA must hold.\n",
    });
    expect(planSemanticTextPins(root).skipped).toStrictEqual([
      {
        id: "REQ-a",
        path: ".kb/requirements/REQ-a.md",
        reason: "semantic_text could not be edited safely",
      },
    ]);
  });

  test("skip an entity whose tags cannot be extended in place", () => {
    const root = workspace({
      ".kb/requirements/REQ-thin.md":
        "---\nid: REQ-thin\ntitle: Thin\ntags: single\n---\nThin must hold.\n",
    });
    expect(planContextMissingTags(root).skipped).toStrictEqual([
      {
        id: "REQ-thin",
        path: ".kb/requirements/REQ-thin.md",
        reason: "tags could not be edited safely",
      },
    ]);
  });

  test("refuses a tag edit that does not read back as one more tag", () => {
    const body = "\nBody.\n";
    expect(withAddedTag(`---\nid: [unclosed\n---${body}`, "t")).toBeNull();
    // A tag that splits into two list items, and one that breaks the list.
    expect(
      withAddedTag(`---\nid: A\ntags: [a]\n---${body}`, "b, c"),
    ).toBeNull();
    expect(withAddedTag(`---\nid: A\ntags: [a]\n---${body}`, "]")).toBeNull();
  });
});

describe("front matter field helpers", () => {
  test("list markdown in nested lane folders", () => {
    const root = workspace({
      ".kb/facts/nested/FACT-a.md": "---\nid: FACT-a\n---\n",
      // A lane path that is not a folder lists nothing.
      ".kb/adr": "",
    });
    expect(
      listLaneMarkdownFiles(root, ["facts", "adr"]).map(
        (file) => file.relativePath,
      ),
    ).toStrictEqual([".kb/facts/nested/FACT-a.md"]);
  });

  test("read nothing from front matter that does not parse", () => {
    expect(readTopLevelField("id: A\nlist:\n  - [a\n", "list")).toBeUndefined();
  });

  test("refuse a field write that does not read back", () => {
    const document = (text: string) => `---\n${text}---\nBody.\n`;
    expect(withTopLevelField(document("- a\n"), "note", "x")).toBeNull();
    expect(withTopLevelField(document(""), "note", "x")).toBeNull();
    expect(
      withTopLevelField(document("id: [unclosed\n"), "note", "x"),
    ).toBeNull();
    expect(withTopLevelField(document("id: A\n"), "id", "B")).not.toBeNull();
  });
});

describe("polarity value backfill", () => {
  const fact = (text: string) => ({
    ".kb/facts/FACT-p.md": `---\n${text}---\n`,
  });

  test("refuses front matter it cannot read or extend", () => {
    expect(() =>
      planPolarityValueBackfill(workspace(fact("id: [unclosed\n"))),
    ).toThrow("Cannot migrate fact .kb/facts/FACT-p.md: ");
    expect(() =>
      planPolarityValueBackfill(
        workspace(
          fact("id: FACT-p\nfact_kind: property_value\npolarity: require\n"),
        ),
      ),
    ).toThrow(
      "Cannot migrate polarity fact .kb/facts/FACT-p.md: subject_key and property_key are required",
    );
    expect(() =>
      planPolarityValueBackfill(
        workspace(
          fact(
            "  id: FACT-p\n  fact_kind: property_value\n  polarity: forbid\n  subject_key: a\n  property_key: b\n",
          ),
        ),
      ),
    ).toThrow("Polarity migration could not verify .kb/facts/FACT-p.md");
  });
});

describe("proof contract claims", () => {
  test("names the fact kind each contract kind can derive", () => {
    const instruction = (kind: string) =>
      claimReviewInstruction({
        id: "TEST-1",
        path: ".kb/tests/TEST-1.md",
        kind,
        candidates: [
          {
            claim_key: "CLAIM-1",
            requirement_id: "REQ-1",
            fact_id: "FACT-1",
            binding: "attested",
          },
        ],
      } as never);
    expect(instruction("regex")).toContain("as a string fact");
    expect(instruction("rule")).toContain("as a rule, predicate or set fact");
    expect(instruction("arithmetic")).toContain("as a numeric fact");
  });

  test("skips a contract that is not a block mapping", () => {
    const root = workspace({
      ".kb/tests/TEST-1.md":
        "---\nid: TEST-1\ntitle: T\ntype: test\nproof_contract: {version: kibi.proof-contract.v1}\n---\n",
    });
    expect(
      planProofContractClaimPins(root, [
        {
          test_id: "TEST-1",
          kind: "exhaustive",
          candidates: [
            {
              claim_key: "CLAIM-1",
              requirement_id: "REQ-1",
              fact_id: "FACT-1",
              binding: "derived",
            },
          ],
        },
      ]).skipped,
    ).toStrictEqual([
      {
        id: "TEST-1",
        path: ".kb/tests/TEST-1.md",
        reason:
          "its proof_contract is not a block mapping Kibi can extend in place",
      },
    ]);
  });

  test("reads candidates from a healthy store, and nothing on failure", async () => {
    const rows = [{ test_id: "TEST-1", kind: "exhaustive", candidates: [] }];
    const runtime: { prolog?: unknown } = {};
    spies.push(
      spyOn(runtimeTypes, "executeOperation").mockImplementation((async (
        _runtime: unknown,
        spec: {
          name: string;
          execute: (input: unknown, context: unknown) => unknown;
        },
      ) =>
        spec.name === "kb_migrate_proof_contract_claims_preview"
          ? spec.execute({}, { prolog: runtime.prolog })
          : {
              structuredContent: {
                branchStore: { state: "healthy" },
                snapshotId: "snap",
                branchAttachment: { kind: "exact" },
              },
            }) as never),
      spyOn(prologJson, "runOperationJsonQuery").mockResolvedValue(
        rows as never,
      ),
    );
    const root = workspace();
    expect(await readProofContractClaimCandidates(root)).toStrictEqual([]);
    runtime.prolog = { query: async () => ({ success: true, bindings: {} }) };
    expect(await readProofContractClaimCandidates(root)).toStrictEqual(rows);
    for (const spy of spies.splice(0)) spy.mockRestore();
    spies.push(
      spyOn(runtimeTypes, "executeOperation").mockRejectedValue(
        new Error("down"),
      ),
    );
    expect(await readProofContractClaimCandidates(root)).toBeNull();
  });
});

describe("symbol coordinate artifact", () => {
  test("is removed from the index and kept on disk", () => {
    const root = workspace({ ".kb/symbol-coordinates.yaml": "symbols: []\n" });
    const git = (...args: string[]) =>
      spawnSync("git", args, { cwd: root, encoding: "utf8" });
    git("init", "-q");
    git("add", ".kb/symbol-coordinates.yaml");
    // A held index lock makes git rm fail.
    writeFileSync(path.join(root, ".git", "index.lock"), "");
    const failed = untrackCoordinateArtifact(root);
    expect(failed.outcome).toBe("failed");
    expect((failed as { reason: string }).reason).toContain("index.lock");
    rmSync(path.join(root, ".git", "index.lock"));
    expect(untrackCoordinateArtifact(root)).toStrictEqual({
      outcome: "untracked",
    });
    expect(untrackCoordinateArtifact(root)).toStrictEqual({
      outcome: "not_tracked",
    });
  });
});
