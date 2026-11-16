import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
} from "./workspace.js";

let ws: ConsumerWorkspace | undefined;
afterEach(() => {
  ws?.cleanup();
  ws = undefined;
});

const STATEMENT = "API keys must expire ninety days after they are created.";
const SOURCE = `export function expireKey(createdAt: number, now: number): boolean {
  return now - createdAt > 90 * 86_400_000;
}
`;

function firmWorkspace(): ConsumerWorkspace {
  const workspace = createConsumerWorkspace("kibi-firm-edit-review-");
  ws = workspace;
  workspace.write("src/keys.ts", SOURCE);
  workspace.write(
    ".kb/requirements/REQ-key-expiry.md",
    `---\nid: REQ-key-expiry\ntitle: API keys expire\nstatus: open\nsemantic_text: ${STATEMENT}\n---\n\n${STATEMENT}\n`,
  );
  workspace.write(
    ".kb/symbols.yaml",
    [
      "symbols:",
      "  - id: SYM-expire-key",
      "    title: expireKey",
      "    sourceFile: src/keys.ts",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-key-expiry",
      "",
    ].join("\n"),
  );
  workspace.git("add", "-A");
  workspace.git("commit", "-q", "-m", "base");
  return workspace;
}

function firmFindings(workspace: ConsumerWorkspace): Json[] {
  const run = workspace.kibi(["check", "--staged", "--format", "json"]);
  const result = JSON.parse(run.stdout) as {
    structuredContent: { qualityDiagnostics?: Json[] };
  };
  return (result.structuredContent.qualityDiagnostics ?? []).filter((entry) =>
    String(entry.id).startsWith("firm_edit_"),
  );
}

function review(workspace: ConsumerWorkspace, verdict: "keeps" | "changes") {
  return workspace.json(["review-firm-edit"], {
    reviews: [
      {
        requirementId: "REQ-key-expiry",
        sourceFile: "src/keys.ts",
        symbol: "expireKey",
        verdict,
        note: "The constant is written another way; still ninety days.",
      },
    ],
  });
}

describe("firm-edit receipts through the real CLI", () => {
  test("a staged edit of firm code is blocked until a current keeps receipt exists", () => {
    const workspace = firmWorkspace();
    workspace.write(
      "src/keys.ts",
      SOURCE.replace("90 * 86_400_000", "90 * 24 * 3_600_000"),
    );
    workspace.git("add", "src/keys.ts");
    const [unreviewed, ...more] = firmFindings(workspace);
    expect(more).toEqual([]);
    expect(unreviewed).toMatchObject({
      id: "firm_edit_unreviewed",
      blocking: true,
      entityId: "REQ-key-expiry",
    });
    expect(String(unreviewed?.message)).toContain("expireKey in src/keys.ts");

    const recorded = review(workspace, "keeps");
    expect(recorded.status, JSON.stringify(recorded)).toBe("success");
    const receiptPath =
      ".kb/firm-edit-reviews/REQ-key-expiry/src__keys.ts--expireKey.json";
    expect(JSON.parse(workspace.read(receiptPath)).verdict).toBe("keeps");
    // The receipt counts once it is staged with the change.
    expect(firmFindings(workspace)).toHaveLength(1);
    workspace.git("add", receiptPath);
    expect(firmFindings(workspace)).toEqual([]);

    // Editing the code again makes the receipt stale.
    workspace.write("src/keys.ts", SOURCE.replace("90", "91"));
    workspace.git("add", "src/keys.ts");
    expect(String(firmFindings(workspace)[0]?.message)).toContain(
      "the code changed after the review",
    );

    // A changes verdict keeps the change blocked and says why.
    review(workspace, "changes");
    workspace.git("add", receiptPath);
    expect(firmFindings(workspace)[0]?.id).toBe("firm_edit_breaks_rule");

    const signoff = workspace.text(["signoff", "--staged"]);
    expect(signoff).toContain(
      "expireKey in src/keys.ts: the agent judged that the change changes the rule",
    );
    expect(signoff).toContain("judged by the agent, not approved by you");
  }, 120_000);

  test("refuses a review of a requirement that is not firm", () => {
    const workspace = firmWorkspace();
    workspace.write(
      ".kb/requirements/REQ-key-expiry.md",
      workspace
        .read(".kb/requirements/REQ-key-expiry.md")
        .replace("status: open\n", "status: open\nfirmness: default\n"),
    );
    const refused = review(workspace, "keeps");
    expect(refused.status).toBe("error");
    expect(JSON.stringify(refused.error)).toContain(
      "is not a current firm requirement",
    );
  }, 120_000);
});
