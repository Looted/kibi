import { describe, expect, test } from "bun:test";
import { KbRejection } from "../../../src/cli-errors.js";
import {
  buildUpsertBatchCommitGoal,
  buildUpsertCommitGoal,
  buildUpsertContradictionPreviewGoal,
  buildWhatIfAnalysisGoal,
  buildWhatIfContradictionGoal,
  formatUpsertError,
  parseUpsertChangeKinds,
  upsertFailure,
} from "../../../src/operations/mutation/contradictions.js";
import type { PrologErrorRecord } from "../../../src/prolog/error-terms.js";

const requirement = {
  entity: { type: "req", id: "REQ-1", title: "T" },
  relationships: [
    { type: "relates_to", from: "it's", to: "o'k" },
    { type: "depends_on", from: "REQ-1", to: "B" },
  ],
  skipContradictionCheck: false,
};
const bare = {
  entity: { type: "test", id: "T-1" },
  relationships: [],
  skipContradictionCheck: true,
};
const RELS =
  "[rel(relates_to, 'it''s', 'o''k', []), rel(depends_on, 'REQ-1', 'B', [])]";
const ENSURE =
  "(current_predicate(checks:what_if_analysis_json/2) -> true ; module_property(kb, file(KbFile)), file_directory_name(KbFile, KbDir), directory_file_path(KbDir, 'checks.pl', ChecksFile), use_module(ChecksFile))";

describe("store goals", () => {
  test("commit one entity with its relationships", () => {
    expect(buildUpsertCommitGoal(requirement)).toBe(
      `kb_commit_upsert(req, [id='REQ-1', title="T"], ${RELS}, false, ChangeKind)`,
    );
    expect(buildUpsertCommitGoal(bare)).toBe(
      "kb_commit_upsert(test, [id='T-1'], [], true, ChangeKind)",
    );
  });

  test("preview the same write", () => {
    expect(buildUpsertContradictionPreviewGoal(requirement)).toBe(
      `kb_preview_upsert_contradiction(req, [id='REQ-1', title="T"], ${RELS}, false)`,
    );
    expect(buildUpsertContradictionPreviewGoal(bare)).toBe(
      "kb_preview_upsert_contradiction(test, [id='T-1'], [], true)",
    );
  });

  test("commit a batch in one goal, and one entity as a plain commit", () => {
    expect(buildUpsertBatchCommitGoal([requirement, bare])).toBe(
      `kb_commit_upsert_batch([upsert(req, [id='REQ-1', title="T"], ${RELS}, false), upsert(test, [id='T-1'], [], true)], ChangeKinds)`,
    );
    expect(buildUpsertBatchCommitGoal([bare])).toBe(
      buildUpsertCommitGoal(bare),
    );
    expect(() => buildUpsertBatchCommitGoal([])).toThrow(
      "Upsert batch requires at least one entity",
    );
  });

  test("stage what-if inputs, relationship-only ones without properties", () => {
    const inputs = [
      requirement,
      { ...requirement, relationshipsOnly: true },
      { ...bare, relationshipsOnly: false },
    ];
    const entries = `[upsert(req, [id='REQ-1', title="T"], ${RELS}), relate(${RELS}), upsert(test, [id='T-1'], [])]`;
    expect(buildWhatIfContradictionGoal(inputs)).toBe(
      `(${ENSURE}, call(checks:what_if_contradiction_witnesses_json(${entries}, JsonString)))`,
    );
    expect(buildWhatIfAnalysisGoal(inputs)).toBe(
      `(${ENSURE}, call(checks:what_if_analysis_json(${entries}, JsonString)))`,
    );
    expect(buildWhatIfAnalysisGoal([])).toBe(
      `(${ENSURE}, call(checks:what_if_analysis_json([], JsonString)))`,
    );
  });
});

describe("change kinds", () => {
  test("read one kind per entity from the batch list", () => {
    expect(
      parseUpsertChangeKinds({ ChangeKinds: "[created,updated, created]" }, 3),
    ).toEqual(["created", "updated", "created"]);
    // Whole words only.
    expect(
      parseUpsertChangeKinds(
        { ChangeKinds: "[xcreated,updatedx]", ChangeKind: "updated" },
        1,
      ),
    ).toEqual(["updated"]);
  });

  test("fall back to the single kind for each entity", () => {
    expect(
      parseUpsertChangeKinds(
        { ChangeKinds: "[created]", ChangeKind: "updated" },
        2,
      ),
    ).toEqual(["updated", "updated"]);
    expect(parseUpsertChangeKinds({ ChangeKind: "created" }, 1)).toEqual([
      "created",
    ]);
  });

  test("refuse a result without a kind for every entity", () => {
    for (const [bindings, count] of [
      [{ ChangeKind: "created" }, 0],
      [{ ChangeKind: "deleted" }, 1],
      [{}, 2],
    ] as const)
      expect(() => parseUpsertChangeKinds(bindings, count)).toThrow(
        `Upsert batch completed without ${count} created/updated result(s)`,
      );
  });
});

const RESOLVE =
  "\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one.";
const GENERIC =
  "This requirement conflicts with existing requirements. Add a supersedes relationship to the conflicting requirement, or deprecate the old requirement before creating the new one.";
const INVALID = { relType: "verified_by", fromType: "req", toType: "adr" };

describe("structured store errors", () => {
  test("list each distinct conflict once, with the stage", () => {
    const record: PrologErrorRecord = {
      code: "contradiction",
      message: "m",
      conflicts: [
        { otherId: "REQ-2", reason: "same subject" },
        { otherId: "REQ-2", reason: "same subject" },
        { otherId: "REQ-3", reason: "other" },
      ],
    } as PrologErrorRecord;
    expect(formatUpsertError("REQ-1", "x (stage=commit) y", record)).toBe(
      `Contradiction detected for requirement REQ-1:\n  - Conflicts with REQ-2: same subject\n  - Conflicts with REQ-3: other${RESOLVE} (stage=commit)`,
    );
  });

  test("explain a contradiction without conflicts", () => {
    for (const conflicts of [[], undefined])
      expect(
        formatUpsertError("REQ-1", undefined, {
          code: "contradiction",
          message: "m",
          conflicts,
        } as PrologErrorRecord),
      ).toBe(`Contradiction detected for entity REQ-1: ${GENERIC}`);
  });

  test("format an invalid relationship, else the message", () => {
    const tuple = formatUpsertError("REQ-1", undefined, {
      code: "invalid_relationship",
      message: "raw",
      relationship: INVALID,
    } as PrologErrorRecord);
    expect(
      tuple.startsWith(
        "Failed to upsert entity REQ-1: Invalid relationship: verified_by from req to adr. ",
      ),
    ).toBe(true);
    expect(
      formatUpsertError("REQ-1", undefined, {
        code: "invalid_relationship",
        message: "raw",
      } as PrologErrorRecord),
    ).toBe("Failed to upsert entity REQ-1: raw");
    // Only an invalid_relationship record names its tuple.
    expect(
      formatUpsertError("REQ-1", undefined, {
        code: "audit_locked",
        message: "busy",
        relationship: INVALID,
      } as PrologErrorRecord),
    ).toBe("Failed to upsert entity REQ-1: busy");
    expect(
      formatUpsertError("REQ-1", "(stage=a)", {
        code: "audit_locked",
        message: "busy",
      } as PrologErrorRecord),
    ).toBe("Failed to upsert entity REQ-1: busy (stage=a)");
  });
});

describe("text store errors", () => {
  const error = (raw?: string) => formatUpsertError("REQ-1", raw);

  test("name an unknown error", () => {
    expect(error()).toBe("Failed to upsert entity REQ-1: Unknown error");
    expect(error("")).toBe("Failed to upsert entity REQ-1: Unknown error");
  });

  test("name a stale snapshot and a locked journal", () => {
    expect(error("x stale_snapshot (stage=s)")).toBe(
      "Failed to upsert entity REQ-1: KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot) (stage=s)",
    );
    for (const raw of [
      "Audit journal is locked",
      "audit_log",
      "audit.log",
      "Resource temporarily unavailable",
    ])
      expect(error(`e: ${raw}`)).toBe(
        "Failed to upsert entity REQ-1: Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying",
      );
  });

  test("drop diagnostic lines before reading the error", () => {
    expect(
      error(
        "__KIBI_STAGE__: stale_snapshot\r\n__KIBI_RUNTIME__: audit_log\n__KIBI_ERROR__: x\nboom",
      ),
    ).toBe("Failed to upsert entity REQ-1: boom");
    expect(error("boom\n__KIBI_ERROR__: x")).toBe(
      "Failed to upsert entity REQ-1: boom\n",
    );
    expect(error("note __KIBI_STAGE__: x")).toBe(
      "Failed to upsert entity REQ-1: note __KIBI_STAGE__: x",
    );
    expect(error("__KIBI_ERROR__: only")).toBe(
      "Failed to upsert entity REQ-1: __KIBI_ERROR__: only",
    );
    expect(error("__KIBI_OTHER__: kept")).toBe(
      "Failed to upsert entity REQ-1: __KIBI_OTHER__: kept",
    );
  });

  test("format an invalid relationship", () => {
    expect(
      error("Invalid relationship: verified_by from req to adr. (stage=v)"),
    ).toMatch(
      /^Failed to upsert entity REQ-1: Invalid relationship: verified_by from req to adr\. .+ \(stage=v\)$/,
    );
  });

  test("list the conflicts a contradiction term names", () => {
    expect(
      error(
        `kb_contradiction( [ 'same subject'-'REQ-2', "quoted \\"x\\""-'REQ-3', 'same subject'-'REQ-2' ] ) (stage=c)`,
      ),
    ).toBe(
      `Contradiction detected for requirement REQ-1:\n  - Conflicts with REQ-2: same subject\n  - Conflicts with REQ-3: quoted \\"x\\"${RESOLVE} (stage=c)`,
    );
    expect(error("kb_contradiction([nothing])")).toBe(
      `Contradiction detected for entity REQ-1: ${GENERIC}`,
    );
  });

  test("name a failed transaction, else pass the text on", () => {
    expect(error("rdf_transaction failed (stage=t)")).toBe(
      "Failed to upsert entity REQ-1: Transaction failed (stage=t)",
    );
    expect(error("plain (stage=t)")).toBe(
      "Failed to upsert entity REQ-1: plain (stage=t)",
    );
  });
});

describe("store failures", () => {
  test("code a contradiction as a semantic rejection", () => {
    const failure = upsertFailure("REQ-1", "kb_contradiction(['r'-'REQ-2'])");
    expect(failure).toBeInstanceOf(KbRejection);
    expect((failure as KbRejection).code).toBe("SEMANTIC_CONTRADICTION");
    expect(failure.message).toBe(
      `Contradiction detected for requirement REQ-1:\n  - Conflicts with REQ-2: r${RESOLVE}`,
    );
  });

  test("code an invalid relationship from a record or the text", () => {
    for (const failure of [
      upsertFailure("REQ-1", undefined, {
        code: "invalid_relationship",
        message: "m",
        relationship: INVALID,
      } as PrologErrorRecord),
      upsertFailure(
        "REQ-1",
        "Invalid relationship: verified_by from req to adr.",
      ),
    ]) {
      expect(failure).toBeInstanceOf(KbRejection);
      expect((failure as KbRejection).code).toBe("INVALID_RELATIONSHIP");
    }
  });

  test("leave any other failure an ordinary error", () => {
    for (const failure of [
      upsertFailure("REQ-1"),
      upsertFailure("REQ-1", "boom"),
      // A record decides, whatever the text says.
      upsertFailure(
        "REQ-1",
        "Invalid relationship: verified_by from req to adr.",
        { code: "audit_locked", message: "m" } as PrologErrorRecord,
      ),
    ]) {
      expect(failure).not.toBeInstanceOf(KbRejection);
      expect(failure).toBeInstanceOf(Error);
    }
    expect(upsertFailure("REQ-1", "boom").message).toBe(
      "Failed to upsert entity REQ-1: boom",
    );
  });
});
