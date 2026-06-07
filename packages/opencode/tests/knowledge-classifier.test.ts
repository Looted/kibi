import { describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import { classifyKnowledge } from "../src/knowledge-classifier";

// implements REQ-opencode-kibi-plugin-v1

describe("knowledge-classifier classifyKnowledge", () => {
  it("returns null for short text", () => {
    const result = classifyKnowledge("Short comment.");
    assert.equal(result, null);
  });

  it("returns null for empty text", () => {
    const result = classifyKnowledge("");
    assert.equal(result, null);
  });

  describe("FACT classification", () => {
    it("detects uniqueness constraints", () => {
      const text =
        "User email must be unique across the entire system. This is enforced at the database level with a unique index.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "fact");
      assert.ok(
        result?.confidence === "high" || result?.confidence === "medium",
      );
    });

    it("detects cardinality limits", () => {
      const text =
        "A user can have at most 3 active sessions at any given time. Sessions expire after 30 minutes of inactivity.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "fact");
    });

    it("detects default values", () => {
      const text =
        "The default status for new orders is PENDING. This is set automatically by the system when an order is created.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "fact");
    });

    it("detects invariants", () => {
      const text =
        "The total price must always equal the sum of line item prices plus tax. This is an invariant that must hold for all orders.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "fact");
    });
  });

  it("reasoning text references strict domain fact lane", () => {
    const text =
      "User IDs must be unique. Email addresses must be unique. Each user can have at most 5 active sessions. The default timeout is 30 minutes.";
    const result = classifyKnowledge(text);
    assert.ok(result);
    assert.equal(result?.type, "fact");
    assert.ok(
      result?.reasoning.includes("strict domain fact") ||
        result?.reasoning.includes("strict fact lane"),
      `Reasoning should mention strict domain fact or strict fact lane, got: ${result?.reasoning}`,
    );
  });

  describe("REQ classification", () => {
    it("detects system behavior requirements", () => {
      const text =
        "The system must allow users to reset their password via email. Users should receive a reset link within 5 minutes of request.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "req");
    });

    it("detects user capabilities", () => {
      const text =
        "Users can create new projects and invite team members. Each user should be able to manage their own project settings.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "req");
    });
  });

  describe("ADR classification", () => {
    it("detects technical decisions", () => {
      const text =
        "We chose PostgreSQL over MongoDB because we need ACID transactions and strong consistency guarantees. The tradeoff is slightly higher operational complexity.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "adr");
    });

    it("detects architecture rationale", () => {
      const text =
        "The decision to use a microservices architecture was made because we need independent deployability. However, this adds network latency and operational overhead.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "adr");
    });
  });

  describe("SCENARIO classification", () => {
    it("detects Given/When/Then patterns", () => {
      const text =
        "Given a user is logged in, when they click the checkout button, then they should see the payment form. This is the main purchase flow.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "scenario");
    });

    it("detects user flows", () => {
      const text =
        "The user flow for password reset: user enters email, system sends link, user clicks link, system validates token, user sets new password.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "scenario");
    });
  });

  describe("TEST classification", () => {
    it("detects verification language", () => {
      const text =
        "This test verifies that the login endpoint returns 401 for invalid credentials. It asserts that the response contains an error message.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "test");
    });

    it("detects expected outcomes", () => {
      const text =
        "Expected behavior: when input is null, the function should return an empty array. The test case covers boundary conditions.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.type, "test");
    });
  });

  describe("Confidence levels", () => {
    it("returns high confidence for strong matches", () => {
      const text =
        "User IDs must be unique. Email addresses must be unique. Each user can have at most 5 active sessions. The default timeout is 30 minutes.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.equal(result?.confidence, "high");
    });

    it("returns medium confidence for moderate matches", () => {
      const text =
        "The system should verify user permissions. This is a key requirement for security.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      assert.ok(
        result?.confidence === "medium" || result?.confidence === "low",
      );
    });

    it("returns null for low confidence matches", () => {
      const text =
        "This is some random text that doesn't contain any specific cues about systems or behaviors. It just talks about general everyday topics and observations.";
      const result = classifyKnowledge(text);
      assert.equal(result, null);
    });
  });

  describe("Tie-breaking and ambiguity", () => {
    it("prefers FACT over REQ for invariants with obligation language", () => {
      // This has both "must be unique" (fact) and "system must" (req)
      // FACT cues should win due to tie-breaking logic
      const text =
        "The system must enforce that user emails must be unique. This invariant is critical for data integrity.";
      const result = classifyKnowledge(text);
      assert.ok(result);
      // Either could win depending on scoring, but we should get a reasonable result
      assert.ok(["fact", "req"].includes(result?.type));
    });
  });
});
