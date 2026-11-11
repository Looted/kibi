---
id: REQ-opencode-risk-classification
title: OpenCode Risk Classification
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/src/risk-classifier.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - risk
links:
  - type: specified_by
    target: SCEN-opencode-risk-classification
  - type: verified_by
    target: TEST-opencode-smart-enforcement
semantic_text: The OpenCode plugin must classify a proposed edit into a risk class that sets its enforcement level. The OpenCode plugin must classify edits to non-KB documentation as safe_docs_only. The OpenCode plugin must classify edits to tests only as safe_test_only. The OpenCode plugin must classify edits to KB entity front matter or relationships as kb_doc_structural. The OpenCode plugin must classify new requirements that may need policy alignment as req_policy_candidate. The OpenCode plugin must classify code changes that need traceability as behavior_candidate. The OpenCode plugin must classify symbol changes missing requirement links as traceability_candidate. The OpenCode plugin must classify direct edits to .kb internal files as manual_kb_edit, with the strongest warning.
logic_claims:
  - CLAIM-93AAC229EC376A3A
  - CLAIM-7C58E817F622B538
  - CLAIM-263CB1244332B8B5
  - CLAIM-5C34332B3EF8E877
  - CLAIM-1375777FC8CAAAF4
  - CLAIM-4148F2B27497C1F4
  - CLAIM-C2FB5DD114E9A347
  - CLAIM-CEEDAB81502F968D
semantic_clauses:
  - The OpenCode plugin must classify a proposed edit into a risk class that sets its enforcement level.
  - The OpenCode plugin must classify edits to non-KB documentation as safe_docs_only.
  - The OpenCode plugin must classify edits to tests only as safe_test_only.
  - The OpenCode plugin must classify edits to KB entity front matter or relationships as kb_doc_structural.
  - The OpenCode plugin must classify new requirements that may need policy alignment as req_policy_candidate.
  - The OpenCode plugin must classify code changes that need traceability as behavior_candidate.
  - The OpenCode plugin must classify symbol changes missing requirement links as traceability_candidate.
  - The OpenCode plugin must classify direct edits to .kb internal files as manual_kb_edit, with the strongest warning.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 93a140fd551ee9dcfa37bd5db32d44b5bdc52a665d8bc65c9a3765223d7fc1fa
semantic_inventory:
  - claim_key: CLAIM-93AAC229EC376A3A
    claim_text: The OpenCode plugin must classify a proposed edit into a risk class that sets its enforcement level
    role: normative
    status: modeled
    span:
      start: 0
      end: 99
  - claim_key: CLAIM-7C58E817F622B538
    claim_text: The OpenCode plugin must classify edits to non-KB documentation as safe_docs_only
    role: normative
    status: modeled
    span:
      start: 101
      end: 182
  - claim_key: CLAIM-263CB1244332B8B5
    claim_text: The OpenCode plugin must classify edits to tests only as safe_test_only
    role: normative
    status: modeled
    span:
      start: 184
      end: 255
  - claim_key: CLAIM-5C34332B3EF8E877
    claim_text: The OpenCode plugin must classify edits to KB entity front matter or relationships as kb_doc_structural
    role: normative
    status: modeled
    span:
      start: 257
      end: 360
  - claim_key: CLAIM-1375777FC8CAAAF4
    claim_text: The OpenCode plugin must classify new requirements that may need policy alignment as req_policy_candidate
    role: normative
    status: modeled
    span:
      start: 362
      end: 467
  - claim_key: CLAIM-4148F2B27497C1F4
    claim_text: The OpenCode plugin must classify code changes that need traceability as behavior_candidate
    role: normative
    status: modeled
    span:
      start: 469
      end: 560
  - claim_key: CLAIM-C2FB5DD114E9A347
    claim_text: The OpenCode plugin must classify symbol changes missing requirement links as traceability_candidate
    role: normative
    status: modeled
    span:
      start: 562
      end: 662
  - claim_key: CLAIM-CEEDAB81502F968D
    claim_text: The OpenCode plugin must classify direct edits to .kb internal files as manual_kb_edit, with the strongest warning
    role: normative
    status: modeled
    span:
      start: 664
      end: 778
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).).'
  approved_by: maintainer
  recorded_at: '2026-11-03T12:03:44.000Z'
firmness: default
required_evidence: tested
rationale: "Enforcement should match the risk of an edit: docs and tests stay light, structural KB and code changes get checked."
---
- The OpenCode plugin must classify a proposed edit into a risk class that sets its enforcement level.
- The OpenCode plugin must classify edits to non-KB documentation as safe_docs_only.
- The OpenCode plugin must classify edits to tests only as safe_test_only.
- The OpenCode plugin must classify edits to KB entity front matter or relationships as kb_doc_structural.
- The OpenCode plugin must classify new requirements that may need policy alignment as req_policy_candidate.
- The OpenCode plugin must classify code changes that need traceability as behavior_candidate.
- The OpenCode plugin must classify symbol changes missing requirement links as traceability_candidate.
- The OpenCode plugin must classify direct edits to .kb internal files as manual_kb_edit, with the strongest warning.

## Rationale
Enforcement should match the risk of an edit: docs and tests stay light, structural KB and code changes get checked.
