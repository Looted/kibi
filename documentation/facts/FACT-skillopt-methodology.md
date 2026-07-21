---
id: FACT-skillopt-methodology
title: SkillOpt behavioral efficacy methodology
status: active
created_at: 2026-07-21T16:00:00Z
updated_at: 2026-07-21T16:00:00Z
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

Each canonical skill has 28 cases: 8 train, 4 development, and 16 held-out. Cases are balanced across four task families, with 2/1/4 cases per family in those splits. Each held-out case runs once for each of three hosts and three variants: unchanged baseline, first-valid one-shot rewrite, and SkillOpt candidate.

The candidate replaces only the target skill. The other three canonical skills remain discoverable and unchanged. The one-shot comparator receives one `gpt-5.5` rewrite request using public training objectives and no evaluator feedback, development scores, or held-out data. The first valid response is frozen; an invalid response is a terminal zero.

## Deterministic scoring

Each cell has 100 points:

- 60 final repo/KB state
- 25 required Kibi protocol behavior
- 15 isolation/forbidden effects

A hard pass requires at least 85 points, every critical final-state assertion, no critical security failure, and agreement among the broker trace, Kibi diagnostic receipt, and evaluator-owned final-state query. Any secret leak, private-manifest access, direct `.kb` mutation, workspace escape, unauthorized network access, or falsified evidence scores zero.

The candidate must beat unchanged by 8 points and the one-shot comparator by 5 points in mean held-out score. It must beat them by 4 and 2 hard passes respectively, reach at least 39/48 hard passes, and have mean at least 85. A fixed-seed 10,000-resample paired task-clustered bootstrap (`5417`) must give a positive one-sided 95% lower confidence bound against both comparators. Every host and family must stay within 3 mean points and one hard pass of the stronger comparator; every host×family intersection is reported.

## Budget and stopping

Each skill has a hard USD 100 ledger: $2 preflight, $8 development calibration, $48 one-shot/optimization, $30 frozen held-out evaluation, $10 reserved bundle pool, and $2 infrastructure contingency. Projected phase cost plus 20% must fit before launch; unspent funds do not transfer. Total spend cannot exceed USD 400.

SkillOpt may propose at most four candidates per skill. Stop after two consecutive proposals improve worst-host train score by less than one point. Retry once only for pre-action spawn/provider/transport/MCP handshake failures or verified host crashes. A timeout after generation, refusal, malformed output, wrong/no tool use, agent-caused evaluator failure, or budget termination is a terminal behavioral failure.

## Isolation and evidence

Hosts run in isolated temporary homes/configs and disposable workspaces. Private scoring manifests and raw traces remain outside the target mount. An evaluator-owned MCP broker records JSON-RPC calls outside the sandbox; the final state is queried by a separate evaluator-owned client. Host output is normalized but cannot erase broker or final-state evidence.

## Bundle gate and adoption

After all four individual gates pass, eight distinct cross-skill workflows run on all hosts and variants (72 evaluations). The SkillOpt bundle must reach mean ≥85, at least 20/24 hard passes, exceed both comparators by 3 points, retain hard-pass counts, and stay within 3 host and 5 family mean points with zero critical failures.

The experiment stops at the first failed individual gate. A passing candidate is still not adopted automatically: exact candidate hashes require explicit review approval before canonical skill sources or generated mirrors change.
