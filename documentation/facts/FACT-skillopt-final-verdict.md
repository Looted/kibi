---
id: FACT-skillopt-final-verdict
title: SkillOpt Kibi skills evaluation bounded no-go
status: active
created_at: 2026-07-21T16:00:00Z
updated_at: 2026-07-21T16:00:00Z
source: documentation/facts/FACT-skillopt-final-verdict.md
tags:
  - skillopt
  - evaluation
  - no-go
fact_kind: meta
---

# SkillOpt Kibi skills evaluation: bounded no-go

## Result

The offline methodology contract, pinned SkillOpt environment, deterministic vertical slice, fixture catalog, and fail-closed preflight were implemented and verified. The experiment stopped before any paid model call because the required Codex host CLI is not installed in the execution environment.

The preflight receipt is `preflight-001.json`. It records the pinned SkillOpt commit, target and optimizer models, zero paid calls, and `missing_host:codex`. Cursor's required `cursor-agent` CLI is also unavailable; OpenCode is present but cannot satisfy the all-host gate alone.

## Adoption decision

No skill candidate was generated or adopted. The canonical skill sources and generated mirrors remain unchanged. The remaining held-out gates are intentionally marked unstarted rather than treated as failures or silently dropped hosts.

## Evidence

- Methodology: `documentation/facts/FACT-skillopt-methodology.md`
- Pinned source: `tools/skillopt/source-lock.json`
- Offline evaluator: `scripts/skillopt-eval/`
- Preflight: `documentation/evaluations/skillopt/results/preflight-001.json`
- Traceability: `REQ-skill-behavioral-efficacy -> SCEN-skill-behavioral-efficacy -> TEST-skill-behavioral-efficacy`

## Scope limitation

This is a hard no-go for the approved all-host experiment in this environment, not evidence that SkillOpt cannot improve Kibi skills. Re-run `bun run skillopt:preflight -- --run-id <id>` only in an environment with authenticated `codex`, `opencode`, and `cursor-agent` CLIs, the pinned models, auditable usage, and the required isolation boundary.
