---
title: 'Rule selection by Kibi level: the knowledge layer runs at every level, the verification layer only at test'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - check
  - rules
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-check-rule-selection-by-level
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T09:44:49.525Z'
id: TEST-kibi-check-rule-selection-by-level
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a7b9188f133d76c96a7224cf
    test_id: TEST-kibi-check-rule-selection-by-level
    scope: end_to_end
    outcome: passed
    code_snapshot: b6649d29181ccab088798d2373ba640e85507f701aca154d615cc7f2c4e9cc6f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:21:49.946Z'
    finished_at: '2026-11-25T10:21:50.079Z'
    artifact_digest: fe8a74024a63be69011613f82e29e2cf63e75187c7fe3ea69057c94b64537999
    contract_hash: 5e471140d8bc139a620d6a8cbd4e3e37aeb056b4af234d5251d8cb8c2dc186a6
    binding_hash: bfc36f01ad342ac2589b0d37bbb083169f9d36574268f5a2d6af0d10ef06ef43
    fingerprint: 2fec89b1b9318e56b2ceeceb9ae895361345b8888a3b673e22ef9b25f81cf6ec
    fingerprint_components:
      contract: 5e471140d8bc139a620d6a8cbd4e3e37aeb056b4af234d5251d8cb8c2dc186a6
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
      - symbol_id: SYM-test-kibi-check-rule-selection-by-level
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/kibi-levels/rule-selection.test.ts`. It checks that the knowledge layer runs at every level and the verification layer only at test, that a plain check at test runs every canonical and advisory rule and at remember only the knowledge rules, that resolveCheckRules follows the level while an explicit selection runs as asked, that a full run is reported as a count, and that the staged gate runs the requirement-scoped verification rule only at test.
