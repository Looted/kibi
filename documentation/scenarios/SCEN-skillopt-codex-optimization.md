---
id: SCEN-skillopt-codex-optimization
title: Codex-only SkillOpt candidates are gated before adoption
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-08-03T00:00:00Z
source: documentation/facts/FACT-skillopt-methodology.md
priority: must
tags: [skillopt, codex, evaluation, security]
links:
  - type: verified_by
    target: TEST-skillopt-codex-optimization
---

Given frozen baseline, one-shot, and SkillOpt skill-body variants with unchanged frontmatter and resources, when the evaluator scores 16 held-out tasks per variant and eight bundle tasks on Codex, then it applies the preregistered aggregate, family, bootstrap, security, and explicit-approval gates without treating OpenCode or Cursor as evaluated hosts.

Given the balanced public corpus, when optimization runs with `--max-steps 4`, then `gpt-5.6-sol` at xhigh effort performs four complete proposal rounds over all eight training cases, each proposal is scored across all four development families, and behavioral partial scores plus structured failure/tool/final-state evidence remain available to reflection.

Given baseline and one-shot development results, when training begins, then the stronger comparator seeds the trainer. If the frozen candidate does not strictly improve its development mean without hard-pass or worst-family regression, held-out evaluation is not launched and the review reports `development_gate_ineligible`; otherwise the blinded matrix runs. Comparator misses in the complete 36-cell predicate supplement do not veto candidate predicate success, while any SkillOpt predicate miss does.

Given a non-fake bridge request with the source worktree, fixture, evaluator manifest, and artifact root, when the bridge evaluates a candidate, then it delegates the episode to the isolated Codex cell runner with the real login and MCP dependencies.

Given a paid optimization run with development, trainer-bridge, and held-out cells, when runtime staging completes, then every cell receives the same absolute staged Codex and bwrap paths and the private lease is removed after the run. If any infrastructure, interruption, budget, or evidence-conflict failure occurs, later cells are not launched and the run returns a structured no-go without a terminal eligibility review; ordinary behavioral failures continue through the gates.

Given a target fixture without Git metadata or an existing branch KB, when Codex launches the target broker and the independent verifier launches Kibi, then the MCP server configuration and verifier environment both use the `skillopt-eval` branch, the first attachment persists an empty snapshot, and repeated query/check/status calls remain valid. Target calls to the evaluator-owned allowlisted broker may execute noninteractively, while optimizer calls still rely on read-only annotations. The paid smoke fails unless a model-originated `kb_status` call succeeds through that Codex-launched broker.
