import type {
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

export type FakeAnswer =
  | PrologQueryResult
  | ((goal: string) => PrologQueryResult | Promise<PrologQueryResult>);

/**
 * A scripted Prolog port: each query consumes the next answer (the last one
 * repeats) and every goal is recorded verbatim.
 */
export function scriptedProlog(
  answers: readonly FakeAnswer[],
  extra: Partial<PrologPort> = {},
): { prolog: PrologPort; goals: string[]; invalidations: string[] } {
  const goals: string[] = [];
  const invalidations: string[] = [];
  let index = 0;
  const prolog: PrologPort = {
    query: async (goal) => {
      const text = Array.isArray(goal) ? goal.join(", ") : String(goal);
      goals.push(text);
      const answer = answers[Math.min(index, answers.length - 1)];
      index += 1;
      if (answer === undefined) return { success: true, bindings: {} };
      return typeof answer === "function" ? answer(text) : answer;
    },
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
    invalidateCache: () => {
      invalidations.push(`after:${goals.length}`);
    },
    ...extra,
  };
  return { prolog, goals, invalidations };
}

export const ok = (
  bindings: Record<string, string> = {},
): PrologQueryResult => ({
  success: true,
  bindings,
});

export const fail = (error?: string): PrologQueryResult =>
  error === undefined
    ? { success: false, bindings: {} }
    : { success: false, bindings: {}, error };
