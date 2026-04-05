import { describe, expect, it } from "bun:test";
import { type RepoPosture, detectPosture } from "../src/repo-posture";
import { createTempRepoFromFixture } from "./test-fixture-helpers";

describe("repo posture classification", () => {
  const cases: Array<{ fixture: string; expected: RepoPosture }> = [
    { fixture: "root-active", expected: "root_active" },
    { fixture: "vendored-only", expected: "vendored_only" },
    {
      fixture: "hybrid-root-plus-vendored",
      expected: "hybrid_root_plus_vendored",
    },
    { fixture: "root-custom-paths", expected: "root_active" },
    { fixture: "root-uninitialized", expected: "root_uninitialized" },
    { fixture: "maintenance-degraded", expected: "root_active" },
  ];

  for (const { fixture, expected } of cases) {
    it(`classifies ${fixture} as ${expected}`, () => {
      const repo = createTempRepoFromFixture(fixture);
      try {
        const posture = detectPosture(repo.path);
        expect(posture.state).toBe(expected);
      } finally {
        repo.cleanup();
      }
    });
  }

  it("vendored-only does not produce bootstrap warning", () => {
    const repo = createTempRepoFromFixture("vendored-only");
    try {
      const posture = detectPosture(repo.path);
      expect(posture.state).toBe("vendored_only");
      expect(posture.needsBootstrap).toBe(false);
    } finally {
      repo.cleanup();
    }
  });

  it("maintenance-degraded fixture exposes maintenance overlay", () => {
    const repo = createTempRepoFromFixture("maintenance-degraded");
    try {
      const posture = detectPosture(repo.path);
      expect(posture.state).toBe("root_active");
      expect(posture.maintenanceDegraded).toBe(true);
    } finally {
      repo.cleanup();
    }
  });
});
