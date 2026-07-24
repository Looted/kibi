# SkillOpt operator guide

SkillOpt is an isolated research tool. It is not a runtime dependency of Kibi,
and the root package scripts only expose the supported command surface.

## Prerequisites

| Check | Command | Why |
| --- | --- | --- |
| Lock the isolated Python environment | `uv sync --project tools/skillopt --frozen` | Keeps the pinned SkillOpt toolchain fixed. |
| Verify the committed source lock | `uv run --project tools/skillopt python tools/skillopt/verify_pin.py` | Confirms the checked in commit, version, and receipt still match. |
| Run the isolated Python tests | `uv run --project tools/skillopt python -m unittest discover -s tools/skillopt/tests` | Checks the embedded evaluator without touching the main workspace. |

## Package scripts

| Script | Command | Notes |
| --- | --- | --- |
| `skillopt:help` | `bun run scripts/skillopt-eval/cli.ts --help` | Prints the supported command set and workflow flags. |
| `skillopt:prototype` | `bun run scripts/skillopt-eval/cli.ts` | Legacy alias that still falls through to help. |
| `skillopt:preflight` | `bun run scripts/skillopt-eval/cli.ts preflight --run-id 00000000-0000-4000-8000-000000000091` | Codex-only evidence gate with no paid model calls. |
| `skillopt:canary` | `bun run scripts/skillopt-eval/cli.ts smoke --run-id 00000000-0000-4000-8000-000000000091` | Bounded two-model Codex capability canary; may incur paid model calls. |
| `skillopt:dry-run` | `bun run scripts/skillopt-eval/cli.ts dry-run --run-id 00000000-0000-4000-8000-000000000092` | Writes the zero-cost dry-run artifact tree. |
| `skillopt:prepare` | `bun run scripts/skillopt-eval/cli.ts prepare --run-id 00000000-0000-4000-8000-000000000092` | Same dry-run shape, with the prepare command name. |
| `skillopt:optimize` | `bun run scripts/skillopt-eval/cli.ts optimize --skill all --allow-paid --run-id <uuid>` | Runs the real Codex optimizer, applies automatic safety/surface gates, and adopts passing candidates; requires explicit paid-run acknowledgment. |
| `skillopt:fake:run` | `bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093` | Runs the offline workflow without paid calls. |
| `skillopt:fake:resume` | `bun run scripts/skillopt-eval/cli.ts resume --fake --run-id 00000000-0000-4000-8000-000000000093` | Resumes the same offline workflow. |
| `skillopt:fake:status` | `bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093 && bun run scripts/skillopt-eval/cli.ts status --run-id 00000000-0000-4000-8000-000000000093` | Boots a fake run, then reads back its state. |

## Direct CLI commands

| Command | Flags | Artifact root | Notes |
| --- | --- | --- | --- |
| `preflight` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Evidence gate for Codex-only setup checks. |
| `smoke` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Capability canary, still zero-cost. |
| `dry-run` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Creates `dry-run.json` and does not call a paid model. |
| `prepare` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Same zero-cost artifact shape as dry-run. |
| `optimize` | `--skill <id\|all>`, `--allow-paid`, `--max-steps 1..4`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Runs Codex-only SkillOpt generation after preflight/smoke, then automatically adopts candidates that pass safety and immutable-surface gates. |
| `evaluate` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Same offline rule as optimize. |
| `bundle` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Same offline rule as optimize. |
| `run` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Fake only until the bounded real smoke gate is enabled. |
| `resume` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Continues the same fake run root. |
| `status` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Reads the current state and does not mutate artifacts. |

The public script surface stops here. The separate report, approve, and adopt
helpers remain available for offline review artifacts and higher-assurance
behavioral evaluation.

## Artifact layout

| Path | Produced by | Meaning |
| --- | --- | --- |
| `artifacts/skillopt/<run-id>/dry-run.json` | `dry-run`, `prepare` | Zero-cost command receipt. |
| `artifacts/skillopt/<run-id>/run.lock` | `run`, `resume` | Run lock for the offline workflow. |
| `artifacts/skillopt/<run-id>/state.json` | `run`, `resume` | Current run state, which `status` reads back. |
| `artifacts/skillopt/<run-id>/ledger.jsonl` | `run`, `resume` | Append only cost ledger with price-equivalent entries. |
| `artifacts/skillopt/<run-id>/skills/` | `optimize` | Snapshot of canonical and candidate skill bodies. |
| `artifacts/skillopt/<run-id>/steps/` | `optimize` | Per-step candidate and development receipts. |
| `artifacts/skillopt/<run-id>/best_skill.md` | `optimize` | The current best candidate body. |
| `artifacts/skillopt/<run-id>/runtime_state.json` | `optimize` | Runtime state summary for the optimizer. |
| `artifacts/skillopt/<run-id>/history.json` | `optimize` | Step history for the optimizer. |
| `artifacts/skillopt/<run-id>/optimization-review.json` | `optimize` | Candidate hashes, automatic safety-gate results, and adoption receipts. |

## Automatic adoption gate

The real `optimize` command automatically adopts a generated candidate only after
the candidate body passes safety validation and its frontmatter/resources hashes
match the canonical surface. Adoption uses the transactional canonical-and-mirror
write path with rollback on mirror-sync failure. The command writes
`optimization-review.json` with the candidate hash, safety result, and adoption
receipt. It does not commit or push the resulting source change.

The separate report/proposal/approval workflow remains available for offline
artifacts and higher-assurance behavioral evaluation. Automatic safety adoption
must not be described as a behavioral evaluation pass.

## Price-equivalent semantics

`priceEquivalentEstimate.amount` is a USD price-equivalent, not an invoice.
Ledger entries use the `price-equivalent-estimate-not-invoice` kind so cost
tracking stays explicit and capped per request.

## Codex-only evidence

Preflight is a zero-cost setup gate. Smoke is a bounded two-model Codex evidence gate and may incur paid model calls. The run lock pins the host
shape to Codex, uses the existing login mode, and keeps the evaluator on curated
synthetic fixtures instead of raw provider output.

## Real optimization command

After the source branch is committed and clean, run:

```bash
bun run skillopt:verify-pin
bun run skillopt:preflight
bun run skillopt:canary
bun run skillopt:optimize --skill all --allow-paid --max-steps 1 --run-id <uuid>
```

Use a single canonical skill instead of `all` to bound the first run, for example
`--skill kibi-usage`. `--allow-paid` is mandatory and the command uses the
existing Codex login only. The command automatically adopts candidates that pass
the safety and immutable-surface gates; it does not commit, push, or publish.

## Recovery

If a fake run gets stuck or the state looks stale, delete the matching
`artifacts/skillopt/<run-id>` directory and rerun the same fake command with a
fresh run id. If the source lock changes, rerun `skillopt:verify-pin` before
starting another gate. If the run lock hashes do not match, start a new run id
instead of reusing the old root.
