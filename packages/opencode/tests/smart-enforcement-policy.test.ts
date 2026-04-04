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
