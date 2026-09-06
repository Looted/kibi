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
semantic_text: 'Every proposed edit or action must be classified to determine enforcement level:\n\n`safe_docs_only`: Edits to non-KB documentation.\n`safe_test_only`: Edits to tests only.\n`kb_doc_structural`: Edits to KB entity frontmatter or relationships.\n`req_policy_candidate`: New requirements that may need policy alignment.\n`behavior_candidate`: Code changes requiring traceability.\n`traceability_candidate`: Symbol changes missing requirement links.\n`manual_kb_edit`: Direct edits to `.kb/**` internal files (maximum warning).'
logic_claims:
  - CLAIM-093542C105C70A84
semantic_clauses:
  - 'Every proposed edit or action must be classified to determine enforcement level:\n\n`safe_docs_only`: Edits to non-KB documentation.\n`safe_test_only`: Edits to tests only.\n`kb_doc_structural`: Edits to KB entity frontmatter or relationships.\n`req_policy_candidate`: New requirements that may need policy alignment.\n`behavior_candidate`: Code changes requiring traceability.\n`traceability_candidate`: Symbol changes missing requirement links.\n`manual_kb_edit`: Direct edits to `.kb/**` internal files (maximum warning)'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 816eada475afd1878a19732619ff5c77035b4848888e49b6130cabe88eed763c
semantic_inventory:
  - claim_key: CLAIM-093542C105C70A84
    claim_text: 'Every proposed edit or action must be classified to determine enforcement level:\n\n`safe_docs_only`: Edits to non-KB documentation.\n`safe_test_only`: Edits to tests only.\n`kb_doc_structural`: Edits to KB entity frontmatter or relationships.\n`req_policy_candidate`: New requirements that may need policy alignment.\n`behavior_candidate`: Code changes requiring traceability.\n`traceability_candidate`: Symbol changes missing requirement links.\n`manual_kb_edit`: Direct edits to `.kb/**` internal files (maximum warning)'
    role: normative
    status: modeled
    span:
      start: 0
      end: 523
type: req
---

Every proposed edit or action must be classified to determine enforcement level:

1. `safe_docs_only`: Edits to non-KB documentation.
2. `safe_test_only`: Edits to tests only.
3. `kb_doc_structural`: Edits to KB entity frontmatter or relationships.
4. `req_policy_candidate`: New requirements that may need policy alignment.
5. `behavior_candidate`: Code changes requiring traceability.
6. `traceability_candidate`: Symbol changes missing requirement links.
7. `manual_kb_edit`: Direct edits to `.kb/**` internal files (maximum warning).
