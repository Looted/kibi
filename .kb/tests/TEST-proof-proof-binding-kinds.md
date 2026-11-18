---
title: A proof binding kind shall be native_case or aggregate_run, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-proof-binding-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-binding-kinds
  proves:
    - CLAIM-3A5E7E22374EF666
origin:
  kind: agent
  recorded_at: '2026-10-28T17:48:33.832Z'
id: TEST-proof-proof-binding-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-07beb84586fce1dd053d0f00
    test_id: TEST-proof-proof-binding-kinds
    scope: unit
    outcome: passed
    code_snapshot: d699a078fe8d2323d221f435a979d519f5acca43cfee14f7307e23c39a35f0fa
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T21:01:15.332Z'
    finished_at: '2026-11-16T21:01:34.441Z'
    artifact_digest: 3ef1b1564e3821c2d1f507334af153c4831866821439fdb98ef86c918ef3be6e
    contract_hash: ef0554c996722ce79e70a76a7e0d2d16740ad75fa5d546438b26470f744b1b6d
    binding_hash: 68167c99bdd4c2d977ca66f84c853e38dc173bb080e92c341b8143caf4965fd7
    fingerprint: 24ad3e78434b208a4f0a43d72014b1acb471f4abb17374e86680395989b663e0
    fingerprint_components:
      contract: ef0554c996722ce79e70a76a7e0d2d16740ad75fa5d546438b26470f744b1b6d
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
      - symbol_id: SYM-proof-proof-binding-kinds
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-proof-binding-kinds
      domain:
        symbol_id: SYM-proof-binding-kinds
        members:
          - native_case
          - aggregate_run
      results:
        - member: native_case
          outcome: passed
        - member: aggregate_run
          outcome: passed
    certificate_digest: be7c936ac454c282a122d7503d82714c8be5ccf81f011d57f04f108f1e1e5c8f
    claim_bindings:
      - claim_key: CLAIM-3A5E7E22374EF666
        requirement_id: REQ-kibi-proof-contract-vocabulary
        fact_id: FACT-proof-binding-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - aggregate_run
            - native_case
---
Proves that a proof binding kind shall be native_case or aggregate_run, against the code Kibi reads at ingest.