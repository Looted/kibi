---
title: Search answers and check results say what they did not find as plainly as what they found
status: open
required_evidence: tested
tags:
  - search
  - checks
  - search-lane
priority: must
semantic_text: A kb_search answer must list the matched facts, scenarios, symbols and tests that no requirement owns with their rank and say when the top-ranked match is one of them. The kb_search ambiguity flag must ignore a tie between the top match and an entity linked to it in the traceability graph. A kb_search with source locations must match the requirements that a located symbol implements even without lexical overlap. A kb_check result must report the rules it evaluated and the number of requirement fact pairs the domain-contradictions rule compared.
logic_claims:
  - CLAIM-ED7E0BF06792779D
  - CLAIM-BE4EA2755349D744
  - CLAIM-D962F4C31CEDC2AA
  - CLAIM-A6A0815BED6913CE
semantic_clauses:
  - A kb_search answer must list the matched facts, scenarios, symbols and tests that no requirement owns with their rank and say when the top-ranked match is one of them.
  - The kb_search ambiguity flag must ignore a tie between the top match and an entity linked to it in the traceability graph.
  - A kb_search with source locations must match the requirements that a located symbol implements even without lexical overlap.
  - A kb_check result must report the rules it evaluated and the number of requirement fact pairs the domain-contradictions rule compared.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: 'Search-lane round 1 showed four ways an agent read more into a kb_search or kb_check response than it said: requirements promoted from lower hits read as the top hit''s, a requirement tying with its own scenario read as ambiguous, a changed file''s own requirement never surfaced without lexical overlap, and zero contradiction violations over zero compared pairs read as consistency.'
semantic_source_hash: 19f3b7c9ccf5788998d55c5a37ff1b1cfa87a7ff0b4c28dd3583fb2107d667e8
semantic_inventory:
  - claim_key: CLAIM-ED7E0BF06792779D
    claim_text: A kb_search answer must list the matched facts, scenarios, symbols and tests that no requirement owns with their rank and say when the top-ranked match is one of them
    role: normative
    span:
      start: 0
      end: 166
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-BE4EA2755349D744
    claim_text: The kb_search ambiguity flag must ignore a tie between the top match and an entity linked to it in the traceability graph
    role: normative
    span:
      start: 168
      end: 289
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-D962F4C31CEDC2AA
    claim_text: A kb_search with source locations must match the requirements that a located symbol implements even without lexical overlap
    role: normative
    span:
      start: 291
      end: 414
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A6A0815BED6913CE
    claim_text: A kb_check result must report the rules it evaluated and the number of requirement fact pairs the domain-contradictions rule compared
    role: normative
    span:
      start: 416
      end: 549
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
origin:
  kind: agent
  recorded_at: '2026-10-11T19:54:22.919Z'
id: REQ-search-answer-hygiene
type: req
---
# Search answers and check results say what they did not find as plainly as what they found

A kb_search answer must list the matched facts, scenarios, symbols and tests that no requirement owns with their rank and say when the top-ranked match is one of them. The kb_search ambiguity flag must ignore a tie between the top match and an entity linked to it in the traceability graph. A kb_search with source locations must match the requirements that a located symbol implements even without lexical overlap. A kb_check result must report the rules it evaluated and the number of requirement fact pairs the domain-contradictions rule compared.

## Context

In search-lane round 1 on the test project, four responses were read for more than they said. A4 and probe 3: a search for a role fact ranked two facts no requirement owns first, and the answer layer listed the requirements owning lower-ranked scenarios as governing without saying the top hits had none. A5: a requirement and its own facts tied at the top and `ambiguous` was set although nothing competed. Probe 1: a coder's question with the file's source location never surfaced the requirement the file's symbols implement, because source locations only re-weighted entities that already cleared lexical gating. A8: `kb_check` with `domain-contradictions` returned zero violations on a KB where no two requirements constrained the same case, and nothing distinguished that from consistency. Asked by the project owner through the search-lane fix PRs (analysis in the project files, fix PR 5). The answer layer therefore carries `ungoverned`, intent search reads ambiguity from `topRivalMargin` and inherits source evidence through `implements`, kb_search reports `returned` beside `count`, and kb_check reports `evaluated`.

## Source

> "`answer.governing` lists `REQ-AUTO-47401C4567434774`, `REQ-AUTO-FBB004CCA626FD53`, `REQ-SL-ROLE-LIMIT`; `rationale: []`. Confirmed: the answer layer promotes requirements behind lower-ranked scenario hits and never says the top hits have no governing requirement." - round 1 analysis, probe 3 and PR-5 items.