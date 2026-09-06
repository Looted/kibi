// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";

import { formatUpsertError } from "../../src/operations/mutation/contradictions.js";

let previousExitCode: string | number | undefined | null;

afterEach(() => {
  process.exitCode = previousExitCode ?? 0;
});

describe("formatUpsertError remaining diagnostic branches", () => {
  test("formats stale, audit-lock, relationship, contradiction, and transaction failures", () => {
    previousExitCode = process.exitCode;
    expect(formatUpsertError("REQ-1")).toContain("Unknown error");
    expect(
      formatUpsertError("REQ-1", "__KIBI_STAGE__:x\nstale_snapshot (stage=commit)"),
    ).toMatch(/stale_snapshot.*stage=commit/);
    expect(
      formatUpsertError("REQ-1", "Audit journal is locked (stage=write)"),
    ).toMatch(/Audit journal is locked/);
    expect(
      formatUpsertError("REQ-1", "open audit_log failed"),
    ).toMatch(/Audit journal is locked/);
    expect(formatUpsertError("REQ-1", "audit.log busy")).toMatch(
      /Audit journal is locked/,
    );
    expect(
      formatUpsertError("REQ-1", "Resource temporarily unavailable"),
    ).toMatch(/Audit journal is locked/);
    expect(
      formatUpsertError(
        "REQ-1",
        "Invalid relationship: verified_by from req to scenario",
      ),
    ).toMatch(/verified_by/);
    expect(
      formatUpsertError(
        "REQ-1",
        "kb_contradiction(['title conflict'-'REQ-OLD']) (stage=logic)",
      ),
    ).toMatch(/Conflicts with REQ-OLD/);
    expect(
      formatUpsertError(
        "REQ-1",
        String.raw`kb_contradiction(["quoted \"claim\""-'REQ-Q'])`,
      ),
    ).toMatch(/Conflicts with REQ-Q/);
    expect(formatUpsertError("REQ-1", "kb_contradiction([no-pairs])")).toMatch(
      /Contradiction detected for entity REQ-1/,
    );
    expect(formatUpsertError("REQ-1", "rdf_transaction aborted")).toMatch(
      /Transaction failed/,
    );
    expect(formatUpsertError("REQ-1", "unexpected boom")).toContain(
      "unexpected boom",
    );
  });
});
