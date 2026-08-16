---
id: REQ-cli-init
title: Scaffold .kb directory, config, and git hooks
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-003
priority: must
tags:
  - cli
  - init
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-001
semantic_text: The `kibi init` command scaffolds the `.kb/` directory structure, creates a default `config.json`, ensures `.kb/` is ignored by git, and optionally installs git hooks for automatic sync and validation. It also ensures the `documentation/symbols.yaml` manifest exists.
semantic_clauses:
  - The `kibi init` command scaffolds the `.kb/` directory structure, creates a default `config.json`, ensures `.kb/` is ignored by git, and optionally installs git hooks for automatic sync and validation.
  - It also ensures the `documentation/symbols.yaml` manifest exists.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2a255ced45948eb933a1cdd7add7610d9c8db0d2eb040c78b064b446192b79d2
logic_claims:
  - CLAIM-2096325EBD94244E
  - CLAIM-71746CD7554F8801
semantic_inventory:
  - claim_key: CLAIM-2096325EBD94244E
    claim_text: The `kibi init` command scaffolds the `.kb/` directory structure, creates a default `config.json`, ensures `.kb/` is ignored by git, and optionally installs git hooks for automatic sync and validation
    role: descriptive
    status: ontology_gap
    span:
      start: 0
      end: 200
    payload_hash: 2f34fc8264f888335e8ef75e807f7bc380c57708c5b9efcc3406cb8d53ab1ee3
    reason: No approved domain predicate schema expresses this clause; generic logical_requirement_rule grounding was removed.
  - claim_key: CLAIM-71746CD7554F8801
    claim_text: It also ensures the `documentation/symbols.yaml` manifest exists
    role: descriptive
    status: ontology_gap
    span:
      start: 202
      end: 266
    payload_hash: 2f34fc8264f888335e8ef75e807f7bc380c57708c5b9efcc3406cb8d53ab1ee3
    reason: No approved domain predicate schema expresses this clause; generic logical_requirement_rule grounding was removed.
type: req
---

The `kibi init` command scaffolds the `.kb/` directory structure, creates a default `config.json`,
ensures `.kb/` is ignored by git, and optionally installs git hooks for automatic sync and validation.
It also ensures the `documentation/symbols.yaml` manifest exists.
