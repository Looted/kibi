---
title: Bootstrap keeps a separate budget for discovered candidates and a readable suppression summary
status: open
required_evidence: tested
priority: must
tags:
  - bootstrap
  - intent-claims
  - candidate-budget
  - review:context-missing
rationale: An Oct 6 2026 test project rerun declared 50 to 85 intent claims, which used the shared maxCandidates budget so every discovered symbol, test and document was over_limit, and the plan listed hundreds of suppression rows for review.
semantic_text: The bootstrap planner must give discovered candidates the full maxCandidates budget regardless of how many declared intent claims are planned. The bootstrap planner must exclude generic Markdown candidates by default when intent claims are declared and the caller does not set includeGenericMarkdown. The bootstrap planner must summarize suppressed candidates as one count per reason in the plan summary and diagnostics. The bootstrap planner must plan declared intent claims on a seeded knowledge base without generating discovered candidates.
semantic_clauses:
  - The bootstrap planner must give discovered candidates the full maxCandidates budget regardless of how many declared intent claims are planned.
  - The bootstrap planner must exclude generic Markdown candidates by default when intent claims are declared and the caller does not set includeGenericMarkdown.
  - The bootstrap planner must summarize suppressed candidates as one count per reason in the plan summary and diagnostics.
  - The bootstrap planner must plan declared intent claims on a seeded knowledge base without generating discovered candidates.
logic_claims:
  - CLAIM-A900915ADEF15D76
  - CLAIM-C7EAE131A312526B
  - CLAIM-AF25B0BCBB6FD237
  - CLAIM-73B536E6F1C533BC
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: separate bootstrap budget for discovered candidates after a test project rerun'
  recorded_at: '2026-10-06T15:22:14.002Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c794f56b352dd8fedd23b688cdc5a30c19ebd829b5607c3a992eea0d407ccc2c
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
  - claim_key: CLAIM-73B536E6F1C533BC
    claim_text: The bootstrap planner must plan declared intent claims on a seeded knowledge base without generating discovered candidates
    role: normative
    status: modeled
    span:
      start: 421
      end: 543
id: REQ-bootstrap-discovered-candidate-budget
type: req
---
The bootstrap planner must give discovered candidates the full maxCandidates budget regardless of how many declared intent claims are planned. The bootstrap planner must exclude generic Markdown candidates by default when intent claims are declared and the caller does not set includeGenericMarkdown. The bootstrap planner must summarize suppressed candidates as one count per reason in the plan summary and diagnostics.
