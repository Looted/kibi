import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ADR_PROPOSED_REVIEW_CODE,
  ADR_UNLINKED_REVIEW_CODE,
  EXCEPTION_UNAPPROVED_REVIEW_CODE,
  MIGRATION_SYNC_ACTION_ID,
  MIGRATION_SYNC_CODE,
  RATIONALE_REVIEW_CODE,
  SOURCE_PATH_REVIEW_CODE,
  SOURCE_PATH_REWRITE_ACTION_ID,
  SOURCE_PATH_REWRITE_CODE,
  SUPERSESSION_CYCLE_REVIEW_CODE,
  SYMBOL_OWNER_REVIEW_ACTION_ID,
  SYMBOL_OWNER_REVIEW_CODE,
} from "../../../src/public/operations/schema6-check-actions.js";
import { SOURCE_PATH_DANGLING_RULE } from "../../../src/public/operations/source-path-dangling.js";

// implements REQ-kibi-lifecycle-check-codes

/**
 * The codes kb_check gives the lifecycle findings and repair actions it reports.
 * Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The proposed ADR review code shall be review_adr_proposed. */
export function adrProposedReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-adr-proposed-review-code",
    symbolId: "SYM-schema6-check-actions-ADR_PROPOSED_REVIEW_CODE",
    value: ADR_PROPOSED_REVIEW_CODE,
  });
}

/** The unlinked ADR review code shall be review_adr_unlinked. */
export function adrUnlinkedReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-adr-unlinked-review-code",
    symbolId: "SYM-schema6-check-actions-ADR_UNLINKED_REVIEW_CODE",
    value: ADR_UNLINKED_REVIEW_CODE,
  });
}

/** The unapproved exception review code shall be review_exception_unapproved. */
export function exceptionUnapprovedReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-exception-unapproved-review-code",
    symbolId: "SYM-schema6-check-actions-EXCEPTION_UNAPPROVED_REVIEW_CODE",
    value: EXCEPTION_UNAPPROVED_REVIEW_CODE,
  });
}

/** The missing rationale review code shall be review_requirement_rationale_missing. */
export function rationaleReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rationale-review-code",
    symbolId: "SYM-schema6-check-actions-RATIONALE_REVIEW_CODE",
    value: RATIONALE_REVIEW_CODE,
  });
}

/** The supersession cycle review code shall be review_supersession_cycle. */
export function supersessionCycleReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-supersession-cycle-review-code",
    symbolId: "SYM-schema6-check-actions-SUPERSESSION_CYCLE_REVIEW_CODE",
    value: SUPERSESSION_CYCLE_REVIEW_CODE,
  });
}

/** The dangling source path review code shall be review_source_path_dangling. */
export function sourcePathReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-source-path-review-code",
    symbolId: "SYM-schema6-check-actions-SOURCE_PATH_REVIEW_CODE",
    value: SOURCE_PATH_REVIEW_CODE,
  });
}

/** The dangling source path check rule shall be source-path-dangling. */
export function sourcePathDanglingRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-source-path-dangling-rule",
    symbolId: "SYM-source-path-dangling-SOURCE_PATH_DANGLING_RULE",
    value: SOURCE_PATH_DANGLING_RULE,
  });
}

/** The source path rewrite action id shall be source-path-rewrite. */
export function sourcePathRewriteActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-source-path-rewrite-action",
    symbolId: "SYM-schema6-check-actions-SOURCE_PATH_REWRITE_ACTION_ID",
    value: SOURCE_PATH_REWRITE_ACTION_ID,
  });
}

/** The source path rewrite code shall be source_path_rewrite. */
export function sourcePathRewriteCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-source-path-rewrite-code",
    symbolId: "SYM-schema6-check-actions-SOURCE_PATH_REWRITE_CODE",
    value: SOURCE_PATH_REWRITE_CODE,
  });
}

/** The migration sync action id shall be migration-sync. */
export function migrationSyncActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-migration-sync-action",
    symbolId: "SYM-schema6-check-actions-MIGRATION_SYNC_ACTION_ID",
    value: MIGRATION_SYNC_ACTION_ID,
  });
}

/** The migration sync code shall be migration_sync. */
export function migrationSyncCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-migration-sync-code",
    symbolId: "SYM-schema6-check-actions-MIGRATION_SYNC_CODE",
    value: MIGRATION_SYNC_CODE,
  });
}

/** The superseded symbol owner review action id shall be review-symbol-owner-superseded. */
export function symbolOwnerReviewActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-symbol-owner-review-action",
    symbolId: "SYM-schema6-check-actions-SYMBOL_OWNER_REVIEW_ACTION_ID",
    value: SYMBOL_OWNER_REVIEW_ACTION_ID,
  });
}

/** The superseded symbol owner review code shall be review_symbol_owner_superseded. */
export function symbolOwnerReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-symbol-owner-review-code",
    symbolId: "SYM-schema6-check-actions-SYMBOL_OWNER_REVIEW_CODE",
    value: SYMBOL_OWNER_REVIEW_CODE,
  });
}

describe("KB lifecycle check codes", () => {
  test("The proposed ADR review code shall be review_adr_proposed", () => {
    writeCodeCertificate(adrProposedReviewCodeCertificate());
    expect(ADR_PROPOSED_REVIEW_CODE).toBe("review_adr_proposed");
  });

  test("The unlinked ADR review code shall be review_adr_unlinked", () => {
    writeCodeCertificate(adrUnlinkedReviewCodeCertificate());
    expect(ADR_UNLINKED_REVIEW_CODE).toBe("review_adr_unlinked");
  });

  test("The unapproved exception review code shall be review_exception_unapproved", () => {
    writeCodeCertificate(exceptionUnapprovedReviewCodeCertificate());
    expect(EXCEPTION_UNAPPROVED_REVIEW_CODE).toBe(
      "review_exception_unapproved",
    );
  });

  test("The missing rationale review code shall be review_requirement_rationale_missing", () => {
    writeCodeCertificate(rationaleReviewCodeCertificate());
    expect(RATIONALE_REVIEW_CODE).toBe("review_requirement_rationale_missing");
  });

  test("The supersession cycle review code shall be review_supersession_cycle", () => {
    writeCodeCertificate(supersessionCycleReviewCodeCertificate());
    expect(SUPERSESSION_CYCLE_REVIEW_CODE).toBe("review_supersession_cycle");
  });

  test("The dangling source path review code shall be review_source_path_dangling", () => {
    writeCodeCertificate(sourcePathReviewCodeCertificate());
    expect(SOURCE_PATH_REVIEW_CODE).toBe("review_source_path_dangling");
  });

  test("The dangling source path check rule shall be source-path-dangling", () => {
    writeCodeCertificate(sourcePathDanglingRuleCertificate());
    expect(SOURCE_PATH_DANGLING_RULE).toBe("source-path-dangling");
  });

  test("The source path rewrite action id shall be source-path-rewrite", () => {
    writeCodeCertificate(sourcePathRewriteActionCertificate());
    expect(SOURCE_PATH_REWRITE_ACTION_ID).toBe("source-path-rewrite");
  });

  test("The source path rewrite code shall be source_path_rewrite", () => {
    writeCodeCertificate(sourcePathRewriteCodeCertificate());
    expect(SOURCE_PATH_REWRITE_CODE).toBe("source_path_rewrite");
  });

  test("The migration sync action id shall be migration-sync", () => {
    writeCodeCertificate(migrationSyncActionCertificate());
    expect(MIGRATION_SYNC_ACTION_ID).toBe("migration-sync");
  });

  test("The migration sync code shall be migration_sync", () => {
    writeCodeCertificate(migrationSyncCodeCertificate());
    expect(MIGRATION_SYNC_CODE).toBe("migration_sync");
  });

  test("The superseded symbol owner review action id shall be review-symbol-owner-superseded", () => {
    writeCodeCertificate(symbolOwnerReviewActionCertificate());
    expect(SYMBOL_OWNER_REVIEW_ACTION_ID).toBe(
      "review-symbol-owner-superseded",
    );
  });

  test("The superseded symbol owner review code shall be review_symbol_owner_superseded", () => {
    writeCodeCertificate(symbolOwnerReviewCodeCertificate());
    expect(SYMBOL_OWNER_REVIEW_CODE).toBe("review_symbol_owner_superseded");
  });
});
