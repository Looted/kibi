---
title: Tree-sitter grammars install as per-language packs the plugin verifies
status: open
priority: should
required_evidence: tested
tags:
  - plugin
  - multilingual
  - source-analysis
semantic_text: kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog. kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install. Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins or whose grammar file differs from the pinned SHA-256. Kibi must block a staged change to a source file whose kibi-lang pack is missing or another version instead of accepting a whole-file review. Kibi coordinate refresh must keep the coordinates of a symbol declared outside the local uncovered ranges of a partially analyzed file and warn once for that file.
semantic_clauses:
  - kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog.
  - kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install.
  - Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins or whose grammar file differs from the pinned SHA-256.
  - Kibi must block a staged change to a source file whose kibi-lang pack is missing or another version instead of accepting a whole-file review.
  - Kibi coordinate refresh must keep the coordinates of a symbol declared outside the local uncovered ranges of a partially analyzed file and warn once for that file.
origin:
  kind: agent
  ref: 'Maintainer question, 2026-10-31, on the tree-sitter plugin shipping every grammar: "Will everyone have to load support for all languages?", then the decision to split the grammars into per-language packs in the same change'
  approved_by: maintainer
  recorded_at: '2026-10-31T21:49:12.587Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2285130055e9378da5ac3c22f6e83db6b5dd894771124f59781b9dcfe9729971
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
  - claim_key: CLAIM-D6CD5D402951CCF7
    claim_text: Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins or whose grammar file differs from the pinned SHA-256
    role: normative
    status: modeled
    span:
      start: 383
      end: 572
  - claim_key: CLAIM-4B6C8D2354CACA71
    claim_text: Kibi must block a staged change to a source file whose kibi-lang pack is missing or another version instead of accepting a whole-file review
    role: normative
    status: modeled
    span:
      start: 574
      end: 714
  - claim_key: CLAIM-DAF206C33AE40835
    claim_text: Kibi coordinate refresh must keep the coordinates of a symbol declared outside the local uncovered ranges of a partially analyzed file and warn once for that file
    role: normative
    status: modeled
    span:
      start: 716
      end: 878
logic_claims:
  - CLAIM-D505D88A180B2074
  - CLAIM-1D2DB1AD16B49600
  - CLAIM-D6CD5D402951CCF7
  - CLAIM-4B6C8D2354CACA71
  - CLAIM-DAF206C33AE40835
id: REQ-kibi-tree-sitter-language-packs
type: req
---
kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog. kibi-plugin-treesitter must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install. Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins or whose grammar file differs from the pinned SHA-256. Kibi must block a staged change to a source file whose kibi-lang pack is missing or another version instead of accepting a whole-file review. Kibi coordinate refresh must keep the coordinates of a symbol declared outside the local uncovered ranges of a partially analyzed file and warn once for that file.

## Context

Until 3.0, kibi-plugin-treesitter shipped all thirteen grammars (about 16 MB; C# alone is 5.35 MB) to every project that installed it. Every grammar moved unchanged into a data-only package (kibi-lang-python, kibi-lang-go, kibi-lang-rust, kibi-lang-java, kibi-lang-csharp, kibi-lang-php, kibi-lang-c, kibi-lang-cpp, kibi-lang-bash, kibi-lang-ruby, kibi-lang-hcl, kibi-lang-prolog) with no code or scripts, so every language is installed and verified the same way and the plugin ships only queries and code. JavaScript and TypeScript need no pack because Kibi parses them itself. The plugin's catalog.json, which its release qualification covers, pins each pack's version and each grammar file's size and SHA-256, so the bytes that can run are still fixed by the qualified plugin. A missing pack must refuse, never silently downgrade, so a file in a language whose pack is absent is reported unsupported with its install line, for symbols and for references. kibi doctor, kibi init and kb_plan_bootstrap name the packs the tracked sources need, and kibi doctor names an installed pack whose grammar bytes changed. A missing pack must not disarm the staged gate, so a change to such a file blocks until the pack is installed. Installing a pack must not make Kibi worse than having none: a file the grammar reads only partly (a C include, a Rust macro, a nested HCL block) keeps the coordinates of the symbols declared outside its uncovered ranges, with one warning, instead of aborting the refresh for the whole repository.

## Source

Maintainer question, 2026-10-31: "Will everyone have to load support for all languages?", followed by the decision to split the grammars into per-language packs in this change.