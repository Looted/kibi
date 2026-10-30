---
title: kb_check rule names
status: open
priority: must
firmness: firm
semantic_text: The evidence floor check rule shall be evidence-floor. Evidence floors shall start at KB schema version 11. The unapproved agent requirement rule shall be agent-requirement-unapproved. The unapproved exception rule shall be exception-unapproved. The self-attested exception approval rule shall be exception-approval-self-attested. The missing requirement rationale rule shall be requirement-rationale-missing. The policy markers rule shall be policy-markers. The policy ownership rule shall be policy-ownership. The symbol granularity rule shall be symbol-granularity. The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged. The scoped check omission note id shall be scoped_check_omitted_quality.
semantic_clauses:
  - The evidence floor check rule shall be evidence-floor.
  - Evidence floors shall start at KB schema version 11.
  - The unapproved agent requirement rule shall be agent-requirement-unapproved.
  - The unapproved exception rule shall be exception-unapproved.
  - The self-attested exception approval rule shall be exception-approval-self-attested.
  - The missing requirement rationale rule shall be requirement-rationale-missing.
  - The policy markers rule shall be policy-markers.
  - The policy ownership rule shall be policy-ownership.
  - The symbol granularity rule shall be symbol-granularity.
  - The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged.
  - The scoped check omission note id shall be scoped_check_omitted_quality.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T20:19:31.677Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d8402fe521f22d993708db246d818910af619e4b615fe942107af05d9508a3c9
semantic_inventory:
  - claim_key: CLAIM-C97BCBA32B6056FD
    claim_text: The evidence floor check rule shall be evidence-floor
    role: normative
    status: modeled
    span:
      start: 0
      end: 53
  - claim_key: CLAIM-75CDA06E155F91E2
    claim_text: Evidence floors shall start at KB schema version 11
    role: normative
    status: modeled
    span:
      start: 55
      end: 106
  - claim_key: CLAIM-F67FF62F420AF804
    claim_text: The unapproved agent requirement rule shall be agent-requirement-unapproved
    role: normative
    status: modeled
    span:
      start: 108
      end: 183
  - claim_key: CLAIM-18FA2C11AFA7F302
    claim_text: The unapproved exception rule shall be exception-unapproved
    role: normative
    status: modeled
    span:
      start: 185
      end: 244
  - claim_key: CLAIM-5DDCB11FE4E1B302
    claim_text: The self-attested exception approval rule shall be exception-approval-self-attested
    role: normative
    status: modeled
    span:
      start: 246
      end: 329
  - claim_key: CLAIM-6A0DF299ADF1444D
    claim_text: The missing requirement rationale rule shall be requirement-rationale-missing
    role: normative
    status: modeled
    span:
      start: 331
      end: 408
  - claim_key: CLAIM-B7F45C2F4CC9E21A
    claim_text: The policy markers rule shall be policy-markers
    role: normative
    status: modeled
    span:
      start: 410
      end: 457
  - claim_key: CLAIM-07BF06E3E4B8056F
    claim_text: The policy ownership rule shall be policy-ownership
    role: normative
    status: modeled
    span:
      start: 459
      end: 510
  - claim_key: CLAIM-5C7C8091600FD22F
    claim_text: The symbol granularity rule shall be symbol-granularity
    role: normative
    status: modeled
    span:
      start: 512
      end: 567
  - claim_key: CLAIM-D6F1B2CD2BC64534
    claim_text: The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged
    role: normative
    status: modeled
    span:
      start: 569
      end: 648
  - claim_key: CLAIM-CDC574A1940BB7F6
    claim_text: The scoped check omission note id shall be scoped_check_omitted_quality
    role: normative
    status: modeled
    span:
      start: 650
      end: 721
logic_claims:
  - CLAIM-C97BCBA32B6056FD
  - CLAIM-75CDA06E155F91E2
  - CLAIM-F67FF62F420AF804
  - CLAIM-18FA2C11AFA7F302
  - CLAIM-5DDCB11FE4E1B302
  - CLAIM-6A0DF299ADF1444D
  - CLAIM-B7F45C2F4CC9E21A
  - CLAIM-07BF06E3E4B8056F
  - CLAIM-5C7C8091600FD22F
  - CLAIM-D6F1B2CD2BC64534
  - CLAIM-CDC574A1940BB7F6
id: REQ-kibi-check-rule-names
type: req
---
The evidence floor check rule shall be evidence-floor. Evidence floors shall start at KB schema version 11. The unapproved agent requirement rule shall be agent-requirement-unapproved. The unapproved exception rule shall be exception-unapproved. The self-attested exception approval rule shall be exception-approval-self-attested. The missing requirement rationale rule shall be requirement-rationale-missing. The policy markers rule shall be policy-markers. The policy ownership rule shall be policy-ownership. The symbol granularity rule shall be symbol-granularity. The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged. The scoped check omission note id shall be scoped_check_omitted_quality.

## Context

REQ-kibi-kb-lifecycle-integrity has kb_check report every finding under a stable rule name an agent can filter on: the evidence floor that arrived with KB schema 11, the origin review rules, the policy rules, the symbol granularity rule, the acknowledged supersede rule and the note a scoped check adds when it leaves quality rules out. They are stated here so every name is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"