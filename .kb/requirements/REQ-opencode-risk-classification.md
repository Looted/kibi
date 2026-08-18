---
id: REQ-opencode-risk-classification
title: "OpenCode Risk Classification"
status: open
created_at: 2026-05-13T00:00:00Z
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
---

Every proposed edit or action must be classified to determine enforcement level:

1. `safe_docs_only`: Edits to non-KB documentation.
2. `safe_test_only`: Edits to tests only.
3. `kb_doc_structural`: Edits to KB entity frontmatter or relationships.
4. `req_policy_candidate`: New requirements that may need policy alignment.
5. `behavior_candidate`: Code changes requiring traceability.
6. `traceability_candidate`: Symbol changes missing requirement links.
7. `manual_kb_edit`: Direct edits to `.kb/**` internal files (maximum warning).
