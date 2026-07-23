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
| `skillopt:canary` | `bun run scripts/skillopt-eval/cli.ts smoke --run-id 00000000-0000-4000-8000-000000000091` | Capability canary, also Codex-only and zero-cost. |
| `skillopt:dry-run` | `bun run scripts/skillopt-eval/cli.ts dry-run --run-id 00000000-0000-4000-8000-000000000092` | Writes the zero-cost dry-run artifact tree. |
| `skillopt:prepare` | `bun run scripts/skillopt-eval/cli.ts prepare --run-id 00000000-0000-4000-8000-000000000092` | Same dry-run shape, with the prepare command name. |
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
| `optimize` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Uses the offline workflow until the real smoke gate lands. |
| `evaluate` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Same offline rule as optimize. |
| `bundle` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Same offline rule as optimize. |
| `run` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Fake only until the bounded real smoke gate is enabled. |
| `resume` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Continues the same fake run root. |
| `status` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Reads the current state and does not mutate artifacts. |

The public script surface stops here. The separate report, approve, and adopt
helpers are part of the approval gate work, and they should not be called from
the root package scripts yet.

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

## Approval gate

Approval is a separate step from the fake workflow. The gate uses report,
proposal, and approval artifacts, then only allows adoption when the hashes and
approval receipt line up. Until the separate helper commands land, keep the root
scripts on the fake path and do not call unsupported adoption commands.

## Price-equivalent semantics

`priceEquivalentEstimate.amount` is a USD price-equivalent, not an invoice.
Ledger entries use the `price-equivalent-estimate-not-invoice` kind so cost
tracking stays explicit and capped per request.

## Codex-only evidence

Preflight and smoke are Codex-only evidence gates. The run lock pins the host
shape to Codex, uses the existing login mode, and keeps the evaluator on curated
synthetic fixtures instead of raw provider output.

## Recovery

If a fake run gets stuck or the state looks stale, delete the matching
`artifacts/skillopt/<run-id>` directory and rerun the same fake command with a
fresh run id. If the source lock changes, rerun `skillopt:verify-pin` before
starting another gate. If the run lock hashes do not match, start a new run id
instead of reusing the old root.
