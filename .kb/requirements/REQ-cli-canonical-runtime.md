---
title: Runtime operations honor the canonical .kb/ contract
status: open
priority: must
tags:
  - cli
  - sync
  - canonical-layout
semantic_text: After init, runtime operations honor the canonical .kb/ contract. kibi sync extracts Markdown and YAML metadata from discovered files and upserts the results into the branch Prolog KB. kibi sync must discover tracked Markdown and the symbols manifest from the canonical .kb knowledge lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, .kb/events, and .kb/symbols.yaml. kibi sync must not honor leftover .kb/config.json path overrides. README.md files under entity directories must be ignored by sync discovery. Untracked knowledge files must not be ingested unless a pending source receipt recovers them. kb_upsert source authoring must write markdown entities into the matching canonical .kb lane and symbols into .kb/symbols.yaml. document.path may target authored .kb knowledge lanes and must reject derived .kb trees including branches, recovery, verification, briefs, and migrations. createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/migrations and must not ignore authored knowledge lanes. MCP workspace activation and Cursor hook readiness must treat .kb/manifest.json as the initialized project signal, not leftover .kb/config.json.
logic_claims:
  - CLAIM-5C2F95488F59C332
  - CLAIM-4DE82FA09941309C
  - CLAIM-AAEAF6504ABB4ECE
  - CLAIM-ACC45FF9773A9AEA
  - CLAIM-FFBFCED402A50713
  - CLAIM-FDB2F593DE25BF3A
  - CLAIM-0B0734835B2F77AC
  - CLAIM-B842BEFAEC1A9D00
  - CLAIM-43BD9C7F35E8F20D
semantic_clauses:
  - kibi sync extracts Markdown and YAML metadata from discovered files and upserts the results into the branch Prolog KB
  - kibi sync must discover tracked Markdown and the symbols manifest from the canonical .kb knowledge lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, .kb/events, and .kb/symbols.yaml
  - kibi sync must not honor leftover .kb/config.json path overrides
  - README.md files under entity directories must be ignored by sync discovery
  - Untracked knowledge files must not be ingested unless a pending source receipt recovers them
  - kb_upsert source authoring must write markdown entities into the matching canonical .kb lane and symbols into .kb/symbols.yaml
  - document.path may target authored .kb knowledge lanes and must reject derived .kb trees including branches, recovery, verification, briefs, and migrations
  - createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/migrations and must not ignore authored knowledge lanes
  - MCP workspace activation and Cursor hook readiness must treat .kb/manifest.json as the initialized project signal, not leftover .kb/config.json
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bd7f1794e5a7d0e75cea93598d903385c3628db3e8348b6a95504718c0aaaf54
semantic_inventory:
  - claim_key: CLAIM-5C2F95488F59C332
    claim_text: kibi sync extracts Markdown and YAML metadata from discovered files and upserts the results into the branch Prolog KB
    role: descriptive
    status: ontology_gap
    span:
      start: 66
      end: 183
  - claim_key: CLAIM-4DE82FA09941309C
    claim_text: kibi sync must discover tracked Markdown and the symbols manifest from the canonical .kb knowledge lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, .kb/events, and .kb/symbols.yaml
    role: normative
    status: ontology_gap
    span:
      start: 185
      end: 403
  - claim_key: CLAIM-AAEAF6504ABB4ECE
    claim_text: kibi sync must not honor leftover .kb/config.json path overrides
    role: normative
    status: ontology_gap
    span:
      start: 405
      end: 469
  - claim_key: CLAIM-ACC45FF9773A9AEA
    claim_text: README.md files under entity directories must be ignored by sync discovery
    role: normative
    status: ontology_gap
    span:
      start: 471
      end: 545
  - claim_key: CLAIM-FFBFCED402A50713
    claim_text: Untracked knowledge files must not be ingested unless a pending source receipt recovers them
    role: exception
    status: ontology_gap
    span:
      start: 547
      end: 639
  - claim_key: CLAIM-FDB2F593DE25BF3A
    claim_text: kb_upsert source authoring must write markdown entities into the matching canonical .kb lane and symbols into .kb/symbols.yaml
    role: normative
    status: ontology_gap
    span:
      start: 641
      end: 767
  - claim_key: CLAIM-0B0734835B2F77AC
    claim_text: document.path may target authored .kb knowledge lanes and must reject derived .kb trees including branches, recovery, verification, briefs, and migrations
    role: normative
    status: ontology_gap
    span:
      start: 769
      end: 923
  - claim_key: CLAIM-B842BEFAEC1A9D00
    claim_text: createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/migrations and must not ignore authored knowledge lanes
    role: normative
    status: ontology_gap
    span:
      start: 925
      end: 1058
  - claim_key: CLAIM-43BD9C7F35E8F20D
    claim_text: MCP workspace activation and Cursor hook readiness must treat .kb/manifest.json as the initialized project signal, not leftover .kb/config.json
    role: normative
    status: ontology_gap
    span:
      start: 1060
      end: 1203
id: REQ-cli-canonical-runtime
type: req
---
Runtime operations honor the canonical `.kb/` contract after init.

This requirement supersedes `REQ-cli-sync`'s `config.json` path-discovery claim and covers sync discovery, source authoring, ignore policy, MCP activation, and Cursor hook readiness. Scaffolding itself remains `REQ-cli-init-canonical` and `ADR-026`.
