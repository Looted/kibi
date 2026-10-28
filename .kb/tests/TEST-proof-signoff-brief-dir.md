---
title: The Kibi signoff brief directory shall be .kb/briefs/signoff, by a regex proof
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
    - symbol_id: SYM-proof-signoff-brief-dir
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-brief-dir
  proves:
    - CLAIM-8A91574A1C034AB5
origin:
  kind: agent
  recorded_at: '2026-10-28T10:15:12.660Z'
id: TEST-proof-signoff-brief-dir
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-56b4f321a5dab59c6e1e8c57
    test_id: TEST-proof-signoff-brief-dir
    scope: unit
    outcome: passed
    code_snapshot: 791218adb43be4736ecbc355d33b13ce116b91fc38de5fcb5e6927fe6a7ad310
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:17:14.710Z'
    finished_at: '2026-10-28T10:17:14.837Z'
    artifact_digest: 8168f5569dbcec377cd15ffda509cd591ebd466add1e5540b73d106ebb1c0706
    contract_hash: 2c06603aafb68ca4e0bdb09f85ca9e4cc0a8e306c40a196d334546b4cb5d96a5
    binding_hash: e16b7512989c73b823f20a226af41683541210c34e1fd444a8b52dbe722c2b8e
    fingerprint: 55dd0ce5652e0467b11f9fe17d20b302b3f386231ff96a6999967b90ccbd9c12
    fingerprint_components:
      contract: 2c06603aafb68ca4e0bdb09f85ca9e4cc0a8e306c40a196d334546b4cb5d96a5
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
      - symbol_id: SYM-proof-signoff-brief-dir
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
      test_id: TEST-proof-signoff-brief-dir
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-brief-dir
        type: string
        value: .kb/briefs/signoff
    certificate_digest: ed1a11002063b5ecbcf831018864a9a27ed66910b66b290cec4422147ba312ef
    claim_bindings:
      - claim_key: CLAIM-8A91574A1C034AB5
        requirement_id: REQ-kibi-signoff-brief-location
        fact_id: FACT-signoff-brief-dir
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/briefs/signoff
---
Proves that the Kibi signoff brief directory shall be .kb/briefs/signoff, against the code Kibi reads at ingest.