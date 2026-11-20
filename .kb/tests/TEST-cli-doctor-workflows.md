---
title: Packed CLI doctor workflow diagnostics
status: passing
tags:
  - cli
  - doctor
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-doctor
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-doctor-workflows
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-77fcd97da75339501d1c8a39
    test_id: TEST-cli-doctor-workflows
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e92ed821011bba8e755c5b874ed8db80c6d514ff109f21a96823e2d6f4366ddc
    binding_hash: 6e16aa8e25e13866d9796eaad4e9cebaf0fd89b5c58e40262aee76dd27685fdb
    fingerprint: c418203058eb1c11804725525899d641d78f32c22bec0f91de340e8c1c7bed5f
    fingerprint_components:
      contract: e92ed821011bba8e755c5b874ed8db80c6d514ff109f21a96823e2d6f4366ddc
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
      - symbol_id: SYM-e2e-packed-cli-doctor
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving entity context that was inferred (not recorded in history) in the KB gold-standard review (context batch 9, inferred): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
Doctor is what users run when an install misbehaves, so it's tested through a packed install, the way users actually get it. Inferred from: its proof step in proof/steps.json and the packed doctor tests.
