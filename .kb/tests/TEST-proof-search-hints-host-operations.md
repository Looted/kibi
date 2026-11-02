---
title: An operation that may call an external search hints provider shall be kb_search, by an exhaustive proof
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
    - symbol_id: SYM-proof-search-hints-host-operations
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  proves:
    - CLAIM-D55E7279A67FA32C
  domain_source:
    symbol_id: SYM-const-external-search-hints-operations
origin:
  kind: agent
  recorded_at: '2026-10-30T19:40:48.741Z'
id: TEST-proof-search-hints-host-operations
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7c6c0d9fd6ee86b8d3b5b927
    test_id: TEST-proof-search-hints-host-operations
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:29.334Z'
    finished_at: '2026-10-30T19:45:29.435Z'
    artifact_digest: ac62f44051e5f766489c1883aec991636b3e22de7401f1ae10c3d36771586cf0
    contract_hash: ae4fb9e2fa7efec0f074d67ca8fd928aa6d4aa7f814be32507110ceaee00bd49
    binding_hash: 8d1c9d3abd9343385756030d26f03533f005b99f2480d45561425ec26ab82912
    fingerprint: b274f6fc53544d4e2895341b580811be611f4683956025eb16b4ca8f14d958a4
    fingerprint_components:
      contract: ae4fb9e2fa7efec0f074d67ca8fd928aa6d4aa7f814be32507110ceaee00bd49
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
      - symbol_id: SYM-proof-search-hints-host-operations
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
      test_id: TEST-proof-search-hints-host-operations
      domain:
        symbol_id: SYM-const-external-search-hints-operations
        members:
          - kb_search
      results:
        - member: kb_search
          outcome: passed
    certificate_digest: eca3102323dfd242d198ce48bd0b211ce8a82115efd14f73a64cb9f781236969
    claim_bindings:
      - claim_key: CLAIM-D55E7279A67FA32C
        requirement_id: REQ-search-hints-host-operations
        fact_id: FACT-search-hints-host-operations
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_search
---
Proves that an operation that may call an external search hints provider shall be kb_search, against the code Kibi reads at ingest.