---
id: REQ-opencode-guidance-injection
title: OpenCode Guidance Injection
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/src/prompt.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - guidance
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-opencode-guidance-injection
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
semantic_text: The OpenCode plugin must inject Kibi guidance into the session with the requirements and traceability context of the files in play. The OpenCode plugin must inject at most one guidance block per injection, capped at 5 bullets or 120 words. The OpenCode plugin's guidance must include code traceability nudges (implements REQ-xxx). The OpenCode plugin's guidance must include file lifecycle context for created, edited and deleted files. The OpenCode plugin must append a completion reminder to run kb_check for behavior candidates.
logic_claims:
  - CLAIM-B6A53F7C2A95AE7C
  - CLAIM-16AAE1D6B82157CB
  - CLAIM-245F1CFD270D60F8
  - CLAIM-E52D39A5AB954E15
  - CLAIM-524A6FD98B91D92F
semantic_clauses:
  - The OpenCode plugin must inject Kibi guidance into the session with the requirements and traceability context of the files in play.
  - The OpenCode plugin must inject at most one guidance block per injection, capped at 5 bullets or 120 words.
  - The OpenCode plugin's guidance must include code traceability nudges (implements REQ-xxx).
  - The OpenCode plugin's guidance must include file lifecycle context for created, edited and deleted files.
  - The OpenCode plugin must append a completion reminder to run kb_check for behavior candidates.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a147b6f24ed48e1d60fb7ffeeb6017710b7bde5864f8d5a6a4ea1eba9b5315bc
semantic_inventory:
  - claim_key: CLAIM-B6A53F7C2A95AE7C
    claim_text: The OpenCode plugin must inject Kibi guidance into the session with the requirements and traceability context of the files in play
    role: normative
    status: modeled
    span:
      start: 0
      end: 130
  - claim_key: CLAIM-16AAE1D6B82157CB
    claim_text: The OpenCode plugin must inject at most one guidance block per injection, capped at 5 bullets or 120 words
    role: normative
    status: modeled
    span:
      start: 132
      end: 238
  - claim_key: CLAIM-245F1CFD270D60F8
    claim_text: The OpenCode plugin's guidance must include code traceability nudges (implements REQ-xxx)
    role: normative
    status: modeled
    span:
      start: 240
      end: 329
  - claim_key: CLAIM-E52D39A5AB954E15
    claim_text: The OpenCode plugin's guidance must include file lifecycle context for created, edited and deleted files
    role: normative
    status: modeled
    span:
      start: 331
      end: 435
  - claim_key: CLAIM-524A6FD98B91D92F
    claim_text: The OpenCode plugin must append a completion reminder to run kb_check for behavior candidates
    role: normative
    status: modeled
    span:
      start: 437
      end: 530
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
---
- The OpenCode plugin must inject Kibi guidance into the session with the requirements and traceability context of the files in play.
- The OpenCode plugin must inject at most one guidance block per injection, capped at 5 bullets or 120 words.
- The OpenCode plugin's guidance must include code traceability nudges (implements REQ-xxx).
- The OpenCode plugin's guidance must include file lifecycle context for created, edited and deleted files.
- The OpenCode plugin must append a completion reminder to run kb_check for behavior candidates.
