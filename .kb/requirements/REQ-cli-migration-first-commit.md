---
title: The first commit after kibi migrate passes the pre-commit gates when it adds nothing else
status: open
required_evidence: tested
priority: must
tags:
  - cli
  - migration
  - staged
  - symbols
  - coordinates
rationale: 'The first commit after a migration always failed the pre-commit hook: on generated coordinate drift migrate itself caused, then on symbols only migrate had touched.'
semantic_text: kibi migrate must refresh the generated symbol coordinates when it rewrites or moves the symbols manifest. In a commit that carries a kibi migrate run, the staged check must not count a symbol record as changed when it differs from its base only in fields the migration writes. The staged check must judge a symbol record that the commit changes in any other field.
semantic_clauses:
  - kibi migrate must refresh the generated symbol coordinates when it rewrites or moves the symbols manifest.
  - In a commit that carries a kibi migrate run, the staged check must not count a symbol record as changed when it differs from its base only in fields the migration writes.
  - The staged check must judge a symbol record that the commit changes in any other field.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d95918c89e84f20ed2a397715ea9bc06e213ea152c77731a2bc8da18d5423026
semantic_inventory:
  - claim_key: CLAIM-D2B7E425F2E27BB9
    claim_text: kibi migrate must refresh the generated symbol coordinates when it rewrites or moves the symbols manifest
    role: normative
    status: modeled
    span:
      start: 0
      end: 105
  - claim_key: CLAIM-FAECAC2314B4F934
    claim_text: In a commit that carries a kibi migrate run, the staged check must not count a symbol record as changed when it differs from its base only in fields the migration writes
    role: normative
    status: modeled
    span:
      start: 107
      end: 276
  - claim_key: CLAIM-8978BA88AFEA16AD
    claim_text: The staged check must judge a symbol record that the commit changes in any other field
    role: normative
    status: modeled
    span:
      start: 278
      end: 364
logic_claims:
  - CLAIM-D2B7E425F2E27BB9
  - CLAIM-FAECAC2314B4F934
  - CLAIM-8978BA88AFEA16AD
origin:
  kind: agent
  recorded_at: '2026-10-14T08:45:46.601Z'
id: REQ-cli-migration-first-commit
type: req
---
kibi migrate must refresh the generated symbol coordinates when it rewrites or moves the symbols manifest. In a commit that carries a kibi migrate run, the staged check must not count a symbol record as changed when it differs from its base only in fields the migration writes. The staged check must judge a symbol record that the commit changes in any other field.

## Context

On a legacy KB, `kibi migrate --yes` followed by `kibi init`, `kibi sync` and `git add` produced a first commit that the pre-commit hook rejected twice. `kibi check-generated --staged` reported generated manifest drift in `.kb/symbols.yaml` and `.kb/symbol-coordinates.yaml`, because migrate adds `granularity_reason: legacy-link` to coarse symbol links (which changes the coordinate identity hash) and moves the manifest without regenerating coordinates. After a manual `kibi sync --refresh-symbol-coordinates`, `kibi check --staged` then charged the commit with symbol-coverage findings on symbols that only migrate had touched, because their legacy-link marks made them differ from the pre-migration base.

Migrate now refreshes coordinates the way `kibi sync --refresh-symbol-coordinates` does whenever its run rewrote or moved the symbols manifest. The staged check treats a commit as carrying a migration when the staged `.kb/manifest.json` records a newer schema generation than the base (or the commit retires the legacy `.kb/config.json`); the audit record under `.kb/migrations/` is ignored by Git, so it is not the signal. In such a commit, a symbol record whose only differences from its base are a `granularity_reason: legacy-link` the base lacked or an added `review:context-missing` tag is not counted as changed (`origin`, a removed dead `source` and a pinned `semantic_text` are not part of the compared symbol signature). Records the commit changes in any other field, and records it adds, are judged as before.

## Source

> kibi: generated manifest drift in staged snapshot: .kb/symbols.yaml, .kb/symbol-coordinates.yaml

Hook output from the first commit after `kibi migrate --yes` on a legacy-layout test project (kibi-cli 2.23.0), followed by symbol-coverage violations on symbols the migration had only marked legacy-link.
