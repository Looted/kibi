---
title: An agent host shall pass the workspace to Kibi tools as workspaceRoot, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-agent-workspace-argument
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-agent-core-KIBI_WORKSPACE_ARGUMENT
  proves:
    - CLAIM-23571A7EFB6D98E2
origin:
  kind: agent
  recorded_at: '2026-10-29T16:34:18.205Z'
id: TEST-proof-agent-workspace-argument
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-67dac952761116d1b8e7b139
    test_id: TEST-proof-agent-workspace-argument
    scope: unit
    outcome: passed
    code_snapshot: c469764ad7d851a4a824eb1c7ddea2723a5cdfcfa3a999d51640bc4d746102ef
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-23T19:03:13.761Z'
    finished_at: '2026-11-23T19:03:13.925Z'
    artifact_digest: 9348b62779f8fcdb0dab01190635b063a43c3d33f140ea4c1c347ea1cd743a42
    contract_hash: 6d1c226fd23ea294a28d48e476243e8b612f8f270e55bc208459cc36102d0194
    binding_hash: 4ed6ea0cfbd84a3152ed7a4b613d33fbf190fd2cb5515fd07366a3da70a76c15
    fingerprint: fd5b12a43b41aaf48184a269aedcd176fbe383b516d70608397de3a61130de14
    fingerprint_components:
      contract: 6d1c226fd23ea294a28d48e476243e8b612f8f270e55bc208459cc36102d0194
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
      - symbol_id: SYM-proof-agent-workspace-argument
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-agent-workspace-argument
      pattern:
        symbol_id: SYM-agent-core-KIBI_WORKSPACE_ARGUMENT
        type: string
        value: workspaceRoot
    certificate_digest: 82d850dd58347568b2b1c3945f75b583a1769c846858c34f3ab776b482a574e2
    claim_bindings:
      - claim_key: CLAIM-23571A7EFB6D98E2
        requirement_id: REQ-agent-workspace-opt-in-keys
        fact_id: FACT-agent-workspace-argument
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: workspaceRoot
---
Proves that an agent host shall pass the workspace to Kibi tools as workspaceRoot, against the code Kibi reads at ingest.