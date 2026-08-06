---
id: FACT-skillopt-methodology
title: SkillOpt behavioral efficacy methodology
status: active
created_at: 2026-07-21T16:00:00Z
updated_at: 2026-08-04T00:00:00Z
source: documentation/facts/FACT-skillopt-methodology.md
tags:
  - skillopt
  - evaluation
  - methodology
fact_kind: meta
---

# SkillOpt behavioral efficacy methodology

This preregistration limits conclusions to the pinned fixture matrix, exact host/model lock, and one-run-per-cell policy. It does not establish universal improvement across arbitrary repositories, models, or future host releases.

## Corpus and variants

Each canonical skill has 28 cases: 8 train, 4 development, and 16 held-out. Cases are balanced across four task families, with 2/1/4 cases per family in those splits. Each held-out case runs once on the officially supported Codex CLI host for each of three variants: unchanged baseline, first-valid one-shot rewrite, and SkillOpt candidate. OpenCode and Cursor are not evaluation hosts and receive no behavioral-efficacy claim from this experiment.

The candidate replaces only the target skill. The other three canonical skills remain discoverable and unchanged. Target rollouts use `gpt-5.4-mini` with low reasoning effort. The one-shot comparator and every optimizer proposal use `gpt-5.6-sol` with xhigh reasoning effort. The one-shot request receives public training objectives and no evaluator feedback, development scores, or held-out data. The first valid response is frozen; an invalid response is a terminal zero.

The public learning corpus is the complete balanced 8-train/4-development split, not the smaller predicate-only slice. Every train round sees two cases from each of the four task families, and every development comparison sees one case from each family.

## Deterministic scoring

Each cell has 100 points:

- 60 final repo/KB state
- 25 required Kibi protocol behavior
- 15 isolation/forbidden effects

A hard pass requires at least 85 points, every critical final-state assertion, no critical security failure, and agreement among the broker trace, Kibi diagnostic receipt, and evaluator-owned final-state query. An ordinary behavioral miss retains its earned partial score so the optimizer receives a useful learning signal. Infrastructure, timeout, budget, evidence-conflict, and critical-security outcomes score zero. Any secret leak, private-manifest access, direct `.kb` mutation, workspace escape, unauthorized network access, or falsified evidence scores zero.

The candidate must beat unchanged by 8 points and the one-shot comparator by 5 points in mean held-out score. It must beat them by 2 and 1 hard passes respectively, reach at least 13/16 hard passes, and have mean at least 85. A fixed-seed 10,000-resample paired task-clustered bootstrap (`5417`) must give a positive one-sided 95% lower confidence bound against both comparators. Each of the four family slices must stay within 3 mean points and one hard pass of the stronger comparator. There are no host or host-by-family gates.

## Public development gate

Before training, the unchanged baseline and frozen one-shot variant are scored on all four public development cases. The stronger comparator by mean score, then hard passes, then worst-family mean becomes the trainer's initial skill. Each optimizer proposal is scored on the same development set and the best public candidate is retained by soft score. The frozen candidate may enter held-out evaluation only when its development mean is strictly greater than the stronger comparator while its hard-pass count and worst-family mean do not regress. A miss produces `development_gate_ineligible`, records held-out as `not-run`, and launches no held-out cells.

Trainer reflection receives the full public behavioral evidence needed to learn: status, partial score, all failure categories, sanitized model-originated Kibi tool sequence, and evaluator-owned final-state summary. It must translate that evidence into concise reusable workflow guidance rather than append task IDs, raw JSON, scores, or failure logs to the skill.

Every round also receives a compact cumulative summary of all completed public rollouts: attempts, hard passes, mean soft score, and failure-category counts per family. This retains recurring lessons without repeatedly sending every prior full trajectory. Candidate text is rejected if it embeds Kibi repository release policy, evaluator case identifiers, or public trajectory payloads. The reusable skill must stay package-manager and branch neutral while making clause-complete prose-to-ground-predicate/property modeling explicit. The public predicate training slice includes one compound relational-plus-scalar claim and scores its complete keyed fact manifest, so a candidate cannot improve by teaching only lane selection.

A paid run may start from an explicitly supplied preserved candidate. That seed is the trainer's initial skill, while the fresh canonical baseline and one-shot remain independent comparators. The new run records the seed body hash and byte count before training.

## Machine-readable Codex gates

```json skillopt-codex-gates
{
  "heldOutTasksPerVariant": 16,
  "familySlices": 4,
  "bundleTasks": 8,
  "candidate": {
    "meanMinimum": 85,
    "hardPassesMinimum": 13,
    "hardPassesTotal": 16,
    "meanDeltaMinimum": { "baseline": 8, "oneShot": 5 },
    "hardPassDeltaMinimum": { "baseline": 2, "oneShot": 1 }
  },
  "bootstrap": {
    "resamples": 10000,
    "seed": 5417,
    "confidenceLevel": 0.95,
    "sidedness": "one-sided",
    "lowerBoundExclusiveMinimum": 0,
    "clusterUnit": "task"
  },
  "familyGuard": {
    "maxMeanRegression": 3,
    "maxHardPassRegression": 1
  },
  "bundle": {
    "meanMinimum": 85,
    "hardPassesMinimum": 7,
    "hardPassesTotal": 8,
    "meanDeltaMinimum": { "baseline": 3, "oneShot": 3 },
    "allowHardPassLoss": false,
    "maxCriticalFailures": 0
  }
}
```

## Budget and stopping

Each skill has a hard USD 100 ledger: $2 preflight, $8 development calibration, $48 one-shot/optimization, $30 frozen held-out evaluation, $10 reserved bundle pool, and $2 infrastructure contingency. Projected phase cost plus 20% must fit before launch; unspent funds do not transfer. Total spend cannot exceed USD 400.

`--max-steps` is the number of complete proposal rounds and is constrained to 1–4. Each round rolls out all eight public training cases, reflects once with the structured public evidence, requests one optimizer rewrite, and scores that proposal on all four development cases. The outer trainer deadline is computed from the four internal baseline development cells, all 12 target cells and one optimizer allowance per round, plus startup grace; it is not a fixed 15-minute cap. Retry once only for pre-action spawn/provider/transport/MCP handshake failures or a verified Codex crash. A refusal, malformed output, wrong/no tool use, or agent-caused evaluator miss is a terminal behavioral failure with any earned partial score retained; an empty diagnostic receipt is valid only when the broker confirms there were zero successful model-originated tool calls. Infrastructure, timeout, budget, evidence-conflict, and security outcomes remain zero and stop according to their typed policy.

## Isolation and evidence

Codex runs in an isolated temporary home/config and disposable workspace. Private scoring manifests and raw traces remain outside the target mount. An evaluator-owned MCP broker records JSON-RPC calls outside the sandbox; the final state is queried by a separate evaluator-owned client. Codex output is normalized but cannot erase broker or final-state evidence.

## Bundle gate and adoption

The predicate supplement reserves and completes all 36 predicate cells (four cases × three variants × three replicates) for matrix integrity and paired comparison. Its behavioral predicate gate requires every SkillOpt predicate cell to hard-pass. Baseline and one-shot predicate misses remain comparator evidence and do not independently veto a successful candidate; replicate 1 still participates in the ordinary paired skill gate.

After all four individual gates pass, eight distinct cross-skill workflows run on Codex for each variant. The SkillOpt bundle must reach mean ≥85, at least 7/8 hard passes, exceed both comparators by 3 mean points, lose no hard passes against either comparator, and have zero critical failures.

The experiment stops at the first failed individual gate. A passing candidate is still not adopted automatically: exact candidate hashes require explicit review approval before canonical skill sources or generated mirrors change.
