import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  type ConsumerWorkspace,
  type Json,
  KIBI_CLI,
  QUOTA_SUBJECT,
  adviseProse,
  checkViolations,
  createConsumerWorkspace,
  doc,
  quotaValueFact,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of related-requirement-unmodeled: an agent records a change
 * of behavior as a new requirement, runs the semantic advisor and leaves its
 * claims unmodeled, either as missing propositions linked with relates_to to
 * the modeled requirement they overlap, or as ontology_gap claims that name
 * the subject that requirement constrains. domain-contradictions compares
 * grounded facts only, so the check blocks the pair until the claims are
 * modeled or a checkable pair_reviews verdict settles it.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const PROSE =
  "The gateway must count calls per account rather than per client. A client may call only while its account has remaining quota.";

const ACCOUNT_CONTEXT = [
  "",
  "## Context",
  "",
  "Accounts with several clients asked for one shared quota so that moving load between clients does not change what they can call.",
].join("\n");

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

function seedQuota(ws: ConsumerWorkspace): void {
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
}

type Review = {
  verdict: string;
  claims: readonly string[];
  separatedBy?: string;
  origin: string;
};

function reviewYaml(review: Review): string {
  return [
    "pair_reviews:",
    "  - with: REQ-QUOTA-CALL",
    `    verdict: ${review.verdict}`,
    ...(review.separatedBy ? [`    separated_by: ${review.separatedBy}`] : []),
    `    claims: [${review.claims.join(", ")}]`,
    `    origin: ${review.origin}`,
  ].join("\n");
}

function unmodeled(
  ws: ConsumerWorkspace,
  status: "missing" | "ontology_gap",
): {
  contract: Record<string, unknown>;
  entries: ReturnType<typeof adviseProse>["propositions"];
} {
  const { contract, propositions } = adviseProse(ws, PROSE);
  const entries = propositions
    .filter((proposition) => proposition.role === "normative")
    .map((proposition) => ({
      ...proposition,
      status,
      ...(status === "ontology_gap" ? { subjects: ["client.call_quota"] } : {}),
    }));
  expect(entries.length).toBeGreaterThan(0);
  return { contract, entries };
}

function accountRequirement(
  ledger: ReturnType<typeof unmodeled>,
  extra: string,
): string {
  return doc(
    `
id: REQ-ACCOUNT-QUOTA
title: Quota is shared by the account
type: req
status: open
priority: must
${semanticFrontMatter(PROSE, ledger.contract, ledger.entries)}
${extra}
`,
    [PROSE, ACCOUNT_CONTEXT].join("\n"),
  );
}

function findings(ws: ConsumerWorkspace) {
  return checkViolations(ws, "related-requirement-unmodeled");
}

describe("related-requirement-unmodeled through the kibi CLI", () => {
  test("blocks unmodeled claims linked with relates_to until a checkable, approved verdict covers them", () => {
    const ws = createConsumerWorkspace("kibi-related-unmodeled-");
    workspace = ws;
    seedQuota(ws);
    const ledger = unmodeled(ws, "missing");
    const keys = ledger.entries.map((entry) => entry.claim_key);
    const link = "links:\n  - type: relates_to\n    target: REQ-QUOTA-CALL";
    const write = (extra: string) => {
      ws.write(
        ".kb/requirements/REQ-ACCOUNT-QUOTA.md",
        accountRequirement(ledger, `${extra}\n${link}`),
      );
      ws.sync();
    };

    write("");
    // The default run reports it as a blocking violation naming the pair.
    const defaultRun = ws.json(["check", "--format", "json"]);
    const violations = (
      defaultRun.structuredContent as {
        violations: Array<{
          rule: string;
          entityId: string;
          description: string;
        }>;
      }
    ).violations.filter(
      (violation) => violation.rule === "related-requirement-unmodeled",
    );
    expect(violations.map((violation) => violation.entityId)).toEqual([
      "REQ-ACCOUNT-QUOTA",
    ]);
    expect(violations[0]?.description).toContain(
      `${keys.length} unmodeled claim(s)`,
    );
    expect(violations[0]?.description).toContain(
      "1 requirement(s) it pairs with: REQ-QUOTA-CALL (through a relates_to edge)",
    );
    expect(violations[0]?.description).toContain(
      "no verdict records how they combine",
    );

    // A no_conflict verdict without what separates the two is not checkable.
    write(
      reviewYaml({
        verdict: "no_conflict",
        claims: keys,
        origin: "{kind: human}",
      }),
    );
    expect(findings(ws)[0]?.description).toContain("(separated_by)");

    // A verdict that leaves one claim out is stale.
    write(
      reviewYaml({
        verdict: "no_conflict",
        separatedBy:
          "the account quota applies only to accounts with several clients",
        claims: keys.slice(1),
        origin: "{kind: human}",
      }),
    );
    expect(findings(ws)[0]?.description).toContain(`does not cover ${keys[0]}`);

    // An agent's verdict on a must pair needs a person's approval.
    const settled = {
      verdict: "no_conflict",
      separatedBy:
        "the account quota applies only to accounts with several clients",
      claims: keys,
    };
    write(reviewYaml({ ...settled, origin: "{kind: agent}" }));
    const unapproved = findings(ws);
    expect(unapproved[0]?.description).toContain("names no approved_by");
    expect(unapproved[0]?.description).not.toContain("approved_by:");

    write(
      reviewYaml({
        ...settled,
        origin: "{kind: agent, approved_by: maintainer}",
      }),
    );
    expect(findings(ws)).toEqual([]);

    // A conflict verdict never settles the pair.
    write(
      reviewYaml({
        verdict: "conflict",
        claims: keys,
        origin: "{kind: human}",
      }),
    );
    expect(findings(ws)[0]?.description).toContain("records a conflict");

    // Superseding the old requirement resolves it.
    ws.write(
      ".kb/requirements/REQ-ACCOUNT-QUOTA.md",
      accountRequirement(
        ledger,
        "links:\n  - type: supersedes\n    target: REQ-QUOTA-CALL",
      ),
    );
    ws.sync();
    expect(findings(ws)).toEqual([]);
  }, 300_000);

  test("pairs ontology_gap claims with the requirement that constrains their subject, without a link", () => {
    const ws = createConsumerWorkspace("kibi-related-unmodeled-subject-");
    workspace = ws;
    seedQuota(ws);
    const ledger = unmodeled(ws, "ontology_gap");
    const keys = ledger.entries.map((entry) => entry.claim_key);

    ws.write(
      ".kb/requirements/REQ-ACCOUNT-QUOTA.md",
      accountRequirement(ledger, ""),
    );
    ws.sync();
    const shared = findings(ws);
    expect(shared.map((violation) => violation.entityId)).toEqual([
      "REQ-ACCOUNT-QUOTA",
    ]);
    expect(shared[0]?.description).toContain(
      "REQ-QUOTA-CALL (through shared subject client.call_quota)",
    );

    // A verdict counts only while a relates_to edge carries the pair.
    const review = reviewYaml({
      verdict: "no_conflict",
      separatedBy:
        "the account quota applies only to accounts with several clients",
      claims: keys,
      origin: "{kind: human}",
    });
    ws.write(
      ".kb/requirements/REQ-ACCOUNT-QUOTA.md",
      accountRequirement(ledger, review),
    );
    ws.sync();
    expect(findings(ws)[0]?.description).toContain(
      "counts only while a relates_to edge links the two",
    );

    ws.write(
      ".kb/requirements/REQ-ACCOUNT-QUOTA.md",
      accountRequirement(
        ledger,
        `${review}\nlinks:\n  - type: relates_to\n    target: REQ-QUOTA-CALL`,
      ),
    );
    ws.sync();
    expect(findings(ws)).toEqual([]);
  }, 300_000);

  test("many requirements on one subject give one finding each, quickly", () => {
    const ws = createConsumerWorkspace("kibi-related-unmodeled-volume-");
    workspace = ws;
    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    const sha = (text: string) =>
      createHash("sha256").update(text).digest("hex");
    const COUNT = 150;
    for (let index = 0; index < COUNT; index += 1) {
      const text = `The gateway number ${index} must answer call kind ${index} within its quota`;
      const key = `CLAIM-${sha(text.toLowerCase()).slice(0, 16).toUpperCase()}`;
      ws.write(
        `.kb/requirements/REQ-VOLUME-${index}.md`,
        doc(
          `
id: REQ-VOLUME-${index}
title: Generated quota requirement ${index}
type: req
status: open
priority: should
semantic_text: ${text}.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ${sha(`${text}.`)}
semantic_inventory:
  - claim_key: ${key}
    claim_text: ${text}
    role: normative
    status: ontology_gap
    span: {start: 0, end: ${text.length}}
    subjects: [client.call_quota]
logic_claims: [${key}]
`,
          `${text}.\n\n## Context\n\nThe maintainers set this limit after an outage of the gateway last year and recorded it here for call kind ${index}.`,
        ),
      );
    }
    ws.sync();
    const started = Date.now();
    const run = spawnSync(
      "node",
      [
        KIBI_CLI,
        "check",
        "--format",
        "json",
        "--rules",
        "related-requirement-unmodeled",
      ],
      { cwd: ws.root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    );
    const elapsed = Date.now() - started;
    const findings = (
      (JSON.parse(run.stdout) as { structuredContent: Json })
        .structuredContent as {
        violations: Array<{ entityId: string; description: string }>;
      }
    ).violations;
    // One finding per requirement, not one per ordered pair (22,350).
    expect(findings).toHaveLength(COUNT);
    expect(findings[0]?.description).toContain(
      "nothing compares with 149 requirement(s) it pairs with",
    );
    expect(findings[0]?.description).toContain("(+141 more)");
    expect(run.stdout.length).toBeLessThan(5_000_000);
    expect(elapsed).toBeLessThan(90_000);
  }, 300_000);
});
