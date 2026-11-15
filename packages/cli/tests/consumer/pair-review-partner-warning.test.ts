import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  adviseProse,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of a pair review that can never count: an agent records a
 * pair_reviews verdict on a requirement and names, in its `with` field, a
 * current requirement that shares no subject with it and has no relates_to
 * edge to it. kibi check never pairs the two, so the verdict settles
 * nothing; kibi upsert says so at write time.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const ACCOUNT_PROSE =
  "A client may call only while its account has remaining quota.";
const SLUG_PROSE =
  "The slugify function must join the words of a title with single hyphens.";

function unmodeledRequirement(
  ws: ConsumerWorkspace,
  id: string,
  title: string,
  prose: string,
  subject: string,
): void {
  const { contract, propositions } = adviseProse(ws, prose);
  const entries = propositions.map((proposition) => ({
    ...proposition,
    status: "ontology_gap",
    subjects: [subject],
  }));
  ws.write(
    `.kb/requirements/${id}.md`,
    doc(
      `
id: ${id}
title: ${title}
type: req
status: open
priority: should
origin:
  kind: agent
${semanticFrontMatter(prose, contract, entries)}`,
      prose,
    ),
  );
}

function review(withId: string, claimKey: string): Json {
  return {
    with: withId,
    verdict: "no_conflict",
    separated_by: "They govern different functions.",
    claims: [{ claim_key: claimKey }],
    origin: { kind: "human", ref: "product owner" },
  };
}

function pairReviewNotes(result: Json): string[] {
  expect(result).toMatchObject({ status: "success" });
  return ((result.data as Json).warnings as string[]).filter((warning) =>
    warning.startsWith("related-requirement-unmodeled: a pair review"),
  );
}

describe("pair review partners through the kibi CLI", () => {
  test("a review naming a requirement kibi check never pairs is reported on upsert", () => {
    const ws = createConsumerWorkspace("kibi-pair-review-partner-");
    workspace = ws;
    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    unmodeledRequirement(
      ws,
      "REQ-ACCOUNT-QUOTA",
      "Quota is shared by the account",
      ACCOUNT_PROSE,
      "client.call_quota",
    );
    unmodeledRequirement(
      ws,
      "REQ-QUOTA-CLIENT",
      "Each client has its own quota",
      "Each client must have its own remaining call quota.",
      "client.call_quota",
    );
    unmodeledRequirement(
      ws,
      "REQ-SLUG-HYPHENS",
      "Slugs use single hyphens",
      SLUG_PROSE,
      "text.slug",
    );
    ws.stage();
    ws.sync();
    const [claim] = adviseProse(ws, ACCOUNT_PROSE).propositions;
    const claimKey = String(claim?.claim_key);

    // The quota requirement shares the subject; the slug one shares nothing.
    const upsert = (relationships: Json[] = []) =>
      ws.json(["upsert"], {
        type: "req",
        id: "REQ-ACCOUNT-QUOTA",
        properties: {
          title: "Quota is shared by the account",
          status: "open",
          pair_reviews: [
            review("REQ-QUOTA-CLIENT", claimKey),
            review("REQ-SLUG-HYPHENS", claimKey),
          ],
        },
        relationships,
      });
    expect(pairReviewNotes(upsert())).toEqual([
      "related-requirement-unmodeled: a pair review on REQ-ACCOUNT-QUOTA names REQ-SLUG-HYPHENS, which shares no subject with REQ-ACCOUNT-QUOTA (on it, a narrower or a broader one) and has no relates_to edge to it, so kibi check never pairs the two and that review settles nothing. Check the id in its with field; if the requirements do interact, add a relates_to link between them (a verdict counts only while one links the pair), otherwise drop the review.",
    ]);

    // A relates_to edge pairs them.
    expect(
      pairReviewNotes(
        upsert([
          {
            type: "relates_to",
            from: "REQ-ACCOUNT-QUOTA",
            to: "REQ-SLUG-HYPHENS",
          },
        ]),
      ),
    ).toEqual([]);
  }, 240_000);
});
