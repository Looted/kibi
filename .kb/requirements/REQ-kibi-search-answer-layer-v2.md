---
title: kb_search answers with the current governing requirements, what the checks report about them, and the snapshot it answered from
status: open
priority: must
tags:
  - search
  - intent-search
  - answer-layer
  - discovery
  - verdicts
semantic_text: kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities. By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling. The search answer layer must state that absence of a match is not evidence. Each governing requirement in the search answer layer must carry a verdict of contradiction, infeasible, unknown, or none with the domain-contradiction and scenario-feasibility witnesses that name it. Each governing requirement in the search answer layer must list its exception requirements with their approvers and the unknowns that leave its consistency undecided. A none verdict in the search answer layer must mean only that no check named the requirement. Each rationale ADR in the search answer layer must carry its source path and an excerpt of its decision. The search answer layer must name the branch, snapshot id, and sync time of the KB snapshot it answered from. Under its byte ceiling the search answer layer must drop ADR excerpts before any governing requirement and keep a verdict's status when its witnesses are dropped.
semantic_clauses:
  - kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities.
  - By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling.
  - The search answer layer must state that absence of a match is not evidence.
  - Each governing requirement in the search answer layer must carry a verdict of contradiction, infeasible, unknown, or none with the domain-contradiction and scenario-feasibility witnesses that name it.
  - Each governing requirement in the search answer layer must list its exception requirements with their approvers and the unknowns that leave its consistency undecided.
  - A none verdict in the search answer layer must mean only that no check named the requirement.
  - Each rationale ADR in the search answer layer must carry its source path and an excerpt of its decision.
  - The search answer layer must name the branch, snapshot id, and sync time of the KB snapshot it answered from.
  - Under its byte ceiling the search answer layer must drop ADR excerpts before any governing requirement and keep a verdict's status when its witnesses are dropped.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a429aba05cea11500d4d17422444679659ddc3e5011ce615d1a30a7d83e7ddd3
semantic_inventory:
  - claim_key: CLAIM-8470F42B22C072FA
    claim_text: kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities
    role: normative
    span:
      start: 0
      end: 100
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-6CC80BDBD9B7AAC2
    claim_text: By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling
    role: normative
    span:
      start: 102
      end: 360
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-DED63830C86F15B5
    claim_text: The search answer layer must state that absence of a match is not evidence
    role: normative
    span:
      start: 362
      end: 436
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-A61E360D656E8B57
    claim_text: Each governing requirement in the search answer layer must carry a verdict of contradiction, infeasible, unknown, or none with the domain-contradiction and scenario-feasibility witnesses that name it
    role: normative
    span:
      start: 438
      end: 637
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-AA9AFCE0B5C1C27C
    claim_text: Each governing requirement in the search answer layer must list its exception requirements with their approvers and the unknowns that leave its consistency undecided
    role: normative
    span:
      start: 639
      end: 804
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-BF2A2CD3A3275770
    claim_text: A none verdict in the search answer layer must mean only that no check named the requirement
    role: normative
    span:
      start: 806
      end: 898
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-F0C56A36DC78EF80
    claim_text: Each rationale ADR in the search answer layer must carry its source path and an excerpt of its decision
    role: normative
    span:
      start: 900
      end: 1003
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-69E1B1148768582D
    claim_text: The search answer layer must name the branch, snapshot id, and sync time of the KB snapshot it answered from
    role: normative
    span:
      start: 1005
      end: 1113
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-CDB7E585D60D8A6D
    claim_text: Under its byte ceiling the search answer layer must drop ADR excerpts before any governing requirement and keep a verdict's status when its witnesses are dropped
    role: normative
    span:
      start: 1115
      end: 1276
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-8470F42B22C072FA
  - CLAIM-6CC80BDBD9B7AAC2
  - CLAIM-DED63830C86F15B5
  - CLAIM-A61E360D656E8B57
  - CLAIM-AA9AFCE0B5C1C27C
  - CLAIM-BF2A2CD3A3275770
  - CLAIM-F0C56A36DC78EF80
  - CLAIM-69E1B1148768582D
  - CLAIM-CDB7E585D60D8A6D
origin:
  kind: agent
  recorded_at: '2026-10-04T02:35:09.214Z'
id: REQ-kibi-search-answer-layer-v2
type: req
---
kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities. By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling. The search answer layer must state that absence of a match is not evidence. Each governing requirement in the search answer layer must carry a verdict of contradiction, infeasible, unknown, or none with the domain-contradiction and scenario-feasibility witnesses that name it. Each governing requirement in the search answer layer must list its exception requirements with their approvers and the unknowns that leave its consistency undecided. A none verdict in the search answer layer must mean only that no check named the requirement. Each rationale ADR in the search answer layer must carry its source path and an excerpt of its decision. The search answer layer must name the branch, snapshot id, and sync time of the KB snapshot it answered from. Under its byte ceiling the search answer layer must drop ADR excerpts before any governing requirement and keep a verdict's status when its witnesses are dropped.

## Rationale

An agent asking `kb_search` how Kibi should behave needs to know not only which requirements govern the topic but whether the existing checks found them contradictory, infeasible or undecided, which exceptions a person approved, and which KB snapshot the answer reflects (changeset `search-answer-layer`). The verdict reports only what the checks named, so a `none` verdict is never proof of consistency; the superseded requirement's ranking, answer-layer and absence clauses carry over unchanged.
