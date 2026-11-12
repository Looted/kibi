import { describe, expect, test } from "bun:test";
import { scoreExactPredicates3 } from "../../../src/operations/modeling/predicate-score-3.js";
import type { PredicateSchemaCandidate } from "../../../src/operations/modeling/predicate-types.js";

const schema = (predicate_name: string) =>
  ({ predicate_name }) as PredicateSchemaCandidate;
const score = (name: string, text: string) =>
  scoreExactPredicates3(schema(name), text);

/**
 * A whole-sentence pattern accepts the sentence with any run of spaces, and
 * rejects it with another line before or after.
 */
function expectSentence(
  name: string,
  sentence: string,
  miss: number | null = 0,
  linePrefix = true,
) {
  expect(score(name, sentence)).toBe(0.98);
  expect(score(name, sentence.replaceAll(" ", "  "))).toBe(0.98);
  if (linePrefix) expect(score(name, `intro\n${sentence}`)).toBe(miss);
  expect(score(name, `${sentence}\nmore`)).toBe(miss);
}

describe("scoreExactPredicates3 sentence patterns", () => {
  test("visual_layout_rule", () => {
    for (const modal of ["must", "shall", "SHOULD"]) {
      expectSentence(
        "visual_layout_rule",
        `The toolbar ${modal} remain visually aligned with the canvas.`,
      );
    }
    expect(
      score("visual_layout_rule", "x must remain visually aligned with"),
    ).toBe(0);
    expect(
      score("visual_layout_rule", " must remain visually aligned with y"),
    ).toBe(0);
    expect(
      score("visual_layout_rule", "x must stay visually aligned with y"),
    ).toBe(0);
  });

  test("enforcement_location_rule", () => {
    for (const modal of ["must", "shall", "should"]) {
      expectSentence(
        "enforcement_location_rule",
        `Quotas ${modal} be enforced at the gateway`,
      );
    }
    expect(
      score("enforcement_location_rule", "Quotas must be enforced at"),
    ).toBe(0);
    expect(score("enforcement_location_rule", "must be enforced at x")).toBe(0);
  });

  test("reconciliation_rule", () => {
    for (const modal of ["must", "shall", "should"]) {
      expectSentence(
        "reconciliation_rule",
        `On reconnect, the client ${modal} reconcile the cache and clear stale entries.`,
      );
    }
    expect(
      score(
        "reconciliation_rule",
        "On reconnect,the client must reconcile x and clear stale y",
      ),
    ).toBe(0.98);
    expect(
      score(
        "reconciliation_rule",
        "When reconnecting, c must reconcile x and clear stale y",
      ),
    ).toBe(0);
    expect(
      score("reconciliation_rule", "On r, c must reconcile x and clear stale"),
    ).toBe(0);
    expect(
      score("reconciliation_rule", "On r c must reconcile x and clear stale y"),
    ).toBe(0);
  });

  test("throttle_policy_rule", () => {
    for (const modal of ["must", "shall", "should"]) {
      expectSentence(
        "throttle_policy_rule",
        `Retries ${modal} be throttled for five minutes`,
      );
    }
    expect(score("throttle_policy_rule", "Retries must be throttled for")).toBe(
      0,
    );
  });

  test("temporal_order falls through when it does not match", () => {
    expectSentence(
      "temporal_order",
      "The renderer initializes after the store is ready.",
      null,
    );
    expect(
      score("temporal_order", "Renderer initializes after store is ready"),
    ).toBe(0.98);
    expect(
      score("temporal_order", "Renderer initializes after store is ready.."),
    ).toBeNull();
    expect(
      score("temporal_order", "Renderer starts after store is ready"),
    ).toBeNull();
    expect(
      score("temporal_order", "initializes after store is ready"),
    ).toBeNull();
  });

  test("state_transition", () => {
    expectSentence(
      "state_transition",
      "When the user cancels, the draft_panel-x transitions from editing_1 to idle-2.",
    );
    expect(
      score("state_transition", "when saved,editor transition from a to b"),
    ).toBe(0.98);
    expect(
      score("state_transition", "When saved, Editor Transitions From Ab To Cd"),
    ).toBe(0.98);
    for (const text of [
      "When saved, editor transitions from a to",
      "When saved, editor transitions from 1a to b",
      "When saved, editor transitions from a to 1b",
      "When saved, 9editor transitions from a to b",
      "When saved, edit9r transitions from a to b",
      "When saved, editor transitions from a.b to c",
      "When saved, editor transitions from a to b c",
      "When saved editor transitions from a to b",
      "If saved, editor transitions from a to b",
    ]) {
      expect(score("state_transition", text)).toBe(0);
    }
  });

  test("permission_rule", () => {
    for (const sentence of [
      "Only admins may delete projects.",
      "billing_admin-users can export invoices",
      "Guests is allowed to read",
      "Guests are not permitted to write",
      "Guests are forbidden to write",
      "Guests are entitled to refunds",
      "Guests are able to read",
      "Guests must be able to read",
      "Guests shall not be able to write",
      "Guests should be able to read",
      "Guests has permission to read",
      "Guests have no permission to write",
      "Guests must not write",
      "Guests cannot write",
      "Guests can't write",
    ]) {
      // The subject may span lines, so only a trailing line is rejected.
      expectSentence("permission_rule", sentence, 0, false);
    }
    for (const text of [
      "Guests may",
      "9 guests may read",
      "Guests will read",
      "Guests are welcome to read",
      "Guests mayread",
    ]) {
      expect(score("permission_rule", text)).toBe(0);
    }
  });
});

describe("scoreExactPredicates3 fixed scores", () => {
  test("conditional_behavior always scores", () => {
    expect(score("conditional_behavior", "anything")).toBe(0.98);
  });

  test("commit_action reads commit and save wording", () => {
    for (const text of [
      "Changes auto-save every minute",
      "Changes autosave",
      "The editor must COMMIT edits",
      "Edits persist",
      "Pressing enter saves the form",
      "Click save",
    ]) {
      expect(score("commit_action", text)).toBe(0.98);
    }
    for (const text of [
      "Changes are committed later",
      "Closing without  save discards edits",
      "Drafts are saved  before closing, then save",
      "Nothing happens",
      "Saved before",
      "unsaved",
      "persisted",
    ]) {
      expect(score("commit_action", text)).toBe(0);
    }
    expect(score("commit_action", "Closing without saving, then save")).toBe(
      0.98,
    );
    expect(score("commit_action", "It was saved after, save it")).toBe(0.98);
  });

  test("other schemas and inherited names are not scored here", () => {
    for (const name of ["state", "constructor", "toString", "__proto__"]) {
      expect(score(name, "anything")).toBeNull();
    }
  });
});
