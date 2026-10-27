---
title: Installed staged impact review, derived coordinate cache and trusted aggregate gate lifecycle
status: active
tags:
  - multilingual
  - impact-policy
  - stage-e
  - e2e
  - consumer
  - review:context-missing
text_ref: documentation/tests/e2e/packed/impact-review-stage-e.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
    target: default
    native_id: documentation/tests/e2e/packed/impact-review-stage-e.test.ts::keeps exact staged and trusted-diff impact evidence through ownership repair and canonical receipt append
id: TEST-impact-policy-stage-e-installed-e2e
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-619b0f963d287e2465e68a61
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:29:51.902Z'
    finished_at: '2026-10-25T12:31:47.960Z'
    artifact_digest: ff21c6d091fd90fad801135f1df40bc7f0b4a9abd9d1bff08671dd1eedac1245
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: 1c78bdcef9905eb10d2bf769159f7ff0104fed2bd341a458ba0b7dbc3bf774e0
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
