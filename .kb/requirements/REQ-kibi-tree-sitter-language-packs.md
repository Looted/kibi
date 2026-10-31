---
title: Tree-sitter grammars install as per-language packs the plugin verifies
status: open
priority: should
required_evidence: tested
tags:
  - plugin
  - multilingual
  - source-analysis
semantic_text: kibi-plugin-treesitter must load a Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform or HCL grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog. kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install. Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins.
semantic_clauses:
  - kibi-plugin-treesitter must load a Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform or HCL grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog.
  - kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install.
  - Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins.
origin:
  kind: agent
  ref: 'Maintainer question, 2026-10-31, on the tree-sitter plugin shipping every grammar: "Will everyone have to load support for all languages?", then the decision to split the grammars into per-language packs in the same change'
  approved_by: maintainer
  recorded_at: '2026-10-31T18:28:58.476Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ff7f8777e40ca9c15987fa7b519c7261ead1f7cc7156030dda6174e8fd155989
semantic_inventory:
  - claim_key: CLAIM-469CA72D8C01287D
    claim_text: kibi-plugin-treesitter must load a Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform or HCL grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog
    role: normative
    status: modeled
    span:
      start: 0
      end: 220
  - claim_key: CLAIM-1D2DB1AD16B49600
    claim_text: kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install
    role: normative
    status: modeled
    span:
      start: 222
      end: 361
  - claim_key: CLAIM-44E1AB73FC387EEA
    claim_text: Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins
    role: normative
    status: modeled
    span:
      start: 363
      end: 498
logic_claims:
  - CLAIM-469CA72D8C01287D
  - CLAIM-1D2DB1AD16B49600
  - CLAIM-44E1AB73FC387EEA
id: REQ-kibi-tree-sitter-language-packs
type: req
---
kibi-plugin-treesitter must load a Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform or HCL grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog. kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install. Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins.

## Context

Until 3.0, kibi-plugin-treesitter shipped all thirteen grammars (about 16 MB; C# alone is 5.35 MB) to every project that installed it. The Python and SWI-Prolog grammars stay built in; every other grammar moved unchanged into a data-only package (kibi-lang-go, kibi-lang-rust, kibi-lang-java, kibi-lang-csharp, kibi-lang-php, kibi-lang-c, kibi-lang-cpp, kibi-lang-bash, kibi-lang-ruby, kibi-lang-hcl) with no code or scripts. The plugin's catalog.json, which its release qualification covers, pins each pack's version and each grammar file's size and SHA-256, so the bytes that can run are still fixed by the qualified plugin. A missing pack must refuse, never silently downgrade, so a file in a language whose pack is absent is reported unsupported with its install line, for symbols and for references. kibi doctor, kibi init and kb_plan_bootstrap name the packs the tracked sources need.

## Source

Maintainer question, 2026-10-31: "Will everyone have to load support for all languages?", followed by the decision to split the grammars into per-language packs in this change.