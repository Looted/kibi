# SkillOpt operator guide

SkillOpt is an isolated review tool, not a runtime dependency of Kibi. Real runs use the existing authenticated Codex CLI login from your home directory, then copy that login into a private Codex home before any paid call. Local review remains non-mutating: it never changes a canonical skill and every production outcome remains `external-verdict-required`.

## Prerequisites

For the portable revise → compose → evaluate → confirm → package workflow,
see [Reusable SkillOpt campaigns](skillopt-campaign.md). It accepts explicit
artifact paths and persists the inputs needed to continue an experiment without
depending on a particular operator's session or cache layout.

| Check | Command | Why |
| --- | --- | --- |
| `uv` on PATH | `uv --version` | Operator scripts sync and verify the pinned SkillOpt Python toolchain. |
| Authenticated Codex CLI | `codex login status` | Must report `Logged in using ChatGPT` before paid smoke or optimize. |
| Bubblewrap | `bwrap --version` | Required for the isolated Codex capability canary and cell sandboxes. |
| Clean source worktree | `git status --porcelain` must be empty | Paid optimize preflight rejects dirty trees (`source_not_clean`). |

## Trust-plane scope

**Primary path for improving the bundled skills:** authenticated Codex CLI SkillOpt. Select one of `kibi-usage`, `kibi-freshness`, `kibi-traceability`, or `kibi-bootstrap`; use the bundle suite for assembled acceptance. The scripts verify the pin, confirm the Codex login, and run the paid pipeline. `prepareExistingLogin` only mirrors that operator-owned session into a private Codex home; it does not provision credentials.

Canonical skill mutation still requires a separate production-adoption verdict; SkillOpt review artifacts alone do not rewrite production skills.

### Baseline-preserving insertion

The runtime also exposes an opt-in insertion mode for a constrained one-paragraph
proposal. Add this field to `CodexOptimizerOptions` when calling
`runCodexSkillOptStep` directly:

```ts
baselineInsertion: {
  currentBaselineBodyHash: string;
  frontmatterHash: string;
  resourcesHash: string;
  headingAnchor: string; // e.g. "## Closeout fields"
  objective: string;
}
```

The three surface hashes and `currentBody` must match the live canonical skill
loaded from `sourceWorktree`; the heading anchor must occur exactly once. The
optimizer returns JSON `{ "body": "<paragraph>" }`, limited to 1,600 UTF-8
bytes. The objective is prompt-only and is bound by `objectiveHash` in the
composition receipt; its literal text is not required in the paragraph. The
host validates that paragraph with the existing shallow safety and
repository-policy checks, then inserts it before the host-owned anchor. It does
not run the legacy full-rewrite completeness validator, normalize the baseline,
or accept model-selected replacement/deletion operations. There is at most one
format-only repair attempt; safety and policy failures are not retried.

After the model response, the live canonical surface is checked again before
composition and persistence. A successful mode run stores the model paragraph,
exact baseline copy, plan, composed body, and hash-bound composition receipts
under `accepted-output/`. `receipt.json` has artifact type
`skillopt-accepted-baseline-insertion-output` and `bodyKind: "composed"`; it is
not a claim that the model authored the full composed body. This mode is not
sent through the upstream Python request or legacy optimizer bridge, and it
does not assert behavioral efficacy without a separate evaluation.

An optional privileged verifier/installer lane (`kibi-skillopt-trust-v1`) exists for independent production verification/adoption evidence. It is **not** a prerequisite for Codex SkillOpt review runs or for merging this harness.

`prepareExistingLogin` copies an existing `~/.codex/auth.json` into a private Codex home with mode `0600`, rejects provider API key env vars, and revalidates `codex login status`.

## Package scripts

### Recover historical candidates (offline)

Run `bun run build:cli` first so the baseline is the current built distribution,
then run (the default baseline is checked against source for body/manifest drift):

```bash
bun run skillopt:history
# Explicit archive and trusted bundled baseline directories:
bun run skillopt:history --artifact-root /path/to/operator/optimize --baseline-root /path/to/dist/public/skills
```

This command does not require Codex authentication, invoke models, train, mutate
skills, or adopt candidates. It emits JSON to stdout and defaults to
`$XDG_CACHE_HOME/kibi-skillopt/operator/optimize` (or `~/.cache/...`). It reads only
known public candidate/receipt paths inside UUID run directories: per-skill final
bodies, trainer best/version bodies, accepted one-shot/optimizer-step bodies,
review metadata, and seed metadata. It never recursively scans the archive or
loads private fixtures, held-out evidence, episodes, transcripts, failed output,
or `.kb`. Symlinks, hardlinked files, nonregular files, invalid UTF-8, and files
larger than 1 MiB are excluded. Inspect a stable archive, not one being modified
concurrently.

The inventory deduplicates by skill and raw body SHA-256 while retaining every
origin and available baseline/seed lineage. `shortlist` contains only complete,
safe, non-baseline bodies with a matching historical review or accepted-output
receipt. Seed metadata alone never verifies provenance. A matching historical
receipt establishes file integrity, not independent authentication or efficacy.
Unverified and incomplete bodies remain visible for manual review; old scores
are not ranked or treated as current evidence. The shortlist is deterministic,
not a behavioral ranking, and **still requires fresh evaluation** before seeding
an optimization campaign. No candidate body text is embedded in the report.

Exit code 0 means screening completed, even with an empty shortlist; 1 means
the archive root or baseline could not be inspected, and 2 means invalid options.
Rejected files inside valid runs are reported in `diagnostics` without preventing
other runs from being inventoried. Full body completeness is also enforced when
an optimization loads `--seed-candidate`; historical files cannot bypass that gate.

| Script | Command | Notes |
| --- | --- | --- |
| `skillopt:smoke` | `bun run scripts/skillopt-eval/operator.ts smoke` | Verifies the SkillOpt pin and Codex login, then runs the paid two-model capability canary. |
| `skillopt:optimize` | `bun run scripts/skillopt-eval/operator.ts optimize --skill <skill>` | Verifies pin and login, materializes fixtures, allocates artifact roots, then runs the selected skill through preflight, smoke, Codex rewrite, public development gate, and held-out gates. Writes non-mutating review evidence only. Defaults to `--max-steps 1`; pass `--max-steps 1..4` for complete proposal rounds and `--seed-candidate PATH` to continue from preserved work. |
| bundle suite | `bun run scripts/skillopt-eval/operator.ts suite` | Evaluates the assembled four-skill bundle and its compatibility/behavioral gates without selecting a single candidate for adoption. |
| `skillopt:cursor` | `bun run scripts/skillopt-eval/cursor-operator.ts qualify` | Non-authoritative Cursor compatibility lane. `qualify` checks version, session, models, and Kibi MCP approval with no paid call. `compat --skill S --candidate PATH --fixture-run-root PATH` runs frozen candidate bodies through the shared fixtures, evaluator broker, independent verifier, and sealed scorer. Cursor results never feed Codex gates or adoption. |
| `skillopt:history` | `bun run scripts/skillopt-eval/inspect-history.ts` | Screens historical SkillOpt candidates offline without authentication, model calls, training, mutation, or adoption. |
| `skillopt:screen` | `bun run scripts/skillopt-eval/screen-history.ts` | Paid, bounded public-development comparison of explicitly selected historical candidates against the current baseline; never trains, runs held-out, or adopts. |
| `skillopt:campaign` | `bun run scripts/skillopt-eval/campaign.ts` | Portable revision, composition, evaluation, confirmation, and packaging with explicit budgets and immutable evidence. |

```bash
bun run skillopt:smoke
bun run scripts/skillopt-eval/operator.ts optimize --skill kibi-usage
bun run scripts/skillopt-eval/operator.ts suite --candidate-manifest /path/to/bundle-manifest.json
```

The bundle suite requires an explicit choice for every canonical skill. Candidate
paths are resolved relative to the manifest and must reference validated campaign
candidate manifests. A missing entry or file is an error, not a baseline fallback.

```json
{
  "schemaVersion": "1.0.0",
  "artifactType": "skillopt-bundle-manifest",
  "entries": [
    { "skill": "kibi-usage", "arm": "candidate", "manifestPath": "usage/candidate.json" },
    { "skill": "kibi-freshness", "arm": "baseline" },
    { "skill": "kibi-traceability", "arm": "baseline" },
    { "skill": "kibi-bootstrap", "arm": "baseline" }
  ]
}
```

To reuse a preserved candidate instead of starting the trainer from a fresh comparator:

```bash
bun run scripts/skillopt-eval/operator.ts optimize --skill kibi-usage --max-steps 4 --seed-candidate /path/to/candidate_skill.md
```

The seed is safety-validated, rebound to the selected immutable skill surface, and recorded under that skill's artifact directory. Baseline and one-shot remain fresh comparators; seeding does not adopt or overwrite the canonical skill.

`skillopt:optimize` prints `run-id`, `max-steps`, `artifact-root`, and `fixture-run-root` on stderr. Review output is stored **outside the source worktree** under `$XDG_RUNTIME_DIR/kibi-skillopt/operator/` (falling back to `~/.cache` or the process temp dir), including `optimization-review.json`.

## What optimize runs

For a bounded iterative campaign that stops before held-out, use:

```bash
bun run skillopt:optimize --skill kibi-usage --max-steps 4 --development-only
```

Development-only campaigns share a persistent 64-target-episode attempt cap
across the parent and Python bridge processes. Canary and optimizer invocations
are separate; reservations are not billed-call counts. Admission requires a
positive baseline-relative mean delta with no hard-pass/worst-family loss or
security failures. One-shot remains diagnostic and may be retained if it wins.
Final candidate selection preserves the safest complete best body, including
the baseline when rewrites regress. Reviews distinguish intentional held-out
skipping from admission failure; neither is production-adoption permission.

Known invalid optimizer proposals produce a request-hash-bound rejection
receipt. The adapter returns no patch for that round and preserves the current
best body; subsequent bounded rounds may continue. Process, authentication,
isolation, and unknown errors remain failures. A rejection is never an accepted
body or a successful behavioral evaluation.

To validate a saved candidate within an existing campaign's remaining budget,
set `KIBI_SKILLOPT_TARGET_BUDGET_ROOT` to that run's initialized artifact root
and `KIBI_SKILLOPT_MAX_TARGET_EPISODES` to its original limit when invoking
`skillopt:screen`. Screening records the parent budget in its lock, checks
available capacity before the canary, and shares the atomic reservation
counter. Do not initialize a new counter to reset already-spent attempts.

### Audit a saved classifier result without model calls

```bash
bun run scripts/skillopt-eval/screen-classifier-reanalysis.ts --source-root /path/to/operator/screen/RUN_ID --fixture-run-root /path/to/operator/fixtures/RUN_ID --artifact-root /path/to/operator/diagnostics/NEW_REPORT
```

This offline command verifies saved artifact hashes, the completed comparison
matrix, fixture bindings, and every original score before correcting only the
direct-KB-access classifier result. It preserves other recorded violations and
uses the corresponding saved development evaluator manifests through the
trusted resolver; it neither loads held-out tasks nor emits oracle contents.
The new report includes input and reanalysis-code hashes. Original receipts are
never overwritten, and the output directory must be new and outside the source
run, fixture run, and repository. Missing or inconsistent evidence blocks the
reanalysis or produces an explicitly limited report, not an inferred pass.

Codex-serialized negative `.kb` exclusion globs are not direct access operands.
Explicit KB operands, include globs, and ambiguous executable shell constructs
remain detectable. Static command classification describes evidence of an
access attempt; it cannot prove which filesystem syscalls occurred.

### Screen preserved work before another rewrite

Use the offline inventory's complete SHA-256 hashes to select one to three
distinct candidates for one skill. The paid screening command requires a clean
committed checkout and a current CLI build. It rejects candidates no longer in
the offline shortlist, rechecks their bytes, freezes them with today's baseline
surface, verifies the SkillOpt pin, and runs the existing preflight and canary.
Before the paid canary, a bounded 120-second subprocess also builds and shuts
down a fresh seeded KB. Its `fixture-readiness.json` receipt captures setup
failures without model usage; it does not guarantee later cells cannot fail.

```bash
bun run skillopt:screen --allow-paid --skill kibi-usage --candidate-hash <SHA256-A> --candidate-hash <SHA256-B> --repeats 2 --max-cells 24
```

The example reserves 24 target episodes: baseline plus two candidates, four
public development tasks, and two repetitions. A fresh canary adds at most two
model invocations. `--max-cells` limits target episodes, not provider-internal
turns or dollars; token usage is preserved from episode receipts. Model failures
stop the stage without automatic retries. The command does not generate a new
one-shot, invoke the optimizer, enter held-out, or modify shipped skills.

Task/replicate pairs rotate arm order. Scores remain on the existing 0-100 scale.
The versioned `baseline-relative-development-screen.v2` policy marks a candidate
`promising` only for positive mean gain with no hard-pass or family regression
and no candidate security failures. Ordinary behavioral assertion failures remain
visible but do not force every task to pass before retaining partial progress.
The earlier v1 policy treated all assertion failures as safety failures; its
historical reviews remain unchanged. There is no absolute aggregate score floor
or one-shot hurdle in this screening policy. This is selection feedback, not
statistical confirmation or production-adoption authorization; existing release
gates are not silently reinterpreted.

Artifacts are stored at `$OPERATOR_BASE/screen/<run-id>/`: frozen `body-*.md`,
`screen-lock.json`, `preflight.json`, `smoke.json`, episode receipts, and an atomic
`screen-review.json` checkpoint before and after each target episode. Failed
stages retain completed evidence and `failure.json`; never rank incomplete
matrices as winners. Continue at an explicit budget checkpoint with the best
candidate and its public evidence, not by assuming a failed stage spent nothing.

Target cell workspaces use short, private temporary directories; durable
artifacts and accepted bodies remain in the cache. Deep workspace paths can
exceed the filesystem filename limit when SWI-Prolog encodes RDF journal graph
URIs. A successful short seeded probe does not validate a deep workspace path.

1. `uv sync --project tools/skillopt --frozen` and `verify_pin.py`
2. `codex login status` must already say `Logged in using ChatGPT`
3. Fresh run id, explicit artifact root outside the protected source tree, and materialized fixture corpus
4. Preflight and paid capability canary. Target rollouts use `gpt-5.6-luna` at medium effort; the one-shot and iterative optimizer use `gpt-5.6-sol` at xhigh effort.
5. Score baseline and one-shot on the balanced four-case public development set. Seed the trainer with an explicitly supplied preserved candidate when present, otherwise with the stronger comparator, then run `--max-steps` complete rounds over all eight balanced training cases. Behavioral misses retain partial scores and structured public evidence for reflection.
6. Give each optimizer round both its current trajectories and a compact cumulative family summary, preventing recurring predicate or mutation failures from disappearing when a later stochastic rollout differs.
7. Reject candidate bodies that copy repository-specific release policy or evaluator artifacts. The reusable result must be branch/package-manager neutral and explain how every assertive proposition becomes a keyed strict fact, approved ground predicate, or safe `kibi.logic.v1` rule; ambiguity, nonlogical prose, and ontology gaps remain explicit ledger states.
8. Score canonical semantics, relationship recall/precision, argument binding, source-span coverage, IR safety, graph edges, and proof outcomes—not exact wording. The public compound cases require distinct provenance keys, semantic convergence for paraphrases, contrast separation, a merged `logic_claims` manifest, and complete graph edges. Missing provenance or one-sided modeling remains a behavioral failure that the optimizer can learn from.
9. Require the four-case public development result to improve mean without hard-pass or worst-family regression against the baseline, with no candidate security failures. A miss returns `development_gate_ineligible` with held-out `not-run`; a pass proceeds to the blinded held-out aggregate gates. The real cells reuse one private staged Codex/bwrap runtime for the entire run. Each non-Git fixture pins the target, Codex MCP configuration, broker, and independent verifier to the same `skillopt-eval` Kibi branch; target-only MCP approval is limited to the evaluator-owned allowlisted broker.
10. External production verdict handoff (`external-verdict-required`); no local canonical skill adoption

Optimizer responses are captured from Codex's dedicated final-message file. JSONL progress messages are audit events only and cannot become a candidate. The harness rejects a short progress note or a replacement that drops required CLI, `.kb`, discovery, mutation, or validation guidance before spending target-cell budget on it.

Each accepted one-shot or iterative response is copied to `accepted-output/candidate-body.md` with a hash-bound `accepted-output/receipt.json` before its ephemeral optimizer workspace is removed. These artifacts preserve paid optimizer progress even if a later development, training, or held-out gate stops the run.

The outer trainer deadline is derived from the internal four-case baseline selection, all 12 target cells per requested round, one optimizer allowance per round, and startup grace. A four-round run therefore cannot be cut off by the old fixed 15-minute `uv` deadline; an actual outer timeout is reported as a structured training infrastructure no-go with its diagnostic path.

Diagnostic reconciliation is the multiset of successful model-originated Kibi calls. When the model makes no Kibi call, the matching usage-receipt multiset is legitimately empty and the missing required call is scored as a behavioral protocol failure. A non-empty successful-call multiset without matching usage receipts remains an infrastructure no-go.

## Artifact layout

| Path | Produced by | Meaning |
| --- | --- | --- |
| `$OPERATOR_BASE/optimize/<run-id>/skills/` | `optimize` | Baseline and candidate skill snapshots. |
| `$OPERATOR_BASE/optimize/<run-id>/skills/kibi-usage/**/accepted-output/` | optimizer | Durable accepted one-shot and per-step optimizer bodies with hash receipts. |
| `accepted-output/model-paragraph.md` | insertion optimizer | Exact paragraph returned by the model in baseline-preserving insertion mode. |
| `accepted-output/baseline-body.md` | insertion host | Exact canonical baseline bytes used for composition. |
| `accepted-output/composed-body.md` | insertion host | Baseline plus the one host-composed paragraph. |
| `accepted-output/baseline-insertion-plan.json` | insertion host | Hash-bound surface, anchor, and operator objective plan. |
| `accepted-output/composition-receipt.json` | insertion host | Independent insertion, baseline, paragraph, and composed-body hashes. |
| `$OPERATOR_BASE/optimize/<run-id>/steps/` | `optimize` | Per step candidate and development receipts. |
| `$OPERATOR_BASE/optimize/<run-id>/best_skill.md` | `optimize` | The current best candidate body. |
| `$OPERATOR_BASE/optimize/<run-id>/runtime_state.json` | `optimize` | Runtime state summary for the optimizer. |
| `$OPERATOR_BASE/optimize/<run-id>/history.json` | `optimize` | Step history for the optimizer. |
| `$OPERATOR_BASE/optimize/<run-id>/optimization-review.json` | `optimize` | Candidate hashes, safety results, and the external-verdict-required production handoff. |
| `$OPERATOR_BASE/optimize/<run-id>/episodes/<episode-id>/` | `runCodexCell` | Ephemeral Codex episode evidence, including broker and host receipts. |
| `$OPERATOR_BASE/fixtures/<run-id>/` | `optimize` | Materialized public/held-out fixture corpus for that run. |

`$OPERATOR_BASE` prefers `~/.cache/kibi-skillopt/operator` (or `$XDG_CACHE_HOME`) so paid optimizer last-messages survive logout; `$XDG_RUNTIME_DIR/kibi-skillopt/operator` remains a writable fallback, then a private temp directory. Each optimizer attempt copies `--output-last-message` and parse errors to `failed-output/` before the ephemeral workspace is removed.

The smoke gate requires the shell isolation probe exactly once and one model-originated read-only `kb_semantic_advisor` call. It verifies the matching successful `tools/call` broker trace, valid hash chain, and successful `.kb/usage.log` diagnostic receipt before optimization starts. The probe suppresses the expected read-only-write denial so exact-output evidence contains only its pass token. If a real cell reports infrastructure failure, the command stops immediately and emits a structured `cell_infrastructure_failure` no-go result; this is distinct from `HELD_OUT_MATRIX_INELIGIBLE`, which is reserved for a complete matrix with behavioral gate failures.

Real cell final-state scoring uses the independent verifier's all-entity `kb_query`, `kb_check`, and `kb_status` receipts. Valid evidence that shows a wrong fact or predicate lane is a behavioral failure and the optimizer may continue; `evidence-conflict` is reserved for malformed, unbound, hash-invalid, or contradictory evidence.

The held-out predicate supplement always reserves all 36 cells for four cases, three variants, and three replicates. All SkillOpt predicate cells must hard-pass. Baseline and one-shot misses remain comparator evidence and do not by themselves veto a successful candidate; the ordinary paired and bundle gates still compare all three variants.

## Recovery

If a run stalls, start a new `bun run skillopt:optimize` with a fresh run id and pass the prior `candidate_skill.md` through `--seed-candidate` when it is worth retaining. To discard a partial tree, delete the printed `artifact-root` and `fixture-run-root` paths only after preserving any accepted candidate bodies. Local review remains non-mutating on retries; production adoption is an external verdict and installer handoff.

## Cursor compatibility lane (non-authoritative)

The Codex run lock, optimizer, and sealed held-out matrix remain Codex-only (`hosts: ["codex"]`). The Cursor lane cross-checks frozen candidate bodies on the `cursor-agent` CLI and never steers optimization or adoption:

1. `bun run skillopt:cursor qualify` — fail-closed checks for version, an authenticated session, available models, and an approved Kibi MCP server. The receipt records booleans/versions only; tokens and account identifiers are never persisted.
2. Materialize fixtures once per run (reuse the printed `fixture-run-root` from `skillopt:optimize`, or materialize offline) and freeze candidate bodies.
3. `bun run skillopt:cursor compat --skill <skill> --candidate <candidate_skill.md> --fixture-run-root <root>` — development phase runs baseline + one-shot (optional) + candidate across the four development tasks; held-out phase runs candidate-only across that skill's held-out tasks.
4. Verdicts: development is `compatible` only with zero security failures, mean score ≥ 70, and hard-pass rate ≥ 0.5 on the candidate; held-out results are informational. Anything else reports `incompatible` or `not-qualified` and blocks the compatibility handoff without altering Codex rankings.

Cursor cells run unsandboxed inside their disposable workspace copy (no bwrap equivalent), so their evidence is advisory by construction. Reports are written to `$OPERATOR_BASE/cursor/<run-id>/cursor-compat.json` alongside per-cell receipts, transcripts, broker traces, and independent final-state receipts.
