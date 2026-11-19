---
title: Installed staged impact review, derived coordinate cache and trusted aggregate gate lifecycle
status: passing
tags:
  - multilingual
  - impact-policy
  - stage-e
  - e2e
  - consumer
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
    receipt_id: PR-9e6c2daa470a2bce219b494b
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: adea33e26c88941393a8c6226718a912bd53302a69d8e139fe10242571d2fb07
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-19T20:12:48.667Z'
    finished_at: '2026-11-19T20:14:45.635Z'
    artifact_digest: d3430a949c3a6802a818dfb4d18401de56ca982e059599c0e93b9a52e951e6b0
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: ff131a0a831ec2849f39a86012eecdb27d2b59a1a8e9b97e855a231e725313fd
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
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This runs the full Stage E lifecycle in an installed package (staged review, derived coordinate cache and the trusted aggregate gate), because the gate's trust rules only hold when policy and evaluator come from protected code.
