---
title: Bootstrap writes claimless provider candidates as provenance stubs that search ranks last and reports skip
status: open
tags:
  - bootstrap
  - provenance-stubs
  - search
  - review:context-missing
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K18, provider facts without a claim'
  recorded_at: '2026-10-09T07:23:17.036Z'
semantic_text: The bootstrap planner must write a discovered provider candidate that states no claim as a meta fact tagged bootstrap:provenance-stub. The bootstrap planner must select provenance stubs after every discovered candidate that states a claim. The bootstrap plan must report planned provenance stubs separately from candidates with claims. Search ranking must sort a provenance stub after every match that is not a provenance stub. The search answer layer must not list a provenance stub as a note. Gap and type coverage reports must not count a provenance stub as a fact.
logic_claims:
  - CLAIM-26BF4264FA7F7AEC
  - CLAIM-DF00F8E42E49F51E
  - CLAIM-FB94883E20A9130A
  - CLAIM-3F757D98EB87A085
  - CLAIM-F328F7C4DE85A735
  - CLAIM-4F8F36FB72DB3453
semantic_clauses:
  - The bootstrap planner must write a discovered provider candidate that states no claim as a meta fact tagged bootstrap:provenance-stub.
  - The bootstrap planner must select provenance stubs after every discovered candidate that states a claim.
  - The bootstrap plan must report planned provenance stubs separately from candidates with claims.
  - Search ranking must sort a provenance stub after every match that is not a provenance stub.
  - The search answer layer must not list a provenance stub as a note.
  - Gap and type coverage reports must not count a provenance stub as a fact.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: An Oct 9 2026 onboarding evaluation on a test project found that bootstrap wrote one observation fact per discovered source module, test file and layout root, so kb_search answers listed provenance-only facts as notes, gap and coverage reports counted them as knowledge, and the over_limit diagnostic suggested raising maxCandidates to admit more of them.
semantic_source_hash: fca2244c423f5af1871fe39f6210aee760b3d6d5e3e478468ab05f15452f733b
semantic_inventory:
  - claim_key: CLAIM-26BF4264FA7F7AEC
    claim_text: The bootstrap planner must write a discovered provider candidate that states no claim as a meta fact tagged bootstrap:provenance-stub
    role: normative
    status: modeled
    span:
      start: 0
      end: 133
  - claim_key: CLAIM-DF00F8E42E49F51E
    claim_text: The bootstrap planner must select provenance stubs after every discovered candidate that states a claim
    role: normative
    status: modeled
    span:
      start: 135
      end: 238
  - claim_key: CLAIM-FB94883E20A9130A
    claim_text: The bootstrap plan must report planned provenance stubs separately from candidates with claims
    role: normative
    status: modeled
    span:
      start: 240
      end: 334
  - claim_key: CLAIM-3F757D98EB87A085
    claim_text: Search ranking must sort a provenance stub after every match that is not a provenance stub
    role: normative
    status: modeled
    span:
      start: 336
      end: 426
  - claim_key: CLAIM-F328F7C4DE85A735
    claim_text: The search answer layer must not list a provenance stub as a note
    role: normative
    status: modeled
    span:
      start: 428
      end: 493
  - claim_key: CLAIM-4F8F36FB72DB3453
    claim_text: Gap and type coverage reports must not count a provenance stub as a fact
    role: normative
    status: modeled
    span:
      start: 495
      end: 567
id: REQ-bootstrap-provenance-stubs
type: req
---
The bootstrap planner must write a discovered provider candidate that states no claim as a meta fact tagged bootstrap:provenance-stub. The bootstrap planner must select provenance stubs after every discovered candidate that states a claim. The bootstrap plan must report planned provenance stubs separately from candidates with claims. Search ranking must sort a provenance stub after every match that is not a provenance stub. The search answer layer must not list a provenance stub as a note. Gap and type coverage reports must not count a provenance stub as a fact.

## Context

Round 9 of the onboarding evaluation on a test project found that the source_symbols, repo_layout, repo_metadata and framework-less test_topology providers each wrote an observation fact that only records where a file was found. Those facts surfaced as notes in kb_search answers, were counted by kb_find_gaps and kb_coverage, and filled the maxCandidates budget so the over_limit diagnostic suggested raising it. A provider fact that states no claim is provenance, not knowledge: it stays queryable through kb_query but must not compete with claims. A test_topology candidate whose framework is recognized does state a claim and stays an observation. Requested by the project owner after the evaluation report.

## Source

> Onboarding evaluation round 9, finding K18: bootstrap provider facts with no claim are provenance stubs; write them as meta facts tagged bootstrap:provenance-stub, rank them last in search, keep them out of gap and coverage counts, and report them separately in the plan.