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
    receipt_id: PR-22b35fee0142b0147f476096
    test_id: TEST-proof-confirm-firm-edits-env
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 3184028bca041af0c8fccc9f364642d9bf740fd7b8c52c1e5a78cea6c74179e2
    binding_hash: e661184278291b16a46d56e445f7f1fd861625f837c789fc7e480416a538e35a
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