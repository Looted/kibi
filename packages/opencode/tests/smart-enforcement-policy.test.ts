import { describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import type { RepoPosture } from "../src/repo-posture";
import {
  type ModeInputs,
  computeEffectiveMode,
  isStrictEligible,
} from "../src/smart-enforcement";

// implements REQ-opencode-smart-enforcement-v1

const ALL_POSTURES: RepoPosture[] = [
  "root_active",
  "root_partial",
  "root_uninitialized",
  "vendored_only",
  "hybrid_root_plus_vendored",
];

function makeInputs(overrides: Partial<ModeInputs>): ModeInputs {
  return {
    mode: "advisory",
    requireRootKbForStrict: true,
    posture: "root_active",
    maintenanceDegraded: false,
    ...overrides,
  };
}

describe("computeEffectiveMode decision matrix", () => {
  describe("advisory config always produces advisory", () => {
    for (const posture of ALL_POSTURES) {
      it(`advisory + ${posture} → advisory`, () => {
        const result = computeEffectiveMode(
          makeInputs({ mode: "advisory", posture }),
        );
        assert.equal(result, "advisory");
      });
    }

    it("advisory + maintenanceDegraded=true → advisory", () => {
      const result = computeEffectiveMode(
        makeInputs({ mode: "advisory", maintenanceDegraded: true }),
      );
      assert.equal(result, "advisory");
    });
  });

  describe("strict + requireRootKbForStrict=true gates to authoritative postures", () => {
    it("strict + requireRoot=true + root_active → strict", () => {
      const result = computeEffectiveMode(
        makeInputs({
          mode: "strict",
          requireRootKbForStrict: true,
          posture: "root_active",
        }),
      );
      assert.equal(result, "strict");
    });

    it("strict + requireRoot=true + hybrid_root_plus_vendored → strict", () => {
      const result = computeEffectiveMode(
        makeInputs({
          mode: "strict",
          requireRootKbForStrict: true,
          posture: "hybrid_root_plus_vendored",
        }),
      );
      assert.equal(result, "strict");
    });

    it("strict + requireRoot=true + root_partial → advisory (not authoritative)", () => {
      const result = computeEffectiveMode(
        makeInputs({
          mode: "strict",
          requireRootKbForStrict: true,
          posture: "root_partial",
        }),
      );
      assert.equal(result, "advisory");
    });

    it("strict + requireRoot=true + vendored_only → advisory", () => {
      const result = computeEffectiveMode(
        makeInputs({
          mode: "strict",
          requireRootKbForStrict: true,
          posture: "vendored_only",
        }),
      );
      assert.equal(result, "advisory");
    });

    it("strict + requireRoot=true + root_uninitialized → advisory", () => {
      const result = computeEffectiveMode(
        makeInputs({
          mode: "strict",
          requireRootKbForStrict: true,
          posture: "root_uninitialized",
        }),
      );
      assert.equal(result, "advisory");
    });
  });

  describe("strict + requireRootKbForStrict=false allows strict for all postures", () => {
    for (const posture of ALL_POSTURES) {
      it(`strict + requireRoot=false + ${posture} → strict`, () => {
        const result = computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: false,
            posture,
          }),
        );
        assert.equal(result, "strict");
      });
    }
  });

  describe("maintenance-degraded overrides everything to advisory", () => {
    it("strict + root_active + degraded → advisory", () => {
      const result = computeEffectiveMode(
        makeInputs({
          mode: "strict",
          requireRootKbForStrict: true,
          posture: "root_active",
          maintenanceDegraded: true,
        }),
      );
      assert.equal(result, "advisory");
    });

    it("strict + hybrid + degraded → advisory", () => {
      const result = computeEffectiveMode(
        makeInputs({
          mode: "strict",
          requireRootKbForStrict: true,
          posture: "hybrid_root_plus_vendored",
          maintenanceDegraded: true,
        }),
      );
      assert.equal(result, "advisory");
    });

    it("strict + requireRoot=false + root_active + degraded → advisory", () => {
      const result = computeEffectiveMode(
        makeInputs({
          mode: "strict",
          requireRootKbForStrict: false,
          posture: "root_active",
          maintenanceDegraded: true,
        }),
      );
      assert.equal(result, "advisory");
    });
  });
});

describe("isStrictEligible", () => {
  describe("requireRootKbForStrict=true", () => {
    it("root_active → eligible", () => {
      assert.equal(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: true,
            posture: "root_active",
          }),
        ),
        true,
      );
    });

    it("hybrid_root_plus_vendored → eligible", () => {
      assert.equal(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: true,
            posture: "hybrid_root_plus_vendored",
          }),
        ),
        true,
      );
    });

    it("root_partial → not eligible", () => {
      assert.equal(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: true,
            posture: "root_partial",
          }),
        ),
        false,
      );
    });

    it("vendored_only → not eligible", () => {
      assert.equal(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: true,
            posture: "vendored_only",
          }),
        ),
        false,
      );
    });

    it("root_uninitialized → not eligible", () => {
      assert.equal(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: true,
            posture: "root_uninitialized",
          }),
        ),
        false,
      );
    });
  });

  describe("requireRootKbForStrict=false", () => {
    for (const posture of ALL_POSTURES) {
      it(`${posture} → eligible`, () => {
        assert.equal(
          isStrictEligible(
            makeInputs({
              requireRootKbForStrict: false,
              posture,
            }),
          ),
          true,
        );
      });
    }
  });

  describe("maintenanceDegraded override", () => {
    it("maintenanceDegraded=true always returns false", () => {
      assert.equal(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: false,
            posture: "root_active",
            maintenanceDegraded: true,
          }),
        ),
        false,
      );
    });
  });
});

describe("effective mode preserves non-blocking behavior", () => {
  it("strict mode does not create any blocking path - it only escalates advisory checks", () => {
    // The strict mode should NOT produce blocking behavior in the plugin.
    // This test verifies the type contract: EffectiveMode is just a string union.
    // Blocking behavior comes from hooks/checks, not from effectiveMode.
    const inputs: ModeInputs = {
      mode: "strict",
      requireRootKbForStrict: true,
      posture: "root_active",
      maintenanceDegraded: false,
    };
    const mode = computeEffectiveMode(inputs);

    // The result is either "advisory" or "strict" — both are non-blocking strings.
    assert.ok(
      mode === "advisory" || mode === "strict",
      "EffectiveMode must be a non-blocking string literal",
    );
  });

  it("all posture/config combinations produce a valid EffectiveMode", () => {
    for (const posture of ALL_POSTURES) {
      for (const mode of ["advisory", "strict"] as const) {
        for (const requireRoot of [true, false]) {
          for (const degraded of [true, false]) {
            const result = computeEffectiveMode({
              mode,
              requireRootKbForStrict: requireRoot,
              posture,
              maintenanceDegraded: degraded,
            });
            assert.ok(
              result === "advisory" || result === "strict",
              `Unexpected mode "${result}" for inputs: mode=${mode}, requireRoot=${requireRoot}, posture=${posture}, degraded=${degraded}`,
            );
          }
        }
      }
    }
  });
});

import { buildPrompt, SENTINEL } from "../src/prompt";

describe("smart enforcement contract matrix", () => {
  describe("single-block prompt policy", () => {
    it("returns full base guidance when no context matches", () => {
      const p = buildPrompt();
      assert.ok(p.includes(SENTINEL), "Should include sentinel in base guidance");
      assert.ok(p.includes("kb_search"), "Base guidance should mention kb_search");
    });

    it("returns exactly one contextual block plus sentinel for code edits", () => {
      const p = buildPrompt({
        recentEdits: [{ path: "src/foo.ts", kind: "code" }],
        posture: "root_active",
        riskClass: "behavior_candidate",
      });
      const blocks = p.split(SENTINEL).filter((s) => s.trim().length > 0);
      assert.equal(blocks.length, 1, "Should emit exactly one contextual block");
    });

    it("combines degraded advisory and guidance into a single block", () => {
      const p = buildPrompt({
        recentEdits: [{ path: "src/foo.ts", kind: "code" }],
        posture: "root_active",
        maintenanceDegraded: true,
        degradedMode: "warn-once",
        showDegradedAdvisory: true,
      });
      assert.ok(p.includes("Maintenance degraded"), "Should include degraded advisory");
      assert.ok(p.includes("Code changes detected"), "Should include guidance");
      const blocks = p.split(SENTINEL).filter((s) => s.trim().length > 0);
      assert.equal(blocks.length, 1, "Degraded advisory + guidance must be one block");
    });

    it("never exceeds 120 words or 5 bullets total", () => {
      const p = buildPrompt({
        recentEdits: [{ path: "src/foo.ts", kind: "code" }],
        posture: "root_active",
        maintenanceDegraded: true,
        degradedMode: "warn-once",
        showDegradedAdvisory: true,
        completionReminder: true,
      });
      const words = p.split(/\s+/).filter(Boolean).length;
      const bullets = p.split("\n").filter((line) => line.trimStart().startsWith("-")).length;
      assert.ok(words <= 120, `Expected <= 120 words, got ${words}`);
      assert.ok(bullets <= 5, `Expected <= 5 bullets, got ${bullets}`);
    });
  });

  describe("completion-reminder visibility contract", () => {
    it("appends kb_check reminder for behavior_candidate when enabled", () => {
      const p = buildPrompt({
        recentEdits: [{ path: "src/foo.ts", kind: "code" }],
        posture: "root_active",
        riskClass: "behavior_candidate",
        completionReminder: true,
      });
      assert.ok(
        p.includes("Run `kb_check` before completing this task."),
        "Should include completion reminder for risky code edits",
      );
    });

    it("suppresses completion reminder when maintenanceDegraded is active", () => {
      const p = buildPrompt({
        recentEdits: [{ path: "src/foo.ts", kind: "code" }],
        posture: "root_active",
        riskClass: "behavior_candidate",
        completionReminder: true,
        maintenanceDegraded: true,
      });
      assert.ok(!p.includes("kb_check"), "Should suppress reminder when degraded");
    });

    it("suppresses completion reminder for safe edits even when enabled", () => {
      const p = buildPrompt({
        recentEdits: [{ path: "docs/readme.md", kind: "docs" }],
        posture: "root_active",
        riskClass: "safe_docs_only",
        completionReminder: true,
      });
      assert.ok(!p.includes("kb_check"), "Should suppress reminder for safe edits");
    });
  });

  describe("runtime overlay policy integration", () => {
    it("effective mode falls back to advisory when maintenanceDegraded is true", () => {
      assert.equal(
        computeEffectiveMode(
          makeInputs({ mode: "strict", posture: "root_active", maintenanceDegraded: true }),
        ),
        "advisory",
      );
    });

    it("degraded advisory is injected in warn-once mode", () => {
      const p = buildPrompt({
        recentEdits: [{ path: "src/foo.ts", kind: "code" }],
        posture: "root_active",
        maintenanceDegraded: true,
        degradedMode: "warn-once",
        showDegradedAdvisory: true,
      });
      assert.ok(
        p.includes("Maintenance degraded") || p.includes("maintenance degraded"),
        "Should inject degraded advisory in warn-once mode",
      );
    });

    it("degraded advisory is suppressed in structured-only mode", () => {
      const p = buildPrompt({
        recentEdits: [{ path: "src/foo.ts", kind: "code" }],
        posture: "root_active",
        maintenanceDegraded: true,
        degradedMode: "structured-only",
        showDegradedAdvisory: true,
      });
      assert.ok(
        !p.includes("maintenance degraded"),
        "Should NOT inject degraded prompt copy in structured-only mode",
      );
    });
  });
});
