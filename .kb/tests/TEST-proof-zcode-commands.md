---
title: The kibi-zcode commands include kibi-bootstrap, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:27:24.260Z'
id: TEST-proof-zcode-commands
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-zcode-commands
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/zcode/commands/*.md
    capture: true
  proves:
    - CLAIM-57A92DF403F17ADF
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-81304e6c992c8e003b184687
    test_id: TEST-proof-zcode-commands
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1263e8cb49e559ef0a6416dcab62e836bf61ec4dbcef31dad716eebf4d00447e
    binding_hash: 1c344392aeae3899f668a61693453446b13ca2720cc5aea97dd51a11aa14071b
    fingerprint: bafa35f4e17d95317cb49a0f0b7cb088ae3dc6113b3b761b15a263019e8796ec
    fingerprint_components:
      contract: 1263e8cb49e559ef0a6416dcab62e836bf61ec4dbcef31dad716eebf4d00447e
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
      - symbol_id: SYM-proof-zcode-commands
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-zcode-commands
      source:
        reader: glob
        pattern: packages/zcode/commands/*.md
        capture: true
      model:
        members:
          - kibi-bootstrap
          - kibi-signoff
    certificate_digest: 783a9d6c3630cdb577ed5996598df00e916b9868350c3b87dd162993c7e76bee
    claim_bindings:
      - claim_key: CLAIM-57A92DF403F17ADF
        requirement_id: REQ-zcode-plugin-package
        fact_id: FACT-zcode-commands-include-bootstrap
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-bootstrap
          operator: includes
---
Proves that kibi-zcode ships a kibi-bootstrap command: Kibi lists the command files itself.