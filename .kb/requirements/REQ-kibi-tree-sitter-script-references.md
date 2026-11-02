---
title: Source proofs read PHP, C, Bash and Terraform/HCL references through the tree-sitter plugin
status: open
priority: should
required_evidence: tested
tags:
  - proof
  - source
  - multilingual
  - plugin
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-02, to add source-proof readers for the recommended languages: "Ok, zacznij od rekomendowanych."'
  approved_by: maintainer
  recorded_at: '2026-11-02T12:20:18.649Z'
semantic_text: Kibi must read the imports, calls, environment variables and first arguments of PHP, C and Bash files and the property values of PHP, C, Terraform and HCL files through a release-qualified reference extractor without running them. Kibi must refuse a PHP, C, Bash, Terraform or HCL reference read that reaches code built at run time, a macro it cannot expand, a conditional block that adds members or a name or value computed at run time. Kibi must refuse a Bash environment read of a variable the script sets only on some paths. Kibi must refuse a Terraform property read when an override file in the same folder is left out of the read. Kibi must refuse a PHP or C call read while another project file may define the called name or a macro the file uses.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0a82048efc6d8a01d95811381a70fa1ebbd5df9df8c0de3ed7d74680cb968dcc
semantic_inventory:
  - claim_key: CLAIM-3AB100F342C557C0
    claim_text: Kibi must read the imports, calls, environment variables and first arguments of PHP, C and Bash files and the property values of PHP, C, Terraform and HCL files through a release-qualified reference extractor without running them
    role: normative
    status: modeled
    span:
      start: 0
      end: 229
  - claim_key: CLAIM-679A838241E4B07D
    claim_text: Kibi must refuse a PHP, C, Bash, Terraform or HCL reference read that reaches code built at run time, a macro it cannot expand, a conditional block that adds members or a name or value computed at run time
    role: normative
    status: modeled
    span:
      start: 231
      end: 436
  - claim_key: CLAIM-FBC9E87CABBA438B
    claim_text: Kibi must refuse a Bash environment read of a variable the script sets only on some paths
    role: normative
    status: modeled
    span:
      start: 438
      end: 527
  - claim_key: CLAIM-996B08E118F24B4E
    claim_text: Kibi must refuse a Terraform property read when an override file in the same folder is left out of the read
    role: normative
    status: modeled
    span:
      start: 529
      end: 636
  - claim_key: CLAIM-8B95E25E83350CBE
    claim_text: Kibi must refuse a PHP or C call read while another project file may define the called name or a macro the file uses
    role: normative
    status: modeled
    span:
      start: 638
      end: 754
logic_claims:
  - CLAIM-3AB100F342C557C0
  - CLAIM-679A838241E4B07D
  - CLAIM-FBC9E87CABBA438B
  - CLAIM-996B08E118F24B4E
  - CLAIM-8B95E25E83350CBE
id: REQ-kibi-tree-sitter-script-references
type: req
---
Kibi must read the imports, calls, environment variables and first arguments of PHP, C and Bash files and the property values of PHP, C, Terraform and HCL files through a release-qualified reference extractor without running them. Kibi must refuse a PHP, C, Bash, Terraform or HCL reference read that reaches code built at run time, a macro it cannot expand, a conditional block that adds members or a name or value computed at run time. Kibi must refuse a Bash environment read of a variable the script sets only on some paths. Kibi must refuse a Terraform property read when an override file in the same folder is left out of the read. Kibi must refuse a PHP or C call read while another project file may define the called name or a macro the file uses.

## Context

After the Go, Java, C# and Rust readers, source proofs still could not read PHP, C, Bash or Terraform and HCL files, although symbol discovery covers them. kibi-plugin-treesitter now reads them from their syntax trees in its bounded workers: PHP names resolve through the namespace and use imports, C macros the file defines are expanded, Bash variables a script expands but never sets are environment reads, and Terraform and HCL attribute and object key values are read as literals. Each read is exact or refuses with its place, and rows that depend on other project files (a namespace function, a header's macros) are dropped by the host only after it checks those files.
