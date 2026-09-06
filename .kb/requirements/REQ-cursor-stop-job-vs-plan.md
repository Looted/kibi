---
id: REQ-cursor-stop-job-vs-plan
title: Cursor stop hook distinguishes plan delivery from job completion
status: open
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: documentation/requirements/REQ-cursor-stop-job-vs-plan.md
priority: must
owner: cursor-team
tags:
  - kibi
  - cursor
  - plugin
  - hooks
links:
  - type: relates_to
    target: REQ-cursor-kibi-plugin-v1
  - type: specified_by
    target: SCEN-cursor-stop-job-vs-plan
  - type: verified_by
    target: TEST-cursor-stop-job-vs-plan
  - type: relates_to
    target: FACT-OBS-cursor-stop-plan-vs-job
  - type: relates_to
    target: FACT-OBS-cursor-stop-createplan-silent
  - type: relates_to
    target: FACT-OBS-cursor-stop-reads-not-dirty
  - type: relates_to
    target: FACT-OBS-cursor-stop-plan-with-edits
semantic_text: The Cursor Kibi stop hook must treat plan delivery as distinct from job completion. After a turn that observed CreatePlan and did not edit source files or mutate the knowledge base, the stop hook must not emit a followup_message. Source-file reads, search, and other non-edit tools must not be recorded as dirty paths. If the same turn both delivered a plan and actually edited source or mutated the knowledge base, the existing freshness or KB-mutation follow-up still applies.
semantic_clauses:
  - The Cursor Kibi stop hook must treat plan delivery as distinct from job completion
  - After a turn that observed CreatePlan and did not edit source files or mutate the knowledge base, the stop hook must not emit a followup_message
  - Source-file reads, search, and other non-edit tools must not be recorded as dirty paths
  - If the same turn both delivered a plan and actually edited source or mutated the knowledge base, the existing freshness or KB-mutation follow-up still applies
logic_claims:
  - CLAIM-C4A8EFB8E769B0F4
  - CLAIM-206C1108783A0F3C
  - CLAIM-8BA59596EE190D0A
  - CLAIM-A6DF003C6B5AD69A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e14e56ff232535eea91e58ff18aa7a140839a51dfbb700d395e853b17f17a4bc
semantic_inventory:
  - claim_key: CLAIM-C4A8EFB8E769B0F4
    claim_text: The Cursor Kibi stop hook must treat plan delivery as distinct from job completion
    role: normative
    status: modeled
    span:
      end: 82
      start: 0
  - claim_key: CLAIM-206C1108783A0F3C
    claim_text: After a turn that observed CreatePlan and did not edit source files or mutate the knowledge base, the stop hook must not emit a followup_message
    role: normative
    status: modeled
    span:
      end: 228
      start: 84
  - claim_key: CLAIM-8BA59596EE190D0A
    claim_text: Source-file reads, search, and other non-edit tools must not be recorded as dirty paths
    role: normative
    status: modeled
    span:
      end: 317
      start: 230
  - claim_key: CLAIM-A6DF003C6B5AD69A
    claim_text: If the same turn both delivered a plan and actually edited source or mutated the knowledge base, the existing freshness or KB-mutation follow-up still applies
    role: condition
    status: modeled
    span:
      end: 477
      start: 319
type: req
---

The Cursor Kibi `stop` hook must treat plan delivery as distinct from job completion.

Cursor does not expose a plan-versus-agent field on `stop`. The plugin observes tools used in that agent loop: `CreatePlan` is plan delivery, and only known editable tools (`Write`, `StrReplace`, `Edit`, and related names) record dirty paths. Reads, search, and `SwitchMode` do not count as edits.

After a turn that observed `CreatePlan` and did not edit source or mutate the knowledge base, `stop` must not emit `followup_message`. If that same turn also edited source or ran `kb_upsert` / `kb_delete`, the existing freshness or KB-mutation follow-up still applies.
