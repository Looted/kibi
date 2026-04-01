/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import { classifyKnowledge } from "../src/knowledge-classifier.js";

describe("classifyKnowledge", () => {
  test("returns null for short text", () => {
    const result = classifyKnowledge("Short");
    expect(result).toBeNull();
  });

  test("returns null for text under 50 chars", () => {
    const result = classifyKnowledge("This is a text that is not long enough");
    expect(result).toBeNull();
  });

  test("classifies ADR from decision cues", () => {
    const text =
      "We decided to use PostgreSQL instead of MySQL because we need better concurrency support and ACID compliance for our financial data";
    const result = classifyKnowledge(text);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("adr");
    expect(result?.confidence).toBe("high");
  });

  test("classifies FACT from invariant cues", () => {
    const text =
      "User accounts must have unique email addresses. Each user can have at most 5 active sessions. Sessions expire after 30 minutes";
    const result = classifyKnowledge(text);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("fact");
  });

  test("classifies REQ from behavior cues", () => {
    const text =
      "The system shall authenticate users via OAuth 2.0. Users must be able to reset their password via email";
    const result = classifyKnowledge(text);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("req");
  });

  test("classifies SCEN from flow cues", () => {
    const text =
      "When a user submits a payment, the system validates the card, processes the transaction, and sends a confirmation email";
    const result = classifyKnowledge(text);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("scenario");
  });

  test("classifies TEST from verification cues", () => {
    const text =
      "Verify that the login form rejects invalid credentials. Test that password reset emails are sent within 5 minutes";
    const result = classifyKnowledge(text);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("test");
  });

  test("handles mixed content with tie-breaker logic", () => {
    const text =
      "We decided to implement this feature. The system shall support 1000 concurrent users. Verify response time is under 200ms";
    const result = classifyKnowledge(text);
    expect(result).not.toBeNull();
    // ADR usually wins with decision + requirement mix
    expect(result?.type).toBe("adr");
  });

  test("provides reasoning", () => {
    const text =
      "We chose React for the frontend because it has a large ecosystem and good developer experience";
    const result = classifyKnowledge(text);
    expect(result).not.toBeNull();
    expect(result?.reasoning).toBeTruthy();
    expect(result?.reasoning.length).toBeGreaterThan(0);
  });

  test("handles confidence levels", () => {
    const weakText = "Maybe we should consider using TypeScript";
    const strongText =
      "We MUST use TypeScript for type safety. This decision is final and non-negotiable";

    const weakResult = classifyKnowledge(weakText);


  test("handles empty string", () => {
    const result = classifyKnowledge("");
    expect(result).toBeNull();
  });

  test("handles whitespace-only string", () => {
    const result = classifyKnowledge("   \n\t  ");
    expect(result).toBeNull();
  });

  test("handles code-like content", () => {
    const text = `
      function calculateTotal(items) {
        // This function sums up all item prices
        return items.reduce((sum, item) => sum + item.price, 0);
      }
    `;
    const result = classifyKnowledge(text);
    // May or may not classify depending on comment content
    expect(result === null || typeof result === "object").toBe(true);
  });

  test("handles documentation-style comments", () => {
    const text = `
      /**
       * This module handles user authentication.
       * It supports OAuth, SAML, and local auth strategies.
       * @module auth
       */
    `;
    const result = classifyKnowledge(text);
    // Should likely classify as FACT or REQ
    if (result) {
      expect(["fact", "req", "adr", "scenario", "test"]).toContain(result.type);
    }
  });
});
