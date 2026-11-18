import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * The reason a firm, person-stated requirement records is quoted as the
 * person's, so kb_upsert refuses an agent's rewrite of it as it refuses a
 * statement rewrite, and the staged check flags a hand edit of it.
 */

let workspace: ConsumerWorkspace;

const REQUIREMENT = `---
id: REQ-client-retry
title: The client must retry at most 3 times
status: open
firmness: firm
origin:
  kind: human
  ref: "Piotr, 2026-11-17: retry at most three times, upstream rate limits"
  recorded_at: '2026-11-17T08:00:00.000Z'
rationale: Upstream rate limits
---
The client must retry at most 3 times.

## Context
Upstream rate limits cap how often the client may call again after a failure.
`;

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-firm-reason-");
  workspace.write(".kb/requirements/REQ-client-retry.md", REQUIREMENT);
  workspace.sync();
  workspace.git("add", "-A");
  workspace.git("commit", "-qm", "base");
}, 300_000);

afterAll(() => workspace?.cleanup());

describe("a firm requirement's recorded reason", () => {
  test("kb_upsert refuses an agent's rewrite of it, and accepts it with the person's new words", () => {
    const rewrite = {
      type: "req",
      id: "REQ-client-retry",
      properties: {
        title: "The client must retry at most 3 times",
        status: "open",
      },
      why: "Because the agent thinks three is a nice number and nobody objected to it",
    };
    const refused = workspace.kibi(["upsert"], { input: rewrite });
    const result = JSON.parse(
      refused.stdout.trim().split("\n")[0] as string,
    ) as {
      status: string;
      error?: { code: string; message: string };
    };
    expect(result.status).toBe("error");
    expect(result.error?.message).toContain(
      "REQ-client-retry is a firm decision, so kb_upsert does not change its reason in place.",
    );
    expect(workspace.read(".kb/requirements/REQ-client-retry.md")).toBe(
      REQUIREMENT,
    );

    const approved = workspace.kibi(["upsert"], {
      input: {
        ...rewrite,
        properties: {
          ...rewrite.properties,
          approval_ref:
            "Piotr, 2026-11-17 19:30: yes, the reason is that three is enough",
        },
      },
    });
    expect(approved.status, approved.stdout).toBe(0);
    expect(workspace.read(".kb/requirements/REQ-client-retry.md")).toContain(
      "rationale: Because the agent thinks three is a nice number",
    );
  }, 300_000);
});
