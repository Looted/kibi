import { describe, expect, test } from "bun:test";
import { inferLauncherArgs } from "../../../src/operations/modeling/predicate-inference-launcher.js";

describe("inferLauncherArgs", () => {
  test("returns the reviewed bindings for an exact launcher sentence", () => {
    const args = inferLauncherArgs(
      "dependency_resolution_policy",
      "The VS Code extension must resolve and execute the kibi CLI without downloading packages or using a global or plugin-local runtime.",
      "ignored",
    );
    expect(args).toStrictEqual([
      "the_vs_code_extension",
      "kibi_CLI",
      "consumer_local",
      "no_download",
    ]);
  });

  test("returns a fresh mutable copy each call", () => {
    const text =
      "Launcher must resolve and execute the runtime without downloading packages or using a global or plugin-local runtime.";
    const first = inferLauncherArgs("dependency_resolution_policy", text, "s");
    const second = inferLauncherArgs("dependency_resolution_policy", text, "s");
    expect(first).not.toBe(second);
    expect(first).toStrictEqual(second);
    expect(Object.isFrozen(first)).toBe(false);
  });

  test("returns null for prose outside the reviewed corpus", () => {
    expect(
      inferLauncherArgs(
        "dependency_resolution_policy",
        "The launcher should probably work offline.",
        "launcher",
      ),
    ).toBeNull();
  });
});
