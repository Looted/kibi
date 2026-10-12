---
title: An agent previews a permission requirement before writing the fact kb_model planned
status: active
tags:
  - modeling
  - mutation
  - planning
  - search-lane
priority: must
origin:
  kind: agent
  recorded_at: '2026-10-11T19:12:22.581Z'
id: SCEN-model-what-if-planned-facts
type: scenario
---
# An agent previews a permission requirement before writing the fact kb_model planned

Given a test-project KB that stores an allow permission_rule for coaches reading unassigned analysis requests, and two ungrounded requirements, one denying that same permission and one granting coaches access to assigned requests
When the agent calls kb_model mode predicates for the deny requirement with complete bindings
Then the candidate is eligible and `plan` is a kibi.compile-plan.v1 with a planHash whose status is blocked, whose contradictionAnalysis names the decision conflict on that permission key, and a warning says the plan is blocked
When the agent dry-runs the deny requirement with its requires_predicate link and the planned fact in `plannedFacts`
Then the grounding target resolves from the plan and the dry run is refused with "Contradiction detected" and the decision conflict reason, while the same dry run without `plannedFacts` fails only on the missing fact
And a real write that carries `plannedFacts` is rejected as a dry-run-only input
When the agent calls kb_model for the assigned-requests requirement
Then `plan` is ready with no conflict, the dry run with the planned fact is valid and reports the staged fact and an empty introduced witness list
And kb_apply_plan with that plan and its planHash writes the fact and the requires_predicate link in one call, keeps the requirement's ledger with the claim modeled and its authored body, and kb_check reports no contradiction or logic-coverage violation for it
