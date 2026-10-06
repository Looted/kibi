---
title: Bootstrap keeps a separate budget for discovered candidates and a readable suppression summary
status: open
priority: must
tags:
  - bootstrap
  - intent-claims
  - candidate-budget
rationale: An Oct 6 2026 test project rerun declared 50 to 85 intent claims, which used the shared maxCandidates budget so every discovered symbol, test and document was over_limit, and the plan listed hundreds of suppression rows for review.
semantic_text: The bootstrap planner must give discovered candidates the full maxCandidates budget regardless of how many declared intent claims are planned. The bootstrap planner must exclude generic Markdown candidates by default when intent claims are declared and the caller does not set includeGenericMarkdown. The bootstrap planner must summarize suppressed candidates as one count per reason in the plan summary and diagnostics.
semantic_clauses:
  - The bootstrap planner must give discovered candidates the full maxCandidates budget regardless of how many declared intent claims are planned.
  - The bootstrap planner must exclude generic Markdown candidates by default when intent claims are declared and the caller does not set includeGenericMarkdown.
  - The bootstrap planner must summarize suppressed candidates as one count per reason in the plan summary and diagnostics.
logic_claims:
  - CLAIM-A900915ADEF15D76
  - CLAIM-C7EAE131A312526B
  - CLAIM-AF25B0BCBB6FD237
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: separate bootstrap budget for discovered candidates after a test project rerun'
  recorded_at: '2026-10-06T15:22:14.002Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 66a3d840b0e94c4ccedfe8485d9d880ce65ae8422935ca13d65e11cbfcbb8ba1
semantic_inventory:
  - claim_key: CLAIM-A900915ADEF15D76
    claim_text: The bootstrap planner must give discovered candidates the full maxCandidates budget regardless of how many declared intent claims are planned
    role: normative
    status: modeled
    span:
      start: 0
      end: 141
  - claim_key: CLAIM-C7EAE131A312526B
    claim_text: The bootstrap planner must exclude generic Markdown candidates by default when intent claims are declared and the caller does not set includeGenericMarkdown
    role: normative
    status: modeled
    span:
      start: 143
      end: 299
  - claim_key: CLAIM-AF25B0BCBB6FD237
    claim_text: The bootstrap planner must summarize suppressed candidates as one count per reason in the plan summary and diagnostics
    role: normative
    status: modeled
    span:
      start: 301
      end: 419
id: REQ-bootstrap-discovered-candidate-budget
type: req
---
The bootstrap planner must give discovered candidates the full maxCandidates budget regardless of how many declared intent claims are planned. The bootstrap planner must exclude generic Markdown candidates by default when intent claims are declared and the caller does not set includeGenericMarkdown. The bootstrap planner must summarize suppressed candidates as one count per reason in the plan summary and diagnostics.
