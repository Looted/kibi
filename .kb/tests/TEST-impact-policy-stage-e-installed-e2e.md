---
title: Installed staged impact review, derived coordinate cache and trusted aggregate gate lifecycle
status: passing
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
    receipt_id: PR-d0923cdf60a42c642665dccf
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: b0af811c22ff1e52612e5efd94261fbcd6e0d0a55c39bc56775badf1ab2d81a8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T10:49:12.434Z'
    finished_at: '2026-11-10T10:51:12.272Z'
    artifact_digest: fb0e4ca028350e9a62016da2e7228341b040c7a5496b8e50d5bc0d6c10f77602
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: f76ca8cab7ea5956d9c59ea8060c9225a3b83a6cd799783839e5eac83ce111b3
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
