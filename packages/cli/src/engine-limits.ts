/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
 * Per-request bounds for read-only engine work.
 *
 * The engine serves every client from one serialized SWI-Prolog queue, and a
 * goal already running inside SWI cannot be cancelled from outside. A read
 * that carries limits runs under call_with_time_limit/2 and
 * call_with_inference_limit/3, so a runaway read ends inside Prolog and frees
 * the queue. Hitting a limit is reported explicitly (limitExceeded) and is
 * never presented as an empty or partial answer.
 */

/** Envelope error code for a read stopped at its limit. */
// implements REQ-core-engine-read-limits
export const QUERY_LIMIT_EXCEEDED_CODE = "QUERY_LIMIT_EXCEEDED";

/** Environment opt-in for read limits on every engine client. */
// implements REQ-core-engine-read-limits
export const ENGINE_READ_TIME_LIMIT_ENV = "KIBI_ENGINE_READ_TIME_LIMIT_MS";
// implements REQ-core-engine-read-limits
export const ENGINE_READ_INFERENCE_LIMIT_ENV =
  "KIBI_ENGINE_READ_INFERENCE_LIMIT";

/**
 * Upper bound for a requested time limit. The daemon's SWI process kills a
 * query at 120 s and recycles the session; a bounded read must end first.
 */
// implements REQ-core-engine-read-limits
export const ENGINE_READ_TIME_LIMIT_CAP_MS = 115_000;
const ENGINE_READ_INFERENCE_LIMIT_CAP = 1_000_000_000_000;

// implements REQ-core-engine-read-limits
export type EngineQueryLimits = Readonly<{
  /** Wall-clock budget for the Prolog goal, in milliseconds. */
  timeMs?: number;
  /** Logical-inference budget for the Prolog goal. */
  inferences?: number;
}>;

// implements REQ-core-engine-read-limits
export type EngineLimitExceeded = Readonly<{
  kind: "time" | "inferences";
  limit: number;
}>;

function boundedInteger(value: unknown, max: number): number | undefined {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= max
    ? value
    : undefined;
}

/**
 * Validate limits received over the engine socket. Out-of-range values are
 * dropped (the read runs unbounded, as before); a time limit is capped below
 * the hard per-query timeout.
 */
// implements REQ-core-engine-read-limits
export function normalizeQueryLimits(
  value: unknown,
): EngineQueryLimits | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const requestedTime = boundedInteger(raw.timeMs, Number.MAX_SAFE_INTEGER);
  const timeMs =
    requestedTime === undefined
      ? undefined
      : Math.min(requestedTime, ENGINE_READ_TIME_LIMIT_CAP_MS);
  const inferences = boundedInteger(
    raw.inferences,
    ENGINE_READ_INFERENCE_LIMIT_CAP,
  );
  if (timeMs === undefined && inferences === undefined) return undefined;
  return {
    ...(timeMs !== undefined ? { timeMs } : {}),
    ...(inferences !== undefined ? { inferences } : {}),
  };
}

/** Read limits configured through the environment, if any. */
// implements REQ-core-engine-read-limits
export function queryLimitsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): EngineQueryLimits | undefined {
  const parse = (name: string): number | undefined => {
    const raw = env[name]?.trim();
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  };
  return normalizeQueryLimits({
    timeMs: parse(ENGINE_READ_TIME_LIMIT_ENV),
    inferences: parse(ENGINE_READ_INFERENCE_LIMIT_ENV),
  });
}

/**
 * Clauses the engine session defines at boot (and after a recycle) so a
 * bounded read needs one call and one answer binding. Helper variables stay
 * clause-local, so the toplevel prints only the goal's own bindings plus the
 * outcome, whose compound value cannot be grouped with a goal's binding.
 *
 * A goal that swallows the limit exception itself (a catch-all inside a
 * predicate) could otherwise return a partial answer or fail; measuring the
 * elapsed time and inferences around the goal reports the limit regardless.
 */
// implements REQ-core-engine-read-limits
export const BOUNDED_READ_HELPER_DEFINITION = `(current_predicate(kibi_engine_bounded_read/4) -> true ; ${[
  "assertz((kibi_engine_bounded_read(Goal, Seconds, Inferences, kibi_read_outcome(Outcome)) :- get_time(T0), statistics(inferences, I0), (catch(kibi_engine_bounded_call(Goal, Seconds, Inferences, Inner), time_limit_exceeded, Inner = time) -> Failed = false ; Failed = true), get_time(T1), statistics(inferences, I1), (Inner == time -> Outcome = time ; Inner == inferences -> Outcome = inferences ; number(Seconds), T1 - T0 >= Seconds -> Outcome = time ; integer(Inferences), I1 - I0 >= Inferences -> Outcome = inferences ; Failed == true -> fail ; Outcome = none)))",
  "assertz((kibi_engine_bounded_call(Goal, Seconds, Inferences, Inner) :- (number(Seconds) -> call_with_time_limit(Seconds, kibi_engine_inference_call(Goal, Inferences, Inner)) ; kibi_engine_inference_call(Goal, Inferences, Inner))))",
  "assertz((kibi_engine_inference_call(Goal, Inferences, Inner) :- (integer(Inferences) -> call_with_inference_limit(Goal, Inferences, Result), (Result == inference_limit_exceeded -> Inner = inferences ; Inner = none) ; once(Goal), Inner = none)))",
].join(", ")})`;

/** Answer binding that carries a bounded read's outcome. */
const OUTCOME_BINDING = "KibiReadOutcome";

/**
 * Wrap a read-only goal in its limits. The goal's own variables keep their
 * names, so its answer bindings are unchanged; the outcome arrives in the
 * KibiReadOutcome binding that settleBoundedRead strips. The surrounding
 * parentheses keep PrologProcess from caching a bounded answer.
 */
// implements REQ-core-engine-read-limits
export function boundedReadGoal(
  goal: string,
  limits: EngineQueryLimits,
): string {
  const seconds =
    limits.timeMs === undefined ? "none" : (limits.timeMs / 1000).toFixed(3);
  const inferences =
    limits.inferences === undefined ? "none" : String(limits.inferences);
  return `(kibi_engine_bounded_read((${goal}), ${seconds}, ${inferences}, ${OUTCOME_BINDING}))`;
}

type BoundedResult = {
  readonly success: boolean;
  readonly bindings: Readonly<Record<string, string>>;
  readonly error?: string;
};

/**
 * Turn a bounded read's answer back into the unbounded answer shape, or into
 * an explicit limitExceeded failure when a limit stopped the goal.
 */
// implements REQ-core-engine-read-limits
export function settleBoundedRead<T extends BoundedResult>(
  result: T,
  limits: EngineQueryLimits,
): T | (BoundedResult & { readonly limitExceeded: EngineLimitExceeded }) {
  if (!result.success) return result;
  const { [OUTCOME_BINDING]: rawOutcome, ...bindings } = result.bindings;
  const outcome = rawOutcome?.match(/^kibi_read_outcome\((\w+)\)$/)?.[1];
  const hit: EngineLimitExceeded | null =
    outcome === "time" && limits.timeMs !== undefined
      ? { kind: "time", limit: limits.timeMs }
      : outcome === "inferences" && limits.inferences !== undefined
        ? { kind: "inferences", limit: limits.inferences }
        : null;
  if (hit === null) return { ...result, bindings };
  return {
    success: false,
    bindings: {},
    error: queryLimitMessage(hit),
    limitExceeded: hit,
  };
}

/**
 * The message names the limit in a fixed form, so the signal survives an
 * executor that rewraps the error with its own prefix.
 */
function queryLimitMessage(hit: EngineLimitExceeded): string {
  const budget =
    hit.kind === "time"
      ? `time limit of ${hit.limit} ms (${ENGINE_READ_TIME_LIMIT_ENV})`
      : `inference limit of ${hit.limit} (${ENGINE_READ_INFERENCE_LIMIT_ENV})`;
  return `${QUERY_LIMIT_EXCEEDED_CODE}: read stopped at its ${budget} before computing an answer. Narrow the query or raise the limit.`;
}

const QUERY_LIMIT_MESSAGE =
  /QUERY_LIMIT_EXCEEDED: read stopped at its (time|inference) limit of (\d+)/;

/** A read the engine stopped at its limit; never an empty answer. */
// implements REQ-core-engine-read-limits
export class EngineQueryLimitError extends Error {
  readonly code = QUERY_LIMIT_EXCEEDED_CODE;
  readonly retryable = false;

  constructor(readonly limitExceeded: EngineLimitExceeded) {
    super(queryLimitMessage(limitExceeded));
    this.name = "EngineQueryLimitError";
  }
}

/**
 * The limit that stopped a read, from the typed error or from the message an
 * executor rewrapped it into; null for every other error.
 */
// implements REQ-core-engine-read-limits
export function queryLimitExceededOf(
  error: unknown,
): EngineLimitExceeded | null {
  if (!(error instanceof Error)) return null;
  const typed = (error as { limitExceeded?: unknown }).limitExceeded;
  if (
    (error as { code?: unknown }).code === QUERY_LIMIT_EXCEEDED_CODE &&
    typed !== null &&
    typeof typed === "object"
  ) {
    const { kind, limit } = typed as { kind?: unknown; limit?: unknown };
    if ((kind === "time" || kind === "inferences") && typeof limit === "number")
      return { kind, limit };
  }
  const match = error.message.match(QUERY_LIMIT_MESSAGE);
  if (match?.[1] === undefined || match[2] === undefined) return null;
  return {
    kind: match[1] === "time" ? "time" : "inferences",
    limit: Number(match[2]),
  };
}

/** Reject an engine answer that reports a limit hit. */
// implements REQ-core-engine-read-limits
export function assertWithinQueryLimits(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  const hit = (value as { limitExceeded?: unknown }).limitExceeded;
  if (hit === null || typeof hit !== "object") return;
  const { kind, limit } = hit as { kind?: unknown; limit?: unknown };
  if ((kind !== "time" && kind !== "inferences") || typeof limit !== "number")
    return;
  throw new EngineQueryLimitError({ kind, limit });
}
