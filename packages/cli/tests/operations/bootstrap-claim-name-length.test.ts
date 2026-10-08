// implements REQ-bootstrap-claim-name-length
import { describe, expect, test } from "bun:test";
import { buildIntentClaimCandidates } from "../../src/operations/bootstrap/intent-claims.js";
import { markdownCandidates } from "../../src/operations/bootstrap/markdown-candidates.js";
import { normalizeBootstrapContext } from "../../src/operations/bootstrap/presentation.js";
import {
  MAX_ASPECT_CHARS,
  MAX_ASPECT_WORDS,
  SubjectKeyRegistry,
  resolveBootstrapSubjectKey,
  shortenSubjectAspect,
} from "../../src/operations/bootstrap/requirement-claims.js";
import { isConventionalSubjectKey } from "../../src/utils/strict-modeling.js";

type Claim = Readonly<{
  reference: string;
  statement: string;
  component?: string;
}>;

function plan(claims: readonly Claim[], registry = new SubjectKeyRegistry()) {
  return buildIntentClaimCandidates(
    normalizeBootstrapContext({
      knowledgeSources: [
        {
          id: "spec",
          title: "Product spec",
          locator: "docs/spec.md",
          kind: "specification",
          authority: "authoritative",
        },
      ],
      intentClaims: claims.map((claim) => ({
        sourceId: "spec",
        excerpt: claim.statement,
        ...claim,
      })),
    } as never),
    new Set(),
    0.8,
    registry,
  );
}

function subjectKeys(result: ReturnType<typeof plan>): string[] {
  return result.candidates.map((candidate) => {
    const subject = candidate.applyPlan.find(
      (step) =>
        (step.properties as Record<string, unknown>).fact_kind === "subject",
    );
    return String((subject?.properties as Record<string, unknown>).subject_key);
  });
}

function aspectOf(key: string): string {
  return key.split(".").slice(1).join(".");
}

const INBOX =
  "Support inbox must update in real time when a new ticket is assigned to the agent without a page refresh.";
const TICKET =
  "The ticket must be visible to the selected agent as something they can accept or decline.";

describe("bootstrap subject key aspects stay short noun phrases", () => {
  test("whole-sentence aspects are shortened to at most four words and forty characters", () => {
    const cases = [
      [
        "update_in_real_time_when_a_new_ticket_is_assigned_to_the_agent_without_a_page_refresh",
        "update_in_real_time",
      ],
      [
        "be_visible_to_the_selected_agent_as_something_they_can_accept_or_decline",
        "visible_selected_agent",
      ],
      ["workflow_states_and_review_content_states", "workflow_states"],
      ["discarding_a_draft_while_finishing_a_review", "discarding_a_draft"],
      [
        "automatically_displayed_existing_comment_thread",
        "displayed_existing_comment_thread",
      ],
      ["opening_a_non_existent_support_ticket", "opening_support_ticket"],
      [
        "opening_a_missing_or_archived_support_ticket_record",
        "opening_a_missing",
      ],
    ] as const;
    for (const [aspect, expected] of cases) {
      const short = shortenSubjectAspect(aspect);
      expect(short).toBe(expected);
      expect(short.split("_").length).toBeLessThanOrEqual(MAX_ASPECT_WORDS);
      expect(short.length).toBeLessThanOrEqual(MAX_ASPECT_CHARS);
    }
  });

  test("a short aspect is kept as derived, with no shortening reported", () => {
    expect(
      resolveBootstrapSubjectKey(
        "The recorder",
        "start a new take",
        "recorder",
      ),
    ).toEqual({ ok: true, subjectKey: "recorder.start_a_new_take" });
  });

  test("the plan uses the shortened key and reports the original beside it", () => {
    const result = plan([
      { reference: "INBOX-1", statement: INBOX, component: "support inbox" },
      { reference: "TICKET-1", statement: TICKET, component: "ticket" },
    ]);
    expect(subjectKeys(result)).toEqual([
      "support_inbox.update_in_real_time",
      "ticket.visible_selected_agent",
    ]);
    for (const key of subjectKeys(result)) {
      expect(isConventionalSubjectKey(key)).toBe(true);
      expect(aspectOf(key).length).toBeLessThanOrEqual(MAX_ASPECT_CHARS);
    }
    const shortened = result.diagnostics.filter((line) =>
      line.startsWith("subject-key-shortened:"),
    );
    expect(shortened).toHaveLength(2);
    expect(shortened[0]).toContain("spec:INBOX-1");
    expect(shortened[0]).toContain(
      "support_inbox.update_in_real_time_when_a_new_ticket_is_assigned_to_the_agent_without_a_page_refresh",
    );
    expect(shortened[0]).toContain("uses support_inbox.update_in_real_time");
  });

  test("different subjects that shorten to one key get a third segment instead of colliding", () => {
    const result = plan([
      {
        reference: "ED-1",
        statement: "Editor must discard a draft while finishing a review.",
        component: "editor",
      },
      {
        reference: "ED-2",
        statement: "Editor must discard a draft while leaving the page.",
        component: "editor",
      },
    ]);
    expect(subjectKeys(result)).toEqual([
      "editor.discard_a_draft",
      "editor.discard_a_draft.leaving",
    ]);
    const disambiguated = result.diagnostics.filter((line) =>
      line.startsWith("subject-key-disambiguated:"),
    );
    expect(disambiguated).toHaveLength(1);
    expect(disambiguated[0]).toContain("spec:ED-2");
    expect(disambiguated[0]).toContain("editor.discard_a_draft.leaving");
  });

  test("claims about the same subject keep sharing one key", () => {
    const registry = new SubjectKeyRegistry();
    const first = registry.assign({
      subjectKey: "editor.discard_a_draft",
      shortenedFrom: "editor.discard_a_draft_while_finishing_a_review",
    });
    const again = registry.assign({
      subjectKey: "editor.discard_a_draft",
      shortenedFrom: "editor.discard_a_draft_while_finishing_a_review",
    });
    expect(first).toEqual({ subjectKey: "editor.discard_a_draft" });
    expect(again).toEqual({ subjectKey: "editor.discard_a_draft" });
    // Without any distinct word left, the third segment is a stable digest.
    const digest = registry.assign({ subjectKey: "editor.discard_a_draft" });
    expect(digest.subjectKey).toMatch(
      /^editor\.discard_a_draft\.k[0-9a-f]{6}$/,
    );
    expect(
      new SubjectKeyRegistry().assign({
        subjectKey: "editor.discard_a_draft",
        shortenedFrom: "editor.discard_a_draft_while_finishing_a_review",
      }),
    ).toEqual(first);
  });

  test("planning is deterministic", () => {
    const claims = [
      { reference: "INBOX-1", statement: INBOX, component: "support inbox" },
      {
        reference: "ED-1",
        statement: "Editor must discard a draft while finishing a review.",
        component: "editor",
      },
      {
        reference: "ED-2",
        statement: "Editor must discard a draft while leaving the page.",
        component: "editor",
      },
    ];
    const first = plan(claims);
    const second = plan(claims);
    expect(subjectKeys(second)).toEqual(subjectKeys(first));
    expect(second.diagnostics).toEqual(first.diagnostics);
  });

  test("repository markdown claims report shortened keys as plan diagnostics", () => {
    const built = markdownCandidates(
      {
        provider: "markdown",
        kind: "generic_markdown",
        label: "docs/inbox.md",
        relativePath: "docs/inbox.md",
        content: `# Requirements\n\n- ${INBOX.replace("Support inbox", "Inbox")}\n`,
        data: {},
      } as never,
      new Set(),
      0.5,
      new SubjectKeyRegistry(),
    );
    const keys = built.candidates.flatMap((candidate) =>
      candidate.applyPlan
        .map((step) => (step.properties as Record<string, unknown>).subject_key)
        .filter((key): key is string => typeof key === "string"),
    );
    expect(new Set(keys)).toEqual(new Set(["inbox.update_in_real_time"]));
    expect(
      built.diagnostics.some(
        (line) =>
          line.startsWith("subject-key-shortened:") &&
          line.includes("docs/inbox.md#L3"),
      ),
    ).toBe(true);
  });
});
