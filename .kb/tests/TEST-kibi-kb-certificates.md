---
title: Certificates and kibi verify through the packed CLI
status: passing
tags:
  - proof
  - verify
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-kb-certificates
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-23T14:07:36.626Z'
id: TEST-kibi-kb-certificates
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f51f05eaed6059abbaffd6f6
    test_id: TEST-kibi-kb-certificates
    scope: end_to_end
    outcome: passed
    code_snapshot: 439bda7323a5b3e5d4e9558c4efee761ecf7d4455d024f0dc0e7d28e09b3ca22
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-23T14:30:22.651Z'
    finished_at: '2026-10-23T14:32:16.291Z'
    artifact_digest: edf61cc942f508fc4708c5502503d5a252e402408eb47997ff23c615e672608e
    contract_hash: da3c96aa44a2ccc63b8bb84944b1502a2af8be2d441d831e81ea57293d943669
    binding_hash: 925f5502bf6e8d230e74977b2814d0d04efe2169e5f6499be929739335b65924
    fingerprint: b5a63a1704a60a41d39a24a0818abcf235854e5f4a05de74b64bef489d2d4a7d
    fingerprint_components:
      contract: da3c96aa44a2ccc63b8bb84944b1502a2af8be2d441d831e81ea57293d943669
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
      - symbol_id: SYM-e2e-packed-kb-certificates
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the installed packed CLI on a sandbox repository with property facts and checks kibi verify end to end: consistent bounds get a model that re-verifies and the run exits 0, a saved bundle with a broken model is rejected with the fact it breaks and exit 1, and four bounds that only contradict together are reported as disproved with a core of all four facts.