# Mutation testing guide

Mutation testing measures whether the test suite actually detects behavior
changes, not just whether code executes. Stryker mutates the scoped source
files (flipped comparisons, removed calls, swapped literals, ...) and runs the
tests against each mutant. A mutant that survives means no test asserts the
behavior it changed. The gate in this repo is absolute: **any surviving mutant
fails `bun run test:mutation`**.

## Quick start

| Task | Command |
| --- | --- |
| Run the gated Prolog mutation suite | `bun run test:mutation:prolog` |
| Run the report-only backlog | `bun run test:mutation:prolog:backlog` |
| List the mutants without running tests | `swipl scripts/run-prolog-mutation.pl list` |
| Re-run chosen mutants | `bun run test:mutation:prolog -- --only <id>,<id>` |
| Inspect the reports | open `reports/mutation/prolog/mutation.html` or `reports/mutation/prolog-backlog/mutation.html` |
| Raw machine report | `reports/mutation/prolog/mutation.json` |

Mutalog's thresholds apply to a whole run, so the lane has two configs at
the repository root:

| Config | Modules | Gate | Mutants | Run time |
| --- | --- | --- | --- | --- |
| `mutalog.config.pl` | `logic_ir.pl` (tested by `logic_ir.plt`) | `break(100)` | ~2,500 | about 3 minutes on 4 cores |
| `mutalog.backlog.config.pl` | `kb.pl` (tested by `logic_ir.plt` and `kb.plt`) | `break(0)`, report only | 4,840, 32.1% | about 10 minutes on 3 workers |

- Like the Stryker gate, `mutalog.config.pl` **gates at 100%**: any
  surviving mutant fails the run. An equivalent mutant is suppressed in the
  source, with a comment on the line above it that names the operator and
  gives the reason:

  ```prolog
  % mutalog-disable-next-line cut_insert: maplist/3 over a det predicate
  expression_depth(all(Items), Depth) :- maplist(expression_depth, Items, Depths), ...
  ```

  The comment moves with the code, unlike an `ignore_mutants` id, which
  carries line and column. Today every suppression in `logic_ir.pl` is a
  `cut_insert` mutant: a cut inserted after a deterministic first goal of a
  clause that no later clause can also match.
- `mutalog.backlog.config.pl` holds modules whose survivors are not triaged
  yet. Once a module's survivors are killed or suppressed as equivalents, move it
  to `mutalog.config.pl`.
- `scripts/run-prolog-mutation.pl` pins the Mutalog version. On first use
  it downloads the release archive with `curl` and unpacks it with `tar`
  into `.cache/prolog-packs` (gitignored), leaving the user's own packs
  alone. Set `MUTALOG_HOME` to a
  Mutalog checkout to run that instead.
- `.github/workflows/mutation-prolog.yml` runs both configs nightly on
  `develop`, on demand, and on pull requests that touch the mutated modules,
  their tests or the lane's setup, on the bundled SWI-Prolog. Only the gated
  run can fail the job. Both reports are uploaded as the
  `prolog-mutation-report` artifact.

To add a module, add it to `mutate` and its plunit file to `tests` in
`mutalog.backlog.config.pl`, and both paths to the workflow's `paths`.
Measure the module's run time first and raise the job's `timeout-minutes` if
needed.

## Equivalent mutants and exclusions

Some mutants are semantically equivalent to the original code (for example,
inverting a comparison that only feeds a log message ordering, or a string
change that is itself asserted only as an opaque blob). These cannot be killed
by any test. When you hit one:

1. Mark the line with a bare Stryker disable directive (trailing text after
   the mutator names is not parsed by Stryker) and put the justification in a
   `rationale:` comment directly above:

   ```ts
   // rationale: Bun treats the empty encoding as utf8 (verified), so the
   // digest is identical either way.
   // Stryker disable next-line StringLiteral
   const digest = createHash("sha256").update(body, "utf8").digest("hex");
   ```

   `scripts/tests/mutation-workflow-contract.test.ts` enforces that every
   `Stryker disable` comment has a `rationale:` comment within the three
   preceding lines.
2. Record it in the appendix below.

Exclusions are a last resort; a growing exclusion list is a smell. Prefer
reshaping the code so the equivalence disappears, or writing the test that
kills the mutant.

### Appendix: disabled mutants

Exclusions are marked inline with `// Stryker disable` directives and a
`rationale:` comment; grep for `Stryker disable` in the scoped packages for
the authoritative list. Where the surrounding code was genuinely redundant
(a dead `planDelivered` early return, a `normalizeEventName` empty guard,
a no-op blank-path guard), it was simplified or deleted instead — prefer
deletion over exclusion. Every surviving exclusion was re-verified by
hand-applying the mutant and probing both the Bun test runner and the Node
production runtime; the remaining excluded mutants fall into these groups:

| Where | Equivalence argument |
| --- | --- |
| `packages/runtime/src/skill-system/validation.ts` | `readFileSync(SKILL.md, "")` yields a Buffer under both runtimes, and gray-matter parses a Buffer identically to a string (verified empirically under Node and Bun) — no test can distinguish. |
| `packages/runtime/src/skill-operations.ts` | — (killed: an interaction test now pins the `hash.update(body, "utf8")` call via a crypto spy). |
| `packages/runtime/src/skill-system/validation.ts` | `"utf8"` read encoding is identical to Bun's empty encoding (verified). |
| `packages/runtime/src/skill-system/loader.ts` | Module-init skills-directory literal (per-test coverage attribution impossible; behavior pinned by the canonical-usage test); `listRoots` directory filter and the empty declared-resources fallback are observationally equivalent. |
| `packages/codex/src/hook-input.ts`, `packages/cursor/src/hook-input.ts` | `isRecord` type-check removal and stdin chunk buffering are unobservable through `parseHookInput`/`readStdin`; the empty-event guard is inert for empty strings. |
| `packages/codex/src/hook-runner.ts`, `packages/cursor/src/hook-runner.ts` | `SessionStart` case falls through to the identical default; the codex dirty-path clear term is implied by the kb-check flag; cursor write-bucket literals and the mutation-tool clear term are subsumed by equivalent branches. |
| `packages/codex/src/hook-runner.ts`, `packages/cursor/src/hook-runner.ts` (telemetry and context guards) | The telemetry opt-in guard repeats the one `appendHookUsageRows` applies (it only skips loading the index); the codex no-target early return only skips loading the index; the codex focus lookup always has one target, because only Edit-style input carries `old_string`; the missing-prompt and missing-session-id fallback literals are never observable; the cursor `"read"` snippet surface is equivalent to any non-`"edit"` value. |
| `packages/codex/src/hook-state.ts`, `packages/cursor/src/hook-state*.ts` | Redundant guards whose removal converges on the same state (blank-name, blank-path, missing-dir early returns); journal events subsumed by the snapshot write; Bun empty-encoding equivalents. |
| `packages/codex/src/path-policy.ts`, `packages/cursor/src/path-policy.ts` | Extension-computation fallback literals (`?? ""`, `: ""`, `includes("")`) yield non-matching extensions for every input. |
| `packages/cursor/src/kb-mcp-tools.ts` | `extractKbMcpToolName` fallbacks re-derive the same name from the same inputs. |
| `packages/cursor/src/messages.ts` | Unmatched `"mcp"` switch case (an unmatched case already returns undefined). |
| `packages/cursor/src/hook-state-storage.ts` | `sleepSync`/retry pacing is outcome-neutral; lock-outcome booleans converge; coercion tolerates primitives; Bun empty-encoding equivalents. |
| `packages/cursor/src/hook-runner.ts`, `packages/cursor/src/hook-state-storage.ts` (type-narrowing guards) | `toolName !== undefined` and `lane === undefined` checks narrow types for `Set<string>.has`; at runtime `Set.has(undefined)` is false, so the outcome is identical with or without them. |
| `packages/cli/src/engine-limits.ts` (`boundedInteger`) | The `typeof value === "number"` check narrows the type for the comparisons; `Number.isSafeInteger` already rejects every non-number. |
| `packages/cli/src/entity-body-context.ts` (`classifyLines`) | A prose row's `heading: ""` is never read, and `match[1]?.length` only satisfies the indexed-access type (the pattern always captures the hashes). |
| `packages/cli/src/logic/ir.ts` | `renameTerm`'s variable guard and the declared-name guard only narrow types (a missing name is never looked up), and the `?? []` fallback over declared variables yields entries without a name, which rename nothing. |
