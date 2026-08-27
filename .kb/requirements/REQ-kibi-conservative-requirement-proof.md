---
id: REQ-kibi-conservative-requirement-proof
title: Coverage reports expose conservative end-to-end requirement proof
status: open
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-conservative-requirement-proof.md
priority: must
tags: [requirements, proof, prolog, coverage, e2e, traceability]
logic_claims:
  - CLAIM-4C1ABF87560ED8A7
  - CLAIM-FA450AC4EF93F78C
  - CLAIM-AFD4D2B6803EA1B3
  - CLAIM-F98FF1D58B960443
  - CLAIM-78DCDEACB0D210A3
  - CLAIM-BE38830D1474567E
  - CLAIM-C87C17E9A5586B23
  - CLAIM-C716C2DA63A93BDF
  - CLAIM-540E9376529E8B19
  - CLAIM-6D6D5B50042B3F58
  - CLAIM-9A7C59796E5CDB94
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f7a2561dd5402a0eefed1609bb55985535d676ef04b3c7345f813147232b9be7
semantic_inventory:
  - claim_key: CLAIM-4C1ABF87560ED8A7
    claim_text: Coverage reports must publish a proof outcome separately from structural coverage
    role: normative
    status: modeled
    span: {start: 0, end: 81}
  - claim_key: CLAIM-FA450AC4EF93F78C
    claim_text: A proven requirement must have a complete proposition ledger with no unresolved assertive entries
    role: normative
    status: modeled
    span: {start: 83, end: 180}
  - claim_key: CLAIM-AFD4D2B6803EA1B3
    claim_text: Every modeled proposition must have exactly one valid logical grounding
    role: normative
    status: modeled
    span: {start: 182, end: 253}
  - claim_key: CLAIM-F98FF1D58B960443
    claim_text: Contradiction analysis must not report a clear outcome while logical grounding is incomplete
    role: normative
    status: modeled
    span: {start: 255, end: 347}
  - claim_key: CLAIM-78DCDEACB0D210A3
    claim_text: Every detected contradiction must block proof
    role: normative
    status: modeled
    span: {start: 349, end: 394}
  - claim_key: CLAIM-BE38830D1474567E
    claim_text: Proof requires a requirement-specified scenario with passing end-to-end test evidence
    role: normative
    status: modeled
    span: {start: 396, end: 481}
  - claim_key: CLAIM-C87C17E9A5586B23
    claim_text: Every qualifying end-to-end test must have executable test symbols linked through executable_for
    role: normative
    status: modeled
    span: {start: 483, end: 579}
  - claim_key: CLAIM-C716C2DA63A93BDF
    claim_text: Every proof-bearing production symbol must implement the requirement
    role: normative
    status: modeled
    span: {start: 581, end: 649}
  - claim_key: CLAIM-540E9376529E8B19
    claim_text: Every proof-bearing production symbol must be covered by a qualifying end-to-end test
    role: normative
    status: modeled
    span: {start: 651, end: 736}
  - claim_key: CLAIM-6D6D5B50042B3F58
    claim_text: Every proof-bearing symbol must resolve to exact current source coordinates
    role: normative
    status: modeled
    span: {start: 738, end: 813}
  - claim_key: CLAIM-9A7C59796E5CDB94
    claim_text: Missing or unresolved evidence must produce explicit ranked repair guidance
    role: normative
    status: modeled
    span: {start: 815, end: 890}
links:
  - type: specified_by
    target: SCEN-kibi-conservative-requirement-proof
  - type: requires_predicate
    target: FACT-REQ-PROOF-SEPARATE-STATUS
  - type: requires_predicate
    target: FACT-REQ-PROOF-COMPLETE-LEDGER
  - type: requires_predicate
    target: FACT-REQ-PROOF-ONE-GROUNDING
  - type: requires_predicate
    target: FACT-REQ-PROOF-INCOMPLETE-CONTRADICTION
  - type: requires_predicate
    target: FACT-REQ-PROOF-CONTRADICTION-BLOCKS
  - type: requires_predicate
    target: FACT-REQ-PROOF-SCENARIO-E2E
  - type: requires_predicate
    target: FACT-REQ-PROOF-EXECUTABLE-SYMBOL
  - type: requires_predicate
    target: FACT-REQ-PROOF-PRODUCTION-IMPLEMENTS
  - type: requires_predicate
    target: FACT-REQ-PROOF-PRODUCTION-COVERED
  - type: requires_predicate
    target: FACT-REQ-PROOF-SOURCE-COORDINATES
  - type: requires_predicate
    target: FACT-REQ-PROOF-RANKED-REPAIRS
---

Coverage reports must publish a proof outcome separately from structural coverage. A proven requirement must have a complete proposition ledger with no unresolved assertive entries. Every modeled proposition must have exactly one valid logical grounding. Contradiction analysis must not report a clear outcome while logical grounding is incomplete. Every detected contradiction must block proof. Proof requires a requirement-specified scenario with passing end-to-end test evidence. Every qualifying end-to-end test must have executable test symbols linked through executable_for. Every proof-bearing production symbol must implement the requirement. Every proof-bearing production symbol must be covered by a qualifying end-to-end test. Every proof-bearing symbol must resolve to exact current source coordinates. Missing or unresolved evidence must produce explicit ranked repair guidance.
