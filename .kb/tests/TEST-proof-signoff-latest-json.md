---
title: The latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json, by a regex proof
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
    - symbol_id: SYM-proof-signoff-latest-json
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-E4E917F697A7045C
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-latest-json
origin:
  kind: agent
  recorded_at: '2026-10-30T19:41:03.061Z'
id: TEST-proof-signoff-latest-json
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7a839c5605b25014b17fd323
    test_id: TEST-proof-signoff-latest-json
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1aef053b69f70eb901ddabcb4bdd527046ea219061c4c142198022e278312c41
    binding_hash: eafca4a135c8634cc4e859b50b4c9e9253e476ab1b46f2b320b9a24209df3422
    fingerprint: 18f3ad03bbfdf78a0f2681148d1e6aef8685b428adffc95cb5def43749850eba
    fingerprint_components:
      contract: 1aef053b69f70eb901ddabcb4bdd527046ea219061c4c142198022e278312c41
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
      - symbol_id: SYM-proof-signoff-latest-json
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
      test_id: TEST-proof-signoff-latest-json
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-latest-json
        type: string
        value: .kb/briefs/signoff/latest.json
    certificate_digest: 1312f0f797e2257043b35cc1f4137062056246782c318bfed880b834a1284165
    claim_bindings:
      - claim_key: CLAIM-E4E917F697A7045C
        requirement_id: REQ-signoff-latest-views
        fact_id: FACT-signoff-latest-json
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/briefs/signoff/latest.json
---
Proves that the latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json, against the code Kibi reads at ingest.