---
id: TEST-vscode-traceability-coverage
title: Verify VS Code bidirectional traceability navigation
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
priority: must
links:
  - type: validates
    target: REQ-vscode-traceability
  - type: validates
    target: SCEN-vscode-traceability-coverage
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-vscode-traceability-coverage
      target: default
  success_policy: all_required_first_attempt
type: test
---

Open a linked symbol from the KB tree and a linked requirement from the editor, asserting both navigation directions resolve the expected source and entity targets.
