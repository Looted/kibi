---
title: Shipped behavior does not rest on a requirement nobody approved
status: open
priority: must
required_evidence: tested
tags:
  - check
  - origin
  - evidence-floor
firmness: default
semantic_text: Kibi check must fail a current must requirement an agent wrote that production symbols implement when no person approved it more than 14 days after it was created.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 122ae8777b2d8a03c1ada9eb3a7c5205948201913fa17215ea9778d0bc8bb92a
semantic_inventory:
  - claim_key: CLAIM-90FC546A2BFA4B48
    claim_text: Kibi check must fail a current must requirement an agent wrote that production symbols implement when no person approved it more than 14 days after it was created
    role: normative
    status: modeled
    span:
      start: 0
      end: 162
logic_claims:
  - CLAIM-90FC546A2BFA4B48
origin:
  kind: agent
  ref: 'Maintainer handoff, 2026-11-12, reporting a test project where a shipped bug rested on an unapproved agent requirement: "an active `priority: must` requirement that production code implements, still unapproved after N days, should become a WARNING (or carry a `tested` floor by default)". Maintainer standing rule: new checks ship blocking with a schema migration and changelog.'
  approved_by: maintainer
  recorded_at: '2026-11-12T18:20:00.000Z'
id: REQ-kibi-unapproved-implemented-requirement
type: req
---
Kibi check must fail a current must requirement an agent wrote that production symbols implement when no person approved it more than 14 days after it was created.

## Context

In a test project an agent wrote a must requirement that production code implemented for 17 days without any person approving it. Its claims were not modeled, its evidence level was unverified, and the only signals were an informational agent-requirement-unapproved finding and a coverage review note, so a shipped bug rested on a requirement nobody had confirmed. The blocking agent-requirement-unapproved-implemented rule closes that gap: once code implements an unapproved must requirement for more than 14 days, kibi check fails until a person approves it (which, from KB schema 15, also gives it the tested evidence floor), the requirement is fixed, or its priority is lowered. Fourteen days leaves room for review while a change is in flight. It ships blocking, as Kibi's new checks do, because no migration can approve a requirement on a person's behalf. The age comes from authored data only: origin.recorded_at, which every kb_upsert write records, else a created_at the front matter states; a requirement with neither counts as older. The stored created_at is not read because sync fills a missing one with the sync time, which would restart the clock on every fresh clone, CI run and rebuild. The schema 15 upgrade lists the requirements this rule can fail at once.

## Source

> Suggest: an active `priority: must` requirement that production code implements, still unapproved after N days, should become a WARNING (or carry a `tested` floor by default), so a shipped behaviour cannot rest on an unmodeled, unapproved requirement indefinitely.

Maintainer handoff, 2026-11-12.
