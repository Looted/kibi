---
title: Engine-backed operations on an unmigrated legacy branch store are refused
status: open
priority: must
required_evidence: tested
semantic_text: While a branch is attached through an unmigrated legacy literal-path store, a CLI or MCP operation that needs the KB engine must be refused with the command that migrates that store, unless it is the plan apply that migrates it. The KB engine must not create a hashed branch store beside an unmigrated legacy store. A migration plan must not plan branch store recovery for a store whose only damage is an unmigrated legacy store.
semantic_clauses:
  - While a branch is attached through an unmigrated legacy literal-path store, a CLI or MCP operation that needs the KB engine must be refused with the command that migrates that store, unless it is the plan apply that migrates it.
  - The KB engine must not create a hashed branch store beside an unmigrated legacy store.
  - A migration plan must not plan branch store recovery for a store whose only damage is an unmigrated legacy store.
tags:
  - git
  - branching
  - storage
  - migration
  - cli
  - mcp
origin:
  kind: agent
  recorded_at: '2026-11-16T20:45:08.549Z'
  ref: 'Fix for a legacy branch store that engine reads turned unmigratable, 2026-11-16. Maintainer decision, 2026-11-17, approving the statement as worded: "Approved".'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8b976e16f4b7ad40fab4f9f0d181935ba5f8370ee6390f9e1d7043607113727d
semantic_inventory:
  - claim_key: CLAIM-1719E4CB8A1092D1
    claim_text: While a branch is attached through an unmigrated legacy literal-path store, a CLI or MCP operation that needs the KB engine must be refused with the command that migrates that store, unless it is the plan apply that migrates it
    role: exception
    status: modeled
    span:
      start: 0
      end: 227
  - claim_key: CLAIM-CD70DAEFE1018721
    claim_text: The KB engine must not create a hashed branch store beside an unmigrated legacy store
    role: normative
    status: modeled
    span:
      start: 229
      end: 314
  - claim_key: CLAIM-A6EEF56E53B8EECA
    claim_text: A migration plan must not plan branch store recovery for a store whose only damage is an unmigrated legacy store
    role: normative
    status: modeled
    span:
      start: 316
      end: 428
logic_claims:
  - CLAIM-1719E4CB8A1092D1
  - CLAIM-CD70DAEFE1018721
  - CLAIM-A6EEF56E53B8EECA
id: REQ-kibi-legacy-attachment-engine-refusal
type: req
---
While a branch is attached through an unmigrated legacy literal-path store, a CLI or MCP operation that needs the KB engine must be refused with the command that migrates that store, unless it is the plan apply that migrates it. The KB engine must not create a hashed branch store beside an unmigrated legacy store. A migration plan must not plan branch store recovery for a store whose only damage is an unmigrated legacy store.

## Context

After an upgrade from an older Kibi, a branch can still be attached through its legacy literal-path store until kibi migrate --apply-safe moves it. The KB engine serves only the hashed store. Any engine-backed CLI command (kibi query, kibi check, kibi search, kibi engine status and others) therefore created an empty hashed store beside the legacy one and answered from it: queries returned nothing and checks passed vacuously. With both stores present, kibi migrate, kibi sync and kibi query then failed as ambiguous, kibi branch migrate and kibi branch recover refused, and only deleting the empty store by hand recovered the project. The MCP server already refused these tools on a legacy attachment; the CLI only warned. A migration plan for a legacy store also planned branch store recovery, which then rebuilt the store the legacy migration had just moved. REQ-kibi-cli-legacy-apply-safe covers the plan apply itself; this requirement covers every other operation.

## Source

> Maintainer decision, 2026-11-17, approving the statement as worded: "Approved"
