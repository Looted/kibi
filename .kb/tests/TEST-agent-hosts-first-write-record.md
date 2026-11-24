---
title: Hosts and skills send the first write of a rule to kb_record
status: active
priority: must
verification_scope: end_to_end
verification_perspective: internal
tags:
  - kb-record
  - hooks
  - skills
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-first-write-record
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T06:43:19.866Z'
id: TEST-agent-hosts-first-write-record
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f5c1c3c7c847ee02000f6fce
    test_id: TEST-agent-hosts-first-write-record
    scope: end_to_end
    outcome: passed
    code_snapshot: 7c45f2335937699151dfd938867d7721dab3c0b4bcd34ea911bd6fe377619b0d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-24T19:20:57.167Z'
    finished_at: '2026-11-24T19:21:01.039Z'
    artifact_digest: 3820381abbb42c59b1f25ce5150781ccd5ecf58e0ff25b26de3f42d2537628d9
    contract_hash: 991a4af2db1eeeeaa001cad76eff6246a020958492851ed0fcb9e9400438e098
    binding_hash: aedc0d9fd62dc9871bb2692f6b2c9337b17c46d1c20abe68fffc5617431031f4
    fingerprint: 29b76c61bfe79fcf3e2307567045235cf96ada0df4bf6cf23512573a73dc02c6
    fingerprint_components:
      contract: 991a4af2db1eeeeaa001cad76eff6246a020958492851ed0fcb9e9400438e098
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
      - symbol_id: SYM-test-agent-hosts-first-write-record
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The decision guard, MCP tool name and session brief tests check that the capture template and rule notes name kb_record (kibi record --input - without MCP) and kb_upsert for modeling, and that a kb_record call counts as a requirement write while its dry run does not; the Claude Code, Codex, Cursor, ZCode and OpenCode hook tests check the same on each host; the MCP tool profile tests check that the default profile lists kb_record; the skill content tests check the kibi-usage and kibi-decisions skills.
