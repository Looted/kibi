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
    receipt_id: PR-20f71d30587f076a62c3ffe6
    test_id: TEST-kibi-evidence-floors
    scope: end_to_end
    outcome: passed
    code_snapshot: f7af5b2339b0df534a4825f64e55b9fd33eb1fdb4c005d37179b3f99a54a953e
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T19:18:43.026Z'
    finished_at: '2026-11-12T19:19:55.998Z'
    artifact_digest: 0188a300c0e6c215e5b3c65e017e769621bd76f015035e30244cd5dfec774305
    contract_hash: 7825fc4ed1641b1c2a93a4f3f345dfa520781feb97aa33d9d099b0afcd0b2b85
    binding_hash: 2391c2dfed410c3c1ad56b5e969353f44a38822e7b4307ce732df72de74c8653
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