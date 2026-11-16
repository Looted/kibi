import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  createConsumerWorkspace,
  doc,
  quotaValueFact,
} from "./workspace.js";

/**
 * Consumer view of restated twins: two requirements state one quantity in
 * their own words, so each grounds its own fact on the one tuple. kibi check
 * reports the twins as one claim minted twice until the second requirement
 * restates the first.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

function requirement(id: string, statement: string, fact: string): string {
  return doc(
    `
id: ${id}
title: ${statement}
type: req
status: open
priority: should
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
  - type: requires_property
    target: ${fact}
`,
    statement,
  );
}

function identityFindings(ws: ConsumerWorkspace): unknown[] {
  const result = ws.json(["check"], { rules: ["subject-key-identity"] });
  const data = result.data as Json;
  return [
    ...((data.violations as unknown[]) ?? []),
    ...((data.qualityDiagnostics as unknown[]) ?? []),
  ].filter((finding) =>
    JSON.stringify(finding).includes("subject-key-identity"),
  );
}

describe("restated twin facts through the kibi CLI", () => {
  test("twin facts are one claim minted twice until one requirement restates the other", () => {
    const ws = createConsumerWorkspace("kibi-restated-twins-");
    workspace = ws;
    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    ws.write(
      ".kb/facts/FACT-QUOTA-LIMIT.md",
      quotaValueFact("FACT-QUOTA-LIMIT", "Remaining quota above zero", "gt", 0),
    );
    ws.write(
      ".kb/facts/FACT-QUOTA-CALL.md",
      quotaValueFact("FACT-QUOTA-CALL", "A call needs quota left", "gt", 0),
    );
    ws.write(
      ".kb/requirements/REQ-QUOTA-LIMIT.md",
      requirement(
        "REQ-QUOTA-LIMIT",
        "Remaining call quota must stay above zero.",
        "FACT-QUOTA-LIMIT",
      ),
    );
    ws.write(
      ".kb/requirements/REQ-QUOTA-CALL.md",
      requirement(
        "REQ-QUOTA-CALL",
        "A client may call only while it has call quota left.",
        "FACT-QUOTA-CALL",
      ),
    );
    ws.sync();
    const before = identityFindings(ws);
    expect(JSON.stringify(before)).toContain(
      "FACT-QUOTA-CALL, FACT-QUOTA-LIMIT",
    );

    ws.write(
      ".kb/requirements/REQ-QUOTA-CALL.md",
      requirement(
        "REQ-QUOTA-CALL",
        "A client may call only while it has call quota left.",
        "FACT-QUOTA-CALL",
      ).replace(
        "  - type: requires_property",
        "  - type: restates\n    target: REQ-QUOTA-LIMIT\n  - type: requires_property",
      ),
    );
    ws.sync();
    expect(identityFindings(ws)).toEqual([]);
  }, 300_000);
});
