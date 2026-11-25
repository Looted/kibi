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
    receipt_id: PR-f31913c906ef452afd5cd694
    test_id: TEST-kibi-approval-evidence-floor
    scope: end_to_end
    outcome: passed
    code_snapshot: d14d361b9d771854661c696d28d525ca6032c7e0cb1d9ed4c9414065e4d506f3
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T08:53:51.226Z'
    finished_at: '2026-11-25T08:54:04.813Z'
    artifact_digest: d6b1ea54446cf78e3254ce7eb8d3120f0bf1a25652cd4a46b6a25afce9017300
    contract_hash: 322f401fd81349b6d8f5409f6f00a1a0a9bb6f6085329e420f576e109d455ee7
    binding_hash: 94341a5a5f593cfa7ad5d18a5f8cb67b5f795285e03095c9970d17bb5b5af724
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
