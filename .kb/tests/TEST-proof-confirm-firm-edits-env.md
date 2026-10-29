---
title: Firm edit confirmation shall be switched by KIBI_CONFIRM_FIRM_EDITS, by a regex proof
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
    - symbol_id: SYM-proof-confirm-firm-edits-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-agent-core-confirm-firm-edits-env
  proves:
    - CLAIM-779A77B3EC880CE7
origin:
  kind: agent
  recorded_at: '2026-10-29T16:31:24.329Z'
id: TEST-proof-confirm-firm-edits-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-81b83791f072aeeedbe72a49
    test_id: TEST-proof-confirm-firm-edits-env
    scope: unit
    outcome: passed
    code_snapshot: 8d023642f2d3b7e5339d3b88aef78ca7225877c8dc42ff4f947c96219805b463
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:32:59.304Z'
    finished_at: '2026-10-29T16:32:59.517Z'
    artifact_digest: 74700d4e9c8b10d776f0b129b1323530cebd30de1c477bd38cabd88c0157bc0e
    contract_hash: 3184028bca041af0c8fccc9f364642d9bf740fd7b8c52c1e5a78cea6c74179e2
    binding_hash: a8e25d447b88c2b5b4430b02db7eccef7fb4095206468b3774c24af78df22c5d
    fingerprint: 524dd1dde5b3fd2a8c3c0e4e0775c2e8c441f9a89c99d72305e761263ec9a55b
    fingerprint_components:
      contract: 3184028bca041af0c8fccc9f364642d9bf740fd7b8c52c1e5a78cea6c74179e2
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
      - symbol_id: SYM-proof-confirm-firm-edits-env
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
      test_id: TEST-proof-confirm-firm-edits-env
      pattern:
        symbol_id: SYM-agent-core-confirm-firm-edits-env
        type: string
        value: KIBI_CONFIRM_FIRM_EDITS
    certificate_digest: 9197791c5a7b0f5b3a1e65c5b5066f697fdec28c222ea0d2b90eb272b0842526
    claim_bindings:
      - claim_key: CLAIM-779A77B3EC880CE7
        requirement_id: REQ-agent-core-hook-limits
        fact_id: FACT-confirm-firm-edits-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_CONFIRM_FIRM_EDITS
---
Proves that firm edit confirmation shall be switched by KIBI_CONFIRM_FIRM_EDITS, against the code Kibi reads at ingest.