---
title: An empty knowledge base adds kb_plan_bootstrap and kb_apply_plan, by an exhaustive proof
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
    - symbol_id: SYM-proof-mcp-bootstrap-tools
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-mcp-BOOTSTRAP_TOOLS
  proves:
    - CLAIM-756AC6B3EC9E1EC2
origin:
  kind: agent
  recorded_at: '2026-11-16T22:37:51.875Z'
id: TEST-proof-mcp-bootstrap-tools
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7824c1f36c33ca5625916c57
    test_id: TEST-proof-mcp-bootstrap-tools
    scope: unit
    outcome: passed
    code_snapshot: 32ee33b73de52a5faea88037234ee6420cfcba340ad0940b4021a05c62fa772d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T16:02:41.533Z'
    finished_at: '2026-11-17T16:02:56.993Z'
    artifact_digest: f4887a07f9a9b865fefecdb3eb64200815c603d43fd8b900b1a5dac6d042d0dc
    contract_hash: 7c15b5663bb2512e8090cf5943fa1fd55e517036bb1ddfd20312595eda37fcb3
    binding_hash: cbfdd6e501b72a029dababb93ce8afada263469e78231152d653864f7896ef7b
    fingerprint: 7293c834b718b26c30d0fd0e4b257e7088ee7eae5c88acf6fbf17d4c96da7495
    fingerprint_components:
      contract: 7c15b5663bb2512e8090cf5943fa1fd55e517036bb1ddfd20312595eda37fcb3
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
      - symbol_id: SYM-proof-mcp-bootstrap-tools
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
      test_id: TEST-proof-mcp-bootstrap-tools
      domain:
        symbol_id: SYM-mcp-BOOTSTRAP_TOOLS
        members:
          - kb_plan_bootstrap
          - kb_apply_plan
      results:
        - member: kb_plan_bootstrap
          outcome: passed
        - member: kb_apply_plan
          outcome: passed
    certificate_digest: 7be8425e131e6cae61af346e88937fadea25ca8c3d0ca1d88a1416e509eb1fdd
    claim_bindings:
      - claim_key: CLAIM-756AC6B3EC9E1EC2
        requirement_id: REQ-mcp-default-tool-profile
        fact_id: FACT-mcp-empty-kb-bootstrap-tools
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_apply_plan
            - kb_plan_bootstrap
---
Proves that the default profile adds exactly kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity, against BOOTSTRAP_TOOLS as Kibi reads it at ingest.