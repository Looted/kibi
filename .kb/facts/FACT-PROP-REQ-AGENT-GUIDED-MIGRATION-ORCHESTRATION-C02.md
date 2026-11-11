---
title: kibi.migration.orchestration clause 2
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.migration.orchestration
property_key: plan_hash_binds_snapshots
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_agent_guided_migration_orchestration.plan_hash_binds_snapshots.eq.true
claim_key: CLAIM-A3051C44CDE8EFB7
claim_text: A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains
id: FACT-PROP-REQ-AGENT-GUIDED-MIGRATION-ORCHESTRATION-C02
type: fact
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:34:18.000Z'
---
