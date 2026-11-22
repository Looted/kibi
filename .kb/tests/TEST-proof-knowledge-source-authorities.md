---
title: A knowledge source authority shall be authoritative, supporting or stale, by an exhaustive proof
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
    - symbol_id: SYM-proof-knowledge-source-authorities
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-knowledge-source-authorities
  proves:
    - CLAIM-C8F9C5974CCDF2C1
origin:
  kind: agent
  recorded_at: '2026-10-28T19:19:38.920Z'
id: TEST-proof-knowledge-source-authorities
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-614e7fb0887b206855c001f8
    test_id: TEST-proof-knowledge-source-authorities
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 2ea86f58ce5b9169a2de0620910fe0d447d89f9ff7f9157efb2b14dbe326620c
    binding_hash: 0e19fed85230cc58342f2d01d6941f6d12390a023d923a50ebd310dcde368716
    fingerprint: acaf7431087894b5c343ff08708296b1338d8c06f207dd76f42d2c756b53d30c
    fingerprint_components:
      contract: 2ea86f58ce5b9169a2de0620910fe0d447d89f9ff7f9157efb2b14dbe326620c
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
      - symbol_id: SYM-proof-knowledge-source-authorities
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
      test_id: TEST-proof-knowledge-source-authorities
      domain:
        symbol_id: SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-knowledge-source-authorities
        members:
          - authoritative
          - supporting
          - stale
      results:
        - member: authoritative
          outcome: passed
        - member: supporting
          outcome: passed
        - member: stale
          outcome: passed
    certificate_digest: 9d817fae0d5614527e7c4a8be937989f5cfa5cbe49eb7a21f50c39faed78e378
    claim_bindings:
      - claim_key: CLAIM-C8F9C5974CCDF2C1
        requirement_id: REQ-kibi-knowledge-source-vocabulary
        fact_id: FACT-knowledge-source-authorities
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - authoritative
            - stale
            - supporting
---
Proves that a knowledge source authority shall be authoritative, supporting or stale, against the code Kibi reads at ingest.