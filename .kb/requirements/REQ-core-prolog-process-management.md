---
id: REQ-core-prolog-process-management
title: SWI-Prolog process management and JSON-RPC lifecycle
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-08-07T15:00:00.000Z
source: REQ-001
priority: must
tags:
  - core
  - prolog
  - lifecycle
links:
  - type: supersedes
    target: REQ-001
  - type: specified_by
    target: SCEN-001
semantic_text: Prolog process management. The CLI manages the SWI-Prolog child process lifecycle including startup, shutdown, and error recovery. Communication with the Prolog engine uses a framed JSON-RPC bridge ensuring robust serialization of complex entity graphs. MCP refreshes the attached branch KB when the same branch snapshot is replaced externally while remaining attached to the branch. One-shot query execution must preserve read-after-write consistency for compound goals. Compound goals including the status query must bypass the PrologProcess result cache. A same-session status query must observe writes made after a previous call.
semantic_clauses:
  - The CLI manages the SWI-Prolog child process lifecycle including startup, shutdown, and error recovery
  - Communication with the Prolog engine uses a framed JSON-RPC bridge ensuring robust serialization of complex entity graphs
  - MCP refreshes the attached branch KB when the same branch snapshot is replaced externally while remaining attached to the branch
  - One-shot query execution must preserve read-after-write consistency for compound goals
  - Compound goals including the status query must bypass the PrologProcess result cache
  - A same-session status query must observe writes made after a previous call
semantic_inventory:
  - claim_key: CLAIM-A0765917F200ED72
    claim_text: The CLI manages the SWI-Prolog child process lifecycle including startup, shutdown, and error recovery
    role: descriptive
    status: modeled
    span:
      start: 27
      end: 129
    payload_hash: 37298499048a9dc5968885ac5dfc0d436c9dacd83d5e89092efc46e0683cafe3
    reason: Grounded by FACT-core-prolog-process-management-00ED72 via requires_predicate.
  - claim_key: CLAIM-90709BED7EE396BE
    claim_text: Communication with the Prolog engine uses a framed JSON-RPC bridge ensuring robust serialization of complex entity graphs
    role: descriptive
    status: modeled
    span:
      start: 131
      end: 252
    payload_hash: 37298499048a9dc5968885ac5dfc0d436c9dacd83d5e89092efc46e0683cafe3
    reason: Grounded by FACT-core-prolog-process-management-E396BE via requires_predicate.
  - claim_key: CLAIM-AB90C4996C5009E0
    claim_text: MCP refreshes the attached branch KB when the same branch snapshot is replaced externally while remaining attached to the branch
    role: normative
    status: modeled
    span:
      start: 254
      end: 382
    payload_hash: 37298499048a9dc5968885ac5dfc0d436c9dacd83d5e89092efc46e0683cafe3
    reason: Grounded by FACT-core-prolog-process-management-5009E0 via requires_predicate.
  - claim_key: CLAIM-EB52BC80E753E17A
    claim_text: One-shot query execution must preserve read-after-write consistency for compound goals
    role: normative
    status: modeled
    span:
      start: 384
      end: 470
    payload_hash: 37298499048a9dc5968885ac5dfc0d436c9dacd83d5e89092efc46e0683cafe3
    reason: Grounded by FACT-core-prolog-process-management-53E17A via requires_predicate.
  - claim_key: CLAIM-61866D483A777C0D
    claim_text: Compound goals including the status query must bypass the PrologProcess result cache
    role: normative
    status: modeled
    span:
      start: 472
      end: 556
    payload_hash: 37298499048a9dc5968885ac5dfc0d436c9dacd83d5e89092efc46e0683cafe3
    reason: Grounded by FACT-core-prolog-process-management-777C0D via requires_predicate.
  - claim_key: CLAIM-5A7BDFF1926F473B
    claim_text: A same-session status query must observe writes made after a previous call
    role: normative
    status: modeled
    span:
      start: 558
      end: 632
    payload_hash: 37298499048a9dc5968885ac5dfc0d436c9dacd83d5e89092efc46e0683cafe3
    reason: Grounded by FACT-core-prolog-process-management-6F473B via requires_predicate.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1ce46b0cba8e8c6a95f47924d496776b9ab4911acbf16eab1525203ffaab6444
logic_claims:
  - CLAIM-A0765917F200ED72
  - CLAIM-90709BED7EE396BE
  - CLAIM-AB90C4996C5009E0
  - CLAIM-EB52BC80E753E17A
  - CLAIM-61866D483A777C0D
  - CLAIM-5A7BDFF1926F473B
type: req
---

The CLI manages the lifecycle of the SWI-Prolog child process, handling startup, shutdown, and error recovery.
Communication with the Prolog engine is conducted via a JSON-RPC bridge, ensuring robust serialization of complex entity graphs.

MCP must refresh the attached branch KB when the same branch snapshot is replaced externally (for example, by `kibi sync --rebuild`) while remaining attached to the branch.

Read-after-write consistency is preserved across one-shot (bun) queries: compound goals such as the status query must not be served from the PrologProcess query cache, so a same-session `kb_status` observes file and KB writes made after a previous call instead of returning a stale freshness result.
