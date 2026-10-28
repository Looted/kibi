---
title: The per-test proof report version shall be kibi.proof-test-report.v1, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-proof-test-report-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-test-report-version
  proves:
    - CLAIM-EBFEB6B891A3FA1A
origin:
  kind: agent
  recorded_at: '2026-10-28T11:07:37.202Z'
id: TEST-proof-proof-test-report-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-001ec0b4bcf9d6952332a98b
    test_id: TEST-proof-proof-test-report-version
    scope: unit
    outcome: passed
    code_snapshot: ebc106e5d7924a9ee2a860dfc5601c8f8311531c6d560d6647b330d4db83fd82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:09:46.582Z'
    finished_at: '2026-10-28T11:09:46.697Z'
    artifact_digest: 194e772fbfed8ef93ef86ac2726ba6e31bd72bdb776d0e1504d78a27f8ee5927
    contract_hash: 84ec604d1b8d24223a1720edd90041f55f91057f28811cf638ea249980928d80
    binding_hash: 1ea7ec9fd79f49225e4e10a89787858463e2051b9c8a6a242128b87ef86b03f5
    fingerprint: fe91df38341ff47a0bf6313c1ccfe81e6286aac9481b1e34cba4f19e53ceedca
    fingerprint_components:
      contract: 84ec604d1b8d24223a1720edd90041f55f91057f28811cf638ea249980928d80
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
      - symbol_id: SYM-proof-proof-test-report-version
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-proof-test-report-version
      pattern:
        symbol_id: SYM-const-proof-test-report-version
        type: string
        value: kibi.proof-test-report.v1
    certificate_digest: 7cab373f17bd04a46f547dd18949ac7ff16ee2df541b7e2e50a2216b75fe2cd2
    claim_bindings:
      - claim_key: CLAIM-EBFEB6B891A3FA1A
        requirement_id: REQ-kibi-proof-step-settings
        fact_id: FACT-proof-test-report-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-test-report.v1
---
Proves that the per-test proof report version shall be kibi.proof-test-report.v1, against the code Kibi reads at ingest.