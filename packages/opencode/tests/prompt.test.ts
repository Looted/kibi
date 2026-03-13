import { strict as assert } from "node:assert";
import { SENTINEL, buildPrompt, injectPrompt } from "../src/prompt";

describe("prompt", () => {
  test("buildPrompt returns guidance with sentinel", () => {
    const p = buildPrompt();
    assert.ok(p.includes(SENTINEL));
  });

  test("injectPrompt adds guidance when not present", () => {
    const result = injectPrompt("hello", {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });
    assert.ok(result.includes(SENTINEL));
  });

  test("injectPrompt skips when sentinel present", () => {
    const withSentinel = "hello\n\n" + SENTINEL;
    const result = injectPrompt(withSentinel, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });
    assert.equal(result, withSentinel);
  });

  test("injectPrompt skips when prompt disabled", () => {
    const result = injectPrompt("hello", {
      enabled: true,
      prompt: { enabled: false, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });
    assert.equal(result, "hello");
  });
});
