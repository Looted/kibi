---
title: A review observation quoting a claim is written and a grounding fact without a claim key gets the key derived
status: active
tags:
  - facts
  - observation
  - review
  - claim-key
expects: success
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: test project onboarding round 3 (advisor roles, relationship upserts, review observations)'
  recorded_at: '2026-10-06T20:44:13.508Z'
id: SCEN-kibi-review-observation-claim-text
type: scenario
---
Given a requirement written by an approved bootstrap plan whose ledger holds one claim, when an agent links a scenario to it without resending the ledger, then the stored proposition ledger is unchanged. When the agent records an observation fact that quotes the claim in `claim_text` without a `claim_key`, then the observation is written as a keyless review note. When the agent writes a `property_value` fact that quotes the same claim in `claim_text` without a `claim_key`, then the fact is written and its stored `claim_key` equals the ledger's key for that clause. When the agent sends that fact with a `claim_key` that does not match its text, then the write is refused with the expected key. Assumes the bootstrap plan applied cleanly and `kb_check` logic coverage runs on the synced branch.