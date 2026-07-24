import { describe, expect, test } from "bun:test";
import {
  deterministicVariantLabel,
  normalizeCodexJsonl,
} from "../runtime/codex-events";

describe("Codex JSONL normalization", () => {
  test("Given mixed JSONL When normalized Then malformed lines are retained without dropping valid events", () => {
    // Given
    const transcript = [
      JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
      "{malformed",
      JSON.stringify({
        type: "turn.completed",
        usage: { input_tokens: 12, cached_input_tokens: 3, output_tokens: 4 },
      }),
    ].join("\n");

    // When
    const normalized = normalizeCodexJsonl(transcript, {
      hiddenMarkers: [],
      forbiddenRoots: [],
    });

    // Then
    expect(normalized.events.map(({ type }) => type)).toEqual([
      "thread.started",
      "malformed",
      "turn.completed",
    ]);
    expect(normalized.malformedLines).toEqual([2]);
    expect(normalized.usage).toEqual({
      inputTokens: 12,
      cachedInputTokens: 3,
      outputTokens: 4,
    });
  });

  test("Given secrets and hidden markers When normalized Then output is redacted and leakage is classified", () => {
    // Given
    const transcript = JSON.stringify({
      type: "item.completed",
      token: "credential-value",
      item: { type: "agent_message", text: "hidden-held-out-token" },
    });

    // When
    const normalized = normalizeCodexJsonl(transcript, {
      hiddenMarkers: ["hidden-held-out-token"],
      forbiddenRoots: [],
    });

    // Then
    expect(JSON.stringify(normalized.events)).not.toContain("credential-value");
    expect(JSON.stringify(normalized.events)).not.toContain(
      "hidden-held-out-token",
    );
    expect(normalized.violations).toContain("hidden_data_leakage");
  });

  test("Given direct KB access and a forbidden-root write When normalized Then both security violations are reported", () => {
    // Given
    const transcript = [
      JSON.stringify({
        type: "item.completed",
        item: { type: "command_execution", command: "cat .kb/usage.log" },
      }),
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "file_change",
          changes: [{ path: "safe.txt" }],
          command: "touch /private/scorer/PWNED",
        },
      }),
    ].join("\n");

    // When
    const normalized = normalizeCodexJsonl(transcript, {
      hiddenMarkers: [],
      forbiddenRoots: ["/private/scorer"],
    });

    // Then
    expect(normalized.violations).toEqual([
      "direct_kb_access",
      "forbidden_write",
    ]);
  });

  test("Given the same episode identity When labels are derived Then variant labels are stable and opaque", () => {
    // Given
    const runLockHash = "a".repeat(64);
    const episodeId = "00000000-0000-4000-8000-000000000001";

    // When
    const first = deterministicVariantLabel(runLockHash, episodeId, "skillopt");
    const second = deterministicVariantLabel(
      runLockHash,
      episodeId,
      "skillopt",
    );
    const baseline = deterministicVariantLabel(
      runLockHash,
      episodeId,
      "baseline",
    );

    // Then
    expect(first).toBe(second);
    expect(first).not.toBe(baseline);
    expect(first).toMatch(/^variant-[a-f0-9]{16}$/);
    expect(first).not.toContain("skillopt");
  });
});
