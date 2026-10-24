import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveSwipl,
  swiplChildEnv,
} from "../../src/prolog/swipl-resolver.js";

const CORE_SRC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../core/src",
);

/**
 * Evaluate `goal` once per case in one SWI-Prolog process. The goal sees the
 * case as the dict `Case` and binds `Out` to a JSON-writable term; the answers
 * come back in case order.
 */
export function prologCases<T>(
  module: string,
  goal: string,
  cases: readonly unknown[],
): T[] {
  const swipl = resolveSwipl();
  const modulePath = path.join(CORE_SRC, module).replaceAll("'", "''");
  const program = `
    :- use_module(library(http/json)).
    :- use_module('${modulePath}').
    main :-
      set_stream(user_input, encoding(utf8)),
      json_read_dict(user_input, Cases, [value_string_as(string)]),
      forall(member(Case, Cases),
        ( catch((${goal}), Error, (message_to_codes(Error, Out0), Out = _{error: Out0}))
        -> json_write_dict(current_output, Out, [width(0)]), nl
        ;  json_write_dict(current_output, _{error: "goal failed"}, [width(0)]), nl
        )).
    message_to_codes(Error, Text) :- term_string(Error, Text).
  `;
  const run = spawnSync(
    swipl.bin,
    ["-q", "-g", "consult(user), main", "-t", "halt"],
    {
      input: `${program}\nend_of_file.\n${JSON.stringify(cases)}`,
      encoding: "utf8",
      env: { ...process.env, ...swiplChildEnv(swipl) },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (run.status !== 0)
    throw new Error(`swipl exited ${run.status}: ${run.stderr}`);
  const lines = run.stdout.split("\n").filter((line) => line.trim() !== "");
  if (lines.length !== cases.length)
    throw new Error(
      `expected ${cases.length} answers, got ${lines.length}: ${run.stderr}`,
    );
  return lines.map((line) => JSON.parse(line) as T);
}
