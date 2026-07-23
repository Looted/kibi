import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveArtifactRoot } from "../runtime/artifact-root";

describe("SkillOpt artifact root", () => {
  test("falls back to the writable OS temp root when XDG runtime is unavailable", async () => {
    const previous = process.env.XDG_RUNTIME_DIR;
    process.env.XDG_RUNTIME_DIR = "/run/user/skillopt-missing";

    try {
      const root = await resolveArtifactRoot(undefined, {
        runtimeDir: "/run/user/skillopt-missing",
        tempRoot: tmpdir(),
      });
      expect(root).toBe(join(tmpdir(), "kibi-skillopt", "isolation-canary"));
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "XDG_RUNTIME_DIR");
      else process.env.XDG_RUNTIME_DIR = previous;
    }
  });

  test("preserves an explicit artifact root", async () => {
    const root = await resolveArtifactRoot("/var/lib/skillopt-artifacts");
    expect(root).toBe("/var/lib/skillopt-artifacts");
  });
});
