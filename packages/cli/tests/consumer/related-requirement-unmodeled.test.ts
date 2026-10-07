// implements REQ-check-related-requirement-unmodeled
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  QUOTA_SUBJECT,
  adviseProse,
  checkViolations,
  createConsumerWorkspace,
  doc,
  quotaValueFact,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of the gap reported in issue 364: an agent records a change
 * of behavior as a new requirement, runs the semantic advisor, leaves every
 * assertive proposition unmodeled and links the new requirement to the
 * modeled one it overlaps with. domain-contradictions compares grounded facts
 * only, so without a dedicated rule `kibi check` stays clean.
 */

const UNRESOLVED_STATUSES = new Set([
  "ambiguous",
  "ontology_gap",
  "nonlogical",
]);

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

function modeledQuotaRequirement(): string {
  return doc(
    `
id: REQ-QUOTA-CALL
title: A client may call only with remaining quota
type: req
status: open
priority: must
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
  - type: requires_property
    target: FACT-QUOTA-POSITIVE
`,
    [
      "A client may call only with remaining quota.",
      "",
      "## Context",
      "",
      "Quota is charged per client so one noisy client cannot exhaust the shared capacity of the gateway for everyone else.",
    ].join("\n"),
  );
}

describe("related-requirement-unmodeled through the kibi CLI", () => {
  test("blocks a requirement whose unmodeled claims relate to a modeled requirement until they are modeled or it supersedes", () => {
    const ws = createConsumerWorkspace("kibi-related-unmodeled-");
    workspace = ws;

    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    ws.write(
      ".kb/facts/FACT-QUOTA-POSITIVE.md",
      quotaValueFact(
        "FACT-QUOTA-POSITIVE",
        "Remaining quota above zero",
        "gt",
        0,
      ),
    );
    ws.write(".kb/requirements/REQ-QUOTA-CALL.md", modeledQuotaRequirement());

    // The new requirement describes a different behavior for the same area.
    // Its ledger comes from the advisor, as a kb_upsert author's would, but
    // every assertive proposition is left as `missing`.
    const prose =
      "Calls are counted per account rather than per client. A client may call while its account has remaining quota.";
    const { contract, propositions } = adviseProse(ws, prose);
    const unresolved = propositions.map((proposition) => ({
      ...proposition,
      status: UNRESOLVED_STATUSES.has(proposition.status)
        ? proposition.status
        : "missing",
    }));
    const missingCount = unresolved.filter(
      (entry) => entry.status === "missing",
    ).length;
    expect(missingCount).toBeGreaterThan(0);

    const accountRequirement = (links: string) =>
      doc(
        `
id: REQ-ACCOUNT-QUOTA
title: Quota is shared by the account
type: req
status: open
priority: must
${semanticFrontMatter(prose, contract, unresolved)}
links:
${links}
`,
        [
          prose,
          "",
          "## Context",
          "",
          "Accounts with several clients asked for one shared quota so that moving load between clients does not change what they can call.",
        ].join("\n"),
      );

    ws.write(
      ".kb/requirements/REQ-ACCOUNT-QUOTA.md",
      accountRequirement("  - type: relates_to\n    target: REQ-QUOTA-CALL"),
    );
    ws.sync();

    // The default run reports it as a blocking violation that names the
    // modeled neighbour and what it models.
    const defaultRun = ws.json(["check", "--format", "json"]);
    const violations = (
      defaultRun.structuredContent as {
        violations: Array<{
          rule: string;
          entityId: string;
          description: string;
        }>;
      }
    ).violations;
    const finding = violations.filter(
      (violation) => violation.rule === "related-requirement-unmodeled",
    );
    expect(finding.map((violation) => violation.entityId)).toEqual([
      "REQ-ACCOUNT-QUOTA",
    ]);
    expect(finding[0]?.description).toContain(`${missingCount} proposition(s)`);
    expect(finding[0]?.description).toContain("REQ-QUOTA-CALL");
    expect(finding[0]?.description).toContain("client.call_quota.remaining");
    expect(
      checkViolations(ws, "related-requirement-unmodeled").map(
        (violation) => violation.entityId,
      ),
    ).toEqual(["REQ-ACCOUNT-QUOTA"]);

    // Recording that the new requirement supersedes the old one resolves it:
    // the superseded requirement is no longer current policy.
    ws.write(
      ".kb/requirements/REQ-ACCOUNT-QUOTA.md",
      accountRequirement("  - type: supersedes\n    target: REQ-QUOTA-CALL"),
    );
    ws.sync();
    expect(checkViolations(ws, "related-requirement-unmodeled")).toEqual([]);
  });
});
