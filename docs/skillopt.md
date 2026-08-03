# SkillOpt operator guide

SkillOpt is an isolated review tool, not a runtime dependency of Kibi. Real runs use the existing authenticated Codex CLI login from your home directory, then copy that login into a private Codex home before any paid call. Local review remains non-mutating: it never changes a canonical skill and every production outcome remains `external-verdict-required`.

## Prerequisites

| Check | Command | Why |
| --- | --- | --- |
| `uv` on PATH | `uv --version` | Operator scripts sync and verify the pinned SkillOpt Python toolchain. |
| Authenticated Codex CLI | `codex login status` | Must report `Logged in using ChatGPT` before paid smoke or optimize. |
| Bubblewrap | `bwrap --version` | Required for the isolated Codex capability canary and cell sandboxes. |
| Clean source worktree | `git status --porcelain` must be empty | Paid optimize preflight rejects dirty trees (`source_not_clean`). |

## Trust-plane scope

**Primary path for improving `kibi-usage`:** authenticated Codex CLI SkillOpt. Use the two package scripts below. They verify the pin, confirm the Codex login, and run the paid pipeline. `prepareExistingLogin` only mirrors that operator-owned session into a private Codex home; it does not provision credentials.

Canonical skill mutation still requires a separate production-adoption verdict; SkillOpt review artifacts alone do not rewrite production skills.

An optional privileged verifier/installer lane (`kibi-skillopt-trust-v1`) exists for independent production verification/adoption evidence. It is **not** a prerequisite for Codex SkillOpt review runs or for merging this harness.

`prepareExistingLogin` copies an existing `~/.codex/auth.json` into a private Codex home with mode `0600`, rejects provider API key env vars, and revalidates `codex login status`.

## Package scripts

| Script | Command | Notes |
| --- | --- | --- |
| `skillopt:smoke` | `bun run scripts/skillopt-eval/operator.ts smoke` | Verifies the SkillOpt pin and Codex login, then runs the paid two-model capability canary. |
| `skillopt:optimize` | `bun run scripts/skillopt-eval/operator.ts optimize` | Verifies pin and login, materializes fixtures, allocates artifact roots, then runs paid `kibi-usage` optimize (preflight, smoke, Codex rewrite, public development gate, held-out gates). Writes non-mutating review evidence only. Defaults to `--max-steps 1`; pass `--max-steps 1..4` for that many complete proposal rounds. |

```bash
bun run skillopt:smoke
bun run skillopt:optimize
bun run scripts/skillopt-eval/operator.ts optimize --max-steps 4
```

`skillopt:optimize` prints `run-id`, `max-steps`, `artifact-root`, and `fixture-run-root` on stderr. Review output is stored **outside the source worktree** under `$XDG_RUNTIME_DIR/kibi-skillopt/operator/` (falling back to `~/.cache` or the process temp dir), including `optimization-review.json`.

## What optimize runs

1. `uv sync --project tools/skillopt --frozen` and `verify_pin.py`
2. `codex login status` must already say `Logged in using ChatGPT`
3. Fresh run id, explicit artifact root outside the protected source tree, and materialized fixture corpus
4. Preflight and paid capability canary. Target rollouts use `gpt-5.4-mini` at low effort; the one-shot and iterative optimizer use `gpt-5.6-sol` at xhigh effort.
5. Score baseline and one-shot on the balanced four-case public development set, seed the trainer with the stronger result, then run `--max-steps` complete rounds over all eight balanced training cases. Behavioral misses retain partial scores and structured public evidence for reflection.
6. Require the candidate to improve development mean without hard-pass or worst-family regression. A miss returns `development_gate_ineligible` with held-out `not-run`; a pass proceeds to the blinded held-out aggregate gates. The real cells reuse one private staged Codex/bwrap runtime for the entire run. Each non-Git fixture pins the target, Codex MCP configuration, broker, and independent verifier to the same `skillopt-eval` Kibi branch; target-only MCP approval is limited to the evaluator-owned allowlisted broker.
7. External production verdict handoff (`external-verdict-required`); no local canonical skill adoption

The outer trainer deadline is derived from the internal four-case baseline selection, all 12 target cells per requested round, one optimizer allowance per round, and startup grace. A four-round run therefore cannot be cut off by the old fixed 15-minute `uv` deadline; an actual outer timeout is reported as a structured training infrastructure no-go with its diagnostic path.

Diagnostic reconciliation is the multiset of successful model-originated Kibi calls. When the model makes no Kibi call, the matching usage-receipt multiset is legitimately empty and the missing required call is scored as a behavioral protocol failure. A non-empty successful-call multiset without matching usage receipts remains an infrastructure no-go.

## Artifact layout

| Path | Produced by | Meaning |
| --- | --- | --- |
| `$OPERATOR_BASE/optimize/<run-id>/skills/` | `optimize` | Baseline and candidate skill snapshots. |
| `$OPERATOR_BASE/optimize/<run-id>/steps/` | `optimize` | Per step candidate and development receipts. |
| `$OPERATOR_BASE/optimize/<run-id>/best_skill.md` | `optimize` | The current best candidate body. |
| `$OPERATOR_BASE/optimize/<run-id>/runtime_state.json` | `optimize` | Runtime state summary for the optimizer. |
| `$OPERATOR_BASE/optimize/<run-id>/history.json` | `optimize` | Step history for the optimizer. |
| `$OPERATOR_BASE/optimize/<run-id>/optimization-review.json` | `optimize` | Candidate hashes, safety results, and the external-verdict-required production handoff. |
| `$OPERATOR_BASE/optimize/<run-id>/episodes/<episode-id>/` | `runCodexCell` | Ephemeral Codex episode evidence, including broker and host receipts. |
| `$OPERATOR_BASE/fixtures/<run-id>/` | `optimize` | Materialized public/held-out fixture corpus for that run. |

`$OPERATOR_BASE` is `$XDG_RUNTIME_DIR/kibi-skillopt/operator` when the runtime dir is writable; otherwise `~/.cache/kibi-skillopt/operator` or a private temp directory.

The smoke gate requires the shell isolation probe, one model-originated `kb_semantic_advisor` call, and one model-originated branch-dependent `kb_status` call that reports `skillopt-eval`. It verifies both broker hash-chain entries and their successful diagnostic usage receipts before optimization starts. The probe suppresses the expected read-only-write denial so exact-output evidence contains only its pass token. If a real cell reports infrastructure failure, the command stops immediately and emits a structured `cell_infrastructure_failure` no-go result; this is distinct from `HELD_OUT_MATRIX_INELIGIBLE`, which is reserved for a complete matrix with behavioral gate failures.

Real cell final-state scoring uses the independent verifier's all-entity `kb_query`, `kb_check`, and `kb_status` receipts. Valid evidence that shows a wrong fact or predicate lane is a behavioral failure and the optimizer may continue; `evidence-conflict` is reserved for malformed, unbound, hash-invalid, or contradictory evidence.

The held-out predicate supplement always reserves all 36 cells for four cases, three variants, and three replicates. All SkillOpt predicate cells must hard-pass. Baseline and one-shot misses remain comparator evidence and do not by themselves veto a successful candidate; the ordinary paired and bundle gates still compare all three variants.

## Recovery

If a run stalls, start a new `bun run skillopt:optimize` (fresh run id). To discard a partial tree, delete the printed `artifact-root` and `fixture-run-root` paths. Local review remains non-mutating on retries; production adoption is an external verdict and installer handoff.
