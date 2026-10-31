---
title: Source proofs read Go, Java, C# and Rust references through the tree-sitter plugin
status: open
priority: should
required_evidence: tested
tags:
  - proof
  - source
  - multilingual
  - plugin
semantic_text: Kibi must read the imports, calls, environment variables, first arguments, thrown errors and property values of Go, Java, C# and Rust files through a release-qualified reference extractor without running them. Kibi must refuse a Go, Java, C# or Rust reference read that reaches reflection, a macro, conditional compilation or a name computed at run time. Kibi must refuse a Go, Java, C# or Rust reference read when no release-qualified reference extractor is active and name the plugin to activate.
semantic_clauses:
  - Kibi must read the imports, calls, environment variables, first arguments, thrown errors and property values of Go, Java, C# and Rust files through a release-qualified reference extractor without running them.
  - Kibi must refuse a Go, Java, C# or Rust reference read that reaches reflection, a macro, conditional compilation or a name computed at run time.
  - Kibi must refuse a Go, Java, C# or Rust reference read when no release-qualified reference extractor is active and name the plugin to activate.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-31, to start phase 3 of the multilingual proof plan for Java, Rust, Go and C#: "Merged, proceed with the next phase (java, rust, go, c#)"'
  approved_by: maintainer
  recorded_at: '2026-10-31T16:49:16.641Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b4a6ffd8d776599e05cded3999579526a91723b5c6717c248b9b8ac1454e5496
semantic_inventory:
  - claim_key: CLAIM-E7F6912FF1FF5981
    claim_text: Kibi must read the imports, calls, environment variables, first arguments, thrown errors and property values of Go, Java, C# and Rust files through a release-qualified reference extractor without running them
    role: normative
    status: modeled
    span:
      start: 0
      end: 208
  - claim_key: CLAIM-C91EB554CC34875C
    claim_text: Kibi must refuse a Go, Java, C# or Rust reference read that reaches reflection, a macro, conditional compilation or a name computed at run time
    role: normative
    status: modeled
    span:
      start: 210
      end: 353
  - claim_key: CLAIM-3EF7C4B3D2E96682
    claim_text: Kibi must refuse a Go, Java, C# or Rust reference read when no release-qualified reference extractor is active and name the plugin to activate
    role: normative
    status: modeled
    span:
      start: 355
      end: 497
logic_claims:
  - CLAIM-E7F6912FF1FF5981
  - CLAIM-C91EB554CC34875C
  - CLAIM-3EF7C4B3D2E96682
id: REQ-kibi-tree-sitter-references
type: req
---
Kibi must read the imports, calls, environment variables, first arguments, thrown errors and property values of Go, Java, C# and Rust files through a release-qualified reference extractor without running them. Kibi must refuse a Go, Java, C# or Rust reference read that reaches reflection, a macro, conditional compilation or a name computed at run time. Kibi must refuse a Go, Java, C# or Rust reference read when no release-qualified reference extractor is active and name the plugin to activate.

## Context

After phases 1 and 2 of the multilingual proof plan, source proofs read references in TypeScript, JavaScript, Python and SWI-Prolog, but not in the compiled languages symbol discovery already covers. A new plugin capability, kibi.reference-extractor.v1, lets kibi-plugin-treesitter read Go, Java, C# and Rust references from their syntax trees in its bounded workers. Proofs use a provider only when its installed bytes match the release-qualified closure Kibi ships, the same check impact review applies. Members are written as the code names them (os.Getenv, System.out.println, std::env::var); a method called on an expression Kibi cannot name is listed as *.name. Reflection, Rust macros (for calls and panics), C# #if blocks, non-test #[cfg] items and names computed at run time fail the read with their place. Without an active provider the read is refused with what to install, and kibi init, kibi doctor and kb_plan_bootstrap suggest the plugin when such sources are tracked.

## Source

Maintainer request, 2026-10-31: "Merged, proceed with the next phase (java, rust, go, c#)"