---
title: Evidence floors in kibi check through the packed CLI
status: passing
tags:
  - proof
  - check
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-evidence-floors
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-24T17:34:02.477Z'
id: TEST-kibi-evidence-floors
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-40a58bff9ccf26d86f338e82
    test_id: TEST-kibi-evidence-floors
    scope: end_to_end
    outcome: passed
    code_snapshot: 43675d5112431d4f3e5766d7fd142174b14e417e9c8b3d76bc67f23dfa7c508e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T20:09:17.837Z'
    finished_at: '2026-10-24T20:09:25.409Z'
    artifact_digest: 8309b9233d80e2a458edc64015616e62e0626606b0af9fa93ba365339954a85f
    contract_hash: 7825fc4ed1641b1c2a93a4f3f345dfa520781feb97aa33d9d099b0afcd0b2b85
    binding_hash: 0a138379ebbd002db04ff3a4decdc01161f4e0739418ff80803badf890a9e1ee
    fingerprint: 10d64998f5402de5061501326721bd46d997aa67315f9d5ab75db20cda5f936e
    fingerprint_components:
      contract: 7825fc4ed1641b1c2a93a4f3f345dfa520781feb97aa33d9d099b0afcd0b2b85
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
      - symbol_id: SYM-e2e-packed-evidence-floors
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the installed packed CLI on a sandbox repository and checks the evidence-floor rule end to end: a firm requirement without an end-to-end proof and an unapproved agent requirement with an asserted floor fail kibi check, lowering the first floor and approving the second passes, --fresh-evidence needs a committed tree, and kibi migrate --yes on a schema 10 repository records required_evidence: asserted on a firm requirement without a proof path so the upgraded repository passes.