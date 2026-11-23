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
    receipt_id: PR-eb5f4b66305d338dff6977d5
    test_id: TEST-proof-bootstrap-providers
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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