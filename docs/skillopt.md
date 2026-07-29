# SkillOpt operator guide

SkillOpt is an isolated research tool, not a runtime dependency of Kibi. Real runs use the existing authenticated Codex CLI login from your home directory, then copy that login into a private Codex home before any paid call.

## Prerequisites

| Check | Command | Why |
| --- | --- | --- |
| Lock the isolated Python environment | `uv sync --project tools/skillopt --frozen` | Keeps the pinned SkillOpt toolchain fixed. |
| Verify the pinned SkillOpt revision | `uv run --project tools/skillopt python tools/skillopt/verify_pin.py` | Confirms the checked in commit still matches the recorded receipt. |
| Confirm the existing Codex login | `codex login status` | Must report `Logged in using ChatGPT` before a real optimize run. |
| Run the isolated Python tests | `uv run --project tools/skillopt python -m unittest discover -s tools/skillopt/tests` | Checks the embedded evaluator without touching the main workspace. |

The implemented path does not need root owned launchers, private service directories, root owned UIDs, socket activated services, provider API keys, or any external trust plane service.

`prepareExistingLogin` copies an existing `~/.codex/auth.json` into a private Codex home with mode `0600`, rejects provider API key env vars, and revalidates `codex login status`.

The Python bridge owns one POSIX process group for its Bun bridge and all inherited Codex and MCP descendants. On timeout, `SIGINT`, or `SIGTERM`, it sends `TERM` to that group, waits a bounded grace period, then sends `KILL` to the group even if its direct Bun child exited first, and reaps that child. The TypeScript runtime inherits that group rather than detaching another one. Workspace cleanup removes every private root best-effort; an error stays retryable until every removal succeeds, so copied auth is never treated as cleaned before it is removed.

## Real workflow

1. Verify the pin.
   - Run `verify_pin.py` before any paid work.

2. Confirm the Codex login.
   - `codex login status` must already say `Logged in using ChatGPT`.
   - The private login setup only mirrors that existing session, it does not provision new provider credentials.

3. Run preflight and canary.
   - `preflight` checks the source tree, isolated Codex config, and login state.
   - `smoke` runs the bounded capability canary.

4. Prepare, train, and optimize.
   - `runCodexSkillOptStep` uses the real authenticated Codex CLI to rewrite skill bodies.
   - `runCodexCell` evaluates each candidate in a fresh isolated workspace with MCP broker startup and independently captures fact queries, validation output, and status. The evaluator manifest must match the requested task ID before a cell can launch.

5. Run a fresh development evaluation.
   - Development scoring happens on a fresh workspace, not on the training transcript.
   - The result is recorded in the optimizer review artifact.

6. Run the blinded held out aggregate gate.
   - Baseline, one shot, and SkillOpt candidates are scored over blinded predicate matrices.
   - Held out task IDs stay private to the evaluator and do not leak into optimizer input.

7. Adopt exactly once.
   - `runRealOptimization` writes `optimization-review.json`, then `adoptSkillOptCandidate` mutates the canonical skill only when the held out gate passes.
   - Retried runs with the same `run-id` reuse the existing run store and adoption WAL instead of creating a second adoption.

## Real versus fake modes

| Mode | Command shape | What it does |
| --- | --- | --- |
| Real authenticated Codex | `bun run scripts/skillopt-eval/cli.ts optimize --skill <id\|all> --allow-paid --run-id <uuid> --fixture-root <path> --evaluator-manifest <path>` | Uses the existing Codex login, a bounded fixture root, and a private evaluator manifest; may make paid calls and runs the full train, evaluate, gate, and adopt flow. |
| Offline fake | `--fake` on `run`, `resume`, `status`, `report`, `approve`, `adopt` | Stays offline, writes review artifacts, and never makes paid calls. |
| Zero cost setup | `dry-run`, `prepare`, `preflight`, `smoke` | Proves the environment and write path without a paid model call. |

`--fake` is only for offline review artifacts and tests. Real optimize never uses `--fake`.

## Package scripts

| Script | Command | Notes |
| --- | --- | --- |
| `skillopt:help` | `bun run scripts/skillopt-eval/cli.ts --help` | Prints the supported command set and workflow flags. |
| `skillopt:prototype` | `bun run scripts/skillopt-eval/cli.ts` | Legacy alias that still falls through to help. |
| `skillopt:preflight` | `bun run scripts/skillopt-eval/cli.ts preflight --run-id 00000000-0000-4000-8000-000000000091` | Codex only evidence gate with no paid model calls. |
| `skillopt:canary` | `bun run scripts/skillopt-eval/cli.ts smoke --run-id 00000000-0000-4000-8000-000000000091` | Bounded two model Codex capability canary, may incur paid model calls. |
| `skillopt:dry-run` | `bun run scripts/skillopt-eval/cli.ts dry-run --run-id 00000000-0000-4000-8000-000000000092` | Writes the zero cost dry run artifact tree. |
| `skillopt:prepare` | `bun run scripts/skillopt-eval/cli.ts prepare --run-id 00000000-0000-4000-8000-000000000092` | Same dry run shape, with the prepare command name. |
| `skillopt:optimize` | `bun run scripts/skillopt-eval/cli.ts optimize` | Thin alias for the optimize entrypoint. Pass `--run-id` and `--allow-paid` when you need a real paid run. |
| `skillopt:fake:run` | `bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093` | Runs the offline workflow without paid calls. |
| `skillopt:fake:resume` | `bun run scripts/skillopt-eval/cli.ts resume --fake --run-id 00000000-0000-4000-8000-000000000093` | Resumes the same offline workflow. |
| `skillopt:fake:status` | `bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093 && bun run scripts/skillopt-eval/cli.ts status --run-id 00000000-0000-4000-8000-000000000093` | Boots a fake run, then reads back its state. |

## Direct CLI commands

```bash
uv sync --project tools/skillopt --frozen
uv run --project tools/skillopt python tools/skillopt/verify_pin.py
codex login status
bun run scripts/skillopt-eval/cli.ts preflight --run-id <uuid>
bun run scripts/skillopt-eval/cli.ts smoke --run-id <uuid>
bun run scripts/skillopt-eval/cli.ts optimize --skill kibi-usage --allow-paid --run-id <uuid> --fixture-root <path> --evaluator-manifest <path>
```

Use a fresh run id for each paid run. Keep `--fake` for offline review work only.

## Artifact layout

| Path | Produced by | Meaning |
| --- | --- | --- |
| `artifacts/skillopt/<run-id>/dry-run.json` | `dry-run`, `prepare` | Zero cost command receipt. |
| `artifacts/skillopt/<run-id>/run.lock` | `run`, `resume` | Run lock for the offline workflow. |
| `artifacts/skillopt/<run-id>/state.json` | `run`, `resume` | Current run state, which `status` reads back. |
| `artifacts/skillopt/<run-id>/ledger.jsonl` | `run`, `resume` | Append only cost ledger with price equivalent entries. |
| `artifacts/skillopt/<run-id>/skills/` | `optimize` | Baseline and candidate skill snapshots. |
| `artifacts/skillopt/<run-id>/steps/` | `optimize` | Per step candidate and development receipts. |
| `artifacts/skillopt/<run-id>/best_skill.md` | `optimize` | The current best candidate body. |
| `artifacts/skillopt/<run-id>/runtime_state.json` | `optimize` | Runtime state summary for the optimizer. |
| `artifacts/skillopt/<run-id>/history.json` | `optimize` | Step history for the optimizer. |
| `artifacts/skillopt/<run-id>/optimization-review.json` | `optimize` | Candidate hashes, safety results, and adoption receipt. |
| `artifacts/skillopt/<run-id>/episodes/<episode-id>/` | `runCodexCell` | Ephemeral Codex episode evidence, including `raw-host.jsonl`, `raw-stderr.log`, `normalized-events.jsonl`, `broker-trace.jsonl`, `diagnostic-receipt.jsonl`, `final-state.json`, `evidence-index.json`, and `episode-receipt.json`. |

## Recovery

If a fake or real run stalls, rerun with the same `--run-id` to reuse the existing run root. If you need a clean restart, delete `artifacts/skillopt/<run-id>` first. If the source pin changes, rerun `verify_pin.py` and preflight before any paid call. Adoption is crash safe and exactly once because the terminal WAL and stable adoption id are reused on retries.
