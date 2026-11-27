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
    receipt_id: PR-5047e4112656977207417981
    test_id: TEST-proof-search-hints-host-operations
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: ae4fb9e2fa7efec0f074d67ca8fd928aa6d4aa7f814be32507110ceaee00bd49
    binding_hash: 92c9500cc6f000ce323242a34c0b8268278ec786af51dc5723a4df3aa543b512
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