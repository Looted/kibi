---
title: Signoff firm-edit receipt tests
status: passing
priority: must
tags:
  - firmness
  - signoff
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T07:00:06.157Z'
id: TEST-kibi-signoff-firm-edit-receipts
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-signoff-firm-edit-receipts
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e762df8b4f1e743789eb7eb9
    test_id: TEST-kibi-signoff-firm-edit-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 3c7df06f88468b826d78814d378f60faebd3545cf1efb3d982513d8e94453233
    binding_hash: f08838c5f9d7cc92311566ef79b268ef6f02d201b8f09d6ac2d608be3e9734c6
    fingerprint: e3afeea613c22a48d76ab53e6f14e1fcd4b8f03bac02bed8fb0c93787e79ea9f
    fingerprint_components:
      contract: 3c7df06f88468b826d78814d378f60faebd3545cf1efb3d982513d8e94453233
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-signoff-firm-edit-receipts
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The collect tests build a change that adds firm-edit receipt files and check that kibi signoff attaches each one to its requirement with the symbol, verdict and note, including for a requirement the change does not otherwise touch (packages/cli/tests/signoff/collect-mutation.test.ts). The Markdown and HTML render tests check that each receipt is shown as the agent's judgment, not the person's approval (packages/cli/tests/signoff/markdown-render.test.ts, packages/cli/tests/signoff/html-render.test.ts).

A false pass would be a render test that never reads receipts from the change, or one that shows a receipt as approved.