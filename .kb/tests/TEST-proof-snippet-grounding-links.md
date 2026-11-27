---
title: A snippet grounding link shall be constrains, requires_property, requires_predicate or requires_rule, by an exhaustive proof
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
    - symbol_id: SYM-proof-snippet-grounding-links
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-agent-core-snippets-grounding-link-types
  proves:
    - CLAIM-128DF93CAB36C7E3
origin:
  kind: agent
  recorded_at: '2026-10-29T16:31:58.361Z'
id: TEST-proof-snippet-grounding-links
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2fdcf7ee70c0604ef968a7c9
    test_id: TEST-proof-snippet-grounding-links
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 3f70b58bfdecdd161d8adff9dbb74b9cf977927e87342eed5cd8d4940b945435
    binding_hash: fbabc54133a29cab6e5a29a9142fa6b1053ae2f1c00b07f494219dad76692bd6
    fingerprint: 158c5bb34296e1de5b63eb46823d4cf85ba3b6a734007c51f4f0ea8b37b3bcba
    fingerprint_components:
      contract: 3f70b58bfdecdd161d8adff9dbb74b9cf977927e87342eed5cd8d4940b945435
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
      - symbol_id: SYM-proof-snippet-grounding-links
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
      test_id: TEST-proof-snippet-grounding-links
      domain:
        symbol_id: SYM-agent-core-snippets-grounding-link-types
        members:
          - constrains
          - requires_property
          - requires_predicate
          - requires_rule
      results:
        - member: constrains
          outcome: passed
        - member: requires_property
          outcome: passed
        - member: requires_predicate
          outcome: passed
        - member: requires_rule
          outcome: passed
    certificate_digest: e07a9fe64c2639541fae98fa8a3be16d67020a978923a5710526ac5f70517041
    claim_bindings:
      - claim_key: CLAIM-128DF93CAB36C7E3
        requirement_id: REQ-agent-core-hook-limits
        fact_id: FACT-snippet-grounding-links
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - constrains
            - requires_predicate
            - requires_property
            - requires_rule
---
Proves that a snippet grounding link shall be constrains, requires_property, requires_predicate or requires_rule, against the code Kibi reads at ingest.