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
    receipt_id: PR-b96c2852faa1beddcf6a531f
    test_id: TEST-proof-zcode-commands
    scope: unit
    outcome: passed
    code_snapshot: fb035ebe8ad317f96c2ab68de5a7680a017812416249fe122eef3f4de5e136c9
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:28:28.174Z'
    finished_at: '2026-10-27T07:28:28.367Z'
    artifact_digest: 235d17fd3e80d989b92c9828600b0449fa116c12ba6b3caa3f8ed20336de000b
    contract_hash: 1263e8cb49e559ef0a6416dcab62e836bf61ec4dbcef31dad716eebf4d00447e
    binding_hash: 7e28efca9ffd53be32ec8dbd60d646d05449b273efbcfaf42fe5be55b51a53af
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
        scope: code
        obligation:
          kind: set_relation
          members:
            - kibi-bootstrap
          operator: includes
---
Proves that kibi-zcode ships a kibi-bootstrap command: Kibi lists the command files itself.