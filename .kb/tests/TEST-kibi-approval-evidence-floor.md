---
title: Approval evidence floor and unapproved implemented requirement checks, end to end
status: passing
priority: must
tags:
  - check
  - evidence-floor
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-approval-evidence-floor
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-12T18:20:00.000Z'
id: TEST-kibi-approval-evidence-floor
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ebbe9f77561c964a00b639f6
    test_id: TEST-kibi-approval-evidence-floor
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 322f401fd81349b6d8f5409f6f00a1a0a9bb6f6085329e420f576e109d455ee7
    binding_hash: 0429dbb9408b4347475788b106901f9ed3713bb5288136015f77dfc9b79dd16d
    fingerprint: 27638ce8033b788b68a014f08240ecb3ef835cecfd43438de4652e24f39493ef
    fingerprint_components:
      contract: 322f401fd81349b6d8f5409f6f00a1a0a9bb6f6085329e420f576e109d455ee7
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
      - symbol_id: SYM-test-approval-evidence-floor
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kibi sync, coverage, check and migrate on a schema 14 fixture repository and checks the approval floor, the schema 15 pins and the agent-requirement-unapproved-implemented findings.
