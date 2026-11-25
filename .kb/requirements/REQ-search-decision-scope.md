---
title: Search gives each decision a scope from its code links and its knowledge source
status: open
priority: must
required_evidence: tested
tags:
  - search
  - retrieval
semantic_text: Search must place a decision in this workspace's scope when it is linked to a file that exists here or comes from a knowledge source with at least two decisions linked here. Search must place a decision in another scope when it is linked only to files that do not exist here. Search must mark a decision distant when it comes from a knowledge source of at least three decisions, none of them linked here, while some decision is linked here. Search must mark a decision unscoped when it is not in this workspace's scope, another scope or the distant tier.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:36:56.871Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6336723edb07bd32f8cc8abbc4a95def8078c342c0dd07aa76d0507165d17960
semantic_inventory:
  - claim_key: CLAIM-FCFF363CEE943695
    claim_text: Search must place a decision in this workspace's scope when it is linked to a file that exists here or comes from a knowledge source with at least two decisions linked here
    role: normative
    status: modeled
    span:
      start: 0
      end: 172
  - claim_key: CLAIM-F76FD42F4CDA23B5
    claim_text: Search must place a decision in another scope when it is linked only to files that do not exist here
    role: normative
    status: modeled
    span:
      start: 174
      end: 274
  - claim_key: CLAIM-1DCCF43A1C746F1B
    claim_text: Search must mark a decision distant when it comes from a knowledge source of at least three decisions, none of them linked here, while some decision is linked here
    role: normative
    status: modeled
    span:
      start: 276
      end: 439
  - claim_key: CLAIM-36160FAA51A00563
    claim_text: Search must mark a decision unscoped when it is not in this workspace's scope, another scope or the distant tier
    role: normative
    status: modeled
    span:
      start: 441
      end: 553
logic_claims:
  - CLAIM-FCFF363CEE943695
  - CLAIM-F76FD42F4CDA23B5
  - CLAIM-1DCCF43A1C746F1B
  - CLAIM-36160FAA51A00563
id: REQ-search-decision-scope
type: req
---
Search must place a decision in this workspace's scope when it is linked to a file that exists here or comes from a knowledge source with at least two decisions linked here. Search must place a decision in another scope when it is linked only to files that do not exist here. Search must mark a decision distant when it comes from a knowledge source of at least three decisions, none of them linked here, while some decision is linked here. Search must mark a decision unscoped when it is not in this workspace's scope, another scope or the distant tier.

## Context

On the Papra store crowded with other products' decisions, ranking by words alone put the governing decision in the top ten for half of the searches agents typed in the Nov 25 run. Restricting candidates to this workspace's scope first raised it to 98%, and it stayed at 98% with 100 times the look-alikes. Code links alone are not enough: 103 of the 182 real Papra decisions have none, so a decision also takes the scope of its knowledge source. A source with no decision linked here is only demoted, never hidden, because a project may simply not have linked it yet.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"
