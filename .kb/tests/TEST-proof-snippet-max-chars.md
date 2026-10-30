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
    receipt_id: PR-d5f4180a56e51291022ac591
    test_id: TEST-proof-snippet-max-chars
    scope: unit
    outcome: passed
    code_snapshot: 8d023642f2d3b7e5339d3b88aef78ca7225877c8dc42ff4f947c96219805b463
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:32:37.383Z'
    finished_at: '2026-10-29T16:32:37.545Z'
    artifact_digest: 09b02cc18a480ffc58eb2dd69f2b7dd4166a054d23f6989727b88b25399b30c4
    contract_hash: e65db52689cd3f6daf98a05f61360339762db337efa936f5e6a50cb4fb4f2f23
    binding_hash: 41dfb203b88b51d220de4da6a17899992b913fbc027c72d889499846acab2f62
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