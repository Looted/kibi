---
title: kibi doctor names only the merge driver setup steps that are missing
status: open
priority: should
firmness: firm
tags:
  - cli
  - doctor
  - merge-driver
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05: "Yes, please." in reply to the proposal to fix two Kibi gaps found while setting up a test project (full kibi check accepts an entity id declared twice while kibi check --staged refuses every commit over it; kibi doctor asks for .gitattributes lines that are already present)'
  approved_by: maintainer
  recorded_at: '2026-11-05T11:47:16.789Z'
semantic_text: When .gitattributes already routes .kb/symbols.yaml to merge=kibi, the kibi doctor merge driver remediation must name only the git config command that sets merge.kibi.driver.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4694e03f854273d7c89a16432e82d2eb07e4e17fad1aec1f6254e58c59709aa5
semantic_inventory:
  - claim_key: CLAIM-0ABAC5F4DF0DA14B
    claim_text: When .gitattributes already routes .kb/symbols.yaml to merge=kibi, the kibi doctor merge driver remediation must name only the git config command that sets merge.kibi.driver
    role: condition
    status: modeled
    span:
      start: 0
      end: 173
logic_claims:
  - CLAIM-0ABAC5F4DF0DA14B
id: REQ-cli-doctor-merge-driver-remediation
type: req
---
When .gitattributes already routes .kb/symbols.yaml to merge=kibi, the kibi doctor merge driver remediation must name only the git config command that sets merge.kibi.driver.

When both pieces are missing, the remediation still names the two `.gitattributes` lines and then the command; when only the attribute is missing, it names only the lines. `kibi migrate` prints the same steps in its merge driver tip.

## Context

In a test project whose `.gitattributes` already held both `merge=kibi` lines, `kibi doctor` reported only that `merge.kibi.driver` was unset but still told the user to add the lines to `.gitattributes`. The maintainer approved fixing it.

## Source

> Yes, please.

(in reply to: "doctor's merge-driver hint asks you to add `.gitattributes` lines that are already there. Want a Kibi PR for those?")