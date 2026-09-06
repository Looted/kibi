// implements REQ-mcp-semantic-advisor-preflight
import { describe, expect, test } from "bun:test";
import { detectPredicateRules } from "../../src/operations/semantic-advisor/predicate-rule.js";
import { POLICY_PREDICATE_RULES } from "../../src/operations/semantic-advisor/predicate-rules-policy.js";
import { PRODUCT_PREDICATE_RULES } from "../../src/operations/semantic-advisor/predicate-rules-product.js";

const payload = {
  type: "req",
  id: "REQ-LANE",
  properties: { title: "Lane", status: "open", source: "test.md" },
};

describe("policy and product predicate rule lanes", () => {
  test("every policy rule matches intended prose and invokes args", () => {
    const statements = [
      "Customer records must be stored in the eu region.",
      "Admin actions must be recorded in the audit log.",
      "The form must require explicit consent before sharing.",
      "Session tokens must be archived after 30 days.",
      "When two edits conflict, the latest write wins.",
      "If the primary store fails, the reader must fall back to the replica.",
      "The importer must process rows in batches of 100.",
      "Each scenario must reference an existing requirement.",
      "The lockfile must be deterministic at build time.",
      "Debug endpoints must be forbidden in production.",
      "The snapshot hash must be immutable after publish.",
      "Hook authors must use the typed schema.",
      "Legacy YAML may only be read as migration input by the importer.",
      "The temporary cache must be absent.",
      "No leftover cache.",
      "The editor must be non-blocking during offline conditions.",
    ];
    for (const statement of statements) {
      expect(detectPredicateRules(payload, statement, POLICY_PREDICATE_RULES)?.kind).toBe(
        "predicate",
      );
    }
    expect(
      detectPredicateRules(payload, "Authors must use bananas.", POLICY_PREDICATE_RULES),
    ).toBeNull();
    expect(detectPredicateRules(payload, "unrelated sentence.", POLICY_PREDICATE_RULES)).toBeNull();
  });

  test("every product rule matches intended prose including accepts gates", () => {
    const statements = [
      "The package must pass the release suite before distribution.",
      "Theme tokens must synchronize across ios and android.",
      "Audit rows must preserve actor identity when the user is deleted.",
      "Layout state must be persisted as a vendor-neutral contract.",
      "Database functions must have explicit search_path public.",
      "The resolver must use backends in priority order cache, origin.",
      "The tree must automatically refresh symbols without requiring manual page reload.",
      "Unassigned members must be denied write access.",
      "Public tools must be documented in the mcp reference.",
      "The daemon must warm up on first query.",
      "Sidebar icons must remain visually aligned with the editor chrome.",
      "Write governance must be enforced at the CLI boundary.",
      "On branch switch, the store must reconcile stale sockets and clear stale locks.",
    ];
    for (const statement of statements) {
      expect(detectPredicateRules(payload, statement, PRODUCT_PREDICATE_RULES)?.kind).toBe(
        "predicate",
      );
    }
    expect(
      detectPredicateRules(
        payload,
        "Layout state must be persisted as json blobs.",
        PRODUCT_PREDICATE_RULES,
      ),
    ).toBeNull();
    expect(
      detectPredicateRules(
        payload,
        "Widgets must have explicit foo bar.",
        PRODUCT_PREDICATE_RULES,
      ),
    ).toBeNull();
    expect(
      detectPredicateRules(
        payload,
        "Guests must be denied write access.",
        PRODUCT_PREDICATE_RULES,
      ),
    ).toBeNull();
    expect(detectPredicateRules(payload, "unrelated sentence.", PRODUCT_PREDICATE_RULES)).toBeNull();
  });
});
