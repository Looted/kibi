---
title: Installed staged-impact timing observations remain bounded and fail closed
status: passing
text_ref: scripts/benchmark-installed-staged-impact.test.mjs
tags:
  - multilingual
  - benchmark
  - timing-integrity
  - installed-consumer
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-installed-staged-impact-timing-integrity
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-installed-impact-runWorkflow
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e9f6f6024ad5fd59f5381080
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 3aaa4f816c874f724121e89eda4296d7ac51aceb47cc0311f15d2d20a98934fd
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
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
This checks that the timing observations stay bounded and that a failure still fails while timing is on.
