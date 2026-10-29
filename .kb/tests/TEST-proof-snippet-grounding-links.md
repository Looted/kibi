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
    receipt_id: PR-b5aee07680fa8abbfb980192
    test_id: TEST-proof-snippet-grounding-links
    scope: unit
    outcome: passed
    code_snapshot: 8d023642f2d3b7e5339d3b88aef78ca7225877c8dc42ff4f947c96219805b463
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:33:10.518Z'
    finished_at: '2026-10-29T16:33:10.695Z'
    artifact_digest: 763f31bfef0eec582ac274377e9a5567963bc4619a88cc27e7f0a8529f9210a1
    contract_hash: 3f70b58bfdecdd161d8adff9dbb74b9cf977927e87342eed5cd8d4940b945435
    binding_hash: 1496045926a7163d9d1a375b318a10bbb87a898f5851a3378b095f53aaa70ab4
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