/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import {
  extractPrologErrorRecord,
  parsePrologErrorTerm,
} from "../../src/prolog/error-terms.js";
import { formatUpsertError } from "../../src/operations/mutation/contradictions.js";
import { PrologProcess } from "../../src/prolog";

describe("parsePrologErrorTerm", () => {
  test("parses stale_snapshot permission errors", () => {
    const record = parsePrologErrorTerm(
      "error(permission_error(save,kb,stale_snapshot),kb_save/0)",
    );
    expect(record?.code).toBe("stale_snapshot");
    expect(record?.message).toBe(
      "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
    );
  });

  test("parses audit log lock errors", () => {
    const record = parsePrologErrorTerm(
      "error(permission_error(lock,audit_log,'/tmp/kb/audit.log'),context(kb_commit_upsert/5,permission_error(lock,log,'/tmp')))",
    );
    expect(record?.code).toBe("audit_locked");
    expect(record?.message).toBe(
      "Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying",
    );
  });

  test("parses generic permission errors", () => {
    const record = parsePrologErrorTerm(
      "error(permission_error(attach,kb,'/tmp/kb'),kb_attach/1)",
    );
    expect(record?.code).toBe("permission_denied");
    expect(record?.message).toBe("Access denied or KB locked");
  });

  test("parses target entity existence errors with role", () => {
    const record = parsePrologErrorTerm(
      "error(existence_error(entity,'REQ-9'),context(kb_assert_relationship,'Target entity does not exist'))",
    );
    expect(record?.code).toBe("entity_not_found");
    expect(record?.entityId).toBe("REQ-9");
    expect(record?.role).toBe("target");
    expect(record?.message).toBe("Target entity does not exist: REQ-9");
  });

  test("parses source entity existence errors with role", () => {
    const record = parsePrologErrorTerm(
      "error(existence_error(entity,'REQ-9'),context(kb_assert_relationship,'Source entity does not exist'))",
    );
    expect(record?.role).toBe("source");
    expect(record?.message).toBe("Source entity does not exist: REQ-9");
  });

  test("parses invalid relationship errors with format args", () => {
    const record = parsePrologErrorTerm(
      "error(type_error(relationship,implements),context(kb_assert_relationship,'Invalid relationship: ~w from ~w to ~w'-[implements,test,req]))",
    );
    expect(record?.code).toBe("invalid_relationship");
    expect(record?.relationship).toEqual({
      relType: "implements",
      fromType: "test",
      toType: "req",
    });
    expect(record?.message).toBe(
      "Invalid relationship: implements from test to req",
    );
  });

  test("falls back to plain invalid relationship message without args", () => {
    const record = parsePrologErrorTerm(
      "error(type_error(relationship,relates_to),context(kb_assert_relationship,'nope'))",
    );
    expect(record?.code).toBe("invalid_relationship");
    expect(record?.relationship).toBeUndefined();
    expect(record?.message).toBe("Invalid relationship type or direction");
  });

  test("parses contradiction terms with conflict pairs", () => {
    const record = parsePrologErrorTerm(
      "error(kb_contradiction(['Subject X conflicts with subject Y'-'REQ-1','Property Z mismatch'-'REQ-2']),'Contradiction detected for requirement REQ-3:\\n  - Conflicts with REQ-1: Subject X conflicts with subject Y')",
    );
    expect(record?.code).toBe("contradiction");
    expect(record?.conflicts).toEqual([
      { reason: "Subject X conflicts with subject Y", otherId: "REQ-1" },
      { reason: "Property Z mismatch", otherId: "REQ-2" },
    ]);
    expect(record?.message).toContain("Contradiction detected");
  });

  test("parses validation_error terms", () => {
    const record = parsePrologErrorTerm(
      "error(validation_error('Entity shape invalid for fact'),'Entity shape invalid for fact')",
    );
    expect(record?.code).toBe("validation_error");
    expect(record?.message).toBe("Entity shape invalid for fact");
  });


  test("returns null for zero-argument error terms", () => {
    expect(parsePrologErrorTerm("error(boom())")).toBeNull();
  });

  test("entity lookup without source/target role uses the neutral verb", () => {
    const record = parsePrologErrorTerm(
      "error(existence_error(entity,'REQ-8'),context(kb_assert_relationship,'other reason'))",
    );
    expect(record?.role).toBeUndefined();
    expect(record?.message).toBe("Entity does not exist: REQ-8");
  });

  test("returns null for unrecognized terms", () => {
    expect(parsePrologErrorTerm("error(domain_error(x,y),ctx)")).toBeNull();
    expect(parsePrologErrorTerm("not_an_error_term")).toBeNull();
  });
});

describe("extractPrologErrorRecord", () => {
  test("extracts the structured record from noisy stderr", () => {
    const stderr = [
      "__KIBI_STAGE__:commit",
      "__KIBI_ERROR__:error(permission_error(save,kb,stale_snapshot),kb_save/0)",
      "ERROR: No permission to save kb",
      "",
    ].join("\n");
    const record = extractPrologErrorRecord(stderr);
    expect(record?.code).toBe("stale_snapshot");
  });

  test("returns null when no sentinel is present", () => {
    expect(extractPrologErrorRecord("ERROR: something else\n")).toBeNull();
  });
});

describe("formatUpsertError with structured records", () => {
  test("formats contradiction records with conflict lines", () => {
    const record = parsePrologErrorTerm(
      "error(kb_contradiction(['Subject X conflicts with subject Y'-'REQ-1']),'Contradiction detected for requirement REQ-2')",
    );
    const message = formatUpsertError(
      "REQ-2",
      "Query failed (stage=contradiction_check)",
      record ?? undefined,
    );
    expect(message).toContain("Contradiction detected for requirement REQ-2:");
    expect(message).toContain("- Conflicts with REQ-1: Subject X conflicts");
    expect(message).toContain("To resolve:");
    expect(message).toContain("(stage=contradiction_check)");
  });


  test("formats the generic contradiction message when the term carries no conflict pairs", () => {
    const record = parsePrologErrorTerm(
      "error(kb_contradiction([]),'Contradiction detected for requirement REQ-2')",
    );
    const message = formatUpsertError("REQ-2", "raw", record ?? undefined);
    expect(message).toContain(
      "Contradiction detected for entity REQ-2: This requirement conflicts with existing requirements",
    );
  });

  test("formats invalid relationship records with the recipe", () => {
    const record = parsePrologErrorTerm(
      "error(type_error(relationship,implements),context(kb_assert_relationship,'Invalid relationship: ~w from ~w to ~w'-[implements,test,req]))",
    );
    const message = formatUpsertError("TEST-1", "boom", record ?? undefined);
    expect(message).toContain("Failed to upsert entity TEST-1:");
    expect(message).toContain("Invalid relationship: implements from test to req");
  });

  test("formats stale snapshot records", () => {
    const record = parsePrologErrorTerm(
      "error(permission_error(save,kb,stale_snapshot),kb_save/0)",
    );
    expect(formatUpsertError("REQ-1", "raw (stage=commit)", record ?? undefined)).toBe(
      "Failed to upsert entity REQ-1: KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot) (stage=commit)",
    );
  });
});

describe("structured error transport", () => {
  test("one-shot queries surface structured error records", async () => {
    const prolog = new PrologProcess({ timeout: 30000 });
    const result = await prolog.query(
      "throw(error(permission_error(save,kb,stale_snapshot),kb_save/0))",
    );
    expect(result.success).toBe(false);
    expect(result.errorRecord?.code).toBe("stale_snapshot");
    expect(result.error).toBe(
      "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
    );
  }, 60000);

  test("one-shot queries surface contradiction records", async () => {
    const prolog = new PrologProcess({ timeout: 30000 });
    const result = await prolog.query(
      "throw(error(kb_contradiction(['Subject X conflicts'-'REQ-1']),'Contradiction detected for requirement REQ-2'))",
    );
    expect(result.success).toBe(false);
    expect(result.errorRecord?.code).toBe("contradiction");
    expect(result.errorRecord?.conflicts).toEqual([
      { reason: "Subject X conflicts", otherId: "REQ-1" },
    ]);
  }, 60000);

  test("interactive queries surface structured error records", async () => {
    const prolog = new PrologProcess({ oneShot: false, timeout: 30000 });
    await prolog.start();
    try {
      const result = await prolog.query(
        "throw(error(existence_error(entity,'REQ-9'),context(kb_assert_relationship,'Target entity does not exist')))",
      );
      expect(result.success).toBe(false);
      expect(result.errorRecord?.code).toBe("entity_not_found");
      expect(result.errorRecord?.entityId).toBe("REQ-9");
      expect(result.error).toBe("Target entity does not exist: REQ-9");
    } finally {
      await prolog.terminate();
    }
  }, 60000);

  test("SWI-level errors still translate without a record", async () => {
    const prolog = new PrologProcess({ oneShot: false, timeout: 30000 });
    await prolog.start();
    try {
      const result = await prolog.query("nonexistent_predicate(foo)");
      expect(result.success).toBe(false);
      expect(result.errorRecord).toBeUndefined();
      expect(result.error).toContain("not found");
    } finally {
      await prolog.terminate();
    }
  }, 60000);
});
