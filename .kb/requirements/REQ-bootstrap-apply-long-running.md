---
title: Long bootstrap applies survive client timeouts and interrupted processes
status: open
priority: must
tags:
  - bootstrap
  - mcp
  - recovery
semantic_text: The bootstrap apply operation must report progress after every applied action. The MCP server must send each progress report as a progress notification when the request carries a progress token. The MCP apply tool must return a job receipt for polling when it is called with async and the job status tool is enabled. The bootstrap recovery operation must re-apply an action that was interrupted before its checkpoint without journal edits. The bootstrap recovery operation must reclaim a source lock whose holder process is dead and record the reclaim in the journal. The source lock must keep blocking writers while its holder process is alive.
semantic_clauses:
  - The bootstrap apply operation must report progress after every applied action.
  - The MCP server must send each progress report as a progress notification when the request carries a progress token.
  - The MCP apply tool must return a job receipt for polling when it is called with async and the job status tool is enabled.
  - The bootstrap recovery operation must re-apply an action that was interrupted before its checkpoint without journal edits.
  - The bootstrap recovery operation must reclaim a source lock whose holder process is dead and record the reclaim in the journal.
  - The source lock must keep blocking writers while its holder process is alive.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d1b41482fbc5dcf5a3e762ce836f627e50866aa58f6fdc382fc26375c0d96bd4
semantic_inventory:
  - claim_key: CLAIM-B81E8C17EEE995F0
    claim_text: The bootstrap apply operation must report progress after every applied action
    role: normative
    status: modeled
    span:
      start: 0
      end: 77
  - claim_key: CLAIM-20889CFB64AD837A
    claim_text: The MCP server must send each progress report as a progress notification when the request carries a progress token
    role: normative
    status: modeled
    span:
      start: 79
      end: 193
  - claim_key: CLAIM-925F274C73C47525
    claim_text: The MCP apply tool must return a job receipt for polling when it is called with async and the job status tool is enabled
    role: normative
    status: modeled
    span:
      start: 195
      end: 315
  - claim_key: CLAIM-36E11DC497997E8E
    claim_text: The bootstrap recovery operation must re-apply an action that was interrupted before its checkpoint without journal edits
    role: normative
    status: modeled
    span:
      start: 317
      end: 438
  - claim_key: CLAIM-6714C864F50EFE50
    claim_text: The bootstrap recovery operation must reclaim a source lock whose holder process is dead and record the reclaim in the journal
    role: normative
    status: modeled
    span:
      start: 440
      end: 566
  - claim_key: CLAIM-20ABD642DC96A8D6
    claim_text: The source lock must keep blocking writers while its holder process is alive
    role: normative
    status: modeled
    span:
      start: 568
      end: 644
logic_claims:
  - CLAIM-B81E8C17EEE995F0
  - CLAIM-20889CFB64AD837A
  - CLAIM-925F274C73C47525
  - CLAIM-36E11DC497997E8E
  - CLAIM-6714C864F50EFE50
  - CLAIM-20ABD642DC96A8D6
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:55.013Z'
id: REQ-bootstrap-apply-long-running
type: req
---
The bootstrap apply operation must report progress after every applied action. The MCP server must send each progress report as a progress notification when the request carries a progress token. The MCP apply tool must return a job receipt for polling when it is called with async and the job status tool is enabled. The bootstrap recovery operation must re-apply an action that was interrupted before its checkpoint without journal edits. The bootstrap recovery operation must reclaim a source lock whose holder process is dead and record the reclaim in the journal. The source lock must keep blocking writers while its holder process is alive.

## Context
In an external onboarding evaluation a 374-action bootstrap plan ran past the MCP client's default 60 second timeout because kb_apply_plan sent no progress. The client gave up and the server was killed during action 277. On restart the source lock held by the dead process demanded operator recovery, and recovery with the journal id was refused because the interrupted action had already changed the workspace after its last checkpoint. The tester then edited the recovery journal by hand, which Kibi forbids. Piotr asked for progress, an async receipt for large plans, recovery that tolerates the interrupted action, and automatic reclaim of a dead holder's lock.

## Source
> Apply 374 akcji trwa >60 s, a MCP nie wysyła żadnych notyfikacji postępu.

Onboarding evaluation of Kibi 2.7.0 and kibi-mcp 3.2.0 in a test project, round 4 analysis (2026-10-07), finding K2.
