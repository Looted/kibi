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
| Run the mutation suite | `bun run test:mutation` |
| Inspect the report | open `reports/mutation/html/index.html` |
| Raw machine report | `reports/mutation/mutation.json` |

Every run is a full run: incremental mode is deliberately off because the bun
runner's incremental cache has been observed to under-invalidate when only
test files change, which masks survivors. Reports and the `.stryker-tmp/`
sandbox are gitignored.

## Scope

The suite currently targets the three small packages whose unit suites are
fast enough for per-mutant runs (see `stryker.conf.mjs`):

| Package | Mutated | Notes |
| --- | --- | --- |
| `packages/runtime` | `src/**/*.ts` except `src/index.ts` | `index.ts` is a pure re-export barrel of `kibi-cli` with no logic of its own. |
| `packages/codex` | `src/**/*.ts` | |
| `packages/cursor` | `src/**/*.ts` | |

Deliberately out of scope: `packages/cli` and `packages/mcp` (their tests spawn
Prolog engines, git workspaces, and daemons, which makes per-mutant runs
prohibitively slow), `packages/core` (SWI-Prolog sources — a JS mutator cannot
touch them; Prolog has its own coverage lane via `test:coverage:prolog`), and
`packages/opencode`/`vscode` (candidates for later passes).

## How it runs

- Test runner: [`@hughescr/stryker-bun-runner`](https://github.com/hughescr/stryker-bun-runner)
  spawns a fresh `bun test` child per run and correlates tests to mutants via
  Bun's inspector protocol (`coverageAnalysis: "perTest"`). Stryker core runs
  on Node; the children run on Bun (repo pins bun ≥ 1.3.10; the plugin needs
  ≥ 1.3.7).
- Test files are passed as an explicit `./`-prefixed list
  (`bun.testFiles` in `stryker.conf.mjs`) because `bunfig.toml` sets
  `[test] root = "test"`, which breaks bun's directory-argument discovery.
- The sandbox rebuilds the tracked `plugins/` symlinks and restores `.kibi` to
  mode 0700 via `scripts/mutation-sandbox-setup.sh` (Stryker's copier cannot
  copy symlinks and recreates directories with default modes).

## Extending scope

To add a package or directory to `mutate`:

1. Make sure a fast, hermetic unit suite covers it — the whole scoped dry run
   must stay well under a minute, and every test must pass inside the Stryker
   sandbox.
2. Add the glob to `mutate` in `stryker.conf.mjs` (and the package's tests to
   the `bun.testFiles` enumeration) — package lists live in both
   `MUTATION_PACKAGES` and `mutate`.
3. Add the package to `MUTATION_PACKAGES` in
   `scripts/tests/mutation-workflow-contract.test.ts`.
4. Run `bun run test:mutation` and fix every survivor before committing.

A survivor is fixed by adding a **behavioral test** (assert the observable
output, state transition, or error contract the mutant changed) — not by
weakening the gate. This matches the repo-wide testing policy: assert
behavior, not lines.

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
the authoritative list. As of the initial 100% pass the excluded mutants fall
into these groups:

| Where | Equivalence argument |
| --- | --- |
| `packages/runtime/src/skill-operations.ts` | The non-string ternary fallbacks are re-validated by `assertNonEmptyString`; the `"utf8"` hash encoding is identical to Bun's empty encoding (verified). |
| `packages/runtime/src/skill-system/validation.ts` | `"utf8"` read encoding is identical to Bun's empty encoding (verified). |
| `packages/runtime/src/skill-system/loader.ts` | Module-init skills-directory literal (per-test coverage attribution impossible; behavior pinned by the canonical-usage test); `listRoots` directory filter and the empty declared-resources fallback are observationally equivalent. |
| `packages/codex/src/hook-input.ts`, `packages/cursor/src/hook-input.ts` | `isRecord` type-check removal and stdin chunk buffering are unobservable through `parseHookInput`/`readStdin`; the empty-event guard is inert for empty strings. |
| `packages/codex/src/hook-runner.ts`, `packages/cursor/src/hook-runner.ts` | `SessionStart` case falls through to the identical default; the codex dirty-path clear term is implied by the kb-check flag; cursor write-bucket literals and the mutation-tool clear term are subsumed by equivalent branches. |
| `packages/codex/src/hook-state.ts`, `packages/cursor/src/hook-state*.ts` | Redundant guards whose removal converges on the same state (blank-name, blank-path, missing-dir early returns); journal events subsumed by the snapshot write; Bun empty-encoding equivalents. |
| `packages/codex/src/path-policy.ts`, `packages/cursor/src/path-policy.ts` | Extension-computation fallback literals (`?? ""`, `: ""`, `includes("")`) yield non-matching extensions for every input. |
| `packages/cursor/src/kb-mcp-tools.ts` | `extractKbMcpToolName` fallbacks re-derive the same name from the same inputs. |
| `packages/cursor/src/messages.ts` | `hasFollowupWork`/`planDelivered` early return is behaviorally redundant (the fall-through returns undefined under the same condition); duplicate impact-check branch; unmatched switch case. |
| `packages/cursor/src/hook-state-storage.ts` | `sleepSync`/retry pacing is outcome-neutral; lock-outcome booleans converge; coercion tolerates primitives; Bun empty-encoding equivalents. |
