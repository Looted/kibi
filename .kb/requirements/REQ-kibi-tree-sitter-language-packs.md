---
title: Tree-sitter grammars install as per-language packs the plugin verifies
status: open
priority: should
required_evidence: tested
tags:
  - plugin
  - multilingual
  - source-analysis
semantic_text: kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog. kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install. Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins.
semantic_clauses:
  - kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog.
  - kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install.
  - Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins.
origin:
  kind: agent
  ref: 'Maintainer question, 2026-10-31, on the tree-sitter plugin shipping every grammar: "Will everyone have to load support for all languages?", then the decision to split the grammars into per-language packs in the same change'
  approved_by: maintainer
  recorded_at: '2026-10-31T20:10:15.487Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e13b718f428817df3be8acd9bd27be10debbf71f2f20b6d27757ef6829bae9f4
semantic_inventory:
  - claim_key: CLAIM-D505D88A180B2074
    claim_text: kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog
    role: normative
    status: modeled
    span:
      start: 0
      end: 240
  - claim_key: CLAIM-1D2DB1AD16B49600
    claim_text: kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install
    role: normative
    status: modeled
    span:
      start: 242
      end: 381
  - claim_key: CLAIM-44E1AB73FC387EEA
    claim_text: Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins
    role: normative
    status: modeled
    span:
      start: 383
      end: 518
logic_claims:
  - CLAIM-D505D88A180B2074
  - CLAIM-1D2DB1AD16B49600
  - CLAIM-44E1AB73FC387EEA
id: REQ-kibi-tree-sitter-language-packs
type: req
---
kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog. kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install. Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins.

## Context

Until 3.0, kibi-plugin-treesitter shipped all thirteen grammars (about 16 MB; C# alone is 5.35 MB) to every project that installed it. Every grammar moved unchanged into a data-only package (kibi-lang-python, kibi-lang-go, kibi-lang-rust, kibi-lang-java, kibi-lang-csharp, kibi-lang-php, kibi-lang-c, kibi-lang-cpp, kibi-lang-bash, kibi-lang-ruby, kibi-lang-hcl, kibi-lang-prolog) with no code or scripts, so every language is installed and verified the same way and the plugin ships only queries and code. JavaScript and TypeScript need no pack because Kibi parses them itself. The plugin's catalog.json, which its release qualification covers, pins each pack's version and each grammar file's size and SHA-256, so the bytes that can run are still fixed by the qualified plugin. A missing pack must refuse, never silently downgrade, so a file in a language whose pack is absent is reported unsupported with its install line, for symbols and for references. kibi doctor, kibi init and kb_plan_bootstrap name the packs the tracked sources need.

## Source

Maintainer question, 2026-10-31: "Will everyone have to load support for all languages?", followed by the decision to split the grammars into per-language packs in this change.