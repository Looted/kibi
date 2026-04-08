// implements REQ-opencode-smart-enforcement-v1
import { describe, it, expect } from "bun:test";
import type { RepoPosture } from "../src/repo-posture";
import {
  type EffectiveMode,
  type ModeInputs,
  computeEffectiveMode,
  isStrictEligible,
} from "../src/smart-enforcement";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// isStrictEligible
// ---------------------------------------------------------------------------

describe("isStrictEligible", () => {
  // ---- maintenanceDegraded short-circuit --------------------------------

  describe("maintenanceDegraded=true short-circuits to false", () => {
    it("returns false when maintenanceDegraded=true, regardless of posture", () => {
      expect(
        isStrictEligible(
          makeInputs({
            maintenanceDegraded: true,
            requireRootKbForStrict: false,
            posture: "root_active",
          }),
        ),
      ).toBe(false);
    });

    it("returns false when maintenanceDegraded=true even with requireRootKbForStrict=false", () => {
      for (const posture of ALL_POSTURES) {
        expect(
          isStrictEligible(
            makeInputs({
              maintenanceDegraded: true,
              requireRootKbForStrict: false,
              posture,
            }),
          ),
        ).toBe(false);
      }
    });
  });

  // ---- requireRootKbForStrict=true gate ---------------------------------

  describe("requireRootKbForStrict=true gates to authoritative postures", () => {
    it("root_active is eligible", () => {
      expect(
        isStrictEligible(
          makeInputs({ requireRootKbForStrict: true, posture: "root_active" }),
        ),
      ).toBe(true);
    });

    it("hybrid_root_plus_vendored is eligible", () => {
      expect(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: true,
            posture: "hybrid_root_plus_vendored",
          }),
        ),
      ).toBe(true);
    });

    it("root_partial is not eligible", () => {
      expect(
        isStrictEligible(
          makeInputs({ requireRootKbForStrict: true, posture: "root_partial" }),
        ),
      ).toBe(false);
    });

    it("root_uninitialized is not eligible", () => {
      expect(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: true,
            posture: "root_uninitialized",
          }),
        ),
      ).toBe(false);
    });

    it("vendored_only is not eligible", () => {
      expect(
        isStrictEligible(
          makeInputs({
            requireRootKbForStrict: true,
            posture: "vendored_only",
          }),
        ),
      ).toBe(false);
    });
  });

  // ---- requireRootKbForStrict=false opens to all postures ----------------

  describe("requireRootKbForStrict=false makes all postures eligible", () => {
    for (const posture of ALL_POSTURES) {
      it(`${posture} → true`, () => {
        expect(
          isStrictEligible(
            makeInputs({ requireRootKbForStrict: false, posture }),
          ),
        ).toBe(true);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// computeEffectiveMode
// ---------------------------------------------------------------------------

describe("computeEffectiveMode", () => {
  // ---- maintenance-degraded override ------------------------------------

  describe("maintenanceDegraded=true always forces advisory", () => {
    it("strict + root_active + degraded → advisory", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "root_active",
            maintenanceDegraded: true,
          }),
        ),
      ).toBe("advisory");
    });

    it("strict + hybrid_root_plus_vendored + degraded → advisory", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "hybrid_root_plus_vendored",
            maintenanceDegraded: true,
          }),
        ),
      ).toBe("advisory");
    });

    it("strict + requireRootKbForStrict=false + root_active + degraded → advisory", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: false,
            posture: "root_active",
            maintenanceDegraded: true,
          }),
        ),
      ).toBe("advisory");
    });

    it("advisory + degraded → advisory (redundant but explicit)", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "advisory",
            maintenanceDegraded: true,
          }),
        ),
      ).toBe("advisory");
    });
  });

  // ---- advisory config always advisory ----------------------------------

  describe("advisory config always produces advisory", () => {
    for (const posture of ALL_POSTURES) {
      it(`advisory + ${posture} → advisory`, () => {
        expect(
          computeEffectiveMode(makeInputs({ mode: "advisory", posture })),
        ).toBe("advisory");
      });
    }
  });

  // ---- strict + requireRootKbForStrict=true -----------------------------

  describe("strict + requireRootKbForStrict=true gates to authoritative postures", () => {
    it("strict + requireRoot=true + root_active → strict", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "root_active",
          }),
        ),
      ).toBe("strict");
    });

    it("strict + requireRoot=true + hybrid_root_plus_vendored → strict", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "hybrid_root_plus_vendored",
          }),
        ),
      ).toBe("strict");
    });

    it("strict + requireRoot=true + root_partial → advisory (not eligible)", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "root_partial",
          }),
        ),
      ).toBe("advisory");
    });

    it("strict + requireRoot=true + root_uninitialized → advisory", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "root_uninitialized",
          }),
        ),
      ).toBe("advisory");
    });

    it("strict + requireRoot=true + vendored_only → advisory", () => {
      expect(
        computeEffectiveMode(
          makeInputs({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "vendored_only",
          }),
        ),
      ).toBe("advisory");
    });
  });

  // ---- strict + requireRootKbForStrict=false ----------------------------

  describe("strict + requireRootKbForStrict=false allows strict for all postures", () => {
    for (const posture of ALL_POSTURES) {
      it(`strict + requireRoot=false + ${posture} → strict`, () => {
        expect(
          computeEffectiveMode(
            makeInputs({
              mode: "strict",
              requireRootKbForStrict: false,
              posture,
            }),
          ),
        ).toBe("strict");
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Type-level contracts
// ---------------------------------------------------------------------------

describe("EffectiveMode type contract", () => {
  it("computeEffectiveMode always returns 'advisory' or 'strict'", () => {
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
            expect(result === "advisory" || result === "strict").toBe(true);
          }
        }
      }
    }
  });
});

describe("ModeInputs interface contract", () => {
  it("accepts all required fields", () => {
    const inputs: ModeInputs = {
      mode: "strict",
      requireRootKbForStrict: true,
      posture: "root_active",
      maintenanceDegraded: false,
    };
    expect(computeEffectiveMode(inputs)).toBe("strict");
  });
});
