---
title: Requirement-derived subject keys converged onto shared subject vocabulary
status: active
fact_kind: observation
tags:
  - vocabulary
  - follow-up
  - subject-key-identity
id: FACT-OBS-req-derived-subject-keys-followup
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Observation (completed): the follow-up to converge requirement-derived subject keys onto the shared subject vocabulary is done.

- Subject-key identity findings went from 28 to 0: strict facts no longer mint subject keys from the owning requirement ID.
- Subject-key shape findings went from 11 to 0.
- The orphaned strict fact `FACT-PROP-REQ-MCP-SUGGEST-PREDICATES-C02`, which no requirement referenced after convergence, was deleted.

No further action is tracked here. New strict facts must reuse existing subject keys from the shared vocabulary instead of deriving them from requirement IDs.
