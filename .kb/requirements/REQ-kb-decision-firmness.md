---
title: Decisions carry firmness and supersedes explain themselves
status: open
required_evidence: tested
priority: must
tags:
  - kb
  - decisions
  - migration
semantic_text: Kibi must report a current firm requirement or ADR that names no human reference as a decision-firm-unreferenced violation. Kibi must report a current decision that is not firm and supersedes a firm decision as a decision-firm-superseded violation. Kibi must report a current superseding requirement or ADR without a Why this changed section as a supersedes-reason-missing violation. Kibi must honor the supersedes reason acknowledgement only for entity ids the schema 9 migration recorded. Kibi must show the effective firmness of requirements and ADRs in search and query results.
logic_claims:
  - CLAIM-A9A966DC22239FC4
  - CLAIM-0984B0AFA812FAAD
  - CLAIM-63B4C57ED3166492
  - CLAIM-A673E25EA772739B
  - CLAIM-BBF446817AF48D2B
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 86290b7e7a9c0750d9d57aba630f4c1dff425949498e15a734cd8084cd556c33
semantic_inventory:
  - claim_key: CLAIM-A9A966DC22239FC4
    claim_text: Kibi must report a current firm requirement or ADR that names no human reference as a decision-firm-unreferenced violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
  - claim_key: CLAIM-0984B0AFA812FAAD
    claim_text: Kibi must report a current decision that is not firm and supersedes a firm decision as a decision-firm-superseded violation
    role: normative
    status: modeled
    span:
      start: 124
      end: 247
  - claim_key: CLAIM-63B4C57ED3166492
    claim_text: Kibi must report a current superseding requirement or ADR without a Why this changed section as a supersedes-reason-missing violation
    role: normative
    status: modeled
    span:
      start: 249
      end: 382
  - claim_key: CLAIM-A673E25EA772739B
    claim_text: Kibi must honor the supersedes reason acknowledgement only for entity ids the schema 9 migration recorded
    role: normative
    status: modeled
    span:
      start: 384
      end: 489
  - claim_key: CLAIM-BBF446817AF48D2B
    claim_text: Kibi must show the effective firmness of requirements and ADRs in search and query results
    role: normative
    status: modeled
    span:
      start: 491
      end: 581
origin:
  kind: agent
  recorded_at: '2026-10-12T22:24:19.023Z'
id: REQ-kb-decision-firmness
type: req
---
Kibi must report a current firm requirement or ADR that names no human reference as a decision-firm-unreferenced violation. Kibi must report a current decision that is not firm and supersedes a firm decision as a decision-firm-superseded violation. Kibi must report a current superseding requirement or ADR without a Why this changed section as a supersedes-reason-missing violation. Kibi must honor the supersedes reason acknowledgement only for entity ids the schema 9 migration recorded. Kibi must show the effective firmness of requirements and ADRs in search and query results.

## Context
An agent that reads an older requirement or ADR cannot tell a rule a human stated from a guess an earlier agent wrote, so it may supersede a human decision on preference alone, and a supersede records no reason a later reader can weigh. Origin already records who wrote an entity; firmness records how firmly the decision was made. The maintainer chose a hard rollout: firm decisions must cite the human words they rest on, only a firm decision may replace a firm one, and every new supersede must say why under a "Why this changed" heading that names evidence. Supersedes recorded before schema 9 are acknowledged by the migration in the manifest instead of being given an invented reason. The 12-word minimum keeps a one-word placeholder out; no further reason for that number was stated.

## Source
> Decision standing: firmness, not authorship. Firm needs a reference to the human words; supersedes must explain why; legacy supersedes are acknowledged by migration.

Decision firmness recommendation approved by the maintainer, 2026-10-12.
