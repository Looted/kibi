// implements REQ-opencode-smart-enforcement-v1
import type { RepoPosture } from "./repo-posture.js";

/**
 * The effective enforcement mode after resolving config + posture + maintenance state.
 * - "advisory": plugin emits guidance, logs, reminders — never blocks
 * - "strict": plugin may escalate targeted checks, completion reminders, and
 *   structured logging. Hooks/checks remain the hard enforcement boundary
 *   regardless of mode.
 */
export type EffectiveMode = "advisory" | "strict";

/**
 * Inputs required to determine the effective smart-enforcement mode.
 */
export interface ModeInputs {
  /** Configured smart-enforcement mode. */
  mode: "advisory" | "strict";
  /** When true, strict mode only activates for authoritative root KB postures. */
  requireRootKbForStrict: boolean;
  /** Current repository posture from detectPosture(). */
  posture: RepoPosture;
  /** Whether the maintenance subsystem is in a degraded state. */
  maintenanceDegraded: boolean;
}

/** Postures considered authoritative for strict enforcement. */
const STRICT_ELIGIBLE_POSTURES: ReadonlySet<RepoPosture> = new Set([
  "root_active",
  "hybrid_root_plus_vendored",
]);

/**
 * Determine whether the current posture qualifies for strict enforcement
 * when `requireRootKbForStrict` is true.
 *
 * Only root_active and hybrid_root_plus_vendored are considered authoritative.
 */
export function isStrictEligible(inputs: ModeInputs): boolean { // implements REQ-opencode-smart-enforcement-v1
  if (inputs.maintenanceDegraded) return false;

  if (inputs.requireRootKbForStrict) {
    return STRICT_ELIGIBLE_POSTURES.has(inputs.posture);
  }

  // When requireRootKbForStrict is false, strict may apply to all postures
  // (but still subject to maintenance-degraded override in computeEffectiveMode).
  return true;
}

/**
 * Compute the effective smart-enforcement mode.
 *
 * Decision matrix:
 * - advisory config → always advisory
 * - strict config + requireRootKbForStrict=true → strict only for root_active
 *   and hybrid_root_plus_vendored postures
 * - strict config + requireRootKbForStrict=false → strict may apply to all
 *   postures (but hooks/checks remain hard gate regardless)
 * - maintenance-degraded → advisory regardless of config
 */
export function computeEffectiveMode(inputs: ModeInputs): EffectiveMode { // implements REQ-opencode-smart-enforcement-v1
  // Maintenance-degraded always forces advisory
  if (inputs.maintenanceDegraded) {
    return "advisory";
  }

  // Advisory config always produces advisory behavior
  if (inputs.mode === "advisory") {
    return "advisory";
  }

  // Strict config: check posture eligibility
  if (isStrictEligible(inputs)) {
    return "strict";
  }

  // Strict config but not eligible → fall back to advisory
  return "advisory";
}
