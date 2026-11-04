# Mutation testing guide

Mutation testing measures whether the test suite actually detects behavior
changes, not just whether code executes. Stryker mutates the scoped source
files (flipped comparisons, removed calls, swapped literals, ...) and runs the
tests against each mutant. A mutant that survives means no test asserts the
behavior it changed. The gate in this repo is absolute: **any surviving mutant
fails `bun run test:mutation`**.

## When mutation testing runs

No mutation lane runs on a schedule, on a push or for a pull request: every
`.github/workflows/mutation*.yml` workflow only has a `workflow_dispatch`
trigger. Run a lane locally with the commands below, or start its workflow by
hand from the Actions tab (pick the branch to test). The contract test in
`scripts/tests/mutation-workflow-contract.test.ts` keeps it that way.

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
| `mutalog.config.pl` | `logic_ir.pl`, `intervals.pl`, `units.pl`, `symbol_classification.pl`, `derived_chr.pl`, `sparql_client.pl`, `kb_consistency.pl`, `certificates.pl`, `cases.pl`, `rule_registry.pl`, `status.pl`, `code_certificates.pl`, `certificate_check.pl`, `model_check.pl`, `claim_obligations.pl`, `semantic_quality.pl`, `discovery.pl`, `checks.pl`, `requirement_proof.pl` and the `schema/` `entities.pl`, `relationships.pl` and `validation.pl`, each tested by its own `.plt` (`requirement_proof.pl` also by `kb.plt`) | `break(100)` | ~25,000 | about 50 minutes on 4 cores |
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
  carries line and column. Most suppressions are `cut_insert` mutants: a cut
  inserted after a deterministic first goal of a clause that no later clause
  can also match. In `intervals.pl` they also cover cuts whose caller keeps
  only the first answer.
- `mutalog.backlog.config.pl` holds modules whose survivors are not triaged
  yet. Once a module's survivors are killed or suppressed as equivalents, move it
  to `mutalog.config.pl`.
- `scripts/run-prolog-mutation.pl` pins the Mutalog version. On first use
  it downloads the release archive with `curl` and unpacks it with `tar`
  into `.cache/prolog-packs` (gitignored), leaving the user's own packs
  alone. Set `MUTALOG_HOME` to a
  Mutalog checkout to run that instead.
- `.github/workflows/mutation-prolog.yml` runs both configs on the bundled
  SWI-Prolog when dispatched by hand from the Actions tab. Only the gated
  run can fail the job. Both reports are uploaded as the
  `prolog-mutation-report` artifact.

To add a module, add it to `mutate` and its plunit file to `tests` in
`mutalog.backlog.config.pl`.
Measure the module's run time first and raise the job's `timeout-minutes` if
needed.

## Tree-sitter source-proof readers

`bun run test:mutation:treesitter` runs a second Stryker gate,
`stryker.treesitter.conf.mjs`, over kibi-plugin-treesitter's PHP, C, Bash and
HCL reference readers and the helpers they share (`preprocessor-idioms.ts`,
`reference-nodes.ts`). Like the main gate it fails on any surviving mutant.
`.github/workflows/mutation-treesitter.yml` runs it when dispatched by hand. It takes
about an hour on 4 cores (roughly 10,000 mutants).

Two things differ from the main gate:

- The plugin's tests import `dist/`, so the build command
  (`scripts/mutation-sandbox-treesitter.sh`) compiles the instrumented source
  in each sandbox. Stryker runs it without a shell and before `node_modules`
  is linked, so the script takes the repository root to find `tsc`.
- The readers run in worker threads, which never see the runner's
  main-thread preload that switches mutants on and records coverage.
  `scripts/mutation-treesitter-inprocess.mjs` rewrites the sandbox's `dist/`
  so the worker pool is an in-process shim over one shared port. Without it
  every reader mutant reads as `NoCoverage` or `Survived`.

New tests that pin reader results go in
`packages/plugin-treesitter/tests/mutation-<language>.test.js` and must be
listed in `TREESITTER_MUTATION_TESTS`; the contract test checks both.
`references.ts` (the older readers) is not in this gate.

## Editor hosts

`bun run test:mutation:editors` runs a third Stryker gate,
`stryker.editors.conf.mjs`, over every `src/**/*.ts` file of kibi-opencode and
kibi-vscode, tested by every `*.test.ts` under their `tests/` directories.
`.github/workflows/mutation-editors.yml` runs it when dispatched by hand. Like
the other gates it fails on any surviving mutant.

The vscode sources import the `vscode` module, which only exists inside the
editor. The bun runner's coverage preload imports every mutated module before
the tests register their stub, so the lane runs `bun test` with
`bunfig.mutation-editors.toml`: the root `bunfig.toml` plus a preload of
`packages/vscode/tests/shared/vscode-preload.ts`. Keep the two bunfig files in
step; the contract test checks that they differ only by that preload.
`packages/opencode/src/tui.tsx` is not mutated (Stryker's `*.ts` glob), but its
lines are covered by the unit suite.

## kibi-mcp

`bun run test:mutation:mcp` runs a fourth Stryker gate, `stryker.mcp.conf.mjs`,
over every `src/**/*.ts` file of kibi-mcp (type declarations aside), tested
by every `*.test.ts` under `packages/mcp/tests`. The suite starts real Kibi
engines, so `.github/workflows/mutation-mcp.yml` installs the pipeline-built
SWI-Prolog, and one `bun test` run may take up to five minutes (the whole
suite takes about two and a half). A whole run takes about two and a half
hours on one runner, so CI splits it into five parallel jobs:
`MCP_MUTATION_SHARDS` lists four groups of costly modules, and the fifth job
takes every other file. `MCP_MUTATION_SHARD=<n>` selects a job's files
locally; without it one run mutates the whole package. A new source file
lands in the fifth job. Tests that change `process.env` must set
and delete keys in place and restore them (`tests/helpers/process-env.ts`):
replacing the object detaches `os.tmpdir()` from `TMPDIR` for the rest of the
run.

## TypeScript gate scope

`stryker.conf.mjs` mutates these whole packages (`MUTATION_PACKAGES`), each
tested by every `*.test.ts` under its own `tests/` directory: `runtime`,
`codex`, `cursor`, `plugin-sdk`, `plugin-jev`, `agent-core`, `zcode`,
`claude`, `plugin-ui`, `plugin-search-hints` and `plugin-builtin`. `CLI_MUTATION_MODULES` adds
single kibi-cli modules and `PLUGIN_MUTATION_MODULES` single files outside a
`src/` tree (`packages/swipl/index.js`), each with the tests named for it.

`MUTATION_TEST_EXCLUDES` lists test files of those packages that cannot run
in the sandbox: `packages/claude/tests/distribution.test.ts` compares the
committed hook bundle with the source, which the sandbox instruments. New
tests for a package in scope go in its `tests/` directory, where the gate
picks them up; the contract test checks that every one is registered.

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
| `packages/agent-core/src/telemetry-signals.ts`, `packages/agent-core/src/usage-telemetry.ts` (struggle signals) | A placeholder item in place of an empty stored list is not an object, so the entry filters drop it; a placeholder workspace hash matches no skill marker, which only holds workspace keys; without a workspace every call hashes the same fallback, so which string it is cannot change a retry or repeat match. |
| `packages/cli/src/entity-body-context.ts` (`classifyLines`) | A prose row's `heading: ""` is never read, and `match[1]?.length` only satisfies the indexed-access type (the pattern always captures the hashes). |
| `packages/cli/src/logic/ir.ts` | `renameTerm`'s variable guard and the declared-name guard only narrow types (a missing name is never looked up), and the `?? []` fallback over declared variables yields entries without a name, which rename nothing. |
| `packages/cli` check speedups (`source-analysis-cache.ts`, `symbol-coordinates.ts`, `shards.ts`, `symbol-granularity-check.ts`, `requirement-quality.ts`, `aggregated-checks.ts`) and `packages/mcp/src/tools/check-prolog.ts` | These modules are not in the gated set; their speedup lines were mutated by line range. A pure-function memo skipped or recomputed gives the same answer; the builtin analyzer always resolves where tests run; `force` on removing a directory that exists changes nothing; Windows separator normalization cannot show on a POSIX runner; an incomplete analysis carries no symbols; every requirement asked for is in the fanout index. |
| `packages/agent-core/src/usage-telemetry.ts` | The Node runtime name is unreachable under Bun, whose global cannot be removed; `timer.unref()` only changes process lifetime; `force` on removing claimed or listed queue files only matters in a cross-process race; an empty claimed-batch list and a placeholder path are both dropped as unreadable. |
| `packages/agent-core/src/snippets.ts`, `packages/agent-core/src/requirement-candidates.ts`, `packages/agent-core/src/path-policy.ts`, `packages/agent-core/src/knowledge-index.ts` | Early returns that only save reading a file, an empty list whose placeholder entry reads as a primitive with no fields, the unowned-path shortcut, and the backslash normalization that cannot show on a POSIX runner. |
| `packages/plugin-sdk/src/validate.ts`, `packages/zcode/src/hook-runner.ts`, `packages/claude/src/hook-runner.ts` | Fallback `[]` values for absent ownership and markers, the missing-target guard whose throw the caller turns into the same missing context, a missing command start time that matches no file, and the `"read"` snippet surface, which is equivalent to any non-`"edit"` value. |
| `packages/opencode/src` (`plugin.ts`, `hook-telemetry.ts`, `file-operation-reminders.ts`, `guidance-cache.ts`, `kibi-checkpoint-runner.ts`, `scheduler.ts`, `plugin-startup.ts`, `smart-enforcement-events.ts`, `kibi-bootstrap-capability.ts`) | Literals only used as opaque cache keys or log event names, an `?? "advisory"` default the caller always fills, git's stderr setting (stdout is the same), an SDK lookup by name that cannot succeed in this repository, a read fallback replaced on the next refresh, a catch that returns what an emptied block returns, a suggestion precompute that only non-code files would skip, a checkpoint runner looked up outside hard mode (only hard mode reads its evidence), and a scheduler dispose that only releases a waiter nothing reads after a timed-out run. |
