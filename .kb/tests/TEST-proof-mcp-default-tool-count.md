---
title: The default MCP tool catalog holds 18 tools, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-mcp-default-tool-count
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-TOOLS
      measure: count
  proves:
    - CLAIM-F3C444E68F357320
origin:
  kind: agent
  recorded_at: '2026-10-28T09:29:59.255Z'
id: TEST-proof-mcp-default-tool-count
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3765a7efca385ea99a3517d8
    test_id: TEST-proof-mcp-default-tool-count
    scope: unit
    outcome: passed
    code_snapshot: 32ee33b73de52a5faea88037234ee6420cfcba340ad0940b4021a05c62fa772d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T16:02:21.292Z'
    finished_at: '2026-11-17T16:02:35.948Z'
    artifact_digest: 7fee44c7173f04cc6c1d41506ff4f01a61ca97343e63bd0be3549d23d5dee245
    contract_hash: 7bf12f03be2cabf004fb561e2b077acb4b814feb265c55a231ec6eda56ecb72b
    binding_hash: f8f191f904268403ac34abca34655a73a4302d727c3b110093267f235104e9e6
    fingerprint: c771df512fb4c39933db88cb88d6913f720e6344cba06ddda570d21add4ff524
    fingerprint_components:
      contract: 7bf12f03be2cabf004fb561e2b077acb4b814feb265c55a231ec6eda56ecb72b
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
      - symbol_id: SYM-proof-mcp-default-tool-count
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-mcp-default-tool-count
      variable: default_tool_count
      value_type: int
      assumptions:
        - operator: eq
          value: 18
      claim:
        operator: eq
        value: 18
    certificate_digest: d9afd1970758e47833e23cc4ce7fb0d29caf714b8b725c3cd6dc0366d7089a80
    claim_bindings:
      - claim_key: CLAIM-F3C444E68F357320
        requirement_id: REQ-kibi-mcp-tool-catalog
        fact_id: FACT-mcp-default-tool-count
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 18
          value_type: int
          variable: default_tool_count
---
Counts the TOOLS registry export and proves the default MCP tool catalog holds 16 tools.