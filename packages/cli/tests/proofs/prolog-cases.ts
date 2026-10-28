import { spawnSync } from "node:child_process";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
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
 *
 * The program, the cases and both output streams go through files, not
 * pipes: Bun can miss a readiness event on a child's pipe, which left swipl
 * blocked on stdin until the test timed out. With no pipes the run only waits
 * for the process to exit, and a hung run fails at the spawn timeout with its
 * stderr.
 */
export function prologCases<T>(
  module: string,
  goal: string,
  cases: readonly unknown[],
): T[] {
  const swipl = resolveSwipl();
  const modulePath = path.join(CORE_SRC, module).replaceAll("'", "''");
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-prolog-cases-"));
  try {
    const casesPath = path.join(dir, "cases.json");
    const outPath = path.join(dir, "out.jsonl");
    const errPath = path.join(dir, "stderr.txt");
    const programPath = path.join(dir, "program.pl");
    const quoted = (file: string) => `'${file.replaceAll("'", "''")}'`;
    writeFileSync(casesPath, JSON.stringify(cases));
    writeFileSync(
      programPath,
      `
    :- use_module(library(http/json)).
    :- use_module('${modulePath}').
    main :-
      setup_call_cleanup(
        open(${quoted(casesPath)}, read, In, [encoding(utf8)]),
        json_read_dict(In, Cases, [value_string_as(string)]),
        close(In)),
      setup_call_cleanup(
        open(${quoted(outPath)}, write, Stream, [encoding(utf8)]),
        forall(member(Case, Cases),
          ( catch((${goal}), Error, (message_to_codes(Error, Out0), Out = _{error: Out0}))
          -> json_write_dict(Stream, Out, [width(0)]), nl(Stream)
          ;  json_write_dict(Stream, _{error: "goal failed"}, [width(0)]), nl(Stream)
          )),
        close(Stream)).
    message_to_codes(Error, Text) :- term_string(Error, Text).
  `,
    );
    const stderr = openSync(errPath, "w");
    let run: ReturnType<typeof spawnSync>;
    try {
      run = spawnSync(
        swipl.bin,
        ["-q", "-g", "main", "-t", "halt", programPath],
        {
          stdio: ["ignore", "ignore", stderr],
          env: { ...process.env, ...swiplChildEnv(swipl) },
          timeout: 60_000,
        },
      );
    } finally {
      closeSync(stderr);
    }
    const errors = readFileSync(errPath, "utf8");
    if (run.status !== 0)
      throw new Error(
        `swipl exited ${run.status}${run.signal ? ` (${run.signal})` : ""}: ${errors}`,
      );
    const lines = readFileSync(outPath, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "");
    if (lines.length !== cases.length)
      throw new Error(
        `expected ${cases.length} answers, got ${lines.length}: ${errors}`,
      );
    return lines.map((line) => JSON.parse(line) as T);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
