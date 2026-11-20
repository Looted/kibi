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
    receipt_id: PR-7bc464267d46208087988498
    test_id: TEST-kibi-signoff-firm-edit-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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