import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { GuidanceCache } from "../src/guidance-cache.js";
import { buildPrompt } from "../src/prompt.js";
import * as links from "../src/source-linked-guidance.js";
import type { PromptContext } from "../src/prompt.js";

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  if (process.exitCode === 1) process.exitCode = 0;
});

const supportedCapability = {
  supported: true,
  pluginVersion: "test",
} as const;

describe("prompt remaining source-link catch and REQ comment guidance", () => {
  test("rethrows a non-Error from source-linked lookup", () => {
    const spy = spyOn(links, "getSourceLinkedRequirementIds").mockImplementation(
      () => {
        throw "not-an-error";
      },
    );
    spies.push(spy);
    const context: PromptContext = {
      recentEdits: [{ path: "src/a.ts", kind: "code" }],
      focusEdit: { path: "src/a.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      cache: new GuidanceCache(),
      workspaceRoot: "/tmp/kibi-prompt",
      branch: "main",
    };
    expect(() => buildPrompt(context, supportedCapability)).toThrow(
      "not-an-error",
    );
  });

  test("renders durable REQ comment guidance", () => {
    const context: PromptContext = {
      recentEdits: [{ path: "src/a.ts", kind: "code" }],
      focusEdit: { path: "src/a.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      recentCommentSuggestion: {
        suggestionType: "req",
        reason: "behavior comment",
      } as never,
      cache: new GuidanceCache(),
      workspaceRoot: "/tmp/kibi-prompt",
      branch: "main",
    };
    expect(buildPrompt(context, supportedCapability)).toContain(
      "Durable knowledge detected: REQ",
    );
  });
});
