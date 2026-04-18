import { describe, expect, test } from "bun:test";
import { resolveNpmFixture } from "../release-runner-fixture";

describe("resolveNpmFixture", () => {
  test("returns live mode when env is undefined", () => {
    const result = resolveNpmFixture(undefined);
    expect(result.mode).toBe("live");
  });

  test("returns fixture mode with empty set when env is empty string", () => {
    const result = resolveNpmFixture("");
    expect(result.mode).toBe("fixture");
    expect(result.published).toEqual(new Set<string>());
  });

  test("returns fixture mode with empty set when env is whitespace-only", () => {
    const result = resolveNpmFixture("  \t ");
    expect(result.mode).toBe("fixture");
    expect(result.published).toEqual(new Set<string>());
  });

  test("parses comma-separated entries into trimmed fixture set", () => {
    const result = resolveNpmFixture(" pkg-a@1.0.0 , pkg-b@2.0.0 ");
    expect(result.mode).toBe("fixture");
    expect(result.published).toEqual(
      new Set(["pkg-a@1.0.0", "pkg-b@2.0.0"]),
    );
  });

  test("ignores redundant commas and empty tokens", () => {
    const result = resolveNpmFixture(",,pkg-a@1.0.0,, ,pkg-b@2.0.0,,");
    expect(result.mode).toBe("fixture");
    expect(result.published).toEqual(
      new Set(["pkg-a@1.0.0", "pkg-b@2.0.0"]),
    );
  });

  test("preserves unknown package tokens without failing", () => {
    const result = resolveNpmFixture("unknown-pkg@9.9.9,weird@0.0.1");
    expect(result.mode).toBe("fixture");
    expect(result.published).toEqual(
      new Set(["unknown-pkg@9.9.9", "weird@0.0.1"]),
    );
  });

  test("single entry is parsed correctly", () => {
    const result = resolveNpmFixture("my-pkg@3.1.4");
    expect(result.mode).toBe("fixture");
    expect(result.published).toEqual(new Set(["my-pkg@3.1.4"]));
  });
});
