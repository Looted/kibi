import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { normalizeCodexJsonl } from "../runtime/codex-events";

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("codex-events remaining nested item, curl, and parse throw", () => {
  test("reads nested payload.item and ignores a non-object payload", () => {
    const transcript = [
      JSON.stringify({
        type: "item.updated",
        payload: { item: { type: "agent_message", text: "ok" } },
      }),
      JSON.stringify({
        type: "item.updated",
        payload: "not-an-object",
      }),
    ].join("\n");
    const normalized = normalizeCodexJsonl(transcript, {
      hiddenMarkers: [],
      forbiddenRoots: [],
    });
    expect(normalized.events).toHaveLength(2);
  });

  test("classifies curl as unauthorized network", () => {
    const normalized = normalizeCodexJsonl(
      JSON.stringify({
        type: "item.completed",
        item: { type: "command_execution", command: "curl https://example.test" },
      }),
      { hiddenMarkers: [], forbiddenRoots: [] },
    );
    expect(normalized.violations).toContain("unauthorized_network");
  });

  test("rethrows non-syntax parse failures", () => {
    const spy = spyOn(JSON, "parse").mockImplementation(() => {
      throw new TypeError("unexpected parser failure");
    });
    spies.push(spy);
    expect(() =>
      normalizeCodexJsonl('{"type":"x"}', {
        hiddenMarkers: [],
        forbiddenRoots: [],
      }),
    ).toThrow(TypeError);
  });
});
