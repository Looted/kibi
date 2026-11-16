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
    receipt_id: PR-944f76d81ce738685189a010
    test_id: TEST-kibi-signoff-firm-edit-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: b919bc79cfc97e5ef9339bf7131330b1b40aa0be18fe91390b99096f07ec80a0
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T07:06:23.506Z'
    finished_at: '2026-11-16T07:06:24.936Z'
    artifact_digest: 9c84fbf43bc0b98772febd43e114a2ad2575a6faa8f08955b0802080a74037b4
    contract_hash: 3c7df06f88468b826d78814d378f60faebd3545cf1efb3d982513d8e94453233
    binding_hash: 6e021a5427936cf63e534d6b5d364a17ead7dd06123a41d12d40303142d7c3d8
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