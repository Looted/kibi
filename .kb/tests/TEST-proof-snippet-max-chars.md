---
title: An edit snippet shall hold at most 1200 characters, by an arithmetic proof
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
    - symbol_id: SYM-proof-snippet-max-chars
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-claude-MAX_SNIPPET_CHARS
  proves:
    - CLAIM-FCC5400A046BAB07
origin:
  kind: agent
  recorded_at: '2026-10-29T16:30:17.775Z'
id: TEST-proof-snippet-max-chars
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d7f594e0e05c4de7601a1182
    test_id: TEST-proof-snippet-max-chars
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: e65db52689cd3f6daf98a05f61360339762db337efa936f5e6a50cb4fb4f2f23
    binding_hash: 66b1841bef675d046936c9f2ccf5d261e619e97182fe78524d00293b019d9340
    fingerprint: 4b8690b8b949fd51e1a19caa20efc6e0285e3611cb877a1975930dd6f4ea2f5d
    fingerprint_components:
      contract: e65db52689cd3f6daf98a05f61360339762db337efa936f5e6a50cb4fb4f2f23
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
      - symbol_id: SYM-proof-snippet-max-chars
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
      test_id: TEST-proof-snippet-max-chars
      variable: max_snippet_chars
      value_type: int
      assumptions:
        - operator: eq
          value: 1200
      claim:
        operator: eq
        value: 1200
    certificate_digest: b9df1a750f8dd8dfeeefa755555d2667822d7eac21ced667b32e075ae579e41b
    claim_bindings:
      - claim_key: CLAIM-FCC5400A046BAB07
        requirement_id: REQ-agent-core-hook-limits
        fact_id: FACT-snippet-max-chars
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 1200
          value_type: int
          variable: max_snippet_chars
---
Proves that an edit snippet shall hold at most 1200 characters, against the code Kibi reads at ingest.