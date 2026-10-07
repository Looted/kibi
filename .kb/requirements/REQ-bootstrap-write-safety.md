---
title: Bootstrap writes are valid and failures are actionable
status: open
priority: must
tags:
  - bootstrap
  - write-safety
  - review:context-missing
semantic_text: The bootstrap planner must validate candidate entity fields, relationships and semantic inventories before offering write actions. The bootstrap planner must preserve an invalid or ungroundable claim as a cited requirement authoring follow-up. The bootstrap apply operation must validate every remaining payload before creating a journal or writing an entity. The bootstrap apply operation must reject deterministic failures terminally and report every previously committed action. The bootstrap recovery operation must refuse to replay a terminally rejected journal. The bootstrap planner must strip task list markers and continue after an individual claim extraction failure. The bootstrap planner must prioritize cited intent and typed requirements before provider observations after deduplication and existing entity suppression. The bootstrap planner must report every over limit candidate and every source extraction failure. The bootstrap planner must block plan binding when existing entity identifiers cannot be read. The KB migration must preserve fact identifiers and bodies while encoding legacy polarity only property facts as typed booleans. The strict fact shape check must reject malformed strict facts.
semantic_clauses:
  - The bootstrap planner must validate candidate entity fields, relationships and semantic inventories before offering write actions.
  - The bootstrap planner must preserve an invalid or ungroundable claim as a cited requirement authoring follow-up.
  - The bootstrap apply operation must validate every remaining payload before creating a journal or writing an entity.
  - The bootstrap apply operation must reject deterministic failures terminally and report every previously committed action.
  - The bootstrap recovery operation must refuse to replay a terminally rejected journal.
  - The bootstrap planner must strip task list markers and continue after an individual claim extraction failure.
  - The bootstrap planner must prioritize cited intent and typed requirements before provider observations after deduplication and existing entity suppression.
  - The bootstrap planner must report every over limit candidate and every source extraction failure.
  - The bootstrap planner must block plan binding when existing entity identifiers cannot be read.
  - The KB migration must preserve fact identifiers and bodies while encoding legacy polarity only property facts as typed booleans.
  - The strict fact shape check must reject malformed strict facts.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c2d6da39502c94c058a51af998363aabdc865a59f1b5a8afa962c6bea32bf03b
semantic_inventory:
  - claim_key: CLAIM-0AF05B1CDA6DDFC1
    claim_text: The bootstrap planner must validate candidate entity fields, relationships and semantic inventories before offering write actions
    role: normative
    status: modeled
    span:
      start: 0
      end: 129
  - claim_key: CLAIM-4533588A8191644B
    claim_text: The bootstrap planner must preserve an invalid or ungroundable claim as a cited requirement authoring follow-up
    role: normative
    status: modeled
    span:
      start: 131
      end: 242
  - claim_key: CLAIM-48AD85CF44DAEC4D
    claim_text: The bootstrap apply operation must validate every remaining payload before creating a journal or writing an entity
    role: normative
    status: modeled
    span:
      start: 244
      end: 358
  - claim_key: CLAIM-395E89CA03470276
    claim_text: The bootstrap apply operation must reject deterministic failures terminally and report every previously committed action
    role: normative
    status: modeled
    span:
      start: 360
      end: 480
  - claim_key: CLAIM-87E92907134A7ADB
    claim_text: The bootstrap recovery operation must refuse to replay a terminally rejected journal
    role: normative
    status: modeled
    span:
      start: 482
      end: 566
  - claim_key: CLAIM-8111C54A39C7F84F
    claim_text: The bootstrap planner must strip task list markers and continue after an individual claim extraction failure
    role: normative
    status: modeled
    span:
      start: 568
      end: 676
  - claim_key: CLAIM-58FF2A64E458B1F2
    claim_text: The bootstrap planner must prioritize cited intent and typed requirements before provider observations after deduplication and existing entity suppression
    role: normative
    status: modeled
    span:
      start: 678
      end: 832
  - claim_key: CLAIM-4A5B1781285CBE2E
    claim_text: The bootstrap planner must report every over limit candidate and every source extraction failure
    role: normative
    status: modeled
    span:
      start: 834
      end: 930
  - claim_key: CLAIM-F843FC443D6A4FF2
    claim_text: The bootstrap planner must block plan binding when existing entity identifiers cannot be read
    role: normative
    status: modeled
    span:
      start: 932
      end: 1025
  - claim_key: CLAIM-76514643EECA3B59
    claim_text: The KB migration must preserve fact identifiers and bodies while encoding legacy polarity only property facts as typed booleans
    role: normative
    status: modeled
    span:
      start: 1027
      end: 1154
  - claim_key: CLAIM-A2995E2B6540F3A5
    claim_text: The strict fact shape check must reject malformed strict facts
    role: normative
    status: modeled
    span:
      start: 1156
      end: 1218
logic_claims:
  - CLAIM-0AF05B1CDA6DDFC1
  - CLAIM-4533588A8191644B
  - CLAIM-48AD85CF44DAEC4D
  - CLAIM-395E89CA03470276
  - CLAIM-87E92907134A7ADB
  - CLAIM-8111C54A39C7F84F
  - CLAIM-58FF2A64E458B1F2
  - CLAIM-4A5B1781285CBE2E
  - CLAIM-F843FC443D6A4FF2
  - CLAIM-76514643EECA3B59
  - CLAIM-A2995E2B6540F3A5
origin:
  kind: agent
  recorded_at: '2026-10-04T16:04:32.974Z'
id: REQ-bootstrap-write-safety
type: req
rationale: Bootstrap plans must turn cited product intent into valid writes without losing claims or replaying deterministic failures; this repairs the reproduced failures documented in bootstrap-write-failure-codex-handoff.md.
---
The bootstrap planner must validate candidate entity fields, relationships and semantic inventories before offering write actions. The bootstrap planner must preserve an invalid or ungroundable claim as a cited requirement authoring follow-up. The bootstrap apply operation must validate every remaining payload before creating a journal or writing an entity. The bootstrap apply operation must reject deterministic failures terminally and report every previously committed action. The bootstrap recovery operation must refuse to replay a terminally rejected journal. The bootstrap planner must strip task list markers and continue after an individual claim extraction failure. The bootstrap planner must prioritize cited intent and typed requirements before provider observations after deduplication and existing entity suppression. The bootstrap planner must report every over limit candidate and every source extraction failure. The bootstrap planner must block plan binding when existing entity identifiers cannot be read. The KB migration must preserve fact identifiers and bodies while encoding legacy polarity only property facts as typed booleans. The strict fact shape check must reject malformed strict facts.
