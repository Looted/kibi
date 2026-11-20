---
title: A bootstrap evidence provider shall be typed_kibi_docs, generic_repo_docs, repo_metadata, repo_layout, test_topology or source_symbols, by an exhaustive proof
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
    - symbol_id: SYM-proof-bootstrap-providers
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-bootstrap-provider-order
  proves:
    - CLAIM-BC80604F70BA94D3
origin:
  kind: agent
  recorded_at: '2026-10-29T10:35:22.816Z'
id: TEST-proof-bootstrap-providers
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6d6023455d16d18eac5e70f8
    test_id: TEST-proof-bootstrap-providers
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e4fcefca0ab003e1a9ce9457ceefcded178c492c10e01927129d2e59c2fc1b9b
    binding_hash: 4fac0aad931f3e907f30d8d259785878aa1cdd39c79b988f6296f3d3df873214
    fingerprint: 507ca1eedd27a6a0672304fcd8d0077d89b09975070b6f58e733a962e3018325
    fingerprint_components:
      contract: e4fcefca0ab003e1a9ce9457ceefcded178c492c10e01927129d2e59c2fc1b9b
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
      - symbol_id: SYM-proof-bootstrap-providers
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
      test_id: TEST-proof-bootstrap-providers
      domain:
        symbol_id: SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-bootstrap-provider-order
        members:
          - typed_kibi_docs
          - generic_repo_docs
          - repo_metadata
          - repo_layout
          - test_topology
          - source_symbols
      results:
        - member: typed_kibi_docs
          outcome: passed
        - member: generic_repo_docs
          outcome: passed
        - member: repo_metadata
          outcome: passed
        - member: repo_layout
          outcome: passed
        - member: test_topology
          outcome: passed
        - member: source_symbols
          outcome: passed
    certificate_digest: 572a8de02607d7995034c69cdc962e7664fe45b9f1f67719230544105b44d63e
    claim_bindings:
      - claim_key: CLAIM-BC80604F70BA94D3
        requirement_id: REQ-kibi-bootstrap-evidence-providers
        fact_id: FACT-bootstrap-providers
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - generic_repo_docs
            - repo_layout
            - repo_metadata
            - source_symbols
            - test_topology
            - typed_kibi_docs
---
Proves that a bootstrap evidence provider shall be typed_kibi_docs, generic_repo_docs, repo_metadata, repo_layout, test_topology or source_symbols, against the code Kibi reads at ingest.